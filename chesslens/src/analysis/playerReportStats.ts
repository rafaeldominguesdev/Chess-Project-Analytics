import type { ExtractedMove, ErrorCandidate } from './errorExtraction'
import type { StoredGame } from '../persistence/types'
import { resolvePlayerColor } from './playerColor'
import { identifyOpening } from './openingsDatabase'
import { findFamilyForOpening } from './openingRepertoire'
import { calcAccuracy, materialForSide, moveAccuracyScore } from './moveClassifier'
import { detectGamePhase } from './gamePhase'
import type { GamePhase } from './gamePhase'
import { parseClockSeconds, parseTimeControlBaseSeconds } from './clock'
import { classifyMistakeReason, MISTAKE_REASON_LABELS } from './mistakeReasons'
import type { MistakeReason } from './mistakeReasons'
import type { GameInfo } from '../types/chess.types'

/** Uma partida já resolvida pro lado do jogador — a unidade base de todas as agregações do
 *  Relatório (Sprint 3). Partidas sem lado identificável (`resolvePlayerColor` devolve `null`)
 *  nunca viram uma `GameReportRow` — melhor descartar da agregação do que arriscar o lado errado. */
export interface GameReportRow {
  gameUrl: string
  gameInfo: GameInfo
  savedAt: number
  playerColor: 'w' | 'b'
  /** Precisão da partida INTEIRA pro lado do jogador (mesma fórmula de `calcAccuracy`). */
  accuracy: number
  /** Família de abertura (`openingRepertoire.ts`) identificada pelos lances da partida inteira —
   *  `null` quando o banco ECO não reconhece nenhuma linha (raro, mas acontece fora de teoria). */
  familyKey: string | null
  eco: string | null
  /** Só os lances do lado do jogador — usados por `computeAccuracyByPhase`/`computeErrorRateByClock`. */
  ownMoves: ExtractedMove[]
}

/**
 * Agrupa `allMoves` (saída de `extractAllClassifiedMoves`) por partida, resolve o lado do
 * jogador e a abertura de cada uma. Base de todas as outras funções deste módulo.
 */
export function buildGameReportRows(allMoves: ExtractedMove[], games: StoredGame[]): GameReportRow[] {
  const gameByUrl = new Map(games.map((g) => [g.url, g]))
  const movesByGame = new Map<string, ExtractedMove[]>()
  for (const mv of allMoves) {
    const arr = movesByGame.get(mv.gameUrl) ?? []
    arr.push(mv)
    movesByGame.set(mv.gameUrl, arr)
  }

  const rows: GameReportRow[] = []
  for (const [gameUrl, moves] of movesByGame) {
    const game = gameByUrl.get(gameUrl)
    if (!game) continue // partida referenciada nos lances mas removida da store — não deveria
    // acontecer em uso normal, mas `getAllItems` e o join de `errorExtraction.ts` já toleram isso.

    const playerColor = resolvePlayerColor(game)
    if (!playerColor) continue // lado não identificável — fora da agregação, nunca chuta

    moves.sort((a, b) => a.moveIndex - b.moveIndex)
    const opening = identifyOpening(moves.map((m) => m.san))
    const family = opening ? findFamilyForOpening(opening.name) : null
    const accuracy = calcAccuracy(moves, playerColor)

    rows.push({
      gameUrl,
      gameInfo: game.gameInfo,
      savedAt: game.savedAt,
      playerColor,
      accuracy,
      familyKey: family?.key ?? null,
      eco: opening?.eco ?? null,
      ownMoves: moves.filter((m) => m.color === playerColor),
    })
  }

  return rows
}

export interface PhaseAccuracy {
  phase: GamePhase
  accuracy: number
  moveCount: number
}

const PHASES: GamePhase[] = ['abertura', 'meio-jogo', 'final']

/** Precisão média por fase da partida, agregando os lances do jogador de todas as `rows`. */
export function computeAccuracyByPhase(rows: GameReportRow[]): PhaseAccuracy[] {
  const sums = new Map<GamePhase, { sum: number; count: number }>(PHASES.map((p) => [p, { sum: 0, count: 0 }]))
  for (const row of rows) {
    for (const mv of row.ownMoves) {
      const material = materialForSide(mv.fenBefore, 'w') + materialForSide(mv.fenBefore, 'b')
      const phase = detectGamePhase(mv.moveNumber, material)
      const acc = sums.get(phase)!
      acc.sum += moveAccuracyScore(mv.evalBefore, mv.evalAfter, mv.color)
      acc.count++
    }
  }
  return PHASES.map((phase) => {
    const { sum, count } = sums.get(phase)!
    return { phase, moveCount: count, accuracy: count ? Math.round((sum / count) * 10) / 10 : 0 }
  })
}

