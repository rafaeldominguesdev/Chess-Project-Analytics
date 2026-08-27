import { useState } from 'react'
import type { CSSProperties, KeyboardEvent, RefCallback } from 'react'
import { Chess } from 'chess.js'
import { usePlayVsBot } from '../../hooks/usePlayVsBot'
import type { BotLevel } from '../../analysis/botLevels'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from '../Board/ChessBoard'

interface PlayVsBotViewProps {
  boardWidth: number
  containerRef: RefCallback<HTMLDivElement>
}

// Retratos DEDICADOS por faixa (pedido direto do usuário: "vou pedir pro manus criar uma logo
// pra cada nível") — substitui a técnica antiga de recorte/zoom numa ÚNICA imagem (`hero-bg.png`)
// que esta função usava antes. O estilo de arte dessas 6 imagens (cartoon/vetorial, personagem
// com camiseta) é diferente da mascote oficial (pintura/foto-realista, sem roupa) usada no resto
// do site (Home, herói desta mesma tela) — confirmado explicitamente com o usuário que essa
// mudança de estilo vale só pra estes 6 selos de faixa, não pra mascote oficial em geral. Ordem
// do array bate com a ordem de `BOT_LEVELS` (mais fraca .. mais forte); a progressão de
// expressão (distraída → focada → intensa) já vem das próprias imagens.
const TIER_AVATARS = [
  '/level-filhote.png',
  '/level-curiosa.png',
  '/level-aprendiz.png',
  '/level-experiente.png',
  '/level-veterana.png',
  '/level-mestra.png',
]

