import { useMemo, useState } from 'react'
import type { RefCallback, SVGProps } from 'react'
import { useOpeningTrainer } from '../../hooks/useOpeningTrainer'
import type { Side } from '../../hooks/useOpeningTrainer'
import { getFamilyRootFen } from '../../analysis/openingRepertoire'
import type { OpeningFamily } from '../../analysis/openingRepertoire'
import { masteryColor } from '../../analysis/masteryStats'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'
import { MiniBoard } from '../Board/MiniBoard'
import { FirstMoveIcon, PrevMoveIcon, NextMoveIcon, LastMoveIcon } from '../Board/icons'
import { CoachComment } from '../Review/CoachComment'

interface OpeningTrainerViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
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

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function BackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M19 12H6M11 6l-6 6 6 6" />
    </svg>
  )
}

const STATUS_META: Record<string, { text: string; color: string }> = {
  'your-turn': { text: 'Sua vez — encontre o lance de teoria', color: 'var(--color-gray-muted)' },
  wrong: { text: 'Não é a teoria dessa linha', color: 'var(--color-error)' },
  'their-turn': { text: 'Adversário pensando…', color: 'var(--color-gray-muted)' },
  done: { text: 'Linha terminou — fora de teoria conhecida', color: 'var(--color-success)' },
}

/**
 * Treino de Aberturas: escolhe uma família (ex: Siciliana) + lado (Brancas/Pretas), toca sozinho
 * os lances que definem a abertura, e a partir daí alterna entre a vez de quem treina (precisa
 * achar um lance que seja teoria real do banco ECO — qualquer continuação nomeada conta, não só
 * uma sequência fixa) e a vez do "adversário" simulado (sorteia uma resposta real ponderada por
 * quantas variações existem dali pra frente — é isso que dá exposição a variantes de verdade ao
 * longo de várias sessões, sem precisar de dado de popularidade real). Placar simples de domínio
 * por família+lado persistido no localStorage (não é repetição espaçada de verdade, sem
 * intervalo — só prioriza visualmente o que precisa de mais prática).
 */
