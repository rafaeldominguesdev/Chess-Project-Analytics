import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

// Os botões "buscar no chess.com / Lichess" usavam os logos oficiais de cada site (peão verde
// do chess.com, cavalo do Lichess). A pedido do usuário, os dois passaram a usar o mesmo ícone
// de sol âmbar (mais integrado à paleta "Âmbar Noturno" do site) — os botões continuam
// identificáveis pelo texto do label ("Chess.com"/"Lichess") ao lado do ícone.
function SunMarkIcon({ style, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      style={{ color: 'var(--color-blue-bright)', ...style }}
      {...rest}
    >
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v2.5" />
        <path d="M12 19.5V22" />
        <path d="M4.22 4.22l1.77 1.77" />
        <path d="M18.01 18.01l1.77 1.77" />
        <path d="M2 12h2.5" />
        <path d="M19.5 12H22" />
        <path d="M4.22 19.78l1.77-1.77" />
        <path d="M18.01 5.99l1.77-1.77" />
      </g>
    </svg>
  )
}

/** Ícone do botão "buscar no chess.com". */
export function ChesscomMarkIcon(props: IconProps) {
  return <SunMarkIcon {...props} />
}

/** Ícone do botão "buscar no Lichess". */
export function LichessMarkIcon(props: IconProps) {
  return <SunMarkIcon {...props} />
}
