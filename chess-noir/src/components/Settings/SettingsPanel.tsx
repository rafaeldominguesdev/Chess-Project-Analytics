import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES, CURATED_BOARD_THEMES, CURATED_PIECE_SETS, PIECE_SETS, PIECE_COLOR_FILTER } from '../../utils/boardThemes'
import type { PieceSetName, BoardSize, AnimationSpeed, SoundTheme } from '../../types/theme.types'
import { BoardIcon, PieceIcon, MotionIcon, SoundIcon, DataIcon, SearchIcon, HintIcon } from './icons'
import { SOUND_THEMES, playSound } from '../../utils/sounds'
import { exportAllToJson, importFromJson } from '../../persistence/exportImport'
import { MiniBoard } from '../Board/MiniBoard'

// Posição inicial só pra prévia ao vivo do tema/peças — não precisa do FEN completo
// (MiniBoard só lê a parte de posição).
const PREVIEW_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

const SIZE_LABELS: Record<BoardSize, string> = { small: 'Pequeno', medium: 'Médio', large: 'Grande', auto: 'Auto' }
const SPEED_LABELS: Record<AnimationSpeed, string> = { none: 'Off', fast: 'Rápida', normal: 'Normal', slow: 'Lenta' }

type CategoryId = 'board' | 'pieces' | 'movement' | 'sound' | 'data'

interface Category {
  id: CategoryId
  label: string
  description: string
  icon: (props: { size?: number }) => ReactNode
  keywords: string[]
  // Dica mostrada no card do painel lateral — voz casual de "coach" da capivara, igual CoachComment.
  tip: string
}

