import { useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { playSound, soundForSan, type SoundName } from '../utils/sounds'

export function useMoveSound() {
  const { theme } = useTheme()

  const playForSan = useCallback((san: string) => {
    if (theme.soundEnabled) playSound(soundForSan(san), theme.soundTheme)
  }, [theme.soundEnabled, theme.soundTheme])

  const play = useCallback((name: SoundName) => {
    if (theme.soundEnabled) playSound(name, theme.soundTheme)
  }, [theme.soundEnabled, theme.soundTheme])

  return { playForSan, play }
}
