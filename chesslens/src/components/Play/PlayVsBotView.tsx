import { useState } from 'react'
import type { CSSProperties, RefCallback } from 'react'
import { Chess } from 'chess.js'
import { usePlayVsBot } from '../../hooks/usePlayVsBot'
import type { BotLevel } from '../../analysis/botLevels'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'

interface PlayVsBotViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
}

// Mesmo recorte de rosto usado no avatar do "coach" (`CoachComment.tsx`/`ReportView.tsx`) — a
// capivara é a mascote única do produto, então as faixas de força diferenciam por cor/rótulo ao
// redor do MESMO recorte, nunca por um desenho novo (regra explícita pra esta tarefa).
const CAPY_IMG = { width: 2560, height: 1440 }
const CAPY_FACE_CROP = { x: 260, y: 80, size: 900 }

function capybaraAvatarStyle(size: number, borderColor: string): CSSProperties {
  const scale = size / CAPY_FACE_CROP.size
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundImage: 'url(/hero-bg.png?v=2)',
    backgroundSize: `${CAPY_IMG.width * scale}px ${CAPY_IMG.height * scale}px`,
    backgroundPosition: `${-CAPY_FACE_CROP.x * scale}px ${-CAPY_FACE_CROP.y * scale}px`,
    border: `2px solid ${borderColor}`,
    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.6)',
  }
}

type ColorChoice = 'w' | 'b' | 'random'

/**
 * "Jogar contra a Capivara" (Sprint 4) — partida real contra o Stockfish com força limitada.
 * Duas telas mutuamente exclusivas, mesma composição de coluna central + painel lateral já usada
 * em Tabuleiro/Treino/Relatório: escolha de faixa de força (`status === 'idle'`) e a partida em
 * si (tabuleiro interativo reaproveitado de `ChessBoard.tsx`, sem duplicar lógica de regras —
 * quem manda é `usePlayVsBot.ts`/`chess.js`).
 */
export function PlayVsBotView({ boardWidth, containerRef }: PlayVsBotViewProps) {
  const {
    levels, isEngineReady, status, level, playerColor, winner, isBotThinking,
    currentFen, moves, lastMove,
    startGame, makeUserMove, resign, quitGame,
  } = usePlayVsBot()

  const cardWidth = boardWidth + BOARD_ROW_CHROME_WIDTH

  if (status === 'idle') {
    return (
      <LevelSelectScreen
        levels={levels}
        isEngineReady={isEngineReady}
        onStart={startGame}
      />
    )
  }

  const gameOver = status !== 'playing'
  const boardOrientation = playerColor === 'w' ? 'white' : 'black'
  const botToMove = currentFen.split(' ')[1] === (playerColor === 'w' ? 'b' : 'w')

  return (
    <>
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth }}>
          <BotStatusCard level={level} isBotThinking={isBotThinking} botToMove={botToMove && !gameOver} />
        </div>

        <ChessBoard
          fen={currentFen}
          lastMove={lastMove}
          evaluation={null}
          // Sem barra de avaliação aqui de propósito: mostrar a avaliação do motor renderia a
          // dica "estou perdendo/ganhando" (e a seta de melhor lance) contra o próprio motor que
          // está jogando o outro lado — ajuda indevida numa partida que devia ser você vs. ele.
          showEvalBar={false}
          boardWidth={boardWidth}
          interactive={status === 'playing'}
          boardOrientation={boardOrientation}
          onPieceDrop={({ sourceSquare, targetSquare, promotion }) => (targetSquare ? makeUserMove(sourceSquare, targetSquare, promotion) : false)}
        />

        <div style={{
          width: cardWidth, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
        }}>
          {status === 'playing' && (
            <button onClick={resign} className="cl-btn cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '7px 14px', fontSize: 12.5 }}>
              Desistir
            </button>
          )}
          <button onClick={quitGame} className="cl-btn cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '7px 14px', fontSize: 12.5 }}>
            {gameOver ? 'Escolher outra faixa' : 'Sair da partida'}
          </button>
        </div>
      </div>

      <aside className="cl-tool-aside">
        <div className="cl-tool-aside-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
          {gameOver && (
            <ResultCard status={status} winner={winner} level={level} currentFen={currentFen} onRematch={quitGame} />
          )}

          <MoveListCard moves={moves} />
        </div>
      </aside>
    </>
  )
}

