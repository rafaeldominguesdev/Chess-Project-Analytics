import type { CSSProperties, ReactNode } from 'react'
import { useReportData } from '../../hooks/useReportData'
import { masteryColor } from '../../analysis/masteryStats'
import type { MistakeReason } from '../../analysis/mistakeReasons'
import type { Side } from '../../hooks/useOpeningTrainer'
import { AccuracyTrendChart } from './AccuracyTrendChart'

// Mesmo recorte do rosto da capivara usado em `CoachComment.tsx` (a partir da hero image da
// Home) — reaproveitado aqui em vez de um asset novo, só que num componente próprio porque a
// entrada é agregada (estatística do relatório inteiro), não um `ClassifiedMove` isolado.
const CAPY_IMG = { width: 2560, height: 1440 }
const CAPY_FACE_CROP = { x: 260, y: 80, size: 900 }

function capybaraAvatarStyle(size: number): CSSProperties {
  const scale = size / CAPY_FACE_CROP.size
  return {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    backgroundImage: 'url(/hero-bg.png?v=2)',
    backgroundSize: `${CAPY_IMG.width * scale}px ${CAPY_IMG.height * scale}px`,
    backgroundPosition: `${-CAPY_FACE_CROP.x * scale}px ${-CAPY_FACE_CROP.y * scale}px`,
    border: '2px solid var(--color-blue-bright)',
    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.6)',
  }
}

interface ReportViewProps {
  /** Leva pro Treino de Erros já filtrado por esse motivo ("treinar isso agora" num vazamento). */
  onGoToErrorTraining: (reason: MistakeReason) => void
  /** Leva pro Treino de Aberturas já treinando essa família+lado (clicar numa linha da tabela). */
  onGoToOpeningTraining: (familyKey: string, side: Side) => void
  onGoToAnalyze: () => void
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="cl-display" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-gray-muted)', textTransform: 'uppercase' }}>
      <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--color-blue-bright)', flexShrink: 0 }} />
      {children}
    </div>
  )
}

/**
 * Relatório do jogador — tudo agregado sobre as partidas já analisadas e salvas (Sprint 1/2),
 * quase nenhum motor novo (ver ROADMAP.md, Sprint 3). É o sprint pensado pra dar "o print que a
 * pessoa compartilha" — top 3 vazamentos, precisão por fase, taxa de erro por relógio,
 * desempenho por abertura, evolução de precisão, e um comentário da capivara no fim.
 */
