// Ícones da sidebar principal — autorais, sem emoji.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

/** Engrenagem de verdade (anel com dentes trapezoidais) — antes era um círculo com raios finos,
 *  parecido demais com o ícone de sol usado em "Atualizações"/Chess.com/Lichess. */
export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.72,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.72,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
    </svg>
  )
}

/** Sol (usado em "Atualizações" na sidebar — mesmo motivo do ícone de Chess.com/Lichess). */
export function SunNavIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" />
      <path d="M12 2v2.5M12 19.5V22M4.22 4.22l1.77 1.77M18.01 18.01l1.77 1.77M2 12h2.5M19.5 12H22M4.22 19.78l1.77-1.77M18.01 5.99l1.77-1.77" />
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

/** Peça de quebra-cabeça — treino de táticas (Puzzles). Era um alvo (círculos concêntricos);
 *  trocado a pedido direto do usuário, que mandou duas referências visuais de peça de puzzle
 *  (uma colada no chat, outra depois salva como arquivo em `images.jpeg` na raiz do projeto) —
 *  ambas com marca d'água de banco de imagens ("peqfree") repetida por cima, então não dá pra
 *  usar o arquivo em si; foi redesenhada do zero como SVG próprio. Quadrado com aba saindo em
 *  cima e entalhe encaixando embaixo, pra ler como peça de encaixe de verdade. */
export function TargetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4H9A3 3 0 0 1 15 4H20V20H15A3 3 0 0 0 9 20H4Z" />
    </svg>
  )
}

/** Tabuleiro xadrezado simples — tabuleiro de análise livre (sem lupa, diferente do AnalyzeNavIcon). */
export function BoardNavIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <rect x="3" y="3" width="18" height="18" rx="1.5" fill="none" stroke="currentColor" strokeWidth={1.8} />
      <rect x="3" y="3" width="4.5" height="4.5" />
      <rect x="12" y="3" width="4.5" height="4.5" />
      <rect x="7.5" y="7.5" width="4.5" height="4.5" />
      <rect x="16.5" y="7.5" width="4.5" height="4.5" />
      <rect x="3" y="12" width="4.5" height="4.5" />
      <rect x="12" y="12" width="4.5" height="4.5" />
      <rect x="7.5" y="16.5" width="4.5" height="4.5" />
      <rect x="16.5" y="16.5" width="4.5" height="4.5" />
    </svg>
  )
}

/** Tabuleiro pequeno + "mais" — montar uma posição peça por peça, do zero. */
export function PositionSetupIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="2.5" width="12.5" height="12.5" rx="1.5" />
      <path d="M2.5 8.75h12.5M8.75 2.5v12.5" opacity={0.55} />
      <circle cx="18" cy="18" r="5" />
      <path d="M18 15.5v5M15.5 18h5" />
    </svg>
  )
}

/** Chave inglesa — usada em todos os itens de menu "em manutenção" (função ainda não construída). */
export function WrenchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.6L3 17.2V21h3.8l6.3-6.3a4 4 0 0 0 4.6-5.4l-2.8 2.8-2-2Z" />
    </svg>
  )
}

/** Livro aberto — Treino de Aberturas. */
export function BookNavIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 6.5c-1.6-1.2-3.6-1.8-6-1.8v13c2.4 0 4.4.6 6 1.8M12 6.5c1.6-1.2 3.6-1.8 6-1.8v13c-2.4 0-4.4.6-6 1.8M12 6.5v13" />
    </svg>
  )
}

/** Lupa com alerta dentro — Treino de Erros (achar/revisar os próprios erros nas partidas). */
export function ErrorTrainNavIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M14.8 14.8 20 20" />
      <path d="M10 7v3.7" />
      <circle cx="10" cy="13" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Gráfico de barras crescente — Relatório do jogador (estatísticas agregadas das partidas). */
export function ReportNavIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <rect x="3" y="13" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

/** Seta simples — usada no botão de encolher/expandir a sidebar, gira via CSS conforme o estado. */
export function ChevronIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