const CATEGORIES: Category[] = [
  {
    id: 'board', label: 'Tabuleiro', description: 'Cor, destaques e tamanho do tabuleiro.',
    icon: ({ size }) => <BoardIcon width={size} height={size} />,
    keywords: ['tema', 'cores', 'madeira', 'tamanho', 'grande', 'pequeno', 'coordenadas', 'setas', 'lances legais', 'última jogada'],
    tip: 'É onde você vai passar mais tempo olhando. Testa uns temas aqui do lado — a prévia troca na hora.',
  },
  {
    id: 'pieces', label: 'Peças', description: 'Conjunto de peças usado no tabuleiro.',
    icon: ({ size }) => <PieceIcon width={size} height={size} />,
    keywords: ['peças', 'conjunto', 'estilo'],
    tip: 'Clássica ou estilizada? Clica e olha a prévia. Eu curto a Alpha, mas gosto é gosto.',
  },
  {
    id: 'movement', label: 'Movimentos', description: 'Velocidade das jogadas na tela.',
    icon: ({ size }) => <MotionIcon width={size} height={size} />,
    keywords: ['velocidade', 'rápida', 'lenta', 'transição', 'animação'],
    tip: 'Animação lenta ajuda a enxergar o lance chegando. Rápida ou Off se você já tem o olho treinado.',
  },
  {
    id: 'sound', label: 'Sons', description: 'Efeitos sonoros ao mover as peças.',
    icon: ({ size }) => <SoundIcon width={size} height={size} />,
    keywords: ['som', 'volume', 'áudio', 'mudo'],
    tip: 'Som ligado dá aquele feedback de tabuleiro de verdade. Clica num tema pra ouvir antes de escolher.',
  },
  {
    id: 'data', label: 'Dados', description: 'Exportar ou importar seu histórico de partidas analisadas.',
    icon: ({ size }) => <DataIcon width={size} height={size} />,
    keywords: ['backup', 'exportar', 'importar', 'json', 'histórico', 'dados'],
    tip: 'Seu histórico fica só neste navegador. Exporta de vez em quando — perder partida analisada é dose.',
  },
]

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// ── Mini-preview do tabuleiro: grid 2x2 com as cores exatas do tema ──
function BoardPreview({ light, dark, image, isSelected }: { light: string; dark: string; image?: string; isSelected: boolean }) {
  return (
    <div style={{
      width: 48, height: 48,
      display: image ? 'block' : 'grid',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '1fr 1fr',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden',
      border: '1px solid var(--color-gray-border)',
      outline: isSelected ? '2px solid var(--color-blue-bright)' : '2px solid transparent',
      outlineOffset: 2,
      flexShrink: 0,
      transition: 'outline-color var(--dur-tap) var(--ease-tap)',
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
    setShowCoordinates, setCoordinatesOutside, setShowArrows, setShowLegalMoves, setShowLastMove,
    setBoardSize, setAnimationSpeed, setSoundEnabled, setSoundTheme, resetTheme,
  } = useTheme()
  const [category, setCategory] = useState<CategoryId>('board')
  const [query, setQuery] = useState('')
  const [dataStatus, setDataStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    const data = await exportAllToJson()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chess-noir-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDataStatus(`${data.games.length} partidas e ${data.analyses.length} análises exportadas.`)
  }

  const handleImportFile = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const result = await importFromJson(parsed)
      setDataStatus(
        `${result.importedGames} partidas e ${result.importedAnalyses} análises importadas`
        + (result.skipped > 0 ? `, ${result.skipped} item(ns) ignorado(s).` : '.'),
      )
    } catch {
      setDataStatus('Arquivo inválido — não foi possível ler como backup do Chess Noir.')
    }
  }

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
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,12,0.64)', backdropFilter: 'blur(6px)', zIndex: 49 }}
      />

      {/* Modal centralizado. A centralização (translate -50%/-50%) fica num wrapper separado
          da animação de entrada: a keyframe de cl-modal-in também anima "transform" e, no mesmo
          elemento, sobrescreveria o translate de centralização assim que a animação terminasse. */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 }}>
        <div
          className="cl-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label="Configurações"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 'min(1180px, 95vw)', height: 'min(760px, 90vh)',
            background: 'var(--color-bg-panel)',
            border: '1px solid var(--color-gray-border)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 28px 64px -18px rgba(0,0,0,0.72)',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-gray-border)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
            flexShrink: 0,
          }}>
            <div>
              <h2 className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)', letterSpacing: '-0.015em' }}>
                Configurações
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>
                Ajuste o tabuleiro, as peças e como a análise se comporta.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={resetTheme}
                className="cl-btn cl-btn-ghost"
                style={{ color: 'var(--color-gray-muted)', fontSize: 12.5, padding: '7px 12px', width: 'auto', height: 'auto' }}
              >
                Restaurar padrão
              </button>
              <button
                onClick={onClose}
                className="cl-btn cl-btn-sm"
                aria-label="Fechar configurações"
                style={{ color: 'var(--color-text-on-dark)', fontSize: 18, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Corpo: navegação + conteúdo + painel lateral de prévia */}
          <div className="cl-settings-body" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Navegação por categoria — vira uma barra horizontal rolável acima do conteúdo
                abaixo de 900px (ver .cl-settings-nav em index.css). */}
            <nav
              className="cl-settings-nav"
              aria-label="Categorias de configuração"
              style={{
                width: 208, flexShrink: 0,
                borderRight: '1px solid var(--color-gray-border)',
                padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12,
                overflowY: 'auto',
              }}
            >
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-muted)', display: 'flex' }}>
                  <SearchIcon width={15} height={15} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar"
                  aria-label="Buscar configurações"
                  style={{
                    width: '100%', padding: '9px 12px 9px 32px', fontSize: 13,
                    background: 'var(--color-bg-surface)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 'var(--radius-sm)',
                    boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.16)',
                    color: 'var(--color-text-on-light)', outline: 'none', fontFamily: 'var(--font-body)',
                  }}
                />
              </div>

              <div className="cl-settings-nav-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {visibleCategories.length === 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', padding: '10px 8px' }}>Nada encontrado.</div>
                )}
                {visibleCategories.map((c) => {
                  const isActive = active?.id === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={isActive ? 'cl-btn cl-btn-selected' : 'cl-btn cl-btn-ghost'}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, width: '100%',
                        padding: '9px 11px', fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                        color: isActive ? undefined : 'var(--color-gray-muted)',
                      }}
                    >
                      <span style={{ display: 'flex', flexShrink: 0, color: isActive ? 'var(--color-blue-bright)' : 'var(--color-gray-muted)' }}>
                        {c.icon({ size: 17 })}
                      </span>
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* Conteúdo da categoria selecionada */}
            <div className="settings-scroll cl-settings-main" style={{ flex: 1, overflowY: 'auto', padding: '24px 30px 36px', minWidth: 0 }}>
              {active && (
                <div style={{ marginBottom: 24 }}>
                  <h3 className="cl-display" style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-on-dark)', letterSpacing: '-0.01em' }}>
                    {active.label}
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 3, lineHeight: 1.5 }}>{active.description}</p>
                </div>
              )}

              {active?.id === 'board' && (
                <>
                  <Section label="Tema">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

                  <Section label="Tamanho do tabuleiro">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {(['small', 'medium', 'large', 'auto'] as const).map((size) => (
                        <SizeButton
                          key={size}
                          label={SIZE_LABELS[size]}
                          isSelected={theme.boardSize === size}
                          onClick={() => setBoardSize(size as BoardSize)}
                        />
                      ))}
                    </div>
                  </Section>

                  <Divider />

                  <Section label="Destaques no tabuleiro">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <Toggle label="Mostrar coordenadas" description="Letras e números nas bordas" checked={theme.showCoordinates} onChange={setShowCoordinates} />
                      <Toggle
                        label="Notação fora das casas"
                        description="Números e letras numa margem ao redor do tabuleiro, em vez de dentro das casas"
                        checked={theme.coordinatesOutside}
                        onChange={setCoordinatesOutside}
                        disabled={!theme.showCoordinates}
                      />
                      <Toggle label="Última jogada" description="Destaca as casas de origem e destino" checked={theme.showLastMove} onChange={setShowLastMove} />
                      <Toggle label="Setas de análise" description="Melhor lance do Stockfish" checked={theme.showArrows} onChange={setShowArrows} />
                      <Toggle label="Lances legais" description="Highlight ao clicar numa peça" checked={theme.showLegalMoves} onChange={setShowLegalMoves} />
                    </div>
                  </Section>
                </>
              )}

              {active?.id === 'pieces' && (
                <Section label="Conjunto de peças">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
              )}

              {active?.id === 'movement' && (
                <Section label="Velocidade de animação">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {(['none', 'fast', 'normal', 'slow'] as const).map((speed) => (
                      <SizeButton
                        key={speed}
                        label={SPEED_LABELS[speed]}
                        isSelected={theme.animationSpeed === speed}
                        onClick={() => setAnimationSpeed(speed as AnimationSpeed)}
                      />
                    ))}
                  </div>
                </Section>
              )}

              {active?.id === 'sound' && (
                <>
                  <Section label="Sons">
                    <Toggle label="Som" description="Efeito sonoro a cada lance" checked={theme.soundEnabled} onChange={setSoundEnabled} />
                  </Section>

                  <Divider />

                  <Section label="Tema do som">
                    <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: -4, marginBottom: 12, lineHeight: 1.5 }}>
                      Sons livres do lichess.org — os do chess.com são proprietários, não dá pra
                      reproduzir aqui. Clique pra ouvir e escolher.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {(Object.keys(SOUND_THEMES) as SoundTheme[]).map((key) => (
                        <SizeButton
                          key={key}
                          label={SOUND_THEMES[key]}
                          isSelected={theme.soundTheme === key}
                          onClick={() => {
                            setSoundTheme(key)
                            playSound('move', key)
                          }}
                        />
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {active?.id === 'data' && (
                <Section label="Backup do histórico">
                  <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: -4, marginBottom: 16, lineHeight: 1.5 }}>
                    Exporta as partidas e análises já salvas no seu navegador pra um arquivo JSON —
                    útil pra guardar antes de limpar os dados do navegador, ou levar pra outro
                    computador. O cache de posições (só desempenho, não é seu histórico) não entra
                    no arquivo.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={handleExport} className="cl-btn cl-btn-accent cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '9px 16px' }}>
                      Exportar dados
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="cl-btn cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '9px 16px' }}>
                      Importar dados
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) void handleImportFile(file)
                      }}
                    />
                  </div>
                  {dataStatus && (
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-on-dark)', marginTop: 14 }}>{dataStatus}</div>
                  )}
                </Section>
              )}
            </div>

            {/* Painel lateral fixo — prévia ao vivo + dica da capivara. Nunca fica vazio, então
                nenhuma aba parece "buraco" mesmo quando tem poucos controles. */}
            <SidePanel
              tip={active?.tip ?? CATEGORIES[0].tip}
              themeLabel={BOARD_THEMES[theme.boardTheme]?.label ?? theme.boardTheme}
              pieceLabel={PIECE_SETS[theme.pieceSet]?.label ?? theme.pieceSet}
              sizeLabel={SIZE_LABELS[theme.boardSize]}
              speedLabel={SPEED_LABELS[theme.animationSpeed]}
            />
          </div>
        </div>
      </div>
    </>
  )
}

