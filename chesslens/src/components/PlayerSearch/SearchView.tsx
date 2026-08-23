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

interface SearchViewProps {
  /** Plataforma pré-selecionada (ex: veio do card "Lichess" da Home). Sem isso, usa a última
   *  plataforma buscada (localStorage) ou Chess.com. */
  initialPlatform?: Platform
  /** Chamado quando o usuário clica em "Analisar" numa partida recente — recebe o PGN completo. */
  onAnalyzeGame: (pgn: string) => void
}

/**
 * Tela de "Analisar" — busca de jogador (Chess.com ou Lichess) como página própria, separada da
 * Home: abas de plataforma, campo de username e o resultado (perfil, ratings, partidas recentes)
 * logo abaixo. Sem imagem de fundo em tela cheia (isso é só da Home) — painel simples, igual ao
 * resto das telas de ferramenta do app (Tabuleiro, Definir Posição).
 */
export function SearchView({ initialPlatform, onAnalyzeGame }: SearchViewProps) {
  const [platform, setPlatform] = useState<Platform>(
    () => initialPlatform ?? (localStorage.getItem(LAST_PLATFORM_KEY) as Platform | null) ?? 'chesscom',
  )
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const chesscom = usePlayerSearch()
  const lichess = useLichessSearch()
  const chesscomGames = useRecentGames(chesscom.profile?.username ?? null)
  const lichessGames = useLichessRecentGames(lichess.profile?.username ?? null)

  const active = platform === 'chesscom' ? chesscom : lichess
  const meta = PLATFORM_META[platform]

  // Se uma plataforma específica foi pedida (card da Home), muda pra ela — mesmo que já tenha
  // uma busca em andamento pra outra plataforma.
  useEffect(() => {
    if (initialPlatform) setPlatform(initialPlatform)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlatform])

  // Restaura o último username buscado nessa plataforma sempre que ela fica ativa.
  useEffect(() => {
    const saved = localStorage.getItem(`${LAST_SEARCH_KEY}-${platform}`)
    if (saved && !active.profile) {
      setInput(saved)
      active.search(saved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform])

  useEffect(() => {
    window.setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

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

  function switchPlatform(p: Platform) {
    if (p === platform) return
    setPlatform(p)
    setInput('')
    localStorage.setItem(LAST_PLATFORM_KEY, p)
    window.setTimeout(() => inputRef.current?.focus(), 30)
  }

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px 40px' }}>
        <div>
          <div className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Buscar jogador</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>Perfil, ratings e partidas recentes</div>
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
                aria-pressed={isActive}
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
            aria-label={`Buscar jogador no ${meta.label}`}
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

        {active.loading && <LoadingSkeleton />}

        {!active.loading && active.error && (
          <div className="cl-card" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '48px 16px', textAlign: 'center',
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
              <RecentGames games={chesscomGames.games} loading={chesscomGames.loading} onAnalyze={onAnalyzeGame} />
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
              <RecentGames games={lichessGames.games} loading={lichessGames.loading} onAnalyze={onAnalyzeGame} />
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
        <div style={{ ...shimmer, width: 96, height: 96, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...shimmer, width: 180, height: 20 }} />
          <div style={{ ...shimmer, width: 120, height: 12 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
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
