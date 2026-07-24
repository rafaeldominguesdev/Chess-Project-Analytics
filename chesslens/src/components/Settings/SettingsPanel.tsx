import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { THEMES_BY_CATEGORY, PIECE_SETS, UI_THEMES } from '../../utils/boardThemes'
import type { BoardThemeName, PieceSetName, UIThemeName, BoardSize, AnimationSpeed } from '../../types/theme.types'
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
    id: 'appearance', label: 'Aparência', description: 'Cores da interface e o que é destacado no tabuleiro.',
    icon: ({ size }) => <AppearanceIcon width={size} height={size} />,
    keywords: ['cor', 'escuro', 'claro', 'dark', 'light', 'coordenadas', 'setas', 'lances legais', 'última jogada'],
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
      borderRadius: 6,
      overflow: 'hidden',
      outline: isSelected ? '2px solid #7fa650' : '2px solid transparent',
      outlineOffset: 2,
      flexShrink: 0,
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
    setBoardTheme, setPieceSet, setUITheme,
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 720,
        maxWidth: '94vw',
        background: '#1C1F24',
        borderLeft: '1px solid #2A2D35',
        zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid #2A2D35',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#E0E0E0' }}>Configurações</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div style={{ padding: '14px 22px 0', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6B7280', display: 'flex' }}>
              <SearchIcon width={15} height={15} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar configurações"
              style={{
                width: '100%', padding: '9px 12px 9px 32px', fontSize: 13,
                background: '#252830', border: '1px solid #2A2D35', borderRadius: 8,
                color: '#E0E0E0', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Corpo: navegação + conteúdo */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, marginTop: 14 }}>
          {/* Navegação por categoria */}
          <nav style={{ width: 210, flexShrink: 0, borderRight: '1px solid #2A2D35', padding: '4px 10px 16px', overflowY: 'auto' }}>
            {visibleCategories.length === 0 && (
              <div style={{ fontSize: 12, color: '#4B5563', padding: '12px 8px' }}>Nada encontrado.</div>
            )}
            {visibleCategories.map((c) => {
              const isActive = active?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '9px 10px', marginBottom: 2, borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? '#252830' : 'transparent',
                    color: isActive ? '#E0E0E0' : '#9CA3AF',
                    fontWeight: isActive ? 700 : 500,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#1E2128' }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ display: 'flex', color: isActive ? '#7fa650' : '#6B7280', flexShrink: 0 }}>
                    {c.icon({ size: 18 })}
                  </span>
                  <span style={{ fontSize: 13 }}>{c.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Conteúdo da categoria selecionada */}
          <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 22px 24px' }}>
            {active && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#E0E0E0' }}>{active.label}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{active.description}</div>
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
              <>
                <Section label="Cores da interface">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(Object.entries(UI_THEMES) as [UIThemeName, (typeof UI_THEMES)[UIThemeName]][]).map(([key, ut]) => (
                      <ThemeRow
                        key={key}
                        label={ut.label}
                        isSelected={theme.uiTheme === key}
                        onClick={() => setUITheme(key)}
                      >
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          {[ut.bg, ut.surface, ut.accent].map((c, i) => (
                            <div key={i} style={{ width: 12, height: 32, background: c, borderRadius: 3 }} />
                          ))}
                        </div>
                      </ThemeRow>
                    ))}
                  </div>
                </Section>

                <Divider />

                <Section label="Destaques no tabuleiro">
                  <Toggle label="Mostrar coordenadas" description="Letras e números nas bordas" checked={theme.showCoordinates} onChange={setShowCoordinates} />
                  <Toggle label="Última jogada" description="Destaca as casas de origem e destino" checked={theme.showLastMove} onChange={setShowLastMove} />
                  <Toggle label="Setas de análise" description="Melhor lance do Stockfish" checked={theme.showArrows} onChange={setShowArrows} />
                  <Toggle label="Lances legais" description="Highlight ao clicar numa peça" checked={theme.showLegalMoves} onChange={setShowLegalMoves} />
                </Section>
              </>
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
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#4B5563', textTransform: 'uppercase', marginBottom: 12 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function CategoryLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, paddingLeft: 2 }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#2A2D35', margin: '18px 0' }} />
}

function ThemeRow({ label, isSelected, onClick, children }: { label: string; isSelected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px',
        background: isSelected ? '#252830' : 'transparent',
        border: 'none', borderRadius: 8, cursor: 'pointer',
        width: '100%', textAlign: 'left', transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#1E2128' }}
      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
      <span style={{ fontSize: 13, color: isSelected ? '#E0E0E0' : '#9CA3AF', fontWeight: isSelected ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isSelected && <span style={{ marginLeft: 'auto', color: '#7fa650', fontSize: 14, flexShrink: 0 }}>✓</span>}
    </button>
  )
}

function PieceSetButton({ label, pieceSetKey, isSelected, onClick }: { label: string; pieceSetKey: PieceSetName; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '8px 4px',
        background: isSelected ? '#252830' : 'transparent',
        border: isSelected ? '1px solid #7fa650' : '1px solid #2A2D35',
        borderRadius: 8, cursor: 'pointer', transition: 'all 0.1s',
      }}
    >
      <img
        src={`https://lichess1.org/assets/piece/${pieceSetKey}/bQ.svg`}
        width={32} height={32} alt={label}
        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
      />
      <span style={{ fontSize: 10, color: isSelected ? '#E0E0E0' : '#6B7280', textAlign: 'center', lineHeight: 1.2 }}>
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
        padding: '6px 4px',
        background: isSelected ? '#7fa650' : '#252830',
        border: 'none', borderRadius: 6, cursor: 'pointer',
        fontSize: 11, color: isSelected ? '#fff' : '#9CA3AF',
        fontWeight: isSelected ? 600 : 400, transition: 'all 0.1s',
      }}
    >
      {label}
    </button>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1E2128', cursor: 'pointer' }}
      onClick={() => onChange(!checked)}
    >
      <div>
        <div style={{ fontSize: 13, color: '#E0E0E0' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#4B5563', marginTop: 1 }}>{description}</div>
      </div>
      <div style={{ width: 36, height: 20, background: checked ? '#7fa650' : '#2A2D35', borderRadius: 10, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: 'left 0.2s' }} />
      </div>
    </div>
  )
}