function capybaraAvatarStyle(width: number, tierIndex: number): CSSProperties {
  const src = TIER_AVATARS[tierIndex] ?? TIER_AVATARS[0]
  // "Termômetro" visual: faixas fracas ficam mais foscas/claras (como se ainda estivesse
  // distraída), faixas fortes mais saturadas/nítidas — reforça a progressão de força ao primeiro
  // olhar, sem depender só de diferenciar 6 tons de azul quase iguais.
  const t = tierIndex / (TIER_AVATARS.length - 1) // 0 (mais fraca) .. 1 (mais forte)
  const saturate = 45 + t * 65
  const brightness = 0.92 + t * 0.14
  const contrast = 96 + t * 18
  return {
    // Foto quadradinha com contorno cinza neutro (pedido direto do usuário: "tira esse
    // círculo... outline cinza", depois "foto quadradinha") — não mais avatar circular com anel
    // colorido por faixa; a progressão de força agora só pela `StrengthPips`/Elo ao lado, e o
    // nome vira legenda embaixo da foto (ver `LevelRow`), não mais só dentro do card ao lado.
    width,
    height: width,
    borderRadius: 'var(--radius-sm)',
    flexShrink: 0,
    backgroundImage: `url(${src})`,
    // Imagem inteira aparecendo, sem corte (pedido direto: "ageita a imagem ficar 100%
    // aparecendo") — a caixa é quadrada e a arte de origem também é quadrada (1920×1920), então
    // 100% mostra o retrato inteiro encaixado exato, sem sobrar nem cortar nada.
    backgroundSize: '100%',
    backgroundPosition: 'center',
    filter: `saturate(${saturate}%) brightness(${brightness}) contrast(${contrast}%)`,
    border: '1px solid var(--color-gray-border)',
    boxShadow: '0 2px 10px -3px rgba(0, 0, 0, 0.6)',
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
      <div style={capybaraAvatarStyle(40, tierIndex)} />
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

/** Única faixa marcada como "Ponto de partida" na grade — não é a mais fraca nem a mais forte, é
 *  a única cujo `level.color` já é `var(--color-blue-bright)` (o único acento interativo do app).
 *  Marcar essa faixa não mistura o canal de identidade-de-faixa (verde→azuis→vermelho) com o
 *  canal de acento-interativo — é uma coincidência dos dados que torna essa a opção de menor
 *  risco pra destacar sem inventar uma cor nova só pro selo. */
const RECOMMENDED_TIER_INDEX = 3

/** Tela de escolha da faixa de força + cor, antes de a partida começar — v2, reconceito completo
 *  (a v1 foi rejeitada pelo usuário por inteiro: "não gostei, odeio"). A capivara agora é um
 *  herói grande e confiante com respiração sutil (`.cl-playbot-hero-v2`, reaproveita
 *  `@keyframes cl-hero-breathe` da Home), o seletor de cor virou um controle segmentado de
 *  verdade (`.cl-inset` recessado + `.cl-btn-selected`), e as 6 faixas viram uma lista (`.cl-ladder`)
 *  com foto quadrada + legenda por faixa em vez de uma grade de cards idênticos. */
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
      <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px 40px' }}>
        <div className="cl-playbot-hero-v2">
          <div>
            {/* Entrada em cascata (`.cl-stat-pop`, mesmo pop+fade já usado em `StatsGrid.tsx`) —
                cada bloco de texto/controle aparece em sequência em vez do card surgir de uma vez.
                Apurado a pedido direto ("melhore tudo, estilo apple design"): tirado o peão
                decorativo girando e a textura de linhas que tinham entrado numa rodada anterior —
                ornamento demais compete com a própria foto, que devia carregar o drama visual
                sozinha; contraste de escala mais forte no título (34px, ao invés de 29) pra
                compensar sem precisar de enfeite extra. */}
            <span className="cl-mono cl-stat-pop" style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-blue-light)' }}>
              Modo de jogo
            </span>
            <div className="cl-display cl-stat-pop" style={{ fontSize: 34, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.05, letterSpacing: '-0.015em', marginTop: 5, animationDelay: '70ms' }}>
              Jogar contra a <span style={{ color: 'var(--color-blue-bright)' }}>Capivara</span>
            </div>
            <div className="cl-stat-pop" style={{ fontSize: 13.5, color: 'var(--color-gray-muted)', marginTop: 8, maxWidth: 420, lineHeight: 1.45, animationDelay: '130ms' }}>
              Motor real (Stockfish, no seu navegador), força ajustada pra faixa escolhida.
            </div>
          </div>
          <div className="cl-stat-pop" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', animationDelay: '190ms' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-gray-muted)' }}>Suas peças:</span>
            {/* Cápsula (raio 999px via `.cl-color-picker` em index.css) — geometria de pílula,
                referência de estudo do "estilo apple" pedido, não cópia de marca. */}
            <div className="cl-inset cl-color-picker" style={{ display: 'inline-flex', padding: 4, gap: 4 }}>
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColorChoice(c.id)}
                  className={`cl-btn cl-btn-sm${colorChoice === c.id ? ' cl-btn-selected' : ''}`}
                  style={{ width: 'auto', height: 'auto', padding: '7px 16px', fontSize: 12.5 }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!isEngineReady && (
          <p style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>Carregando o motor…</p>
        )}

        <div className="cl-ladder">
          {levels.map((level, tierIndex) => (
            <LevelRow
              key={level.id}
              level={level}
              tierIndex={tierIndex}
              totalTiers={levels.length}
              disabled={!isEngineReady}
              recommended={tierIndex === RECOMMENDED_TIER_INDEX}
              onSelect={() => pick(level)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Linha de faixa (era `LevelCard`, agora uma linha de lista, não um card de grade — ver comentário
 *  de `.cl-ladder` em `index.css`). O avatar (foto quadrada + legenda do nome embaixo) mora FORA
 *  do `.cl-card` da linha, numa coluna própria (`.cl-ladder-avatar-col`). Mantém da v1: linha
 *  inteira clicável (`role="button"`/teclado, botão "Jogar" interno como `<span>` decorativo pra
 *  evitar elemento interativo aninhado), selo "Ponto de partida" na faixa
 *  `RECOMMENDED_TIER_INDEX`. */
function LevelRow({ level, tierIndex, totalTiers, disabled, recommended, onSelect }: {
  level: BotLevel; tierIndex: number; totalTiers: number; disabled: boolean; recommended: boolean; onSelect: () => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div className="cl-ladder-item cl-row-in" style={{ animationDelay: `${40 + tierIndex * 35}ms` }}>
      <div className="cl-ladder-avatar-col">
        <div style={capybaraAvatarStyle(62, tierIndex)} />
        {/* Legenda com o nome curto da faixa embaixo da foto (pedido direto do usuário: "foto
            quadradinha só nome embaixo") — só a palavra da faixa, sem repetir "Capivara" (já
            óbvio pelo contexto da tela inteira), a coluna é estreita demais pro nome completo. */}
        <span className="cl-mono" style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--color-gray-muted)', textAlign: 'center', lineHeight: 1.2, marginTop: 4 }}>
          {level.label.replace('Capivara ', '')}
        </span>
      </div>
      <div
        className={`cl-card cl-ladder-row${recommended ? ' cl-ladder-row-recommended' : ''}${disabled ? ' cl-ladder-row-disabled' : ''}`}
        style={{
          padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14,
          position: 'relative', overflow: 'hidden',
          borderColor: 'color-mix(in srgb, ' + level.color + ' 35%, var(--color-gray-border))',
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={`Jogar contra ${level.label}, Elo ${level.elo}`}
        onClick={disabled ? undefined : onSelect}
        onKeyDown={handleKeyDown}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="cl-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.25 }}>
              {level.label}
            </span>
            <span className="cl-mono" style={{ fontSize: 12.5, fontWeight: 700, color: level.color }}>Elo ~{level.elo}</span>
            <StrengthPips tierIndex={tierIndex} total={totalTiers} color={level.color} />
            {recommended && (
              <span aria-hidden style={{
                fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                background: 'color-mix(in srgb, var(--color-blue-bright) 20%, var(--color-bg-panel))',
                border: '1px solid var(--color-blue-bright)', color: 'var(--color-blue-light)',
              }}>
                Ponto de partida
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.4, marginTop: 3 }}>{level.blurb}</p>
        </div>
        <span aria-hidden className="cl-btn cl-btn-accent" style={{ width: 'auto', padding: '8px 20px', fontSize: 12.5, pointerEvents: 'none', flexShrink: 0 }}>
          Jogar
        </span>
      </div>
    </div>
  )
}