// ── Sub-componentes internos ──────────────────────────────────────

// Painel lateral: MiniBoard já lê o tema atual sozinho (via useTheme) — qualquer escolha nas
// abas reflete aqui na hora. Abaixo do preview, um resumo das escolhas atuais e um card de dica
// por categoria (voz de "coach" da capivara no texto, sem o avatar redondo que o usuário achou feio).
function SidePanel({ tip, themeLabel, pieceLabel, sizeLabel, speedLabel }: {
  tip: string; themeLabel: string; pieceLabel: string; sizeLabel: string; speedLabel: string
}) {
  return (
    <aside
      className="cl-settings-side"
      style={{
        width: 316, flexShrink: 0,
        borderLeft: '1px solid var(--color-gray-border)',
        background: 'var(--color-bg-main)',
        padding: '24px 22px',
        display: 'flex', flexDirection: 'column', gap: 18,
        overflowY: 'auto',
      }}
    >
      <div>
        <div style={{
          padding: 16, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
          boxShadow: 'inset 0 2px 6px 0 rgba(0,0,0,0.35)',
          display: 'flex', justifyContent: 'center',
        }}>
          <MiniBoard fen={PREVIEW_FEN} size={236} />
        </div>
        <div style={{
          marginTop: 8, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: 'var(--color-gray-muted)', fontWeight: 700, textAlign: 'center',
        }}>
          Prévia ao vivo
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SummaryLine label="Tema" value={themeLabel} />
        <SummaryLine label="Peças" value={pieceLabel} />
        <SummaryLine label="Tamanho" value={sizeLabel} />
        <SummaryLine label="Animação" value={speedLabel} />
      </div>

      <div className="cl-card" style={{ display: 'flex', gap: 11, padding: 13, alignItems: 'flex-start', marginTop: 'auto' }}>
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          width: 30, height: 30, borderRadius: 'var(--radius-sm)',
          background: 'color-mix(in srgb, var(--color-blue-bright) 16%, var(--color-bg-panel))',
          color: 'var(--color-blue-bright)',
        }}>
          <HintIcon width={16} height={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cl-display" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-on-dark)', marginBottom: 3 }}>
            Dica
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.45 }}>{tip}</p>
        </div>
      </div>
    </aside>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '7px 0', borderBottom: '1px solid var(--color-gray-border)',
    }}>
      <span style={{ fontSize: 11.5, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-gray-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--color-text-on-dark)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="cl-display" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--color-gray-muted)',
        textTransform: 'uppercase', marginBottom: 14,
      }}>
        <span style={{ width: 3, height: 11, borderRadius: 2, background: 'var(--color-blue-bright)', flexShrink: 0 }} />
        {label}
      </div>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--color-gray-border)', margin: '26px 0' }} />
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
      aria-pressed={isSelected}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px',
        background: isSelected ? 'color-mix(in srgb, var(--color-blue-bright) 12%, var(--color-bg-panel))' : 'var(--color-bg-panel)',
        border: isSelected ? '1.5px solid var(--color-blue-bright)' : '1px solid var(--color-gray-border)',
        borderRadius: 'var(--radius-md)', cursor: 'pointer',
        width: '100%', textAlign: 'left', transition: KEYCAP_TRANSITION,
        transform: isSelected ? 'translateY(1px)' : 'translateY(0)',
        boxShadow: isSelected ? KEYCAP_PRESSED_SHADOW : 'none',
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
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      {children}
      <span style={{ fontSize: 14, color: isSelected ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)', fontWeight: isSelected ? 650 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {isSelected && <span style={{ marginLeft: 'auto', color: 'var(--color-blue-bright)', fontSize: 15, flexShrink: 0 }}>✓</span>}
    </button>
  )
}

