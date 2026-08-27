import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ThemeConfig, BoardThemeName, PieceSetName, UIThemeName, AnimationSpeed, BoardSize, SoundTheme } from '../types/theme.types'
import { UI_THEMES, BOARD_THEMES } from '../utils/boardThemes'
import { SOUND_THEMES } from '../utils/sounds'

const STORAGE_KEY = 'chesslens-theme'

// Blue + Alpha é só o PADRÃO de fábrica (pedido direto do usuário — trocou do default anterior,
// Green + Dubrovny Noir) — trocável de novo em Configurações (ver SettingsPanel.tsx e
// CURATED_BOARD_THEMES/CURATED_PIECE_SETS em boardThemes.ts, a lista curada que aparece no
// seletor). Todos os tabuleiros/peças continuam definidos em boardThemes.ts.
const DEFAULT_THEME: ThemeConfig = {
  boardTheme: 'chesscom-blue',
  pieceSet: 'alpha',
  uiTheme: 'amber-noir',
  showCoordinates: true,
  coordinatesOutside: false,
  showLegalMoves: true,
  showLastMove: true,
  showArrows: true,
  animationSpeed: 'normal',
  boardSize: 'auto',
  soundEnabled: true,
  soundTheme: 'standard',
}

// Defaults antigos — quem tinha isso salvo nunca escolheu um tema de propósito, então migra pro
// novo default também. IMPORTANTE: normalmente só entra aqui quem NÃO é mais uma opção válida no
// seletor curado, pra não sobrescrever uma escolha deliberada da pessoa no próximo carregamento —
// 'chesscom-green'/'dubrovny-noir' são exceção: continuam válidos no seletor, mas entraram aqui
// mesmo assim porque a troca de default pra Blue/Alpha foi um pedido EXPLÍCITO do usuário sobre o
// que ele mesmo já tinha salvo (não uma limpeza de opção descontinuada como as outras abaixo).
const OLD_DEFAULT_BOARD_THEMES = new Set(['obsidian-gold', 'brasil', 'chesscom-green'])
const OLD_DEFAULT_UI_THEMES = new Set(['obsidian-gold', 'brasil', 'chesscom-dark', 'arcade-mostarda'])
// 'governor' foi default antigo de peça — 'cburnett' voltou a ser opção legítima no seletor.
const OLD_DEFAULT_PIECE_SETS = new Set(['governor', 'dubrovny-noir'])

interface ThemeContextValue {
  theme: ThemeConfig
  setBoardTheme: (t: BoardThemeName) => void
  setPieceSet: (t: PieceSetName) => void
  setUITheme: (t: UIThemeName) => void
  setShowCoordinates: (v: boolean) => void
  setCoordinatesOutside: (v: boolean) => void
  setShowLegalMoves: (v: boolean) => void
  setShowLastMove: (v: boolean) => void
  setShowArrows: (v: boolean) => void
  setAnimationSpeed: (v: AnimationSpeed) => void
  setBoardSize: (v: BoardSize) => void
  setSoundEnabled: (v: boolean) => void
  setSoundTheme: (v: SoundTheme) => void
  resetTheme: () => void
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
      if (!SOUND_THEMES[merged.soundTheme]) merged.soundTheme = DEFAULT_THEME.soundTheme
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
      setCoordinatesOutside: (v) => update({ coordinatesOutside: v }),
      setShowLegalMoves: (v) => update({ showLegalMoves: v }),
      setShowLastMove: (v) => update({ showLastMove: v }),
      setShowArrows: (v) => update({ showArrows: v }),
      setAnimationSpeed: (v) => update({ animationSpeed: v }),
      setBoardSize: (v) => update({ boardSize: v }),
      setSoundEnabled: (v) => update({ soundEnabled: v }),
      setSoundTheme: (v) => update({ soundTheme: v }),
      resetTheme: () => update(DEFAULT_THEME),
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
