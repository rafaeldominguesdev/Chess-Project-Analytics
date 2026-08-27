import { getItem, putItem, getAllItems, STORES } from './db'
import type { StoredAnalysis } from './types'

export async function saveAnalysis(
  gameUrl: string, depth: number, whiteEvals: number[], bestMoves: (string | null)[],
): Promise<void> {
  await putItem<StoredAnalysis>(STORES.analyses, { gameUrl, depth, whiteEvals, bestMoves, analyzedAt: Date.now() })
}

export async function loadAnalysis(gameUrl: string): Promise<StoredAnalysis | null> {
  return getItem<StoredAnalysis>(STORES.analyses, gameUrl)
}

/** Só usado pelo export de dados (Configurações) — lista tudo que já foi salvo. */
export async function loadAllAnalyses(): Promise<StoredAnalysis[]> {
  return getAllItems<StoredAnalysis>(STORES.analyses)
}

/**
 * Confere se uma análise cacheada ainda serve pra partida atual antes de confiar nela — nunca
 * aplica um cache corrompido ou de outra partida. Profundidade tem que bater exatamente (hoje é
 * fixa, mas se mudar no código, caches antigos viram MISS e reanalisam, sem tentar decidir se uma
 * profundidade maior "serviria" pra uma busca menor) e o tamanho dos arrays tem que bater com o
 * número de posições (`fens`) da partida carregada agora.
 */
export function isAnalysisValid(a: StoredAnalysis, fens: string[], expectedDepth: number): boolean {
  return a.depth === expectedDepth
    && a.whiteEvals.length === fens.length
    && a.bestMoves.length === fens.length
}
