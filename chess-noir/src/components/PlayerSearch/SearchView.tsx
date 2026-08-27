import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
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

const LAST_SEARCH_KEY = 'chessnoir-last-player-search'
const LAST_PLATFORM_KEY = 'chessnoir-last-platform'
const LAST_MODE_KEY = 'chessnoir-analyze-mode'

type Mode = 'search' | 'paste'

const PLATFORM_META: Record<Platform, { label: string; placeholder: string; Icon: typeof ChesscomMarkIcon }> = {
  chesscom: { label: 'Chess.com', placeholder: 'Username do chess.com...', Icon: ChesscomMarkIcon },
  lichess: { label: 'Lichess', placeholder: 'Username do Lichess...', Icon: LichessMarkIcon },
}

// Detecção do que foi colado na aba "Colar PGN/FEN" — heurística de texto, sem parsear de fato
// (o parse real é `chess.js` no submit). FEN: 8 grupos de peças/números separados por "/", cor
// e um separador logo depois. PGN: tag `[Header ...]` ou o padrão "1. e4" de numeração de lance.
type PasteKind = 'empty' | 'fen' | 'pgn' | 'unknown'
const FEN_RE = /^\s*([pnbrqkPNBRQK1-8]+\/){7}[pnbrqkPNBRQK1-8]+\s+[wbWB]\s/
const PGN_RE = /\[\s*\w+\s+"[^"]*"\s*\]|\b\d+\.\s*\S/

function detectPaste(text: string): PasteKind {
  const t = text.trim()
  if (!t) return 'empty'
  if (FEN_RE.test(t)) return 'fen'
  if (PGN_RE.test(t)) return 'pgn'
  return 'unknown'
}

interface SearchViewProps {
  /** Plataforma pré-selecionada (ex: veio do card "Lichess" da Home). Sem isso, usa a última
   *  plataforma buscada (localStorage) ou Chess.com. */
  initialPlatform?: Platform
  /** Chamado quando o usuário clica em "Analisar" numa partida recente — recebe o PGN completo. */
  onAnalyzeGame: (pgn: string, url: string, color: 'w' | 'b') => void
  /** Colar PGN cru — retorna `false` se o PGN for inválido (pra mostrar erro inline). */
  onAnalyzePastedPgn: (pgn: string, color: 'w' | 'b') => boolean
  /** Colar FEN — abre o Tabuleiro de análise livre nessa posição (FEN já validado aqui). */
  onOpenFen: (fen: string) => void
}

/**
 * Tela de "Analisar" — dois modos numa aba só: buscar jogador (Chess.com ou Lichess) e ver
 * perfil/ratings/partidas recentes, OU colar um PGN cru (vai direto pra Revisão) / um FEN (abre
 * no Tabuleiro de análise). Sem imagem de fundo em tela cheia (isso é só da Home) — painel
 * simples, igual ao resto das telas de ferramenta do app (Tabuleiro, Definir Posição).
 */
