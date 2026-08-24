import type { CoachMessage } from './coachComments'
import type { TopLeak } from './playerReportStats'

export interface ReportStatsSummary {
  overallAccuracy: number
  topLeak: TopLeak | null
}

/**
 * Comentário da capivara pro Relatório do jogador — mesma voz/formato de `coachComments.ts`
 * (headline + corpo), mas keyed em accuracy geral + maior vazamento em vez de um lance isolado
 * (não dá pra reusar `coachComment()` direto: aquele é por-lance, este é agregado).
 */
export function reportComment(stats: ReportStatsSummary): CoachMessage {
  const { overallAccuracy, topLeak } = stats

  if (overallAccuracy >= 85) {
    return {
      headline: `${overallAccuracy}% de precisão — muito sólido!`,
      body: topLeak
        ? `Se quiser afinar ainda mais, "${topLeak.label}" foi o que mais se repetiu — vale um treino rápido.`
        : 'Continue assim, nada de padrão de erro se repetindo por aqui.',
    }
  }

  if (overallAccuracy >= 65) {
    return {
      headline: `${overallAccuracy}% de precisão — no caminho certo.`,
      body: topLeak
        ? `"${topLeak.label}" apareceu em ${topLeak.gamesAffected} partida${topLeak.gamesAffected === 1 ? '' : 's'} — treinar esse ponto deve subir a precisão rápido.`
        : 'Sem partidas analisadas o suficiente ainda pra apontar um vazamento específico.',
    }
  }

  return {
    headline: `${overallAccuracy}% de precisão — dá pra melhorar bastante.`,
    body: topLeak
      ? `"${topLeak.label}" é o vazamento mais comum agora (${topLeak.count} vezes) — é o melhor lugar pra focar o treino.`
      : 'Analise mais partidas pra eu conseguir apontar onde focar o treino.',
  }
}
