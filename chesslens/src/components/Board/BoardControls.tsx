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
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, rowGap: 6,
        // `flexWrap` (não um breakpoint fixo): os 6 botões + divisor + contador têm ~330px de
        // largura mínima somada, e esse rodapé fica FORA da área rolável (`.cl-tool-aside-scroll`,
        // ver ReviewPanel.tsx) — sem wrap, numa coluna estreita de celular eles ficavam clipados
        // sem nenhum jeito de alcançar o que cortava. Sempre ligado (não só <430px): não custa
        // nada em telas largas, onde nunca chega a precisar quebrar linha.
        flexWrap: 'wrap',
        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
      }}
    >
      <button className={NAV_BTN} onClick={onFlip} title="Inverter tabuleiro" aria-label="Inverter tabuleiro">
        <FlipBoardIcon width={15} height={15} />
      </button>

      <div style={{ width: 1, height: 22, background: 'var(--color-gray-border)', margin: '0 2px', flexShrink: 0 }} />

      <button className={NAV_BTN} onClick={withPauseAutoplay(onFirst)} disabled={atStart || !isLoaded} title="Início" aria-label="Ir para o início">
        <FirstMoveIcon width={15} height={15} />
      </button>
      <button className={NAV_BTN} onClick={withPauseAutoplay(onPrev)} disabled={atStart || !isLoaded} title="Anterior" aria-label="Lance anterior">
        <PrevMoveIcon width={15} height={15} />
      </button>
      <button
        className={`${NAV_BTN} cl-btn-accent`}
        onClick={() => setIsPlaying((p) => !p)}
        disabled={!isLoaded || (atEnd && !isPlaying)}
        title={isPlaying ? 'Pausar' : 'Reproduzir automaticamente'}
        aria-label={isPlaying ? 'Pausar reprodução automática' : 'Reproduzir automaticamente'}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <PauseMoveIcon width={15} height={15} /> : <PlayMoveIcon width={15} height={15} />}
      </button>
      <button className={NAV_BTN} onClick={withPauseAutoplay(onNext)} disabled={atEnd || !isLoaded} title="Próximo" aria-label="Próximo lance">
        <NextMoveIcon width={15} height={15} />
      </button>
      <button className={NAV_BTN} onClick={withPauseAutoplay(onLast)} disabled={atEnd || !isLoaded} title="Último" aria-label="Ir para o último lance">
        <LastMoveIcon width={15} height={15} />
      </button>

      <span className="cl-mono" style={{ fontSize: 11.5, color: 'var(--color-gray-muted)', fontWeight: 700, minWidth: 50, textAlign: 'center', flexShrink: 0 }}>
        {isLoaded ? (currentMoveIndex === -1 ? '—' : `${currentMoveIndex + 1} / ${totalMoves}`) : '—'}
      </span>
    </div>
  )
}
