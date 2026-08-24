import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish } from './hooks/useStockfish'
import { useGameAnalysis } from './hooks/useGameAnalysis'
import { useKeyboard } from './hooks/useKeyboard'
import { useBoardSize } from './hooks/useBoardSize'
import { ChessBoard, BOARD_ROW_CHROME_WIDTH } from './components/Board/ChessBoard'
import { ReviewPanel } from './components/Review/ReviewPanel'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { TrainingView } from './components/Training/TrainingView'
import { OpeningTrainerView } from './components/Training/OpeningTrainerView'
import type { Side } from './hooks/useOpeningTrainer'
import { ErrorTrainerView } from './components/Training/ErrorTrainerView'
import type { MistakeReason } from './analysis/mistakeReasons'
import { EndgameTrainerView } from './components/Training/EndgameTrainerView'
import { ReportView } from './components/Report/ReportView'
import { PlayVsBotView } from './components/Play/PlayVsBotView'
import { AnalysisBoardView } from './components/Analysis/AnalysisBoardView'
import { PositionEditorView } from './components/PositionEditor/PositionEditorView'
import { PlayerCard } from './components/Theater/PlayerCard'
import { Sidebar } from './components/Layout/Sidebar'
import { MaintenanceNotice } from './components/Layout/MaintenanceNotice'
import { UpdatesPanel } from './components/Layout/UpdatesPanel'
import { HomePage } from './components/Home/HomePage'
import { SearchView } from './components/PlayerSearch/SearchView'
import type { Platform } from './components/PlayerSearch/SearchView'
import { usePlayerProfiles } from './hooks/useChesscomApi'
import { useMoveSound } from './hooks/useMoveSound'
import { classifyMove, toWhiteCp, materialForSide } from './analysis/moveClassifier'
import { isBookMove } from './analysis/openingsDatabase'
import { saveGame } from './persistence/gamesRepo'
import { saveAnalysis, loadAnalysis, isAnalysisValid } from './persistence/analysesRepo'

// Mesma profundidade passada pra `useGameAnalysis` — extraída pra uma constante única, em vez de
// dois "18" literais soltos (aqui e na checagem de validade do cache), pra não correr o risco de
// um dia só um dos dois mudar sem querer.
const ANALYSIS_DEPTH = 18

