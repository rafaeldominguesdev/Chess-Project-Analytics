import type { ClassifiedMove } from '../../types/chess.types'
import { calcAccuracy, QUALITY_CONFIG, QUALITY_ORDER } from '../../utils/moveClassifier'
import { QUALITY_ICONS } from '../Board/QualityIcons'

interface PlayerComparisonProps {
  moves: ClassifiedMove[]
  whiteName: string
  blackName: string
  whiteAvatar?: string | null
  blackAvatar?: string | null
  /** PGN Result (ex.: "1-0", "0-1", "1/2-1/2", "*") — usado pro banner de resultado. */
  result?: string
  /** PGN Termination (ex.: "fulano venceu por xeque-mate") — usado pra extrair o motivo. */
  termination?: string
}

function count(moves: ClassifiedMove[], color: 'w' | 'b', q: string) {
  return moves.filter((m) => m.color === color && m.classification === q).length
}

function accColor(a: number) {
  if (a >= 90) return '#27ae60'
  if (a >= 75) return '#96BC4B'
  if (a >= 60) return '#f0c548'
  return '#e58c2d'
}

function PlayerPhoto({ src, fallback, crowned }: { src?: string | null; fallback: string; crowned?: boolean }) {
  const shared: React.CSSProperties = {
    width: 76, height: 76, borderRadius: 14,
    border: `2px solid ${crowned ? 'var(--color-blue-bright)' : 'var(--color-gray-border)'}`,
    boxShadow: crowned ? '0 6px 18px -4px rgba(227,166,29,0.55)' : '0 6px 16px -4px rgba(0,0,0,0.5)',
  }
  return (
    <div style={{ position: 'relative' }}>
      {src ? (
        <img src={src} alt="" style={{ ...shared, objectFit: 'cover' }} />
      ) : (
        <div style={{
          ...shared,
          background: 'var(--color-bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
        }}>
          {fallback}
        </div>
      )}
      {crowned && (
        <div
          className="cl-stat-pop"
          style={{
            position: 'absolute', top: -10, right: -10, width: 26, height: 26, borderRadius: '50%',
            background: 'var(--color-blue-bright)', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
            border: '2px solid var(--color-bg-panel)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
          title="Vencedor"
        >
          🏆
        </div>
      )}
    </div>
  )
}

function AccuracyBox({ value, delay }: { value: number; delay: number }) {
  const c = accColor(value)
  return (
    <div
      className="cl-stat-pop"
      style={{
        border: `1.5px solid ${c}`,
        background: `${c}1c`,
        borderRadius: 10,
        padding: '6px 18px',
        lineHeight: 1,
        boxShadow: `0 4px 14px -3px ${c}77`,
        animationDelay: `${delay}ms`,
      }}
    >
      <span className="cl-display" style={{ fontSize: 40, fontWeight: 800, color: c }}>{value}%</span>
    </div>
  )
}

// Traduz o motivo de término (chess.com/lichess escrevem em inglês) pra pt-BR.
const REASON_TRANSLATIONS: Record<string, string> = {
  checkmate: 'xeque-mate',
  resignation: 'desistência',
  resigned: 'desistência',
  time: 'tempo',
  timeout: 'tempo',
  'time forfeit': 'tempo',
  'won on time': 'tempo',
  stalemate: 'afogamento',
  'insufficient material': 'material insuficiente',
  repetition: 'repetição de posição',
  'threefold repetition': 'repetição de posição',
  agreement: 'acordo entre os jogadores',
  abandonment: 'abandono',
  abandoned: 'abandono',
  '50-move rule': 'regra dos 50 lances',
  'fifty-move rule': 'regra dos 50 lances',
  normal: 'término normal',
}

function translateReason(raw: string): string {
  const clean = raw.trim().replace(/\.$/, '')
  return REASON_TRANSLATIONS[clean.toLowerCase()] ?? clean
}

function describeResult(result: string | undefined, termination: string | undefined, whiteName: string, blackName: string) {
  const isWhiteWin = result === '1-0'
  const isBlackWin = result === '0-1'
  const isDraw = result === '1/2-1/2'
  const winnerName = isWhiteWin ? whiteName : isBlackWin ? blackName : null

  let reason = ''
  if (termination) {
    const m = termination.match(/\b(?:by|on)\s+(.+?)\.?$/i)
    reason = translateReason(m ? m[1] : termination)
  }

  let headline: string
  let icon: string
  if (winnerName) {
    headline = `${winnerName} venceu`
    icon = '🏆'
  } else if (isDraw) {
    headline = 'Partida empatada'
    icon = '🤝'
  } else {
    headline = 'Resultado indefinido'
    icon = '⏳'
  }

  return { headline, reason, icon, winnerColor: isWhiteWin ? 'w' as const : isBlackWin ? 'b' as const : null }
}

function ResultBanner({ result, termination, whiteName, blackName }: { result?: string; termination?: string; whiteName: string; blackName: string }) {
  const { headline, reason, icon, winnerColor } = describeResult(result, termination, whiteName, blackName)
  const isDecisive = winnerColor !== null

  return (
    <div
      className="cl-stat-pop"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '9px 14px', borderRadius: 9,
        background: isDecisive ? 'var(--color-blue-bright)' : 'var(--color-bg-panel)',
        border: isDecisive ? 'none' : '1px solid var(--color-gray-border)',
        textAlign: 'center',
        animationDelay: '90ms',
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontSize: 13.5, fontWeight: 800,
        color: isDecisive ? '#ffffff' : 'var(--color-text-on-dark)',
      }}>
        {headline}
        {reason && (
          <span style={{ fontWeight: 600, opacity: 0.85 }}> · por {reason}</span>
        )}
      </span>
    </div>
  )
}

