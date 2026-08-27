import { useCallback, useEffect, useRef, useState } from 'react'

/** Perfil público de um jogador do chess.com (GET /pub/player/{username}). */
export interface ChessComProfile {
  username: string
  avatar: string | null
  name: string | null
  title: string | null
  country: string | null
  location: string | null
  joined: number | null
  last_online: number | null
  followers: number | null
  is_streamer: boolean
  status: string | null
}

/** Um bloco de estatísticas de uma modalidade (ex: chess_blitz). */
export interface ChessComTimeClassStat {
  last?: { rating: number; date: number }
  best?: { rating: number; date: number; game?: string }
  record?: { win: number; loss: number; draw: number }
}

/** Estatísticas por modalidade (GET /pub/player/{username}/stats). */
export interface ChessComStats {
  chess_bullet?: ChessComTimeClassStat
  chess_blitz?: ChessComTimeClassStat
  chess_rapid?: ChessComTimeClassStat
  chess_daily?: ChessComTimeClassStat
  chess960_daily?: ChessComTimeClassStat
  chess_daily960?: ChessComTimeClassStat
  [key: string]: ChessComTimeClassStat | undefined
}

interface CacheEntry {
  profile: ChessComProfile
  stats: ChessComStats
}

const cache = new Map<string, CacheEntry>()

async function fetchPlayer(username: string): Promise<CacheEntry> {
  const key = username.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const [profileRes, statsRes] = await Promise.all([
    fetch(`https://api.chess.com/pub/player/${key}`),
    fetch(`https://api.chess.com/pub/player/${key}/stats`),
  ])

  if (!profileRes.ok) {
    throw new Error('not found')
  }

  const profileData = await profileRes.json()
  const statsData = statsRes.ok ? await statsRes.json() : {}

  const profile: ChessComProfile = {
    username: profileData.username ?? key,
    avatar: profileData.avatar ?? null,
    name: profileData.name ?? null,
    title: profileData.title ?? null,
    country: profileData.country ?? null,
    location: profileData.location ?? null,
    joined: profileData.joined ?? null,
    last_online: profileData.last_online ?? null,
    followers: profileData.followers ?? null,
    is_streamer: !!profileData.is_streamer,
    status: profileData.status ?? null,
  }

  const entry: CacheEntry = { profile, stats: statsData as ChessComStats }
  cache.set(key, entry)
  return entry
}

/**
 * Busca um jogador do chess.com (perfil + estatísticas) via API pública.
 * Diferente de usePlayerProfiles, aqui a falha DEVE ser exposta ao usuário
 * (busca é a ação principal, não uma decoração de avatar opcional).
 */
export function usePlayerSearch() {
  const [profile, setProfile] = useState<ChessComProfile | null>(null)
  const [stats, setStats] = useState<ChessComStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef<(() => void) | null>(null)

  const search = useCallback((username: string) => {
    const trimmed = username.trim()
    if (!trimmed) return

    // Cancela qualquer busca anterior em andamento.
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
