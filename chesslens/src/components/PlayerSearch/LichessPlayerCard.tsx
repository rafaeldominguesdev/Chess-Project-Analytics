import { useMemo } from 'react'
import type { LichessProfile } from '../../hooks/useLichessSearch'
import { countryCodeToFlagEmoji } from '../../utils/flags'
import { PremiumIcon } from '../PremiumIcon'
import { ExternalLinkIcon } from './icons'

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
  const days = Math.floor(diffSeconds / 86400)
  const months = Math.floor(diffSeconds / (86400 * 30))
  const years = Math.floor(diffSeconds / (86400 * 365))
  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor(diffSeconds / 60)
  let ago: string
  if (years >= 1) ago = `${years} ano${years > 1 ? 's' : ''}`
  else if (months >= 1) ago = `${months} ${months > 1 ? 'meses' : 'mês'}`
  else if (days >= 1) ago = `${days} dia${days > 1 ? 's' : ''}`
  else if (hours >= 1) ago = `${hours} hora${hours > 1 ? 's' : ''}`
  else ago = `${minutes} minuto${minutes !== 1 ? 's' : ''}`
  return { label: `Visto há ${ago}`, recent: false }
}

interface LichessPlayerCardProps {
  profile: LichessProfile
  totalGames?: number
}

/** Cabeçalho do perfil do Lichess — mesmo layout do card do chess.com, mas sem foto (a API não expõe avatar). */
export function LichessPlayerCard({ profile, totalGames }: LichessPlayerCardProps) {
  const bg = useMemo(() => hashColor(profile.username), [profile.username])
  const flag = countryCodeToFlagEmoji(profile.countryCode)
  const joinedLabel = formatJoined(profile.joined)
  const lastSeen = formatLastSeen(profile.lastOnline)
  const initial = profile.username.slice(0, 1).toUpperCase()

  return (
    <div className="cl-stat-pop" style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14,
      boxShadow: '0 10px 28px -10px rgba(0,0,0,0.4)',
      padding: '22px 22px 20px',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #2b2b2b, #6b6b6b)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
            background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 38,
            border: '3px solid var(--border)',
          }}
        >
          {initial}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            {profile.title && (
              <span style={{
                fontSize: 12, fontWeight: 800, color: '#fff',
                background: '#b5382e', padding: '2px 7px', borderRadius: 5,
              }}>
                {profile.title}
              </span>
            )}
            {profile.isPremium && <PremiumIcon size={19} />}
            <span className="cl-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', overflowWrap: 'anywhere' }}>{profile.username}</span>
            {flag && <span style={{ fontSize: 20 }}>{flag}</span>}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 2 }}>
            {joinedLabel && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{joinedLabel}</span>
            )}
            {!!totalGames && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                · <strong style={{ color: 'var(--text)' }}>{totalGames.toLocaleString('pt-BR')}</strong> partidas
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: lastSeen.recent ? '#3ecf6c' : 'var(--text-muted)', fontWeight: lastSeen.recent ? 700 : 400 }}>
              {lastSeen.recent && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3ecf6c', display: 'inline-block', boxShadow: '0 0 0 3px rgba(62,207,108,0.2)' }} />
              )}
              {lastSeen.label}
            </span>
            <a
              href={`https://lichess.org/@/${profile.username}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Ver perfil <ExternalLinkIcon width={11} height={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
