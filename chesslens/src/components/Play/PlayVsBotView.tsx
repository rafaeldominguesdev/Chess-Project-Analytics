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
// capivara é a mascote única do produto, um desenho novo por faixa está fora de cogitação. Mas
// pedido direto do usuário depois de testar ("o mascote é só imagem com zoom") era exatamente o
// problema: as 6 faixas usavam o MESMO recorte, só trocando a cor do anel. Agora o TAMANHO do
// recorte varia por faixa, girando ao redor do mesmo ponto fixo (aprox. os olhos/focinho, centro
// do recorte original `{ x: 260, y: 80, size: 900 }` ainda usado por `CoachComment.tsx`) — faixas
// fracas usam um recorte mais aberto (mais "olhar distraído", contexto ao redor), faixas fortes um
// recorte mais fechado, quase só os olhos (mais "focada"). Ainda é 100% a mesma imagem/arte, só
// matemática de crop diferente por índice de faixa (0 = mais fraca .. 5 = mais forte).
const CAPY_IMG = { width: 2560, height: 1440 }
const CAPY_FACE_CENTER = { x: 710, y: 530 }
// Faixa de tamanhos mais conservadora do que a 1ª tentativa (que ia até 650px) — testado ao vivo,
// um recorte MUITO fechado ao redor do mesmo centro fixo cortava o rosto de um jeito estranho (só
// um olho, cortando perto da orelha) porque a capivara está em 3/4 de perfil, não de frente — o
// "centro do rosto" não é simétrico o bastante pra aguentar um crop extremo sem descentralizar.
// Essa faixa (1050 a 780) mantém a mesma composição bem enquadrada do recorte original (900,
// ainda usado por `CoachComment.tsx`) em todas as faixas, só variando o zoom moderadamente.
const TIER_CROP_SIZES = [1050, 980, 920, 870, 820, 780]

function capybaraAvatarStyle(size: number, level: BotLevel, tierIndex: number): CSSProperties {
  const cropSize = TIER_CROP_SIZES[tierIndex] ?? 900
  const cropX = CAPY_FACE_CENTER.x - cropSize / 2
  const cropY = CAPY_FACE_CENTER.y - cropSize / 2
  const scale = size / cropSize
  // "Termômetro" visual além da cor do anel: faixas fracas ficam mais foscas/claras (como se
  // ainda estivesse distraída), faixas fortes mais saturadas/nítidas — reforça a progressão de
  // força ao primeiro olhar, sem depender só de diferenciar 6 tons de azul quase iguais.
  const t = tierIndex / (TIER_CROP_SIZES.length - 1) // 0 (mais fraca) .. 1 (mais forte)
  const saturate = 45 + t * 65
  const brightness = 0.92 + t * 0.14
  const contrast = 96 + t * 18
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundImage: 'url(/hero-bg.png?v=2)',
    backgroundSize: `${CAPY_IMG.width * scale}px ${CAPY_IMG.height * scale}px`,
    backgroundPosition: `${-cropX * scale}px ${-cropY * scale}px`,
    filter: `saturate(${saturate}%) brightness(${brightness}) contrast(${contrast}%)`,
    border: `2px solid ${level.color}`,
    // Anel duplo (borda sólida + halo translúcido que cresce um pouco por faixa) em vez de um
    // contorno único fino — lê mais como "medalha"/emblema do que como avatar de perfil genérico.
    boxShadow: `0 0 0 3px color-mix(in srgb, ${level.color} ${16 + t * 24}%, transparent), 0 2px 10px -3px rgba(0,0,0,0.65)`,
  }
}

/** Fileira de pontos indicando a posição da faixa dentro da progressão total (1 de 6 .. 6 de 6) —
 *  pista visual adicional além da cor do anel, que sozinha é difícil de escanear rápido entre 6
 *  tons (2 deles são variações de azul bem próximas). Decorativo (a mesma informação já está no
 *  Elo em texto/`cl-mono` ao lado), por isso os pontos individuais são `aria-hidden` e só o
 *  conjunto carrega um `aria-label` com a leitura por extenso. */
