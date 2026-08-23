import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import {
  getGlobalOpeningTree, getOpeningFamilies, pickBestChild, pickWeightedChild,
} from '../utils/openingRepertoire'
import type { OpeningNode } from '../utils/openingRepertoire'
import { useMoveSound } from './useMoveSound'
import { useStockfish } from './useStockfish'
import { classifyMove, toWhiteCp } from '../utils/moveClassifier'
import type { ClassifiedMove } from '../types/chess.types'

export type Side = 'white' | 'black'

// 'picking'    → nenhuma família escolhida ainda, mostra a lista pra selecionar.
// 'your-turn'  → vez de quem treina jogar o lance de teoria.
// 'wrong'      → último lance tentado não é teoria conhecida pra essa família (já desfeito).
// 'their-turn' → "adversário" simulado está prestes a jogar (pausa curta antes do lance sozinho).
// 'done'       → linha acabou (saiu de teoria conhecida, ou bateu no limite de lances).
export type TrainerStatus = 'picking' | 'your-turn' | 'wrong' | 'their-turn' | 'done'

interface FamilyStats {
  attempts: number
  /** 0-100, média móvel entre sessões — não é um SM-2 de verdade (sem intervalo de repetição por
   *  enquanto), só um placar de "quão bem essa família+lado tem ido ultimamente" pra priorizar o
   *  que precisa de mais prática na lista de escolha. */
  mastery: number
  lastPracticed: number
}

const STATS_KEY = 'chesslens-opening-stats'
// Além desse número de lances por linha a sessão encerra sozinha — sessões mais curtas favorecem
// repetição espaçada de verdade (várias linhas curtas em vários dias > uma linha gigante uma vez).
const MAX_PLY = 24

// Genérico pros dois placares (família e variação) — mesmo par de leitura/escrita, só muda a
// chave do localStorage.
function loadJsonRecord(key: string): Record<string, FamilyStats> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveJsonRecord(key: string, value: Record<string, FamilyStats>) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* localStorage indisponível — ignora */ }
}

function statsKey(familyKey: string, side: Side): string {
  return `${familyKey}|${side}`
}

// Placar por VARIAÇÃO exata (não só por família) — pedido direto do usuário: o placar de família
// escondia se a pessoa já sabia bem uma variação específica ou não ("não aprende variáveis").
// Só nome+ECO+lado (mesma FamilyStats, chave mais fina) — mesma aproximação honesta, sem
// intervalo de repetição de verdade.
const LINE_STATS_KEY = 'chesslens-opening-line-stats'

function lineStatsKey(eco: string, name: string, side: Side): string {
  return `${eco}|${name}|${side}`
}

// Atualiza o placar (família ou variação, mesmo formato `FamilyStats`) com o resultado de uma
// sessão: começa em 100, cada lance errado tira `penaltyPerWrong` (nunca abaixo de 0), e combina
// com o histórico numa média móvel (65% do que já tinha, 35% da sessão nova) — pura, sem I/O;
// quem chama decide quando persistir.
function bumpMastery(
  prev: Record<string, FamilyStats>, key: string, wrongCount: number, penaltyPerWrong: number,
): Record<string, FamilyStats> {
  const old = prev[key] ?? { attempts: 0, mastery: 50, lastPracticed: 0 }
  const sessionScore = Math.max(0, 100 - wrongCount * penaltyPerWrong)
  const mastery = Math.round(old.mastery * 0.65 + sessionScore * 0.35)
  return { ...prev, [key]: { attempts: old.attempts + 1, mastery, lastPracticed: Date.now() } }
}

interface TouchedLine { eco: string; name: string }

