import { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { EvalBar } from './EvalBar'
import { SquareQualityMarker } from './MoveQualityBadge'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES, PIECE_SETS, PIECE_COLOR_FILTER } from '../../utils/boardThemes'
import { buildCustomPieces } from '../../utils/pieceLoader'
import { qualityAlphaColor, QUALITY_CONFIG } from '../../analysis/moveClassifier'
import type { StockfishEval } from '../../hooks/useStockfish'
import type { MoveQuality } from '../../analysis/moveClassifier'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

const EVAL_BAR_WIDTH = 24
const ROW_GAP = 8
// Cor/espessura das setas desenhadas à mão (botão direito arrastando) — azul bebê (o destaque da
// interface), fina o bastante pra não competir com o verde das sugestões do engine
// (`topMoveArrows`), que ocupam o mesmo overlay. Espessura pedida pelo usuário pra ficar mais
// parecida com o chess.com — mais fina que a versão anterior (0.16).
const USER_ARROW_COLOR = 'var(--color-blue-bright)'
const USER_ARROW_WIDTH_RATIO = 0.12 // fração do tamanho da casa

/** Largura extra (fora do quadrado do tabuleiro) ocupada pela barra de avaliação.
 *  Usado por quem calcula `boardWidth` pra não estourar a largura do container. */
export const BOARD_ROW_CHROME_WIDTH = EVAL_BAR_WIDTH + ROW_GAP

const FILES = 'abcdefgh'

/** Posição (em px, relativa ao canto superior-esquerdo do tabuleiro) do topo-esquerda de uma casa. */
function squareOrigin(square: string, orientation: 'white' | 'black', squareSize: number) {
  const fileIdx = FILES.indexOf(square[0])
  const rankIdx = Number(square[1]) - 1
  const col = orientation === 'white' ? fileIdx : 7 - fileIdx
  const row = orientation === 'white' ? 7 - rankIdx : rankIdx
  return { left: col * squareSize, top: row * squareSize }
}

interface PieceDropArgs {
  piece: { pieceType?: string } | null
  sourceSquare: string
  targetSquare: string | null
  /** Peça escolhida no seletor de promoção ('q'|'n'|'r'|'b') — ausente em lances normais. */
  promotion?: string
}

const PROMOTION_PIECES = ['q', 'n', 'r', 'b'] as const
const PROMOTION_LABELS: Record<string, string> = { q: 'Dama', n: 'Cavalo', r: 'Torre', b: 'Bispo' }

/** Pawn indo pra última fileira dele — não valida legalidade completa, só se vale a pena
 *  perguntar qual peça promover (lance ilegal de verdade é pego depois pelo chess.js do chamador). */
