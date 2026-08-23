import { useState } from 'react'
import type { RefCallback, SVGProps } from 'react'
import { usePuzzleTrainer } from '../../hooks/usePuzzleTrainer'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'
import { PUZZLE_RATING_MAX, PUZZLE_RATING_MIN } from '../../utils/puzzles'
import { TargetIcon } from '../Layout/icons'

interface TrainingViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
}

interface Difficulty {
  key: 'iniciante' | 'facil' | 'medio' | 'dificil' | 'mestre'
  label: string
  min: number
  max: number
}

// Faixas de 600 a 3100+ agora (banco cresceu de 1500 pra ~3700 puzzles, ver utils/puzzles.ts) —
// "Iniciante" e "Mestre" são novas, as três do meio continuam do jeito que já estavam.
const DIFFICULTIES: Difficulty[] = [
  { key: 'iniciante', label: 'Iniciante', min: 600, max: 800 },
  { key: 'facil', label: 'Fácil', min: 1500, max: 1700 },
  { key: 'medio', label: 'Médio', min: 1900, max: 2100 },
  { key: 'dificil', label: 'Difícil', min: 2300, max: 2500 },
  { key: 'mestre', label: 'Mestre', min: 2900, max: 3100 },
]

function difficultyFor(min: number, max: number): Difficulty {
  return DIFFICULTIES.find((d) => d.min === min && d.max === max) ?? DIFFICULTIES[0]
}

const STATUS_META: Record<string, { text: string; color: string }> = {
  solving: { text: 'Encontre o melhor lance', color: 'var(--color-gray-muted)' },
  correct: { text: 'Certo! Aguardando resposta…', color: 'var(--color-success)' },
  wrong: { text: 'Não é esse', color: 'var(--color-error)' },
  solved: { text: 'Resolvido! 🎉', color: 'var(--color-success)' },
  empty: { text: 'Nenhum puzzle nessa faixa de rating', color: 'var(--color-gray-muted)' },
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

function MoveArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M5 12h11M12 6l7 6-7 6" />
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

function GearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5M18.4 18.4l-1.5-1.5M7.1 7.1 5.6 5.6" />
    </svg>
  )
}

/**
 * Modo de treino de táticas — integrado no mesmo layout da tela de análise (não um modal):
 * tabuleiro grandão no centro na mesma coluna, com o rating do puzzle e a dificuldade atual no
 * lugar onde ficaria o card do adversário, e os controles (dica, próximo) no lugar do painel de
 * lances, à direita. A dificuldade é escolhida por uma engrenagem no canto do tabuleiro — sem
 * tela separada antes de começar.
 */
