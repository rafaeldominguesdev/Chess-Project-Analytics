// Ícones dos controles de navegação de lances — desenhados do zero (sem depender de emoji/glifos Unicode).
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none', ...props }
}

export function FirstMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="5" width="2.4" height="14" rx="1" />
      <path d="M18.5 5.3v13.4a1 1 0 0 1-1.55.83l-9-6.7a1 1 0 0 1 0-1.66l9-6.7a1 1 0 0 1 1.55.83Z" />
    </svg>
  )
}

export function PrevMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16.5 5.3v13.4a1 1 0 0 1-1.55.83l-9-6.7a1 1 0 0 1 0-1.66l9-6.7a1 1 0 0 1 1.55.83Z" />
    </svg>
  )
}

export function NextMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 5.3v13.4a1 1 0 0 0 1.55.83l9-6.7a1 1 0 0 0 0-1.66l-9-6.7a1 1 0 0 0-1.55.83Z" />
    </svg>
  )
}

export function LastMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="16.6" y="5" width="2.4" height="14" rx="1" />
      <path d="M5.5 5.3v13.4a1 1 0 0 0 1.55.83l9-6.7a1 1 0 0 0 0-1.66l-9-6.7a1 1 0 0 0-1.55.83Z" />
    </svg>
  )
}

export function PlayMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.2-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6Z" />
    </svg>
  )
}

export function PauseMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}

export function FlipBoardIcon(props: IconProps) {
  return (
    <svg {...base({ width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props })}>
      <path d="M4 10a8 8 0 0 1 14.5-4.5M20 5v4h-4" />
      <path d="M20 14a8 8 0 0 1-14.5 4.5M4 19v-4h4" />
    </svg>
  )
}
