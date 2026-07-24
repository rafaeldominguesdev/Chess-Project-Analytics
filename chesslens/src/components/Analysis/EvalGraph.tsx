interface EvalGraphProps {
  evals: number[]              // perspectiva das brancas, centipawns (-2000..2000)
  currentPosition: number      // índice da posição atual (currentMoveIndex + 1)
  onSeek: (positionIndex: number) => void
}

const W = 252
const H = 90
const CLAMP = 800 // cp para o topo/base do gráfico

export function EvalGraph({ evals, currentPosition, onSeek }: EvalGraphProps) {
  if (evals.length < 2) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
        Analisando a partida…
      </div>
    )
  }

  const n = evals.length
  const xOf = (i: number) => (i / (n - 1)) * W
  const yOf = (cp: number) => {
    const c = Math.max(-CLAMP, Math.min(CLAMP, cp))
    return H / 2 - (c / CLAMP) * (H / 2)
  }

  // Área preenchida até a linha do meio
  const linePts = evals.map((e, i) => `${xOf(i)},${yOf(e)}`).join(' ')
  const areaPath = `M0,${H / 2} L ${linePts} L ${W},${H / 2} Z`

  const curX = xOf(Math.max(0, Math.min(n - 1, currentPosition)))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', cursor: 'pointer' }}
      onClick={(e) => {
        const rect = (e.currentTarget as SVGElement).getBoundingClientRect()
        const rx = ((e.clientX - rect.left) / rect.width) * W
        const idx = Math.round((rx / W) * (n - 1))
        onSeek(Math.max(0, Math.min(n - 1, idx)))
      }}
    >
      {/* fundo dividido: cima = pretas, baixo = brancas */}
      <rect x={0} y={0} width={W} height={H / 2} fill="rgba(0,0,0,0.25)" />
      <rect x={0} y={H / 2} width={W} height={H / 2} fill="rgba(255,255,255,0.06)" />
      {/* linha do equilíbrio */}
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="var(--border)" strokeWidth={1} />
      {/* área da avaliação */}
      <path d={areaPath} fill="rgba(226,185,106,0.30)" />
      <polyline points={linePts} fill="none" stroke="var(--accent)" strokeWidth={1.5} strokeLinejoin="round" />
      {/* marcador do lance atual */}
      <line x1={curX} y1={0} x2={curX} y2={H} stroke="var(--accent)" strokeWidth={1} strokeDasharray="3 2" opacity={0.8} />
      <circle cx={curX} cy={yOf(evals[Math.max(0, Math.min(n - 1, currentPosition))] ?? 0)} r={3} fill="var(--accent)" stroke="var(--bg)" strokeWidth={1} />
    </svg>
  )
}
