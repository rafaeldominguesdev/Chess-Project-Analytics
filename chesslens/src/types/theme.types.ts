// BoardThemeName é derivado do objeto BOARD_THEMES (fonte única da verdade)
import type { BoardThemeName } from '../utils/boardThemes'
export type { BoardThemeName }

export type PieceSetName =
  | 'cburnett' | 'merida' | 'alpha' | 'california' | 'cardinal' | 'chessnut'
  | 'companion' | 'dubrovny' | 'fantasy' | 'fresca' | 'gioco' | 'governor'
  | 'horsey' | 'icpieces' | 'kosal' | 'leipzig' | 'letter' | 'maestro'
  | 'mono' | 'pirouetti' | 'pixel' | 'rhosgfx' | 'shapes' | 'spatial'
  | 'staunty' | 'tatiana'
  | 'anarcandy' | 'caliente' | 'celtic' | 'chess7' | 'cooke' | 'firi'
  | 'mpchess' | 'reillycraig' | 'riohacha' | 'xkcd' | 'kiwen-suwi'
  | 'dubrovny-noir'

export type UIThemeName =
  | 'amber-noir'
  | 'brasil'
  | 'dark-classic' | 'dark-slate' | 'dark-coffee' | 'chesscom-dark'
  | 'light-classic' | 'light-cream'

export type AnimationSpeed = 'none' | 'fast' | 'normal' | 'slow'
export type BoardSize = 'small' | 'medium' | 'large' | 'auto'
// SoundTheme é derivado de SOUND_THEMES (fonte única da verdade)
import type { SoundTheme } from '../utils/sounds'
export type { SoundTheme }

export interface ThemeConfig {
  boardTheme: BoardThemeName
  pieceSet: PieceSetName
  uiTheme: UIThemeName
  showCoordinates: boolean
  showLegalMoves: boolean
  showLastMove: boolean
  showArrows: boolean
  animationSpeed: AnimationSpeed
  boardSize: BoardSize
  soundEnabled: boolean
  soundTheme: SoundTheme
}

export interface BoardTheme {
  label: string
  light: string
  dark: string
  highlight: string
  highlightDark: string
  /** URL de uma textura (madeira/mármore/etc) cobrindo o tabuleiro inteiro (8x8, imagem
   *  quadrada) — quando presente, as casas ficam transparentes e essa imagem aparece por
   *  trás, em vez das cores lisas de `light`/`dark`. `light`/`dark` continuam usados como
   *  cor aproximada (contraste da notação, e o editor de posição, que não é texturizado). */
  image?: string
}

export interface PieceSet {
  label: string
  src: string
}

export interface UITheme {
  label: string
  bg: string
  surface: string
  accent: string
  text: string
  textMuted: string
  border: string
  /** Cor da sombra "dura" (offset, sem blur) — só usada nos botões estilo arcade. Opcional — cai pro preto padrão do :root se ausente. */
  shadowBtn?: string
}
