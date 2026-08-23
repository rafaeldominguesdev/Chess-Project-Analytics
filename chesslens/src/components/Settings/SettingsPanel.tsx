import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES, CURATED_BOARD_THEMES, CURATED_PIECE_SETS, PIECE_SETS, PIECE_COLOR_FILTER } from '../../utils/boardThemes'
import type { PieceSetName, BoardSize, AnimationSpeed } from '../../types/theme.types'
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
    id: 'board', label: 'Tabuleiro e Peças', description: 'Cor do tabuleiro, conjunto de peças e tamanho.',
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
function BoardPreview({ light, dark, image, isSelected }: { light: string; dark: string; image?: string; isSelected: boolean }) {
  return (
    <div style={{
      width: 40, height: 40,
      display: image ? 'block' : 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      border: '1.5px solid var(--color-gray-border)',
      outline: isSelected ? '2px solid var(--color-blue-bright)' : '2px solid transparent',
      outlineOffset: 2,
      boxShadow: isSelected ? '0 2px 8px -1px color-mix(in srgb, var(--color-blue-bright) 45%, transparent)' : 'none',
      flexShrink: 0,
      transition: 'outline-color var(--dur-tap) var(--ease-tap), box-shadow var(--dur-tap) var(--ease-tap)',
      // Tabuleiros com foto (madeira/mármore/etc) mostram a textura real em miniatura, em vez
      // do grid 2x2 de cor lisa — ajuda a escolher olhando o resultado de verdade.
      ...(image ? { backgroundImage: `url(${image})`, backgroundSize: '100% 100%' } : {}),
    }}>
      {!image && (
        <>
          <div style={{ background: light }} />
          <div style={{ background: dark }} />
          <div style={{ background: dark }} />
          <div style={{ background: light }} />
        </>
      )}
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

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(5,4,12,0.65)', backdropFilter: 'blur(8px)', zIndex: 49 }}
      />

      {/* Modal centralizado — antes era uma gaveta encostada na borda direita da tela.
          A centralização (translate -50%/-50%) fica num wrapper separado da animação de
          entrada: a keyframe de cl-modal-in também anima "transform" e, no mesmo elemento,
          sobrescreveria o translate de centralização assim que a animação terminasse. */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 }}>
        <div
          className="cl-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label="Configurações"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 760, maxWidth: '94vw', height: 'min(660px, 88vh)',
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-gray-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.05), 0 1px 0 0 rgba(0,0,0,0.5), 0 32px 64px -16px rgba(0,0,0,0.75)',
          }}
        >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '2px solid var(--color-gray-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <h2 className="cl-display" style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text-on-dark)', letterSpacing: '-0.01em' }}>Configurações</h2>
          <button
            onClick={onClose}
            className="cl-btn cl-btn-sm"
            aria-label="Fechar configurações"
            style={{ color: 'var(--color-text-on-dark)', fontSize: 18, lineHeight: 1, padding: '6px 10px' }}
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-muted)', display: 'flex' }}>
              <SearchIcon width={15} height={15} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar configurações"
              style={{
                width: '100%', padding: '9px 12px 9px 32px', fontSize: 13,
                background: 'var(--color-bg-surface)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'var(--radius-sm)',
                boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.18), inset 0 1px 2px 0 rgba(0,0,0,0.1)',
                color: 'var(--color-text-on-light)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Corpo: navegação + conteúdo */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0, marginTop: 14 }}>
          {/* Navegação por categoria */}
          <nav style={{ width: 224, flexShrink: 0, borderRight: '2px solid var(--color-gray-border)', padding: '4px 14px 16px', overflowY: 'auto' }}>
            {visibleCategories.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-gray-muted)', padding: '12px 8px' }}>Nada encontrado.</div>
            )}
            {visibleCategories.map((c) => {
              const isActive = active?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 11px', marginBottom: 4, borderRadius: 'var(--radius-sm)',
                    border: isActive ? '1px solid var(--color-gray-border)' : '1px solid transparent',
                    cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'var(--color-bg-main)' : 'transparent',
                    color: isActive ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? 'inset 0 1px 0 0 rgba(255,255,255,0.03), 0 1px 0 0 rgba(0,0,0,0.4)' : 'none',
                    transition: `background var(--dur-tap) var(--ease-tap), border-color var(--dur-tap) var(--ease-tap)`,
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'color-mix(in srgb, var(--color-bg-main) 55%, transparent)' }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    background: isActive ? 'color-mix(in srgb, var(--color-blue-bright) 16%, var(--color-bg-panel))' : 'transparent',
                    color: isActive ? 'var(--color-blue-bright)' : 'var(--color-gray-muted)',
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
                  width: 34, height: 34, borderRadius: 'var(--radius-sm)', flexShrink: 0,
                  background: 'var(--color-bg-panel)', border: '1.5px solid var(--color-gray-border)', color: 'var(--color-blue-bright)',
                }}>
                  {active.icon({ size: 18 })}
                </span>
                <div>
                  <div className="cl-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>{active.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-gray-muted)', marginTop: 1 }}>{active.description}</div>
                </div>
              </div>
            )}

            {active?.id === 'board' && (
              <>
                <Section label="Tabuleiro">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    {CURATED_BOARD_THEMES.map((key) => {
                      const t = BOARD_THEMES[key]
                      return (
                        <ThemeRow
                          key={key}
                          label={t.label}
                          isSelected={theme.boardTheme === key}
                          onClick={() => setBoardTheme(key)}
                        >
                          <BoardPreview light={t.light} dark={t.dark} image={t.image} isSelected={theme.boardTheme === key} />
                        </ThemeRow>
                      )
                    })}
                  </div>
                </Section>

                <Divider />

                <Section label="Conjunto de peças">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {CURATED_PIECE_SETS.map((key) => (
                      <PieceSetButton
                        key={key}
                        label={PIECE_SETS[key].label}
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
      </div>
    </>
  )
}

// ── Sub-componentes internos ──────────────────────────────────────

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div className="cl-display" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-gray-muted)',
        textTransform: 'uppercase', marginBottom: 12,
      }}>
        <span style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--color-blue-bright)', flexShrink: 0 }} />
        {label}
      </div>
      {children}
    </div>
  )
}


