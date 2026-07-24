import type { PieceSet, PieceSetName, UITheme, UIThemeName } from '../types/theme.types'

export const BOARD_THEMES = {

  // ══════════════════════════════════════════════
  // CHESS.COM — TEMAS OFICIAIS
  // ══════════════════════════════════════════════
  'chesscom-green':      { label: 'Green',      category: 'Chess.com', light: '#EEEED2', dark: '#769656', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(20,85,30,0.5)',   moveTo: 'rgba(20,85,30,0.5)' },
  'chesscom-walnut':     { label: 'Walnut',     category: 'Chess.com', light: '#F0D9B5', dark: '#B58863', highlight: '#CDD26A', highlightDark: '#AABE53', moveFrom: 'rgba(155,100,0,0.5)', moveTo: 'rgba(155,100,0,0.5)' },
  'chesscom-blue':       { label: 'Blue',       category: 'Chess.com', light: '#DEE3E6', dark: '#8CA2AD', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(0,80,140,0.5)',  moveTo: 'rgba(0,80,140,0.5)' },
  'chesscom-purple':     { label: 'Purple',     category: 'Chess.com', light: '#EAE1F4', dark: '#9B72D0', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(100,0,160,0.5)', moveTo: 'rgba(100,0,160,0.5)' },
  'chesscom-bubblegum':  { label: 'Bubblegum',  category: 'Chess.com', light: '#FFE4EE', dark: '#F272A0', highlight: '#FFD700', highlightDark: '#FFC200', moveFrom: 'rgba(200,0,100,0.4)', moveTo: 'rgba(200,0,100,0.4)' },
  'chesscom-marble':     { label: 'Marble',     category: 'Chess.com', light: '#EDE0CC', dark: '#AE8A68', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(140,100,40,0.5)', moveTo: 'rgba(140,100,40,0.5)' },
  'chesscom-tournament': { label: 'Tournament', category: 'Chess.com', light: '#F5F5DC', dark: '#4B7399', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(0,60,120,0.5)',  moveTo: 'rgba(0,60,120,0.5)' },
  'chesscom-christmas':  { label: 'Christmas',  category: 'Chess.com', light: '#E8F4E8', dark: '#CC2200', highlight: '#FFD700', highlightDark: '#FFC200', moveFrom: 'rgba(180,0,0,0.5)',   moveTo: 'rgba(180,0,0,0.5)' },
  'chesscom-stone':      { label: 'Stone',      category: 'Chess.com', light: '#D9D4CC', dark: '#7A7570', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(80,75,70,0.5)',  moveTo: 'rgba(80,75,70,0.5)' },
  'chesscom-bases':      { label: 'Bases',      category: 'Chess.com', light: '#E8DCC8', dark: '#6B9560', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(50,110,50,0.5)', moveTo: 'rgba(50,110,50,0.5)' },
  'chesscom-neon':       { label: 'Neon',       category: 'Chess.com', light: '#1A1A2E', dark: '#16213E', highlight: '#E94560', highlightDark: '#C73652', moveFrom: 'rgba(230,50,100,0.5)', moveTo: 'rgba(230,50,100,0.5)' },
  'chesscom-lolz':       { label: 'Lolz',       category: 'Chess.com', light: '#F0E4CC', dark: '#C8A050', highlight: '#FF6B6B', highlightDark: '#CC4444', moveFrom: 'rgba(200,140,0,0.5)', moveTo: 'rgba(200,140,0,0.5)' },

  // ══════════════════════════════════════════════
  // LICHESS
  // ══════════════════════════════════════════════
  'lichess-brown':     { label: 'Brown',     category: 'Lichess', light: '#F0D9B5', dark: '#B58863', highlight: '#CDD26A', highlightDark: '#AABE53', moveFrom: 'rgba(155,100,0,0.5)', moveTo: 'rgba(155,100,0,0.5)' },
  'lichess-blue':      { label: 'Blue',      category: 'Lichess', light: '#DEE3E6', dark: '#788FA5', highlight: '#A8D8EA', highlightDark: '#6BAED6', moveFrom: 'rgba(0,80,140,0.5)',  moveTo: 'rgba(0,80,140,0.5)' },
  'lichess-green':     { label: 'Green',     category: 'Lichess', light: '#FFFFDD', dark: '#86A666', highlight: '#F6F669', highlightDark: '#BACA2B', moveFrom: 'rgba(80,140,0,0.5)',  moveTo: 'rgba(80,140,0,0.5)' },
  'lichess-purple':    { label: 'Purple',    category: 'Lichess', light: '#9F90B0', dark: '#7D4A8D', highlight: '#E0D0F0', highlightDark: '#C8A8E8', moveFrom: 'rgba(100,0,160,0.5)', moveTo: 'rgba(100,0,160,0.5)' },
  'lichess-newspaper': { label: 'Newspaper', category: 'Lichess', light: '#FFFFFF', dark: '#58AC8A', highlight: '#FFFF00', highlightDark: '#CCCC00', moveFrom: 'rgba(0,130,100,0.5)', moveTo: 'rgba(0,130,100,0.5)' },
  'lichess-ic':        { label: 'IC',        category: 'Lichess', light: '#FFFFF0', dark: '#7389B1', highlight: '#CDC26A', highlightDark: '#ADB053', moveFrom: 'rgba(0,60,120,0.5)',  moveTo: 'rgba(0,60,120,0.5)' },

  // ══════════════════════════════════════════════
  // TEMAS EXCLUSIVOS
  // ══════════════════════════════════════════════
  'midnight': { label: 'Midnight', category: 'Exclusivo', light: '#1E2A3A', dark: '#0D1B2A', highlight: '#3D5A80', highlightDark: '#2C4057', moveFrom: 'rgba(50,100,180,0.5)', moveTo: 'rgba(50,100,180,0.5)' },
  'emerald':  { label: 'Emerald',  category: 'Exclusivo', light: '#E8F5E9', dark: '#2E7D32', highlight: '#FFF176', highlightDark: '#F9A825', moveFrom: 'rgba(30,120,40,0.5)',  moveTo: 'rgba(30,120,40,0.5)' },
  'obsidian': { label: 'Obsidian', category: 'Exclusivo', light: '#2C2C2C', dark: '#1A1A1A', highlight: '#8B5CF6', highlightDark: '#6D28D9', moveFrom: 'rgba(120,60,220,0.5)', moveTo: 'rgba(120,60,220,0.5)' },
  'coral':    { label: 'Coral',    category: 'Exclusivo', light: '#FFF0EB', dark: '#D05A3A', highlight: '#FFD700', highlightDark: '#FFC200', moveFrom: 'rgba(200,60,20,0.5)',  moveTo: 'rgba(200,60,20,0.5)' },

} as const

export type BoardThemeName = keyof typeof BOARD_THEMES
export type BoardThemeDef = (typeof BOARD_THEMES)[BoardThemeName]

// Agrupa os temas por categoria preservando a ordem de inserção
export const THEMES_BY_CATEGORY = (Object.entries(BOARD_THEMES) as [BoardThemeName, BoardThemeDef][])
  .reduce((acc, [key, theme]) => {
    ;(acc[theme.category] ??= []).push({ key, ...theme })
    return acc
  }, {} as Record<string, Array<{ key: BoardThemeName } & BoardThemeDef>>)

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
}

export const UI_THEMES: Record<UIThemeName, UITheme> = {
  'dark-classic':  { label: 'Dark Classic',    bg: '#1a1a2e', surface: '#16213e', surface2: '#0f3460', accent: '#e2b96a', text: '#e0e0e0', textMuted: '#8892a4', border: '#2a3654' },
  'dark-slate':    { label: 'Dark Slate',      bg: '#0d1117', surface: '#161b22', surface2: '#21262d', accent: '#58a6ff', text: '#c9d1d9', textMuted: '#8b949e', border: '#30363d' },
  'dark-coffee':   { label: 'Dark Coffee',     bg: '#1C1410', surface: '#2C2018', surface2: '#3D2E20', accent: '#C8A97E', text: '#E8D5B7', textMuted: '#9A8070', border: '#4A3828' },
  'chesscom-dark': { label: 'Chess.com Dark',  bg: '#1a1a1a', surface: '#262421', surface2: '#312e2b', accent: '#7fa650', text: '#bababa', textMuted: '#7a7a7a', border: '#3d3a36' },
  'light-classic': { label: 'Light Classic',   bg: '#f5f5f0', surface: '#ffffff', surface2: '#efefef', accent: '#4a7c59', text: '#1a1a1a', textMuted: '#666666', border: '#dddddd' },
  'light-cream':   { label: 'Light Cream',     bg: '#F5F0E8', surface: '#FFFDF7', surface2: '#EDE8DC', accent: '#7C5C3B', text: '#2C1F14', textMuted: '#8C7B6A', border: '#D4C9B8' },
}