export function TrainingView({ boardWidth, containerRef }: TrainingViewProps) {
  const {
    puzzle, fen, lastMove, status, solverColor, hintSquare, hintMove,
    ratingRange, setRatingRange,
    solvedCount, wrongAttempts,
    attemptMove, nextPuzzle, retryPuzzle, showHint, showMoveHint,
  } = usePuzzleTrainer({ min: 1500, max: 1700 })

  const [difficultyMenuOpen, setDifficultyMenuOpen] = useState(false)
  const difficulty = difficultyFor(ratingRange.min, ratingRange.max)

  function chooseDifficulty(d: Difficulty) {
    setRatingRange({ min: d.min, max: d.max })
    setDifficultyMenuOpen(false)
  }

  const meta = STATUS_META[status]
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH

  return (
    <>
      {/* Center — mesma coluna do tabuleiro de análise */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        {/* Engrenagem de dificuldade fica ao lado do card de rating (não mais sobre o tabuleiro —
            nessa posição antiga, o botão de 40x40 cobria o canto superior direito do tabuleiro
            inteiro em telas estreitas, escondendo a casa ali embaixo; achado da Fase 8/11). */}
        <div style={{ width: cardWidth, position: 'relative', display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <RatingCard rating={puzzle?.rating} difficultyLabel={difficulty.label} />
          </div>
          <button
            onClick={() => setDifficultyMenuOpen((v) => !v)}
            className={`cl-btn cl-btn-sm${difficultyMenuOpen ? ' cl-btn-selected' : ''}`}
            title="Trocar dificuldade"
            aria-label="Trocar dificuldade"
            style={{ flexShrink: 0 }}
          >
            <GearIcon width={17} height={17} />
          </button>

          {difficultyMenuOpen && (
            <div
              className="cl-modal-in"
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 9,
                display: 'flex', flexDirection: 'column', gap: 6, padding: 8,
                background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)', borderRadius: 'var(--radius-sm)',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 16px 36px -12px rgba(0,0,0,0.6)',
              }}
            >
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => chooseDifficulty(d)}
                  className={`cl-btn cl-btn-sm${d.key === difficulty.key ? ' cl-btn-selected' : ''}`}
                  style={{ width: 128, height: 'auto', padding: '8px 14px', fontSize: 12 }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === 'empty' || !puzzle ? (
          <div style={{
            width: boardWidth, height: boardWidth, borderRadius: 4, border: '2px dashed var(--color-gray-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
          }}>
            <span style={{ fontSize: 13.5, color: 'var(--color-gray-muted)' }}>{meta.text}</span>
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
            extraArrows={hintMove ? [{ startSquare: hintMove.from, endSquare: hintMove.to, color: 'var(--color-blue-bright)' }] : undefined}
            onPieceDrop={({ sourceSquare, targetSquare, promotion }) => (targetSquare ? attemptMove(sourceSquare, targetSquare, promotion) : false)}
          />
        )}

        <div style={{
          width: cardWidth, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-panel)', border: `1px solid ${meta.color}`,
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 16px 36px -12px rgba(0,0,0,0.6)',
          transition: 'border-color var(--dur-tap) var(--ease-tap)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: meta.color }}>
            {status === 'wrong' && <WrongIcon />}
            {meta.text}
          </span>
          {status === 'wrong' && (
            <button onClick={retryPuzzle} className="cl-btn cl-btn-sm cl-btn-accent" style={{ width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11 }}>
              Tentar de novo
            </button>
          )}
        </div>
      </div>

      {/* Right — mesma posição/largura do painel de análise */}
      <aside className="cl-tool-aside">
        <div className="cl-tool-aside-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {puzzle && (
            <div className="cl-card" style={{
              display: 'flex', flexDirection: 'column', gap: 10, padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <SectionLabel>Esse puzzle</SectionLabel>
                <span className="cl-mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-blue-bright)' }}>
                  {puzzle.rating}
                </span>
              </div>
              {puzzle.themes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {puzzle.themes.slice(0, 4).map((t) => (
                    <span key={t} style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-main)', color: 'var(--color-gray-muted)',
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {wrongAttempts > 0 && status !== 'solved' && (
                <span style={{ fontSize: 11.5, color: 'var(--color-error)' }}>
                  <span className="cl-mono">{wrongAttempts}</span> tentativa{wrongAttempts > 1 ? 's' : ''} errada{wrongAttempts > 1 ? 's' : ''} nesse puzzle
                </span>
              )}
              <a href={puzzle.gameUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)' }}>
                Ver partida original ↗
              </a>
            </div>
          )}

          {(status === 'solving' || status === 'wrong') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={showHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }}>
                <LightbulbIcon />
                Mostrar peça
              </button>
              <button onClick={showMoveHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }} title="Mostra o lance inteiro (de onde pra onde) como seta no tabuleiro">
                <MoveArrowIcon />
                Mostrar lance
              </button>
            </div>
          )}

          <button
            onClick={nextPuzzle}
            className={`cl-btn ${status === 'solved' ? 'cl-btn-accent' : ''}`}
            style={{ padding: '12px 0', fontSize: 13 }}
          >
            {status === 'solved' ? 'Próximo puzzle →' : 'Pular puzzle'}
          </button>

          <div style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', textAlign: 'center' }}>
            <span className="cl-mono">{solvedCount}</span> resolvidos nessa sessão · banco com puzzles de <span className="cl-mono">{PUZZLE_RATING_MIN}</span> a <span className="cl-mono">{PUZZLE_RATING_MAX}</span>
          </div>
        </div>
      </aside>
    </>
  )
}

function RatingCard({ rating, difficultyLabel }: { rating?: number; difficultyLabel: string }) {
  return (
    <div className="cl-card" style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
    }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
        background: 'var(--color-bg-main)', color: 'var(--color-blue-bright)',
      }}>
        <TargetIcon width={20} height={20} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Rating do puzzle
        </span>
        <span className="cl-mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.1 }}>
          {rating ?? '—'}
        </span>
      </div>
      <span style={{
        marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-blue-primary)', color: 'var(--color-text-on-light)', flexShrink: 0,
      }}>
        {difficultyLabel}
      </span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="cl-display" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-gray-muted)', marginBottom: 8 }}>
      {children}
    </div>
  )
}
