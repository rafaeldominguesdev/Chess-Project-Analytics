import { useEffect, useRef, useState } from 'react'
import { usePlayerSearch } from '../../hooks/usePlayerSearch'
import { PlayerCard } from './PlayerCard'
import { StatsGrid } from './StatsGrid'

const LAST_SEARCH_KEY = 'chesslens-last-player-search'

/**
 * Componente autocontido: renderiza o botão de gatilho + o painel deslizante
 * de busca de jogador do chess.com. Gerencia seu próprio estado aberto/fechado,
 * então basta montar <PlayerSearch /> em qualquer lugar do app.
 */
export default function PlayerSearch() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { profile, stats, loading, error, search } = usePlayerSearch()
  const inputRef = useRef<HTMLInputElement>(null)
  const didAutoSearch = useRef(false)

  // Restaura o último username buscado (uma vez, no primeiro mount).
  useEffect(() => {
    if (didAutoSearch.current) return
    didAutoSearch.current = true
    const saved = localStorage.getItem(LAST_SEARCH_KEY)
    if (saved) {
      setInput(saved)
      search(saved)
    }
  }, [search])

  useEffect(() => {
    if (open) {
      // pequeno delay para garantir que o elemento já esteja montado/visível
      const id = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }
  }, [open])

  function runSearch() {
    const trimmed = input.trim()
    if (!trimmed) return
    search(trimmed)
    localStorage.setItem(LAST_SEARCH_KEY, trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') runSearch()
  }

  return (
    <>
      {/* Botão de gatilho */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 18px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          transition: 'transform 0.1s, filter 0.1s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none' }}
      >
        🔍 Buscar Jogador
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
        />
      )}

      {/* Painel deslizante */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 380,
          maxWidth: '100vw',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Buscar Jogador</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Perfil e ratings do chess.com</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Username do chess.com..."
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: 14,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
            <button
              onClick={runSearch}
              style={{
                padding: '10px 16px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {loading && <LoadingSkeleton />}

          {!loading && error && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '40px 16px', textAlign: 'center',
            }}>
              <span style={{ fontSize: 32 }}>😕</span>
              <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{error}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifique o username e tente novamente.</span>
            </div>
          )}

          {!loading && !error && profile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <PlayerCard profile={profile} />
              {stats && <StatsGrid stats={stats} />}
            </div>
          )}

          {!loading && !error && !profile && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              padding: '40px 16px', textAlign: 'center',
            }}>
              <span style={{ fontSize: 32 }}>♟️</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Busque um username do chess.com para ver o perfil e os ratings.</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function LoadingSkeleton() {
  const shimmer: React.CSSProperties = {
    background: 'var(--surface2)',
    borderRadius: 8,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ ...shimmer, width: 96, height: 96, borderRadius: '50%' }} />
        <div style={{ ...shimmer, width: 140, height: 18 }} />
        <div style={{ ...shimmer, width: 100, height: 12 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...shimmer, height: 90 }} />
        ))}
      </div>
    </div>
  )
}
