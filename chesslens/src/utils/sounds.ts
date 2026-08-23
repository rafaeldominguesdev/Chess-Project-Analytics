// Sons de lance. Não dá pra usar os sons do chess.com de verdade — são proprietários, não é
// permitido redistribuir (pedido direto do usuário: "quero algo igual do chess.com" — não dá,
// mas ele pode escolher entre os temas do lichess.org, que são livres, em vez de ficar preso só
// no "standard" — pedido dele: "coloca todos os sons pra pessoa poder escolher qual prefiro").
const SOUND_BASE = 'https://lichess1.org/assets/sound'

export const SOUND_THEMES = {
  standard: 'Padrão',
  piano: 'Piano',
  nes: 'NES (8-bit)',
  sfx: 'Efeitos (SFX)',
  futuristic: 'Futurista',
  lisp: 'Lisp',
  robot: 'Robô',
} as const

export type SoundTheme = keyof typeof SOUND_THEMES

const SOUND_FILES = {
  move: 'Move.mp3',
  capture: 'Capture.mp3',
  check: 'Check.mp3',
  victory: 'Victory.mp3',
  defeat: 'Defeat.mp3',
  draw: 'Draw.mp3',
  error: 'Error.mp3',
} as const

export type SoundName = keyof typeof SOUND_FILES

const cache = new Map<string, HTMLAudioElement>()

function getAudio(theme: SoundTheme, name: SoundName): HTMLAudioElement {
  const key = `${theme}:${name}`
  let audio = cache.get(key)
  if (!audio) {
    audio = new Audio(`${SOUND_BASE}/${theme}/${SOUND_FILES[name]}`)
    audio.preload = 'auto'
    cache.set(key, audio)
  }
  return audio
}

export function playSound(name: SoundName, theme: SoundTheme = 'standard') {
  const audio = getAudio(theme, name)
  audio.currentTime = 0
  // Autoplay pode ser bloqueado fora de um gesto do usuário; ignoramos o erro.
  void audio.play().catch(() => {})
}

/** Deduz o som a partir do SAN do lance (ex: "Nxf3+", "O-O", "e4"). */
export function soundForSan(san: string): SoundName {
  if (san.includes('+') || san.includes('#')) return 'check'
  if (san.includes('x')) return 'capture'
  return 'move'
}
