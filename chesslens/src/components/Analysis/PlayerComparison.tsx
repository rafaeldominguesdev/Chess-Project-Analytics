import type { ClassifiedMove } from '../../types/chess.types'
import { calcAccuracy, QUALITY_CONFIG, QUALITY_ORDER } from '../../utils/moveClassifier'

interface PlayerComparisonProps {
  moves: ClassifiedMove[]
  whiteName: string
  blackName: string
  whiteAvatar?: string | null
  blackAvatar?: string | null
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

function MiniAvatar({ src, fallback }: { src?: string | null; fallback: string }) {
  return src ? (
    <img src={src} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <span style={{ fontSize: 12 }}>{fallback}</span>
  )
}

export function PlayerComparison({ moves, whiteName, blackName, whiteAvatar, blackAvatar }: PlayerComparisonProps) {
  const wAcc = calcAccuracy(moves, 'w')
  const bAcc = calcAccuracy(moves, 'b')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Cabeçalho com precisão */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <MiniAvatar src={whiteAvatar} fallback="♔" /> {whiteName}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: accColor(wAcc) }}>{wAcc}%</div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>PRECISÃO</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <MiniAvatar src={blackAvatar} fallback="♚" /> {blackName}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: accColor(bAcc) }}>{bAcc}%</div>
        </div>
      </div>

      {/* Barra comparativa */}
      <div style={{ display: 'flex', height: 6, borderRadius: 4, overflow: 'hidden', background: 'var(--border)' }}>
        <div style={{ width: `${(wAcc / (wAcc + bAcc || 1)) * 100}%`, background: '#f0d9b5' }} />
        <div style={{ flex: 1, background: '#4a4a4a' }} />
      </div>

      {/* Contagem por qualidade — 10 categorias, mesma ordem da tabela de referência */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {QUALITY_ORDER.map((q) => {
          const w = count(moves, 'w', q)
          const b = count(moves, 'b', q)
          const cfg = QUALITY_CONFIG[q]
          return (
            <div key={q} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 28px', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{w}</span>
              <span style={{ textAlign: 'center', color: cfg.color, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 11 }}>{cfg.symbol}</span>{cfg.label}
              </span>
              <span style={{ textAlign: 'left', fontWeight: 700, color: 'var(--text)' }}>{b}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
