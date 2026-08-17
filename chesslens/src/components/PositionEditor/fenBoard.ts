// Parsing/serialização manual de FEN pro editor de posição — de propósito NÃO usa `new Chess(fen)`
// pra guardar o estado em edição, porque a posição pode estar transitoriamente ilegal enquanto o
// usuário monta o tabuleiro (ex: faltando um rei) e o construtor do chess.js lança erro nesse caso.
// A validação de legalidade de verdade (pro botão "Analisar posição") é feita à parte, só na hora
// de decidir se libera o botão — ver `PositionEditorView.tsx`.

export const FILES = 'abcdefgh'

/** Colocação de peças da posição inicial padrão do xadrez. */
export const START_PLACEMENT = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

/** Casa (ex: "e4") -> código de peça (ex: "wP", "bK") — casas ausentes do mapa estão vazias. */
export type BoardMap = Record<string, string>

export interface CastlingRights {
  K: boolean
  Q: boolean
  k: boolean
  q: boolean
}

export const NO_CASTLING: CastlingRights = { K: false, Q: false, k: false, q: false }
export const ALL_CASTLING: CastlingRights = { K: true, Q: true, k: true, q: true }

/** Converte a parte de colocação de um FEN ("rnbqkbnr/pppppppp/8/...") num mapa casa->peça.
 *  Tolerante: ignora linhas/caracteres a mais em vez de lançar erro, pra dar pra colar um FEN
 *  parcialmente malformado sem quebrar o editor. */
export function parsePlacement(placement: string): BoardMap {
  const board: BoardMap = {}
  const rows = placement.split('/')
  for (let r = 0; r < Math.min(8, rows.length); r++) {
    const rank = 8 - r
    let file = 0
    for (const ch of rows[r]) {
      if (file > 7) break
      if (/[1-8]/.test(ch)) { file += Number(ch); continue }
      if (/[a-zA-Z]/.test(ch)) {
        const type = ch.toUpperCase()
        if ('KQRBNP'.includes(type)) {
          const color = ch === type ? 'w' : 'b'
          board[`${FILES[file]}${rank}`] = `${color}${type}`
        }
        file++
      }
    }
  }
  return board
}

/** Caminho inverso de `parsePlacement` — mapa casa->peça vira a parte de colocação de um FEN. */
export function serializePlacement(board: BoardMap): string {
  const rows: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    let row = ''
    let empty = 0
    for (let file = 0; file < 8; file++) {
      const code = board[`${FILES[file]}${rank}`]
      if (!code) { empty++; continue }
      if (empty > 0) { row += empty; empty = 0 }
      row += code[0] === 'w' ? code[1] : code[1].toLowerCase()
    }
    if (empty > 0) row += empty
    rows.push(row)
  }
  return rows.join('/')
}

export function castlingToFen(c: CastlingRights): string {
  const s = `${c.K ? 'K' : ''}${c.Q ? 'Q' : ''}${c.k ? 'k' : ''}${c.q ? 'q' : ''}`
  return s || '-'
}

export function fenToCastling(part: string | undefined): CastlingRights {
  if (!part || part === '-') return NO_CASTLING
  return { K: part.includes('K'), Q: part.includes('Q'), k: part.includes('k'), q: part.includes('q') }
}

/** Monta o FEN completo a partir do estado do editor — halfmove/fullmove sempre fixos em "0 1"
 *  (o editor não rastreia histórico de lances, então não tem como saber o número real). */
export function buildFen(board: BoardMap, turn: 'w' | 'b', castling: CastlingRights, enPassant: string): string {
  const ep = /^[a-h][36]$/.test(enPassant) ? enPassant : '-'
  return `${serializePlacement(board)} ${turn} ${castlingToFen(castling)} ${ep} 0 1`
}

export interface ParsedFenState {
  board: BoardMap
  turn: 'w' | 'b'
  castling: CastlingRights
  enPassant: string
}

/** Parser tolerante pro campo de FEN colável — preenche o editor com o que conseguir entender do
 *  texto, mesmo que a posição toda ainda não seja legal (isso fica a cargo do chess.js, só na
 *  hora de habilitar "Analisar posição"). Retorna `null` se nem a colocação der pra entender. */
export function parseFenState(raw: string): ParsedFenState | null {
  const parts = raw.trim().split(/\s+/)
  const placement = parts[0]
  if (!placement || !placement.includes('/')) return null
  return {
    board: parsePlacement(placement),
    turn: parts[1] === 'b' ? 'b' : 'w',
    castling: fenToCastling(parts[2]),
    enPassant: parts[3] && parts[3] !== '-' ? parts[3] : '',
  }
}
