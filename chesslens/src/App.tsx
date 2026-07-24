import { useState, useEffect, useCallback, useRef } from 'react'
import './index.css'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { useChessGame } from './hooks/useChessGame'
import { useStockfish } from './hooks/useStockfish'
import { useGameAnalysis } from './hooks/useGameAnalysis'
import { useKeyboard } from './hooks/useKeyboard'
import { useBoardSize } from './hooks/useBoardSize'
import { ChessBoard } from './components/Board/ChessBoard'
import { PositionEditor } from './components/Board/PositionEditor'
import { ReviewPanel } from './components/Review/ReviewPanel'
import { SettingsPanel } from './components/Settings/SettingsPanel'
import { TheaterMode } from './components/Theater/TheaterMode'
import { PlayerCard } from './components/Theater/PlayerCard'
import { Panel } from './components/Panel'
import { ModeSwitcher } from './components/Layout/ModeSwitcher'
import type { AppMode } from './components/Layout/ModeSwitcher'
import { TrainMode } from './components/Train/TrainMode'
import { PlayMode } from './components/Play/PlayMode'
import { usePlayerProfiles } from './hooks/useChesscomApi'
import { useMoveSound } from './hooks/useMoveSound'
import { classifyMove, toWhiteCp, materialForSide } from './utils/moveClassifier'
import PlayerSearch from './components/PlayerSearch/PlayerSearch'

