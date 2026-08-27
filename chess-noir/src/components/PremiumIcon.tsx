// Diamante — mesmo ícone que o chess.com usa pra sinalizar assinatura ativa ao lado do nome.
// Status pagos/especiais retornados pela API pública — "basic" e "bot" não contam como assinatura.
export const PREMIUM_STATUSES = new Set(['premium', 'gold', 'platinum', 'diamond', 'staff', 'mod'])

export function isPremiumStatus(status?: string | null): boolean {
  return !!status && PREMIUM_STATUSES.has(status.toLowerCase())
}

export function PremiumIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <title>Assinante</title>
      <path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill="#3aa5e0" />
      <path d="M6 3h12l2.2 3.3H3.8L6 3Z" fill="#7cd0ff" />
      <path d="M9.5 6.3 12 21 6.3 6.3h3.2Zm5 0h3.2L12 21l2.5-14.7Z" fill="#1c7fb8" />
    </svg>
  )
}
