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
      if (e.key === 'ArrowLeft')  { e.preventDefault(); e.shiftKey ? onFirst() : onPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); e.shiftKey ? onLast() : onNext() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPrev, onNext, onFirst, onLast, enabled])
}
