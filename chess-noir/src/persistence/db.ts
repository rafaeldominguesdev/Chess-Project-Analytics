// Conexão de baixo nível com o IndexedDB do app + CRUD genérico. Nenhuma função aqui lança —
// tudo falha em silêncio (retorna null/false/[]) quando o storage não está disponível (Safari em
// modo privado, navegador sem suporte, cota estourada, outra aba segurando uma conexão de versão
// antiga) ou quando qualquer operação dá erro. Mesma filosofia do par loadJsonRecord/
// saveJsonRecord de `hooks/useOpeningTrainer.ts`, só que para IndexedDB (async) em vez de
// localStorage (sync) — o app nunca deve quebrar por causa de persistência opcional.

// Nome herdado do nome antigo do projeto ("ChessLens"), mantido de propósito no rebrand pra
// "Chess Noir": renomear um IndexedDB exigiria abrir o banco antigo e copiar todos os stores pro
// novo — risco de perder análises salvas, zero ganho já que o nome do banco é invisível pro
// usuário. Mesmo critério das custom properties `--color-blue-*`.
const DB_NAME = 'chesslens-db'
const DB_VERSION = 1

export const STORES = {
  games: 'games',
  analyses: 'analyses',
  positions: 'positions',
} as const
export type StoreName = (typeof STORES)[keyof typeof STORES]

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return }
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    req.onupgradeneeded = (event) => {
      const db = req.result
      const oldVersion = event.oldVersion
      // Bloco pensado pra crescer: uma migração futura entra como `if (oldVersion < 2) {...}`
      // logo abaixo, sem mexer no que já existe aqui.
      if (oldVersion < 1) {
        db.createObjectStore(STORES.games, { keyPath: 'url' })
        db.createObjectStore(STORES.analyses, { keyPath: 'gameUrl' })
        db.createObjectStore(STORES.positions, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

export async function getItem<T>(store: StoreName, key: IDBValidKey): Promise<T | null> {
  try {
    const db = await openDb()
    if (!db) return null
    return await new Promise<T | null>((resolve) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key)
      req.onsuccess = () => resolve((req.result as T) ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function putItem<T>(store: StoreName, value: T): Promise<boolean> {
  try {
    const db = await openDb()
    if (!db) return false
    return await new Promise<boolean>((resolve) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).put(value)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function deleteItem(store: StoreName, key: IDBValidKey): Promise<boolean> {
  try {
    const db = await openDb()
    if (!db) return false
    return await new Promise<boolean>((resolve) => {
      const req = db.transaction(store, 'readwrite').objectStore(store).delete(key)
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function getAllItems<T>(store: StoreName): Promise<T[]> {
  try {
    const db = await openDb()
    if (!db) return []
    return await new Promise<T[]>((resolve) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll()
      req.onsuccess = () => resolve((req.result as T[]) ?? [])
      req.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}
