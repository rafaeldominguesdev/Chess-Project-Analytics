// Ícones da sidebar principal — autorais, sem emoji.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5M18.4 18.4l-1.5-1.5M7.1 7.1 5.6 5.6" />
    </svg>
  )
}

/** Tabuleiro com lupa — analisar partida. */
export function AnalyzeNavIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="12" height="12" rx="1.5" />
      <path d="M3 9h12M9 3v12" opacity={0.55} />
      <circle cx="16.5" cy="16.5" r="4" />
      <path d="M19.5 19.5 22 22" />
    </svg>
  )
}

/** Alvo — treino de táticas: acertar o lance certo é "acertar o centro". */
export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BrandMarkIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12 2.5a2.4 2.4 0 0 0-1.3 4.4c-.9.8-1.5 1.9-1.5 3.1 0 1 .4 1.9 1 2.6-1.7.9-2.9 2.6-3.2 4.6l-.3 2.3h10.6l-.3-2.3c-.3-2-1.5-3.7-3.2-4.6.6-.7 1-1.6 1-2.6 0-1.2-.6-2.3-1.5-3.1A2.4 2.4 0 0 0 12 2.5Z" />
    </svg>
  )
}
