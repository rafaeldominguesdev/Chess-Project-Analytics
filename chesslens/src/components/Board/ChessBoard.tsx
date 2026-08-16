import { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import { EvalBar } from './EvalBar'
import { SquareQualityMarker } from './MoveQualityBadge'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES } from '../../utils/boardThemes'
import { buildCustomPieces } from '../../utils/pieceLoader'
import { qualityAlphaColor, QUALITY_CONFIG } from '../../utils/moveClassifier'
import type { StockfishEval } from '../../hooks/useStockfish'
import type { MoveQuality } from '../../utils/moveClassifier'

const EVAL_BAR_WIDTH = 24
const ROW_GAP = 8

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
  extraArrows?: { startSquare: string; endSquare: string; color: string }[]
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
  onPieceDrop,
  hintSquare,
}: ChessBoardProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]

  // Seleção de peça pra mostrar pra onde ela pode jogar (igual lichess/chess.com): clica numa
  // peça (ou começa a arrastar) e as casas de destino legal ganham uma bolinha — ou um anel,
  // se for captura. Some sozinho quando a posição muda (o lance foi feito) ou perde o foco.
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  useEffect(() => setSelectedSquare(null), [fen])

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
        animation: 'cl-hint-pulse 1.1s ease-in-out infinite',
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
  }, [lastMove, theme.showLastMove, bt, currentQuality, hintSquare, selectedSquare, legalTargets, checkInfo])

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
    if (extraArrows) arr.push(...extraArrows)
    return arr
  }, [evaluation?.bestMove, theme.showArrows, extraArrows, currentQuality])

  // O Stockfish reporta cp/mate relativo a quem tem a vez de jogar na posição atual (`fen`),
  // não relativo às brancas. Como a vez alterna a cada lance, sem essa inversão a barra
  // "pulava" de forma absurda a cada jogada — metade das vezes mostrando o lado errado.
  const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w'
  const evalCp = evaluation?.cp != null ? (sideToMove === 'w' ? evaluation.cp : -evaluation.cp) : 0
  const evalMate = evaluation?.mate != null ? (sideToMove === 'w' ? evaluation.mate : -evaluation.mate) : null

  const squareSize = boardWidth / 8
  // Tamanho da fonte da notação (a-h/1-8) escala com a casa — o padrão da lib é um
  // 13px fixo, que fica minúsculo num tabuleiro grande.
  const notationFontSize = Math.round(Math.min(22, Math.max(13, squareSize * 0.16)))
  const notationStyles = useMemo(() => ({
    dark: { color: bt.light, fontWeight: 700 as const },
    light: { color: bt.dark, fontWeight: 700 as const },
    alpha: { fontSize: notationFontSize, fontWeight: 700 as const, position: 'absolute' as const, bottom: 2, right: 5, userSelect: 'none' as const },
    numeric: { fontSize: notationFontSize, fontWeight: 700 as const, position: 'absolute' as const, top: 2, left: 4, userSelect: 'none' as const },
  }), [bt, notationFontSize])

  const qualityMarkerOrigin = useMemo(() => {
    if (!currentQuality || !lastMove) return null
    return squareOrigin(lastMove.to, boardOrientation, squareSize)
  }, [currentQuality, lastMove, boardOrientation, squareSize])

  const checkmateOrigin = useMemo(() => {
    if (!checkInfo?.isMate) return null
    return squareOrigin(checkInfo.square, boardOrientation, squareSize)
  }, [checkInfo, boardOrientation, squareSize])

  // Clicar numa peça seleciona (mostra as bolinhas); clicar numa casa de destino legal já
  // destacada joga o lance ali; qualquer outro clique cancela a seleção. Começar a arrastar
  // uma peça seleciona do mesmo jeito, pra a bolinha já aparecer durante o arraste.
  function handleSquareClick({ square, piece }: { square: string; piece: { pieceType: string } | null }) {
    if (!interactive) return
    if (selectedSquare && legalTargets.has(square)) {
      onPieceDrop?.({ piece: null, sourceSquare: selectedSquare, targetSquare: square })
      setSelectedSquare(null)
      return
    }
    setSelectedSquare(piece && square !== selectedSquare ? square : null)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: ROW_GAP, height: boardWidth }}>
      {showEvalBar && <EvalBar evaluation={evalCp} isMate={evalMate} orientation={boardOrientation} />}

      <div style={{ width: boardWidth, height: boardWidth, flexShrink: 0, position: 'relative' }}>
        <Chessboard
          options={{
            position: fen,
            squareStyles,
            arrows: arrowsOption,
            boardOrientation,
            boardStyle: {
              borderRadius: '4px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              width: boardWidth,
              height: boardWidth,
            },
            darkSquareStyle: { backgroundColor: bt.dark },
            lightSquareStyle: { backgroundColor: bt.light },
            darkSquareNotationStyle: notationStyles.dark,
            lightSquareNotationStyle: notationStyles.light,
            alphaNotationStyle: notationStyles.alpha,
            numericNotationStyle: notationStyles.numeric,
            allowDragging: interactive,
            allowDrawingArrows: false,
            showNotation: theme.showCoordinates,
            animationDurationInMs: ANIMATION_MS[theme.animationSpeed] ?? 150,
            pieces: customPieces,
            ...(onPieceDrop ? { onPieceDrop } : {}),
            ...(interactive ? {
              onSquareClick: handleSquareClick,
              onPieceDrag: ({ square }) => setSelectedSquare(square),
            } : {}),
          }}
        />

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
                animation: 'pop 0.25s ease-out',
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
                animation: 'pop var(--dur-enter) var(--ease-snap)',
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