function StrengthPips({ tierIndex, total, color }: { tierIndex: number; total: number; color: string }) {
  return (
    <span
      style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}
      aria-label={`Força ${tierIndex + 1} de ${total}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: i <= tierIndex ? color : 'var(--color-gray-border)',
          }}
        />
      ))}
    </span>
  )
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
  const tierIndex = level ? levels.findIndex((l) => l.id === level.id) : -1

  return (
    <>
      <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
        <div style={{ width: cardWidth }}>
          <BotStatusCard level={level} tierIndex={tierIndex} totalTiers={levels.length} isBotThinking={isBotThinking} botToMove={botToMove && !gameOver} />
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
          width: cardWidth, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, rowGap: 8,
          // Mesmo raciocínio de BoardControls.tsx: "Desistir" + "Escolher outra faixa" (rótulo
          // longo) podem passar da largura mínima de um `cardWidth` estreito de celular.
          flexWrap: 'wrap',
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

/** Card do cabeçalho durante a partida — avatar da capivara recortado/filtrado pela faixa
 *  escolhida (ver `capybaraAvatarStyle`) + rótulo/Elo/pips de força + indicação de "pensando"
 *  (pedido explícito da tarefa: precisa ficar claro quando o motor está calculando a resposta). */
function BotStatusCard({ level, tierIndex, totalTiers, isBotThinking, botToMove }: {
  level: BotLevel | null; tierIndex: number; totalTiers: number; isBotThinking: boolean; botToMove: boolean
}) {
  if (!level || tierIndex < 0) return null
  return (
    <div className="cl-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px' }}>
      <div style={capybaraAvatarStyle(40, level, tierIndex)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Elo <span className="cl-mono">{level.elo}</span></span>
          <StrengthPips tierIndex={tierIndex} total={totalTiers} color={level.color} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="cl-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>Jogar contra a Capivara</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', marginTop: 2 }}>
              Escolha a faixa de força e a cor — o motor (Stockfish, rodando no seu navegador) joga
              com a força ajustada pra faixa escolhida, sempre em tempo real.
            </div>
          </div>
          {/* Recorte mais aberto da MESMA arte oficial (`hero-bg.png`, a mesma usada na Home e nos
              avatares circulares acima) — pedido do usuário depois de ver uma referência de
              "capivara de corpo inteiro, sentada" que ele mesmo mandou (um clipart genérico com
              marca d'água, que NÃO foi usado — descaracterizaria a mascote oficial). Sem
              ferramenta de geração de imagem não dá pra pintar uma ilustração nova no estilo do
              hero; a alternativa real foi um recorte diferente do MESMO arquivo, largo o
              suficiente pra mostrar tronco/braços/colo (não só o rosto, como os avatares de
              faixa acima) segurando a lupa ao lado do tabuleiro — a mesma pose de "sentada
              jogando" que ele queria, com a arte 100% oficial. `cl-playbot-hero-thumb` esconde
              esse recorte em telas estreitas (ver index.css) pra não espremer o texto ao lado. */}
          <div aria-hidden className="cl-playbot-hero-thumb" />
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
          {levels.map((level, tierIndex) => (
            <LevelCard
              key={level.id}
              level={level}
              tierIndex={tierIndex}
              totalTiers={levels.length}
              disabled={!isEngineReady}
              onSelect={() => pick(level)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Card de faixa — redesenhado (pedido direto do usuário: "não gostei do menu... a estética dos
 *  cards"). Mudanças em relação à versão anterior: (1) faixa colorida fina no topo do card, além
 *  da borda fina já existente — a borda sozinha ficava sutil demais pra diferenciar 6 faixas num
 *  relance; (2) avatar maior com recorte/filtro progressivo por faixa (`capybaraAvatarStyle`),
 *  não mais o mesmo recorte fixo; (3) Elo em `cl-mono` colorido pela faixa + pips de força ao
 *  lado, pra comunicar a progressão sem depender só de ler o número; (4) hierarquia: nome →
 *  Elo/força → frase → CTA, nessa ordem de leitura de cima pra baixo. */
function LevelCard({ level, tierIndex, totalTiers, disabled, onSelect }: {
  level: BotLevel; tierIndex: number; totalTiers: number; disabled: boolean; onSelect: () => void
}) {
  return (
    <div
      className="cl-card"
      style={{
        padding: 14, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', overflow: 'hidden',
        borderColor: 'color-mix(in srgb, ' + level.color + ' 35%, var(--color-gray-border))',
      }}
    >
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: level.color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={capybaraAvatarStyle(52, level, tierIndex)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="cl-display" style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text-on-dark)', display: 'block', lineHeight: 1.25 }}>
            {level.label}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="cl-mono" style={{ fontSize: 12.5, fontWeight: 700, color: level.color }}>Elo ~{level.elo}</span>
            <StrengthPips tierIndex={tierIndex} total={totalTiers} color={level.color} />
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.4, flex: 1 }}>{level.blurb}</p>
      <button onClick={onSelect} disabled={disabled} className="cl-btn cl-btn-accent" style={{ width: '100%', padding: '9px 0', fontSize: 12.5 }}>
        Jogar
      </button>
    </div>
  )
}