function AppInner() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updatesOpen, setUpdatesOpen] = useState(false)
  // Modo de treino de táticas — não é um modal, substitui o conteúdo principal (igual à análise).
  const [trainingMode, setTrainingMode] = useState(false)
  // Treino de Aberturas — mesmo esquema, mutuamente exclusivo com os outros modos.
  const [openingTrainingMode, setOpeningTrainingMode] = useState(false)
  // Treino de Erros — mesmo esquema, mutuamente exclusivo com os outros modos.
  const [errorTrainingMode, setErrorTrainingMode] = useState(false)
  // Treino de Finais (Sprint 4) — mesmo esquema, mutuamente exclusivo com os outros modos.
  const [endgameTrainingMode, setEndgameTrainingMode] = useState(false)
  // Relatório do jogador — mesmo esquema, mutuamente exclusivo com os outros modos.
  const [reportMode, setReportMode] = useState(false)
  // Jogar contra a Capivara (Sprint 4) — mesmo esquema, mutuamente exclusivo com os outros modos.
  const [playBotMode, setPlayBotMode] = useState(false)
  // Tabuleiro de análise livre (posição inicial, joga dos dois lados) — mesmo esquema do treino:
  // substitui o conteúdo principal, mutuamente exclusivo com ele e com a revisão de partida.
  const [boardMode, setBoardMode] = useState(false)
  // Editor de posição livre ("Definir Posição") — mesmo esquema dos outros modos: substitui o
  // conteúdo principal, mutuamente exclusivo com eles.
  const [positionEditorMode, setPositionEditorMode] = useState(false)
  // FEN vindo do editor de posição, aguardando o Tabuleiro montar já nessa posição — some (volta
  // pro padrão) assim que o Tabuleiro é aberto por qualquer outro caminho.
  const [pendingBoardFen, setPendingBoardFen] = useState<string | undefined>(undefined)
  // Alvo vindo do Relatório do jogador ("treinar essa abertura agora") — família+lado aguardando
  // o Treino de Aberturas montar já treinando essa linha. Mesmo esquema de `pendingBoardFen`:
  // some assim que o modo é aberto por qualquer outro caminho (sidebar, sem alvo específico).
  const [pendingOpeningTarget, setPendingOpeningTarget] = useState<{ familyKey: string; side: Side } | null>(null)
  // Idem, pro Treino de Erros ("treinar isso agora" num vazamento específico).
  const [pendingErrorReason, setPendingErrorReason] = useState<MistakeReason | null>(null)
  // Nome da função clicada num item de menu "em manutenção" (ver Sidebar) — null = fechado.
  const [maintenanceFeature, setMaintenanceFeature] = useState<string | null>(null)
  // Tela de "Analisar" (busca de jogador) — página própria, separada da Home, com prioridade
  // sobre ela: fica visível mesmo com uma partida carregada (isLoaded), pra dar sempre um
  // caminho de volta pra busca sem precisar descarregar a partida antes.
  const [searchMode, setSearchMode] = useState(false)
  // Plataforma pedida explicitamente (ex: clicou no card "Lichess" da Home) — override de
  // uma única vez; sem isso, a SearchView usa a última plataforma buscada (localStorage).
  const [searchPlatform, setSearchPlatform] = useState<Platform | undefined>(undefined)
  const [positionEvals, setPositionEvals] = useState<number[]>([])
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  // Controla qual "tela" o painel de revisão mostra: resumo (fotos + precisão + White vs Black,
  // enquanto o Stockfish analisa em segundo plano) ou a lista de lances com avaliação por lance.
  // A análise em si roda sempre em segundo plano, independente desse flag.
  const [reviewStarted, setReviewStarted] = useState(false)

  const {
    currentFen, currentMoveIndex, moves, fens, gameInfo, isLoaded,
    goToMove, goFirst, goPrev, goNext, goLast, loadPgn, unloadGame, lastMove,
    updateMoveClassification,
  } = useChessGame()

  const { theme } = useTheme()
  const { boardWidth, containerRef } = useBoardSize(theme.boardSize, { chromeWidth: BOARD_ROW_CHROME_WIDTH })
  // multiPv=3 pede as 3 melhores linhas ao mesmo worker que já calculava a avaliação ao vivo da
  // posição atual (era multiPv=1) — reaproveita o mesmo motor em vez de subir um segundo worker
  // em paralelo só pra alimentar o painel "Motor" da Revisão de partida (mesmo padrão já usado
  // no Tabuleiro de análise livre, `AnalysisBoardView`). `evaluation` continua sendo só a linha 1
  // (pra barra de avaliação) — `engineLines`/`engineIsAnalyzing` alimentam o painel de texto.
  // Profundidade 18 (era 15, pedido direto do usuário — "quero stockfish melhor"): mais forte,
  // mesmo motor NNUE completo, só demora um pouco mais pra fechar cada busca.
  const { evaluation, lines: engineLines, isReady, isAnalyzing: engineIsAnalyzing, analyze } = useStockfish(18, 3)
  // Profundidade 18 (era 12, pedido direto do usuário — mesma justificativa do useStockfish
  // acima: motor mais forte, mesmo com a partida inteira demorando mais pra classificar).
  const { analyzeGame, cancel: cancelAnalysis, progress } = useGameAnalysis(ANALYSIS_DEPTH)
  // URL de origem (chess.com/Lichess) da partida carregada — chave de cache em `persistence/`.
  // `null` quando não há partida carregada, ou (por ora) quando ela não veio de uma dessas duas
  // fontes (não existe hoje caminho de colar PGN cru na UI — só partidas com URL chegam aqui).
  const [gameUrl, setGameUrl] = useState<string | null>(null)
  // Texto cru do PGN da partida atual — `useChessGame` guarda só a versão já parseada (moves/
  // fens/gameInfo), não o texto original, então precisa ser guardado aqui pra poder salvar no
  // cache junto com o resultado da análise.
  const pgnRef = useRef('')
  // Lado que o dono do app jogou nesta partida (vem já calculado de `RecentGame.color`, ver
  // `RecentGames.tsx`) — salvo junto com a partida pro Relatório do jogador (Sprint 3) saber de
  // quem são as estatísticas sem precisar adivinhar pelo nome depois.
  const [gamePerspectiveColor, setGamePerspectiveColor] = useState<'w' | 'b' | undefined>(undefined)
  const { playForSan } = useMoveSound()

  // Som de lance ao navegar entre posições (review).
  const prevMoveIndexRef = useRef(currentMoveIndex)
  useEffect(() => {
    const prev = prevMoveIndexRef.current
    prevMoveIndexRef.current = currentMoveIndex
    if (isLoaded && currentMoveIndex >= 0 && currentMoveIndex !== prev && moves[currentMoveIndex]) {
      playForSan(moves[currentMoveIndex].san)
    }
  }, [currentMoveIndex, isLoaded, moves, playForSan])

  // Avaliação ao vivo da posição atual
  useEffect(() => {
    if (isLoaded && isReady) analyze(currentFen)
  }, [currentFen, isLoaded, isReady, analyze])

  // Refs para evitar re-disparo da análise completa a cada classificação
  const movesRef = useRef(moves)
  movesRef.current = moves
  const updateRef = useRef(updateMoveClassification)
  updateRef.current = updateMoveClassification

  // Análise da partida inteira: classifica cada lance (roda em segundo plano assim que a partida
  // carrega). Antes de rodar o motor, checa se já existe uma análise salva (mesma partida, mesma
  // profundidade) pra essa `gameUrl` — se sim, reconstrói tudo a partir dos números crus salvos
  // (só `whiteEvals`/`bestMoves`, nunca a classificação em si: ela é recalculada aqui do zero com
  // a lógica ATUAL de `classifyMove`/`isBookMove`, então um cache salvo há tempos nunca fica preso
  // a uma regra de classificação já ultrapassada) e nem chega a chamar `analyzeGame` — reabrir uma
  // partida já analisada fica instantâneo, sem tocar o Stockfish.
  useEffect(() => {
    if (!isLoaded || fens.length < 2) { setPositionEvals([]); return }
    // Cancela qualquer análise em andamento de uma partida ANTERIOR antes de decidir o que fazer
    // com esta. Necessário mesmo quando esta partida vai dar cache HIT (e `analyzeGame` nem vai
    // ser chamado de novo): sem isso, o loop antigo continuaria rodando e seus `onEval` cairiam
    // nos `movesRef`/`fens` já trocados pra partida nova (closures reatribuídas a cada render),
    // contaminando a classificação dela. Uma nova chamada de `analyzeGame` já cancelaria sozinha
    // (via `runId`), mas isso só cobre o caso de cache MISS — por isso o cancel explícito aqui.
    cancelAnalysis()
    let cancelled = false
    const whiteEvals: number[] = []
    const bestMoves: (string | null)[] = []
    setPositionEvals([])

    function applyClassification(i: number) {
      const m = i - 1
      if (m < 0 || whiteEvals[m] === undefined) return
      const mv = movesRef.current[m]
      if (!mv) return
      const before = whiteEvals[m]
      const after = whiteEvals[i]
      const bm = bestMoves[m]
      const isBest = !!bm && mv.from + mv.to === bm.slice(0, 4)
      const materialDelta = materialForSide(fens[m], mv.color) - materialForSide(fens[i], mv.color)
      const isBook = isBookMove(movesRef.current.slice(0, m + 1).map((cm) => cm.san))
      const cls = classifyMove(before, after, mv.color, isBest, isBook, materialDelta)
      updateRef.current(m, cls, before, after, bm)
    }

    void (async () => {
      if (gameUrl) {
        const cached = await loadAnalysis(gameUrl)
        if (cancelled) return
        if (cached && isAnalysisValid(cached, fens, ANALYSIS_DEPTH)) {
          for (let i = 0; i < cached.whiteEvals.length; i++) {
            whiteEvals[i] = cached.whiteEvals[i]
            bestMoves[i] = cached.bestMoves[i]
          }
          setPositionEvals([...whiteEvals])
          for (let i = 1; i < whiteEvals.length; i++) applyClassification(i)
          return
        }
      }

      await analyzeGame(fens, (i, e) => {
        if (cancelled) return
        const stm = fens[i].split(' ')[1] === 'b' ? 'b' : 'w'
        whiteEvals[i] = toWhiteCp(e.cp, e.mate, stm)
        bestMoves[i] = e.bestMove ?? null
        setPositionEvals([...whiteEvals])
        applyClassification(i)
      })
      if (cancelled) return
      // Só salva quando a análise terminou de verdade (não foi cancelada por outra partida
      // carregando no meio do caminho) — `whiteEvals.length` bate com `fens.length` nesse caso.
      if (gameUrl && gameInfo && whiteEvals.length === fens.length) {
        await saveGame(gameUrl, pgnRef.current, gameInfo, gamePerspectiveColor)
        await saveAnalysis(gameUrl, ANALYSIS_DEPTH, whiteEvals, bestMoves)
      }
    })()

    return () => { cancelled = true }
  }, [fens, isLoaded, analyzeGame, cancelAnalysis, gameUrl, gameInfo, gamePerspectiveColor])

  const flipBoard = useCallback(() => {
    setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))
  }, [])

  // Esc — sai da ferramenta/modo atual pra tela por baixo (Revisão se tiver partida carregada,
  // senão Home). Prioriza fechar modal/aviso aberto (Configurações, Atualizações, "em
  // manutenção") antes de sair de um modo de tela cheia — só um desses por vez pode estar aberto,
  // mas a ordem importa pra sempre fechar "de fora pra dentro". Diferente do "ChessLens" no topo
  // da sidebar (onGoHome): não descarrega a partida nem fecha a busca, é só "volta uma tela".
  const handleEscape = useCallback(() => {
    if (settingsOpen) { setSettingsOpen(false); return }
    if (updatesOpen) { setUpdatesOpen(false); return }
    if (maintenanceFeature) { setMaintenanceFeature(null); return }
    setTrainingMode(false)
    setBoardMode(false)
    setOpeningTrainingMode(false)
    setErrorTrainingMode(false)
    setEndgameTrainingMode(false)
    setReportMode(false)
    setPlayBotMode(false)
    setPositionEditorMode(false)
    setSearchMode(false)
  }, [settingsOpen, updatesOpen, maintenanceFeature])

  useKeyboard({
    onPrev: goPrev, onNext: goNext, onFirst: goFirst, onLast: goLast, onFlip: flipBoard, onEscape: handleEscape,
    // Desligado no tabuleiro de análise livre também — lá as setas navegariam por engano o
    // histórico da revisão escondida atrás, em vez do próprio jogo livre (que não usa teclado).
    // Desligado também em "Jogar contra a Capivara" pelo mesmo motivo — não há histórico de
    // revisão pra navegar ali, é uma partida ao vivo. `onEscape` continua funcionando mesmo com
    // isso tudo desligado (ver comentário em `useKeyboard.ts`) — é o que fecha essas telas.
    enabled: !settingsOpen && !updatesOpen && !trainingMode && !boardMode && !openingTrainingMode && !errorTrainingMode && !endgameTrainingMode && !reportMode && !positionEditorMode && !playBotMode,
  })

  const handleAnalyzeGame = useCallback((pgn: string, url: string, color: 'w' | 'b') => {
    try {
      loadPgn(pgn)
      pgnRef.current = pgn
      setGameUrl(url)
      setGamePerspectiveColor(color)
      // Só reseta a tela de resumo aqui, no carregamento explícito de uma partida NOVA — antes
      // isso era um useEffect reagindo a qualquer troca de referência de `gameInfo`, o que podia
      // devolver a pessoa pra tela de resumo (o "menu") no meio da revisão sem ela pedir.
      setReviewStarted(false)
      setSearchMode(false)
    } catch {
      // PGN inválido vindo da API do chess.com/Lichess — ignora silenciosamente.
    }
  }, [loadPgn])

  const openSearch = useCallback((platform?: Platform) => {
    setTrainingMode(false)
    setBoardMode(false)
    setOpeningTrainingMode(false)
    setErrorTrainingMode(false)
    setEndgameTrainingMode(false)
    setReportMode(false)
    setPlayBotMode(false)
    setPositionEditorMode(false)
    setPendingBoardFen(undefined)
    setSearchPlatform(platform)
    setSearchMode(true)
  }, [])

  const handleStartReview = useCallback(() => {
    setReviewStarted(true)
    goFirst()
  }, [goFirst])

  // "Jogar a partir daqui" (Sprint 4, Revisão) — mesmo mecanismo que o Editor de Posição já usa
  // (`onAnalyze` acima, linha ~315): guarda o FEN em `pendingBoardFen` e abre o Tabuleiro já
  // nessa posição. Não precisa desligar os outros modos aqui porque a Revisão só é renderizada
  // quando todos eles já estão desligados (ver condição de `boardMode` mais abaixo).
  const handlePlayFromHere = useCallback((fen: string) => {
    setPendingBoardFen(fen)
    setBoardMode(true)
  }, [])

  const profiles = usePlayerProfiles(gameInfo?.white, gameInfo?.black)
  const turn = currentFen.split(' ')[1] === 'b' ? 'black' : 'white'
  const currentQuality = currentMoveIndex >= 0 ? moves[currentMoveIndex]?.classification ?? null : null

  // Relógio de cada lado na posição atual da revisão — o último lance DESSA cor até aqui, direto
  // do PGN (`{[%clk ...]}`). `null` antes do primeiro lance daquela cor, ou se o PGN não tinha
  // esse dado (partida sem controle de tempo, ou fonte que não anota relógio).
  function lastClock(color: 'w' | 'b'): string | null {
    for (let i = currentMoveIndex; i >= 0; i--) {
      if (moves[i]?.color === color) return moves[i].clock
    }
    return null
  }
  const whiteClock = lastClock('w')
  const blackClock = lastClock('b')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--color-bg-main)', color: 'var(--color-text-on-dark)' }}>
      <Sidebar
        onSettings={() => setSettingsOpen(true)}
        onUpdates={() => setUpdatesOpen(true)}
        onToggleTraining={() => { setTrainingMode((v) => !v); setBoardMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPlayBotMode(false); setPositionEditorMode(false); setSearchMode(false) }}
        onToggleBoard={() => { setBoardMode((v) => !v); setTrainingMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPlayBotMode(false); setPositionEditorMode(false); setPendingBoardFen(undefined); setSearchMode(false) }}
        onToggleOpeningTraining={() => { setOpeningTrainingMode((v) => !v); setTrainingMode(false); setBoardMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPlayBotMode(false); setPositionEditorMode(false); setPendingOpeningTarget(null); setSearchMode(false) }}
        onToggleErrorTraining={() => { setErrorTrainingMode((v) => !v); setTrainingMode(false); setBoardMode(false); setOpeningTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPlayBotMode(false); setPositionEditorMode(false); setPendingErrorReason(null); setSearchMode(false) }}
        onToggleEndgameTraining={() => { setEndgameTrainingMode((v) => !v); setTrainingMode(false); setBoardMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setReportMode(false); setPlayBotMode(false); setPositionEditorMode(false); setSearchMode(false) }}
        onToggleReport={() => { setReportMode((v) => !v); setTrainingMode(false); setBoardMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setPlayBotMode(false); setPositionEditorMode(false); setSearchMode(false) }}
        onTogglePlayBot={() => { setPlayBotMode((v) => !v); setTrainingMode(false); setBoardMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPositionEditorMode(false); setSearchMode(false) }}
        onGoHome={() => { setTrainingMode(false); setBoardMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPlayBotMode(false); setPositionEditorMode(false); setPendingBoardFen(undefined); setPendingOpeningTarget(null); setPendingErrorReason(null); setSearchMode(false); unloadGame(); setGameUrl(null) }}
        onAnalyzeClick={() => { unloadGame(); setGameUrl(null); openSearch() }}
        onMaintenanceClick={setMaintenanceFeature}
        onTogglePositionEditor={() => { setPositionEditorMode((v) => !v); setTrainingMode(false); setBoardMode(false); setOpeningTrainingMode(false); setErrorTrainingMode(false); setEndgameTrainingMode(false); setReportMode(false); setPlayBotMode(false); setSearchMode(false) }}
        trainingActive={trainingMode}
        boardActive={boardMode}
        openingTrainingActive={openingTrainingMode}
        errorTrainingActive={errorTrainingMode}
        endgameTrainingActive={endgameTrainingMode}
        reportActive={reportMode}
        playBotActive={playBotMode}
        positionEditorActive={positionEditorMode}
        searchActive={searchMode}
      />

      {/* Main */}
      <main className="cl-main-shell" style={{ flex: 1, minWidth: 0 }}>
        {trainingMode ? (
          <TrainingView boardWidth={boardWidth} containerRef={containerRef} />
        ) : endgameTrainingMode ? (
          <EndgameTrainerView boardWidth={boardWidth} containerRef={containerRef} />
        ) : openingTrainingMode ? (
          <OpeningTrainerView
            boardWidth={boardWidth} containerRef={containerRef}
            initialFamilyKey={pendingOpeningTarget?.familyKey}
            initialSide={pendingOpeningTarget?.side}
          />
        ) : errorTrainingMode ? (
          <ErrorTrainerView
            boardWidth={boardWidth} containerRef={containerRef}
            onGoToAnalyze={() => { unloadGame(); setGameUrl(null); openSearch() }}
            initialReasonFilter={pendingErrorReason ?? undefined}
          />
        ) : reportMode ? (
          <ReportView
            onGoToErrorTraining={(reason) => { setPendingErrorReason(reason); setReportMode(false); setErrorTrainingMode(true) }}
            onGoToOpeningTraining={(familyKey, side) => { setPendingOpeningTarget({ familyKey, side }); setReportMode(false); setOpeningTrainingMode(true) }}
            onGoToAnalyze={() => { unloadGame(); setGameUrl(null); openSearch() }}
          />
        ) : playBotMode ? (
          <PlayVsBotView boardWidth={boardWidth} containerRef={containerRef} />
        ) : positionEditorMode ? (
          <PositionEditorView
            boardWidth={boardWidth}
            containerRef={containerRef}
            onAnalyze={(fen) => { setPendingBoardFen(fen); setBoardMode(true); setPositionEditorMode(false) }}
          />
        ) : boardMode ? (
          <AnalysisBoardView boardWidth={boardWidth} containerRef={containerRef} initialFen={pendingBoardFen} />
        ) : searchMode ? (
          <SearchView initialPlatform={searchPlatform} onAnalyzeGame={handleAnalyzeGame} />
        ) : !isLoaded ? (
          <HomePage onOpenSearch={openSearch} />
        ) : (
          <>
            {/* Center */}
            <div ref={containerRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
              {/* Card de cima é sempre o lado "distante" — troca de posição junto com o flip do tabuleiro. */}
              <div style={{ width: boardWidth + BOARD_ROW_CHROME_WIDTH }}>
                {boardOrientation === 'white' ? (
                  <PlayerCard username={gameInfo?.black ?? 'Pretas'} rating={gameInfo?.blackElo ?? '?'} color="black" avatarUrl={profiles.black.avatar} title={profiles.black.title} countryCode={profiles.black.countryCode} status={profiles.black.status} isActive={isLoaded && turn === 'black'} clock={blackClock} />
                ) : (
                  <PlayerCard username={gameInfo?.white ?? 'Brancas'} rating={gameInfo?.whiteElo ?? '?'} color="white" avatarUrl={profiles.white.avatar} title={profiles.white.title} countryCode={profiles.white.countryCode} status={profiles.white.status} isActive={isLoaded && turn === 'white'} clock={whiteClock} />
                )}
              </div>
              <ChessBoard
                fen={currentFen} lastMove={lastMove} evaluation={evaluation} boardWidth={boardWidth}
                currentQuality={currentQuality}
                boardOrientation={boardOrientation}
              />
              <div style={{ width: boardWidth + BOARD_ROW_CHROME_WIDTH }}>
                {boardOrientation === 'white' ? (
                  <PlayerCard username={gameInfo?.white ?? 'Brancas'} rating={gameInfo?.whiteElo ?? '?'} color="white" avatarUrl={profiles.white.avatar} title={profiles.white.title} countryCode={profiles.white.countryCode} status={profiles.white.status} isActive={isLoaded && turn === 'white'} clock={whiteClock} />
                ) : (
                  <PlayerCard username={gameInfo?.black ?? 'Pretas'} rating={gameInfo?.blackElo ?? '?'} color="black" avatarUrl={profiles.black.avatar} title={profiles.black.title} countryCode={profiles.black.countryCode} status={profiles.black.status} isActive={isLoaded && turn === 'black'} clock={blackClock} />
                )}
              </div>
            </div>

            {/* Right sidebar — Análise */}
            <ReviewPanel
              gameInfo={gameInfo}
              reviewStarted={reviewStarted}
              moves={moves}
              currentMoveIndex={currentMoveIndex}
              onGoTo={goToMove}
              progress={progress}
              evals={positionEvals}
              whiteAvatar={profiles.white.avatar}
              blackAvatar={profiles.black.avatar}
              onStartReview={handleStartReview}
              isLoaded={isLoaded}
              onFirst={goFirst}
              onPrev={goPrev}
              onNext={goNext}
              onLast={goLast}
              onFlipBoard={flipBoard}
              currentFen={currentFen}
              engineLines={engineLines}
              engineIsAnalyzing={engineIsAnalyzing}
              onPlayFromHere={handlePlayFromHere}
            />
          </>
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UpdatesPanel open={updatesOpen} onClose={() => setUpdatesOpen(false)} />
      <MaintenanceNotice feature={maintenanceFeature} onClose={() => setMaintenanceFeature(null)} />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  )
}
