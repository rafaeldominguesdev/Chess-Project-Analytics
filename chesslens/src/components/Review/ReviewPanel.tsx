import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import type { ClassifiedMove } from '../../analysis/types'
import type { GameInfo } from '../../types/chess.types'
import type { StockfishEval } from '../../hooks/useStockfish'
import { EvalGraph } from '../Analysis/EvalGraph'
import { PlayerComparison } from '../Analysis/PlayerComparison'
import { MoveList } from '../Analysis/MoveList'
import { Panel } from '../Panel'
import { CoachComment } from './CoachComment'
import { BoardControls } from '../Board/BoardControls'
import { PlayMoveIcon } from '../Board/icons'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useTheme } from '../../contexts/ThemeContext'
import { BOARD_THEMES } from '../../utils/boardThemes'
import { renderPositionSvg } from '../../utils/positionSvg'
import { annotatePgnWithNags } from '../../analysis/pgnExport'
import { findCriticalPosition } from '../../analysis/criticalPosition'

// Baixa um arquivo de texto via Blob + <a download> — mesmo mecanismo que Configurações → Dados
// já usa pro backup em JSON (`SettingsPanel.tsx`), só generalizado pra aceitar qualquer mime type
// (aqui: PGN e SVG). Não existia um helper compartilhado pra isso ainda, então segue o mesmo
// padrão local em vez de inventar um mecanismo novo.
function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Nome de arquivo seguro a partir de um texto livre (username de plataforma pode ter espaço,
// acento etc.) — troca tudo que não é letra/número/hífen por "-".
function slugForFilename(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'partida'
}

function DownloadIcon(props: { width?: number; height?: number }) {
  return (
    <svg width={props.width ?? 13} height={props.height ?? 13} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="4.5" y="18.5" width="15" height="2.2" rx="1" />
      <path d="M12 3v12.2M12 15.2 7 10.3M12 15.2l5-4.9" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Quantos lances de cada linha do motor mostrar como texto no painel "Motor" (prévia curta, não
// a variante inteira) — mesma constante/princípio do painel equivalente do Tabuleiro de análise
// livre (`AnalysisBoardView.tsx`). Duplicado aqui de propósito (componente local, sem extrair
// um compartilhado) pra não gerar conflito com outros agentes trabalhando em paralelo.
const PV_PREVIEW_PLIES = 4

// Mesma formatação da etiqueta da barra de avaliação — `line.cp`/`.mate` já vêm relativos às
// brancas (useStockfish.ts converte na hora, usando o lado a jogar de quando a busca foi pedida,
// não o da posição que a revisão mostra agora — os dois podem divergir por vários segundos numa
// busca em profundidade 18, era isso que fazia a avaliação "mudar que nem louca" ao navegar).
function formatLineEval(line: StockfishEval): string {
  if (line.mate !== null) return `#${Math.abs(line.mate)}`
  const whiteCp = line.cp ?? 0
  if (whiteCp > 0) return `+${(whiteCp / 100).toFixed(1)}`
  if (whiteCp < 0) return (whiteCp / 100).toFixed(1)
  return '0.0'
}

// Converte os primeiros lances (UCI, ex: "e2e4") de uma linha do motor pra SAN (ex: "e4"),
// jogando numa cópia da posição atual — só pra exibição, não afeta o tabuleiro real.
function pvToSan(fen: string, pv: string[], maxPlies: number): string[] {
  const game = new Chess(fen)
  const sans: string[] = []
  for (const uci of pv.slice(0, maxPlies)) {
    if (uci.length < 4) break
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined
    try {
      const move = game.move({ from, to, promotion })
      if (!move) break
      sans.push(move.san)
    } catch {
      break // linha do motor não bate mais com a posição atual (lance acabou de mudar) — ignora o resto
    }
  }
  return sans
}

/** Painel do motor — mesma apresentação do painel "Motor" do Tabuleiro de análise livre
 *  (`AnalysisBoardView.tsx`): até 3 melhores linhas como texto (eval + prévia de lances em SAN)
 *  e o estado calculando/parado do motor, agora pra posição atual da revisão de partida (a
 *  posição correspondente a `currentMoveIndex`), não só pro tabuleiro de análise livre. */
function EnginePanel({
  fen, lines, isAnalyzing,
}: {
  fen: string
  lines: (StockfishEval | null)[]
  isAnalyzing: boolean
}) {
  const previews = lines.map((line) => (line ? pvToSan(fen, line.pv, PV_PREVIEW_PLIES) : []))
  const depth = lines[0]?.depth

  return (
    <div className="cl-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-gray-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Motor
        </span>
        <span aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--color-gray-muted)' }}>
          <span
            aria-hidden
            className={isAnalyzing ? 'cl-dot-pulse' : undefined}
            style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: isAnalyzing ? 'var(--color-blue-bright)' : 'var(--color-success)',
            }}
          />
          {isAnalyzing ? 'Calculando' : depth ? `Profundidade ${depth}` : 'Parado'}
        </span>
      </div>

      {!lines[0] ? (
        <p style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>Aguardando primeira análise...</p>
      ) : (
        // Sempre desenha as `lines.length` linhas (3), mesmo antes do engine preencher todas —
        // ver o mesmo comentário em AnalysisBoardView.tsx (painel equivalente do Tabuleiro de
        // análise livre): evita o painel "piscar" de 3 pra 1-2 linhas ao trocar de posição.
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, opacity: line ? (i === 0 ? 1 : 0.65) : 0.35 }}>
              <span className="cl-mono" style={{
                fontSize: 12, fontWeight: 800, minWidth: 36, flexShrink: 0,
                color: i === 0 ? 'var(--color-text-on-dark)' : 'var(--color-gray-muted)',
              }}>
                {line ? formatLineEval(line) : '···'}
              </span>
              <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line ? (previews[i]?.join(' ') || '—') : 'calculando…'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Overlay de tela cheia mostrado enquanto o Stockfish ainda está analisando a partida em segundo
 * plano, antes de "Começar a Revisão" — pedido direto do usuário: "não vá direto, apareça um
 * número aumentando até 100% no meio da tela, tudo em volta com um blur, não fique parado, faça
 * bem bonito, com motion". Antes disso a tela de resumo já mostrava os números de precisão/
 * classificação se populando sozinhos por baixo — funcional, mas parecia "quebrado" (números
 * mudando toda hora sem contexto, mais perceptível agora que a análise ficou mais profunda/lenta,
 * ver `useGameAnalysis.ts`). O overlay cobre a tela inteira (não só esse painel lateral) com um
 * blur de fundo, e some sozinho assim que a análise termina, revelando o resumo já pronto.
 *
 * Continua montado (só com opacidade 0) por um instante depois que `progress` vira `null` — dá
 * tempo da transição de saída rodar em vez de sumir seco, e mantém o número/anel travado em 100%
 * durante essa saída (guardado em `lastProgressRef`) em vez de zerar de repente.
 */
function AnalysisLoadingOverlay({
  progress, onSkip,
}: {
  progress: { done: number; total: number } | null
  onSkip: () => void
}) {
  const reducedMotion = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(!!progress)
  const [visible, setVisible] = useState(false)
  const [displayPct, setDisplayPct] = useState(0)
  const lastProgressRef = useRef<{ done: number; total: number }>({ done: 0, total: 0 })
  if (progress) lastProgressRef.current = progress
  const shown = progress ?? lastProgressRef.current
  const targetPct = shown.total > 0 ? Math.min(100, (shown.done / shown.total) * 100) : 0

  useEffect(() => {
    if (progress) {
      setMounted(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = setTimeout(() => setMounted(false), 320)
    return () => clearTimeout(t)
  }, [progress])

  // Conta até o alvo suavemente em vez de saltar de vez a cada posição classificada — em
  // profundidade 18 cada posição pode levar alguns segundos, sem isso o número fica "parado"
  // a maior parte do tempo e só pula de repente (o oposto de "não fique parado", pedido do usuário).
  useEffect(() => {
    if (reducedMotion) { setDisplayPct(targetPct); return }
    let raf: number
    const step = () => {
      setDisplayPct((prev) => {
        if (prev >= targetPct) return prev
        const next = prev + Math.max(0.4, (targetPct - prev) * 0.08)
        return next >= targetPct ? targetPct : next
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [targetPct, reducedMotion])

  if (!mounted) return null

  const shownPct = Math.round(displayPct)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - displayPct / 100)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(10,10,11,0.62)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.32s var(--ease-snap)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(10px)',
          transition: 'transform 0.32s var(--ease-hinge)',
        }}
      >
        <div style={{ position: 'relative', width: 156, height: 156 }}>
          {!reducedMotion && (
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: -22, borderRadius: '50%',
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(232,169,60,0.55) 16%, transparent 38%)',
                filter: 'blur(11px)',
                animation: 'cl-analysis-spin 2.4s linear infinite',
              }}
            />
          )}
          <svg width={156} height={156} style={{ position: 'relative', transform: 'rotate(-90deg)' }}>
            <circle cx={78} cy={78} r={radius} fill="none" stroke="var(--color-gray-border)" strokeWidth={9} />
            <circle
              cx={78} cy={78} r={radius} fill="none"
              stroke="var(--color-blue-bright)" strokeWidth={9} strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{
                transition: reducedMotion ? 'none' : 'stroke-dashoffset 0.15s linear',
                filter: 'drop-shadow(0 0 10px rgba(232,169,60,0.6))',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="cl-mono" style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text-on-dark)', letterSpacing: -0.5 }}>
              {shownPct}%
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p className="cl-display" style={{ fontSize: 18, color: 'var(--color-text-on-dark)', marginBottom: 4 }}>
            Analisando com o Stockfish
          </p>
          <p className="cl-mono" style={{ fontSize: 12, color: 'var(--color-gray-muted)' }}>
            {shown.done} de {shown.total} posições · profundidade 18
          </p>
        </div>

        <button
          onClick={onSkip}
          className="cl-btn cl-btn-ghost"
          style={{ fontSize: 11.5, padding: '6px 14px', color: 'var(--color-gray-muted)' }}
        >
          Pular e ver mesmo assim
        </button>
      </div>

      {/* keyframe local do brilho girando — não mexe em index.css, que é de outro agente */}
      <style>{`@keyframes cl-analysis-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

interface ReviewPanelProps {
  gameInfo: GameInfo | null
  /** false = tela de resumo (fotos + precisão + White vs Black); true = lances com avaliação. */
  reviewStarted: boolean
  /** PGN cru da partida carregada (`pgnRef.current` em App.tsx) — usado só pelo export de PGN
   *  anotado (Sprint 5), pra inserir NAGs sem reescrever o resto do PGN original. */
  pgn: string
  moves: ClassifiedMove[]
  currentMoveIndex: number
  onGoTo: (index: number) => void
  progress: { done: number; total: number } | null
  evals: number[]
  whiteAvatar?: string | null
  blackAvatar?: string | null
  onStartReview?: () => void
  isLoaded: boolean
  onFirst?: () => void
  onPrev?: () => void
  onNext?: () => void
  onLast?: () => void
  onFlipBoard?: () => void
  /** FEN da posição atual da revisão (a de `currentMoveIndex`) — usada pelo painel "Motor". */
  currentFen: string
  /** Até 3 melhores linhas do Stockfish, calculadas ao vivo pra `currentFen` (multipv). */
  engineLines: (StockfishEval | null)[]
  /** Se o motor está calculando a posição atual (vs. parado/pronto) — mesmo indicador do
   *  Tabuleiro de análise livre. */
  engineIsAnalyzing: boolean
  /** "Jogar a partir daqui" (Sprint 4) — leva `currentFen` pro Tabuleiro de análise livre, mesmo
   *  mecanismo que o Editor de Posição já usa (`pendingBoardFen` em App.tsx). Opcional só pra não
   *  quebrar quem já usa `ReviewPanel` sem essa ação. */
  onPlayFromHere?: (fen: string) => void
  /** Retry inline (Sprint 5): true quando o lance atual é mistake/miss/blunder e ainda não foi
   *  revelado/resolvido — o tabuleiro central (fora deste painel, em App.tsx) já está mostrando
   *  `fenBefore` e interativo; aqui só controla o que o `CoachComment` mostra (desafio vs.
   *  comentário) e o botão de revelar. */
  retryActive?: boolean
  retryWrongAttempts?: number
  onRetryReveal?: () => void
}

export function ReviewPanel({
  gameInfo, reviewStarted, pgn,
  moves, currentMoveIndex, onGoTo, progress, evals,
  whiteAvatar, blackAvatar, onStartReview,
  isLoaded, onFirst, onPrev, onNext, onLast, onFlipBoard,
  currentFen, engineLines, engineIsAnalyzing, onPlayFromHere,
  retryActive, retryWrongAttempts, onRetryReveal,
}: ReviewPanelProps) {
  const whiteName = gameInfo?.white ?? 'Brancas'
  const blackName = gameInfo?.black ?? 'Pretas'
  const { theme } = useTheme()

  // Só usado pelo botão "Pular" do overlay de análise — guarda o `total` da análise que a pessoa
  // decidiu não esperar, pra saber que essa dispensa vale só pra essa partida (a próxima tem um
  // `total` de posições diferente quase sempre, então o overlay volta a aparecer normalmente).
  const [dismissedTotal, setDismissedTotal] = useState<number | null>(null)

  // Export "PGN anotado com NAG + imagem da posição crítica" (Sprint 5, Polimento). Baixa dois
  // arquivos: o PGN original com `$N` inserido depois de cada lance classificado (preserva
  // headers/comentários — ver `pgnExport.ts`), e um SVG desenhado com as cores do tema de
  // tabuleiro ATUAL do usuário (`chesslens-design`: nunca paleta hardcoded) da posição mais
  // decisiva da partida (mate, se terminou assim; senão o lance com maior queda de chance de
  // vitória — `criticalPosition.ts`). Não trava se a partida ainda não estiver 100% analisada:
  // `annotatePgnWithNags` só anota o que já tem `classification`.
  const handleExportAnnotatedPgn = () => {
    const slug = `${slugForFilename(whiteName)}-vs-${slugForFilename(blackName)}`
    const annotated = annotatePgnWithNags(pgn, moves)
    downloadTextFile(`chesscap-${slug}.pgn`, annotated, 'application/x-chess-pgn')

    const critical = findCriticalPosition(moves)
    if (critical) {
      const boardTheme = BOARD_THEMES[theme.boardTheme]
      const svg = renderPositionSvg(critical.fen, boardTheme, {
        highlightFrom: critical.move.from,
        highlightTo: critical.move.to,
        caption: critical.label,
      })
      downloadTextFile(`chesscap-${slug}-posicao-critica.svg`, svg, 'image/svg+xml')
    }
  }

  return (
    <>
      {!reviewStarted && (
        <AnalysisLoadingOverlay
          progress={progress && progress.total === dismissedTotal ? null : progress}
          onSkip={() => setDismissedTotal(progress?.total ?? null)}
        />
      )}
      <aside className={`cl-tool-aside${reviewStarted ? ' cl-tool-aside-pinned-footer' : ''}`}>
      {/* A navegação (BoardControls) fica FORA da área rolável, como rodapé fixo do painel —
          pedido direto do usuário ("fixa pra não ficar mexendo... cortou as opções de pular
          lance"). Antes ela era só o último item dentro do mesmo `<div>` rolável que Coach +
          Motor + Avaliação + Lances — em qualquer tela onde essa pilha inteira passasse da
          altura da janela (`.cl-tool-aside-scroll` tem `max-height: calc(100vh - 20px)` e rola
          por dentro em telas largas, ver index.css), os botões de navegação ficavam abaixo da
          dobra, exigindo rolar o painel pra alcançá-los — e a altura total mudava a cada lance
          (o cartão do coach só aparece em erros, o painel do motor variava), fazendo a posição
          de rolagem necessária "pular" a cada clique. Com a navegação fixa fora do scroll, ela
          está sempre visível, na mesma posição, não importa quanto o conteúdo acima cresça.
          A classe extra `cl-tool-aside-pinned-footer` (ver index.css) dá ao `<aside>` uma altura
          FIXA em telas largas — sem isso, o rodapé só somaria altura por cima do teto do scroll,
          empurrando o próprio rodapé pra fora da tela de novo, sem chance de rolar até ele. */}
      <div
        className="cl-tool-aside-scroll"
        style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          paddingRight: 2,
        }}
      >
        {!reviewStarted ? (
          <div key="summary" className="cl-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Tela de resumo: fotos lado a lado + precisão + comparação por categoria. O
                Stockfish já está analisando em segundo plano — enquanto não termina, o overlay
                de tela cheia (`AnalysisLoadingOverlay`, acima) cobre esse card, então esses
                números só ficam visíveis já com os valores finais. */}
            <div className="cl-card" style={{ padding: 13 }}>
              <PlayerComparison
                moves={moves}
                whiteName={whiteName}
                blackName={blackName}
                whiteAvatar={whiteAvatar}
                blackAvatar={blackAvatar}
                whiteElo={gameInfo?.whiteElo}
                blackElo={gameInfo?.blackElo}
                result={gameInfo?.result}
                termination={gameInfo?.termination}
              />
            </div>

            <button
              onClick={onStartReview}
              className="cl-btn cl-btn-accent"
              style={{ marginTop: 4, padding: '13px 0', fontSize: 14.5 }}
            >
              Começar a Revisão
            </button>
          </div>
        ) : (
          <div key="review" className="cl-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Tela de revisão: comentário do coach + motor + gráfico + lances com avaliação por lance */}
            <div className="cl-row-in" style={{ animationDelay: '10ms' }}>
              <CoachComment
                move={currentMoveIndex >= 0 ? moves[currentMoveIndex] ?? null : null}
                retry={retryActive ? { wrongAttempts: retryWrongAttempts ?? 0, onReveal: onRetryReveal ?? (() => {}) } : null}
              />
            </div>

            <div className="cl-row-in" style={{ animationDelay: '25ms' }}>
              <EnginePanel fen={currentFen} lines={engineLines} isAnalyzing={engineIsAnalyzing} />
            </div>

            <div className="cl-row-in" style={{ animationDelay: '45ms' }}>
              <Panel icon="📈" title="Avaliação" right={progress ? <span className="cl-mono" style={{ fontSize: 10, color: 'var(--color-gray-muted)' }}>{Math.round((progress.done / progress.total) * 100)}%</span> : undefined}>
                <EvalGraph evals={evals} currentPosition={currentMoveIndex + 1} onSeek={(i) => onGoTo(i - 1)} />
              </Panel>
            </div>

            <div className="cl-row-in" style={{ animationDelay: '80ms' }}>
              <Panel icon="📜" title="Lances" right={progress ? <span style={{ fontSize: 10, color: 'var(--color-gray-muted)' }}>analisando…</span> : undefined}>
                <MoveList moves={moves} currentMoveIndex={currentMoveIndex} onGoTo={onGoTo} />
              </Panel>
            </div>
          </div>
        )}
      </div>

      {reviewStarted && (
        <div style={{ paddingTop: 10, paddingRight: 2, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* "Jogar a partir daqui" (Sprint 4) — continua a partir de QUALQUER posição da revisão,
              não só do início. Usa `currentFen` (posição já resultante do lance selecionado, a
              mesma que o painel "Motor" acima analisa) e o mesmo mecanismo de `pendingBoardFen`
              que o Editor de Posição já usa pra abrir o Tabuleiro numa posição específica — ver
              `onAnalyze` em PositionEditorView.tsx / `onTogglePositionEditor` em App.tsx. Fora da
              área rolável, junto do rodapé de navegação, pra ficar sempre visível e associada à
              posição que a pessoa está vendo agora, sem precisar rolar o painel até ela. */}
          <button
            onClick={() => onPlayFromHere?.(currentFen)}
            disabled={!onPlayFromHere}
            className="cl-btn"
            style={{ width: '100%', padding: '9px 0', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <PlayMoveIcon width={13} height={13} />
            Jogar a partir daqui
          </button>
          <button
            onClick={handleExportAnnotatedPgn}
            disabled={!pgn}
            className="cl-btn cl-btn-ghost"
            style={{ width: '100%', padding: '9px 0', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <DownloadIcon />
            Exportar PGN anotado
          </button>
          <BoardControls
            isLoaded={isLoaded}
            currentMoveIndex={currentMoveIndex}
            totalMoves={moves.length}
            onFirst={onFirst}
            onPrev={onPrev}
            onNext={onNext}
            onLast={onLast}
            onFlip={onFlipBoard}
          />
        </div>
      )}
      </aside>
    </>
  )
}
