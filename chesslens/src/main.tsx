import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { migrateStorageKeys } from './utils/migrateStorageKeys.ts'
import App from './App.tsx'

// Renomeia as chaves de localStorage `chesslens-*` → `chessnoir-*` antes de qualquer coisa ler
// storage (contexto de tema, hooks de treino) — precisa rodar antes do render.
migrateStorageKeys()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
