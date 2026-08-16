import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

// Logos oficiais baixados direto dos respectivos sites (favicon/brand assets públicos),
// usados aqui só pra identificar visualmente os botões "buscar no chess.com / Lichess" —
// sem alterar o traçado nem as cores de marca de nenhum dos dois.

/** Logo oficial do chess.com (peão estilizado, cores de marca). */
export function ChesscomMarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g transform="translate(7.136 -.188)">
        <clipPath id="cc-a">
          <path transform="matrix(1 0 0 -1 0 45)" d="M25.773 12.567c-7.338 5.595-6.523 10.45-6.616 12.447h4.474c.523.971.788 1.871.788 2.993l-5.072 3.341a7.011 7.011 0 0 1 2.912 5.691 7.029 7.029 0 0 1-4.393 6.517c-.814.33-6.56-18.542-6.56-18.542a41.217 41.217 0 0 1-.023-1.679c0-1.874 4.607-1.59 4.362-3.247-.368-2.476-.445-4.356-2.577-10.306-1.44-4.015-11.035 0-11.72-1.97C.87 6.44.616 4.901.616 3.245c0-.177.386-2.833 14.617-2.833 14.23 0 14.614 2.656 14.614 2.833 0 4.036-1.507 7.363-4.075 9.321" />
        </clipPath>
        <g clipPath="url(#cc-a)">
          <path d="M -4.383 -3.56 L 34.847 -3.56 L 34.847 49.587 L -4.383 49.587 L -4.383 -3.56 Z" fill="#5D9948" />
        </g>
        <clipPath id="cc-c">
          <path transform="matrix(1 0 0 -1 0 45)" d="M14.974 10.057c.79 3.6 1.493 7.437 1.92 9.734.532 2.868-3.821 3.38-5.608 3.644-.082-2.448-.765-6.424-6.593-10.867-1.572-1.2-2.743-2.91-3.418-4.982C2.848 6.819 4.949 6.36 8.184 6.36c2.077 0 5.923-.25 6.79 3.696" />
        </clipPath>
        <g clipPath="url(#cc-c)">
          <path d="M -3.725 16.565 L 21.938 16.565 L 21.938 43.643 L -3.725 43.643 L -3.725 16.565 Z" fill="#81B64C" />
        </g>
        <clipPath id="cc-e">
          <path transform="matrix(1 0 0 -1 0 45)" d="M18.03 25.014c.688 1.79.6 2.993.6 2.993l-2.873 3.341c3.054 1.304 4.893 3.755 4.893 6.61a7.013 7.013 0 0 1-2.766 5.59 7.027 7.027 0 0 1-9.679-6.508 7.014 7.014 0 0 1 2.912-5.692l-5.072-3.34c0-1.122.265-2.022.79-2.994H18.03Z" />
        </clipPath>
        <g clipPath="url(#cc-e)">
          <path d="M 1.045 -4.066 L 25.65 -4.066 L 25.65 24.986 L 1.045 24.986 L 1.045 -4.066 Z" fill="#81B64C" />
        </g>
        <clipPath id="cc-g">
          <path transform="matrix(1 0 0 -1 0 45)" d="M14.828 42.633c4.053-.629-1.863-5.33-3.73-5.108-1.777.21-.069 5.7 3.73 5.108" />
        </clipPath>
        <g clipPath="url(#cc-g)">
          <path d="M 5.393 -2.678 L 21.218 -2.678 L 21.218 12.482 L 5.393 12.482 L 5.393 -2.678 Z" fill="#B2E068" />
        </g>
      </g>
    </svg>
  )
}

/** Logo oficial do Lichess (cavalo, traçado original do site — recolorível via currentColor). */
export function LichessMarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" fill="currentColor" {...props}>
      <path
        strokeLinejoin="round"
        d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084S-.506 27.392 4.683 17.567C9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z"
      />
    </svg>
  )
}
