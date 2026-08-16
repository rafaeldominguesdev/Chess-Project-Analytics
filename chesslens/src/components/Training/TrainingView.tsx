import type { RefObject, SVGProps } from 'react'
import { usePuzzleTrainer } from '../../hooks/usePuzzleTrainer'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'
import { PUZZLE_RATING_MAX, PUZZLE_RATING_MIN } from '../../utils/puzzles'
import { TargetIcon } from '../Layout/icons'

interface TrainingViewProps {
  boardWidth: number
  containerRef: RefObject<HTMLDivElement | null>
}

const PRESETS: { label: string; min: number; max: number }[] = [
  { label: '1500–1700', min: 1500, max: 1700 },
  { label: '1700–1900', min: 1700, max: 1900 },
  { label: '1900–2100', min: 1900, max: 2100 },
  { label: '2100–2300', min: 2100, max: 2300 },
  { label: '2300–2500', min: 2300, max: 2500 },
]

const STATUS_META: Record<string, { text: string; color: string }> = {
  solving: { text: 'Encontre o melhor lance', color: 'var(--text-muted)' },
  correct: { text: 'Certo! Aguardando resposta…', color: '#4FB86A' },
  wrong: { text: 'Não é esse', color: '#E0554A' },
  solved: { text: 'Resolvido! 🎉', color: '#4FB86A' },
  empty: { text: 'Nenhum puzzle nessa faixa de rating', color: 'var(--text-muted)' },
}

function iconBase(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

function WrongIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  )
}

function LightbulbIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" />
    </svg>
  )
}

/**
 * Modo de treino de táticas — integrado no mesmo layout da tela de análise (não um modal):
 * tabuleiro grandão no centro na mesma coluna, com o rating do puzzle no lugar onde ficaria
 * o card do adversário, e os controles (faixa de rating, dica, próximo) no lugar do painel
 * de lances, à direita.
 */
export function TrainingView({ boardWidth, containerRef }: TrainingViewProps) {
  const {
    puzzle, fen, lastMove, status, solverColor, hintSquare,
    ratingRange, setRatingRange,
    solvedCount, wrongAttempts,
    attemptMove, nextPuzzle, retryPuzzle, showHint,
  } = usePuzzleTrainer({ min: 1500, max: 1700 })

  const meta = STATUS_META[status]
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH

  return (
    <>
      {/* Center — mesma coluna do tabuleiro de análise */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth }}>
          <RatingCard rating={puzzle?.rating} />
        </div>

        {status === 'empty' || !puzzle ? (
          <div style={{
            width: boardWidth, height: boardWidth, borderRadius: 4, border: '2px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
          }}>
            <span style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{meta.text}</span>
          </div>
        ) : (
          <ChessBoard
            fen={fen}
            lastMove={lastMove}
            evaluation={null}
            boardWidth={boardWidth}
            showEvalBar={false}
            interactive={status === 'solving'}
            boardOrientation={solverColor}
            hintSquare={hintSquare}
            onPieceDrop={({ sourceSquare, targetSquare }) => (targetSquare ? attemptMove(sourceSquare, targetSquare) : false)}
          />
        )}

        <div style={{
          width: cardWidth, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '10px 14px', borderRadius: 8,
          background: 'var(--surface)', border: `1.5px solid ${meta.color}`,
          transition: 'border-color 0.15s',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: meta.color }}>
            {status === 'wrong' && <WrongIcon />}
            {meta.text}
          </span>
          {status === 'wrong' && (
            <button onClick={retryPuzzle} className="cl-btn cl-btn-sm cl-btn-accent" style={{ padding: '6px 12px', fontSize: 12 }}>
              Tentar de novo
            </button>
          )}
        </div>
      </div>

      {/* Right — mesma posição/largura do painel de análise */}
      <aside style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', paddingRight: 2 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
          }}>
            <TargetIcon width={18} height={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', flex: 1 }}>Treino de Táticas</h2>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <SectionLabel>Faixa de rating</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {PRESETS.map((p) => {
                const isActive = ratingRange.min === p.min && ratingRange.max === p.max
                return (
                  <button
                    key={p.label}
                    onClick={() => setRatingRange({ min: p.min, max: p.max })}
                    className={`cl-btn cl-btn-sm${isActive ? ' cl-btn-selected' : ''}`}
                    style={{ padding: '6px 10px', fontSize: 12 }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RatingInput
                value={ratingRange.min}
                onChange={(v) => setRatingRange((r) => ({ min: Math.min(v, r.max), max: r.max }))}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>até</span>
              <RatingInput
                value={ratingRange.max}
                onChange={(v) => setRatingRange((r) => ({ min: r.min, max: Math.max(v, r.min) }))}
              />
            </div>
          </div>

          {puzzle && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10, padding: 14, borderRadius: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel>Esse puzzle</SectionLabel>
                <span className="cl-display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>
                  {puzzle.rating}
                </span>
              </div>
              {puzzle.themes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {puzzle.themes.slice(0, 4).map((t) => (
                    <span key={t} style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      background: 'var(--surface2)', color: 'var(--text-muted)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {wrongAttempts > 0 && status !== 'solved' && (
                <span style={{ fontSize: 11.5, color: '#E0554A' }}>
                  {wrongAttempts} tentativa{wrongAttempts > 1 ? 's' : ''} errada{wrongAttempts > 1 ? 's' : ''} nesse puzzle
                </span>
              )}
              <a href={puzzle.gameUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Ver partida original ↗
              </a>
            </div>
          )}

          {(status === 'solving' || status === 'wrong') && (
            <button onClick={showHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ padding: '9px 0', fontSize: 12.5, gap: 6 }}>
              <LightbulbIcon />
              Dica — mostrar a peça
            </button>
          )}

          <button
            onClick={nextPuzzle}
            className={`cl-btn ${status === 'solved' ? 'cl-btn-accent' : ''}`}
            style={{ padding: '12px 0', fontSize: 14 }}
          >
            {status === 'solved' ? 'Próximo puzzle →' : 'Pular puzzle'}
          </button>

          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center' }}>
            {solvedCount} resolvidos nessa sessão · banco com puzzles de {PUZZLE_RATING_MIN} a {PUZZLE_RATING_MAX}
          </div>
        </div>
      </aside>
    </>
  )
}

function RatingCard({ rating }: { rating?: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 8,
      background: 'var(--surface)', border: '1.5px solid var(--border)',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
        background: 'var(--surface2)', color: 'var(--accent)',
      }}>
        <TargetIcon width={20} height={20} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rating do puzzle
        </span>
        <span className="cl-display" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
          {rating ?? '—'}
        </span>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
      {children}
    </div>
  )
}

function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={PUZZLE_RATING_MIN}
      max={PUZZLE_RATING_MAX}
      step={50}
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10)
        if (!Number.isNaN(v)) onChange(Math.max(PUZZLE_RATING_MIN, Math.min(PUZZLE_RATING_MAX, v)))
      }}
      style={{
        width: 76, padding: '7px 8px', fontSize: 13, textAlign: 'center',
        background: 'var(--surface2)', border: '2px solid var(--border)', borderRadius: 8,
        color: 'var(--text)', outline: 'none',
      }}
    />
  )
}
