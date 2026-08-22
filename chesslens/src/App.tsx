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
import { AnalysisBoardView } from './components/Analysis/AnalysisBoardView'
import { PositionEditorView } from './components/PositionEditor/PositionEditorView'
import { PlayerCard } from './components/Theater/PlayerCard'
import { Sidebar } from './components/Layout/Sidebar'
import { MaintenanceNotice } from './components/Layout/MaintenanceNotice'
import { HomePage } from './components/Home/HomePage'
import { usePlayerProfiles } from './hooks/useChesscomApi'
import { useMoveSound } from './hooks/useMoveSound'
import { classifyMove, toWhiteCp, materialForSide } from './utils/moveClassifier'
import { isBookMove } from './utils/openingsDatabase'

function AppInner() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Modo de treino de táticas — não é um modal, substitui o conteúdo principal (igual à análise).
  const [trainingMode, setTrainingMode] = useState(false)
  // Tabuleiro de análise livre (posição inicial, joga dos dois lados) — mesmo esquema do treino:
  // substitui o conteúdo principal, mutuamente exclusivo com ele e com a revisão de partida.
  const [boardMode, setBoardMode] = useState(false)
  // Editor de posição livre ("Definir Posição") — mesmo esquema dos outros modos: substitui o
  // conteúdo principal, mutuamente exclusivo com eles.
  const [positionEditorMode, setPositionEditorMode] = useState(false)
  // FEN vindo do editor de posição, aguardando o Tabuleiro montar já nessa posição — some (volta
  // pro padrão) assim que o Tabuleiro é aberto por qualquer outro caminho.
  const [pendingBoardFen, setPendingBoardFen] = useState<string | undefined>(undefined)
  // Nome da função clicada num item de menu "em manutenção" (ver Sidebar) — null = fechado.
  const [maintenanceFeature, setMaintenanceFeature] = useState<string | null>(null)
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
  const { evaluation, isReady, analyze } = useStockfish(15)
  const { analyzeGame, progress } = useGameAnalysis(12)
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

  // Reseta o flag de revisão sempre que uma partida nova é carregada.
  useEffect(() => {
    setReviewStarted(false)
  }, [gameInfo])

  // Avaliação ao vivo da posição atual
  useEffect(() => {
    if (isLoaded && isReady) analyze(currentFen)
  }, [currentFen, isLoaded, isReady, analyze])

  // Refs para evitar re-disparo da análise completa a cada classificação
  const movesRef = useRef(moves)
  movesRef.current = moves
  const updateRef = useRef(updateMoveClassification)
  updateRef.current = updateMoveClassification

  // Análise da partida inteira: classifica cada lance (roda em segundo plano assim que a partida carrega)
  useEffect(() => {
    if (!isLoaded || fens.length < 2) { setPositionEvals([]); return }
    const whiteEvals: number[] = []
    const bestMoves: (string | null)[] = []
    setPositionEvals([])

    analyzeGame(fens, (i, e) => {
      const stm = fens[i].split(' ')[1] === 'b' ? 'b' : 'w'
      whiteEvals[i] = toWhiteCp(e.cp, e.mate, stm)
      bestMoves[i] = e.bestMove ?? null
      setPositionEvals([...whiteEvals])

      const m = i - 1
      if (m >= 0 && whiteEvals[m] !== undefined) {
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
    })
  }, [fens, isLoaded, analyzeGame])

  useKeyboard({
    onPrev: goPrev, onNext: goNext, onFirst: goFirst, onLast: goLast,
    // Desligado no tabuleiro de análise livre também — lá as setas navegariam por engano o
    // histórico da revisão escondida atrás, em vez do próprio jogo livre (que não usa teclado).
    enabled: !settingsOpen && !trainingMode && !boardMode && !positionEditorMode,
  })

  const handleAnalyzeGame = useCallback((pgn: string) => {
    try {
      loadPgn(pgn)
    } catch {
      // PGN inválido vindo da API do chess.com/Lichess — ignora silenciosamente.
    }
  }, [loadPgn])

  const handleStartReview = useCallback(() => {
    setReviewStarted(true)
    goFirst()
  }, [goFirst])

  const flipBoard = useCallback(() => {
    setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))
  }, [])

  const profiles = usePlayerProfiles(gameInfo?.white, gameInfo?.black)
  const turn = currentFen.split(' ')[1] === 'b' ? 'black' : 'white'
  const currentQuality = currentMoveIndex >= 0 ? moves[currentMoveIndex]?.classification ?? null : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--color-bg-main)', color: 'var(--color-text-on-dark)' }}>
      <Sidebar
        onSettings={() => setSettingsOpen(true)}
        onToggleTraining={() => { setTrainingMode((v) => !v); setBoardMode(false); setPositionEditorMode(false) }}
        onToggleBoard={() => { setBoardMode((v) => !v); setTrainingMode(false); setPositionEditorMode(false); setPendingBoardFen(undefined) }}
        onGoHome={() => { setTrainingMode(false); setBoardMode(false); setPositionEditorMode(false); setPendingBoardFen(undefined); unloadGame() }}
        onAnalyzeClick={() => { setTrainingMode(false); setBoardMode(false); setPositionEditorMode(false); setPendingBoardFen(undefined); unloadGame() }}
        onMaintenanceClick={setMaintenanceFeature}
        onTogglePositionEditor={() => { setPositionEditorMode((v) => !v); setTrainingMode(false); setBoardMode(false) }}
        trainingActive={trainingMode}
        boardActive={boardMode}
        positionEditorActive={positionEditorMode}
      />

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', gap: 10, padding: 10, minHeight: '100vh' }}>
        {trainingMode ? (
          <TrainingView boardWidth={boardWidth} containerRef={containerRef} />
        ) : positionEditorMode ? (
          <PositionEditorView
            boardWidth={boardWidth}
            containerRef={containerRef}
            onAnalyze={(fen) => { setPendingBoardFen(fen); setBoardMode(true); setPositionEditorMode(false) }}
          />
        ) : boardMode ? (
          <AnalysisBoardView boardWidth={boardWidth} containerRef={containerRef} initialFen={pendingBoardFen} />
        ) : !isLoaded ? (
          <HomePage onAnalyzeGame={handleAnalyzeGame} />
        ) : (
          <>
            {/* Center */}
            <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
              {/* Card de cima é sempre o lado "distante" — troca de posição junto com o flip do tabuleiro. */}
              <div style={{ width: boardWidth + BOARD_ROW_CHROME_WIDTH }}>
                {boardOrientation === 'white' ? (
                  <PlayerCard username={gameInfo?.black ?? 'Pretas'} rating={gameInfo?.blackElo ?? '?'} color="black" avatarUrl={profiles.black.avatar} title={profiles.black.title} countryCode={profiles.black.countryCode} status={profiles.black.status} isActive={isLoaded && turn === 'black'} />
                ) : (
                  <PlayerCard username={gameInfo?.white ?? 'Brancas'} rating={gameInfo?.whiteElo ?? '?'} color="white" avatarUrl={profiles.white.avatar} title={profiles.white.title} countryCode={profiles.white.countryCode} status={profiles.white.status} isActive={isLoaded && turn === 'white'} />
                )}
              </div>
              <ChessBoard
                fen={currentFen} lastMove={lastMove} evaluation={evaluation} boardWidth={boardWidth}
                currentQuality={currentQuality}
                boardOrientation={boardOrientation}
              />
              <div style={{ width: boardWidth + BOARD_ROW_CHROME_WIDTH }}>
                {boardOrientation === 'white' ? (
                  <PlayerCard username={gameInfo?.white ?? 'Brancas'} rating={gameInfo?.whiteElo ?? '?'} color="white" avatarUrl={profiles.white.avatar} title={profiles.white.title} countryCode={profiles.white.countryCode} status={profiles.white.status} isActive={isLoaded && turn === 'white'} />
                ) : (
                  <PlayerCard username={gameInfo?.black ?? 'Pretas'} rating={gameInfo?.blackElo ?? '?'} color="black" avatarUrl={profiles.black.avatar} title={profiles.black.title} countryCode={profiles.black.countryCode} status={profiles.black.status} isActive={isLoaded && turn === 'black'} />
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
            />
          </>
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
