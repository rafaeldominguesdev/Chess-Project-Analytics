import { useEffect, useState } from 'react'

/** Verdadeiro quando o usuário pediu menos movimento no sistema — usado pra desligar animações
 *  que só dá pra controlar via JS (ex: `animation` inline num square do tabuleiro, que a lib de
 *  terceiros só aceita como `CSSProperties`, sem gancho pra classe/media query do nosso CSS). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return reduced
}
