import { getItem, putItem, getAllItems, STORES } from './db'
import type { StoredGame } from './types'
import type { GameInfo } from '../types/chess.types'

export async function saveGame(url: string, pgn: string, gameInfo: GameInfo, perspectiveColor?: 'w' | 'b'): Promise<void> {
  await putItem<StoredGame>(STORES.games, { url, pgn, gameInfo, savedAt: Date.now(), perspectiveColor })
}

export async function loadGame(url: string): Promise<StoredGame | null> {
  return getItem<StoredGame>(STORES.games, url)
}

/** Só usado pelo export de dados (Configurações) — lista tudo que já foi salvo. */
export async function loadAllGames(): Promise<StoredGame[]> {
  return getAllItems<StoredGame>(STORES.games)
}
