import type { RefCallback, SVGProps } from 'react'
import { useDailyPuzzle } from '../../hooks/useDailyPuzzle'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'

interface DailyPuzzleViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
}

const STATUS_META: Record<string, { text: string; color: string }> = {
  solving: { text: 'Encontre o melhor lance', color: 'var(--color-gray-muted)' },
  correct: { text: 'Certo! Aguardando resposta…', color: 'var(--color-success)' },
  wrong: { text: 'Não é esse', color: 'var(--color-error)' },
  solved: { text: 'Resolvido! 🎉', color: 'var(--color-success)' },
}

function iconBase(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}
function WrongIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...iconBase(props)}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>
}
function LightbulbIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...iconBase(props)}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" /></svg>
}
function MoveArrowIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...iconBase(props)}><path d="M5 12h11M12 6l7 6-7 6" /></svg>
}
function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return <svg {...iconBase(props)}><path d="M12 2c1 3-1 4.5-2.5 6.5C8 10.5 7 12 7 14a5 5 0 0 0 10 0c0-2-1.2-3.8-2.5-5.5C13 6.5 13 4 12 2Z" /></svg>
}

function formatToday(): string {
  const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Puzzle Diário — um puzzle por dia, o mesmo pra todo mundo, que não repete até o banco esgotar
 * (ver `analysis/dailyPuzzle.ts`). Reaproveita o mesmo tabuleiro e a mesma UX de resolver do
 * Treino de táticas, mas sem seletor de dificuldade: a proposta é "o desafio de hoje", com
 * sequência de dias seguidos (streak) guardada no `localStorage`.
 */
export function DailyPuzzleView({ boardWidth, containerRef }: DailyPuzzleViewProps) {
  const {
    daily, fen, lastMove, status, solverColor,
    wrongAttempts, hintSquare, hintMove, alreadyDoneToday,
    streak, best, totalSolved,
    attemptMove, retry, showPieceHint, showMoveHint,
  } = useDailyPuzzle()

  const meta = STATUS_META[status]
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH
  const solved = status === 'solved'

  return (
    <>
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        {/* Cartão do topo — data + categoria do puzzle de hoje (mesma posição do card de rating
            no Treino de táticas / card de família nas Aberturas). */}
        <div className="cl-card" style={{ width: cardWidth, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
          <img src="/icon-diario.png" alt="" width={38} height={38} style={{ flexShrink: 0, display: 'block' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Puzzle de hoje
            </span>
            <span className="cl-display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {formatToday()}
            </span>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
            background: 'var(--color-blue-primary)', color: 'var(--color-text-on-light)',
          }}>
            {daily.category.label}
          </span>
        </div>

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

        <div style={{
          width: cardWidth, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-panel)', border: `1px solid ${meta.color}`,
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 16px 36px -12px rgba(0,0,0,0.6)',
          transition: 'border-color var(--dur-tap) var(--ease-tap)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: meta.color }}>
            {status === 'wrong' && <WrongIcon />}
            {solved && alreadyDoneToday && !wrongAttempts ? 'Você já resolveu o de hoje ✓' : meta.text}
          </span>
          {status === 'wrong' && (
            <button onClick={retry} className="cl-btn cl-btn-sm cl-btn-accent" style={{ width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11 }}>
              Tentar de novo
            </button>
          )}
        </div>
      </div>

      <aside className="cl-tool-aside">
        {/* Painel de infos centralizado na vertical (pedido do usuário) — mesmo padrão que o
            Treino de Aberturas já usa (`flex:1; minHeight:0; justifyContent:center` no próprio
            scroll): fica no meio da coluna da direita, e o `overflow-y:auto` da classe ainda dá
            scroll se um dia o conteúdo passar da altura da tela. */}
        <div className="cl-tool-aside-scroll" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, justifyContent: 'center', gap: 10, paddingRight: 2 }}>
          {/* Sequência de dias seguidos */}
          <div className="cl-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: 'var(--radius-sm)', flexShrink: 0,
              background: 'var(--color-bg-main)', color: streak > 0 ? 'var(--color-error)' : 'var(--color-gray-muted)',
            }}>
              <FlameIcon width={20} height={20} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span className="cl-mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.1 }}>
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sequência {best > 0 && `· recorde ${best}`}
              </span>
            </div>
          </div>

          <div className="cl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
            <div className="cl-display" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-gray-muted)' }}>
              Objetivo
            </div>
            <span style={{ fontSize: 13.5, color: 'var(--color-text-on-dark)', fontWeight: 600 }}>
              {daily.category.goal} — jogando de {solverColor === 'white' ? 'brancas' : 'pretas'}.
            </span>
            {daily.puzzle.themes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {daily.puzzle.themes.slice(0, 4).map((t) => (
                  <span key={t} style={{
                    fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-main)', color: 'var(--color-gray-muted)',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {wrongAttempts > 0 && !solved && (
              <span style={{ fontSize: 11.5, color: 'var(--color-error)' }}>
                <span className="cl-mono">{wrongAttempts}</span> tentativa{wrongAttempts > 1 ? 's' : ''} errada{wrongAttempts > 1 ? 's' : ''}
              </span>
            )}
            {solved && (
              <a href={daily.puzzle.gameUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)' }}>
                Ver partida original ↗
              </a>
            )}
          </div>

          {(status === 'solving' || status === 'wrong') && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={showPieceHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }}>
                <LightbulbIcon />
                Mostrar peça
              </button>
              <button onClick={showMoveHint} disabled={status !== 'solving'} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '9px 0', fontSize: 11.5, gap: 6 }} title="Mostra o lance inteiro como seta no tabuleiro">
                <MoveArrowIcon />
                Mostrar lance
              </button>
            </div>
          )}

          {solved && (
            <div style={{
              padding: '14px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
              background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
              fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.6,
            }}>
              Volte amanhã pro próximo desafio.
              <br />
              <span className="cl-mono" style={{ color: 'var(--color-text-on-dark)' }}>{totalSolved}</span> puzzles diários resolvidos no total.
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
