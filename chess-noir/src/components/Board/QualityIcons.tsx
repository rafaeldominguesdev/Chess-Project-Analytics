// Ícones vetoriais próprios para as classificações que usavam emoji/dingbat (renderizavam
// minúsculos e inconsistentes entre plataformas — ex: 📖 livro, 👍 ótimo). Os símbolos que já
// são pontuação ASCII simples (!, ?!, ?, ??) continuam como texto — já renderizam nítidos.
import type { ReactElement, SVGProps } from 'react'
import type { MoveQuality } from '../../analysis/moveClassifier'

type IconProps = SVGProps<SVGSVGElement>

// Peso de traço único pra todos os ícones de contorno (book/good/miss) — antes variava entre
// 2 e 2.6, o que deixava alguns badges com traço visivelmente mais fino que outros na lista.
const STROKE_WIDTH = 2.25

function base(props: IconProps): IconProps {
  return { viewBox: '0 0 24 24', width: 16, height: 16, display: 'block', ...props }
}

function BrilliantIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M12 2.5c.6 3 1.8 5.3 3.5 7 1.7 1.7 4 2.9 7 3.5-3 .6-5.3 1.8-7 3.5-1.7 1.7-2.9 4-3.5 7-.6-3-1.8-5.3-3.5-7-1.7-1.7-4-2.9-7-3.5 3-.6 5.3-1.8 7-3.5 1.7-1.7 2.9-4 3.5-7Z" />
    </svg>
  )
}

function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.2C10.3 5 8.2 4.3 6 4.3c-.7 0-1.2.55-1.2 1.2v11.7c0 .66.55 1.2 1.2 1.2 2.2 0 4.3.7 6 1.9 1.7-1.2 3.8-1.9 6-1.9.65 0 1.2-.54 1.2-1.2V5.5c0-.65-.55-1.2-1.2-1.2-2.2 0-4.3.7-6 1.9Z" />
      <path d="M12 6.2v13" />
    </svg>
  )
}

function BestStarIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M12 2.7l2.7 5.7 6.2.85-4.5 4.4 1.05 6.2L12 16.75 6.55 19.85 7.6 13.65 3.1 9.25l6.2-.85L12 2.7Z" />
    </svg>
  )
}

function GreatThumbIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor">
      <path d="M2.5 20.5h3v-9.8h-3v9.8Z" />
      <path d="M21.4 10.9c0-.77-.63-1.4-1.4-1.4h-5.13l.76-3.65.02-.28c0-.34-.14-.66-.37-.9l-.86-.87-5.03 5.03c-.29.29-.46.7-.46 1.13v7.94c0 .77.63 1.4 1.4 1.4h6.86c.58 0 1.08-.35 1.29-.86l2.72-6.35c.06-.15.1-.32.1-.49v-1.5Z" />
    </svg>
  )
}

function GoodCheckIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 12.7l4.8 4.8L19.5 7" />
    </svg>
  )
}

function MissXIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="none" stroke="currentColor" strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export const QUALITY_ICONS: Partial<Record<MoveQuality, (props: IconProps) => ReactElement>> = {
  brilliant: BrilliantIcon,
  book: BookIcon,
  best: BestStarIcon,
  great: GreatThumbIcon,
  good: GoodCheckIcon,
  miss: MissXIcon,
}