/** Card do cabeçalho durante a partida — avatar da capivara tingido pela cor da faixa escolhida
 *  + rótulo/Elo + indicação de "pensando" (pedido explícito da tarefa: precisa ficar claro
 *  quando o motor está calculando a resposta). */
function BotStatusCard({ level, isBotThinking, botToMove }: { level: BotLevel | null; isBotThinking: boolean; botToMove: boolean }) {
  if (!level) return null
  return (
    <div className="cl-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
      <div style={capybaraAvatarStyle(38, level.color)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Elo <span className="cl-mono">{level.elo}</span>
        </span>
        <span className="cl-display" style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-on-dark)', lineHeight: 1.2 }}>
          {level.label}
        </span>
      </div>
      {botToMove && (
        <span aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-gray-muted)', flexShrink: 0 }}>
          <span
            aria-hidden
            className={isBotThinking ? 'cl-dot-pulse' : undefined}
            style={{ width: 6, height: 6, borderRadius: '50%', background: level.color, flexShrink: 0 }}
          />
          {isBotThinking ? 'Pensando…' : 'Vez dela'}
        </span>
      )}
    </div>
  )
}

/** Meio-lance de xeque-mate/afogamento/empate — traduzido do `status`/`winner` já resolvidos por
 *  `usePlayVsBot.ts`, mais o motivo do empate (o hook só sabe "empate", o motivo específico
 *  — repetição, material insuficiente, 50 lances — é lido aqui de novo a partir do FEN final,
 *  pra não precisar carregar isso no estado do hook por uma mensagem só). */
function drawReasonLabel(fen: string): string {
  try {
    const chess = new Chess(fen)
    if (chess.isThreefoldRepetition()) return 'por repetição tripla'
    if (chess.isInsufficientMaterial()) return 'por material insuficiente'
    const halfmove = parseInt(fen.split(' ')[4] ?? '0', 10)
    if (halfmove >= 100) return 'pela regra dos 50 lances'
  } catch {
    // FEN final inesperado — segue sem motivo específico.
  }
  return ''
}

function ResultCard({ status, winner, level, currentFen, onRematch }: {
  status: 'checkmate' | 'stalemate' | 'draw' | 'resigned'
  winner: 'player' | 'bot' | 'draw' | null
  level: BotLevel | null
  currentFen: string
  onRematch: () => void
}) {
  const botLabel = level?.label ?? 'a Capivara'
  let headline: string
  let color: string
  if (winner === 'player') {
    headline = status === 'checkmate' ? `Xeque-mate! Você venceu ${botLabel}.` : `Você venceu ${botLabel}.`
    color = 'var(--color-success)'
  } else if (winner === 'bot') {
    headline = status === 'resigned'
      ? `Você desistiu — ${botLabel} venceu.`
      : `Xeque-mate — ${botLabel} venceu.`
    color = 'var(--color-error)'
  } else {
    const reason = status === 'stalemate' ? 'por afogamento' : drawReasonLabel(currentFen)
    headline = `Empate${reason ? ` ${reason}` : ''}.`
    color = 'var(--color-draw)'
  }

  return (
    <div className="cl-card cl-fade-in" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, borderColor: color }}>
      <div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Fim de jogo
        </span>
        <p className="cl-display" style={{ fontSize: 14.5, fontWeight: 700, color, marginTop: 3, lineHeight: 1.35 }}>{headline}</p>
      </div>
      <button onClick={onRematch} className="cl-btn cl-btn-accent" style={{ width: '100%', padding: '9px 0', fontSize: 13 }}>
        Jogar de novo
      </button>
    </div>
  )
}

