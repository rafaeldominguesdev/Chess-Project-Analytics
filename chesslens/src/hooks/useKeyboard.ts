import { useEffect } from 'react'

interface UseKeyboardOptions {
  onPrev: () => void
  onNext: () => void
  onFirst: () => void
  onLast: () => void
  enabled?: boolean
}

export function useKeyboard({ onPrev, onNext, onFirst, onLast, enabled = true }: UseKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'TEXTAREA' || tag === 'INPUT') return
      if (e.key === 'ArrowLeft')  { e.preventDefault(); if (e.shiftKey) onFirst(); else onPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (e.shiftKey) onLast(); else onNext() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onFirst, onLast, enabled])
}
