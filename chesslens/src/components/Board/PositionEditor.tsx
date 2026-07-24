import { useState, useMemo } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES, PIECE_SETS } from '../../utils/boardThemes'
import { buildCustomPieces } from '../../utils/pieceLoader'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const START_MAP: Record<string, string> = buildStartMap()

function buildStartMap(): Record<string, string> {
  const map: Record<string, string> = {}
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
  FILES.forEach((f, i) => {
    map[`${f}1`] = 'w' + back[i]
    map[`${f}2`] = 'wP'
    map[`${f}7`] = 'bP'
    map[`${f}8`] = 'b' + back[i]
  })
  return map
}

function mapToPlacement(map: Record<string, string>): string {
  const rows: string[] = []
  for (let rank = 8; rank >= 1; rank--) {
    let row = ''
    let empty = 0
    for (const f of FILES) {
      const code = map[`${f}${rank}`]
      if (!code) { empty++; continue }
      if (empty) { row += empty; empty = 0 }
      const letter = code[1]
      row += code[0] === 'w' ? letter.toUpperCase() : letter.toLowerCase()
    }
    if (empty) row += empty
    rows.push(row)
  }
  return rows.join('/')
}

function fenToMap(fen: string): { map: Record<string, string>; side: 'w' | 'b' } | null {
  try {
    const [placement, side] = fen.trim().split(' ')
    const rows = placement.split('/')
    if (rows.length !== 8) return null
    const map: Record<string, string> = {}
    rows.forEach((row, r) => {
      const rank = 8 - r
      let file = 0
      for (const ch of row) {
        if (/\d/.test(ch)) { file += parseInt(ch); continue }
        const color = ch === ch.toUpperCase() ? 'w' : 'b'
        map[`${FILES[file]}${rank}`] = color + ch.toUpperCase()
        file++
      }
    })
    return { map, side: side === 'b' ? 'b' : 'w' }
  } catch {
    return null
  }
}

interface PositionEditorProps {
  boardWidth: number
  onPlay: (fen: string, mode: 'play' | 'review') => void
}

const PALETTE = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP']

export function PositionEditor({ boardWidth, onPlay }: PositionEditorProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]
  const customPieces = useMemo(() => buildCustomPieces(theme.pieceSet), [theme.pieceSet])
  const pieceSrc = PIECE_SETS[theme.pieceSet].src

  const [map, setMap] = useState<Record<string, string>>(START_MAP)
  const [side, setSide] = useState<'w' | 'b'>('w')
  const [selected, setSelected] = useState<string>('wP')
  const [fenInput, setFenInput] = useState('')

  const fen = `${mapToPlacement(map)} ${side} - - 0 1`

  const legality = useMemo(() => {
    try { new Chess(fen); return { ok: true, msg: '' } }
    catch (e) { return { ok: false, msg: e instanceof Error ? e.message : 'Posição inválida' } }
  }, [fen])

  function handleSquareClick({ square }: { square: string }) {
    setMap((prev) => {
      const next = { ...prev }
      if (selected === 'erase') delete next[square]
      else next[square] = selected
      return next
    })
  }

  function loadFen() {
    const parsed = fenToMap(fenInput)
    if (!parsed) return
    setMap(parsed.map)
    setSide(parsed.side)
  }

  const BTN = { padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 } as React.CSSProperties

  const PaletteBtn = ({ code, label }: { code: string; label?: string }) => {
    const active = selected === code
    return (
      <button
        onClick={() => setSelected(code)}
        title={label ?? code}
        style={{
          width: 34, height: 34, borderRadius: 7, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: active ? 'var(--accent)' : 'var(--surface2)',
          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
        }}
      >
        {code === 'erase'
          ? <span style={{ fontSize: 16 }}>🧹</span>
          : <img src={`https://lichess1.org/assets/piece/${pieceSrc}/${code}.svg`} width={26} height={26} alt={code} />}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: boardWidth, height: boardWidth }}>
        <Chessboard
          options={{
            position: fen,
            onSquareClick: handleSquareClick,
            boardStyle: { borderRadius: '6px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', width: boardWidth, height: boardWidth },
            darkSquareStyle: { backgroundColor: bt.dark },
            lightSquareStyle: { backgroundColor: bt.light },
            allowDragging: false,
            allowDrawingArrows: false,
            showNotation: theme.showCoordinates,
            pieces: customPieces,
          }}
        />
      </div>

      {/* Paleta de peças */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: boardWidth }}>
        {PALETTE.map((c) => <PaletteBtn key={c} code={c} />)}
        <PaletteBtn code="erase" label="Apagar" />
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: boardWidth }}>
        <button style={BTN} onClick={() => { setMap(START_MAP); setSide('w') }}>↺ Inicial</button>
        <button style={BTN} onClick={() => setMap({})}>🗑 Limpar</button>
        <button
          style={{ ...BTN, background: side === 'w' ? '#f0d9b5' : '#333', color: side === 'w' ? '#1a1a1a' : '#fff' }}
          onClick={() => setSide((s) => (s === 'w' ? 'b' : 'w'))}
        >
          {side === 'w' ? '♔ Brancas jogam' : '♚ Pretas jogam'}
        </button>
      </div>

      {/* FEN */}
      <div style={{ display: 'flex', gap: 6, width: boardWidth, maxWidth: '100%' }}>
        <input
          value={fenInput}
          onChange={(e) => setFenInput(e.target.value)}
          placeholder="Colar FEN…"
          style={{ flex: 1, fontSize: 11, padding: '7px 10px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none', fontFamily: 'monospace' }}
        />
        <button style={BTN} onClick={loadFen}>Carregar</button>
        <button style={BTN} onClick={() => { setFenInput(fen); navigator.clipboard?.writeText(fen) }}>Copiar atual</button>
      </div>

      {!legality.ok && (
        <p style={{ fontSize: 11, color: '#e84040', maxWidth: boardWidth, textAlign: 'center' }}>⚠ {legality.msg}</p>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          disabled={!legality.ok}
          onClick={() => onPlay(fen, 'play')}
          style={{ padding: '10px 20px', borderRadius: 9, border: 'none', cursor: legality.ok ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, background: 'var(--accent)', color: 'var(--bg)', opacity: legality.ok ? 1 : 0.5 }}
        >
          🤖 Jogar a partir daqui
        </button>
        <button
          disabled={!legality.ok}
          onClick={() => onPlay(fen, 'review')}
          style={{ padding: '10px 20px', borderRadius: 9, border: '1px solid var(--border)', cursor: legality.ok ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, background: 'var(--surface2)', color: 'var(--text)', opacity: legality.ok ? 1 : 0.5 }}
        >
          🔍 Analisar
        </button>
      </div>
    </div>
  )
}
