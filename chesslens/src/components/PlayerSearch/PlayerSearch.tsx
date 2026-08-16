import { useEffect, useRef, useState } from 'react'
import { usePlayerSearch } from '../../hooks/usePlayerSearch'
import { useRecentGames } from '../../hooks/useRecentGames'
import { useLichessSearch } from '../../hooks/useLichessSearch'
import { useLichessRecentGames } from '../../hooks/useLichessRecentGames'
import { PlayerCard } from './PlayerCard'
import { LichessPlayerCard } from './LichessPlayerCard'
import { StatsGrid } from './StatsGrid'
import { LichessStatsGrid } from './LichessStatsGrid'
import { RecentGames } from './RecentGames'
import { ChesscomMarkIcon, LichessMarkIcon } from '../PlatformIcons'

export type Platform = 'chesscom' | 'lichess'

const LAST_SEARCH_KEY = 'chesslens-last-player-search'
const LAST_PLATFORM_KEY = 'chesslens-last-platform'

const PLATFORM_META: Record<Platform, { label: string; placeholder: string; Icon: typeof ChesscomMarkIcon }> = {
  chesscom: { label: 'Chess.com', placeholder: 'Username do chess.com...', Icon: ChesscomMarkIcon },
  lichess: { label: 'Lichess', placeholder: 'Username do Lichess...', Icon: LichessMarkIcon },
}

interface PlayerSearchProps {
  open: boolean
  onClose: () => void
  initialPlatform?: Platform
  /** Chamado quando o usuário clica em "Analisar" numa partida recente — recebe o PGN completo. */
  onAnalyzeGame?: (pgn: string) => void
}

