import { useEffect, useRef, useState } from 'react'
import { FirstMoveIcon, PrevMoveIcon, NextMoveIcon, LastMoveIcon, PlayMoveIcon, PauseMoveIcon, FlipBoardIcon } from './icons'

const AUTOPLAY_INTERVAL_MS = 850
const NAV_BTN = 'cl-btn cl-btn-sm w-9 h-9'

interface BoardControlsProps {
  isLoaded: boolean
  currentMoveIndex: number
  totalMoves: number
  onFirst?: () => void
  onPrev?: () => void
  onNext?: () => void
  onLast?: () => void
  onFlip?: () => void
}

/**
 * Barra de controles da partida — navegação entre lances (com autoplay) + inverter tabuleiro.
 * Fica embaixo da lista de lances no painel de revisão (antes ficava numa coluna vertical ao
 * lado do tabuleiro; layout horizontal aqui porque o espaço disponível agora é mais largo que alto).
 */
export function BoardControls({
  isLoaded, currentMoveIndex, totalMoves,
  onFirst, onPrev, onNext, onLast, onFlip,
}: BoardControlsProps) {
  const atStart = currentMoveIndex === -1
  const atEnd = currentMoveIndex === totalMoves - 1 || totalMoves === 0

  // Autoplay: avança os lances sozinho num intervalo fixo, parando ao chegar no fim
  // ou se o usuário navegar manualmente.
  const [isPlaying, setIsPlaying] = useState(false)
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext

  useEffect(() => {
    if (atEnd) setIsPlaying(false)
  }, [atEnd])

  useEffect(() => {
    if (!isPlaying) return
    const id = window.setInterval(() => onNextRef.current?.(), AUTOPLAY_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [isPlaying])

  function withPauseAutoplay(fn?: () => void) {
    return () => { setIsPlaying(false); fn?.() }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 10,
        background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
      }}
    >
      <button className={NAV_BTN} style={{ color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-bg-panel)' }} onClick={onFlip} title="Inverter tabuleiro">
        <FlipBoardIcon width={15} height={15} />
      </button>

      <div style={{ width: 1, height: 22, background: 'var(--color-gray-border)', margin: '0 2px', flexShrink: 0 }} />

      <button className={NAV_BTN} style={{ color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-bg-panel)' }} onClick={withPauseAutoplay(onFirst)} disabled={atStart || !isLoaded} title="Início">
        <FirstMoveIcon width={15} height={15} />
      </button>
      <button className={NAV_BTN} style={{ color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-bg-panel)' }} onClick={withPauseAutoplay(onPrev)} disabled={atStart || !isLoaded} title="Anterior">
        <PrevMoveIcon width={15} height={15} />
      </button>
      <button
        className={NAV_BTN}
        style={{ color: '#ffffff', backgroundColor: 'var(--color-blue-bright)' }}
        onClick={() => setIsPlaying((p) => !p)}
        disabled={!isLoaded || (atEnd && !isPlaying)}
        title={isPlaying ? 'Pausar' : 'Reproduzir automaticamente'}
      >
        {isPlaying ? <PauseMoveIcon width={15} height={15} /> : <PlayMoveIcon width={15} height={15} />}
      </button>
      <button className={NAV_BTN} style={{ color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-bg-panel)' }} onClick={withPauseAutoplay(onNext)} disabled={atEnd || !isLoaded} title="Próximo">
        <NextMoveIcon width={15} height={15} />
      </button>
      <button className={NAV_BTN} style={{ color: 'var(--color-text-on-dark)', backgroundColor: 'var(--color-bg-panel)' }} onClick={withPauseAutoplay(onLast)} disabled={atEnd || !isLoaded} title="Último">
        <LastMoveIcon width={15} height={15} />
      </button>

      <span className="cl-display" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', fontWeight: 700, minWidth: 50, textAlign: 'center', flexShrink: 0 }}>
        {isLoaded ? (currentMoveIndex === -1 ? '—' : `${currentMoveIndex + 1} / ${totalMoves}`) : '—'}
      </span>
    </div>
  )
}
