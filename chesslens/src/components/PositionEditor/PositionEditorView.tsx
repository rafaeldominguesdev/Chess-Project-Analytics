import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject, SVGProps } from 'react'
import { Chess } from 'chess.js'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES } from '../../utils/boardThemes'
import {
  FILES, START_PLACEMENT, ALL_CASTLING, NO_CASTLING,
  parsePlacement, buildFen, parseFenState,
} from './fenBoard'
import type { BoardMap, CastlingRights } from './fenBoard'

interface PositionEditorViewProps {
  boardWidth: number
  containerRef: RefObject<HTMLDivElement | null>
  /** Chamado com o FEN validado quando o usuário confirma — quem usa troca pro Tabuleiro
   *  (AnalysisBoardView) já carregado nessa posição. */
  onAnalyze: (fen: string) => void
}

// As 12 peças da paleta, na ordem Rei/Dama/Torre/Bispo/Cavalo/Peão — mesma ordem em ambas as
// cores, brancas em cima e pretas embaixo (igual editor de posição do lichess/chess.com).
const PALETTE_TYPES = ['K', 'Q', 'R', 'B', 'N', 'P'] as const
const PIECE_LABELS: Record<string, string> = { K: 'Rei', Q: 'Dama', R: 'Torre', B: 'Bispo', N: 'Cavalo', P: 'Peão' }

function pieceUrl(code: string, pieceSet: string) {
  return `https://lichess1.org/assets/piece/${pieceSet}/${code}.svg`
}

function iconBase(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...props }
}

function EraserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M19 20H9L4.5 15.5a2 2 0 0 1 0-2.8L13 4.2a2 2 0 0 1 2.8 0l4.5 4.5a2 2 0 0 1 0 2.8L13 19" />
      <path d="M9 20 5.5 16.5" opacity={0.6} />
    </svg>
  )
}

function FlipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M17 3 21 7l-4 4" />
      <path d="M21 7H9a5 5 0 0 0-5 5" />
      <path d="M7 21 3 17l4-4" />
      <path d="M3 17h12a5 5 0 0 0 5-5" />
    </svg>
  )
}

