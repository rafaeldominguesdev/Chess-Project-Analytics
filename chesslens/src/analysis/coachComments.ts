import { Chess } from 'chess.js'
import type { ClassifiedMove } from './types'
import type { MoveQuality } from './moveClassifier'

/** Converte o `bestMove` do Stockfish (UCI, ex: "e2e4") pra SAN legível (ex: "e4"), a partir
 *  da posição ANTES do lance. Retorna null se não der pra resolver (ex: mate/afogamento). */
export function bestMoveSan(fenBefore: string | null | undefined, bestMoveUci: string | null): string | null {
  if (!fenBefore || !bestMoveUci || bestMoveUci.length < 4) return null
  try {
    const chess = new Chess(fenBefore)
    const from = bestMoveUci.slice(0, 2)
    const to = bestMoveUci.slice(2, 4)
    const promotion = bestMoveUci.length > 4 ? bestMoveUci.slice(4, 5) : undefined
    const mv = chess.move({ from, to, promotion })
    return mv?.san ?? null
  } catch {
    return null
  }
}

export interface CoachMessage {
  headline: string
  body: string
}

// Comentário curto e comparativo (chess.com style), mas com o humor "capivara" que já é a cara
// do resto do app (ver QUALITY_CONFIG.blunder.label = "Capivarada" em moveClassifier.ts).
const TEMPLATES: Record<MoveQuality, (san: string, bestSan: string | null) => CoachMessage> = {
  brilliant: (san) => ({
    headline: `${san} é brilhante!`,
    body: 'Um sacrifício certeiro que poucos veriam — muito bem enxergado.',
  }),
  excellent: (san) => ({
    headline: `${san} é excelente.`,
    body: 'Bem perto do ideal, a avaliação quase não mudou.',
  }),
  book: (san) => ({
    headline: `${san} é teoria.`,
    body: 'Um lance de abertura bem conhecido — ainda dentro do livro.',
  }),
  best: (san) => ({
    headline: `${san} é o melhor lance.`,
    body: 'Exatamente o que o Stockfish recomendava aqui.',
  }),
  great: (san) => ({
    headline: `${san} é ótimo.`,
    body: 'Mantém a posição totalmente sob controle.',
  }),
  good: (san) => ({
    headline: `${san} é um bom lance.`,
    body: 'Sólido, sem grandes erros.',
  }),
  inaccuracy: (san, bestSan) => ({
    headline: `${san} é impreciso.`,
    body: bestSan ? `${bestSan} mantinha mais vantagem.` : 'Havia uma opção um pouco melhor aqui.',
  }),
  mistake: (san, bestSan) => ({
    headline: `${san} é um erro.`,
    body: bestSan ? `${bestSan} era bem mais forte.` : 'A posição piorou visivelmente com esse lance.',
  }),
  miss: (san, bestSan) => ({
    headline: `${san} deixou passar a chance.`,
    body: bestSan ? `${bestSan} ampliava e muito a vantagem.` : 'Uma chance de aumentar a vantagem escapou.',
  }),
  blunder: (san, bestSan) => ({
    headline: `${san} é uma capivarada!`,
    body: bestSan ? `${bestSan} evitava essa queda feia na avaliação.` : 'Essa doeu — a avaliação despencou.',
  }),
}

/** Comentário do "coach" (capivara) pra um lance já classificado. Null se ainda não foi analisado. */
export function coachComment(move: ClassifiedMove): CoachMessage | null {
  if (!move.classification) return null
  const bestSan = bestMoveSan(move.fenBefore, move.bestMove)
  return TEMPLATES[move.classification](move.san, bestSan)
}
