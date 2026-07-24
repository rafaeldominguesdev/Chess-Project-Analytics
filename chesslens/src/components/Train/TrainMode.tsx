import { useState, useCallback } from 'react'
import { ChessBoard } from '../Board/ChessBoard'
import { Panel } from '../Panel'
import { MoveQualityBadge } from '../Board/MoveQualityBadge'
import { useLiveBoard } from '../../hooks/useLiveBoard'
import { useMoveSound } from '../../hooks/useMoveSound'
import type { ClassifiedMove } from '../../types/chess.types'

interface TrainModeProps {
  moves: ClassifiedMove[]
  isLoaded: boolean
  boardWidth: number
}

interface DropArgs { sourceSquare: string; targetSquare: string | null }

export function TrainMode({ moves, isLoaded, boardWidth }: TrainModeProps) {
  const live = useLiveBoard()
  const { playForSan, play } = useMoveSound()
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle')

  const ply = live.history.length
  const expected = moves[ply]
  const finished = isLoaded && ply >= moves.length && moves.length > 0

  const onDrop = useCallback(({ sourceSquare, targetSquare }: DropArgs): boolean => {
    if (!targetSquare || !expected) return false
    if (sourceSquare === expected.from && targetSquare === expected.to) {
      live.move(expected.from, expected.to)
      playForSan(expected.san)
      setCorrect((c) => c + 1)
      setFeedback('correct')
      return true
    }
    setWrong((w) => w + 1)
    setFeedback('wrong')
    play('error')
    return false
  }, [expected, live, playForSan, play])

  const reveal = useCallback(() => {
    if (!expected) return
    live.move(expected.from, expected.to)
    playForSan(expected.san)
    setFeedback('revealed')
  }, [expected, live, playForSan])

  const restart = useCallback(() => {
    live.reset()
    setCorrect(0); setWrong(0); setFeedback('idle')
  }, [live])

  const sideToGuess = live.turn === 'w' ? 'Brancas' : 'Pretas'

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 300, color: 'var(--text-muted)' }}>
        <span style={{ fontSize: 40 }}>🎯</span>
        <p style={{ fontSize: 15 }}>Carregue uma partida para treinar.</p>
        <p style={{ fontSize: 12 }}>Você vai tentar adivinhar cada lance jogado.</p>
      </div>
    )
  }

  const total = moves.length

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
      <ChessBoard
        fen={live.fen}
        lastMove={live.lastMove}
        evaluation={null}
        isLoaded
        currentMoveIndex={0}
        totalMoves={0}
        boardWidth={boardWidth}
        showEvalBar={false}
        showControls={false}
        interactive={!finished}
        onPieceDrop={onDrop}
      />

      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Panel icon="🎯" title="Treino — adivinhe o lance">
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, textAlign: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '8px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#27ae60' }}>{correct}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ACERTOS</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', background: 'var(--surface2)', borderRadius: 8, padding: '8px 0' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#e84040' }}>{wrong}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ERROS</div>
            </div>
          </div>

          {finished ? (
            <p style={{ fontSize: 14, textAlign: 'center', color: 'var(--accent)', fontWeight: 700, padding: '8px 0' }}>
              🏁 Fim da partida!
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>
                Lance {ply + 1} de {total} — vez das <b>{sideToGuess}</b>.
              </p>

              <div style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginBottom: 10,
                background: feedback === 'correct' ? 'rgba(39,174,96,0.15)' : feedback === 'wrong' ? 'rgba(232,64,64,0.15)' : 'var(--surface2)' }}>
                {feedback === 'correct' && <span style={{ color: '#27ae60', fontWeight: 700, fontSize: 13 }}>✓ Correto! Continue.</span>}
                {feedback === 'wrong' && <span style={{ color: '#e84040', fontWeight: 700, fontSize: 13 }}>✗ Não foi esse. Tente de novo.</span>}
                {feedback === 'revealed' && expected && (
                  <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    Era <b style={{ color: 'var(--accent)' }}>{expected.san}</b>
                    {expected.classification && <MoveQualityBadge quality={expected.classification} size="sm" />}
                  </span>
                )}
                {feedback === 'idle' && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Arraste a peça do lance que você acha que foi jogado.</span>}
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={reveal} style={btn('var(--surface2)', 'var(--text)')}>👁 Revelar</button>
                <button onClick={() => { reveal(); setFeedback('idle') }} style={btn('var(--surface2)', 'var(--text)')}>⏭ Pular</button>
              </div>
            </>
          )}

          <button onClick={restart} style={{ ...btn('var(--accent)', 'var(--bg)'), width: '100%', marginTop: 10 }}>↺ Reiniciar treino</button>
        </Panel>
      </div>
    </div>
  )
}

function btn(bg: string, color: string): React.CSSProperties {
  return { flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: bg, color }
}
