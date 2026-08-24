import type { RefCallback, SVGProps } from 'react'
import { useEndgameTrainer } from '../../hooks/useEndgameTrainer'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'
import { ENDGAME_CATEGORY_LABELS } from '../../analysis/endgamePositions'
import type { TablebaseCategory } from '../../analysis/endgameTablebase'
import { EndgameNavIcon } from '../Layout/icons'

interface EndgameTrainerViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
}

const STATUS_META: Record<string, { text: string; color: string }> = {
  loading: { text: 'Consultando a tablebase…', color: 'var(--color-gray-muted)' },
  solving: { text: 'Ache um lance que preserve o resultado', color: 'var(--color-gray-muted)' },
  wrong: { text: 'Esse lance perde o resultado teórico', color: 'var(--color-error)' },
  solved: { text: 'Resolvido! 🎉', color: 'var(--color-success)' },
  error: { text: 'Tablebase indisponível', color: 'var(--color-error)' },
}

// Categorias que a Tablebase devolve pra posição raiz, traduzidas pro contexto de "resultado
// teórico" que o treino mostra na tela — as variantes cursed-win/blessed-loss/maybe-* (ver
// endgameTablebase.ts) caem no mesmo rótulo da categoria "de verdade" mais próxima; não deveriam
// aparecer nas posições pequenas desse conjunto inicial, mas o mapeamento cobre também.
const CATEGORY_DISPLAY: Record<TablebaseCategory, string> = {
  win: 'Vitória teórica', 'cursed-win': 'Vitória teórica', 'maybe-win': 'Vitória provável',
  loss: 'Derrota teórica', 'blessed-loss': 'Derrota teórica', 'maybe-loss': 'Derrota provável',
  draw: 'Empate teórico', unknown: 'Resultado desconhecido',
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

function MoveArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M5 12h11M12 6l7 6-7 6" />
    </svg>
  )
}

/**
 * Treino de Finais: pega a próxima posição de um conjunto pequeno de finais conhecidos (K+P vs K,
 * K+R vs K, K+Q vs K, Torre vs Peão, finais de peão básicos), consulta a Tablebase pública do
 * Lichess pra saber os lances que preservam o resultado teórico da posição, e treina um lance por
 * vez — mesmo layout de coluna central + painel lateral dos outros treinos (Puzzles/Aberturas/
 * Erros). Diferente deles, depende de rede (a consulta à tablebase) — trata falha explicitamente
 * com um status próprio em vez de deixar a tela travada sem explicação.
 */
export function EndgameTrainerView({ boardWidth, containerRef }: EndgameTrainerViewProps) {
  const {
    status, errorMessage, current, fen, lastMove, wrongAttempts, tablebase,
    hintStage, hintSquare, hintMove, stats, totalInQueue,
    attemptMove, nextPosition, retry, retryFetch, showPieceHint, showMoveHint,
  } = useEndgameTrainer()

  const meta = STATUS_META[status]
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH
  const boardOrientation = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  const categoryMastery = current ? stats[current.category]?.mastery ?? null : null

  return (
    <>
      {/* Center — mesma coluna do tabuleiro de análise */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth }}>
          <EndgameCard
            categoryLabel={current ? ENDGAME_CATEGORY_LABELS[current.category] : '—'}
            positionLabel={current?.label ?? null}
            mastery={categoryMastery}
            resultLabel={tablebase ? CATEGORY_DISPLAY[tablebase.category] : null}
          />
        </div>

        {status === 'loading' || status === 'error' || !current ? (
          <div style={{
            width: boardWidth, height: boardWidth, borderRadius: 4, border: '2px dashed var(--color-gray-border)',
            display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
          }}>
            <span style={{ fontSize: 13.5, color: 'var(--color-gray-muted)' }}>
              {status === 'error' ? errorMessage : meta.text}
            </span>
            {status === 'error' && (
              <button onClick={retryFetch} className="cl-btn cl-btn-accent cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '8px 16px' }}>
                Tentar de novo
              </button>
            )}
          </div>
        ) : (
          <ChessBoard
            fen={fen}
            lastMove={lastMove}
            evaluation={null}
            boardWidth={boardWidth}
            showEvalBar={false}
            interactive={status === 'solving'}
            boardOrientation={boardOrientation}
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
            {status === 'error' ? 'Tablebase indisponível' : meta.text}
          </span>
          {status === 'wrong' && (
            <button onClick={retry} className="cl-btn cl-btn-sm cl-btn-accent" style={{ width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11 }}>
              Tentar de novo
            </button>
          )}
        </div>
      </div>

      {/* Right — mesma posição/largura do painel de análise */}
      <aside className="cl-tool-aside">
        <div className="cl-tool-aside-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {current && (
            <div className="cl-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 12px', textAlign: 'center' }}>
              <SectionLabel>Essa posição</SectionLabel>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.3 }}>
                {current.label}
              </span>
              {wrongAttempts > 0 && status !== 'solved' && (
                <span className="cl-mono" style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--color-error)',
                  padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-main)',
                }}>
                  {wrongAttempts} tentativa{wrongAttempts > 1 ? 's' : ''} errada{wrongAttempts > 1 ? 's' : ''} nessa posição
                </span>
              )}
            </div>
          )}

          {(status === 'solving' || status === 'wrong') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={showPieceHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }}>
                <LightbulbIcon />
                Mostrar peça
              </button>
              <button onClick={showMoveHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }} title="Mostra o lance inteiro (de onde pra onde) como seta no tabuleiro">
                <MoveArrowIcon />
                Mostrar lance
              </button>
            </div>
          )}
          {hintStage !== 'none' && (
            <div style={{ fontSize: 11, textAlign: 'center', color: 'var(--color-gray-muted)' }}>
              Dica: um lance que preserva o resultado — pode não ser o único certo.
            </div>
          )}

          <button
            onClick={nextPosition}
            disabled={status === 'loading' || totalInQueue === 0}
            className={`cl-btn ${status === 'solved' ? 'cl-btn-accent' : ''}`}
            style={{ padding: '12px 0', fontSize: 13 }}
          >
            {status === 'solved' ? 'Próxima posição →' : 'Pular essa'}
          </button>

          <div style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', textAlign: 'center' }}>
            <span className="cl-mono">{totalInQueue}</span> posiç{totalInQueue === 1 ? 'ão' : 'ões'} no conjunto de finais
          </div>
        </div>
      </aside>
    </>
  )
}

function EndgameCard({ categoryLabel, positionLabel, mastery, resultLabel }: {
  categoryLabel: string
  positionLabel: string | null
  /** Mastery salvo pra ESSA categoria de final específica (não uma média entre categorias) —
   *  `null` quando ainda não há histórico registrado pra ela. */
  mastery: number | null
  /** Resultado teórico da posição atual (vitória/empate/derrota), só depois que a tablebase
   *  responder — `null` enquanto ainda está carregando ou deu erro. */
  resultLabel: string | null
}) {
  return (
    <div className="cl-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
        background: 'var(--color-bg-main)', color: 'var(--color-blue-bright)',
      }}>
        <EndgameNavIcon width={20} height={20} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {positionLabel ?? 'Tipo de final'}
        </span>
        <span className="cl-mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {categoryLabel}
        </span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        {resultLabel && (
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-blue-primary)', color: 'var(--color-text-on-light)',
          }}>
            {resultLabel}
          </span>
        )}
        {mastery !== null && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)' }}>
            {mastery}% domínio
          </span>
        )}
      </div>
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
