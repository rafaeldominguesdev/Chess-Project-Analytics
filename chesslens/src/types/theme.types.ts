// BoardThemeName é derivado do objeto BOARD_THEMES (fonte única da verdade)
import type { BoardThemeName } from '../utils/boardThemes'
export type { BoardThemeName }

export type PieceSetName =
  | 'cburnett' | 'merida' | 'alpha' | 'california' | 'cardinal' | 'chessnut'
  | 'companion' | 'dubrovny' | 'fantasy' | 'fresca' | 'gioco' | 'governor'
  | 'horsey' | 'icpieces' | 'kosal' | 'leipzig' | 'letter' | 'maestro'
  | 'mono' | 'pirouetti' | 'pixel' | 'rhosgfx' | 'shapes' | 'spatial'
  | 'staunty' | 'tatiana'

export type UIThemeName =
  | 'arcade-mostarda'
  | 'brasil'
  | 'dark-classic' | 'dark-slate' | 'dark-coffee' | 'chesscom-dark'
  | 'light-classic' | 'light-cream'

export type AnimationSpeed = 'none' | 'fast' | 'normal' | 'slow'
export type BoardSize = 'small' | 'medium' | 'large' | 'auto'

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
}

export interface BoardTheme {
  label: string
  light: string
  dark: string
  highlight: string
  highlightDark: string
}

export interface PieceSet {
  label: string
  src: string
}

export interface UITheme {
  label: string
  bg: string
  surface: string
  surface2: string
  accent: string
  text: string
  textMuted: string
  border: string
  /** Cor da sombra "dura" (offset, sem blur) dos botões estilo arcade. Opcional — cai pro preto padrão do :root se ausente. */
  shadowHard?: string
  /** Cor do texto sobre fundo accent (botões primários). Opcional — cai pro branco padrão do :root se ausente. */
  onAccent?: string
}
