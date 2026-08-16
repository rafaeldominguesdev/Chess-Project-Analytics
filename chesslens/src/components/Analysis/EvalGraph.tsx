import { useRef, useState } from 'react'
import { QUALITY_CONFIG } from '../../utils/moveClassifier'

interface EvalGraphProps {
  evals: number[]              // perspectiva das brancas, centipawns (-2000..2000)
  currentPosition: number      // índice da posição atual (currentMoveIndex + 1)
  onSeek: (positionIndex: number) => void
}

const W = 252
const H = 90
const CLAMP = 800 // cp para o topo/base do gráfico

// Mesmos limiares de queda de avaliação usados em classifyMove — reaproveitados aqui pra
// marcar "momentos críticos" direto a partir do array de evals, sem precisar da lista de lances.
const MISTAKE_DROP = 90
const BLUNDER_DROP = 200

type Severity = 'mistake' | 'blunder'

interface Point { x: number; y: number }

/** Catmull-Rom → Bézier cúbica: transforma a sequência de pontos numa curva suave (sem ângulos retos). */
function smoothPath(points: Point[]): string {
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

/** Formata cp em vantagem tipo "+1.4" / "-0.8"; "#" quando bate no teto de mate/vantagem decisiva. */
function formatEval(cp: number): string {
  if (Math.abs(cp) >= 2000) return cp >= 0 ? '#' : '-#'
  const pawns = Math.abs(cp) / 100
  const sign = cp > 0 ? '+' : cp < 0 ? '-' : ''
  return `${sign}${pawns.toFixed(1)}`
}

/** Rótulo do lance na notação padrão: "8." (brancas) ou "8..." (pretas). */
function moveLabel(i: number): string {
  if (i <= 0) return 'Início da partida'
  const num = Math.ceil(i / 2)
  return i % 2 === 1 ? `${num}. brancas` : `${num}... pretas`
}

export function EvalGraph({ evals, currentPosition, onSeek }: EvalGraphProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const draggingRef = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const n = evals.length

  if (n < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        Analisando a partida…
      </div>
    )
  }

  const xOf = (i: number) => (i / (n - 1)) * W
  const yOf = (cp: number) => {
    const c = Math.max(-CLAMP, Math.min(CLAMP, cp))
    return H / 2 - (c / CLAMP) * (H / 2)
  }
  const indexFromClientX = (clientX: number): number => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const rx = ((clientX - rect.left) / rect.width) * W
    return Math.max(0, Math.min(n - 1, Math.round((rx / W) * (n - 1))))
  }

  const points = evals.map((e, i) => ({ x: xOf(i), y: yOf(e) }))
  const curvePath = smoothPath(points)
  const areaPath = `${curvePath} L${W},${H / 2} L0,${H / 2} Z`

  // Momentos críticos: quedas bruscas de avaliação (do ponto de vista de quem jogou o lance).
  // Índice ímpar = lance das brancas (posições começam com as brancas para jogar).
  const criticalMoments: { index: number; severity: Severity }[] = []
  for (let i = 1; i < n; i++) {
    const isWhiteMove = i % 2 === 1
    const delta = evals[i] - evals[i - 1]
    const drop = isWhiteMove ? Math.max(0, -delta) : Math.max(0, delta)
    if (drop >= BLUNDER_DROP) criticalMoments.push({ index: i, severity: 'blunder' })
    else if (drop >= MISTAKE_DROP) criticalMoments.push({ index: i, severity: 'mistake' })
  }

  const curIdx = Math.max(0, Math.min(n - 1, currentPosition))
  const curX = xOf(curIdx)
  const curY = yOf(evals[curIdx] ?? 0)

  const hasHover = hoverIndex !== null
  const hoverX = hasHover ? xOf(hoverIndex!) : 0
  const hoverY = hasHover ? yOf(evals[hoverIndex!] ?? 0) : 0
  const tooltipLeftPct = Math.min(92, Math.max(8, (hoverX / W) * 100))

  const handlePointer = (clientX: number, commit: boolean) => {
    const idx = indexFromClientX(clientX)
    setHoverIndex(idx)
    if (commit) onSeek(idx)
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', cursor: 'pointer', touchAction: 'none' }}
        onPointerDown={(e) => {
          ;(e.target as Element).setPointerCapture?.(e.pointerId)
          draggingRef.current = true
          handlePointer(e.clientX, true)
        }}
        onPointerMove={(e) => handlePointer(e.clientX, draggingRef.current)}
        onPointerUp={(e) => {
          draggingRef.current = false
          if (e.pointerType === 'touch') setHoverIndex(null)
        }}
        onPointerLeave={() => {
          if (!draggingRef.current) setHoverIndex(null)
        }}
      >
        <defs>
          {/* corte nítido exatamente na linha zero: creme translúcido acima (brancas), mostarda translúcida abaixo (pretas) */}
          <linearGradient id="evalFill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
            <stop offset="0" stopColor="var(--text)" stopOpacity={0.22} />
            <stop offset="0.5" stopColor="var(--text)" stopOpacity={0.22} />
            <stop offset="0.5" stopColor="var(--accent)" stopOpacity={0.30} />
            <stop offset="1" stopColor="var(--accent)" stopOpacity={0.30} />
          </linearGradient>
        </defs>

        {/* linha do equilíbrio */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeWidth={1} />

        {/* área da avaliação, dividida em vantagem das brancas (acima) / pretas (abaixo) */}
        <path d={areaPath} fill="url(#evalFill)" />
        <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* linha guia + ponto do hover */}
        {hasHover && (
          <line x1={hoverX} y1={0} x2={hoverX} y2={H} stroke="var(--text)" strokeWidth={1} strokeDasharray="2 2" opacity={0.35} />
        )}

        {/* momentos críticos (erros e erros graves) — clicáveis */}
        {criticalMoments.map(({ index, severity }) => (
          <circle
            key={index}
            cx={xOf(index)}
            cy={yOf(evals[index])}
            r={severity === 'blunder' ? 4.5 : 3.5}
            fill={QUALITY_CONFIG[severity].color}
            stroke="var(--bg)"
            strokeWidth={1.25}
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onSeek(index) }}
          >
            <title>{`${moveLabel(index)} · ${QUALITY_CONFIG[severity].label} · ${formatEval(evals[index])}`}</title>
          </circle>
        ))}

        {/* marcador do lance atual */}
        <line x1={curX} y1={0} x2={curX} y2={H} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
        <circle cx={curX} cy={curY} r={6} fill="var(--accent)" opacity={0.22} />
        <circle cx={curX} cy={curY} r={3} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1.25} />

        {hasHover && <circle cx={hoverX} cy={hoverY} r={2.5} fill="var(--text)" />}
      </svg>

      {hasHover && (
        <div
          style={{
            position: 'absolute',
            left: `${tooltipLeftPct}%`,
            top: 3,
            transform: 'translateX(-50%)',
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '3px 7px',
            fontSize: 10.5,
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            display: 'flex',
            gap: 6,
            alignItems: 'baseline',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>{moveLabel(hoverIndex!)}</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEval(evals[hoverIndex!] ?? 0)}</strong>
        </div>
      )}
    </div>
  )
}
