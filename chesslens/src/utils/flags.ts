const REGIONAL_INDICATOR_BASE = 0x1F1E6

/** Converte um código de país ISO 3166-1 alpha-2 (ex: "BR") num emoji de bandeira. */
export function countryCodeToFlagEmoji(code: string | null | undefined): string {
  if (!code || code.length !== 2) return ''
  const upper = code.toUpperCase()
  const codePoints = [...upper].map((c) => REGIONAL_INDICATOR_BASE + (c.charCodeAt(0) - 65))
  if (codePoints.some((cp) => cp < REGIONAL_INDICATOR_BASE || cp > REGIONAL_INDICATOR_BASE + 25)) return ''
  return String.fromCodePoint(...codePoints)
}

/** Extrai o código de país de uma URL da API do chess.com (ex: ".../country/BR" -> "BR"). */
export function countryUrlToCode(url: string | null | undefined): string | null {
  const seg = url?.split('/').pop()
  return seg && /^[A-Za-z]{2}$/.test(seg) ? seg : null
}
