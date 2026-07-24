import { useState, useEffect, useRef } from 'react'

interface TheaterControlsProps {
  currentMoveIndex: number
  totalMoves: number
  moveSan: string
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  onExit: () => void
}

const BTN = 'w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-30'

export function TheaterControls({
  currentMoveIndex, totalMoves, moveSan,
  onFirst, onPrev, onNext, onLast, onExit,
}: TheaterControlsProps) {
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const atStart = currentMoveIndex === -1
  const atEnd = currentMoveIndex === totalMoves - 1 || totalMoves === 0

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onNext()
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [playing, onNext])

  useEffect(() => { if (atEnd) setPlaying(false) }, [atEnd])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Lance badge */}
      {moveSan && (
        <div
          className="px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
        >
          {currentMoveIndex === -1 ? 'Posição inicial' : `Lance ${Math.ceil((currentMoveIndex + 1) / 2)}${currentMoveIndex % 2 === 0 ? '.' : '...'} ${moveSan}`}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button className={BTN} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} onClick={onFirst} disabled={atStart}>⏮</button>
        <button className={BTN} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} onClick={onPrev} disabled={atStart}>◀</button>

        <button
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold transition-colors"
          style={{ backgroundColor: playing ? '#e84040' : 'rgba(255,255,255,0.25)' }}
          onClick={() => setPlaying((p) => !p)}
          disabled={atEnd && !playing}
        >
          {playing ? '⏸' : '▶'}
        </button>

        <button className={BTN} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} onClick={onNext} disabled={atEnd}>▶</button>
        <button className={BTN} style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} onClick={onLast} disabled={atEnd}>⏭</button>
      </div>

      <button
        className="text-xs px-4 py-1.5 rounded-full transition-colors"
        style={{ color: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.1)' }}
        onClick={onExit}
      >
        Sair do Modo Teatro (Esc)
      </button>
    </div>
  )
}
