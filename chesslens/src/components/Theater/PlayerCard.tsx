import { useMemo } from 'react'

interface PlayerCardProps {
  username: string
  rating: string
  color: 'white' | 'black'
  avatarUrl?: string | null
  title?: string | null
  isActive?: boolean
  size?: 'md' | 'lg'
  variant?: 'panel' | 'plain'
}

function hashColor(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
  const hue = Math.abs(h) % 360
  return `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 40) % 360},55%,35%))`
}

export function PlayerCard({
  username, rating, color, avatarUrl, title,
  isActive = false, size = 'lg', variant = 'panel',
}: PlayerCardProps) {
  const initials = username.slice(0, 2).toUpperCase()
  const bg = useMemo(() => hashColor(username), [username])

  const dim = size === 'lg' ? 52 : 40
  const nameSize = size === 'lg' ? 19 : 15
  const ratingSize = size === 'lg' ? 15 : 12

  const isPanel = variant === 'panel'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: isPanel ? '10px 16px' : 0,
        borderRadius: 12,
        background: isPanel
          ? (isActive ? 'linear-gradient(90deg, var(--surface2), var(--surface))' : 'var(--surface)')
          : 'transparent',
        border: isPanel ? `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}` : 'none',
        boxShadow: isPanel && isActive ? '0 0 0 1px var(--accent)' : 'none',
        transition: 'all 0.2s',
        width: '100%',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username}
            style={{ width: dim, height: dim, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.15)' }}
          />
        ) : (
          <div
            style={{
              width: dim, height: dim, borderRadius: 10,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: dim * 0.36,
              border: '2px solid rgba(255,255,255,0.15)',
            }}
          >
            {initials}
          </div>
        )}
        {/* Piece color indicator */}
        <div
          style={{
            position: 'absolute', bottom: -4, right: -4,
            width: 20, height: 20, borderRadius: '50%',
            background: color === 'white' ? '#f5f5f5' : '#1a1a1a',
            border: '2px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11,
            color: color === 'white' ? '#1a1a1a' : '#f5f5f5',
          }}
        >
          {color === 'white' ? '♔' : '♚'}
        </div>
      </div>

      {/* Name + rating */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title && (
            <span style={{
              fontSize: 11, fontWeight: 800, color: '#fff',
              background: '#b5382e', padding: '1px 5px', borderRadius: 4, flexShrink: 0,
            }}>
              {title}
            </span>
          )}
          <span style={{
            fontSize: nameSize, fontWeight: 700, color: 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {username}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: ratingSize, fontWeight: 700, color: 'var(--accent)',
            background: 'var(--surface2)', padding: '1px 8px', borderRadius: 6,
          }}>
            {rating && rating !== '?' ? rating : 'Unrated'}
          </span>
          {isActive && (
            <span style={{
              fontSize: 11, color: '#27ae60', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
              jogando
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
