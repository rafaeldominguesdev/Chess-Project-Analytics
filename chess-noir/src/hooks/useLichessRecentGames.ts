import { useEffect, useState } from 'react'
import type { RecentGame } from './useRecentGames'

// Pedido direto do usuário: últimas 5 partidas de CADA modo (bullet/blitz/rápida) separadas — um
// teto FIXO de partidas não garante isso (reportado ao vivo: "só apareceram Bullet/Blitz, Rápida
// sumiu" — um jogador que joga muito bullet/blitz recentemente pode não ter NENHUMA rápida dentro
// de um lote de tamanho fixo). Por isso pagina por `until` (timestamp) até ter cobertura de
// verdade dos 3 modos rastreados, ou bater num teto de segurança — não filtra por `perfType` na
// própria API de propósito (a lista "todas as partidas" continua sem filtro, então o POOL de
// busca não pode já vir filtrado só pros 3 modos que a tela de abas usa).
const BATCH_SIZE = 50
const SAFETY_MAX_GAMES = 200
const MAX_ROUNDS = 4
const PER_MODE_TARGET = 5
const TRACKED_SPEEDS = ['bullet', 'blitz', 'rapid']

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

    async function fetchBatch(key: string, until?: number): Promise<LichessGameJson[]> {
      const untilParam = until ? `&until=${until}` : ''
      const url = `https://lichess.org/api/games/user/${key}?max=${BATCH_SIZE}&pgnInJson=true${untilParam}`
      const res = await fetch(url, { headers: { Accept: 'application/x-ndjson' } })
      if (!res.ok) throw new Error('not found')
      const text = await res.text()
      return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => { try { return JSON.parse(line) as LichessGameJson } catch { return null } })
        .filter((g): g is LichessGameJson => g !== null)
    }

    async function run() {
      try {
        const key = username!.toLowerCase()
        const collected: LichessGameJson[] = []
        const modeCounts = new Map<string, number>()
        const hasFullCoverage = () => TRACKED_SPEEDS.every((s) => (modeCounts.get(s) ?? 0) >= PER_MODE_TARGET)
        let until: number | undefined

        for (let round = 0; round < MAX_ROUNDS && collected.length < SAFETY_MAX_GAMES; round++) {
          const batch = await fetchBatch(key, until)
          if (batch.length === 0) break
          for (const g of batch) {
            collected.push(g)
            if (g.speed) modeCounts.set(g.speed, (modeCounts.get(g.speed) ?? 0) + 1)
          }
          if (hasFullCoverage() || batch.length < BATCH_SIZE) break // cobertura completa, ou já acabou o histórico do jogador
          const last = batch[batch.length - 1]
          const lastTs = last.lastMoveAt ?? last.createdAt
          if (!lastTs) break
          until = lastTs - 1
        }

        if (cancelled) return
        setGames(collected.map((g) => normalize(key, g)).filter((g): g is RecentGame => g !== null))
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