export function SearchView({ initialPlatform, onAnalyzeGame, onAnalyzePastedPgn, onOpenFen }: SearchViewProps) {
  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(LAST_MODE_KEY) as Mode | null) ?? 'search',
  )
  const [platform, setPlatform] = useState<Platform>(
    () => initialPlatform ?? (localStorage.getItem(LAST_PLATFORM_KEY) as Platform | null) ?? 'chesscom',
  )
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Aba "Colar PGN/FEN"
  const [paste, setPaste] = useState('')
  const [pasteColor, setPasteColor] = useState<'w' | 'b'>('w')
  const [pasteError, setPasteError] = useState<string | null>(null)
  const pasteKind = detectPaste(paste)

  const chesscom = usePlayerSearch()
  const lichess = useLichessSearch()
  const chesscomGames = useRecentGames(chesscom.profile?.username ?? null)
  const lichessGames = useLichessRecentGames(lichess.profile?.username ?? null)

  const active = platform === 'chesscom' ? chesscom : lichess
  const meta = PLATFORM_META[platform]

  // Se uma plataforma específica foi pedida (card da Home), muda pra ela — mesmo que já tenha
  // uma busca em andamento pra outra plataforma. Também volta pro modo de busca (o card da Home
  // é sempre "buscar jogador nessa plataforma").
  useEffect(() => {
    if (initialPlatform) {
      setPlatform(initialPlatform)
      setMode('search')
    }
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
    if (mode === 'search') window.setTimeout(() => inputRef.current?.focus(), 60)
  }, [mode])

  function switchMode(m: Mode) {
    if (m === mode) return
    setMode(m)
    setPasteError(null)
    localStorage.setItem(LAST_MODE_KEY, m)
  }

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

  function submitPaste() {
    setPasteError(null)
    const text = paste.trim()
    if (pasteKind === 'fen') {
      try {
        new Chess(text)
      } catch {
        setPasteError('FEN inválido. Confira a notação e tente de novo.')
        return
      }
      onOpenFen(text)
      return
    }
    if (pasteKind === 'pgn') {
      const ok = onAnalyzePastedPgn(text, pasteColor)
      if (!ok) setPasteError('PGN inválido. Confira o formato e tente de novo.')
      return
    }
  }

  const pasteHint =
    pasteKind === 'fen' ? 'Detectado: posição FEN'
    : pasteKind === 'pgn' ? 'Detectado: PGN de partida'
    : pasteKind === 'unknown' ? 'Isso não parece um PGN nem um FEN'
    : 'Cole um PGN de partida ou um FEN de posição'

  const pasteBtnLabel = pasteKind === 'fen' ? 'Abrir no tabuleiro' : 'Revisar partida'

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px 40px' }}>
        <div>
          <div className="cl-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Analisar</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>Busque um jogador ou cole um PGN / FEN</div>
        </div>

        {/* Alterna entre buscar perfil de jogador e colar PGN/FEN — mesma cápsula segmentada das
            abas de plataforma logo abaixo. */}
        <div className="cl-inset cl-segmented" style={{ display: 'inline-flex', padding: 4, gap: 4, alignSelf: 'flex-start' }}>
          {([['search', 'Buscar jogador'], ['paste', 'Colar PGN/FEN']] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              aria-pressed={mode === m}
              className={`cl-btn cl-btn-sm${mode === m ? ' cl-btn-selected' : ''}`}
              style={{ width: 'auto', height: 'auto', padding: '8px 16px', fontSize: 13.5, color: mode === m ? undefined : 'var(--color-text-on-dark)' }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'search' && (
          <>
            {/* Abas de plataforma (cápsula) + busca numa linha só — antes eram 2 linhas separadas;
                colapsadas pedido direto ("estilo apple design", controles mais compactos/deliberados
                em vez de gastar ritmo vertical com 2 fileiras de utilidade). Quebra pra 2 linhas
                sozinha em tela estreita (`flexWrap`). */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div className="cl-inset cl-segmented" style={{ display: 'inline-flex', padding: 4, gap: 4, flexShrink: 0 }}>
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
                        width: 'auto', height: 'auto', gap: 8,
                        padding: '8px 16px',
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

              <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 220 }}>
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

            {/* Espaçamento por agrupamento, não uniforme (pedido direto: "mude a posição das coisas",
                estilo apple) — perfil+ratings ficam com gap curto entre si (uma identidade só, o
                grid de ratings lê como extensão natural do cabeçalho, sem precisar de rótulo "RATINGS"
                em maiúsculo); "Partidas recentes" ganha mais respiro antes (categoria de conteúdo
                diferente — lista, não resumo — mantém o próprio título, que aqui ajuda de verdade). */}
            {!active.loading && !active.error && platform === 'chesscom' && chesscom.profile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} key={chesscom.profile.username}>
                <PlayerCard profile={chesscom.profile} />
                {chesscom.stats && <StatsGrid stats={chesscom.stats} />}
                <section style={{ marginTop: 20 }}>
                  <SectionTitle>Partidas recentes</SectionTitle>
                  <RecentGames games={chesscomGames.games} loading={chesscomGames.loading} onAnalyze={onAnalyzeGame} />
                </section>
              </div>
            )}

            {!active.loading && !active.error && platform === 'lichess' && lichess.profile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} key={lichess.profile.username}>
                <LichessPlayerCard profile={lichess.profile} totalGames={lichess.stats?.totalGames} />
                {lichess.stats && <LichessStatsGrid stats={lichess.stats} />}
                <section style={{ marginTop: 20 }}>
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
          </>
        )}

        {mode === 'paste' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <textarea
              value={paste}
              onChange={(e) => { setPaste(e.target.value); setPasteError(null) }}
              placeholder={'Cole aqui o PGN da partida (com ou sem cabeçalho) ou um FEN.\n\nEx.: 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...\nEx.: rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2'}
              className="cl-mono"
              aria-label="Colar PGN ou FEN"
              spellCheck={false}
              style={{
                width: '100%', minHeight: 170, resize: 'vertical',
                padding: '12px 14px',
                fontSize: 13, lineHeight: 1.6,
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-gray-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-on-light)',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px 0 rgba(28,25,22,0.18), inset 0 1px 0 0 rgba(28,25,22,0.1)',
              }}
            />

            <div style={{ fontSize: 12, color: pasteKind === 'unknown' ? 'var(--color-error)' : 'var(--color-gray-muted)' }}>
              {pasteHint}
            </div>

            {pasteKind === 'pgn' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: 'var(--color-gray-muted)' }}>Ver o tabuleiro como</span>
                <div className="cl-inset cl-segmented" style={{ display: 'inline-flex', padding: 4, gap: 4 }}>
                  {([['w', 'Brancas'], ['b', 'Pretas']] as ['w' | 'b', string][]).map(([c, label]) => (
                    <button
                      key={c}
                      onClick={() => setPasteColor(c)}
                      aria-pressed={pasteColor === c}
                      className={`cl-btn cl-btn-sm${pasteColor === c ? ' cl-btn-selected' : ''}`}
                      style={{ width: 'auto', height: 'auto', padding: '6px 14px', fontSize: 13, color: pasteColor === c ? undefined : 'var(--color-text-on-dark)' }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pasteError && (
              <div className="cl-card" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '20px 16px', textAlign: 'center',
              }}>
                <span style={{ fontSize: 28 }}>😕</span>
                <span style={{ fontSize: 13.5, color: 'var(--color-text-on-dark)', fontWeight: 700 }}>{pasteError}</span>
              </div>
            )}

            <button
              onClick={submitPaste}
              disabled={pasteKind === 'empty' || pasteKind === 'unknown'}
              className="cl-btn cl-btn-accent"
              style={{
                padding: '11px 20px', fontSize: 14, alignSelf: 'flex-start',
                opacity: pasteKind === 'empty' || pasteKind === 'unknown' ? 0.5 : 1,
                cursor: pasteKind === 'empty' || pasteKind === 'unknown' ? 'not-allowed' : 'pointer',
              }}
            >
              {pasteBtnLabel}
            </button>
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
      <div className="cl-profile-header">
        <div className="cl-profile-avatar" style={{ ...shimmer, borderRadius: '50%', flexShrink: 0 }} />
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
