import { QUALITY_CONFIG } from '../../utils/moveClassifier'

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
      <span className="cl-mono font-semibold text-xs w-5 text-right" style={{ color: colorWhite }}>{white}</span>
      <span className="flex-1 text-xs text-center" style={{ color: 'var(--color-gray-muted)' }}>{label}</span>
      <span className="cl-mono font-semibold text-xs w-5 text-left" style={{ color: colorBlack }}>{black}</span>
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
    <div className="cl-card p-3 flex flex-col gap-2">
      <h3 className="cl-display text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-blue-bright)' }}>
        Estatísticas
      </h3>

      {/* Accuracy */}
      <div className="flex items-center gap-2">
        <span className="cl-mono text-sm font-bold w-10 text-right" style={{ color: 'var(--color-text-on-dark)' }}>{whiteAccuracy}%</span>
        <div className="flex-1 relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-gray-border)' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${whiteAccuracy}%`, backgroundColor: '#f0d9b5', borderRadius: 'var(--radius-sm)' }} />
        </div>
        <div className="flex-1 relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-gray-border)' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${blackAccuracy}%`, backgroundColor: '#333', borderRadius: 'var(--radius-sm)' }} />
        </div>
        <span className="cl-mono text-sm font-bold w-10" style={{ color: 'var(--color-text-on-dark)' }}>{blackAccuracy}%</span>
      </div>
      <div className="flex text-xs justify-between" style={{ color: 'var(--color-gray-muted)' }}>
        <span>Brancas</span><span>Precisão</span><span>Pretas</span>
      </div>

      <div style={{ height: 1, backgroundColor: 'var(--color-gray-border)' }} />

      <StatRow label="Imprecisões" white={whiteInaccuracies} black={blackInaccuracies} colorWhite={QUALITY_CONFIG.inaccuracy.color} colorBlack={QUALITY_CONFIG.inaccuracy.color} />
      <StatRow label="Erros" white={whiteMistakes} black={blackMistakes} colorWhite={QUALITY_CONFIG.mistake.color} colorBlack={QUALITY_CONFIG.mistake.color} />
      <StatRow label="Graves erros" white={whiteBlunders} black={blackBlunders} colorWhite={QUALITY_CONFIG.blunder.color} colorBlack={QUALITY_CONFIG.blunder.color} />
    </div>
  )
}
