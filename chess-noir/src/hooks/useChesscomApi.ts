import { useState, useEffect } from 'react'
import { countryUrlToCode } from '../utils/flags'

export interface PlayerProfile {
  avatar: string | null
  title: string | null
  countryCode: string | null
  status: string | null
  loading: boolean
}

type CachedProfile = Omit<PlayerProfile, 'loading'>

const EMPTY_PROFILE: CachedProfile = { avatar: null, title: null, countryCode: null, status: null }

const cache = new Map<string, CachedProfile>()

async function fetchProfile(username: string): Promise<CachedProfile> {
  const key = username.toLowerCase()
  if (cache.has(key)) return cache.get(key)!
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${key}`)
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    const result: CachedProfile = {
      avatar: data.avatar ?? null,
      title: data.title ?? null,
      countryCode: countryUrlToCode(data.country ?? null),
      status: data.status ?? null,
    }
    cache.set(key, result)
    return result
  } catch {
    cache.set(key, EMPTY_PROFILE)
    return EMPTY_PROFILE
  }
}

/**
 * Busca avatar, título, país e status (assinatura) dos jogadores na API pública do chess.com.
 * Usuários que não existem no chess.com caem no fallback (avatar null → iniciais).
 */
export function usePlayerProfiles(white?: string, black?: string) {
  const [profiles, setProfiles] = useState<{ white: PlayerProfile; black: PlayerProfile }>({
    white: { ...EMPTY_PROFILE, loading: false },
    black: { ...EMPTY_PROFILE, loading: false },
  })

  useEffect(() => {
    let cancelled = false
    const valid = (u?: string) => !!u && u !== '?' && u !== 'Brancas' && u !== 'Pretas' && /^[\w-]+$/.test(u)

    setProfiles({
      white: { ...EMPTY_PROFILE, loading: valid(white) },
      black: { ...EMPTY_PROFILE, loading: valid(black) },
    })

    async function run() {
      const [w, b] = await Promise.all([
        valid(white) ? fetchProfile(white!) : Promise.resolve(EMPTY_PROFILE),
        valid(black) ? fetchProfile(black!) : Promise.resolve(EMPTY_PROFILE),
      ])
      if (cancelled) return
      setProfiles({
        white: { ...w, loading: false },
        black: { ...b, loading: false },
      })
    }
    run()

    return () => { cancelled = true }
  }, [white, black])

  return profiles
}
