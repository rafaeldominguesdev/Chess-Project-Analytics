// Placar de domínio genérico, reaproveitado por qualquer modo de treino com repetição (hoje:
// Treino de Aberturas por família/variação, Treino de Erros por motivo de erro) — persistido em
// localStorage, chave e granularidade decididas por quem chama, não por este módulo.
export interface MasteryStats {
  attempts: number
  /** 0-100, média móvel entre sessões — não é um SM-2/FSRS de verdade (sem intervalo de
   *  repetição por enquanto), só um placar de "quão bem isso tem ido ultimamente" pra priorizar
   *  o que precisa de mais prática. */
  mastery: number
  lastPracticed: number
}

export function loadJsonRecord(key: string): Record<string, MasteryStats> {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveJsonRecord(key: string, value: Record<string, MasteryStats>) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* localStorage indisponível — ignora */ }
}

// Atualiza o placar (mesmo formato `MasteryStats`, chave qualquer) com o resultado de uma sessão:
// começa em 100, cada erro tira `penaltyPerWrong` (nunca abaixo de 0), e combina com o histórico
// numa média móvel (65% do que já tinha, 35% da sessão nova) — pura, sem I/O; quem chama decide
// quando persistir.
export function bumpMastery(
  prev: Record<string, MasteryStats>, key: string, wrongCount: number, penaltyPerWrong: number,
): Record<string, MasteryStats> {
  const old = prev[key] ?? { attempts: 0, mastery: 50, lastPracticed: 0 }
  const sessionScore = Math.max(0, 100 - wrongCount * penaltyPerWrong)
  const mastery = Math.round(old.mastery * 0.65 + sessionScore * 0.35)
  return { ...prev, [key]: { attempts: old.attempts + 1, mastery, lastPracticed: Date.now() } }
}

// Mesmo amarelo de QUALITY_CONFIG.inaccuracy.color (moveClassifier.ts) — coincidência aceitável,
// não é uma cor de resultado (`--color-success/error/draw`), é só o degrau do meio de um
// semáforo de mastery, categoria à parte.
const MASTERY_YELLOW = '#F0C548'

/** Cor "semáforo" pra um valor de mastery (0-100) — verde/amarelo/vermelho, mesmo limiar usado
 *  no Treino de Aberturas, reaproveitado por qualquer tela que mostre mastery (Relatório do
 *  jogador, Sprint 3, inclusive). */
export function masteryColor(m: number): string {
  if (m >= 80) return 'var(--color-success)'
  if (m >= 50) return MASTERY_YELLOW
  return 'var(--color-error)'
}
