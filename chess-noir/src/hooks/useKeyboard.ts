import { useEffect } from 'react'

interface UseKeyboardOptions {
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  /** F — inverte o tabuleiro. Só faz sentido nas mesmas telas que as setas (ver `enabled`). */
  onFlip?: () => void
  /** Esc — sai da ferramenta/modo atual. Diferente de tudo mais aqui: dispara mesmo com
   *  `enabled: false` (setas/F desligados dentro de um treino, por exemplo, mas Esc ainda
   *  precisa fechar aquele treino) — por isso é checado ANTES do early-return de `enabled`. */
  onEscape?: () => void
  enabled?: boolean
}

export function useKeyboard({ onPrev, onNext, onFirst, onLast, onFlip, onEscape, enabled = true }: UseKeyboardOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (e.key === 'Escape') { onEscape?.(); return }
      if (!enabled) return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); if (e.shiftKey) onFirst(); else onPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) onLast(); else onNext() }
      if (e.key === 'f' || e.key === 'F') { onFlip?.() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onFirst, onLast, onFlip, onEscape, enabled])
}
