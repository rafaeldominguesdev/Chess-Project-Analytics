import type { PieceSet, PieceSetName, UITheme, UIThemeName } from '../types/theme.types'

// Lista curada — só os tabuleiros mais bonitos/clássicos (a lista completa tinha 23 opções,
// muita coisa parecida ou nicho demais pra um seletor bom de usar).
export const BOARD_THEMES = {

  // ══════════════════════════════════════════════
  // CHESSCAP — tabuleiro assinatura do site: cinza-pedra quente (nada de verde/marrom
  // clássico), tom casado com o fundo carvão + destaque âmbar do resto da UI. Marcação
  // de lance em âmbar translúcido em vez de amarelo/verde padrão.
  // ══════════════════════════════════════════════
  'graphite-amber': { label: 'ChessCap Signature', category: 'ChessCap', light: '#DAD3C6', dark: '#4A443C', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.5)', moveTo: 'rgba(232,169,60,0.62)', image: undefined },

  // ══════════════════════════════════════════════
  // CHESS.COM — TEMAS OFICIAIS
  // ══════════════════════════════════════════════
  'chesscom-green':      { label: 'Green',      category: 'Chess.com', light: '#EEEED2', dark: '#769656', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(20,85,30,0.5)',   moveTo: 'rgba(20,85,30,0.5)', image: undefined },
  'chesscom-walnut':     { label: 'Walnut',     category: 'Chess.com', light: '#F0D9B5', dark: '#B58863', highlight: '#CDD26A', highlightDark: '#AABE53', moveFrom: 'rgba(155,100,0,0.5)', moveTo: 'rgba(155,100,0,0.5)', image: undefined },
  'chesscom-blue':       { label: 'Blue',       category: 'Chess.com', light: '#DEE3E6', dark: '#8CA2AD', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(0,80,140,0.5)',  moveTo: 'rgba(0,80,140,0.5)', image: undefined },
  'chesscom-tournament': { label: 'Tournament', category: 'Chess.com', light: '#F5F5DC', dark: '#4B7399', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(0,60,120,0.5)',  moveTo: 'rgba(0,60,120,0.5)', image: undefined },

  // ══════════════════════════════════════════════
  // LICHESS
  // ══════════════════════════════════════════════
  'lichess-brown': { label: 'Brown', category: 'Lichess', light: '#F0D9B5', dark: '#B58863', highlight: '#CDD26A', highlightDark: '#AABE53', moveFrom: 'rgba(155,100,0,0.5)', moveTo: 'rgba(155,100,0,0.5)', image: undefined },

  // ══════════════════════════════════════════════
  // TEMAS EXCLUSIVOS
  // ══════════════════════════════════════════════
  'midnight': { label: 'Midnight', category: 'Exclusivo', light: '#1E2A3A', dark: '#0D1B2A', highlight: '#3D5A80', highlightDark: '#2C4057', moveFrom: 'rgba(50,100,180,0.5)', moveTo: 'rgba(50,100,180,0.5)', image: undefined },
  'emerald':  { label: 'Emerald',  category: 'Exclusivo', light: '#E8F5E9', dark: '#2E7D32', highlight: '#FFF176', highlightDark: '#F9A825', moveFrom: 'rgba(30,120,40,0.5)',  moveTo: 'rgba(30,120,40,0.5)', image: undefined },
  'coral':    { label: 'Coral',    category: 'Exclusivo', light: '#FFF0EB', dark: '#D05A3A', highlight: '#FFD700', highlightDark: '#FFC200', moveFrom: 'rgba(200,60,20,0.5)',  moveTo: 'rgba(200,60,20,0.5)', image: undefined },

  // ══════════════════════════════════════════════
  // MADEIRA E TEXTURAS — tabuleiros com foto real (madeira/mármore/couro/metal), não cor
  // lisa. Mesmo acervo público que o Lichess usa (`lichess1.org/assets/images/board/`),
  // já é a mesma fonte confiável de onde os 26 conjuntos de peças do app já vêm.
  // `light`/`dark` aqui são só uma cor aproximada pra notação/contraste — quem manda no
  // visual é a foto (`image`).
  // ══════════════════════════════════════════════
  'wood':    { label: 'Wood',      category: 'Madeira', image: 'https://lichess1.org/assets/images/board/wood.jpg',    light: '#E8C88E', dark: '#A5682E', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'wood2':   { label: 'Wood 2',    category: 'Madeira', image: 'https://lichess1.org/assets/images/board/wood2.jpg',   light: '#D8CBA0', dark: '#8C7C4E', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'wood3':   { label: 'Wood 3',    category: 'Madeira', image: 'https://lichess1.org/assets/images/board/wood3.jpg',   light: '#DEC894', dark: '#96703E', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'wood4':   { label: 'Wood 4',    category: 'Madeira', image: 'https://lichess1.org/assets/images/board/wood4.jpg',   light: '#E4CDA0', dark: '#9C7442', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'maple':   { label: 'Maple',     category: 'Madeira', image: 'https://lichess1.org/assets/images/board/maple.jpg',   light: '#E8C99B', dark: '#C6863E', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'maple2':  { label: 'Maple 2',   category: 'Madeira', image: 'https://lichess1.org/assets/images/board/maple2.jpg',  light: '#E2CBA4', dark: '#B4885A', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'leather': { label: 'Leather',   category: 'Madeira', image: 'https://lichess1.org/assets/images/board/leather.jpg', light: '#F0EDE5', dark: '#E8A93C', highlight: '#E8A93C', highlightDark: '#C68A22', moveFrom: 'rgba(232,169,60,0.45)', moveTo: 'rgba(232,169,60,0.58)' },
  'marble':  { label: 'Marble',    category: 'Madeira', image: 'https://lichess1.org/assets/images/board/marble.jpg',  light: '#B8C7B0', dark: '#7E8F76', highlight: '#8FAE84', highlightDark: '#6E8C64', moveFrom: 'rgba(143,174,132,0.45)', moveTo: 'rgba(143,174,132,0.58)' },
  'metal':   { label: 'Metal',     category: 'Madeira', image: 'https://lichess1.org/assets/images/board/metal.jpg',   light: '#C8CDD2', dark: '#8A9099', highlight: '#9FB2C6', highlightDark: '#7C93A8', moveFrom: 'rgba(159,178,198,0.45)', moveTo: 'rgba(159,178,198,0.58)' },
  'olive':   { label: 'Olive',     category: 'Madeira', image: 'https://lichess1.org/assets/images/board/olive.jpg',   light: '#C3C2A0', dark: '#8A8968', highlight: '#B5B37E', highlightDark: '#96945F', moveFrom: 'rgba(181,179,126,0.45)', moveTo: 'rgba(181,179,126,0.58)' },

} as const

export type BoardThemeName = keyof typeof BOARD_THEMES
export type BoardThemeDef = (typeof BOARD_THEMES)[BoardThemeName]

// Lista curada pro seletor de Configurações (pedido direto do usuário: "volte os outros
// tabuleiros... deixe apenas os coloridos normais e Wood 4, o resto de madeira tire" — depois
// "tira aquele subtópico [categoria] no tabuleiro, deixa tudo junto", por isso é uma lista plana,
// sem agrupar por categoria). As texturas de madeira/mármore/couro continuam definidas em
// BOARD_THEMES — só não aparecem mais no seletor, exceto a Wood 4.
export const CURATED_BOARD_THEMES: BoardThemeName[] = [
  'graphite-amber', 'chesscom-green', 'chesscom-walnut', 'chesscom-blue', 'chesscom-tournament',
  'lichess-brown', 'midnight', 'emerald', 'coral', 'wood4',
]

export const PIECE_SETS: Record<PieceSetName, PieceSet> = {
  cburnett:   { label: 'CBurnett',   src: 'cburnett' },
  merida:     { label: 'Merida',     src: 'merida' },
  alpha:      { label: 'Alpha',      src: 'alpha' },
  california: { label: 'California', src: 'california' },
  cardinal:   { label: 'Cardinal',   src: 'cardinal' },
  chessnut:   { label: 'Chessnut',   src: 'chessnut' },
  companion:  { label: 'Companion',  src: 'companion' },
  dubrovny:   { label: 'Dubrovny',   src: 'dubrovny' },
  fantasy:    { label: 'Fantasy',    src: 'fantasy' },
  fresca:     { label: 'Fresca',     src: 'fresca' },
  gioco:      { label: 'Gioco',      src: 'gioco' },
  governor:   { label: 'Governor',   src: 'governor' },
  horsey:     { label: 'Horsey',     src: 'horsey' },
  icpieces:   { label: 'IC Pieces',  src: 'icpieces' },
  kosal:      { label: 'Kosal',      src: 'kosal' },
  leipzig:    { label: 'Leipzig',    src: 'leipzig' },
  letter:     { label: 'Letter',     src: 'letter' },
  maestro:    { label: 'Maestro',    src: 'maestro' },
  mono:       { label: 'Mono',       src: 'mono' },
  pirouetti:  { label: 'Pirouetti',  src: 'pirouetti' },
  pixel:      { label: 'Pixel',      src: 'pixel' },
  rhosgfx:    { label: 'Rhosgfx',    src: 'rhosgfx' },
  shapes:     { label: 'Shapes',     src: 'shapes' },
  spatial:    { label: 'Spatial',    src: 'spatial' },
  staunty:    { label: 'Staunty',    src: 'staunty' },
  tatiana:    { label: 'Tatiana',    src: 'tatiana' },
  // Conferidos nesta sessão (existem de verdade no acervo do Lichess, testados um por um) —
  // "disguised" (peças viram bolinhas idênticas, pra treino às cegas) ficou de fora de propósito,
  // não serve como conjunto pra jogar/analisar de olho aberto.
  anarcandy:   { label: 'Anarcandy',   src: 'anarcandy' },
  caliente:    { label: 'Caliente',    src: 'caliente' },
  celtic:      { label: 'Celtic',      src: 'celtic' },
  chess7:      { label: 'Chess7',      src: 'chess7' },
  cooke:       { label: 'Cooke',       src: 'cooke' },
  firi:        { label: 'Firi',        src: 'firi' },
  mpchess:     { label: 'MPChess',     src: 'mpchess' },
  reillycraig: { label: 'Reillycraig', src: 'reillycraig' },
  riohacha:    { label: 'Riohacha',    src: 'riohacha' },
  xkcd:        { label: 'XKCD',        src: 'xkcd' },
  'kiwen-suwi': { label: 'Kiwen-Suwi', src: 'kiwen-suwi' },
  // Mesmo desenho do 'dubrovny' (`src` igual) — todas as peças ganham um filtro CSS
  // (`PIECE_COLOR_FILTER` abaixo) porque no original o acervo inteiro (peças pretas E o
  // detalhe/pontinha das peças brancas) usa um marrom-avermelhado, não preto de verdade
  // (pedido do usuário: "quero o dubrovny só que as pretas pretas... altera pra ambos").
  'dubrovny-noir': { label: 'Dubrovny Noir', src: 'dubrovny' },
}

// Lista curada pro seletor de Configurações (pedido direto do usuário: "apenas as peças
// clássicas bonitas e a Staunty, que é mais bonita"). Os outros 27 conjuntos continuam
// definidos em PIECE_SETS — só não aparecem mais no seletor.
export const CURATED_PIECE_SETS: PieceSetName[] = [
  'dubrovny-noir', 'staunty', 'cburnett', 'merida', 'alpha', 'cardinal', 'companion', 'leipzig', 'maestro', 'tatiana',
]

// Filtro CSS aplicado em TODAS as peças (brancas e pretas) de conjuntos cuja cor original não
// bate com o que pedimos — evita precisar hospedar uma cópia modificada do SVG. `grayscale(1)`
// tira o tom avermelhado do 'dubrovny' (inclusive o detalhe/pontinha das peças brancas, que usa
// a mesma cor "preta" do conjunto como acento) e mantém o brilho/sombreado 3D do desenho original.
export const PIECE_COLOR_FILTER: Partial<Record<PieceSetName, string>> = {
  'dubrovny-noir': 'grayscale(1)',
}

export const UI_THEMES: Record<UIThemeName, UITheme> = {
  // Visual padrão do app: fundo cinza NEUTRO (era quase preto puro, depois cinza puxado pro
  // azul — pedido direto do usuário, "não quero o site meio azulado, quero cinza e o azul só nos
  // botões/textos chamativos", por isso agora R=G=B de verdade nesses tokens), painéis num cinza
  // um degrau mais claro, destaque em azul bebê (era âmbar/dourado). Botões e cards continuam
  // com visual "físico"/skeumórfico (ver .cl-btn/.cl-card em index.css) — sombra dupla simulando
  // profundidade, cantos bem arredondados, só a paleta mudou. Chave/nome interno ficou
  // "amber-noir" de propósito (não afeta nada visível — não há seletor de tema de UI na
  // interface hoje, só os valores importam). `--color-bg-sidebar` (mais escuro, pedido do
  // usuário) não faz parte desse objeto — é fixo, não troca por tema (ver index.css).
  'amber-noir':    { label: 'Cinza Azulado',   bg: '#1C1C1C', surface: '#242424', accent: '#74C6EA', text: '#ECECEC', textMuted: '#97979B', border: '#3A3A3A', shadowBtn: '#000000' },
  'brasil':        { label: 'Brasil',          bg: '#F6F9F2', surface: '#FFFFFF', accent: '#2E7D32', text: '#16231A', textMuted: '#5C6E5F', border: '#DCE6D4' },
  'dark-classic':  { label: 'Dark Classic',    bg: '#1a1a2e', surface: '#16213e', accent: '#e2b96a', text: '#e0e0e0', textMuted: '#8892a4', border: '#2a3654' },
  'dark-slate':    { label: 'Dark Slate',      bg: '#0d1117', surface: '#161b22', accent: '#58a6ff', text: '#c9d1d9', textMuted: '#8b949e', border: '#30363d' },
  'dark-coffee':   { label: 'Dark Coffee',     bg: '#1C1410', surface: '#2C2018', accent: '#C8A97E', text: '#E8D5B7', textMuted: '#9A8070', border: '#4A3828' },
  'chesscom-dark': { label: 'Chess.com Dark',  bg: '#1a1a1a', surface: '#262421', accent: '#7fa650', text: '#bababa', textMuted: '#7a7a7a', border: '#3d3a36' },
  'light-classic': { label: 'Light Classic',   bg: '#f5f5f0', surface: '#ffffff', accent: '#4a7c59', text: '#1a1a1a', textMuted: '#666666', border: '#dddddd' },
  'light-cream':   { label: 'Light Cream',     bg: '#F5F0E8', surface: '#FFFDF7', accent: '#7C5C3B', text: '#2C1F14', textMuted: '#8C7B6A', border: '#D4C9B8' },
}
