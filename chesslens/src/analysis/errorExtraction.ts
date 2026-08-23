import { loadAllGames } from '../persistence/gamesRepo'
import { loadAllAnalyses, isAnalysisValid } from '../persistence/analysesRepo'
import { parsePgn } from './pgnParser'
import { classifyMove, materialForSide } from './moveClassifier'
import { isBookMove } from './openingsDatabase'
import type { GameInfo } from '../types/chess.types'

export interface ErrorCandidate {
  gameUrl: string
  moveIndex: number
  /** Posição ANTES do lance errado — é o que vai na tela pro treino (o jogador tenta de novo). */
  fenBefore: string
  /** Posição logo DEPOIS do lance errado — só usada pelas heurísticas de motivo do erro. */
  fenAfter: string
  sanPlayed: string
  playerColor: 'w' | 'b'
  /** bestMoves[m] — a resposta certa que o treino cobra (nunca null, filtrado na extração). */
  bestMoveUci: string
  /** bestMoves[m+1] — resposta do adversário logo depois do erro. Insumo só das heurísticas de
   *  motivo (peça pendurada/garfo/cravada/back-rank) — nunca aparece como "o lance certo" na UI. */
  bestMoveAfterUci: string | null
  classification: 'mistake' | 'blunder'
  evalBefore: number
  evalAfter: number
  evalDelta: number
  gameInfo: GameInfo
}

/**
 * Varre TODAS as partidas já analisadas e salvas (IndexedDB, `persistence/`) atrás de lances
 * classificados como erro/capivarada. Recalcula a classificação na hora (a partir dos números
 * crus `whiteEvals`/`bestMoves` salvos, com a MESMA composição que `App.tsx` usa ao reabrir uma
 * partida do cache) em vez de confiar numa classificação persistida — assim um recalibração
 * futura de `classifyMove` já vale pra partidas antigas, sem precisar reanalisar nada.
 *
 * Fica sem corte/agrupamento por partida de propósito: o Relatório do jogador (Sprint 3) precisa
 * da lista completa e não-agrupada pra estatísticas tipo "pendura peça em 18% das partidas" —
 * qualquer corte pra uma sessão de treino específica é decisão de quem consome esta função
 * (`useErrorTrainer.ts`), não deste módulo.
 */
export async function extractErrorCandidates(): Promise<ErrorCandidate[]> {
  const [games, analyses] = await Promise.all([loadAllGames(), loadAllAnalyses()])
  const analysisByUrl = new Map(analyses.map((a) => [a.gameUrl, a]))
  const candidates: ErrorCandidate[] = []

  for (const game of games) {
    const analysis = analysisByUrl.get(game.url)
    if (!analysis) continue // partida salva mas nunca analisada (ou análise perdida) — pula

    let parsed: ReturnType<typeof parsePgn>
    try {
      parsed = parsePgn(game.pgn)
    } catch {
      continue // PGN corrompido/editado à mão — pula essa partida, não trava o scan inteiro
    }
    const { fens, moves, gameInfo } = parsed

    // `analysis.depth` como "esperado" torna a checagem de profundidade tautológica de propósito
    // — aqui não existe um "depth atual" como em App.tsx (que reabre AO VIVO com uma profundidade
    // fixa); o que importa mesmo é `whiteEvals`/`bestMoves` baterem em tamanho com esta partida
    // recém-parseada (protege contra cache velho/truncado de uma versão anterior do parser).
    if (!isAnalysisValid(analysis, fens, analysis.depth)) continue
    const { whiteEvals, bestMoves } = analysis

    for (let m = 0; m < moves.length; m++) {
      const i = m + 1
      const mv = moves[m]
      const before = whiteEvals[m]
      const after = whiteEvals[i]
      const bm = bestMoves[m]
      if (!bm) continue // sem lance recomendado pro motor aqui — nada pra treinar, pula

      const isBest = mv.from + mv.to === bm.slice(0, 4)
      const materialDelta = materialForSide(fens[m], mv.color) - materialForSide(fens[i], mv.color)
      const isBook = isBookMove(moves.slice(0, m + 1).map((cm) => cm.san))
      const cls = classifyMove(before, after, mv.color, isBest, isBook, materialDelta)
      if (cls !== 'mistake' && cls !== 'blunder') continue

      candidates.push({
        gameUrl: game.url,
        moveIndex: m,
        fenBefore: fens[m],
        fenAfter: fens[i],
        sanPlayed: mv.san,
        playerColor: mv.color,
        bestMoveUci: bm,
        bestMoveAfterUci: bestMoves[i] ?? null,
        classification: cls,
        evalBefore: before,
        evalAfter: after,
        evalDelta: after - before,
        gameInfo,
      })
    }
  }

  return candidates
}