function PieceSetButton({ label, pieceSetKey, isSelected, onClick }: { label: string; pieceSetKey: PieceSetName; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        padding: '14px 6px',
        background: isSelected ? 'color-mix(in srgb, var(--color-blue-bright) 16%, var(--color-bg-panel))' : 'var(--color-bg-panel)',
        border: isSelected ? '1.5px solid var(--color-blue-bright)' : '1px solid var(--color-gray-border)',
        borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: KEYCAP_TRANSITION,
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
        style={{ maxWidth: '100%', height: 'auto', ...(PIECE_COLOR_FILTER[pieceSetKey] ? { filter: PIECE_COLOR_FILTER[pieceSetKey] } : undefined) }}
        width={44} height={44} alt={label}
        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
      />
      <span style={{ fontSize: 12, color: isSelected ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)', fontWeight: isSelected ? 650 : 400, textAlign: 'center', lineHeight: 1.2 }}>
        {label}
      </span>
    </button>
  )
}

function SizeButton({ label, isSelected, onClick }: { label: string; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      style={{
        padding: '13px 6px',
        background: isSelected ? 'var(--color-blue-bright)' : 'var(--color-bg-panel)',
        border: isSelected ? '1.5px solid var(--color-blue-primary)' : '1px solid var(--color-gray-border)',
        borderRadius: 'var(--radius-md)', cursor: 'pointer',
        fontSize: 13, color: isSelected ? 'var(--color-text-on-light)' : 'var(--color-gray-muted)',
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

function Toggle({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { if (!disabled) onChange(!checked) }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        padding: '14px 12px', margin: '0 -12px', width: 'calc(100% + 24px)',
        borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent',
        textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
        borderTop: '1px solid var(--color-gray-border)',
        transition: 'background var(--dur-tap) var(--ease-tap)',
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-raised)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <span>
        <span style={{ display: 'block', fontSize: 14.5, color: 'var(--color-text-on-dark)', fontWeight: 600 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2, lineHeight: 1.45 }}>{description}</span>
      </span>
      {/* Trilho recessado (entalhe) — o polegar "pop up" da calha como uma peça física */}
      <span style={{
        width: 44, height: 24, flexShrink: 0,
        background: checked ? 'color-mix(in srgb, var(--color-blue-bright) 55%, var(--color-bg-main))' : 'var(--color-bg-main)',
        border: '1px solid var(--color-gray-border)', borderRadius: 'var(--radius-sm)', position: 'relative',
        boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.45), inset 0 1px 0 0 rgba(0,0,0,0.3)',
        transition: 'background var(--dur-tap) var(--ease-tap)',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 22 : 3, width: 16, height: 16, borderRadius: '50%',
          background: checked ? 'var(--color-blue-light)' : 'var(--color-gray-muted)',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.3)',
          transition: 'left var(--dur-tap) var(--ease-tap), background var(--dur-tap) var(--ease-tap)',
        }} />
      </span>
    </button>
  )
}