function Divider() {
  return <div style={{ height: 2, background: 'var(--color-gray-border)', margin: '18px 0' }} />
}

const KEYCAP_IDLE_SHADOW =
  'inset 0 1px 0 0 rgba(255,255,255,0.06), inset 0 -2px 0 0 rgba(0,0,0,0.3), 0 3px 0 0 var(--color-shadow-btn), 0 6px 10px -4px rgba(0,0,0,0.55)'
const KEYCAP_HOVER_SHADOW =
  'inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 -2px 0 0 rgba(0,0,0,0.3), 0 4px 0 0 var(--color-shadow-btn), 0 8px 12px -4px rgba(0,0,0,0.6)'
const KEYCAP_PRESSED_SHADOW = 'inset 0 2px 4px 0 rgba(0,0,0,0.35), 0 1px 0 0 var(--color-shadow-btn)'
const KEYCAP_TRANSITION = 'transform var(--dur-tap) var(--ease-tap), box-shadow var(--dur-tap) var(--ease-tap), background var(--dur-tap) var(--ease-tap), border-color var(--dur-tap) var(--ease-tap)'

function ThemeRow({ label, isSelected, onClick, children }: { label: string; isSelected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 9px',
        background: isSelected ? 'color-mix(in srgb, var(--color-blue-bright) 14%, var(--color-bg-panel))' : 'transparent',
        border: isSelected ? '1.5px solid var(--color-blue-bright)' : '1.5px solid transparent',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        width: '100%', textAlign: 'left', transition: KEYCAP_TRANSITION,
        transform: isSelected ? 'translateY(1px)' : 'translateY(0)',
        boxShadow: isSelected ? KEYCAP_PRESSED_SHADOW : 'none',
      }}
      onMouseEnter={(e) => {
        if (isSelected) return
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--color-bg-panel)'
        el.style.boxShadow = KEYCAP_HOVER_SHADOW
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        if (isSelected) return
        const el = e.currentTarget as HTMLElement
        el.style.background = 'transparent'
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      {children}
      <span style={{ fontSize: 13, color: isSelected ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)', fontWeight: isSelected ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--color-blue-bright)', fontSize: 14, flexShrink: 0 }}>✓</span>}
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
        background: isSelected ? 'color-mix(in srgb, var(--color-blue-bright) 16%, var(--color-bg-panel))' : 'var(--color-bg-panel)',
        border: isSelected ? '1.5px solid var(--color-blue-bright)' : '1px solid var(--color-gray-border)',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: KEYCAP_TRANSITION,
        transform: isSelected ? 'translateY(2px)' : 'translateY(0)',
        boxShadow: isSelected ? KEYCAP_PRESSED_SHADOW : KEYCAP_IDLE_SHADOW,
      }}
      onMouseEnter={(e) => {
        if (isSelected) return
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-gray-muted)'
        el.style.boxShadow = KEYCAP_HOVER_SHADOW
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        if (isSelected) return
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-gray-border)'
        el.style.boxShadow = KEYCAP_IDLE_SHADOW
        el.style.transform = 'translateY(0)'
      }}
    >
      <img
        src={`https://lichess1.org/assets/piece/${PIECE_SETS[pieceSetKey]?.src ?? pieceSetKey}/bQ.svg`}
        style={PIECE_COLOR_FILTER[pieceSetKey] ? { filter: PIECE_COLOR_FILTER[pieceSetKey] } : undefined}
        width={32} height={32} alt={label}
        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
      />
      <span style={{ fontSize: 10, color: isSelected ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)', fontWeight: isSelected ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
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
        background: isSelected ? 'var(--color-blue-bright)' : 'var(--color-bg-panel)',
        border: isSelected ? '1.5px solid var(--color-blue-primary)' : '1px solid var(--color-gray-border)',
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        fontSize: 11, color: isSelected ? 'var(--color-text-on-light)' : 'var(--color-gray-muted)',
        fontWeight: isSelected ? 700 : 400,
        boxShadow: isSelected ? 'inset 0 2px 4px 0 rgba(0,0,0,0.25), 0 1px 0 0 var(--color-blue-primary)' : KEYCAP_IDLE_SHADOW,
        transform: isSelected ? 'translateY(2px)' : 'translateY(0)',
        transition: `${KEYCAP_TRANSITION}, color var(--dur-tap) var(--ease-tap)`,
      }}
      onMouseEnter={(e) => {
        if (isSelected) return
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-gray-muted)'
        el.style.boxShadow = KEYCAP_HOVER_SHADOW
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        if (isSelected) return
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--color-gray-border)'
        el.style.boxShadow = KEYCAP_IDLE_SHADOW
        el.style.transform = 'translateY(0)'
      }}
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
        padding: '11px 10px', margin: '0 -10px', borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', transition: 'background var(--dur-tap) var(--ease-tap)',
      }}
      onClick={() => onChange(!checked)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-panel)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div>
        <div style={{ fontSize: 13, color: 'var(--color-text-on-dark)', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--color-gray-muted)', marginTop: 1 }}>{description}</div>
      </div>
      {/* Trilho recessado (entalhe) — o polegar "pop up" da calha como uma peça física */}
      <div style={{
        width: 36, height: 20,
        background: checked ? 'color-mix(in srgb, var(--color-blue-bright) 55%, var(--color-bg-main))' : 'var(--color-bg-main)',
        border: '1px solid var(--color-gray-border)', borderRadius: 'var(--radius-sm)', position: 'relative',
        boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.45), inset 0 1px 0 0 rgba(0,0,0,0.3)',
        transition: 'background var(--dur-tap) var(--ease-tap)', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 17 : 2, width: 14, height: 14, borderRadius: '50%',
          background: checked ? 'var(--color-blue-light)' : 'var(--color-gray-muted)',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.3)',
          transition: 'left var(--dur-tap) var(--ease-tap), background var(--dur-tap) var(--ease-tap)',
        }} />
      </div>
    </div>
  )
}
