import { useMemo } from 'react'
import type { ChessComProfile } from '../../hooks/usePlayerSearch'
import { countryCodeToFlagEmoji, countryUrlToCode } from '../../utils/flags'

function hashColor(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
  const hue = Math.abs(h) % 360
  return `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 40) % 360},55%,35%))`
}

function formatJoined(joined: number | null): string | null {
  if (!joined) return null
  const date = new Date(joined * 1000)
  const formatted = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return `Desde ${formatted}`
}

function formatLastSeen(lastOnline: number | null): { label: string; recent: boolean } {
  if (!lastOnline) return { label: 'Sem informação de atividade', recent: false }

  const diffSeconds = Date.now() / 1000 - lastOnline
  if (diffSeconds < 300) return { label: 'Ativo recentemente', recent: true }

  const minutes = Math.floor(diffSeconds / 60)
  const hours = Math.floor(diffSeconds / 3600)
  const days = Math.floor(diffSeconds / 86400)
  const months = Math.floor(diffSeconds / (86400 * 30))
  const years = Math.floor(diffSeconds / (86400 * 365))

  let ago: string
  if (years >= 1) ago = `${years} ano${years > 1 ? 's' : ''}`
  else if (months >= 1) ago = `${months} ${months > 1 ? 'meses' : 'mês'}`
  else if (days >= 1) ago = `${days} dia${days > 1 ? 's' : ''}`
  else if (hours >= 1) ago = `${hours} hora${hours > 1 ? 's' : ''}`
  else ago = `${minutes} minuto${minutes !== 1 ? 's' : ''}`

  return { label: `Visto há ${ago}`, recent: false }
}

/** Cabeçalho do perfil: avatar, username, título, bandeira, data de cadastro e atividade. */
export function PlayerCard({ profile }: { profile: ChessComProfile }) {
  const bg = useMemo(() => hashColor(profile.username), [profile.username])
  const flag = countryCodeToFlagEmoji(countryUrlToCode(profile.country))
  const joinedLabel = formatJoined(profile.joined)
  const lastSeen = formatLastSeen(profile.last_online)
  const initial = profile.username.slice(0, 1).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0 4px' }}>
      {profile.avatar ? (
        <img
          src={profile.avatar}
          alt={profile.username}
          style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }}
        />
      ) : (
        <div
          style={{
            width: 96, height: 96, borderRadius: '50%',
            background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 36,
            border: '3px solid var(--border)',
          }}
        >
          {initial}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {profile.title && (
          <span style={{
            fontSize: 12, fontWeight: 800, color: '#fff',
            background: '#b5382e', padding: '2px 6px', borderRadius: 4,
          }}>
            {profile.title}
          </span>
        )}
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{profile.username}</span>
        {flag && <span style={{ fontSize: 20 }}>{flag}</span>}
      </div>

      {profile.name && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>{profile.name}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {joinedLabel && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{joinedLabel}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: lastSeen.recent ? '#27ae60' : 'var(--text-muted)', fontWeight: lastSeen.recent ? 600 : 400 }}>
          {lastSeen.recent && (
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#27ae60', display: 'inline-block' }} />
          )}
          {lastSeen.label}
        </div>
      </div>
    </div>
  )
}
