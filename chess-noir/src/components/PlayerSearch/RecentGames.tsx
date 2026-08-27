import { useState } from 'react'
import type { RecentGame } from '../../hooks/useRecentGames'
import { TIME_CLASS_META } from './StatsGrid'
import { AnalyzeIcon, ExternalLinkIcon, VariantTimeIcon } from './icons'

const OUTCOME_META: Record<RecentGame['outcome'], { label: string; color: string }> = {
  win: { label: 'Vitória', color: 'var(--color-success)' },
  draw: { label: 'Empate', color: 'var(--color-draw)' },
  loss: { label: 'Derrota', color: 'var(--color-error)' },
}

function formatWhen(endTime: number): string {
  const diff = Date.now() / 1000 - endTime
  const days = Math.floor(diff / 86400)
  if (days <= 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 30) return `${days} dias atrás`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ${months > 1 ? 'meses' : 'mês'} atrás`
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(endTime * 1000))
}

// Lista "todas as partidas" continua mostrando só as primeiras (comportamento de sempre) mesmo
// com o POOL de busca bem maior agora (`useRecentGames.ts`/`useLichessRecentGames.ts`, pra dar
// conta das abas por modo abaixo) — sem esse teto ela viraria uma lista de até 60 linhas.
const FLAT_LIST_LIMIT = 8

// Pedido direto do usuário: "quero ultimas 5 de cada modo rapida bliz bullet" — 3 modos
// rastreados. Depois de 2 rodadas rejeitadas (3 fileiras empilhadas, ladrilhos novos), virou
// abas em cápsula + reaproveita a MESMA linha da lista "Todas" — ver `ModeTabs`/`GameRow` abaixo.
const TRACKED_MODE_LABELS = ['Bullet', 'Blitz', 'Rápida']
const GAMES_PER_MODE = 5

interface RecentGamesProps {
  games: RecentGame[]
  loading: boolean
  onAnalyze: (pgn: string, url: string, color: 'w' | 'b') => void
}

export function RecentGames({ games, loading, onAnalyze }: RecentGamesProps) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ height: 56, borderRadius: 'var(--radius-md)', background: 'var(--color-bg-panel)', opacity: 0.6 - i * 0.08 }} />
        ))}
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
        Nenhuma partida recente encontrada.
      </div>
    )
  }

  const flatList = games.slice(0, FLAT_LIST_LIMIT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ModeTabs games={games} onAnalyze={onAnalyze} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Todas
        </div>
        {flatList.map((g, i) => (
          <GameRow key={g.url + i} game={g} index={i} onAnalyze={onAnalyze} />
        ))}
      </div>
    </div>
  )
}

/** Abas em cápsula (reaproveita `.cl-inset`/`.cl-segmented`, já usado no seletor de plataforma em
 *  `SearchView.tsx` e no botão "Ver perfil" de `PlayerCard.tsx`) — 1 lista visível por vez em vez
 *  de 3 fileiras sempre empilhadas (rejeitado 2x: "muito empilhado", "não gosto de repetir 3x").
 *  Só mostra aba de modo que o jogador realmente tem no lote buscado. Aba inicial: o modo da
 *  partida MAIS recente dele entre os 3 rastreados (não uma ordem fixa arbitrária) — cai pro
 *  primeiro modo disponível se a partida mais recente for de um modo não rastreado (ex: Daily). */
function ModeTabs({ games, onAnalyze }: Pick<RecentGamesProps, 'games' | 'onAnalyze'>) {
  const byMode = TRACKED_MODE_LABELS
    .map((label) => ({
      label,
      games: games.filter((g) => TIME_CLASS_META[g.timeClass]?.label === label).slice(0, GAMES_PER_MODE),
    }))
    .filter((group) => group.games.length > 0)

  const mostRecentTrackedLabel = games
    .map((g) => TIME_CLASS_META[g.timeClass]?.label)
    .find((label) => label && TRACKED_MODE_LABELS.includes(label))

  const [active, setActive] = useState(mostRecentTrackedLabel ?? byMode[0]?.label)

  if (byMode.length === 0) return null

  const activeGroup = byMode.find((group) => group.label === active) ?? byMode[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="cl-inset cl-segmented" style={{ display: 'inline-flex', padding: 4, gap: 4, alignSelf: 'flex-start' }}>
        {byMode.map((group) => {
          const meta = TIME_CLASS_META[group.games[0].timeClass]
          const Icon = meta?.icon ?? VariantTimeIcon
          const isActive = activeGroup.label === group.label
          return (
            <button
              key={group.label}
              onClick={() => setActive(group.label)}
              aria-pressed={isActive}
              className={`cl-btn cl-btn-sm${isActive ? ' cl-btn-selected' : ''}`}
              style={{ width: 'auto', height: 'auto', gap: 6, padding: '7px 14px', fontSize: 12.5 }}
            >
              <Icon width={15} height={15} />
              {group.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {activeGroup.games.map((g, i) => (
          <GameRow key={g.url} game={g} index={i} onAnalyze={onAnalyze} />
        ))}
      </div>
    </div>
  )
}

/** Linha de uma partida — mesmo visual usado tanto na aba do modo ativo quanto na lista "Todas"
 *  (nenhuma diferença de estilo entre os dois lugares, de propósito: esse acabamento já estava
 *  aprovado, extrair pra reuso em vez de inventar um card novo é o que resolve "ladrilhos feios"
 *  das 2 rodadas anteriores). */
function GameRow({ game: g, index: i, onAnalyze }: { game: RecentGame; index: number; onAnalyze: RecentGamesProps['onAnalyze'] }) {
  const meta = TIME_CLASS_META[g.timeClass]
  const Icon = meta?.icon ?? VariantTimeIcon
  const accent = meta?.accent ?? 'var(--color-gray-muted)'
  const outcome = OUTCOME_META[g.outcome]

  return (
    <div
      className="cl-row-in cl-game-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 'var(--radius-md)',
        background: 'var(--color-bg-panel)',
        border: '1px solid var(--color-gray-border)',
        animationDelay: `${i * 35}ms`,
      }}
    >
      <div style={{
        width: 4, alignSelf: 'stretch', borderRadius: 2, background: outcome.color, flexShrink: 0,
      }} />

      <Icon width={32} height={32} style={{ color: accent, flexShrink: 0 }} />

      <span
        title={g.color === 'white' ? 'Jogou de brancas' : 'Jogou de pretas'}
        style={{
          width: 15, height: 15, borderRadius: 'var(--radius-sm)', flexShrink: 0,
          background: g.color === 'white' ? '#f5f5f5' : '#1a1a1a',
          border: '1.5px solid var(--color-gray-border)',
        }}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span title={g.opponent} style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            vs {g.opponent}
          </span>
          {g.opponentRating !== null && (
            <span className="cl-mono" style={{ fontSize: 11, color: 'var(--color-gray-muted)', flexShrink: 0 }}>({g.opponentRating})</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-gray-muted)' }}>
          {formatWhen(g.endTime)}{g.rated ? '' : ' · casual'}
        </div>
      </div>

      {/* Trio agrupado (não solto na linha) — abaixo de 480px (ver .cl-game-row-meta em
          index.css) vira uma 2ª linha própria, alinhada à direita. Sozinho na linha
          principal, esse trio de larguras fixas (rótulo de resultado + ícone de link +
          botão "Analisar") não deixava quase nada pra coluna de nome (`flex:1 minWidth:0`
          logo acima) numa tela de ~390px — reproduzido ao vivo: nome de oponente real
          truncando pra "V..". */}
      <div className="cl-game-row-meta" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: outcome.color, flexShrink: 0 }}>{outcome.label}</span>

        <a
          href={g.url}
          target="_blank"
          rel="noreferrer"
          title="Ver partida original"
          aria-label="Ver partida original (abre em nova aba)"
          style={{ color: 'var(--color-gray-muted)', display: 'flex', flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLinkIcon width={14} height={14} />
        </a>

        <button
          onClick={() => onAnalyze(g.pgn, g.url, g.color === 'white' ? 'w' : 'b')}
          title="Analisar esta partida"
          className="cl-btn cl-btn-accent cl-btn-sm"
          style={{ gap: 5, flexShrink: 0, width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11.5, whiteSpace: 'nowrap' }}
        >
          <AnalyzeIcon width={13} height={13} />
          Analisar
        </button>
      </div>
    </div>
  )
}
