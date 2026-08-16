import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { THEMES_BY_CATEGORY, PIECE_SETS } from '../../utils/boardThemes'
import type { BoardThemeName, PieceSetName, BoardSize, AnimationSpeed } from '../../types/theme.types'
import { BoardIcon, AppearanceIcon, MotionIcon, SoundIcon, SearchIcon } from './icons'

type CategoryId = 'board' | 'appearance' | 'animation' | 'sound'

interface Category {
  id: CategoryId
  label: string
  description: string
  icon: (props: { size?: number }) => ReactNode
  keywords: string[]
}

const CATEGORIES: Category[] = [
  {
    id: 'board', label: 'Tabuleiro e Peças', description: 'Cores do tabuleiro, conjunto de peças e tamanho.',
    icon: ({ size }) => <BoardIcon width={size} height={size} />,
    keywords: ['tema', 'cores', 'madeira', 'peças', 'tamanho', 'grande', 'pequeno'],
  },
  {
    id: 'appearance', label: 'Aparência', description: 'O que é destacado no tabuleiro durante a análise.',
    icon: ({ size }) => <AppearanceIcon width={size} height={size} />,
    keywords: ['coordenadas', 'setas', 'lances legais', 'última jogada'],
  },
  {
    id: 'animation', label: 'Animação', description: 'Velocidade das jogadas na tela.',
    icon: ({ size }) => <MotionIcon width={size} height={size} />,
    keywords: ['velocidade', 'rápida', 'lenta', 'transição'],
  },
  {
    id: 'sound', label: 'Sons', description: 'Efeitos sonoros ao mover as peças.',
    icon: ({ size }) => <SoundIcon width={size} height={size} />,
    keywords: ['som', 'volume', 'áudio', 'mudo'],
  },
]

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ── Mini-preview do tabuleiro: grid 2x2 com as cores exatas do tema ──
function BoardPreview({ light, dark, isSelected }: { light: string; dark: string; isSelected: boolean }) {
  return (
    <div style={{
      width: 40, height: 40,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      borderRadius: 7,
      overflow: 'hidden',
      border: '1.5px solid var(--border)',
      outline: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
      outlineOffset: 2,
      boxShadow: isSelected ? '0 2px 8px -1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
      flexShrink: 0,
      transition: 'outline-color 0.12s, box-shadow 0.12s',
    }}>
      <div style={{ background: light }} />
      <div style={{ background: dark }} />
      <div style={{ background: dark }} />
      <div style={{ background: light }} />
    </div>
  )
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    theme,
    setBoardTheme, setPieceSet,
    setShowCoordinates, setShowArrows, setShowLegalMoves, setShowLastMove,
    setBoardSize, setAnimationSpeed, setSoundEnabled,
  } = useTheme()
  const [category, setCategory] = useState<CategoryId>('board')
  const [query, setQuery] = useState('')

  const visibleCategories = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return CATEGORIES
    return CATEGORIES.filter((c) => normalize(c.label).includes(q) || c.keywords.some((k) => normalize(k).includes(q)))
  }, [query])

  const active = visibleCategories.find((c) => c.id === category) ?? visibleCategories[0]

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(5,4,12,0.6)', backdropFilter: 'blur(8px)', zIndex: 49 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 720,
        maxWidth: '94vw',
        background: 'var(--surface)',
        borderLeft: '3px solid var(--border)',
        zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 22px 16px',
          borderBottom: '2px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div className="cl-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>Configurações</div>
          <button
            onClick={onClose}
            className="cl-btn cl-btn-sm"
            style={{ color: 'var(--text)', fontSize: 18, lineHeight: 1, padding: '6px 10px' }}
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <SearchIcon width={15} height={15} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar configurações"
              style={{
                width: '100%', padding: '9px 12px 9px 32px', fontSize: 13,
                background: 'var(--surface2)', border: '2px solid var(--border)', borderRadius: 9,
                color: 'var(--text)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Corpo: navegação + conteúdo */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, marginTop: 14 }}>
          {/* Navegação por categoria */}
          <nav style={{ width: 216, flexShrink: 0, borderRight: '2px solid var(--border)', padding: '4px 12px 16px', overflowY: 'auto' }}>
            {visibleCategories.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 8px' }}>Nada encontrado.</div>
            )}
            {visibleCategories.map((c) => {
              const isActive = active?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 10px', marginBottom: 3, borderRadius: 8,
                    border: 'none', borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: isActive ? 'var(--bg)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                    {c.icon({ size: 16 })}
                  </span>
                  <span style={{ fontSize: 13 }}>{c.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Conteúdo da categoria selecionada */}
          <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 24px' }}>
            {active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--accent)',
                }}>
                  {active.icon({ size: 18 })}
                </span>
                <div>
                  <div className="cl-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{active.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{active.description}</div>
                </div>
              </div>
            )}

            {active?.id === 'board' && (
              <>
                <Section label="Tabuleiro">
                  {Object.entries(THEMES_BY_CATEGORY).map(([cat, themes]) => (
                    <div key={cat} style={{ marginBottom: 16 }}>
                      <CategoryLabel>{cat}</CategoryLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        {themes.map((t) => (
                          <ThemeRow
                            key={t.key}
                            label={t.label}
                            isSelected={theme.boardTheme === t.key}
                            onClick={() => setBoardTheme(t.key as BoardThemeName)}
                          >
                            <BoardPreview light={t.light} dark={t.dark} isSelected={theme.boardTheme === t.key} />
                          </ThemeRow>
                        ))}
                      </div>
                    </div>
                  ))}
                </Section>

                <Divider />

                <Section label="Conjunto de peças">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {(Object.entries(PIECE_SETS) as [PieceSetName, { label: string; src: string }][]).map(([key, ps]) => (
                      <PieceSetButton
                        key={key}
                        label={ps.label}
                        pieceSetKey={key}
                        isSelected={theme.pieceSet === key}
                        onClick={() => setPieceSet(key)}
                      />
                    ))}
                  </div>
                </Section>

                <Divider />

                <Section label="Tamanho do tabuleiro">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {(['small', 'medium', 'large', 'auto'] as const).map((size) => (
                      <SizeButton
                        key={size}
                        label={{ small: 'Pequeno', medium: 'Médio', large: 'Grande', auto: 'Auto' }[size]}
                        isSelected={theme.boardSize === size}
                        onClick={() => setBoardSize(size as BoardSize)}
                      />
                    ))}
                  </div>
                </Section>
              </>
            )}

            {active?.id === 'appearance' && (
              <Section label="Destaques no tabuleiro">
                <Toggle label="Mostrar coordenadas" description="Letras e números nas bordas" checked={theme.showCoordinates} onChange={setShowCoordinates} />
                <Toggle label="Última jogada" description="Destaca as casas de origem e destino" checked={theme.showLastMove} onChange={setShowLastMove} />
                <Toggle label="Setas de análise" description="Melhor lance do Stockfish" checked={theme.showArrows} onChange={setShowArrows} />
                <Toggle label="Lances legais" description="Highlight ao clicar numa peça" checked={theme.showLegalMoves} onChange={setShowLegalMoves} />
              </Section>
            )}

            {active?.id === 'animation' && (
              <Section label="Velocidade de animação">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {(['none', 'fast', 'normal', 'slow'] as const).map((speed) => (
                    <SizeButton
                      key={speed}
                      label={{ none: 'Off', fast: 'Rápida', normal: 'Normal', slow: 'Lenta' }[speed]}
                      isSelected={theme.animationSpeed === speed}
                      onClick={() => setAnimationSpeed(speed as AnimationSpeed)}
                    />
                  ))}
                </div>
              </Section>
            )}

            {active?.id === 'sound' && (
              <Section label="Sons">
                <Toggle label="Som" description="Efeito sonoro a cada lance" checked={theme.soundEnabled} onChange={setSoundEnabled} />
              </Section>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Sub-componentes internos ──────────────────────────────────────

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)',
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
        {label}
      </div>
      {children}
    </div>
  )
}

function CategoryLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, paddingLeft: 2 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 2, background: 'var(--border)', margin: '18px 0' }} />
}

function ThemeRow({ label, isSelected, onClick, children }: { label: string; isSelected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 9px',
        background: isSelected ? 'var(--surface2)' : 'transparent',
        border: isSelected ? '1.5px solid var(--border)' : '1.5px solid transparent',
        borderRadius: 8, cursor: 'pointer',
        width: '100%', textAlign: 'left', transition: 'background 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
      <span style={{ fontSize: 13, color: isSelected ? 'var(--text)' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontSize: 14, flexShrink: 0 }}>✓</span>}
    </button>
  )
}

function PieceSetButton({ label, pieceSetKey, isSelected, onClick }: { label: string; pieceSetKey: PieceSetName; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '9px 4px',
        background: isSelected ? 'var(--surface2)' : 'var(--bg)',
        border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 9, cursor: 'pointer', transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s',
        boxShadow: isSelected ? '0 2px 8px -1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)' }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      <img
        src={`https://lichess1.org/assets/piece/${pieceSetKey}/bQ.svg`}
        width={32} height={32} alt={label}
        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
      />
      <span style={{ fontSize: 10, color: isSelected ? 'var(--text)' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
    </button>
  )
}

function SizeButton({ label, isSelected, onClick }: { label: string; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 4px',
        background: isSelected ? 'var(--accent)' : 'var(--surface2)',
        border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
        borderRadius: 7, cursor: 'pointer',
        fontSize: 11, color: isSelected ? 'var(--on-accent, #fff)' : 'var(--text-muted)',
        fontWeight: isSelected ? 700 : 400,
        boxShadow: isSelected ? '0 2px 8px -1px color-mix(in srgb, var(--accent) 45%, transparent)' : 'none',
        transition: 'border-color 0.12s, background 0.12s, box-shadow 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)' }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      {label}
    </button>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 10px', margin: '0 -10px', borderRadius: 8,
        cursor: 'pointer', transition: 'background 0.12s',
      }}
      onClick={() => onChange(!checked)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface2)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div>
        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{description}</div>
      </div>
      <div style={{ width: 36, height: 20, background: checked ? 'var(--accent)' : 'var(--bg)', border: '2px solid var(--border)', borderRadius: 10, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 1, left: checked ? 16 : 1, width: 14, height: 14, background: checked ? 'var(--on-accent, #fff)' : 'var(--text-muted)', borderRadius: '50%', transition: 'left 0.2s, background 0.2s' }} />
      </div>
    </div>
  )
}
