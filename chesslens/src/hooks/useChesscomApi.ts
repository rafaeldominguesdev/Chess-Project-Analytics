import { useState, useEffect } from 'react'

export interface PlayerProfile {
  avatar: string | null
  title: string | null
  loading: boolean
}

const cache = new Map<string, { avatar: string | null; title: string | null }>()

async function fetchProfile(username: string): Promise<{ avatar: string | null; title: string | null }> {
  const key = username.toLowerCase()
  if (cache.has(key)) return cache.get(key)!
  try {
    const res = await fetch(`https://api.chess.com/pub/player/${key}`)
    if (!res.ok) throw new Error('not found')
    const data = await res.json()
    const result = { avatar: data.avatar ?? null, title: data.title ?? null }
    cache.set(key, result)
    return result
  } catch {
    const result = { avatar: null, title: null }
    cache.set(key, result)
    return result
  }
}

/**
 * Busca avatar + título dos jogadores na API pública do chess.com.
 * Usuários que não existem no chess.com caem no fallback (avatar null → iniciais).
 */
export function usePlayerProfiles(white?: string, black?: string) {
  const [profiles, setProfiles] = useState<{ white: PlayerProfile; black: PlayerProfile }>({
    white: { avatar: null, title: null, loading: false },
    black: { avatar: null, title: null, loading: false },
  })

  useEffect(() => {
    let cancelled = false
    const valid = (u?: string) => !!u && u !== '?' && u !== 'Brancas' && u !== 'Pretas' && /^[\w-]+$/.test(u)

    setProfiles({
      white: { avatar: null, title: null, loading: valid(white) },
      black: { avatar: null, title: null, loading: valid(black) },
    })

    async function run() {
      const [w, b] = await Promise.all([
        valid(white) ? fetchProfile(white!) : Promise.resolve({ avatar: null, title: null }),
        valid(black) ? fetchProfile(black!) : Promise.resolve({ avatar: null, title: null }),
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
