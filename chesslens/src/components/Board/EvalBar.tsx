import { winningChances } from '../../analysis/moveClassifier'

interface EvalBarProps {
  evaluation: number
  orientation?: 'white' | 'black'
  isMate?: number | null
}

// Tons suavizados (não branco/preto puro) pra combinar melhor com o fundo escuro do app.
const WHITE_FILL = '#EDE9DF'
const WHITE_FILL_DEEP = '#C9C3B2'
const BLACK_FILL = '#221F1A'
const BLACK_FILL_DEEP = '#0A0907'

// `winningChances` (curva do Lichess, achata perto dos extremos) vem de moveClassifier.ts —
// mesma fonte usada pra classificar lance e calcular precisão, fonte única pra não divergir.

export function EvalBar({ evaluation, orientation = 'white', isMate }: EvalBarProps) {
  let whitePercent: number
  if (isMate !== null && isMate !== undefined) {
    whitePercent = isMate > 0 ? 97 : 3
  } else {
    whitePercent = 50 + 50 * winningChances(evaluation)
    whitePercent = Math.max(3, Math.min(97, whitePercent))
  }

  const blackPercent = 100 - whitePercent

  const topPercent = orientation === 'white' ? blackPercent : whitePercent
  const bottomPercent = orientation === 'white' ? whitePercent : blackPercent
  const topColor = orientation === 'white' ? BLACK_FILL : WHITE_FILL
  const bottomColor = orientation === 'white' ? WHITE_FILL : BLACK_FILL
  const topDeep = orientation === 'white' ? BLACK_FILL_DEEP : WHITE_FILL_DEEP
  const bottomDeep = orientation === 'white' ? WHITE_FILL_DEEP : BLACK_FILL_DEEP

  const evalLabel = isMate !== null && isMate !== undefined
    ? `#${Math.abs(isMate)}`
    : evaluation > 0
      ? `+${(evaluation / 100).toFixed(1)}`
      : evaluation < 0
        ? (evaluation / 100).toFixed(1)
        : '0.0'

  // Lado com a fatia maior (visualmente "ganhando") — é onde a etiqueta numérica fica mais legível,
  // sempre perto da borda externa daquele lado.
  const advantageIsTop = topPercent >= bottomPercent
  const labelBg = advantageIsTop ? topColor : bottomColor
  const labelText = labelBg === WHITE_FILL ? '#1A1712' : '#F5F2E9'

  return (
    <div
      title={`Avaliação: ${evalLabel}`}
      style={{
        width: 26,
        height: '100%',
        minHeight: 400,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
        border: '1px solid var(--color-gray-border)',
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          flex: topPercent,
          background: `linear-gradient(${orientation === 'white' ? '180deg' : '0deg'}, ${topColor}, ${topDeep})`,
          transition: 'flex 0.4s var(--ease-tap)',
        }}
      />
      <div
        style={{
          flex: bottomPercent,
          background: `linear-gradient(${orientation === 'white' ? '0deg' : '180deg'}, ${bottomColor}, ${bottomDeep})`,
          transition: 'flex 0.4s var(--ease-tap)',
        }}
      />

      {/* Marca fixa do centro físico da barra (referência de eval = 0) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 2,
          marginTop: -1,
          background: 'var(--color-blue-bright)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      />

      {/* Etiqueta numérica da avaliação, sempre visível junto à borda do lado em vantagem */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          ...(advantageIsTop ? { top: 4 } : { bottom: 4 }),
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          className="cl-mono"
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: -0.2,
            color: labelText,
            background: labelBg,
            border: '1px solid rgba(0,0,0,0.3)',
            padding: '1px 4px',
            borderRadius: 'var(--radius-sm)',
            lineHeight: 1.5,
            boxShadow: '0 1px 3px rgba(0,0,0,0.45)',
          }}
        >
          {evalLabel}
        </span>
      </div>
    </div>
  )
}
