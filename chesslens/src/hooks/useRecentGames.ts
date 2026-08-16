import { useEffect, useState } from 'react'
import type { ChesscomGame } from '../types/chess.types'

const MAX_GAMES = 8
const archivesCache = new Map<string, string[]>()
const monthCache = new Map<string, ChesscomGame[]>()

async function fetchArchives(username: string): Promise<string[]> {
  const key = username.toLowerCase()
  const cached = archivesCache.get(key)
  if (cached) return cached
  const res = await fetch(`https://api.chess.com/pub/player/${key}/games/archives`)
  if (!res.ok) throw new Error('not found')
  const data = await res.json()
  const archives: string[] = data.archives ?? []
  archivesCache.set(key, archives)
  return archives
}

async function fetchMonth(archiveUrl: string): Promise<ChesscomGame[]> {
  const cached = monthCache.get(archiveUrl)
  if (cached) return cached
  const res = await fetch(archiveUrl)
  if (!res.ok) return []
  const data = await res.json()
  const games: ChesscomGame[] = data.games ?? []
  monthCache.set(archiveUrl, games)
  return games
}

/** Um jogo recente já normalizado do ponto de vista de `username`. */
export interface RecentGame {
  pgn: string
  url: string
  timeClass: string
  rated: boolean
  endTime: number
  opponent: string
  opponentRating: number | null
  ownRating: number | null
  color: 'white' | 'black'
  outcome: 'win' | 'draw' | 'loss'
}

const DRAW_RESULTS = new Set(['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'])

function normalize(username: string, game: ChesscomGame): RecentGame {
  const key = username.toLowerCase()
  const isWhite = game.white.username.toLowerCase() === key
  const own = isWhite ? game.white : game.black
  const opp = isWhite ? game.black : game.white
  const outcome: RecentGame['outcome'] = own.result === 'win' ? 'win' : DRAW_RESULTS.has(own.result) ? 'draw' : 'loss'

  return {
    pgn: game.pgn,
    url: game.url,
    timeClass: game.time_class,
    rated: (game as unknown as { rated?: boolean }).rated ?? true,
    endTime: game.end_time,
    opponent: opp.username,
    opponentRating: opp.rating ?? null,
    ownRating: own.rating ?? null,
    color: isWhite ? 'white' : 'black',
    outcome,
  }
}

/**
 * Busca as últimas partidas do jogador na API pública do chess.com.
 * Percorre os arquivos mensais mais recentes até juntar `MAX_GAMES` partidas.
 */
export function useRecentGames(username: string | null) {
  const [games, setGames] = useState<RecentGame[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!username) { setGames([]); return }
    let cancelled = false
    setLoading(true)

    async function run() {
      try {
        const archives = await fetchArchives(username!)
        const recentMonths = archives.slice(-3).reverse()
        const collected: ChesscomGame[] = []

        for (const archiveUrl of recentMonths) {
          if (collected.length >= MAX_GAMES) break
          const monthGames = await fetchMonth(archiveUrl)
          collected.push(...[...monthGames].reverse())
        }

        if (cancelled) return
        setGames(collected.slice(0, MAX_GAMES).map((g) => normalize(username!, g)))
      } catch {
        if (!cancelled) setGames([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()

    return () => { cancelled = true }
  }, [username])

  return { games, loading }
}
