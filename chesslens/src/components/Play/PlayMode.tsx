import { useState, useCallback, useEffect, useRef } from 'react'
import { ChessBoard } from '../Board/ChessBoard'
import { Panel } from '../Panel'
import { useLiveBoard } from '../../hooks/useLiveBoard'
import { useEngineOpponent } from '../../hooks/useEngineOpponent'
import { useMoveSound } from '../../hooks/useMoveSound'
import { useStockfish } from '../../hooks/useStockfish'
import { useChessClock } from '../../hooks/useChessClock'
import { useBoardSize } from '../../hooks/useBoardSize'
import { useTheme } from '../../contexts/ThemeContext'

interface PlayModeProps {
  startFen?: string
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const LEVELS = [
  { label: 'Fácil', ms: 200 },
  { label: 'Médio', ms: 600 },
  { label: 'Difícil', ms: 1500 },
]

interface DropArgs { sourceSquare: string; targetSquare: string | null }

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function PlayerBar({ label, color, isEngine, active, ms, flagged }: {
  label: string
  color: 'w' | 'b'
  isEngine: boolean
  active: boolean
  ms: number
  flagged: boolean
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '4px 8px', borderRadius: 8, width: '100%',
        background: active ? 'linear-gradient(90deg, var(--surface2), var(--surface))' : 'var(--surface)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        {/* Avatar genérico (emoji) — este modo não tem identidade real do chess.com */}
        <div
          style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0, fontSize: 13,
            background: color === 'w' ? '#f5f5f5' : '#2b2b2b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isEngine ? '🤖' : '🙂'}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {color === 'w' ? '♔' : '♚'}
        </span>
      </div>

      <div
        style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 14, fontWeight: 800,
          padding: '3px 9px', borderRadius: 5, minWidth: 58, textAlign: 'center',
          background: flagged ? '#5E1A1A' : active ? 'var(--accent)' : 'var(--surface2)',
          color: flagged ? '#E84040' : active ? '#fff' : 'var(--text)',
        }}
      >
        {formatClock(ms)}
      </div>
    </div>
  )
}

