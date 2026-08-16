import { useEffect, useState } from 'react'
import type { RecentGame } from './useRecentGames'

const MAX_GAMES = 8

interface LichessGameJson {
  id: string
  rated?: boolean
  speed?: string
  lastMoveAt?: number
  createdAt?: number
  winner?: 'white' | 'black'
  status?: string
  pgn?: string
  players: {
    white: { user?: { name: string }; rating?: number; aiLevel?: number }
    black: { user?: { name: string }; rating?: number; aiLevel?: number }
  }
}

const DRAW_STATUSES = new Set(['draw', 'stalemate', 'timeoutDraw', 'insufficientMaterialClaim'])

function normalize(username: string, game: LichessGameJson): RecentGame | null {
  if (!game.pgn) return null
  const key = username.toLowerCase()
  const isWhite = game.players.white.user?.name?.toLowerCase() === key
  const own = isWhite ? game.players.white : game.players.black
  const opp = isWhite ? game.players.black : game.players.white

  const outcome: RecentGame['outcome'] = game.winner
    ? (game.winner === (isWhite ? 'white' : 'black') ? 'win' : 'loss')
    : (game.status && DRAW_STATUSES.has(game.status)) ? 'draw' : 'loss'

  return {
    pgn: game.pgn,
    url: `https://lichess.org/${game.id}`,
    timeClass: game.speed ?? 'blitz',
    rated: game.rated ?? true,
    endTime: Math.floor((game.lastMoveAt ?? game.createdAt ?? Date.now()) / 1000),
    opponent: opp.user?.name ?? (opp.aiLevel ? `Stockfish nível ${opp.aiLevel}` : '?'),
    opponentRating: opp.rating ?? null,
    ownRating: own.rating ?? null,
    color: isWhite ? 'white' : 'black',
    outcome,
  }
}

/**
 * Busca as últimas partidas do jogador na API pública do Lichess.
 * A API devolve NDJSON (um JSON por linha) — parseia linha a linha.
 */
export function useLichessRecentGames(username: string | null) {
  const [games, setGames] = useState<RecentGame[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!username) { setGames([]); return }
    let cancelled = false
    setLoading(true)

    async function run() {
      try {
        const url = `https://lichess.org/api/games/user/${username!.toLowerCase()}?max=${MAX_GAMES}&pgnInJson=true`
        const res = await fetch(url, { headers: { Accept: 'application/x-ndjson' } })
        if (!res.ok) throw new Error('not found')
        const text = await res.text()
        const parsed = text
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => { try { return JSON.parse(line) as LichessGameJson } catch { return null } })
          .filter((g): g is LichessGameJson => g !== null)

        if (cancelled) return
        setGames(parsed.map((g) => normalize(username!, g)).filter((g): g is RecentGame => g !== null))
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
