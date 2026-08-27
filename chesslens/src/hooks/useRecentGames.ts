import { useEffect, useState } from 'react'
import type { ChesscomGame } from '../types/chess.types'

// Pedido direto do usuário: quer ver as últimas 5 partidas de CADA modo (bullet/blitz/rápida)
// separadas, não só as últimas N no geral. Um teto FIXO de partidas (a 1ª tentativa, MAX_GAMES=60)
// não garante isso de verdade — reportado ao vivo pelo usuário ("só apareceram Bullet/Blitz,
// Rápida sumiu"): um jogador que joga MUITO bullet/blitz recentemente pode não ter nenhuma
// partida rápida dentro de um teto fixo de 60, mesmo jogando rápida com regularidade só um pouco
// mais espaçada. Por isso o loop abaixo agora para por COBERTURA (pelo menos `PER_MODE_TARGET`
// de cada um dos 3 modos rastreados), não só por contagem total — só usa `MAX_GAMES`/`SAFETY_MAX`
// como teto de segurança pra não varrer o histórico inteiro de quem nunca jogou um dos 3 modos.
const MAX_GAMES = 60
const SAFETY_MAX_GAMES = 200
const PER_MODE_TARGET = 5
const TRACKED_RAW_MODES = ['chess_bullet', 'chess_blitz', 'chess_rapid']
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
        // Janela de meses generosa (12) — o loop abaixo para sozinho assim que tiver cobertura
        // suficiente (ou bater no teto de segurança), então isso só busca mês a mais quando de
        // fato precisa, não busca os 12 sempre.
        const recentMonths = archives.slice(-12).reverse()
        const collected: ChesscomGame[] = []
        const modeCounts = new Map<string, number>()
        const hasFullCoverage = () => TRACKED_RAW_MODES.every((m) => (modeCounts.get(m) ?? 0) >= PER_MODE_TARGET)

        for (const archiveUrl of recentMonths) {
          if (collected.length >= SAFETY_MAX_GAMES) break
          if (collected.length >= MAX_GAMES && hasFullCoverage()) break
          const monthGames = await fetchMonth(archiveUrl)
          for (const g of [...monthGames].reverse()) {
            collected.push(g)
            modeCounts.set(g.time_class, (modeCounts.get(g.time_class) ?? 0) + 1)
          }
        }

        if (cancelled) return
        setGames(collected.slice(0, SAFETY_MAX_GAMES).map((g) => normalize(username!, g)))
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
