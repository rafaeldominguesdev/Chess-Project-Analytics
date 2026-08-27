import { useMemo } from 'react'
import { countryCodeToFlagEmoji } from '../../utils/flags'
import { PremiumIcon, isPremiumStatus } from '../PremiumIcon'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

interface PlayerCardProps {
  username: string
  rating: string
  color: 'white' | 'black'
  avatarUrl?: string | null
  title?: string | null
  countryCode?: string | null
  status?: string | null
  isActive?: boolean
  size?: 'md' | 'lg'
  /** Precisão (%) calculada da partida até o momento — opcional, mostra um badge quando presente. */
  accuracy?: number
  /** Relógio (`H:MM:SS` cru do PGN) na posição atual da revisão — opcional, mostra um badge tipo
   *  chess.com quando presente. `null`/ausente quando a partida não tem esse dado. */
  clock?: string | null
}

/** "0:02:59.9" → "2:59" (ou "1:02:59" se passar de 1h) — sem casas decimais, igual chess.com. */
function formatClock(raw: string): string {
  const parts = raw.split(':').map(Number)
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0] ?? 0, parts[1] ?? 0]
  const totalSeconds = Math.max(0, Math.floor(h * 3600 + m * 60 + s))
  const hh = Math.floor(totalSeconds / 3600)
  const mm = Math.floor((totalSeconds % 3600) / 60)
  const ss = totalSeconds % 60
  const ssStr = String(ss).padStart(2, '0')
  return hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${ssStr}` : `${mm}:${ssStr}`
}

function hashColor(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
  const hue = Math.abs(h) % 360
  return `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 40) % 360},55%,35%))`
}

/** Cores do badge de precisão, em faixas parecidas com o "Game Review" do chess.com. */
function accuracyStyle(value: number): { bg: string; color: string } {
  if (value >= 90) return { bg: 'var(--color-blue-bright)', color: 'var(--color-text-on-light)' }
  if (value >= 70) return { bg: 'var(--color-bg-panel)', color: 'var(--color-text-on-dark)' }
  return { bg: 'color-mix(in srgb, var(--color-error) 25%, var(--color-bg-panel))', color: 'color-mix(in srgb, var(--color-error) 55%, white)' }
}

export function PlayerCard({
  username, rating, color, avatarUrl, title, countryCode, status,
  isActive = false, size = 'lg', accuracy, clock,
}: PlayerCardProps) {
  const initials = username.slice(0, 2).toUpperCase()
  const bg = useMemo(() => hashColor(username), [username])
  const flag = countryCodeToFlagEmoji(countryCode)
  const isPremium = isPremiumStatus(status)
  const hasAccuracy = typeof accuracy === 'number' && !Number.isNaN(accuracy)
  const reducedMotion = usePrefersReducedMotion()

  const dim = size === 'lg' ? 38 : 32
  const nameSize = size === 'lg' ? 14.5 : 13
  const ratingSize = size === 'lg' ? 12 : 11

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '2px 2px',
        width: '100%',
      }}
    >
      {/* Animação do pulso de "vez de jogar" — escopada aqui pra não mexer no index.css global. */}
      <style>{`
        @keyframes clPlayerTurnPulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-blue-bright) 55%, transparent); }
          50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-blue-bright) 0%, transparent); }
        }
      `}</style>

      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            style={{
              width: dim, height: dim, borderRadius: 'var(--radius-sm)', objectFit: 'cover',
              border: isActive ? '2px solid var(--color-blue-bright)' : '2px solid rgba(255,255,255,0.15)',
              transition: `border-color var(--dur-tap) var(--ease-tap)`,
            }}
          />
        ) : (
          <div
            style={{
              width: dim, height: dim, borderRadius: 'var(--radius-sm)',
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: dim * 0.36,
              border: isActive ? '2px solid var(--color-blue-bright)' : '2px solid rgba(255,255,255,0.15)',
              transition: `border-color var(--dur-tap) var(--ease-tap)`,
            }}
          >
            {initials}
          </div>
        )}
        {/* Piece color indicator */}
        <div
          style={{
            position: 'absolute', bottom: -3, right: -3,
            width: 15, height: 15, borderRadius: '50%',
            background: color === 'white' ? '#f5f5f5' : '#1a1a1a',
            border: '2px solid var(--color-bg-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8.5,
            color: color === 'white' ? '#1a1a1a' : '#f5f5f5',
          }}
        >
          {color === 'white' ? '♔' : '♚'}
        </div>
      </div>

      {/* Name + rating */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
        {title && (
          <span style={{
            fontSize: 10.5, fontWeight: 800, color: '#fff',
            background: '#b5382e', padding: '1px 5px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
          }}>
            {title}
          </span>
        )}
        {isPremium && <PremiumIcon size={13} />}
        <span style={{
          fontSize: nameSize, fontWeight: 700, color: 'var(--color-text-on-dark)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {username}
        </span>
        {flag && <span style={{ fontSize: nameSize, flexShrink: 0 }} title={countryCode ?? ''}>{flag}</span>}
        <span className="cl-mono" style={{
          fontSize: ratingSize, fontWeight: 700, color: 'var(--color-text-on-dark)',
          background: 'var(--color-bg-panel)', padding: '1px 7px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
        }}>
          {rating && rating !== '?' ? rating : 'Unrated'}
        </span>
        {hasAccuracy && (
          <span
            title="Precisão"
            className="cl-mono"
            style={{
              fontSize: ratingSize, fontWeight: 800, letterSpacing: -0.1,
              background: accuracyStyle(accuracy as number).bg,
              color: accuracyStyle(accuracy as number).color,
              padding: '1px 7px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
            }}
          >
            {(accuracy as number).toFixed(1)}%
          </span>
        )}
        {isActive && (
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--color-blue-bright)', display: 'inline-block', flexShrink: 0,
              ...(reducedMotion ? {} : { animation: 'clPlayerTurnPulse 1.6s ease-out infinite' }),
            }}
            title="Jogando"
          />
        )}
      </div>

      {/* Relógio — encostado na ponta direita da linha (igual chess.com), separado do grupo de
          nome/rating que pode quebrar linha em telas estreitas. */}
      {clock && (() => {
        const label = formatClock(clock)
        const lowTime = label.length <= 4 && Number(label.split(':')[0]) === 0 && Number(label.split(':')[1]) < 30
        return (
          <span
            className="cl-mono"
            title="Relógio nesse ponto da partida"
            style={{
              marginLeft: 'auto', flexShrink: 0,
              fontSize: size === 'lg' ? 20 : 19, fontWeight: 800, letterSpacing: -0.2,
              padding: '5px 12px', borderRadius: 'var(--radius-sm)',
              background: lowTime ? 'color-mix(in srgb, var(--color-error) 30%, var(--color-bg-panel))' : 'var(--color-bg-panel)',
              color: lowTime ? 'color-mix(in srgb, var(--color-error) 60%, white)' : 'var(--color-text-on-dark)',
              border: '1px solid var(--color-gray-border)',
            }}
          >
            {label}
          </span>
        )
      })()}
    </div>
  )
}
