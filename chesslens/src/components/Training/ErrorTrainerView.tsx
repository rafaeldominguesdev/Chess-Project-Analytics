import { useState } from 'react'
import type { RefCallback, SVGProps } from 'react'
import { useErrorTrainer } from '../../hooks/useErrorTrainer'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'
import { MISTAKE_REASON_LABELS } from '../../analysis/mistakeReasons'
import type { MistakeReason } from '../../analysis/mistakeReasons'
import { GearIcon } from '../Layout/icons'

interface ErrorTrainerViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
  /** CTA da tela vazia ("Analisar uma partida") — mesmo callback que o item "Analisar" da
   *  sidebar já usa, sem precisar de lógica nova no App.tsx. */
  onGoToAnalyze: () => void
  /** Deep-link vindo do Relatório do jogador (Sprint 3e, "treinar isso agora") — filtro inicial
   *  da fila, pulando direto pro motivo que a pessoa clicou. */
  initialReasonFilter?: MistakeReason
}

const REASON_FILTERS: (MistakeReason | 'all')[] = ['all', 'hanging_piece', 'missed_fork', 'pin', 'back_rank', 'generic']

function filterLabel(f: MistakeReason | 'all'): string {
  return f === 'all' ? 'Todos os motivos' : MISTAKE_REASON_LABELS[f]
}

const STATUS_META: Record<string, { text: string; color: string }> = {
  loading: { text: 'Procurando erros nas suas partidas analisadas…', color: 'var(--color-gray-muted)' },
  solving: { text: 'Ache o lance que era melhor', color: 'var(--color-gray-muted)' },
  wrong: { text: 'Não é esse lance', color: 'var(--color-error)' },
  solved: { text: 'Resolvido! 🎉', color: 'var(--color-success)' },
  empty: { text: 'Nenhum erro encontrado nas suas partidas analisadas ainda.', color: 'var(--color-gray-muted)' },
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

function TargetPieceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
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
 * Treino de Erros: varre as partidas já analisadas e salvas atrás de lances errados, descobre o
 * motivo de cada um (peça pendurada/garfo/cravada/back-rank/genérico) e treina um lance por vez
 * — mesmo layout de coluna central + painel lateral dos outros dois treinos (Puzzles/Aberturas).
 */
export function ErrorTrainerView({ boardWidth, containerRef, onGoToAnalyze, initialReasonFilter }: ErrorTrainerViewProps) {
  const {
    status, current, reason, fen, lastMove, wrongAttempts, hintStage, hintSquare, hintMove,
    reasonFilter, setReasonFilter, stats, totalInQueue,
    attemptMove, nextItem, retry, showReasonHint, showPieceHint, showMoveHint,
  } = useErrorTrainer(initialReasonFilter)

  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const meta = STATUS_META[status]
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH
  const boardOrientation = current?.playerColor === 'b' ? 'black' : 'white'

  function chooseFilter(f: MistakeReason | 'all') {
    setReasonFilter(f)
    setFilterMenuOpen(false)
  }

  return (
    <>
      {/* Center — mesma coluna do tabuleiro de análise */}
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth, position: 'relative', display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ReasonCard reasonLabel={reason ? MISTAKE_REASON_LABELS[reason] : '—'} mastery={reason ? stats[reason]?.mastery ?? null : null} />
          </div>
          <button
            onClick={() => setFilterMenuOpen((v) => !v)}
            className={`cl-btn cl-btn-sm${filterMenuOpen ? ' cl-btn-selected' : ''}`}
            title="Filtrar por motivo"
            aria-label="Filtrar por motivo"
            style={{ flexShrink: 0 }}
          >
            <GearIcon width={17} height={17} />
          </button>

          {filterMenuOpen && (
            <div
              className="cl-modal-in"
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 9,
                display: 'flex', flexDirection: 'column', gap: 6, padding: 8,
                background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)', borderRadius: 'var(--radius-sm)',
                boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 16px 36px -12px rgba(0,0,0,0.6)',
              }}
            >
              {REASON_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => chooseFilter(f)}
                  className={`cl-btn cl-btn-sm${f === reasonFilter ? ' cl-btn-selected' : ''}`}
                  style={{ width: 168, height: 'auto', padding: '8px 14px', fontSize: 12, textAlign: 'left' }}
                >
                  {filterLabel(f)}
                </button>
              ))}
            </div>
          )}
        </div>

        {status === 'loading' || status === 'empty' || !current ? (
          <div style={{
            width: boardWidth, height: boardWidth, borderRadius: 4, border: '2px dashed var(--color-gray-border)',
            display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
          }}>
            <span style={{ fontSize: 13.5, color: 'var(--color-gray-muted)' }}>{meta.text}</span>
            {status === 'empty' && (
              <button onClick={onGoToAnalyze} className="cl-btn cl-btn-accent cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '8px 16px' }}>
                Analisar uma partida
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
            {meta.text}
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
            <div className="cl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
              <SectionLabel>Essa partida</SectionLabel>
              <span style={{ fontSize: 12.5, color: 'var(--color-text-on-dark)' }}>
                {current.gameInfo.white} vs {current.gameInfo.black}
              </span>
              {wrongAttempts > 0 && status !== 'solved' && (
                <span style={{ fontSize: 11.5, color: 'var(--color-error)' }}>
                  <span className="cl-mono">{wrongAttempts}</span> tentativa{wrongAttempts > 1 ? 's' : ''} errada{wrongAttempts > 1 ? 's' : ''} nesse lance
                </span>
              )}
            </div>
          )}

          {(status === 'solving' || status === 'wrong') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={showReasonHint} disabled={status !== 'solving' || hintStage !== 'none'} className="cl-btn cl-btn-sm" style={{ width: '100%', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }}>
                <TargetPieceIcon />
                Mostrar motivo
              </button>
              {hintStage !== 'none' && reason && (
                <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--color-blue-bright)', fontWeight: 700 }}>
                  {MISTAKE_REASON_LABELS[reason]}
                </div>
              )}
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
            </div>
          )}

          <button
            onClick={nextItem}
            disabled={status === 'loading' || totalInQueue === 0}
            className={`cl-btn ${status === 'solved' ? 'cl-btn-accent' : ''}`}
            style={{ padding: '12px 0', fontSize: 13 }}
          >
            {status === 'solved' ? 'Próximo erro →' : 'Pular esse'}
          </button>

          <div style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', textAlign: 'center' }}>
            <span className="cl-mono">{totalInQueue}</span> {totalInQueue === 1 ? 'erro' : 'erros'} na fila{reasonFilter !== 'all' ? ` · ${filterLabel(reasonFilter)}` : ''}
          </div>
        </div>
      </aside>
    </>
  )
}

function ReasonCard({ reasonLabel, mastery }: {
  reasonLabel: string
  /** Mastery salvo pra ESSE motivo específico (não uma média entre motivos) — `null` quando
   *  ainda não há histórico registrado pra ele. */
  mastery: number | null
}) {
  return (
    <div className="cl-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
        background: 'var(--color-bg-main)', color: 'var(--color-blue-bright)',
      }}>
        <LightbulbIcon width={20} height={20} />
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Motivo do erro
        </span>
        <span className="cl-mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {reasonLabel}
        </span>
      </div>
      {mastery !== null && (
        <span style={{
          marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-blue-primary)', color: 'var(--color-text-on-light)', flexShrink: 0,
        }}>
          {mastery}% domínio
        </span>
      )}
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