/** Modal de busca de jogador — chess.com ou Lichess, alternável por abas. Totalmente controlado pelo pai. */
export default function PlayerSearch({ open, onClose, initialPlatform, onAnalyzeGame }: PlayerSearchProps) {
  const [platform, setPlatform] = useState<Platform>(initialPlatform ?? 'chesscom')
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const chesscom = usePlayerSearch()
  const lichess = useLichessSearch()
  const chesscomGames = useRecentGames(chesscom.profile?.username ?? null)
  const lichessGames = useLichessRecentGames(lichess.profile?.username ?? null)

  const active = platform === 'chesscom' ? chesscom : lichess
  const games = platform === 'chesscom' ? chesscomGames : lichessGames
  const meta = PLATFORM_META[platform]

  // Ao abrir, sincroniza com a plataforma pedida (ex: card da home) e refoca o input.
  useEffect(() => {
    if (!open) return
    setPlatform(initialPlatform ?? (localStorage.getItem(LAST_PLATFORM_KEY) as Platform | null) ?? 'chesscom')
    const id = window.setTimeout(() => inputRef.current?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [open, initialPlatform])

  // Restaura o último username buscado pra essa plataforma quando ela fica ativa.
  useEffect(() => {
    if (!open) return
    const saved = localStorage.getItem(`${LAST_SEARCH_KEY}-${platform}`)
    if (saved && !active.profile) {
      setInput(saved)
      active.search(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, platform])

  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  if (!open) return null

  function runSearch() {
    const trimmed = input.trim()
    if (!trimmed) return
    active.search(trimmed)
    localStorage.setItem(`${LAST_SEARCH_KEY}-${platform}`, trimmed)
    localStorage.setItem(LAST_PLATFORM_KEY, platform)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSearch()
  }

  function handleAnalyze(pgn: string) {
    onAnalyzeGame?.(pgn)
    onClose()
  }

  function switchPlatform(p: Platform) {
    setPlatform(p)
    setInput('')
    localStorage.setItem(LAST_PLATFORM_KEY, p)
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  return (
    <div
      onClick={onClose}
      className="cl-fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 49,
        background: 'rgba(5,4,12,0.65)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Modal — para o clique não fechar ao interagir com o conteúdo */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="cl-modal-in cl-card"
        style={{
          width: 'min(880px, 100%)',
          maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header + abas + busca */}
        <div style={{
          padding: '22px 26px 18px',
          borderBottom: '1px solid var(--color-gray-border)',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Buscar Jogador</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>Perfil, ratings e partidas recentes</div>
            </div>
            <button
              onClick={onClose}
              className="cl-btn cl-btn-sm"
              style={{ color: 'var(--color-text-on-dark)', fontSize: 16, lineHeight: 1, padding: '8px 10px', flexShrink: 0 }}
            >
              ✕
            </button>
          </div>

          {/* Abas de plataforma */}
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
              const m = PLATFORM_META[p]
              const isActive = platform === p
              return (
                <button
                  key={p}
                  onClick={() => switchPlatform(p)}
                  className={`cl-btn cl-btn-sm${isActive ? ' cl-btn-selected' : ''}`}
                  style={{
                    flex: 1, gap: 8,
                    padding: '8px 0',
                    fontSize: 13.5,
                    color: isActive ? undefined : 'var(--color-text-on-dark)',
                  }}
                >
                  <m.Icon width={17} height={17} />
                  {m.label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={meta.placeholder}
              style={{
                flex: 1,
                padding: '11px 14px',
                fontSize: 14,
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-gray-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-on-light)',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px 0 rgba(28,25,22,0.18), inset 0 1px 0 0 rgba(28,25,22,0.1)',
              }}
            />
            <button
              onClick={runSearch}
              className="cl-btn cl-btn-accent"
              style={{ padding: '11px 20px', fontSize: 14, flexShrink: 0 }}
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 26px' }}>
          {active.loading && <LoadingSkeleton />}

          {!active.loading && active.error && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '56px 16px', textAlign: 'center',
            }}>
              <span style={{ fontSize: 36 }}>😕</span>
              <span style={{ fontSize: 15, color: 'var(--color-text-on-dark)', fontWeight: 700 }}>{active.error}</span>
              <span style={{ fontSize: 12.5, color: 'var(--color-gray-muted)' }}>Verifique o username e tente novamente.</span>
            </div>
          )}

          {!active.loading && !active.error && platform === 'chesscom' && chesscom.profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }} key={chesscom.profile.username}>
              <PlayerCard profile={chesscom.profile} />
              {chesscom.stats && (
                <section>
                  <SectionTitle>Ratings</SectionTitle>
                  <StatsGrid stats={chesscom.stats} />
                </section>
              )}
              <section>
                <SectionTitle>Partidas recentes</SectionTitle>
                <RecentGames games={games.games} loading={games.loading} onAnalyze={handleAnalyze} />
              </section>
            </div>
          )}

          {!active.loading && !active.error && platform === 'lichess' && lichess.profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }} key={lichess.profile.username}>
              <LichessPlayerCard profile={lichess.profile} totalGames={lichess.stats?.totalGames} />
              {lichess.stats && (
                <section>
                  <SectionTitle>Ratings</SectionTitle>
                  <LichessStatsGrid stats={lichess.stats} />
                </section>
              )}
              <section>
                <SectionTitle>Partidas recentes</SectionTitle>
                <RecentGames games={games.games} loading={games.loading} onAnalyze={handleAnalyze} />
              </section>
            </div>
          )}

          {!active.loading && !active.error && !active.profile && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '64px 16px', textAlign: 'center',
            }}>
              <meta.Icon width={36} height={36} style={{ opacity: 0.5, color: 'var(--color-gray-muted)' }} />
              <span style={{ fontSize: 13.5, color: 'var(--color-gray-muted)' }}>
                Busque um username do {meta.label} para ver o perfil, os ratings e as últimas partidas.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="cl-display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

function LoadingSkeleton() {
  const shimmer: React.CSSProperties = {
    background: 'var(--color-bg-panel)',
    borderRadius: 'var(--radius-sm)',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ ...shimmer, width: 116, height: 116, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...shimmer, width: 180, height: 22 }} />
          <div style={{ ...shimmer, width: 120, height: 12 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...shimmer, height: 100, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ ...shimmer, height: 56, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  )
}