function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconBase(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/** Dá uma explicação um pouco mais específica que a mensagem crua do chess.js pros casos mais
 *  comuns de posição inválida (número de reis errado é de longe o mais frequente ao editar). */
function describeInvalidFen(placement: string, rawMessage: string): string {
  const whiteKings = (placement.match(/K/g) ?? []).length
  const blackKings = (placement.match(/k/g) ?? []).length
  if (whiteKings !== 1 || blackKings !== 1) {
    return 'Posição inválida — cada lado precisa de exatamente 1 rei.'
  }
  return `Posição inválida — ${rawMessage}`
}

/**
 * Editor de posição livre — monta qualquer arranjo de peças no tabuleiro (sem validar lances),
 * define de quem é a vez, roque disponível e casa de en passant, e manda tudo pronto pro Tabuleiro
 * de análise via `onAnalyze`. Diferente do resto do app, NÃO guarda o estado como FEN validado por
 * chess.js — a posição pode ficar transitoriamente ilegal enquanto o usuário edita (ver fenBoard.ts).
 */
export function PositionEditorView({ boardWidth, containerRef, onAnalyze }: PositionEditorViewProps) {
  const { theme } = useTheme()
  const bt = BOARD_THEMES[theme.boardTheme]

  const [board, setBoard] = useState<BoardMap>(() => parsePlacement(START_PLACEMENT))
  const [turn, setTurn] = useState<'w' | 'b'>('w')
  const [castling, setCastling] = useState<CastlingRights>(ALL_CASTLING)
  const [enPassant, setEnPassant] = useState('')
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [armed, setArmed] = useState<string | null>(null) // código de peça (ex: "wK") ou "remove"
  const [copied, setCopied] = useState(false)

  const computedFen = useMemo(() => buildFen(board, turn, castling, enPassant), [board, turn, castling, enPassant])

  // Campo de FEN: espelha `computedFen` sempre que o editor muda por outro caminho (tabuleiro,
  // turno, roque...), MAS pára de sincronizar enquanto o usuário está digitando nele — senão cada
  // letra digitada seria sobrescrita de volta pelo FEN antigo no próximo render.
  const [fenDraft, setFenDraft] = useState(computedFen)
  const editingFenRef = useRef(false)
  useEffect(() => {
    if (!editingFenRef.current) setFenDraft(computedFen)
  }, [computedFen])

  const validation = useMemo(() => {
    try {
      new Chess(computedFen)
      return { valid: true, message: null as string | null }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      return { valid: false, message: describeInvalidFen(computedFen.split(' ')[0], raw) }
    }
  }, [computedFen])

  function applyFenText(raw: string) {
    const parsed = parseFenState(raw)
    if (!parsed) return
    setBoard(parsed.board)
    setTurn(parsed.turn)
    setCastling(parsed.castling)
    setEnPassant(parsed.enPassant)
  }

  function commitFenDraft() {
    editingFenRef.current = false
    applyFenText(fenDraft)
  }

  function handleSquareClick(square: string) {
    if (armed === 'remove') {
      setBoard((prev) => {
        if (!(square in prev)) return prev
        const next = { ...prev }
        delete next[square]
        return next
      })
      return
    }
    if (armed) {
      setBoard((prev) => ({ ...prev, [square]: armed }))
      return
    }
    // Nada armado: clicar numa casa ocupada remove a peça direto — atalho intuitivo pra limpar
    // sem precisar armar a borracha toda vez.
    setBoard((prev) => {
      if (!(square in prev)) return prev
      const next = { ...prev }
      delete next[square]
      return next
    })
  }

  function toggleArm(code: string) {
    setArmed((prev) => (prev === code ? null : code))
  }

  function loadStartPosition() {
    setBoard(parsePlacement(START_PLACEMENT))
    setTurn('w')
    setCastling(ALL_CASTLING)
    setEnPassant('')
  }

  function loadEmptyBoard() {
    setBoard({})
    setCastling(NO_CASTLING)
    setEnPassant('')
  }

  function copyFen() {
    navigator.clipboard.writeText(computedFen).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }).catch(() => {})
  }

  const squareSize = boardWidth / 8
  const displayRanks = orientation === 'white' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const displayFiles = orientation === 'white' ? FILES.split('') : FILES.split('').reverse()
  const notationFontSize = Math.round(Math.min(15, Math.max(9, squareSize * 0.13)))
  // Botão da paleta bem maior que o ícone genérico de 40px do resto do app — é a peça de mão do
  // editor, precisa se ler de longe e ser fácil de acertar com o mouse, não um ícone secundário.
  const paletteSize = Math.round(Math.max(48, Math.min(68, squareSize * 0.62)))

  return (
    <>
      {/* Center — tabuleiro do editor + paleta de peças logo abaixo */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div
          className="cl-card"
          style={{ width: boardWidth, height: boardWidth, overflow: 'hidden', display: 'grid', gridTemplateColumns: `repeat(8, ${squareSize}px)`, gridTemplateRows: `repeat(8, ${squareSize}px)` }}
        >
          {displayRanks.map((rank, ri) =>
            displayFiles.map((file, fi) => {
              const square = `${file}${rank}`
              const isLight = (FILES.indexOf(file) + rank) % 2 === 0
              const code = board[square]
              const isBottomRow = ri === displayRanks.length - 1
              const isLeftCol = fi === 0
              return (
                <div
                  key={square}
                  className="cl-editor-square"
                  onClick={() => handleSquareClick(square)}
                  style={{
                    position: 'relative',
                    width: squareSize,
                    height: squareSize,
                    background: isLight ? bt.light : bt.dark,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {code && (
                    <img
                      src={pieceUrl(code, theme.pieceSet)}
                      alt={code}
                      draggable={false}
                      style={{ width: '82%', height: '82%', pointerEvents: 'none' }}
                    />
                  )}
                  {isLeftCol && (
                    <span style={{ position: 'absolute', top: 2, left: 3, fontSize: notationFontSize, fontWeight: 700, color: isLight ? bt.dark : bt.light, userSelect: 'none' }}>
                      {rank}
                    </span>
                  )}
                  {isBottomRow && (
                    <span style={{ position: 'absolute', bottom: 1, right: 3, fontSize: notationFontSize, fontWeight: 700, color: isLight ? bt.dark : bt.light, userSelect: 'none' }}>
                      {file}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="cl-card" style={{ width: boardWidth, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionLabel>Peças</SectionLabel>
          <div style={{ background: 'var(--color-bg-raised)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
            <PaletteRow color="w" pieceSet={theme.pieceSet} armed={armed} onToggle={toggleArm} squareSize={paletteSize} />
          </div>
          <div style={{ background: 'var(--color-bg-raised)', borderRadius: 'var(--radius-sm)', padding: 10 }}>
            <PaletteRow color="b" pieceSet={theme.pieceSet} armed={armed} onToggle={toggleArm} squareSize={paletteSize} />
          </div>
          <button
            onClick={() => toggleArm('remove')}
            className={`cl-btn cl-btn-sm${armed === 'remove' ? ' cl-btn-selected' : ''}`}
            style={{ width: '100%', height: 'auto', padding: '10px 0', fontSize: 12.5, gap: 8 }}
          >
            <EraserIcon />
            Remover peça
          </button>
        </div>
      </div>

      {/* Right — mesma posição/largura do painel de análise/treino */}
      <aside style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', paddingRight: 2 }}>

          <div className="cl-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <SectionLabel>Vez de jogar</SectionLabel>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setTurn('w')} className={`cl-btn${turn === 'w' ? ' cl-btn-selected' : ''}`} style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                  Brancas
                </button>
                <button onClick={() => setTurn('b')} className={`cl-btn${turn === 'b' ? ' cl-btn-selected' : ''}`} style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>
                  Pretas
                </button>
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--color-gray-border)' }} />

            <div>
              <SectionLabel>Roque disponível</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
                <CastlingRow label="Brancas" kingside={castling.K} queenside={castling.Q} onToggleKingside={() => setCastling((c) => ({ ...c, K: !c.K }))} onToggleQueenside={() => setCastling((c) => ({ ...c, Q: !c.Q }))} />
                <CastlingRow label="Pretas" kingside={castling.k} queenside={castling.q} onToggleKingside={() => setCastling((c) => ({ ...c, k: !c.k }))} onToggleQueenside={() => setCastling((c) => ({ ...c, q: !c.q }))} />
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--color-gray-border)' }} />

            <div>
              <SectionLabel>Casa de en passant</SectionLabel>
              <input
                className="cl-mono cl-inset"
                value={enPassant}
                onChange={(e) => setEnPassant(e.target.value.trim().toLowerCase())}
                placeholder="ex: e3 (vazio = nenhuma)"
                style={{ marginTop: 8, padding: '10px 12px', fontSize: 13, color: 'var(--color-text-on-dark)', width: '100%' }}
              />
              {enPassant !== '' && !/^[a-h][36]$/.test(enPassant) && (
                <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--color-error)' }}>Formato inválido — use uma casa da 3ª ou 6ª fileira, tipo "e3".</span>
              )}
            </div>
          </div>

          <div className="cl-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>Ferramentas</SectionLabel>
            <button onClick={loadStartPosition} className="cl-btn cl-btn-sm" style={{ width: '100%', height: 'auto', padding: '10px 0', fontSize: 13 }}>
              Posição inicial
            </button>
            <button onClick={loadEmptyBoard} className="cl-btn cl-btn-sm" style={{ width: '100%', height: 'auto', padding: '10px 0', fontSize: 13 }}>
              Tabuleiro vazio
            </button>
            <button onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))} className="cl-btn cl-btn-sm" style={{ width: '100%', height: 'auto', padding: '10px 0', fontSize: 13, gap: 6 }}>
              <FlipIcon />
              Girar tabuleiro
            </button>
          </div>

          <div className="cl-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>FEN</SectionLabel>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="cl-mono cl-inset"
                value={fenDraft}
                onFocus={() => { editingFenRef.current = true }}
                onChange={(e) => { editingFenRef.current = true; setFenDraft(e.target.value) }}
                onBlur={commitFenDraft}
                onKeyDown={(e) => { if (e.key === 'Enter') { commitFenDraft(); e.currentTarget.blur() } }}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: 11.5, color: 'var(--color-text-on-dark)' }}
                spellCheck={false}
              />
              <button onClick={copyFen} className="cl-btn cl-btn-sm" title="Copiar FEN" style={{ flexShrink: 0 }}>
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
            {!validation.valid && (
              <span style={{ fontSize: 11.5, color: 'var(--color-error)' }}>{validation.message}</span>
            )}
            <button
              onClick={() => onAnalyze(computedFen)}
              disabled={!validation.valid}
              className="cl-btn cl-btn-accent"
              style={{ width: '100%', padding: '12px 0', fontSize: 13, marginTop: 4 }}
            >
              Analisar posição
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

function PaletteRow({ color, pieceSet, armed, onToggle, squareSize }: {
  color: 'w' | 'b'
  pieceSet: string
  armed: string | null
  onToggle: (code: string) => void
  squareSize: number
}) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {PALETTE_TYPES.map((type) => {
        const code = `${color}${type}`
        return (
          <button
            key={code}
            onClick={() => onToggle(code)}
            title={`${PIECE_LABELS[type]} ${color === 'w' ? 'branca' : 'preta'}`}
            className={`cl-btn cl-btn-sm${armed === code ? ' cl-btn-selected' : ''}`}
            style={{ width: squareSize, height: squareSize }}
          >
            <img src={pieceUrl(code, pieceSet)} alt={code} draggable={false} style={{ width: '80%', height: '80%', pointerEvents: 'none' }} />
          </button>
        )
      })}
    </div>
  )
}

function CastlingRow({ label, kingside, queenside, onToggleKingside, onToggleQueenside }: {
  label: string
  kingside: boolean
  queenside: boolean
  onToggleKingside: () => void
  onToggleQueenside: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--color-gray-muted)', width: 52, flexShrink: 0 }}>{label}</span>
      <button onClick={onToggleKingside} className={`cl-btn cl-btn-sm${kingside ? ' cl-btn-selected' : ''}`} style={{ flex: 1, width: 'auto', height: 'auto', padding: '8px 0', fontSize: 12.5 }}>
        O-O
      </button>
      <button onClick={onToggleQueenside} className={`cl-btn cl-btn-sm${queenside ? ' cl-btn-selected' : ''}`} style={{ flex: 1, width: 'auto', height: 'auto', padding: '8px 0', fontSize: 12.5 }}>
        O-O-O
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="cl-display" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-gray-muted)' }}>
      {children}
    </div>
  )
}
