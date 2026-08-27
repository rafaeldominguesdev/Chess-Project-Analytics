// Ícones em SVG puro (vetorial — não perde qualidade em nenhum tamanho/tela),
// desenhados do zero para representar cada categoria de configuração.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

export function BoardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" strokeWidth={1.2} opacity={0.55} />
    </svg>
  )
}

export function AppearanceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  )
}

export function MotionIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function SoundIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10v4h4l5 4V6L8 10H4z" />
      <path d="M17 9a4.5 4.5 0 0 1 0 6" />
      <path d="M19.5 6.5a8.5 8.5 0 0 1 0 11" opacity={0.6} />
    </svg>
  )
}

export function DataIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  )
}

export function PieceIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="6.5" r="2.5" />
      <path d="M9.5 12.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5l1.2 5.5H8.3z" />
      <path d="M7 21h10" />
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

// Lâmpada — usada no card de "Dica" do painel lateral de Configurações.
export function HintIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 18h6M10 21.5h4" />
      <path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.7.6 1 1.4 1 2.4h6c0-1 .3-1.8 1-2.4A6.5 6.5 0 0 0 12 2.5z" />
    </svg>
  )
}
