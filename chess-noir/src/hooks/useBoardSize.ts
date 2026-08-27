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
// Abaixo desse container (celular — mesmo corte de "tela estreita" usado em index.css), o
// `widthFactor` de fração (deixa ~6% de fora de propósito, pra respirar numa tela grande) passa
// a render um tabuleiro "apertado" — pedido direto do usuário depois de ver ao vivo ("deixa
// tabuleiro maior possivel tipo encostando na borda do celular... para nao ficar apertado"). Num
// container já estreito não sobra tanto espaço assim pra "respirar" — melhor reservar uma margem
// FIXA pequena (`MOBILE_SIDE_MARGIN`, os dois lados juntos) em vez de uma fração, deixando o
// tabuleiro reivindicar quase toda a largura disponível.
const MOBILE_CONTAINER_THRESHOLD = 480
const MOBILE_SIDE_MARGIN = 6

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
    const availableW = containerWidth > 0 ? containerWidth - chromeWidth : 0
    const isMobileContainer = containerWidth > 0 && containerWidth <= MOBILE_CONTAINER_THRESHOLD
    const target = containerWidth > 0
      ? (isMobileContainer ? availableW - MOBILE_SIDE_MARGIN : availableW * widthFactor)
      : 480
    const size = Math.min(target, availableH, maxSize)
    const withFloor = Math.max(MIN_AUTO, Math.round(size))
    // Em telas de celular bem estreitas (largura útil abaixo do piso de MIN_AUTO — não
    // reproduzível redimensionando uma janela de desktop, só calculando: sidebar colapsada
    // (60px) + padding do <main> (20px) + EvalBar (32px) já passam de 112px, sobrando menos
    // de 320px de largura útil em qualquer tela com menos de ~430px de largura real), respeitar
    // o piso forçaria o tabuleiro a vazar horizontalmente pra fora do container. Melhor deixar
    // ele um pouco menor que MIN_AUTO nesse caso raro do que estourar a tela.
    const final = availableW > 0 ? Math.min(withFloor, Math.round(availableW)) : withFloor
    setBoardWidth(final)
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
