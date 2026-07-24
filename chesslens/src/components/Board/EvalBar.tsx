interface EvalBarProps {
  evaluation: number
  orientation?: 'white' | 'black'
  isMate?: number | null
}

export function EvalBar({ evaluation, orientation = 'white', isMate }: EvalBarProps) {
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x / 400))

  let whitePercent: number
  if (isMate !== null && isMate !== undefined) {
    whitePercent = isMate > 0 ? 95 : 5
  } else {
    whitePercent = sigmoid(evaluation) * 100
    whitePercent = Math.max(5, Math.min(95, whitePercent))
  }

  const blackPercent = 100 - whitePercent

  const topPercent = orientation === 'white' ? blackPercent : whitePercent
  const bottomPercent = orientation === 'white' ? whitePercent : blackPercent
  const topColor = orientation === 'white' ? '#1a1a1a' : '#ffffff'
  const bottomColor = orientation === 'white' ? '#ffffff' : '#1a1a1a'

  const evalLabel = isMate !== null && isMate !== undefined
    ? `M${Math.abs(isMate)}`
    : evaluation > 0
      ? `+${(evaluation / 100).toFixed(1)}`
      : (evaluation / 100).toFixed(1)

  return (
    <div style={{
      width: 24,
      height: '100%',
      minHeight: 400,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 4,
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      <div style={{
        flex: topPercent,
        background: topColor,
        transition: 'flex 0.5s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 4,
      }}>
        {topPercent > 85 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: topColor === '#ffffff' ? '#1a1a1a' : '#ffffff', lineHeight: 1 }}>
            {evalLabel}
          </span>
        )}
      </div>

      <div style={{
        flex: bottomPercent,
        background: bottomColor,
        transition: 'flex 0.5s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: 4,
      }}>
        {bottomPercent > 85 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: bottomColor === '#ffffff' ? '#1a1a1a' : '#ffffff', lineHeight: 1 }}>
            {evalLabel}
          </span>
        )}
      </div>

      {topPercent <= 85 && bottomPercent <= 85 && (
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            color: evaluation >= 0 ? '#1a1a1a' : '#ffffff',
            background: evaluation >= 0 ? '#ffffff' : '#1a1a1a',
            padding: '1px 3px',
            borderRadius: 2,
            lineHeight: 1.4,
          }}>
            {evalLabel}
          </span>
        </div>
      )}
    </div>
  )
}
