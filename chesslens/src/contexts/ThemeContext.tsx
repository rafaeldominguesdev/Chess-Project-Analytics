import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ThemeConfig, BoardThemeName, PieceSetName, UIThemeName, AnimationSpeed, BoardSize } from '../types/theme.types'
import { UI_THEMES, BOARD_THEMES } from '../utils/boardThemes'

const STORAGE_KEY = 'chesslens-theme'

const DEFAULT_THEME: ThemeConfig = {
  boardTheme: 'graphite-amber',
  pieceSet: 'cburnett',
  uiTheme: 'amber-noir',
  showCoordinates: true,
  showLegalMoves: true,
  showLastMove: true,
  showArrows: true,
  animationSpeed: 'normal',
  boardSize: 'auto',
  soundEnabled: true,
}

// Defaults antigos — quem tinha isso salvo nunca escolheu um tema de propósito,
// então migra pro novo default (tabuleiro/peça/UI assinatura do ChessLens) também.
const OLD_DEFAULT_BOARD_THEMES = new Set(['chesscom-walnut', 'obsidian-gold', 'brasil', 'chesscom-green'])
const OLD_DEFAULT_UI_THEMES = new Set(['obsidian-gold', 'brasil', 'chesscom-dark', 'arcade-mostarda'])
// 'governor' foi o default antigo (peças com pouco detalhe, reportado como "feio") — volta pro
// clássico 'cburnett' (o mesmo conjunto que o Lichess usa como padrão, bem mais nítido/detalhado).
const OLD_DEFAULT_PIECE_SETS = new Set(['governor'])

interface ThemeContextValue {
  theme: ThemeConfig
  setBoardTheme: (t: BoardThemeName) => void
  setPieceSet: (t: PieceSetName) => void
  setUITheme: (t: UIThemeName) => void
  setShowCoordinates: (v: boolean) => void
  setShowLegalMoves: (v: boolean) => void
  setShowLastMove: (v: boolean) => void
  setShowArrows: (v: boolean) => void
  setAnimationSpeed: (v: AnimationSpeed) => void
  setBoardSize: (v: BoardSize) => void
  setSoundEnabled: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyUITheme(uiTheme: UIThemeName) {
  const t = UI_THEMES[uiTheme]
  const root = document.documentElement
  root.style.setProperty('--color-bg-main', t.bg)
  root.style.setProperty('--color-bg-panel', t.surface)
  root.style.setProperty('--color-blue-bright', t.accent)
  root.style.setProperty('--color-text-on-dark', t.text)
  root.style.setProperty('--color-gray-muted', t.textMuted)
  root.style.setProperty('--color-gray-border', t.border)
  if (t.shadowBtn) root.style.setProperty('--color-shadow-btn', t.shadowBtn)
  else root.style.removeProperty('--color-shadow-btn')
}

function applyBoardTheme(boardTheme: BoardThemeName) {
  const t = BOARD_THEMES[boardTheme]
  const root = document.documentElement
  root.style.setProperty('--board-light', t.light)
  root.style.setProperty('--board-dark', t.dark)
  root.style.setProperty('--board-highlight', t.highlight)
  root.style.setProperty('--board-highlight-dark', t.highlightDark)
}

function loadSaved(): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const merged = { ...DEFAULT_THEME, ...JSON.parse(raw) } as ThemeConfig
      // Guarda contra nomes de tema antigos que já não existem
      if (!BOARD_THEMES[merged.boardTheme]) merged.boardTheme = DEFAULT_THEME.boardTheme
      if (!UI_THEMES[merged.uiTheme]) merged.uiTheme = DEFAULT_THEME.uiTheme
      // Quem ainda está num default antigo (nunca customizou de propósito) ganha o novo visual.
      if (OLD_DEFAULT_BOARD_THEMES.has(merged.boardTheme)) merged.boardTheme = DEFAULT_THEME.boardTheme
      if (OLD_DEFAULT_UI_THEMES.has(merged.uiTheme)) merged.uiTheme = DEFAULT_THEME.uiTheme
      if (OLD_DEFAULT_PIECE_SETS.has(merged.pieceSet)) merged.pieceSet = DEFAULT_THEME.pieceSet
      return merged
    }
  } catch {}
  return DEFAULT_THEME
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(loadSaved)

  useEffect(() => {
    applyUITheme(theme.uiTheme)
    applyBoardTheme(theme.boardTheme)
  }, [theme.uiTheme, theme.boardTheme])

  const update = useCallback((partial: Partial<ThemeConfig>) => {
    setTheme((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{
      theme,
      setBoardTheme: (t) => update({ boardTheme: t }),
      setPieceSet: (t) => update({ pieceSet: t }),
      setUITheme: (t) => update({ uiTheme: t }),
      setShowCoordinates: (v) => update({ showCoordinates: v }),
      setShowLegalMoves: (v) => update({ showLegalMoves: v }),
      setShowLastMove: (v) => update({ showLastMove: v }),
      setShowArrows: (v) => update({ showArrows: v }),
      setAnimationSpeed: (v) => update({ animationSpeed: v }),
      setBoardSize: (v) => update({ boardSize: v }),
      setSoundEnabled: (v) => update({ soundEnabled: v }),
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