function isPromotionMove(fen: string, from: string, to: string): boolean {
  try {
    const chess = new Chess(fen)
    const piece = chess.get(from as Square)
    if (!piece || piece.type !== 'p') return false
    return (piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')
  } catch {
    return false
  }
}

interface ChessBoardProps {
  fen: string
  lastMove: { from: string; to: string } | null
  evaluation: StockfishEval | null
  boardWidth: number
  currentQuality?: MoveQuality | null
  showEvalBar?: boolean
  interactive?: boolean
  boardOrientation?: 'white' | 'black'
  /** Renderizadas pelo mesmo SVG "à mão" das setas do usuário (`customArrows`), não pelo desenho
   *  padrão (mais grosso/arredondado) da lib — pedido direto do usuário: "tem ser azul bebê... e
   *  não pode ser tão grande", comparando com a seta desenhada com o botão direito. */
  extraArrows?: { startSquare: string; endSquare: string; color: string; opacity?: number }[]
  /** Setas com ESPESSURA por seta (a lib só dá pra pintar de cor, não engrossar) — usado pro
   *  tabuleiro de análise livre mostrar as N melhores opções ranqueadas (1ª mais grossa). Quando
   *  presente, substitui a seta única de ameaça/melhor-lance (evaluation.bestMove) — não some as duas. */
  topMoveArrows?: { from: string; to: string; color: string; strokeWidth: number; opacity?: number }[]
  onPieceDrop?: (args: PieceDropArgs) => boolean
  /** Casa destacada com um anel pulsante (ex: dica de "essa é a peça que precisa mover"). */
  hintSquare?: string | null
}

const ANIMATION_MS: Record<string, number> = {
  none: 0, fast: 80, normal: 150, slow: 350,
}

export function ChessBoard({
  fen,
  lastMove,
  evaluation,
  boardWidth,
  currentQuality,
  showEvalBar = true,
  interactive = false,
  boardOrientation = 'white',
  extraArrows,
  topMoveArrows,
  onPieceDrop,
  hintSquare,
}: ChessBoardProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]
  const reducedMotion = usePrefersReducedMotion()

  // Seleção de peça pra mostrar pra onde ela pode jogar (igual lichess/chess.com): clica numa
  // peça (ou começa a arrastar) e as casas de destino legal ganham uma bolinha — ou um anel,
  // se for captura. Some sozinho quando a posição muda (o lance foi feito) ou perde o foco.
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  useEffect(() => setSelectedSquare(null), [fen])

  // Peão chegando na última fileira: pergunta qual peça promover em vez de virar dama sozinho.
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null)
  useEffect(() => setPendingPromotion(null), [fen])

  // Foca a primeira opção (Dama) assim que o seletor de promoção abre, pra quem usa teclado não
  // precisar adivinhar onde o foco foi parar — e Esc cancela o lance, igual clicar fora.
  const firstPromotionBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (pendingPromotion) firstPromotionBtnRef.current?.focus()
  }, [pendingPromotion])

  function tryDrop(sourceSquare: string, targetSquare: string): boolean {
    if (isPromotionMove(fen, sourceSquare, targetSquare)) {
      const color = fen.split(' ')[1] === 'b' ? 'b' : 'w'
      setPendingPromotion({ from: sourceSquare, to: targetSquare, color })
      return false
    }
    return onPieceDrop?.({ piece: null, sourceSquare, targetSquare }) ?? false
  }

  function handlePromotionPick(piece: string) {
    if (!pendingPromotion) return
    const { from, to } = pendingPromotion
    setPendingPromotion(null)
    onPieceDrop?.({ piece: null, sourceSquare: from, targetSquare: to, promotion: piece })
  }

  // Setas desenhadas à mão (botão direito segurando e arrastando até outra casa, igual
  // lichess/chess.com) e círculos/realces de casa (botão direito SEM arrastar, solta na mesma
  // casa — toggle igual lichess/chess.com: marca se não tinha, desmarca se já tinha). Somem
  // sozinhos quando a posição muda (lance de verdade), junto com a seleção acima.
  const [drawnArrows, setDrawnArrows] = useState<{ from: string; to: string }[]>([])
  const [drawnSquares, setDrawnSquares] = useState<string[]>([])
  const dragStartSquareRef = useRef<string | null>(null)
  useEffect(() => { setDrawnArrows([]); setDrawnSquares([]) }, [fen])

  // Detecta xeque/xeque-mate a partir da posição atual pra avisar visualmente — brilho vermelho
  // na casa do rei ameaçado, e um "#" ao lado se for mate mesmo (quem está em cheque é sempre
  // quem tem a vez de jogar no FEN atual).
  const checkInfo = useMemo(() => {
    try {
      const chess = new Chess(fen)
      if (!chess.inCheck()) return null
      const turnColor = chess.turn()
      for (const row of chess.board()) {
        for (const cell of row) {
          if (cell && cell.type === 'k' && cell.color === turnColor) {
            return { square: cell.square as string, isMate: chess.isCheckmate() }
          }
        }
      }
    } catch {
      // FEN momentaneamente inválido durante uma transição — ignora.
    }
    return null
  }, [fen])

  const legalTargets = useMemo(() => {
    const targets = new Map<string, boolean>() // square -> é captura?
    if (!interactive || !theme.showLegalMoves || !selectedSquare) return targets
    try {
      const chess = new Chess(fen)
      for (const m of chess.moves({ square: selectedSquare as Square, verbose: true })) {
        targets.set(m.to, !!m.captured || m.flags.includes('e'))
      }
    } catch {
      // FEN momentaneamente inválido durante uma transição — ignora, sem bolinhas nesse frame.
    }
    return targets
  }, [interactive, theme.showLegalMoves, selectedSquare, fen])

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {}

    if (theme.showLastMove && lastMove) {
      // Quando o lance atual foi classificado, a casa herda a cor da avaliação (com transparência)
      // em vez da cor fixa do tema, para ficar fácil de ver o resultado do lance de relance.
      if (currentQuality) {
        const tint = qualityAlphaColor(currentQuality, 0.45)
        styles[lastMove.from] = { backgroundColor: tint }
        styles[lastMove.to] = { backgroundColor: tint }
      } else {
        styles[lastMove.from] = { backgroundColor: bt.moveFrom }
        styles[lastMove.to] = { backgroundColor: bt.moveTo }
      }
    }

    if (selectedSquare) {
      styles[selectedSquare] = { ...styles[selectedSquare], backgroundColor: 'rgba(60,60,60,0.4)' }
    }

    for (const [square, isCapture] of legalTargets) {
      styles[square] = {
        ...styles[square],
        backgroundImage: isCapture
          // Captura: anel encostado na borda da casa (mesma linguagem visual do lichess/chess.com).
          ? 'radial-gradient(circle, transparent 0%, transparent 79%, rgba(60,60,60,0.55) 80%, rgba(60,60,60,0.55) 88%, transparent 89%)'
          // Casa vazia: bolinha pequena no centro.
          : 'radial-gradient(circle, rgba(60,60,60,0.55) 19%, transparent 20%)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
      }
    }

    if (hintSquare) {
      styles[hintSquare] = {
        ...styles[hintSquare],
        boxShadow: 'inset 0 0 0 3px var(--color-blue-bright)',
        // Anel pisca pra chamar atenção — mas só se o usuário não pediu menos movimento; sem
        // isso, fica só o anel sólido (não é uma opção, é o mínimo, o resto do app já tinha
        // ganchos de CSS pra isso, esse aqui não porque a lib só aceita style inline por square).
        ...(reducedMotion ? {} : { animation: 'cl-hint-pulse 1.1s ease-in-out infinite' }),
      }
    }

    if (checkInfo) {
      styles[checkInfo.square] = {
        ...styles[checkInfo.square],
        backgroundImage: 'radial-gradient(ellipse at center, rgba(255,0,0,0.9) 0%, rgba(231,0,0,0.65) 25%, rgba(169,0,0,0) 89%, rgba(158,0,0,0) 100%)',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
      }
    }

    return styles
  }, [lastMove, theme.showLastMove, bt, currentQuality, hintSquare, selectedSquare, legalTargets, checkInfo, reducedMotion])

  const customPieces = useMemo(() => buildCustomPieces(theme.pieceSet), [theme.pieceSet])

  const arrowsOption = useMemo(() => {
    const arr: { startSquare: string; endSquare: string; color: string }[] = []
    if (theme.showArrows && evaluation?.bestMove && evaluation.bestMove.length >= 4) {
      const bm = evaluation.bestMove
      // Seta de ameaça: vermelha quando o lance jogado foi ruim (indica o que deveria ter
      // sido jogado no lugar), teal nos demais casos — mesma lógica do chess.com.
      const isBadMove = currentQuality === 'mistake' || currentQuality === 'miss' || currentQuality === 'blunder'
      const color = isBadMove ? QUALITY_CONFIG.blunder.color : '#1BACA6'
      arr.push({ startSquare: bm.slice(0, 2), endSquare: bm.slice(2, 4), color })
    }
    return arr
  }, [evaluation?.bestMove, theme.showArrows, currentQuality])

  // `evaluation.cp`/`.mate` já vêm relativos às brancas (conversão feita dentro de
  // `useStockfish.ts`, usando o lado a jogar de quando aquela busca específica foi pedida — não
  // dá mais pra reconverter aqui usando o `fen` que a tela mostra AGORA, porque numa busca em
  // profundidade 18 (que pode levar vários segundos) esses dois "lado a jogar" ficam diferentes
  // boa parte do tempo, e recalcular o sinal com o lado errado é exatamente o bug real que o
  // usuário reportou ("avaliação mudando que nem louco" ao navegar lances).
  //
  // A cada lance o motor zera a linha por um instante (recomeça a busca do zero) — sem isso a
  // barra "piscava" pro centro e voltava pro valor certo pouco depois. Guarda o último valor já
  // convertido pra brancas e só atualiza quando chega avaliação nova de verdade, senão mantém
  // proporcional ao que já se sabia da posição.
  const lastEvalRef = useRef<{ cp: number; mate: number | null }>({ cp: 0, mate: null })
  if (evaluation) {
    lastEvalRef.current = { cp: evaluation.cp ?? 0, mate: evaluation.mate }
  }
  const evalCp = lastEvalRef.current.cp
  const evalMate = lastEvalRef.current.mate

  // Estilo "fora": mantém o footprint EXTERNO do componente (boardWidth x boardWidth, o <div>
  // mais externo abaixo) idêntico nos dois estilos — nenhum consumidor de `boardWidth`/
  // `BOARD_ROW_CHROME_WIDTH` precisa mudar. Em vez de crescer o componente, ENCOLHE o
  // quadriculado (as 8x8 casas de verdade) por dentro desse mesmo footprint, abrindo uma margem
  // (`boardInset`, usada como largura da trilha à esquerda E altura da trilha embaixo) — mesmo
  // canto onde a notação "dentro" já ficava, só que fora do quadriculado. Todo overlay abaixo que
  // posiciona algo em absoluto a partir do CONTAINER externo (setas, marcador de qualidade,
  // xeque-mate, seletor de promoção) soma `boardInset` no `.left` devolvido por `squareOrigin`
  // (que é sempre relativo ao quadriculado, começando em (boardInset, 0) dentro do container
  // quando a margem está aberta), senão desalinha da casa real com o estilo "fora" ativo.
  const coordinatesOutside = theme.showCoordinates && theme.coordinatesOutside
  const boardInset = coordinatesOutside ? Math.round(Math.min(34, Math.max(20, boardWidth * 0.055))) : 0
  const squareSize = (boardWidth - boardInset) / 8

  // Ordem dos rótulos da trilha externa (números 1-8 à esquerda, letras a-h embaixo) — mesma
  // lógica de flip por `boardOrientation` que `squareOrigin` já usa pra virar o tabuleiro.
  const numberLabels = useMemo(
    () => Array.from({ length: 8 }, (_, row) => (boardOrientation === 'white' ? 8 - row : row + 1)),
    [boardOrientation],
  )
  const fileLabels = useMemo(
    () => Array.from({ length: 8 }, (_, col) => (boardOrientation === 'white' ? FILES[col] : FILES[7 - col])),
    [boardOrientation],
  )
  const railFontSize = Math.round(Math.min(16, Math.max(10, boardInset * 0.48)))

  // Tamanho da fonte da notação (a-h/1-8) escala com a casa — o padrão da lib é um
  // 13px fixo, que fica minúsculo num tabuleiro grande.
  const notationFontSize = Math.round(Math.min(30, Math.max(18, squareSize * 0.23)))
  const notationStyles = useMemo(() => ({
    dark: { color: bt.light, fontWeight: 700 as const },
    light: { color: bt.dark, fontWeight: 700 as const },
    alpha: { fontSize: notationFontSize, fontWeight: 700 as const, position: 'absolute' as const, bottom: 2, right: 5, userSelect: 'none' as const },
    numeric: { fontSize: notationFontSize, fontWeight: 700 as const, position: 'absolute' as const, top: 2, left: 4, userSelect: 'none' as const },
  }), [bt, notationFontSize])

  const qualityMarkerOrigin = useMemo(() => {
    if (!currentQuality || !lastMove) return null
    const o = squareOrigin(lastMove.to, boardOrientation, squareSize)
    return { left: o.left + boardInset, top: o.top }
  }, [currentQuality, lastMove, boardOrientation, squareSize, boardInset])

  const checkmateOrigin = useMemo(() => {
    if (!checkInfo?.isMate) return null
    const o = squareOrigin(checkInfo.square, boardOrientation, squareSize)
    return { left: o.left + boardInset, top: o.top }
  }, [checkInfo, boardOrientation, squareSize, boardInset])

  // Junta as três fontes de seta num só array antes de calcular a geometria: as sugestões do
  // engine (`topMoveArrows`, prop), as de contexto (`extraArrows` — sugestão/dica dos treinos) e
  // as desenhadas à mão pelo usuário (botão direito, estado interno acima) — mesmo desenho
  // "quadrado" pras três, só muda cor/espessura/opacidade. `extraArrows` passava antes pelo
  // desenho padrão (mais grosso e arredondado) da lib — pedido direto do usuário: igualar ao
  // visual das setas desenhadas à mão (fino, ponta triangular, azul bebê).
  const arrowSpecs = useMemo(() => {
    const specs: { from: string; to: string; color: string; strokeWidth: number; opacity: number }[] = []
    if (topMoveArrows) {
      for (const a of topMoveArrows) specs.push({ ...a, opacity: a.opacity ?? 0.85 })
    }
    const userWidth = Math.max(3.5, squareSize * USER_ARROW_WIDTH_RATIO)
    for (const a of extraArrows ?? []) {
      specs.push({ from: a.startSquare, to: a.endSquare, color: a.color, strokeWidth: userWidth, opacity: a.opacity ?? 0.75 })
    }
    for (const a of drawnArrows) specs.push({ from: a.from, to: a.to, color: USER_ARROW_COLOR, strokeWidth: userWidth, opacity: 0.85 })
    // Deduplica por par (de/para): mantém só a última entrada de cada par, já que fontes mais
    // tardias (dica ativa, seta desenhada à mão) têm prioridade sobre uma sugestão mais fraca
    // que aponte pro mesmo lugar. Sem isso, duas setas empilhadas no mesmo quadrado (ex: a seta
    // de sugestão do Treino de Aberturas e a dica de lance completo, quando coincidem) pareciam
    // um bug visual — mecanismo compartilhado aqui em vez de cada chamador ter que suprimir a
    // própria seta na mão quando desconfia de colisão com outra fonte.
    const byPair = new Map<string, (typeof specs)[number]>()
    for (const s of specs) byPair.set(`${s.from}-${s.to}`, s)
    return [...byPair.values()]
  }, [topMoveArrows, extraArrows, drawnArrows, squareSize])

  // Geometria das setas de espessura variável — a lib só desenha com uma espessura fixa pro
  // tabuleiro inteiro, então essas são desenhadas à mão num SVG por cima do tabuleiro, com o
  // mesmo `squareOrigin` usado pelos outros marcadores. Lance de cavalo vira uma única seta "em
  // L" (o salto de verdade — 2 casas numa direção, 1 na outra) em vez de uma linha reta cruzando
  // na diagonal por cima de casas que a peça nem passa; sempre UMA seta só, nunca dois segmentos soltos.
  const customArrows = useMemo(() => {
    if (arrowSpecs.length === 0) return []

    const center = (square: string) => {
      const o = squareOrigin(square, boardOrientation, squareSize)
      return { x: o.left + boardInset + squareSize / 2, y: o.top + squareSize / 2 }
    }

    return arrowSpecs.map((a, i) => {
      const fileOf = (sq: string) => FILES.indexOf(sq[0])
      const rankOf = (sq: string) => Number(sq[1])
      const dFile = fileOf(a.to) - fileOf(a.from)
      const dRank = rankOf(a.to) - rankOf(a.from)
      const isKnightMove = (Math.abs(dFile) === 2 && Math.abs(dRank) === 1) || (Math.abs(dFile) === 1 && Math.abs(dRank) === 2)

      const start = center(a.from)
      // Cotovelo do "L": anda a perna LONGA (2 casas) primeiro, na mesma fileira/coluna do
      // início, depois vira 1 casa — a mesma casa real que o cavalo "sobrevoa" no meio do salto.
      const elbowSquare = Math.abs(dFile) === 2 ? a.to[0] + a.from[1] : a.from[0] + a.to[1]
      const points = isKnightMove ? [start, center(elbowSquare)] : [start]

      const endFull = center(a.to)
      const prev = points[points.length - 1]
      // Encurta só o ÚLTIMO trecho, ~30% de uma casa antes do centro do destino, senão a ponta
      // some debaixo da peça — mesmo efeito visual que lichess/chess.com usam nas setas.
      const dx = endFull.x - prev.x
      const dy = endFull.y - prev.y
      const len = Math.hypot(dx, dy) || 1
      const shorten = squareSize * 0.3
      points.push({ x: endFull.x - (dx / len) * shorten, y: endFull.y - (dy / len) * shorten })

      return {
        id: `cl-arrow-${i}-${a.from}${a.to}`,
        points: points.map((p) => `${p.x},${p.y}`).join(' '),
        color: a.color,
        strokeWidth: a.strokeWidth,
        opacity: a.opacity ?? 0.85,
      }
    })
  }, [arrowSpecs, boardOrientation, squareSize, boardInset])

  // Clicar numa peça seleciona (mostra as bolinhas); clicar numa casa de destino legal já
  // destacada joga o lance ali; qualquer outro clique cancela a seleção. Começar a arrastar
  // uma peça seleciona do mesmo jeito, pra a bolinha já aparecer durante o arraste.
  function handleSquareClick({ square, piece }: { square: string; piece: { pieceType: string } | null }) {
    if (!interactive) return
    if (selectedSquare && legalTargets.has(square)) {
      tryDrop(selectedSquare, square)
      setSelectedSquare(null)
      return
    }
    setSelectedSquare(piece && square !== selectedSquare ? square : null)
  }

  // Botão direito segura numa casa e solta em outra → desenha a seta (some sozinha na próxima
  // jogada). Soltar na MESMA casa (clique direito sem arrastar) → círculo/realce naquela casa
  // (toggle) — mesmo comportamento do lichess/chess.com. Usa os callbacks `onSquareMouseDown/Up`
  // da própria lib (dão a casa certinha, sem precisar calcular pixel↔casa na mão).
  function handleSquareMouseDown({ square }: { square: string }, e: React.MouseEvent) {
    if (e.button !== 2) return
    dragStartSquareRef.current = square
  }
  function handleSquareMouseUp({ square: to }: { square: string }, e: React.MouseEvent) {
    if (e.button !== 2) return
    const from = dragStartSquareRef.current
    dragStartSquareRef.current = null
    if (!from) return
    if (to === from) {
      setDrawnSquares((prev) => (prev.includes(to) ? prev.filter((s) => s !== to) : [...prev, to]))
      return
    }
    setDrawnArrows((prev) => {
      // Repetir a mesma seta remove ela (toggle) — senão só empilha, pra poder marcar quantas
      // linhas quiser sem precisar limpar tudo e desenhar de novo.
      const exists = prev.some((a) => a.from === from && a.to === to)
      return exists ? prev.filter((a) => !(a.from === from && a.to === to)) : [...prev, { from, to }]
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: ROW_GAP, height: boardWidth }}>
      {showEvalBar && <EvalBar evaluation={evalCp} isMate={evalMate} orientation={boardOrientation} />}

      <div style={{ width: boardWidth, height: boardWidth, flexShrink: 0, position: 'relative' }}>
        {/* Tabuleiros com foto (madeira/mármore/etc) — a imagem cobre o tabuleiro inteiro por
            trás; as casas da lib ficam transparentes (abaixo) pra ela aparecer. Os overlays de
            realce (última jogada, lances legais, dica, xeque) continuam por cima normalmente,
            já que são pintados via `squareStyles`, independente da cor/imagem de fundo. */}
        {bt.image && (
          <div
            aria-hidden
            style={{
              position: 'absolute', left: boardInset, top: 0, borderRadius: '4px', overflow: 'hidden',
              width: boardWidth - boardInset, height: boardWidth - boardInset,
              backgroundImage: `url(${bt.image})`, backgroundSize: '100% 100%',
            }}
          />
        )}
        <Chessboard
          options={{
            position: fen,
            squareStyles,
            // `topMoveArrows` (múltiplas sugestões, espessura por seta) substitui a seta única —
            // desenhada à mão no SVG logo abaixo, não pela lib.
            arrows: topMoveArrows ? [] : arrowsOption,
            boardOrientation,
            boardStyle: {
              position: 'absolute',
              left: boardInset,
              top: 0,
              borderRadius: '4px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              width: boardWidth - boardInset,
              height: boardWidth - boardInset,
            },
            darkSquareStyle: { backgroundColor: bt.image ? 'transparent' : bt.dark },
            lightSquareStyle: { backgroundColor: bt.image ? 'transparent' : bt.light },
            darkSquareNotationStyle: notationStyles.dark,
            lightSquareNotationStyle: notationStyles.light,
            alphaNotationStyle: notationStyles.alpha,
            numericNotationStyle: notationStyles.numeric,
            allowDragging: interactive,
            allowDrawingArrows: false,
            // Estilo "fora": a lib não desenha nada dentro da casa — a trilha de números/letras
            // ao redor do quadriculado é desenhada à mão logo abaixo (ver `coordinatesOutside`).
            showNotation: theme.showCoordinates && !coordinatesOutside,
            animationDurationInMs: ANIMATION_MS[theme.animationSpeed] ?? 150,
            pieces: customPieces,
            // Setas manuais (botão direito arrastando) — independente de `interactive`, dá pra
            // anotar mesmo num tabuleiro só de leitura (ex: revendo um lance no treino).
            onSquareMouseDown: handleSquareMouseDown,
            onSquareMouseUp: handleSquareMouseUp,
            ...(onPieceDrop ? { onPieceDrop: ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => (targetSquare ? tryDrop(sourceSquare, targetSquare) : false) } : {}),
            ...(interactive ? {
              onSquareClick: handleSquareClick,
              onPieceDrag: ({ square }) => setSelectedSquare(square),
            } : {}),
          }}
        />

        {/* Trilha de notação "fora das casas" (números 1-8 à esquerda, letras a-h embaixo) —
            desenhada à mão na margem aberta por `boardInset`, alinhada ao centro de cada
            linha/coluna do quadriculado real (mesmo `squareSize` dos overlays acima). */}
        {coordinatesOutside && (
          <>
            <div
              aria-hidden
              style={{ position: 'absolute', left: 0, top: 0, width: boardInset, height: boardWidth - boardInset, pointerEvents: 'none' }}
            >
              {numberLabels.map((rank, row) => (
                <div
                  key={rank}
                  style={{
                    position: 'absolute', left: 0, top: row * squareSize, width: boardInset, height: squareSize,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: railFontSize, fontWeight: 700, color: 'var(--color-gray-muted)', userSelect: 'none',
                  }}
                >
                  {rank}
                </div>
              ))}
            </div>
            <div
              aria-hidden
              style={{ position: 'absolute', left: boardInset, top: boardWidth - boardInset, width: boardWidth - boardInset, height: boardInset, pointerEvents: 'none' }}
            >
              {fileLabels.map((file, col) => (
                <div
                  key={file}
                  style={{
                    position: 'absolute', left: col * squareSize, top: 0, width: squareSize, height: boardInset,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: railFontSize, fontWeight: 700, color: 'var(--color-gray-muted)', userSelect: 'none',
                  }}
                >
                  {file}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Seletor de peça de promoção — some ao escolher, ao clicar fora ou com Esc (cancela o
            lance nos três casos). Foco vai pra 1ª opção ao abrir (ver efeito acima) e Tab circula
            só entre as 4 opções, já que são as únicas coisas interativas dentro do diálogo. */}
        {pendingPromotion && (() => {
          const o = squareOrigin(pendingPromotion.to, boardOrientation, squareSize)
          const origin = { left: o.left + boardInset, top: o.top }
          const goingDown = origin.top === 0
          return (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Escolher peça de promoção"
              onClick={() => setPendingPromotion(null)}
              onKeyDown={(e) => { if (e.key === 'Escape') setPendingPromotion(null) }}
              style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(10,9,6,0.6)', cursor: 'pointer' }}
            >
              {PROMOTION_PIECES.map((piece, i) => {
                const top = goingDown ? origin.top + i * squareSize : origin.top - i * squareSize
                const code = `${pendingPromotion.color}${piece.toUpperCase()}`
                return (
                  <button
                    key={piece}
                    ref={i === 0 ? firstPromotionBtnRef : undefined}
                    onClick={(e) => { e.stopPropagation(); handlePromotionPick(piece) }}
                    title={PROMOTION_LABELS[piece]}
                    aria-label={`Promover para ${PROMOTION_LABELS[piece]}`}
                    style={{
                      position: 'absolute', left: origin.left, top,
                      width: squareSize, height: squareSize,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-bg-panel)',
                      border: 'none',
                      boxShadow: i === 0 ? '0 4px 16px rgba(0,0,0,0.7)' : 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={`https://lichess1.org/assets/piece/${PIECE_SETS[theme.pieceSet]?.src ?? theme.pieceSet}/${code}.svg`}
                      style={PIECE_COLOR_FILTER[theme.pieceSet] ? { filter: PIECE_COLOR_FILTER[theme.pieceSet] } : undefined}
                      width="82%" height="82%" draggable={false} alt=""
                    />
                  </button>
                )
              })}
            </div>
          )
        })()}

        {/* Círculos/realces de casa desenhados à mão (botão direito sem arrastar) — anel vazado,
            mesma cor das setas do usuário, embaixo delas (zIndex menor) já que setas costumam
            terminar em cima de uma casa marcada. */}
        {drawnSquares.length > 0 && (
          <svg
            width={boardWidth}
            height={boardWidth}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 4 }}
          >
            {drawnSquares.map((sq) => {
              const o = squareOrigin(sq, boardOrientation, squareSize)
              const cx = o.left + squareSize / 2
              const cy = o.top + squareSize / 2
              const r = squareSize / 2 - squareSize * 0.06
              return (
                <circle
                  key={sq}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={USER_ARROW_COLOR}
                  strokeWidth={squareSize * 0.07}
                  opacity={0.85}
                />
              )
            })}
          </svg>
        )}

        {/* Setas "à mão" (topMoveArrows/extraArrows/desenhadas pelo usuário) — ver `customArrows`. */}
        {customArrows.length > 0 && (
          <svg
            width={boardWidth}
            height={boardWidth}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5 }}
          >
            <defs>
              {customArrows.map((a) => (
                <marker
                  key={a.id}
                  id={a.id}
                  markerWidth={4}
                  markerHeight={4}
                  refX={1.4}
                  refY={2}
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,4 L3,2 Z" fill={a.color} />
                </marker>
              ))}
            </defs>
            {customArrows.map((a) => (
              <polyline
                key={a.id}
                points={a.points}
                fill="none"
                stroke={a.color}
                strokeWidth={a.strokeWidth}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                opacity={a.opacity}
                markerEnd={`url(#${a.id})`}
              />
            ))}
          </svg>
        )}

        {/* Ícone de anotação do lance, ancorado na casa onde a peça foi jogada (estilo chess.com) */}
        {currentQuality && qualityMarkerOrigin && (
          <div
            style={{
              position: 'absolute',
              left: qualityMarkerOrigin.left,
              top: qualityMarkerOrigin.top,
              width: squareSize,
              height: squareSize,
              zIndex: 6,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -squareSize * 0.12,
                right: -squareSize * 0.12,
                ...(reducedMotion ? {} : { animation: 'pop 0.25s ease-out' }),
              }}
            >
              <SquareQualityMarker quality={currentQuality} size={squareSize * 0.46} />
            </div>
          </div>
        )}

        {/* "#" ao lado do rei que tomou mate */}
        {checkmateOrigin && (
          <div
            style={{
              position: 'absolute',
              left: checkmateOrigin.left,
              top: checkmateOrigin.top,
              width: squareSize,
              height: squareSize,
              zIndex: 7,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -squareSize * 0.12,
                right: -squareSize * 0.12,
                width: squareSize * 0.46,
                height: squareSize * 0.46,
                borderRadius: '50%',
                background: 'var(--color-error)',
                border: '2px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.55)',
                color: '#fff',
                fontSize: squareSize * 0.28,
                fontWeight: 800,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(reducedMotion ? {} : { animation: 'pop var(--dur-enter) var(--ease-snap)' }),
              }}
            >
              #
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
