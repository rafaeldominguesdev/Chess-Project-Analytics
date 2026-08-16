import type { SVGProps } from 'react'

/** Escudo com check — ícone do cabeçalho "Revisão da Partida" (substitui o emoji ⭐). */
export function ReviewShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2.5 4.5 5.3v6.2c0 5 3.2 8.6 7.5 10 4.3-1.4 7.5-5 7.5-10V5.3L12 2.5Z" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  )
}
