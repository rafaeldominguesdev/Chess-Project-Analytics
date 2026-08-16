import { useCallback, useEffect, useRef, useState } from 'react'

export interface LichessProfile {
  username: string
  title: string | null
  isPremium: boolean // "patron" — apoiador do Lichess
  countryCode: string | null
  joined: number | null // unix seconds
  lastOnline: number | null // unix seconds
}

export interface LichessPerf {
  games: number
  rating: number
}

export interface LichessStats {
  bullet?: LichessPerf
  blitz?: LichessPerf
  rapid?: LichessPerf
  classical?: LichessPerf
  totalGames: number
}

interface CacheEntry {
  profile: LichessProfile
  stats: LichessStats
}

const cache = new Map<string, CacheEntry>()

async function fetchPlayer(username: string): Promise<CacheEntry> {
  const key = username.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const res = await fetch(`https://lichess.org/api/user/${key}`, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('not found')
  const data = await res.json()

  const profile: LichessProfile = {
    username: data.username ?? key,
    title: data.title ?? null,
    isPremium: !!data.patron,
    countryCode: data.profile?.flag ?? null,
    joined: data.createdAt ? Math.floor(data.createdAt / 1000) : null,
    lastOnline: data.seenAt ? Math.floor(data.seenAt / 1000) : null,
  }

  const perfs = data.perfs ?? {}
  const stats: LichessStats = {
    bullet: perfs.bullet ? { games: perfs.bullet.games, rating: perfs.bullet.rating } : undefined,
    blitz: perfs.blitz ? { games: perfs.blitz.games, rating: perfs.blitz.rating } : undefined,
    rapid: perfs.rapid ? { games: perfs.rapid.games, rating: perfs.rapid.rating } : undefined,
    classical: perfs.classical ? { games: perfs.classical.games, rating: perfs.classical.rating } : undefined,
    totalGames: data.count?.all ?? 0,
  }

  const entry: CacheEntry = { profile, stats }
  cache.set(key, entry)
  return entry
}

/** Busca um jogador do Lichess (perfil + ratings) via API pública. */
export function useLichessSearch() {
  const [profile, setProfile] = useState<LichessProfile | null>(null)
  const [stats, setStats] = useState<LichessStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef<(() => void) | null>(null)

  const search = useCallback((username: string) => {
    const trimmed = username.trim()
    if (!trimmed) return

    if (cancelledRef.current) cancelledRef.current()
    let cancelled = false
    cancelledRef.current = () => { cancelled = true }

    setLoading(true)
    setError(null)

    fetchPlayer(trimmed)
      .then(({ profile: p, stats: s }) => {
        if (cancelled) return
        setProfile(p)
        setStats(s)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setProfile(null)
        setStats(null)
        setError('Jogador não encontrado')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    return () => {
      if (cancelledRef.current) cancelledRef.current()
    }
  }, [])

  return { profile, stats, loading, error, search }
}
