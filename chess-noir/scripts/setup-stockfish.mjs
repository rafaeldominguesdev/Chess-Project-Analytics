#!/usr/bin/env node
// Copia o motor Stockfish COMPLETO (rede NNUE cheia, ~108MB) de node_modules/stockfish/bin/ pra
// public/stockfish/ — esse arquivo não fica versionado no git (passa do limite de 100MB do
// GitHub), então precisa desse passo depois de `npm install` pra análise funcionar localmente.
// A versão "lite" (7MB) já vem versionada normalmente, não precisa desse script.
import { existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const src = path.join(root, 'node_modules/stockfish/bin/stockfish-18-single.wasm')
const destDir = path.join(root, 'public/stockfish')
const dest = path.join(destDir, 'stockfish-18-single.wasm')

if (existsSync(dest)) process.exit(0)

if (!existsSync(src)) {
  console.warn('[setup-stockfish] node_modules/stockfish/bin/stockfish-18-single.wasm não encontrado — a análise com o motor completo não vai funcionar até isso ser resolvido.')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.log('[setup-stockfish] motor completo copiado pra public/stockfish/stockfish-18-single.wasm')
