// Ícones autorais em SVG puro — desenhados do zero para as modalidades do chess.com,
// sem reaproveitar os emojis/artes do site (que o app não deve copiar).
import type { ReactElement, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

/** Bullet: ícone oficial do chess.com (glyph "game-time-bullet"). */
export function BulletTimeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m7.17 15.3 1.43 1.47-8.27 6.9zm-6.87 2.3 4.5-6 .9 2zm10.47-7.5c3.47-3.6 5.93-5.2 8.7-6.4-2.4 0-5.3.37-9.8 4.6.03.5.7 1.47 1.1 1.8zm11.06-7.93s.23 1.1.23 2.77c0 2.67-.67 6.83-4.17 10.33l-2.17 2.17c-.67.67-1.33.6-2.13.27l-7.47 6.3 9.8-12.17-5.23 4.03c-.43-.4-.93-.83-1.33-1.23-1.73-1.7-4.13-5-2.77-6.37l2.2-2.13c3.53-3.5 7.63-4.2 10.3-4.2 1.63 0 2.73.23 2.73.23zm0 0" />
    </svg>
  )
}

/** Blitz: ícone oficial do chess.com (glyph "game-time-blitz"). */
export function BlitzTimeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m5.77 15c-1.03 0-1.37-.4-1.2-1.4l1.53-10.2c.17-1 .63-1.4 1.67-1.4h5.8c1.03 0 1.33.4 1.07 1.37l-3.23 11.63zm13.06-6c1.03 0 1.2.33.57 1.13l-9.67 12.73c-1.23 1.63-1.6 1.47-1.27-.57l2.2-13.3zm0 0" />
    </svg>
  )
}

/** Rápida: ícone oficial do chess.com (glyph "game-time-rapid"). */
export function RapidTimeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m11.97 14.63c-.9 0-1.87-.73-1.5-2.23l1.03-4.4h1l1.03 4.37c.37 1.53-.63 2.27-1.57 2.27zm.03 7.87c-5.23 0-9.5-4.27-9.5-9.5s4.27-9.5 9.5-9.5 9.5 4.27 9.5 9.5-4.27 9.5-9.5 9.5zm0-3c4 0 6.5-2.5 6.5-6.5s-2.5-6.5-6.5-6.5-6.5 2.5-6.5 6.5 2.5 6.5 6.5 6.5zm-1.5-14.27v-4.23h3v4.23zm5-3.23h-7c0-1.7.43-2 3.5-2s3.5.3 3.5 2zm0 0" />
    </svg>
  )
}

/** Diária: página de calendário reduzida a três marcadores — mais discreto que o emoji 📅. */
export function DailyTimeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="8" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function VariantTimeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 3v18M4 7.5l8 4.5 8-4.5" opacity={0.55} />
    </svg>
  )
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 4.5M17 5h3a3 3 0 0 1-3 4.5" />
      <path d="M12 14v3M9 21h6M9.5 17.5h5l.5 3.5H9l.5-3.5Z" />
    </svg>
  )
}

/** Lupa sobre um mini-gráfico — botão "Analisar", sem relação com os ícones do chess.com. */
export function AnalyzeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 16l4-5 3 3 5-7" opacity={0.7} />
      <circle cx="15.5" cy="15.5" r="5" />
      <path d="M19.3 19.3 22 22" />
    </svg>
  )
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" />
      <path d="M14 4h6v6M20 4l-9 9" />
    </svg>
  )
}

export const TIME_CLASS_ICONS: Record<string, (props: IconProps) => ReactElement> = {
  chess_bullet: BulletTimeIcon,
  chess_blitz: BlitzTimeIcon,
  chess_rapid: RapidTimeIcon,
  chess_daily: DailyTimeIcon,
  bullet: BulletTimeIcon,
  blitz: BlitzTimeIcon,
  rapid: RapidTimeIcon,
  daily: DailyTimeIcon,
}