function MoveListCard({ moves }: { moves: { san: string; color: 'w' | 'b' }[] }) {
  const rows = Math.ceil(moves.length / 2)
  return (
    <div className="cl-card" style={{ padding: 14 }}>
      {moves.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)' }}>
          Nenhum lance ainda — arraste (ou clique) numa peça pra começar.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Array.from({ length: rows }, (_, i) => {
            const w = moves[i * 2]
            const b = moves[i * 2 + 1]
            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 1fr', alignItems: 'center', gap: 6,
                padding: '4px 4px', borderRadius: 'var(--radius-sm)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.025)',
              }}>
                <span className="cl-mono" style={{ fontSize: 12.5, textAlign: 'center', color: 'var(--color-gray-muted)', fontWeight: 700 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-on-dark)', padding: '4px 6px' }}>{w?.san ?? ''}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-on-dark)', padding: '4px 6px' }}>{b?.san ?? ''}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const COLOR_CHOICES: { id: ColorChoice; label: string }[] = [
  { id: 'w', label: 'Brancas' },
  { id: 'b', label: 'Pretas' },
  { id: 'random', label: 'Sortear' },
]

/** Tela de escolha da faixa de força + cor, antes de a partida começar — mesma composição de
 *  "grade de cards centralizada" já usada no Treino de Aberturas (`OpeningTrainerView.tsx`)
 *  pra escolher a abertura, reaproveitada aqui pro mesmo tipo de decisão (escolher 1 de N antes
 *  de entrar numa tela cheia). */
function LevelSelectScreen({ levels, isEngineReady, onStart }: {
  levels: BotLevel[]
  isEngineReady: boolean
  onStart: (level: BotLevel, color: 'w' | 'b') => void
}) {
  const [colorChoice, setColorChoice] = useState<ColorChoice>('random')

  function pick(level: BotLevel) {
    const color = colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice
    onStart(level, color)
  }

  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 'calc(100vh - 20px)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 4px 40px' }}>
        <div>
          <div className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Jogar contra a Capivara</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>
            Escolha a faixa de força e a cor — o motor (Stockfish, rodando no seu navegador) joga
            com a força ajustada pra faixa escolhida, sempre em tempo real.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-gray-muted)' }}>Suas peças:</span>
          {COLOR_CHOICES.map((c) => (
            <button
              key={c.id}
              onClick={() => setColorChoice(c.id)}
              className={`cl-btn cl-btn-sm${colorChoice === c.id ? ' cl-btn-selected' : ''}`}
              style={{ width: 'auto', height: 'auto', padding: '7px 14px', fontSize: 12.5 }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {!isEngineReady && (
          <p style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>Carregando o motor…</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {levels.map((level) => (
            <LevelCard key={level.id} level={level} disabled={!isEngineReady} onSelect={() => pick(level)} />
          ))}
        </div>
      </div>
    </div>
  )
}

function LevelCard({ level, disabled, onSelect }: { level: BotLevel; disabled: boolean; onSelect: () => void }) {
  return (
    <div className="cl-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, borderColor: 'color-mix(in srgb, ' + level.color + ' 35%, var(--color-gray-border))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={capybaraAvatarStyle(44, level.color)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="cl-display" style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-on-dark)', display: 'block', lineHeight: 1.25 }}>
            {level.label}
          </span>
          <span className="cl-mono" style={{ fontSize: 11.5, fontWeight: 700, color: level.color }}>Elo ~{level.elo}</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.4, flex: 1 }}>{level.blurb}</p>
      <button onClick={onSelect} disabled={disabled} className="cl-btn cl-btn-accent" style={{ width: '100%', padding: '8px 0', fontSize: 12.5 }}>
        Jogar
      </button>
    </div>
  )
}
