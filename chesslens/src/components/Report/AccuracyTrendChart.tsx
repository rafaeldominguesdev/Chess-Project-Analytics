import { useState } from 'react'
import type { TrendPoint } from '../../analysis/playerReportStats'
import { masteryColor } from '../../analysis/masteryStats'

interface AccuracyTrendChartProps {
  trend: TrendPoint[]
}

const W = 560
const H = 130
const PAD = 10

// Mesma técnica Catmull-Rom → Bézier de `EvalGraph.tsx` — reaproveitada aqui pra suavizar a
// linha de tendência de precisão em vez de reimplementar do zero.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}

/** Gráfico de linha da evolução de precisão nas últimas N partidas — SVG desenhado à mão, mesmo
 *  esqueleto de `EvalGraph.tsx` (sem lib de gráfico nova), só que o eixo X é o índice da PARTIDA,
 *  não do lance, e a escala Y é fixa 0-100 (precisão já é uma porcentagem). */
export function AccuracyTrendChart({ trend }: AccuracyTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const n = trend.length

  if (n < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-muted)', fontSize: 12.5 }}>
        Analise mais partidas pra ver a evolução ao longo do tempo.
      </div>
    )
  }

  const xOf = (i: number) => PAD + (i / (n - 1)) * (W - PAD * 2)
  const yOf = (acc: number) => PAD + (1 - acc / 100) * (H - PAD * 2)

  const points = trend.map((t, i) => ({ x: xOf(i), y: yOf(t.accuracy) }))
  const curvePath = smoothPath(points)

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <line x1={PAD} y1={yOf(50)} x2={W - PAD} y2={yOf(50)} stroke="var(--color-gray-border)" strokeWidth={1} strokeDasharray="3 3" />
        <path d={curvePath} fill="none" stroke="var(--color-blue-bright)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={trend[i].gameUrl}
            cx={p.x}
            cy={p.y}
            r={hoverIndex === i ? 5 : 3.5}
            fill={masteryColor(trend[i].accuracy)}
            stroke="var(--color-bg-main)"
            strokeWidth={1.25}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex((cur) => (cur === i ? null : cur))}
          >
            <title>{`Partida ${i + 1} · ${trend[i].accuracy}%`}</title>
          </circle>
        ))}
      </svg>
      {hoverIndex !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(92, Math.max(8, (points[hoverIndex].x / W) * 100))}%`,
            top: 3,
            transform: 'translateX(-50%)',
            background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
            borderRadius: 'var(--radius-sm)', padding: '3px 7px', fontSize: 10.5,
            color: 'var(--color-text-on-dark)', whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 16px 36px -12px rgba(0,0,0,0.6)',
          }}
        >
          <span className="cl-mono">{trend[hoverIndex].accuracy}%</span>
        </div>
      )}
    </div>
  )
}
