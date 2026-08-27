// Migração one-shot das chaves de localStorage do prefixo antigo `chesslens-` pro novo
// `chessnoir-` (rebrand pra "Chess Noir"). Roda no boot, em `main.tsx`, ANTES do
// `createRoot(...).render(...)` e antes de qualquer hook/contexto ler uma chave — assim quem já
// usava o app não perde tema, última busca de jogador nem placar dos modos de treino.
//
// É idempotente: a flag `chessnoir-storage-migrated` marca que já rodou, então em toda carga
// seguinte a função retorna de imediato. Envolvida em try/catch porque persistência é opcional e
// nunca pode quebrar o app (Safari em modo privado bloqueia `localStorage`, cota estourada etc.)
// — mesma filosofia do `db.ts`.

const KEY_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['chesslens-theme', 'chessnoir-theme'],
  ['chesslens-last-player-search-chesscom', 'chessnoir-last-player-search-chesscom'],
  ['chesslens-last-player-search-lichess', 'chessnoir-last-player-search-lichess'],
  ['chesslens-last-platform', 'chessnoir-last-platform'],
  ['chesslens-analyze-mode', 'chessnoir-analyze-mode'],
  ['chesslens-sidebar-collapsed', 'chessnoir-sidebar-collapsed'],
  ['chesslens-error-stats', 'chessnoir-error-stats'],
  ['chesslens-error-position-stats', 'chessnoir-error-position-stats'],
  ['chesslens-opening-stats', 'chessnoir-opening-stats'],
  ['chesslens-opening-line-stats', 'chessnoir-opening-line-stats'],
  ['chesslens-endgame-stats', 'chessnoir-endgame-stats'],
]

const MIGRATED_FLAG = 'chessnoir-storage-migrated'

export function migrateStorageKeys(): void {
  try {
    if (localStorage.getItem(MIGRATED_FLAG) === '1') return

    for (const [oldKey, newKey] of KEY_PAIRS) {
      // Não sobrescreve valor já existente na chave nova — só migra quando a nova está vazia e a
      // antiga tem algo.
      if (localStorage.getItem(newKey) === null) {
        const oldValue = localStorage.getItem(oldKey)
        if (oldValue !== null) {
          localStorage.setItem(newKey, oldValue)
          localStorage.removeItem(oldKey)
        }
      }
    }

    localStorage.setItem(MIGRATED_FLAG, '1')
  } catch {
    // Persistência opcional: se `localStorage` não estiver disponível, segue a vida.
  }
}