function AppInner() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theaterMode, setTheaterMode] = useState(false)
  const [positionEvals, setPositionEvals] = useState<number[]>([])
  const [mode, setMode] = useState<AppMode>('review')
  const [playStartFen, setPlayStartFen] = useState<string | undefined>(undefined)

  const {
    currentFen, currentMoveIndex, moves, fens, gameInfo, isLoaded,
    goToMove, goFirst, goPrev, goNext, goLast, loadPgn, lastMove,
    updateMoveClassification,
  } = useChessGame()

  const { theme } = useTheme()
  const { boardWidth, containerRef } = useBoardSize(theme.boardSize)
  const { evaluation, isReady, isAnalyzing, analyze } = useStockfish(15)
  const { analyzeGame, progress } = useGameAnalysis(12)
  const { playForSan } = useMoveSound()

  // Som de lance ao navegar entre posições (review). Fica num único lugar
  // (não dentro de ChessBoard/TheaterMode) porque os dois podem estar
  // montados ao mesmo tempo e tocariam o som em dobro.
  const prevMoveIndexRef = useRef(currentMoveIndex)
  useEffect(() => {
    const prev = prevMoveIndexRef.current
    prevMoveIndexRef.current = currentMoveIndex
    if (isLoaded && currentMoveIndex >= 0 && currentMoveIndex !== prev && moves[currentMoveIndex]) {
      playForSan(moves[currentMoveIndex].san)
    }
  }, [currentMoveIndex, isLoaded, moves, playForSan])

  // Avaliação ao vivo da posição atual (só no modo revisar)
  useEffect(() => {
    if (mode === 'review' && isLoaded && isReady) analyze(currentFen)
  }, [currentFen, isLoaded, isReady, analyze, mode])

  // Refs para evitar re-disparo da análise completa a cada classificação
  const movesRef = useRef(moves)
  movesRef.current = moves
  const updateRef = useRef(updateMoveClassification)
  updateRef.current = updateMoveClassification

  // Análise da partida inteira: classifica cada lance (roda quando carrega nova partida)
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
        let cls = classifyMove(before, after, mv.color, isBest, false, materialDelta)
        if (m < 8 && (cls === 'good' || cls === 'best')) cls = 'book'
        updateRef.current(m, cls, before, after, bm)
      }
    })
  }, [fens, isLoaded, analyzeGame])

  useKeyboard({
    onPrev: goPrev, onNext: goNext, onFirst: goFirst, onLast: goLast,
    onTheater: () => setTheaterMode(true),
    enabled: mode === 'review' && !theaterMode && !settingsOpen,
  })

  const handleEditorPlay = useCallback((fen: string, target: 'play' | 'review') => {
    if (target === 'play') {
      setPlayStartFen(fen)
      setMode('play')
    } else {
      loadPgn(`[SetUp "1"]\n[FEN "${fen}"]\n\n*`)
      setMode('review')
    }
  }, [loadPgn])

  const profiles = usePlayerProfiles(gameInfo?.white, gameInfo?.black)
  const turn = currentFen.split(' ')[1] === 'b' ? 'black' : 'white'
  const currentQuality = currentMoveIndex >= 0 ? moves[currentMoveIndex]?.classification ?? null : null

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Navbar */}
      <header style={{ background: 'linear-gradient(90deg, var(--surface), var(--surface2))', borderBottom: '1px solid var(--border)', padding: '0 20px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 30, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 28 }}>♟️</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--accent)', letterSpacing: '-0.02em' }}>ChessLens</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Análise & Treino</span>
          </div>
        </div>

        <ModeSwitcher mode={mode} onChange={setMode} />

        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <PlayerSearch />
          <button
            title="Modo Teatro (T)"
            onClick={() => setTheaterMode(true)}
            disabled={!isLoaded || mode !== 'review'}
            style={{ padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', cursor: isLoaded ? 'pointer' : 'not-allowed', opacity: isLoaded && mode === 'review' ? 1 : 0.5 }}
          >
            ⛶ Teatro
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Configurações"
            style={{ padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            ⚙ Config
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ display: 'flex', gap: 12, padding: 12, minHeight: 'calc(100vh - 64px)' }}>

        {/* Left sidebar — Detalhes da partida (só quando há uma carregada) */}
        {gameInfo && (
          <aside style={{ width: 250, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Panel icon="ℹ️" title="Detalhes">
              <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([['Evento', gameInfo.event], ['Data', gameInfo.date], ['Resultado', gameInfo.result], ...(gameInfo.termination ? [['Término', gameInfo.termination]] : [])] as [string, string][]).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ color: k === 'Resultado' ? 'var(--accent)' : 'var(--text)', fontWeight: k === 'Resultado' ? 700 : 400, textAlign: 'right', maxWidth: 150 }}>{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        )}

        {/* Center */}
        <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 8 }}>
          {mode === 'review' && (
            <>
              <div style={{ width: boardWidth + 32 }}>
                <PlayerCard username={gameInfo?.black ?? 'Pretas'} rating={gameInfo?.blackElo ?? '?'} color="black" avatarUrl={profiles.black.avatar} title={profiles.black.title} isActive={isLoaded && turn === 'black'} />
              </div>
              <ChessBoard
                fen={currentFen} lastMove={lastMove} evaluation={evaluation} isLoaded={isLoaded}
                currentMoveIndex={currentMoveIndex} totalMoves={moves.length} boardWidth={boardWidth}
                currentQuality={currentQuality}
                onFirst={goFirst} onPrev={goPrev} onNext={goNext} onLast={goLast} onTheater={() => setTheaterMode(true)}
              />
              <div style={{ width: boardWidth + 32 }}>
                <PlayerCard username={gameInfo?.white ?? 'Brancas'} rating={gameInfo?.whiteElo ?? '?'} color="white" avatarUrl={profiles.white.avatar} title={profiles.white.title} isActive={isLoaded && turn === 'white'} />
              </div>
            </>
          )}

          {mode === 'train' && <TrainMode moves={moves} isLoaded={isLoaded} boardWidth={boardWidth} />}
          {mode === 'play' && <PlayMode startFen={playStartFen} />}
          {mode === 'setup' && <PositionEditor boardWidth={boardWidth} onPlay={handleEditorPlay} />}
        </div>

        {/* Right sidebar — Análise (só no modo revisar) */}
        {mode === 'review' && (
          <ReviewPanel
            gameInfo={gameInfo}
            evaluation={evaluation}
            isReady={isReady}
            isAnalyzing={isAnalyzing}
            isLoaded={isLoaded}
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onGoTo={goToMove}
            progress={progress}
            evals={positionEvals}
            whiteAvatar={profiles.white.avatar}
            blackAvatar={profiles.black.avatar}
            onStartReview={goFirst}
          />
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {theaterMode && mode === 'review' && (
        <TheaterMode
          fen={currentFen} lastMove={lastMove} moves={moves} currentMoveIndex={currentMoveIndex}
          totalMoves={moves.length} gameInfo={gameInfo} evaluation={evaluation}
          onFirst={goFirst} onPrev={goPrev} onNext={goNext} onLast={goLast} onExit={() => setTheaterMode(false)}
        />
      )}
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
