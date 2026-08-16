// Sons de lance. Não dá pra usar os sons do chess.com de verdade — são proprietários, não é
// permitido redistribuir. Usamos o tema "standard" (padrão) da lichess.org.
const SOUND_BASE = 'https://lichess1.org/assets/sound/standard'

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

const cache = new Map<SoundName, HTMLAudioElement>()

function getAudio(name: SoundName): HTMLAudioElement {
  let audio = cache.get(name)
  if (!audio) {
    audio = new Audio(`${SOUND_BASE}/${SOUND_FILES[name]}`)
    audio.preload = 'auto'
    cache.set(name, audio)
  }
  return audio
}

export function playSound(name: SoundName) {
  const audio = getAudio(name)
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
