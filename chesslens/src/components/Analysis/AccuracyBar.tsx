interface AccuracyBarProps {
  whiteAccuracy: number
  blackAccuracy: number
  whiteBlunders: number
  blackBlunders: number
  whiteMistakes: number
  blackMistakes: number
  whiteInaccuracies: number
  blackInaccuracies: number
}

function StatRow({ label, white, black, colorWhite, colorBlack }: {
  label: string; white: number; black: number; colorWhite: string; colorBlack: string
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="font-semibold text-xs w-5 text-right" style={{ color: colorWhite }}>{white}</span>
      <span className="flex-1 text-xs text-center" style={{ color: 'var(--color-gray-muted)' }}>{label}</span>
      <span className="font-semibold text-xs w-5 text-left" style={{ color: colorBlack }}>{black}</span>
    </div>
  )
}

export function AccuracyBar({
  whiteAccuracy, blackAccuracy,
  whiteBlunders, blackBlunders,
  whiteMistakes, blackMistakes,
  whiteInaccuracies, blackInaccuracies,
}: AccuracyBarProps) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)' }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-blue-bright)' }}>
        Estatísticas
      </h3>

      {/* Accuracy */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold w-10 text-right" style={{ color: 'var(--color-text-on-dark)' }}>{whiteAccuracy}%</span>
        <div className="flex-1 relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-gray-border)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${whiteAccuracy}%`, backgroundColor: '#f0d9b5', borderRadius: 8 }} />
        </div>
        <div className="flex-1 relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-gray-border)' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${blackAccuracy}%`, backgroundColor: '#333', borderRadius: 8 }} />
        </div>
        <span className="text-sm font-bold w-10" style={{ color: 'var(--color-text-on-dark)' }}>{blackAccuracy}%</span>
      </div>
      <div className="flex text-xs justify-between" style={{ color: 'var(--color-gray-muted)' }}>
        <span>Brancas</span><span>Precisão</span><span>Pretas</span>
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--color-gray-border)' }} />

      <StatRow label="Imprecisões" white={whiteInaccuracies} black={blackInaccuracies} colorWhite="#F0C548" colorBlack="#F0C548" />
      <StatRow label="Erros" white={whiteMistakes} black={blackMistakes} colorWhite="#E58C2D" colorBlack="#E58C2D" />
      <StatRow label="Graves erros" white={whiteBlunders} black={blackBlunders} colorWhite="#E84040" colorBlack="#E84040" />
    </div>
  )
}