export interface ClockBucket {
  label: string
  errorRate: number
  moveCount: number
}

// Mesmos 4 baldes já usados pelo motivo "Tempo" do roadmap (< 15% do relógio restante é o
// limiar de referência) — sem inventar outra régua só pro Relatório.
const CLOCK_BUCKETS = [
  { label: '0–15%', min: 0, max: 0.15 },
  { label: '15–30%', min: 0.15, max: 0.3 },
  { label: '30–60%', min: 0.3, max: 0.6 },
  { label: '60–100%', min: 0.6, max: 1.01 },
]

/** Taxa de erro grave (mistake/blunder) por faixa de % de relógio restante — só conta lances de
 *  partidas com `TimeControl` no PGN e relógio anotado por lance (as duas coisas têm que existir
 *  pra "% restante" fazer sentido; sem uma delas, o lance é descartado desta agregação). */
export function computeErrorRateByClock(rows: GameReportRow[]): ClockBucket[] {
  const counts = CLOCK_BUCKETS.map(() => ({ total: 0, errors: 0 }))
  for (const row of rows) {
    const base = parseTimeControlBaseSeconds(row.gameInfo.timeControl)
    if (!base) continue
    for (const mv of row.ownMoves) {
      const remaining = parseClockSeconds(mv.clock)
      if (remaining === null) continue
      const pct = remaining / base
      const idx = CLOCK_BUCKETS.findIndex((b) => pct >= b.min && pct < b.max)
      if (idx === -1) continue
      counts[idx].total++
      if (mv.classification === 'mistake' || mv.classification === 'blunder') counts[idx].errors++
    }
  }
  return CLOCK_BUCKETS.map((b, i) => ({
    label: b.label,
    moveCount: counts[i].total,
    errorRate: counts[i].total ? Math.round((counts[i].errors / counts[i].total) * 1000) / 10 : 0,
  }))
}

export interface OpeningPerformance {
  familyKey: string
  side: 'w' | 'b'
  games: number
  avgAccuracy: number
}

/** Desempenho médio por família de abertura + lado, ordenado das piores primeiro — mais acionável
 *  pro link "treinar essa linha" (o que precisa de treino aparece no topo). */
export function computeOpeningPerformance(rows: GameReportRow[]): OpeningPerformance[] {
  const byKey = new Map<string, { familyKey: string; side: 'w' | 'b'; games: number; sum: number }>()
  for (const row of rows) {
    if (!row.familyKey) continue
    const key = `${row.familyKey}|${row.playerColor}`
    const acc = byKey.get(key) ?? { familyKey: row.familyKey, side: row.playerColor, games: 0, sum: 0 }
    acc.games++
    acc.sum += row.accuracy
    byKey.set(key, acc)
  }
  return Array.from(byKey.values())
    .map((v) => ({ familyKey: v.familyKey, side: v.side, games: v.games, avgAccuracy: Math.round((v.sum / v.games) * 10) / 10 }))
    .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
}

export interface TrendPoint {
  gameUrl: string
  savedAt: number
  accuracy: number
}

/** Precisão das últimas `lastN` partidas, em ordem cronológica (mais antiga primeiro) — pronto
 *  pra virar um gráfico de linha da esquerda pra direita. */
export function computeAccuracyTrend(rows: GameReportRow[], lastN = 20): TrendPoint[] {
  return [...rows]
    .sort((a, b) => a.savedAt - b.savedAt)
    .slice(-lastN)
    .map((r) => ({ gameUrl: r.gameUrl, savedAt: r.savedAt, accuracy: r.accuracy }))
}

export interface TopLeak {
  reason: MistakeReason
  label: string
  count: number
  gamesAffected: number
}

/** Os motivos de erro (Sprint 2b) mais frequentes do lado do jogador, ordenados por quantidade —
 *  base do "Top 3 Vazamentos". `'generic'` fica de fora de propósito: não aponta pra um treino
 *  específico, então não ajuda como vazamento acionável. */
export function computeTopLeaks(candidates: ErrorCandidate[], myColorByGame: Map<string, 'w' | 'b'>, n = 3): TopLeak[] {
  const own = candidates.filter((c) => c.playerColor === myColorByGame.get(c.gameUrl))
  const byReason = new Map<MistakeReason, { count: number; games: Set<string> }>()
  for (const c of own) {
    const reason = classifyMistakeReason(c)
    if (reason === 'generic') continue
    const acc = byReason.get(reason) ?? { count: 0, games: new Set() }
    acc.count++
    acc.games.add(c.gameUrl)
    byReason.set(reason, acc)
  }
  return Array.from(byReason.entries())
    .map(([reason, v]) => ({ reason, label: MISTAKE_REASON_LABELS[reason], count: v.count, gamesAffected: v.games.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}