export function OpeningTrainerView({ boardWidth, containerRef }: OpeningTrainerViewProps) {
  const {
    families, stats, lineStats, family, side, status,
    fen, lastMove, touchedLines, isLive, viewIndex, totalPly,
    wrongAttempts, hintSquare, hintMove, suggestedMove, bookMoveSan, linesCompleted,
    engineEval, wrongClassifiedMove,
    startLine, nextLine, backToPicker, attemptMove, retry, showHint, showMoveHint,
    goFirst, goPrev, goNext, goLive,
  } = useOpeningTrainer()

  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return families
    return families.filter((f) => f.key.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q))
  }, [families, search])

  const totalLines = useMemo(() => families.reduce((sum, f) => sum + f.variationCount, 0), [families])

  if (!family) {
    return (
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 4px 40px' }}>
          <div>
            <div className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Treino de Aberturas</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>
              Escolha uma abertura e o lado pra treinar. O adversário simulado varia entre variações reais de um banco com {totalLines}+ linhas nomeadas — pratica de verdade, não decora uma sequência só.
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-muted)', pointerEvents: 'none' }}>
              <SearchIcon width={15} height={15} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar abertura (ex: siciliana, ruy lopez, gambito da dama...)"
              aria-label="Buscar abertura"
              style={{
                width: '100%', padding: '11px 14px 11px 36px', fontSize: 13.5,
                background: 'var(--color-bg-surface)', border: '1px solid var(--color-gray-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--color-text-on-light)', outline: 'none',
                boxShadow: 'inset 0 2px 4px 0 rgba(28,25,22,0.18), inset 0 1px 0 0 rgba(28,25,22,0.1)',
              }}
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-gray-muted)', textAlign: 'center', padding: '24px 0' }}>Nenhuma abertura encontrada.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {filtered.slice(0, 80).map((f) => (
                <FamilyCard key={f.key} family={f} stats={stats} onStart={startLine} />
              ))}
            </div>
          )}
          {filtered.length > 80 && (
            <p style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', textAlign: 'center' }}>
              Mostrando 80 de {filtered.length} — refine a busca pra ver o resto.
            </p>
          )}
        </div>
      </div>
    )
  }

  const meta = STATUS_META[status] ?? STATUS_META['your-turn']
  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH
  const sideKey = `${family.key}|${side}`
  const currentMastery = stats[sideKey]?.mastery

  return (
    <>
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth, display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <button onClick={backToPicker} className="cl-btn cl-btn-sm" title="Trocar abertura" aria-label="Trocar abertura" style={{ flexShrink: 0 }}>
            <BackIcon width={16} height={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FamilyHeaderCard family={family} side={side} mastery={currentMastery} />
          </div>
        </div>

        <ChessBoard
          fen={fen}
          lastMove={lastMove}
          // `bestMove: null` corta só a seta teal "lance do motor" que o `ChessBoard` desenha
          // sozinho quando `evaluation.bestMove` existe — mantém a barra de avaliação (que só
          // olha `cp`/`mate`), mas evita ela empilhar em cima da seta de sugestão/dica do próprio
          // treino (reportado como bug pelo usuário: "2 setas ao mesmo tempo pro mesmo lugar").
          evaluation={engineEval ? { ...engineEval, bestMove: null } : null}
          boardWidth={boardWidth}
          showEvalBar
          interactive={status === 'your-turn' && isLive}
          boardOrientation={side}
          hintSquare={isLive ? hintSquare : null}
          extraArrows={[
            // Seta fraca sempre visível na vez de quem treina, indicando o lance mais documentado
            // dali pra frente — pedido direto do usuário. Some ao navegar pra um lance passado
            // (não faz sentido sugerir jogada numa posição que só está sendo revisada). Se a dica
            // de lance completo (`hintMove`) apontar pro MESMO quadrado (as duas são a mesma cor,
            // azul bebê, e costumam coincidir), o `ChessBoard` já deduplica pelo par de/para —
            // não precisa suprimir uma das duas na mão aqui.
            ...(isLive && suggestedMove ? [{ startSquare: suggestedMove.from, endSquare: suggestedMove.to, color: 'var(--color-blue-bright)', opacity: 0.45 }] : []),
            ...(isLive && hintMove ? [{ startSquare: hintMove.from, endSquare: hintMove.to, color: 'var(--color-blue-bright)', opacity: 0.9 }] : []),
          ]}
          onPieceDrop={({ sourceSquare, targetSquare, promotion }) => (targetSquare ? attemptMove(sourceSquare, targetSquare, promotion) : false)}
        />

        <div style={{
          width: cardWidth, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
        }}>
          <button onClick={goFirst} disabled={viewIndex === 0} className="cl-btn cl-btn-sm w-9 h-9" title="Início da abertura" aria-label="Início da abertura">
            <FirstMoveIcon width={15} height={15} />
          </button>
          <button onClick={goPrev} disabled={viewIndex === 0} className="cl-btn cl-btn-sm w-9 h-9" title="Lance anterior" aria-label="Lance anterior">
            <PrevMoveIcon width={15} height={15} />
          </button>
          <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', minWidth: 52, textAlign: 'center' }}>
            {viewIndex}/{totalPly}
          </span>
          <button onClick={goNext} disabled={isLive} className="cl-btn cl-btn-sm w-9 h-9" title="Próximo lance" aria-label="Próximo lance">
            <NextMoveIcon width={15} height={15} />
          </button>
          <button onClick={goLive} disabled={isLive} className="cl-btn cl-btn-sm w-9 h-9" title="Voltar pro lance atual" aria-label="Voltar pro lance atual">
            <LastMoveIcon width={15} height={15} />
          </button>
          {!isLive && (
            <span style={{ fontSize: 10.5, color: 'var(--color-blue-bright)', fontWeight: 700, marginLeft: 4 }}>revisando</span>
          )}
        </div>

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
          {status === 'done' && (
            <button onClick={nextLine} className="cl-btn cl-btn-sm cl-btn-accent" style={{ width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11 }}>
              Próxima linha →
            </button>
          )}
        </div>
      </div>

      <aside className="cl-tool-aside">
        <div
          className="cl-tool-aside-scroll"
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, justifyContent: 'center', paddingRight: 2 }}
        >
          <div className="cl-card cl-fade-in" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
            {status === 'wrong' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionLabel>Análise do seu lance</SectionLabel>
                {wrongClassifiedMove ? (
                  <CoachComment move={wrongClassifiedMove} />
                ) : (
                  <div className="cl-card" style={{ padding: 12, fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
                    Analisando seu lance com o motor…
                  </div>
                )}
                {bookMoveSan && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
                    <span>📖</span>
                    <span>
                      A teoria dessa linha é{' '}
                      <span className="cl-mono" style={{ color: 'var(--color-blue-bright)', fontWeight: 700 }}>{bookMoveSan}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {status === 'wrong' && touchedLines.length > 0 && (
              <div style={{ height: 1, background: 'var(--color-gray-border)' }} />
            )}

            {touchedLines.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionLabel>Variantes tocadas nessa linha</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto', paddingRight: 2 }}>
                  {touchedLines.map((t) => {
                    const mastery = lineStats[`${t.eco}|${t.name}|${side}`]?.mastery
                    return (
                      <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="cl-mono" style={{
                          fontSize: 11.5, fontWeight: 800, color: 'var(--color-gray-muted)', flexShrink: 0,
                          padding: '3px 9px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-main)',
                          border: '1px solid var(--color-gray-border)',
                        }}>{t.eco}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 'var(--color-text-on-dark)', lineHeight: 1.4 }}>{t.name}</span>
                        {typeof mastery === 'number' && (
                          <span className="cl-mono" style={{ fontSize: 11, fontWeight: 800, flexShrink: 0, color: masteryColor(mastery) }}>
                            {mastery}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {touchedLines.length > 0 && (status === 'your-turn' || status === 'wrong') && (
              <div style={{ height: 1, background: 'var(--color-gray-border)' }} />
            )}

            {(status === 'your-turn' || status === 'wrong') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <SectionLabel>Precisa de uma ajuda?</SectionLabel>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={showHint}
                    disabled={status !== 'your-turn'}
                    className="cl-btn"
                    style={{ flex: 1, width: 'auto', height: 'auto', flexDirection: 'column', padding: '18px 8px', fontSize: 13, gap: 9 }}
                  >
                    <LightbulbIcon width={22} height={22} />
                    Mostrar peça
                  </button>
                  <button
                    onClick={showMoveHint}
                    disabled={status !== 'your-turn'}
                    className="cl-btn"
                    style={{ flex: 1, width: 'auto', height: 'auto', flexDirection: 'column', padding: '18px 8px', fontSize: 13, gap: 9 }}
                    title="Mostra o lance inteiro como seta no tabuleiro"
                  >
                    <MoveArrowIcon width={22} height={22} />
                    Mostrar lance
                  </button>
                </div>
              </div>
            )}

            <div style={{ height: 1, background: 'var(--color-gray-border)' }} />

            <button
              onClick={nextLine}
              className={`cl-btn ${status === 'done' ? 'cl-btn-accent' : ''}`}
              style={{ padding: '18px 0', fontSize: 15, fontWeight: 700 }}
            >
              {status === 'done' ? 'Próxima linha →' : 'Pular pra outra linha'}
            </button>

            <div style={{ fontSize: 13, color: 'var(--color-gray-muted)', textAlign: 'center' }}>
              <span className="cl-mono">{linesCompleted}</span> linha{linesCompleted !== 1 ? 's' : ''} nessa sessão
              {wrongAttempts > 0 && (
                <> · <span className="cl-mono" style={{ color: 'var(--color-error)' }}>{wrongAttempts}</span> erro{wrongAttempts !== 1 ? 's' : ''}</>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

function FamilyHeaderCard({ family, side, mastery }: { family: OpeningFamily; side: Side; mastery?: number }) {
  return (
    <div className="cl-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {family.eco} · {side === 'white' ? 'Treinando de Brancas' : 'Treinando de Pretas'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {family.displayName}
        </span>
      </div>
      {typeof mastery === 'number' && (
        <span className="cl-mono" style={{
          fontSize: 13, fontWeight: 800, flexShrink: 0, color: masteryColor(mastery),
          padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-main)',
        }}>
          {mastery}%
        </span>
      )}
    </div>
  )
}

function FamilyCard({ family, stats, onStart }: {
  family: OpeningFamily
  stats: Record<string, { mastery: number }>
  onStart: (key: string, side: Side) => void
}) {
  const whiteMastery = stats[`${family.key}|white`]?.mastery
  const blackMastery = stats[`${family.key}|black`]?.mastery
  // `getFamilyRootFen` só reproduz o FEN de novo com chess.js (leve, poucos lances) — não precisa
  // de memo próprio aqui, `getOpeningFamilies()` já é cacheado e a lista de famílias é estável.
  const rootFen = useMemo(() => getFamilyRootFen(family), [family])

  return (
    <div className="cl-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <MiniBoard fen={rootFen} size={72} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.3 }}>
            {family.displayName}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-gray-muted)' }}>
            {family.eco} · {family.variationCount} variaç{family.variationCount === 1 ? 'ão' : 'ões'}
          </span>
          <span className="cl-mono" style={{ fontSize: 10.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>
            {family.rootMoves.join(' ')}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onStart(family.key, 'white')} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '8px 0', fontSize: 11.5, gap: 6 }}>
          Brancas
          {typeof whiteMastery === 'number' && <span className="cl-mono" style={{ color: masteryColor(whiteMastery) }}>{whiteMastery}%</span>}
        </button>
        <button onClick={() => onStart(family.key, 'black')} className="cl-btn cl-btn-sm" style={{ flex: 1, width: 'auto', height: 'auto', padding: '8px 0', fontSize: 11.5, gap: 6 }}>
          Pretas
          {typeof blackMastery === 'number' && <span className="cl-mono" style={{ color: masteryColor(blackMastery) }}>{blackMastery}%</span>}
        </button>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="cl-display" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-gray-muted)' }}>
      {children}
    </div>
  )
}
