import { useMemo } from 'react'
import { countryCodeToFlagEmoji } from '../../utils/flags'
import { PremiumIcon, isPremiumStatus } from '../PremiumIcon'

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
}

function hashColor(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
  const hue = Math.abs(h) % 360
  return `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 40) % 360},55%,35%))`
}

/** Cores do badge de precisão, em faixas parecidas com o "Game Review" do chess.com. */
function accuracyStyle(value: number): { bg: string; color: string } {
  if (value >= 90) return { bg: 'var(--accent)', color: 'var(--on-accent, #fff)' }
  if (value >= 70) return { bg: 'var(--surface2)', color: 'var(--text)' }
  return { bg: '#5E1A1A', color: '#F5D6D6' }
}

export function PlayerCard({
  username, rating, color, avatarUrl, title, countryCode, status,
  isActive = false, size = 'lg', accuracy,
}: PlayerCardProps) {
  const initials = username.slice(0, 2).toUpperCase()
  const bg = useMemo(() => hashColor(username), [username])
  const flag = countryCodeToFlagEmoji(countryCode)
  const isPremium = isPremiumStatus(status)
  const hasAccuracy = typeof accuracy === 'number' && !Number.isNaN(accuracy)

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
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 55%, transparent); }
          50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 0%, transparent); }
        }
      `}</style>

      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            style={{
              width: dim, height: dim, borderRadius: 7, objectFit: 'cover',
              border: isActive ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.15)',
              transition: 'border-color 0.2s ease',
            }}
          />
        ) : (
          <div
            style={{
              width: dim, height: dim, borderRadius: 7,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: dim * 0.36,
              border: isActive ? '2px solid var(--accent)' : '2px solid rgba(255,255,255,0.15)',
              transition: 'border-color 0.2s ease',
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
            border: '2px solid var(--bg)',
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
            background: '#b5382e', padding: '1px 5px', borderRadius: 4, flexShrink: 0,
          }}>
            {title}
          </span>
        )}
        {isPremium && <PremiumIcon size={13} />}
        <span style={{
          fontSize: nameSize, fontWeight: 700, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {username}
        </span>
        {flag && <span style={{ fontSize: nameSize, flexShrink: 0 }} title={countryCode ?? ''}>{flag}</span>}
        <span style={{
          fontSize: ratingSize, fontWeight: 700, color: 'var(--text)',
          background: 'var(--surface2)', padding: '1px 7px', borderRadius: 5, flexShrink: 0,
        }}>
          {rating && rating !== '?' ? rating : 'Unrated'}
        </span>
        {hasAccuracy && (
          <span
            title="Precisão"
            style={{
              fontSize: ratingSize, fontWeight: 800, letterSpacing: -0.1,
              background: accuracyStyle(accuracy as number).bg,
              color: accuracyStyle(accuracy as number).color,
              padding: '1px 7px', borderRadius: 5, flexShrink: 0,
            }}
          >
            {(accuracy as number).toFixed(1)}%
          </span>
        )}
        {isActive && (
          <span
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--accent)', display: 'inline-block', flexShrink: 0,
              animation: 'clPlayerTurnPulse 1.6s ease-out infinite',
            }}
            title="Jogando"
          />
        )}
      </div>
    </div>
  )
}
