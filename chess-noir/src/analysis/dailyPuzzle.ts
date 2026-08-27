import { PUZZLES } from './puzzles'
import type { Puzzle } from './puzzles'

// Puzzle Diário — um puzzle por dia, o mesmo pra todo mundo naquela data, e que NÃO repete
// enquanto o banco não se esgotar (~3700 puzzles ≈ 10 anos de puzzles distintos).
//
// Como não repete sem precisar guardar histórico: em vez de sortear todo dia (que repetiria por
// acaso), a lista inteira de puzzles é embaralhada UMA vez com uma semente fixa (permutação
// determinística — igual em qualquer navegador, qualquer dia) e o puzzle do dia é
// `permutação[diaAtual % total]`. Cada índice da permutação só volta a ser usado depois que
// todos os outros já foram.

const SHUFFLE_SEED = 0x9e3779b9

// mulberry32 — PRNG pequeno e determinístico, só pra gerar a permutação fixa (não é pra nada
// sensível a segurança).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher-Yates com o PRNG semeado — mesma ordem toda vez que o módulo carrega.
const SHUFFLED: Puzzle[] = (() => {
  const rand = mulberry32(SHUFFLE_SEED)
  const arr = PUZZLES.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
})()

/** Número do dia (dias desde a época Unix) no fuso LOCAL — vira a chave do puzzle e da data. */
export function dayNumber(date: Date = new Date()): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor(local.getTime() / 86_400_000)
}

/** ISO `YYYY-MM-DD` da data local — usado como chave em `localStorage` (progresso por dia). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface DailyCategory {
  /** Rótulo curto pro badge (ex: "Xeque-mate", "Ganhar material"). */
  label: string
  /** Objetivo em uma frase (ex: "Dê o xeque-mate", "Ganhe material"). */
  goal: string
}

// Deriva uma categoria amigável a partir dos temas do Lichess do puzzle. Ordem importa — o
// primeiro que casar vence (mate é mais específico/vistoso que "vantagem").
function categoryFromThemes(themes: string[]): DailyCategory {
  const has = (t: string) => themes.includes(t)
  const mateIn = themes.find((t) => /^mateIn\d$/.test(t))
  if (has('mate') || mateIn) {
    const n = mateIn ? mateIn.replace('mateIn', '') : null
    return { label: n ? `Mate em ${n}` : 'Xeque-mate', goal: 'Force o xeque-mate' }
  }
  if (has('promotion') || has('underPromotion') || has('advancedPawn')) {
    return { label: 'Promoção', goal: 'Chegue à promoção' }
  }
  if (has('fork') || has('pin') || has('skewer') || has('discoveredAttack') || has('doubleCheck') || has('interference')) {
    return { label: 'Tática', goal: 'Ache o golpe tático' }
  }
  if (has('sacrifice') || has('attraction') || has('deflection') || has('clearance') || has('quietMove')) {
    return { label: 'Combinação', goal: 'Calcule a combinação' }
  }
  if (has('hangingPiece') || has('capturingDefender') || has('trappedPiece') || has('win') || has('crushing') || has('advantage')) {
    return { label: 'Ganhar material', goal: 'Ganhe material' }
  }
  if (has('endgame') || has('rookEndgame') || has('pawnEndgame') || has('queenEndgame') || has('bishopEndgame') || has('knightEndgame')) {
    return { label: 'Final', goal: 'Converta o final' }
  }
  return { label: 'Melhor lance', goal: 'Ache o melhor lance' }
}

export interface DailyPuzzle {
  puzzle: Puzzle
  category: DailyCategory
  /** `YYYY-MM-DD` local. */
  date: string
  /** Índice na permutação — só pra debug/telemetria eventual. */
  index: number
}

/** O puzzle de uma data (hoje por padrão). Determinístico. */
export function getDailyPuzzle(date: Date = new Date()): DailyPuzzle {
  const idx = ((dayNumber(date) % SHUFFLED.length) + SHUFFLED.length) % SHUFFLED.length
  const puzzle = SHUFFLED[idx]
  return {
    puzzle,
    category: categoryFromThemes(puzzle.themes),
    date: dayKey(date),
    index: idx,
  }
}
