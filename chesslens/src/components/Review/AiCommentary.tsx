export interface AiCommentaryProps {
  result: string
  whiteAccuracy: number
  blackAccuracy: number
  blunderCount: number
  brilliantCount: number
  moveCount: number
}

/**
 * Comentário "de IA" — na verdade uma árvore de decisão determinística sobre
 * texto pré-escrito em português (sem chamada de LLM nenhuma). Escolhe uma
 * de ~8 frases canônicas de acordo com resultado, precisão e contagem de
 * erros/brilhantismos da partida.
 */
export function pickComment({ result, whiteAccuracy, blackAccuracy, blunderCount, brilliantCount, moveCount }: AiCommentaryProps): string {
  if (moveCount === 0) return 'Carregue uma partida para eu comentar a análise.'

  const avgAcc = Math.round((whiteAccuracy + blackAccuracy) / 2)
  const isDraw = /1\/2/.test(result)

  if (isDraw) {
    return blunderCount > 0
      ? 'Empate! Mas rolou pelo menos uma capivarada no caminho — dava pra ter fechado antes.'
      : 'Empate equilibrado, sem grandes erros de nenhum dos dois lados.'
  }
  if (brilliantCount > 0) {
    return brilliantCount === 1
      ? 'Teve um lance brilhante nessa partida — um sacrifício que valeu a pena!'
      : `Teve ${brilliantCount} lances brilhantes nessa partida — sacrifícios que valeram a pena!`
  }
  if (avgAcc >= 90) {
    return 'Partida de altíssimo nível — precisão de mestre dos dois lados!'
  }
  if (blunderCount >= 3) {
    return `Foram ${blunderCount} capivaradas ao longo da partida — vários erros que custaram caro.`
  }
  if (blunderCount === 1) {
    return 'Só uma capivarada na partida toda — quase uma execução perfeita.'
  }
  if (avgAcc >= 75) {
    return 'Boa partida! Precisão sólida, com só alguns deslizes pontuais.'
  }
  if (avgAcc < 55) {
    return 'Partida bem imprecisa dos dois lados — tem bastante o que revisar aqui embaixo.'
  }
  return 'Partida equilibrada, com altos e baixos. Vamos ver onde deu pra melhorar.'
}

export function AiCommentary(props: AiCommentaryProps) {
  const text = pickComment(props)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {/* Avatar genérico (emoji, não a mascote do chess.com) */}
      <div
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19,
        }}
      >
        🧑‍🏫
      </div>

      {/* Balão de fala com "rabinho" apontando pro avatar */}
      <div
        style={{
          position: 'relative',
          background: '#f5f5f5',
          color: '#1a1a1a',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 13,
          lineHeight: 1.45,
          flex: 1,
        }}
      >
        <span
          style={{
            position: 'absolute', left: -6, top: 13,
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid #f5f5f5',
          }}
        />
        {text}
      </div>
    </div>
  )
}
