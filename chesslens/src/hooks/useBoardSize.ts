import { useState, useEffect, useCallback, useRef } from 'react'
import type { BoardSize } from '../types/theme.types'

const PRESET_SIZES: Record<BoardSize, number | null> = {
  small:  360,
  medium: 480,
  large:  600,
  auto:   null, // calculado dinamicamente
}

const MIN_AUTO = 320
const DEFAULT_MAX_AUTO = 1060
const DEFAULT_WIDTH_FACTOR = 0.94
// Cards de jogador (compactos) + paddings — controles agora ficam ao lado do tabuleiro, não somam altura.
const DEFAULT_VIEWPORT_H_RESERVE = 136

interface BoardSizeOptions {
  /** Fração da largura do container que o tabuleiro deve ocupar (0-1). */
  widthFactor?: number
  /** Teto absoluto em px, mesmo que o container seja bem largo. */
  maxSize?: number
  /** Altura reservada (cards de jogador, paddings) subtraída do viewport. */
  heightReserve?: number
  /** Largura extra fixa (fora do quadrado do tabuleiro) ocupada por irmãos na mesma linha — ex: EvalBar + coluna de controles. */
  chromeWidth?: number
}

/**
 * Tamanho do tabuleiro. Para o preset `auto`, mede o container apontado por
 * `containerRef` via ResizeObserver e usa `widthFactor` da largura disponível,
 * sempre limitado pela altura de viewport restante (pra não estourar verticalmente).
 */
export function useBoardSize(preset: BoardSize = 'auto', options: BoardSizeOptions = {}) {
  const { widthFactor = DEFAULT_WIDTH_FACTOR, maxSize = DEFAULT_MAX_AUTO, heightReserve = DEFAULT_VIEWPORT_H_RESERVE, chromeWidth = 0 } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [boardWidth, setBoardWidth] = useState(480)

  const calcFromWidth = useCallback((containerWidth: number) => {
    const availableH = window.innerHeight - heightReserve
    const target = containerWidth > 0 ? (containerWidth - chromeWidth) * widthFactor : 480
    const size = Math.min(target, availableH, maxSize)
    setBoardWidth(Math.max(MIN_AUTO, Math.round(size)))
  }, [widthFactor, maxSize, heightReserve, chromeWidth])

  useEffect(() => {
    if (preset !== 'auto') {
      setBoardWidth(PRESET_SIZES[preset]!)
      return
    }

    const el = containerRef.current
    if (!el) {
      // Container ainda não montado nesse ciclo — usa fallback de viewport.
      calcFromWidth(window.innerWidth * 0.6)
      return
    }

    calcFromWidth(el.clientWidth)

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth
      calcFromWidth(w)
    })
    ro.observe(el)

    // Altura de viewport também afeta o cap — reagir a resize da janela.
    const onWindowResize = () => calcFromWidth(el.clientWidth)
    window.addEventListener('resize', onWindowResize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onWindowResize)
    }
  }, [preset, calcFromWidth])

  return { boardWidth, containerRef }
}