export function ReportView({ onGoToErrorTraining, onGoToOpeningTraining, onGoToAnalyze }: ReportViewProps) {
  const { status, overallAccuracy, gamesCount, phaseAccuracy, clockBuckets, openingPerformance, trend, topLeaks, resultStats, accuracyBySide, comment } = useReportData()

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px 40px' }}>
        <div>
          <div className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Relatório do Jogador</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>
            Tudo que já foi analisado, agregado num só lugar — {gamesCount > 0 ? `${gamesCount} partida${gamesCount === 1 ? '' : 's'}` : 'nenhuma partida ainda'}.
          </div>
        </div>

        {status === 'loading' && (
          <div style={{ padding: '60px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-gray-muted)' }}>
            Varrendo suas partidas analisadas…
          </div>
        )}

        {status === 'empty' && (
          <div className="cl-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 13.5, color: 'var(--color-gray-muted)' }}>
              Nenhuma partida analisada ainda — o Relatório precisa de pelo menos uma pra começar a agregar estatísticas.
            </span>
            <button onClick={onGoToAnalyze} className="cl-btn cl-btn-accent cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '8px 16px' }}>
              Analisar uma partida
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="cl-card cl-fade-in" style={{ padding: 20, display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span className="cl-mono" style={{ fontSize: 40, fontWeight: 800, color: masteryColor(overallAccuracy), lineHeight: 1 }}>
                {overallAccuracy}%
              </span>
              <span style={{ fontSize: 13, color: 'var(--color-gray-muted)' }}>de precisão média, considerando todas as partidas analisadas</span>
            </div>

            {(resultStats.wins + resultStats.draws + resultStats.losses) > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Resultado</SectionLabel>
                <div className="cl-card cl-fade-in" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="cl-mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-success)' }}>{resultStats.wins}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>vitória{resultStats.wins === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="cl-mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-draw)' }}>{resultStats.draws}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>empate{resultStats.draws === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="cl-mono" style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-error)' }}>{resultStats.losses}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>derrota{resultStats.losses === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
                      <span className="cl-mono" style={{ fontWeight: 800, color: 'var(--color-text-on-dark)' }}>{resultStats.winRate}%</span> de aproveitamento
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, borderTop: '1px solid var(--color-gray-border)', paddingTop: 14 }}>
                    {accuracyBySide.map((s) => (
                      <div key={s.side} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: 'var(--radius-sm)', flexShrink: 0, background: s.side === 'w' ? '#f5f5f5' : '#1a1a1a', border: '1.5px solid var(--color-gray-border)' }} />
                        <span style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>{s.side === 'w' ? 'Brancas' : 'Pretas'}</span>
                        <span className="cl-mono" style={{ fontSize: 14, fontWeight: 800, color: s.games ? masteryColor(s.accuracy) : 'var(--color-gray-muted)' }}>
                          {s.games ? `${s.accuracy}%` : '—'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--color-gray-muted)' }}>({s.games})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {topLeaks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Top {topLeaks.length} Vazamento{topLeaks.length === 1 ? '' : 's'}</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
                  {topLeaks.map((leak) => (
                    <div key={leak.reason} className="cl-card cl-row-in" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>{leak.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-gray-muted)', marginTop: 2 }}>
                          {leak.count} vez{leak.count === 1 ? '' : 'es'} · {leak.gamesAffected} partida{leak.gamesAffected === 1 ? '' : 's'}
                        </div>
                      </div>
                      <button onClick={() => onGoToErrorTraining(leak.reason)} className="cl-btn cl-btn-accent cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '7px 14px', fontSize: 12, alignSelf: 'flex-start' }}>
                        Treinar isso agora
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionLabel>Precisão por fase</SectionLabel>
              <div className="cl-card" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
                {phaseAccuracy.map((p) => (
                  <div key={p.phase} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', textTransform: 'capitalize' }}>{p.phase}</span>
                    <span className="cl-mono" style={{ fontSize: 22, fontWeight: 800, color: p.moveCount ? masteryColor(p.accuracy) : 'var(--color-gray-muted)' }}>
                      {p.moveCount ? `${p.accuracy}%` : '—'}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--color-gray-muted)' }}>{p.moveCount} lance{p.moveCount === 1 ? '' : 's'}</span>
                  </div>
                ))}
              </div>
            </div>

            {clockBuckets.some((b) => b.moveCount > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Taxa de erro grave × relógio restante</SectionLabel>
                <div className="cl-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {clockBuckets.map((b) => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', width: 62, flexShrink: 0 }}>{b.label}</span>
                      <div className="cl-inset" style={{ flex: 1, height: 10, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <div style={{ width: `${b.moveCount ? b.errorRate : 0}%`, height: '100%', background: 'var(--color-error)', transition: 'width var(--dur-enter) var(--ease-snap)' }} />
                      </div>
                      <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-text-on-dark)', width: 76, flexShrink: 0, textAlign: 'right' }}>
                        {b.moveCount ? `${b.errorRate}% (${b.moveCount})` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {openingPerformance.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SectionLabel>Desempenho por abertura</SectionLabel>
                <div className="cl-card" style={{ padding: 6, display: 'flex', flexDirection: 'column' }}>
                  {openingPerformance.map((op) => (
                    <button
                      key={`${op.familyKey}|${op.side}`}
                      onClick={() => onGoToOpeningTraining(op.familyKey, op.side === 'w' ? 'white' : 'black')}
                      className="cl-btn cl-btn-ghost"
                      style={{
                        justifyContent: 'space-between', width: '100%', height: 'auto',
                        padding: '10px 12px', fontSize: 13, textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                          background: op.side === 'w' ? '#f5f5f5' : '#1a1a1a', border: '1.5px solid var(--color-gray-border)',
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.familyKey}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-gray-muted)' }}>{op.games} partida{op.games === 1 ? '' : 's'}</span>
                        <span className="cl-mono" style={{ fontSize: 13, fontWeight: 800, color: masteryColor(op.avgAccuracy) }}>{op.avgAccuracy}%</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SectionLabel>Evolução de precisão</SectionLabel>
              <div className="cl-card" style={{ padding: 16 }}>
                <AccuracyTrendChart trend={trend} />
              </div>
            </div>

            {comment && (
              <div className="cl-card cl-fade-in" style={{ display: 'flex', gap: 10, padding: 14, alignItems: 'flex-start' }}>
                <div style={capybaraAvatarStyle(44)} />
                <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                  <div className="cl-display" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)', marginBottom: 3 }}>
                    {comment.headline}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.4 }}>{comment.body}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