/**
 * Estado + lógica do Treino de Aberturas: escolhida uma família (ex: "Sicilian Defense") e um
 * lado (Brancas/Pretas), toca sozinho os lances que DEFINEM a família (ex: 1.e4 c5), e a partir
 * daí alterna entre:
 *  - vez de quem treina: precisa encontrar um lance que seja teoria conhecida pra essa família
 *    (não precisa ser uma linha única fixa — qualquer continuação real do banco ECO conta como
 *    certa, recall ativo dentro de um repertório real, não decoreba de uma sequência só);
 *  - vez do "adversário": a árvore sorteia (ponderado por quantas variações existem dali pra
 *    frente) uma resposta real do banco — isso é o que dá a exposição a "variantes" dentro da
 *    mesma abertura ao longo de várias sessões, sem precisar de dado de popularidade real.
 * Guarda um placar simples por família+lado no localStorage (não é repetição espaçada de
 * verdade — sem intervalo por enquanto — só um placar de domínio que pesa mais as sessões
 * recentes, usado pra ordenar/destacar o que precisa de mais prática na tela de escolha).
 */
export function useOpeningTrainer() {
  const families = useMemo(() => getOpeningFamilies(), [])
  const [stats, setStats] = useState<Record<string, FamilyStats>>(() => loadJsonRecord(STATS_KEY))
  const [lineStats, setLineStats] = useState<Record<string, FamilyStats>>(() => loadJsonRecord(LINE_STATS_KEY))
  // Persistência é um efeito colateral do próprio state, não da chamada que o atualiza — evita
  // gravar 2x no localStorage se o updater funcional rodar 2x pro mesmo commit (StrictMode em
  // dev, ou um re-render que aborta), já que `setStats`/`setLineStats` fariam isso se salvassem
  // dentro do próprio callback do updater.
  useEffect(() => { saveJsonRecord(STATS_KEY, stats) }, [stats])
  useEffect(() => { saveJsonRecord(LINE_STATS_KEY, lineStats) }, [lineStats])

  const [familyKey, setFamilyKey] = useState<string | null>(null)
  const [side, setSide] = useState<Side>('white')
  const [status, setStatus] = useState<TrainerStatus>('picking')
  const [fen, setFen] = useState('')
  const [pathSan, setPathSan] = useState<string[]>([])
  const [touchedLines, setTouchedLines] = useState<TouchedLine[]>([])
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintMove, setHintMove] = useState<{ from: string; to: string } | null>(null)
  const [linesCompleted, setLinesCompleted] = useState(0)
  // Seta fraca sempre visível na vez de quem treina, mostrando o lance mais documentado dali pra
  // frente — pedido direto do usuário ("quero apareça seta melhor jogada... indicando aonde é pra
  // ir"). Diferente do hint sob demanda (que precisa clicar): essa aparece sozinha assim que é a
  // vez de quem treina, sem precisar pedir.
  const [suggestedMove, setSuggestedMove] = useState<{ from: string; to: string } | null>(null)
  // Índice de lance sendo OLHADO (não necessariamente o mais recente) — null = acompanhando a
  // posição ao vivo. Pedido direto do usuário: navegar pra frente/trás pelos lances já jogados
  // nessa linha, desde o começo da abertura. Só pra revisar; treino continua pausado enquanto
  // não voltar pro "ao vivo".
  const [viewIndex, setViewIndex] = useState<number | null>(null)
  // Lance errado já classificado pelo Stockfish (o quão bom/ruim ele era de verdade, não só "não
  // é teoria") — pedido direto do usuário: "se jogar esse lance responde com... uma análise do
  // tabuleiro". `null` enquanto não há lance errado pendente ou a análise ainda não chegou.
  const [wrongClassifiedMove, setWrongClassifiedMove] = useState<ClassifiedMove | null>(null)
  // SAN do lance de teoria recomendado a partir da posição atual (mesmo alvo de `suggestedMove`,
  // só que em texto legível pra mostrar ao lado da análise do lance errado).
  const [bookMoveSan, setBookMoveSan] = useState<string | null>(null)

  const chessRef = useRef(new Chess())
  const nodeRef = useRef<OpeningNode | null>(null)
  const plyRef = useRef(0)
  const wrongAttemptsRef = useRef(0)
  // Erros cometidos tentando sair do nó ATUAL (zera a cada lance certo) — usado só pra pontuar a
  // variação nomeada que acaba de ser alcançada, separado do contador de erros da sessão inteira.
  const wrongSinceNodeRef = useRef(0)
  const touchedRef = useRef<Set<string>>(new Set())
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { playForSan, play } = useMoveSound()

  // Motor único (mesmo padrão de `AnalysisBoardView.tsx`): analisa a posição ao vivo continuamente
  // (alimenta a barra de avaliação) e também classifica lances errados sob demanda — nunca duas
  // buscas ao mesmo tempo, sempre casadas pelo FEN pedido (`requestedFenRef`/`lastEvalRef`).
  const { lines: engineLines, isReady: engineReady, analyze } = useStockfish(14, 1)
  const requestedFenRef = useRef('')
  const lastEvalRef = useRef<{ fen: string; cp: number | null; mate: number | null; bestMove: string | null } | null>(null)
  const pendingClassifyRef = useRef<{
    san: string; from: string; to: string; color: 'w' | 'b'; moveNumber: number
    fenBefore: string; fenAfter: string
    beforeCp: number | null; beforeMate: number | null; bestMoveBefore: string | null
  } | null>(null)

  const family = useMemo(() => families.find((f) => f.key === familyKey) ?? null, [families, familyKey])

  const isTraineeTurn = useCallback((ply: number) => {
    const whiteToMove = ply % 2 === 0
    return (side === 'white') === whiteToMove
  }, [side])

  // `scored` = true só quando ESSE nó foi alcançado por um lance que quem treina escolheu de
  // verdade (não os lances-raiz tocados sozinhos, nem a resposta do "adversário" simulado) — só
  // aí faz sentido gravar mastery da variação, senão estaria pontuando decisão que não foi da
  // pessoa.
  const recordNamedNode = useCallback((node: OpeningNode, scored: boolean) => {
    if (!node.name) return
    if (!touchedRef.current.has(node.name)) {
      touchedRef.current.add(node.name)
      setTouchedLines((prev) => [...prev, { eco: node.eco!, name: node.name! }])
    }
    if (!scored) return
    const key = lineStatsKey(node.eco!, node.name!, side)
    // Mesma fórmula do placar de família (100 - N por erro, nunca abaixo de 0), só que por
    // variação nomeada (penalidade um pouco mais dura, 25 em vez de 20) — é isso que faz o treino
    // "lembrar" quais variações específicas a pessoa já manja, não só a família inteira.
    const wrongCount = wrongSinceNodeRef.current
    wrongSinceNodeRef.current = 0
    setLineStats((prev) => bumpMastery(prev, key, wrongCount, 25))
  }, [side])

  // Calcula a seta de sugestão (lance mais documentado a partir da posição atual) — chamada toda
  // vez que a posição volta a ser "vez de quem treina" (início da linha, depois de um lance certo,
  // ou depois de tentar de novo num lance errado).
  const updateSuggestion = useCallback((node: OpeningNode | null) => {
    const target = node ? pickBestChild(node) : null
    if (!target?.san) { setSuggestedMove(null); setBookMoveSan(null); return }
    const probe = new Chess(chessRef.current.fen())
    try {
      const r = probe.move(target.san)
      setSuggestedMove({ from: r.from, to: r.to })
      setBookMoveSan(target.san)
    } catch {
      setSuggestedMove(null)
      setBookMoveSan(null)
    }
  }, [])

  const finalizeSession = useCallback(() => {
    if (!familyKey) return
    setLinesCompleted((c) => c + 1)
    const key = statsKey(familyKey, side)
    // Placar simples da sessão: começa em 100, cada lance errado tira 20 (nunca abaixo de 0).
    // Não modela "quanto faltava saber" nem intervalo de repetição de verdade — é uma
    // aproximação honesta, documentada, não uma cópia de SM-2/Anki.
    setStats((prev) => bumpMastery(prev, key, wrongAttemptsRef.current, 20))
  }, [familyKey, side])

  // Decide o que fazer a partir da posição atual (`nodeRef`/`plyRef`): espera o lance de quem
  // treina, ou sorteia e joga sozinho o lance do "adversário" simulado, recursivamente, até
  // esbarrar numa posição sem mais teoria conhecida ou no limite de lances por linha.
  const continueFrom = useCallback(function step(ply: number) {
    const node = nodeRef.current
    if (!node || node.children.size === 0 || ply >= MAX_PLY) {
      setSuggestedMove(null)
      setStatus('done')
      finalizeSession()
      return
    }
    if (isTraineeTurn(ply)) {
      updateSuggestion(node)
      setStatus('your-turn')
      return
    }
    setSuggestedMove(null)
    setStatus('their-turn')
    replyTimerRef.current = setTimeout(() => {
      const child = pickWeightedChild(node)
      if (!child || !child.san) { setStatus('done'); finalizeSession(); return }
      let result: ReturnType<Chess['move']>
      try {
        result = chessRef.current.move(child.san)
      } catch {
        setStatus('done'); finalizeSession(); return
      }
      nodeRef.current = child
      plyRef.current = ply + 1
      setPathSan((p) => [...p, child.san!])
      setFen(chessRef.current.fen())
      playForSan(result.san)
      recordNamedNode(child, false) // resposta do "adversário" simulado — não foi decisão de quem treina
      step(ply + 1)
    }, 550)
  }, [isTraineeTurn, playForSan, recordNamedNode, finalizeSession, updateSuggestion])

  const startLine = useCallback((key: string, chosenSide: Side) => {
    const fam = families.find((f) => f.key === key)
    if (!fam) return
    clearTimeout(replyTimerRef.current)
    clearTimeout(hintTimerRef.current)

    setFamilyKey(key)
    setSide(chosenSide)
    setWrongAttempts(0)
    wrongAttemptsRef.current = 0
    wrongSinceNodeRef.current = 0
    setHintSquare(null)
    setHintMove(null)
    setTouchedLines([])
    setViewIndex(null)
    setWrongClassifiedMove(null)
    pendingClassifyRef.current = null
    touchedRef.current = new Set()

    const chess = new Chess()
    let node = getGlobalOpeningTree()
    const played: string[] = []
    for (const san of fam.rootMoves) {
      const child = node.children.get(san)
      if (!child) break
      try {
        if (!chess.move(san)) break
      } catch {
        break
      }
      played.push(san)
      node = child
      recordNamedNode(node, false) // lances-raiz definem a família, tocados sozinhos — não é decisão de quem treina
    }

    chessRef.current = chess
    nodeRef.current = node
    plyRef.current = played.length
    setPathSan(played)
    setFen(chess.fen())

    continueFrom(played.length)
  }, [families, continueFrom, recordNamedNode])

  const nextLine = useCallback(() => {
    if (!familyKey) return
    startLine(familyKey, side)
  }, [familyKey, side, startLine])

  const backToPicker = useCallback(() => {
    clearTimeout(replyTimerRef.current)
    clearTimeout(hintTimerRef.current)
    setFamilyKey(null)
    setStatus('picking')
  }, [])

  const attemptMove = useCallback((sourceSquare: string, targetSquare: string, promotion?: string): boolean => {
    if (status !== 'your-turn' || viewIndex !== null || !nodeRef.current) return false
    clearTimeout(hintTimerRef.current)
    const chess = chessRef.current
    const fenBeforeMove = chess.fen()
    const moverColor: 'w' | 'b' = fenBeforeMove.split(' ')[1] === 'b' ? 'b' : 'w'
    let result: ReturnType<Chess['move']>
    try {
      result = chess.move({ from: sourceSquare, to: targetSquare, promotion: promotion ?? 'q' })
    } catch {
      return false // lance ilegal — o tabuleiro desfaz sozinho
    }

    const child = nodeRef.current.children.get(result.san)
    if (!child) {
      const fenAfterMove = chess.fen()
      chess.undo()
      setWrongAttempts((n) => n + 1)
      wrongAttemptsRef.current += 1
      wrongSinceNodeRef.current += 1
      setStatus('wrong')
      setWrongClassifiedMove(null) // limpa a análise anterior — a nova chega em instantes
      play('error')

      // Pede ao motor uma análise do lance que a pessoa acabou de tentar, pra responder com algo
      // melhor que "não é teoria conhecida": ele foi um lance de xadrez bom, razoável ou um erro
      // de verdade? A referência "antes" é a última avaliação que já tínhamos pra essa mesma
      // posição (o motor já vinha analisando ao vivo enquanto era a vez de quem treina).
      const beforeSnapshot = lastEvalRef.current?.fen === fenBeforeMove ? lastEvalRef.current : null
      pendingClassifyRef.current = {
        san: result.san, from: result.from, to: result.to, color: moverColor,
        moveNumber: Math.floor(plyRef.current / 2) + 1,
        fenBefore: fenBeforeMove, fenAfter: fenAfterMove,
        beforeCp: beforeSnapshot?.cp ?? null, beforeMate: beforeSnapshot?.mate ?? null,
        bestMoveBefore: beforeSnapshot?.bestMove ?? null,
      }
      analyze(fenAfterMove)
      requestedFenRef.current = fenAfterMove
      return false
    }

    nodeRef.current = child
    plyRef.current += 1
    setPathSan((p) => [...p, result.san])
    setFen(chess.fen())
    playForSan(result.san)
    recordNamedNode(child, true) // decisão de verdade de quem treina — pontua a variação
    continueFrom(plyRef.current)
    return true
  }, [status, viewIndex, playForSan, play, recordNamedNode, continueFrom, analyze])

  const retry = useCallback(() => {
    clearTimeout(hintTimerRef.current)
    setHintSquare(null)
    setHintMove(null)
    setWrongClassifiedMove(null)
    pendingClassifyRef.current = null
    updateSuggestion(nodeRef.current)
    setStatus((s) => (s === 'wrong' ? 'your-turn' : s))
  }, [updateSuggestion])

  const showHint = useCallback(() => {
    if (status !== 'your-turn' || !nodeRef.current) return
    const target = pickWeightedChild(nodeRef.current)
    if (!target?.san) return
    // Testa o lance numa cópia da posição só pra extrair a casa de origem real (SAN sozinho não
    // dá pra ler direto em casos como roque, captura ou lance desambiguado tipo "Nbd2").
    const probe = new Chess(chessRef.current.fen())
    try {
      const probeResult = probe.move(target.san)
      setHintSquare(probeResult.from)
    } catch {
      // ignora — mantém o hint anterior (se algum)
    }
  }, [status])

  const showMoveHint = useCallback(() => {
    if (status !== 'your-turn' || !nodeRef.current) return
    const target = pickWeightedChild(nodeRef.current)
    if (!target?.san) return
    setHintSquare(null)
    // Precisa das casas de origem/destino reais — só o SAN não basta pra desenhar a seta, então
    // testa o lance numa cópia da posição atual só pra extrair from/to, sem afetar o jogo real.
    const probe = new Chess(chessRef.current.fen())
    let probeResult: ReturnType<Chess['move']>
    try {
      probeResult = probe.move(target.san)
    } catch {
      return
    }
    setHintMove({ from: probeResult.from, to: probeResult.to })

    clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => {
      attemptMove(probeResult.from, probeResult.to, probeResult.promotion)
    }, 1000)
  }, [status, attemptMove])

  // Recalcula o FEN de cada lance já jogado nessa linha, do início — pedido direto do usuário
  // ("quero... voltar lance desde o começo da abertura"). `pathSan` já inclui os lances-raiz da
  // família (tocados sozinhos ao começar), então dá pra navegar por eles também, não só pelos
  // lances jogados depois. Recomputar do zero é barato (no máximo `MAX_PLY` lances por linha).
  const history = useMemo(() => {
    const chess = new Chess()
    const fens: string[] = [chess.fen()]
    const moves: ({ from: string; to: string } | null)[] = [null]
    for (const san of pathSan) {
      let r: ReturnType<Chess['move']>
      try {
        r = chess.move(san)
      } catch {
        break
      }
      fens.push(chess.fen())
      moves.push({ from: r.from, to: r.to })
    }
    return { fens, moves }
  }, [pathSan])

  // `viewIndex === null` → acompanha a posição ao vivo (o que `fen`/`lastMove` já trazem).
  // `viewIndex` definido → olhando um lance passado específico, treino pausado até voltar.
  const displayIndex = viewIndex ?? pathSan.length
  const displayFen = history.fens[displayIndex] ?? fen
  const displayLastMove = history.moves[displayIndex] ?? null

  // Mantém o motor sempre analisando a posição EXIBIDA na tela (ao vivo ou sendo revisada no
  // histórico) — alimenta a barra de avaliação continuamente durante o treino ("quero... uma
  // análise do tabuleiro", pedido direto do usuário), e cada avaliação que chega vira a
  // referência "antes" pro próximo lance errado que precisar ser classificado (só importa
  // enquanto ao vivo, já que só dá pra jogar lance nessa posição).
  useEffect(() => {
    if (!engineReady || !displayFen) return
    analyze(displayFen)
    requestedFenRef.current = displayFen
  }, [displayFen, engineReady, analyze])

  useEffect(() => {
    const line = engineLines[0]
    if (!line) return
    const forFen = requestedFenRef.current
    lastEvalRef.current = { fen: forFen, cp: line.cp, mate: line.mate, bestMove: line.bestMove }

    const pending = pendingClassifyRef.current
    if (!pending || forFen !== pending.fenAfter) return

    // `beforeCp/beforeMate` e `line.cp/line.mate` já vêm relativos às brancas (useStockfish.ts
    // converte na hora) — `toWhiteCp` aqui só colapsa mate num valor e satura o range, não inverte
    // sinal de novo (por isso sempre 'w').
    const evalBefore = toWhiteCp(pending.beforeCp, pending.beforeMate, 'w')
    const evalAfter = toWhiteCp(line.cp, line.mate, 'w')
    const isBest = !!pending.bestMoveBefore && pending.from + pending.to === pending.bestMoveBefore.slice(0, 4)
    // Nunca "livro" aqui de propósito: por definição só chegamos nessa classificação quando o
    // lance NÃO está no banco ECO a partir dessa posição — o que ela mede é se, mesmo assim, era
    // um lance de xadrez razoável (ou até o melhor lance do motor) ou um erro de verdade.
    const classification = classifyMove(evalBefore, evalAfter, pending.color, isBest, false, 0)
    setWrongClassifiedMove({
      san: pending.san, from: pending.from, to: pending.to,
      fen: pending.fenAfter, fenBefore: pending.fenBefore,
      moveNumber: pending.moveNumber, color: pending.color,
      classification, evalBefore, evalAfter, bestMove: pending.bestMoveBefore, clock: null,
    })
    pendingClassifyRef.current = null
    // Volta a analisar a posição de ANTES do lance errado (a posição ao vivo, onde quem treina
    // ainda está) — sem isso, uma segunda tentativa errada na mesma jogada não acharia mais um
    // "antes" batendo com `lastEvalRef` (ficaria apontando pro FEN do lance errado anterior).
    analyze(pending.fenBefore)
    requestedFenRef.current = pending.fenBefore
  }, [engineLines, analyze])

  const goFirst = useCallback(() => setViewIndex(0), [])
  const goPrev = useCallback(() => setViewIndex((i) => Math.max(0, (i ?? pathSan.length) - 1)), [pathSan.length])
  const goNext = useCallback(() => setViewIndex((i) => {
    const next = (i ?? pathSan.length) + 1
    return next >= pathSan.length ? null : next
  }), [pathSan.length])
  const goLive = useCallback(() => setViewIndex(null), [])

  return {
    families, stats, lineStats,
    family, side, status,
    fen: displayFen, lastMove: displayLastMove, pathSan, touchedLines,
    isLive: viewIndex === null, viewIndex: displayIndex, totalPly: pathSan.length,
    wrongAttempts, hintSquare, hintMove, suggestedMove, bookMoveSan, linesCompleted,
    engineEval: engineLines[0] ?? null, wrongClassifiedMove,
    startLine, nextLine, backToPicker, attemptMove, retry, showHint, showMoveHint,
    goFirst, goPrev, goNext, goLive,
  }
}
