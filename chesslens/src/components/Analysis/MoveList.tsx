import { useRef, useEffect, forwardRef, useMemo } from 'react'
import { Chess } from 'chess.js'
import { MoveQualityBadge } from '../Board/MoveQualityBadge'
import { QUALITY_CONFIG } from '../../utils/moveClassifier'
import type { ClassifiedMove, MoveClassification } from '../../types/chess.types'

interface MoveListProps {
  moves: ClassifiedMove[]
  currentMoveIndex: number
  onGoTo: (index: number) => void
}

// Classificações em que vale a pena mostrar "o que era melhor jogar" — erros de fato,
// não meras imprecisões (essas já ficam óbvias só pela cor/ícone do lance na lista).
const COACHABLE: MoveClassification[] = ['mistake', 'miss', 'blunder']

export function MoveList({ moves, currentMoveIndex, onGoTo }: MoveListProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentMoveIndex])

  const currentMove = currentMoveIndex >= 0 ? moves[currentMoveIndex] ?? null : null
  const priorFen = currentMoveIndex > 0 ? moves[currentMoveIndex - 1]?.fen ?? null : null

  const coachHint = useCoachHint(currentMove, priorFen)

  if (moves.length === 0) {
    return <p className="text-xs" style={{ color: 'var(--color-gray-muted)' }}>Carregue uma partida.</p>
  }

  const rows = Math.ceil(moves.length / 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'grid', gridTemplateColumns: '34px 1fr 1fr', alignItems: 'center', gap: 6,
          padding: '0 4px 6px', borderBottom: '1px solid var(--color-gray-border)',
        }}
      >
        <span />
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--color-gray-muted)', fontWeight: 700 }}>
          Brancas
        </span>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--color-gray-muted)', fontWeight: 700 }}>
          Pretas
        </span>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Array.from({ length: rows }, (_, i) => {
            const wIdx = i * 2
            const bIdx = i * 2 + 1
            const wMove = moves[wIdx]
            const bMove = moves[bIdx]

            return (
              <div
                key={i}
                style={{
                  display: 'grid', gridTemplateColumns: '34px 1fr 1fr', alignItems: 'center', gap: 6,
                  padding: '6px 4px', borderRadius: 'var(--radius-sm)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                }}
              >
                <span className="cl-mono" style={{ fontSize: 13, textAlign: 'center', color: 'var(--color-gray-muted)', fontWeight: 700 }}>
                  {i + 1}
                </span>

                <MoveBtn
                  move={wMove}
                  active={currentMoveIndex === wIdx}
                  ref={currentMoveIndex === wIdx ? activeRef : null}
                  onClick={() => onGoTo(wIdx)}
                />

                {bMove ? (
                  <MoveBtn
                    move={bMove}
                    active={currentMoveIndex === bIdx}
                    ref={currentMoveIndex === bIdx ? activeRef : null}
                    onClick={() => onGoTo(bIdx)}
                  />
                ) : (
                  <span />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {coachHint && <CoachHintCard hint={coachHint} />}
    </div>
  )
}

const MoveBtn = forwardRef<HTMLButtonElement, {
  move: ClassifiedMove
  active: boolean
  onClick: () => void
}>(({ move, active, onClick }, ref) => {
  // A notação do lance herda a cor da classificação (mesma cor do ícone na casa do tabuleiro),
  // para ficar fácil de identificar bons/maus lances direto na lista.
  const sanColor = active
    ? 'var(--color-text-on-light)'
    : move.classification
      ? QUALITY_CONFIG[move.classification].color
      : 'var(--color-text-on-dark)'

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`cl-move-btn flex items-center gap-2 px-2.5 py-2 text-sm text-left w-full ${active ? 'cl-move-active' : ''}`}
      style={{
        fontWeight: active || move.classification ? 700 : 400,
        borderRadius: 'var(--radius-sm)',
        transition: `background-color var(--dur-tap) var(--ease-tap), color var(--dur-tap) var(--ease-tap)`,
      }}
    >
      <span style={{ color: sanColor }}>{move.san}</span>
      {move.classification && (
        <MoveQualityBadge quality={move.classification} size="md" />
      )}
    </button>
  )
})
MoveBtn.displayName = 'MoveBtn'

interface CoachHint {
  playedSan: string
  bestSan: string
  quality: MoveClassification
  drop: number | null
}

/**
 * Quando o lance selecionado foi um erro (erro/erro grave/chance perdida) e o motor sabe
 * qual era o lance melhor, monta a dica "estilo coach": lance jogado vs. lance sugerido,
 * mais a avaliação perdida em peões. Converte o `bestMove` (UCI, ex: "e2e4") pra SAN
 * usando chess.js a partir da posição anterior ao lance — cai pro UCI cru se algo falhar.
 */
function useCoachHint(move: ClassifiedMove | null, priorFen: string | null): CoachHint | null {
  return useMemo(() => {
    if (!move || !move.classification || !COACHABLE.includes(move.classification)) return null
    if (!move.bestMove) return null

    let bestSan = move.bestMove
    try {
      const chess = new Chess(priorFen ?? undefined)
      const from = move.bestMove.slice(0, 2)
      const to = move.bestMove.slice(2, 4)
      const promotion = move.bestMove.length > 4 ? move.bestMove.slice(4, 5) : undefined
      const result = chess.move({ from, to, promotion })
      if (result) bestSan = result.san
    } catch {
      // Mantém o UCI cru como fallback — melhor mostrar algo do que nada.
    }

    let drop: number | null = null
    if (move.evalBefore !== null && move.evalAfter !== null) {
      const before = move.color === 'w' ? move.evalBefore : -move.evalBefore
      const after = move.color === 'w' ? move.evalAfter : -move.evalAfter
      drop = Math.max(0, before - after) / 100
    }

    return { playedSan: move.san, bestSan, quality: move.classification, drop }
  }, [move, priorFen])
}

function CoachHintCard({ hint }: { hint: CoachHint }) {
  const cfg = QUALITY_CONFIG[hint.quality]

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 9,
        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg-panel)', border: `1px solid ${cfg.color}`,
      }}
    >
      <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1.3 }}>💡</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-on-dark)', lineHeight: 1.45 }}>
          Você jogou <strong style={{ color: cfg.color }}>{hint.playedSan}</strong> — o lance mais forte era{' '}
          <strong style={{ color: 'var(--color-blue-bright)' }}>{hint.bestSan}</strong>.
        </p>
        {hint.drop !== null && hint.drop > 0 && (
          <p style={{ fontSize: 11, color: 'var(--color-gray-muted)' }}>
            Perdeu cerca de {hint.drop.toFixed(1)} de vantagem com esse lance.
          </p>
        )}
      </div>
    </div>
  )
}