export function PlayerComparison({ moves, whiteName, blackName, whiteAvatar, blackAvatar, result, termination }: PlayerComparisonProps) {
  const wAcc = calcAccuracy(moves, 'w')
  const bAcc = calcAccuracy(moves, 'b')
  const { winnerColor } = describeResult(result, termination, whiteName, blackName)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Fotos lado a lado, nome e precisão (em caixa, grande) embaixo de cada uma */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <PlayerPhoto src={whiteAvatar} fallback="♔" crowned={winnerColor === 'w'} />
          <div style={{ fontSize: 13, color: 'var(--color-gray-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {whiteName}
          </div>
          <AccuracyBox value={wAcc} delay={0} />
        </div>

        <div style={{ fontSize: 11, color: 'var(--color-gray-muted)', textAlign: 'center', fontWeight: 700 }}>VS</div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <PlayerPhoto src={blackAvatar} fallback="♚" crowned={winnerColor === 'b'} />
          <div style={{ fontSize: 13, color: 'var(--color-gray-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {blackName}
          </div>
          <AccuracyBox value={bAcc} delay={40} />
        </div>
      </div>

      <div style={{ fontSize: 10.5, color: 'var(--color-gray-muted)', textAlign: 'center', fontWeight: 700, letterSpacing: '0.08em', marginTop: -6 }}>PRECISÃO</div>

      {/* Barra comparativa */}
      <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--color-gray-border)' }}>
        <div style={{ width: `${(wAcc / (wAcc + bAcc || 1)) * 100}%`, background: '#f0d9b5' }} />
        <div style={{ flex: 1, background: '#4a4a4a' }} />
      </div>

      {/* Banner de resultado — quem venceu e por quê (ou empate) */}
      <ResultBanner result={result} termination={termination} whiteName={whiteName} blackName={blackName} />

      {/* Contagem por qualidade — 10 categorias, mesma ordem da tabela de referência */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {QUALITY_ORDER.map((q, i) => {
          const w = count(moves, 'w', q)
          const b = count(moves, 'b', q)
          const cfg = QUALITY_CONFIG[q]
          const Icon = QUALITY_ICONS[q]
          return (
            <div
              key={q}
              className="cl-row-in"
              style={{
                display: 'grid', gridTemplateColumns: '36px 1fr 36px', alignItems: 'center', gap: 8,
                fontSize: 14.5, padding: '5px 6px', borderRadius: 6,
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
                animationDelay: `${130 + i * 30}ms`,
              }}
            >
              <span className="cl-display" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text-on-dark)' }}>{w}</span>
              <span style={{ textAlign: 'center', color: cfg.color, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                {Icon
                  ? <Icon width={19} height={19} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                  : <span style={{ fontSize: 14 }}>{cfg.symbol}</span>}
                <span style={{ fontSize: 13.5 }}>{cfg.label}</span>
              </span>
              <span className="cl-display" style={{ textAlign: 'left', fontWeight: 800, color: 'var(--color-text-on-dark)' }}>{b}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