export function PlayMode({ startFen = START_FEN }: PlayModeProps) {
  const live = useLiveBoard(startFen)
  const { bestMove } = useEngineOpponent()
  const { playForSan, play } = useMoveSound()
  const { theme } = useTheme()
  const { boardWidth, containerRef } = useBoardSize(theme.boardSize, { widthFactor: 0.94, maxSize: 920, heightReserve: 170 })
  // Instância própria (mais rasa) do Stockfish, só pra alimentar a barra de avaliação ao vivo.
  const { evaluation, isReady: engineReady, analyze } = useStockfish(12)
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w')
  const [level, setLevel] = useState(1)
  const [thinking, setThinking] = useState(false)
  const initial = useRef(startFen)

  const engineColor = playerColor === 'w' ? 'b' : 'w'
  const rawGameOver = live.isGameOver()
  const clock = useChessClock(live.turn, rawGameOver)
  const gameOver = rawGameOver || !!clock.flagged

  useEffect(() => {
    if (engineReady) analyze(live.fen)
  }, [live.fen, engineReady, analyze])

  const announceMove = useCallback((san: string) => {
    playForSan(san)
    if (live.isCheckmate()) play(live.getChess().turn() === playerColor ? 'defeat' : 'victory')
    else if (live.isDraw()) play('draw')
  }, [live, playerColor, playForSan, play])

  const requestEngineMove = useCallback(async () => {
    setThinking(true)
    const uci = await bestMove(live.fen, LEVELS[level].ms)
    setThinking(false)
    if (uci && uci.length >= 4) {
      const m = live.move(uci.slice(0, 2), uci.slice(2, 4), uci[4] ?? 'q')
      if (m) announceMove(m.san)
    }
  }, [bestMove, live, level, announceMove])

  // Engine joga quando for a vez dele
  useEffect(() => {
    if (gameOver) return
    if (live.turn === engineColor && !thinking) {
      const t = setTimeout(requestEngineMove, 250)
      return () => clearTimeout(t)
    }
  }, [live.fen, live.turn, engineColor, gameOver]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback(({ sourceSquare, targetSquare }: DropArgs): boolean => {
    if (!targetSquare) return false
    if (live.turn !== playerColor) return false
    if (gameOver) return false
    const m = live.move(sourceSquare, targetSquare)
    if (m) announceMove(m.san)
    return !!m
  }, [live, playerColor, announceMove, gameOver])

  const newGame = useCallback((color: 'w' | 'b') => {
    setPlayerColor(color)
    live.reset(initial.current)
    clock.reset()
  }, [live, clock])

  let status = 'Sua vez'
  if (clock.flagged) status = clock.flagged === playerColor ? '⏱️ Você perdeu no relógio' : '⏱️ Engine perdeu no relógio — você venceu!'
  else if (live.isCheckmate()) status = live.turn === playerColor ? '💀 Você perdeu (xeque-mate)' : '🏆 Você venceu!'
  else if (live.isDraw()) status = '🤝 Empate'
  else if (thinking) status = '🤖 Engine pensando…'
  else if (live.turn !== playerColor) status = 'Vez do engine'

  const topColor = engineColor
  const bottomColor = playerColor
  const topMs = topColor === 'w' ? clock.whiteMs : clock.blackMs
  const bottomMs = bottomColor === 'w' ? clock.whiteMs : clock.blackMs
  const rowWidth = boardWidth + 32 // tabuleiro + barra de avaliação + gaps (mesma convenção usada em App.tsx)

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
      <div ref={containerRef} style={{ flex: '1 1 480px', maxWidth: 960, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: rowWidth }}>
          <PlayerBar
            label="Adversário"
            color={topColor}
            isEngine
            active={!gameOver && live.turn === topColor}
            ms={topMs}
            flagged={clock.flagged === topColor}
          />
        </div>

        <ChessBoard
          fen={live.fen}
          lastMove={live.lastMove}
          evaluation={evaluation}
          isLoaded
          currentMoveIndex={0}
          totalMoves={0}
          boardWidth={boardWidth}
          showEvalBar
          showControls={false}
          interactive={live.turn === playerColor && !gameOver}
          boardOrientation={playerColor === 'w' ? 'white' : 'black'}
          onPieceDrop={onDrop}
        />

        <div style={{ width: rowWidth }}>
          <PlayerBar
            label="Você"
            color={bottomColor}
            isEngine={false}
            active={!gameOver && live.turn === bottomColor}
            ms={bottomMs}
            flagged={clock.flagged === bottomColor}
          />
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', textAlign: 'center', minHeight: 20 }}>
          {status}
        </div>
      </div>

      <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Panel icon="🤖" title="Jogar contra o engine">
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Nível</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {LEVELS.map((l, i) => (
              <button key={l.label} onClick={() => setLevel(i)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: level === i ? 'var(--accent)' : 'var(--surface2)', color: level === i ? 'var(--bg)' : 'var(--text-muted)' }}>
                {l.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button onClick={() => newGame('w')} style={pillBtn(playerColor === 'w')}>♔ Jogar de brancas</button>
            <button onClick={() => newGame('b')} style={pillBtn(playerColor === 'b')}>♚ Pretas</button>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => { if (live.history.length) { live.undo(); if (live.turn !== playerColor) live.undo() } }}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              ↶ Desfazer
            </button>
            <button onClick={() => { live.reset(initial.current); clock.reset() }}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--bg)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ↺ Reiniciar
            </button>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function pillBtn(active: boolean): React.CSSProperties {
  return { flex: 1, padding: '8px 6px', borderRadius: 8, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: active ? 'var(--surface2)' : 'transparent', color: 'var(--text)' }
}
