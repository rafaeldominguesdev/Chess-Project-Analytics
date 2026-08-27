import { loadAllGames } from './gamesRepo'
import { loadAllAnalyses } from './analysesRepo'
import { putItem, STORES } from './db'
import type { StoredGame, StoredAnalysis } from './types'

export const EXPORT_VERSION = 1

export interface ExportedData {
  version: number
  exportedAt: number
  games: StoredGame[]
  analyses: StoredAnalysis[]
  // `positions` fica de fora de propósito — é cache de performance, não dado do usuário. Não
  // faz sentido importar avaliações de FEN arbitrárias numa outra máquina; mais simples deixar
  // esse cache reconstruir sozinho conforme as partidas forem (re)analisadas por lá.
}

export async function exportAllToJson(): Promise<ExportedData> {
  const [games, analyses] = await Promise.all([loadAllGames(), loadAllAnalyses()])
  return { version: EXPORT_VERSION, exportedAt: Date.now(), games, analyses }
}

export interface ImportResult {
  importedGames: number
  importedAnalyses: number
  skipped: number
  errors: string[]
}

function isStoredGame(v: unknown): v is StoredGame {
  if (!v || typeof v !== 'object') return false
  const g = v as Record<string, unknown>
  return typeof g.url === 'string' && typeof g.pgn === 'string' && typeof g.gameInfo === 'object' && g.gameInfo !== null
}

function isStoredAnalysis(v: unknown): v is StoredAnalysis {
  if (!v || typeof v !== 'object') return false
  const a = v as Record<string, unknown>
  return typeof a.gameUrl === 'string' && typeof a.depth === 'number'
    && Array.isArray(a.whiteEvals) && Array.isArray(a.bestMoves)
}

/**
 * Valida defensivamente antes de escrever qualquer coisa: formato de nível superior desconhecido
 * (versão não suportada, campos não são array) rejeita o import inteiro; um item malformado
 * dentro de um array válido só é pulado (contado em `skipped`/`errors`), não derruba o resto —
 * mesma filosofia de "falha suave" do resto do projeto.
 */
export async function importFromJson(raw: unknown): Promise<ImportResult> {
  const result: ImportResult = { importedGames: 0, importedAnalyses: 0, skipped: 0, errors: [] }
  if (!raw || typeof raw !== 'object') {
    result.errors.push('Arquivo não é um backup válido do Chess Noir.')
    return result
  }
  const data = raw as Record<string, unknown>
  if (data.version !== EXPORT_VERSION) {
    result.errors.push(`Versão de backup não suportada (esperado ${EXPORT_VERSION}).`)
    return result
  }
  if (!Array.isArray(data.games) || !Array.isArray(data.analyses)) {
    result.errors.push('Arquivo não é um backup válido do Chess Noir.')
    return result
  }

  for (const g of data.games) {
    if (!isStoredGame(g)) { result.skipped++; result.errors.push('Partida com formato inválido, ignorada.'); continue }
    await putItem<StoredGame>(STORES.games, g)
    result.importedGames++
  }
  for (const a of data.analyses) {
    if (!isStoredAnalysis(a)) { result.skipped++; result.errors.push('Análise com formato inválido, ignorada.'); continue }
    await putItem<StoredAnalysis>(STORES.analyses, a)
    result.importedAnalyses++
  }
  return result
}
