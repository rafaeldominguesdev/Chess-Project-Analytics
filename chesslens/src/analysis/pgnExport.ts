import type { ClassifiedMove } from './types'
import type { MoveQuality } from './moveClassifier'

/**
 * Mapeamento das categorias do ChessLens pros NAGs (Numeric Annotation Glyph) padrão da
 * especificação PGN — assim qualquer leitor de PGN (lichess, chess.com, ChessBase...) entende a
 * anotação sem precisar conhecer o ChessLens. Só os NAGs de "força do lance" (não os de avaliação
 * de posição, tipo $10 "posição de empate") interessam aqui:
 *   $1 = ! (bom lance)      $2 = ? (erro)             $3 = !! (lance excelente/brilhante)
 *   $4 = ?? (erro grave)    $5 = !? (interessante)    $6 = ?! (duvidoso/impreciso)
 *   $7 = □ (lance forçado)
 *
 * Categorias sem entrada aqui (best/great/good/book) ficam sem NAG de propósito — são lances
 * "normais" (o esperado ou próximo disso), e marcar todo lance seria ruído; a especificação PGN
 * também não tem um NAG convencional pra "lance de teoria/livro" ($146 é "novidade teórica", o
 * oposto disso), então "book" fica sem anotação em vez de usar um NAG que mentiria sobre o que
 * ele significa. "miss" (chance perdida) não tem NAG exato — é tratado como erro grave ($4),
 * aproximação honesta (o app já mede como queda grande de chance de vitória vindo de posição
 * claramente ganha, o "peso" é comparável ao de um blunder comum mesmo sem ser a mesma categoria).
 */
export const QUALITY_TO_NAG: Partial<Record<MoveQuality, number>> = {
  brilliant: 3,
  excellent: 1,
  inaccuracy: 6,
  mistake: 2,
  miss: 4,
  blunder: 4,
}

const MOVE_NUMBER_RE = /^\d+\.+$/
const RESULT_RE = /^(1-0|0-1|1\/2-1\/2|\*)$/
const NAG_RE = /^\$\d+$/
// Número de lance colado direto na jogada, sem espaço (ex: "12.Nf3" em vez de "12. Nf3") — grupo
// 1 é o número+pontos, grupo 2 é o resto (a jogada de verdade). O grupo 2 exige começar com um
// caractere que NÃO seja ponto (`[^.]`) — sem isso, um token só de número+reticências (ex: o
// "1..." que marca a vez das pretas) também bate no padrão via backtracking (o "." literal do
// fim vira "grupo 2" sozinho, porque `.` no regex casa qualquer caractere, inclusive ponto), e aí
// esse ponto solto era tratado como se fosse a notação de um lance de verdade.
const GLUED_MOVE_NUMBER_RE = /^(\d+\.+)([^.].*)$/

/**
 * Divide um PGN cru em `{ headers, movetext }` achando o fim do último header (linha `[Tag "..."]`)
 * — tudo depois disso (lances, comentários, resultado) é `movetext`, preservado como veio.
 */
function splitHeadersAndMovetext(pgn: string): { headers: string; movetext: string } {
  const headerLineRe = /^\[[^\]]*\]\s*$/gm
  let lastEnd = 0
  let match: RegExpExecArray | null
  while ((match = headerLineRe.exec(pgn))) {
    lastEnd = match.index + match[0].length
  }
  return { headers: pgn.slice(0, lastEnd), movetext: pgn.slice(lastEnd) }
}

/**
 * Insere NAGs (`$N`) depois de cada lance classificado de um PGN cru, sem reescrever o resto do
 * PGN — headers, comentários existentes (ex: `{[%clk 0:10:00]}`), variações entre parênteses e o
 * resultado final ficam intactos, caractere por caractere, só ganham o `$N` colado depois do lance
 * quando a categoria dele mapeia pra um NAG (ver `QUALITY_TO_NAG`).
 *
 * `moves` precisa estar na mesma ordem (lance a lance, brancas e pretas intercaladas) que o
 * `movetext` do `pgn` original — é exatamente o que `parsePgn()` (`pgnParser.ts`) já garante, já
 * que os dois vêm do mesmo `game.history()`. Lances sem `classification` (partida ainda não
 * totalmente analisada) simplesmente não recebem NAG.
 */
export function annotatePgnWithNags(pgn: string, moves: ClassifiedMove[]): string {
  const { headers, movetext } = splitHeadersAndMovetext(pgn)
  const n = movetext.length
  let out = ''
  let i = 0
  let moveIdx = 0

  // Decide se `token` é a notação de um lance (não número/resultado/NAG existente) e, se for,
  // consome o próximo item de `moves` e devolve o token com `$N` colado quando aplicável.
  const withNag = (token: string): string => {
    if (token === '' || MOVE_NUMBER_RE.test(token) || RESULT_RE.test(token) || NAG_RE.test(token)) {
      return token
    }
    const move = moves[moveIdx]
    moveIdx += 1
    const nag = move?.classification ? QUALITY_TO_NAG[move.classification] : undefined
    return nag ? `${token} $${nag}` : token
  }

  while (i < n) {
    const ch = movetext[i]

    if (ch === '{') {
      // Comentário existente ({[%clk ...]}, {[%eval ...]}, texto livre etc.) — copia intacto.
      const end = movetext.indexOf('}', i)
      const stop = end === -1 ? n : end + 1
      out += movetext.slice(i, stop)
      i = stop
      continue
    }

    if (ch === '(') {
      // Variação (RAV) — copia intacta, balanceando parênteses (não anota lances dentro dela,
      // só a linha principal que corresponde a `moves`).
      let depth = 1
      let j = i + 1
      while (j < n && depth > 0) {
        if (movetext[j] === '(') depth += 1
        else if (movetext[j] === ')') depth -= 1
        j += 1
      }
      out += movetext.slice(i, j)
      i = j
      continue
    }

    if (/\s/.test(ch)) { out += ch; i += 1; continue }

    // Lê um token (sequência sem espaço/chave/parêntese).
    let j = i
    while (j < n && !/\s/.test(movetext[j]) && movetext[j] !== '{' && movetext[j] !== '(') j += 1
    const raw = movetext.slice(i, j)
    i = j

    const glued = raw.match(GLUED_MOVE_NUMBER_RE)
    if (glued) {
      // "12.Nf3" sem espaço — número fica intacto, só a parte do lance ganha o NAG.
      out += glued[1] + withNag(glued[2])
    } else {
      out += withNag(raw)
    }
  }

  return headers + out
}
