import { useState, useEffect, useCallback } from 'react'
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
 *
 * `containerRef` é um callback ref (não `useRef` comum) guardando o nó em state: o mesmo
 * `containerRef` é reaproveitado pelas 4 telas com tabuleiro (Tabuleiro, Definir Posição,
 * Revisão de partida, Puzzles) só uma delas montada por vez, então o `<div>` que ele aponta
 * é desmontado/remontado a cada troca de tela. Com `useRef` puro, o efeito que cria o
 * `ResizeObserver` só roda uma vez (no primeiro mount do hook, geralmente na Home, onde não
 * existe nenhum container ainda) e nunca mais — trocar de tela depois disso deixava o
 * `boardWidth` travado no valor de fallback (`window.innerWidth * 0.6`) pra sempre, porque
 * ninguém observava o container de verdade. Guardando o nó em state, o efeito abaixo tem
 * `node` nas deps e roda de novo (desligando o observer antigo, ligando um novo) toda vez
 * que a pessoa navega pra uma tela diferente com tabuleiro.
 */
export function useBoardSize(preset: BoardSize = 'auto', options: BoardSizeOptions = {}) {
  const { widthFactor = DEFAULT_WIDTH_FACTOR, maxSize = DEFAULT_MAX_AUTO, heightReserve = DEFAULT_VIEWPORT_H_RESERVE, chromeWidth = 0 } = options
  const [node, setNode] = useState<HTMLDivElement | null>(null)
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

    if (!node) {
      // Nenhuma tela com tabuleiro montada agora (ex: Home/Analisar) — usa fallback de viewport.
      calcFromWidth(window.innerWidth * 0.6)
      return
    }

    calcFromWidth(node.clientWidth)

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? node.clientWidth
      calcFromWidth(w)
    })
    ro.observe(node)

    // Altura de viewport também afeta o cap — reagir a resize da janela.
    const onWindowResize = () => calcFromWidth(node.clientWidth)
    window.addEventListener('resize', onWindowResize)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onWindowResize)
    }
  }, [preset, node, calcFromWidth])

  const containerRef = useCallback((el: HTMLDivElement | null) => setNode(el), [])

  return { boardWidth, containerRef }
}
