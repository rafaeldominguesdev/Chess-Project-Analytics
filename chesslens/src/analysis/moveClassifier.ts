export type MoveQuality =
  | 'brilliant' | 'excellent' | 'book' | 'best' | 'great'
  | 'good' | 'inaccuracy' | 'mistake' | 'miss' | 'blunder'

// Paleta de alto contraste, cada categoria numa cor bem distinta das vizinhas — prioridade é
// dar pra reconhecer a classificação de relance na lista de lances, sem confundir uma com outra.
export const QUALITY_CONFIG: Record<MoveQuality, { symbol: string; color: string; label: string; bg: string }> = {
  brilliant:  { symbol: '‼',  color: '#1BACA6', label: 'Brilhante',      bg: '#0D5E5B' },
  excellent:  { symbol: '!',  color: '#5C8BB0', label: 'Excelente',      bg: '#2A4A63' },
  book:       { symbol: '📖', color: '#A88865', label: 'Livro',          bg: '#3D2E1A' },
  best:       { symbol: '★',  color: '#9DC571', label: 'Melhor',         bg: '#3D5A2A' },
  great:      { symbol: '👍', color: '#7FA650', label: 'Ótimo',          bg: '#33421C' },
  good:       { symbol: '✓',  color: '#96BC4B', label: 'Bom',            bg: '#3A4D1E' },
  inaccuracy: { symbol: '?!', color: '#F0C548', label: 'Imprecisão',     bg: '#5E4D1A' },
  mistake:    { symbol: '?',  color: '#E58C2D', label: 'Erro',           bg: '#5E3A10' },
  miss:       { symbol: '✗',  color: '#E84040', label: 'Chance Perdida', bg: '#5E1A1A' },
  blunder:    { symbol: '??', color: '#C62E2E', label: 'Capivarada',     bg: '#4A1414' },
}

// Ordem de exibição usada pelas telas de revisão (mesma ordem da tabela do chess.com).
export const QUALITY_ORDER: MoveQuality[] = [
  'brilliant', 'excellent', 'book', 'best', 'great', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder',
]

/** Converte a cor (hex) de uma classificação para rgba com a transparência pedida. */
export function qualityAlphaColor(quality: MoveQuality, alpha: number): string {
  const hex = QUALITY_CONFIG[quality].color.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 }

/**
 * Soma o valor material (P=1,N=3,B=3,R=5,Q=9) das peças de `color` na posição do FEN.
 * Rei não entra na conta (valor não-comparável entre posições).
 */
export function materialForSide(fen: string, color: 'w' | 'b'): number {
  const placement = fen.split(' ')[0]
  let total = 0
  for (const ch of placement) {
    const lower = ch.toLowerCase()
    const value = PIECE_VALUES[lower]
    if (!value) continue
    const isWhitePiece = ch !== lower
    if ((color === 'w') === isWhitePiece) total += value
  }
  return total
}

// Mesma curva de "chance de vitória" que o Lichess usa pra converter centipawns numa escala que
// achata perto dos extremos (`EvalBar.tsx` importa daqui em vez de ter sua própria cópia — fonte
// única). Isso é o que faltava aqui: classificar por CENTIPAWNS BRUTOS (como este arquivo fazia
// antes) faz uma queda de 50cp parecer igual de grave numa posição equilibrada e numa posição já
// ganha de +8 — na prática, marcava "Excelente"/"Ótimo" demais em partidas de nível muito alto,
// porque com o motor em profundidade 18 boa parte dos lances tem queda bruta pequena mesmo sem
// ser literalmente o lance nº1. Convertendo pra "% de chance de vitória" antes de medir a queda
// (mesma técnica que o chess.com/Lichess usam de verdade) resolve isso nos dois sentidos: fica
// mais tolerante em posições já decididas (onde nada realmente muda a chance de vencer) e mais
// rigoroso perto do equilíbrio (onde poucos centipawns já mudam bastante a chance de vitória).
export function winningChances(cp: number): number {
  const MULTIPLIER = -0.00368208
  return 2 / (1 + Math.exp(MULTIPLIER * cp)) - 1 // -1..1
}

/** `cp` na perspectiva de quem jogou → % de chance de vitória (0-100) desse lado. */
function winPercent(cp: number): number {
  return 50 + 50 * winningChances(cp)
}

/**
 * Classifica um lance comparando a % de chance de vitória (perspectiva de quem jogou) antes e
 * depois do lance. `winDrop` = quantos pontos percentuais de chance de vitória o lance custou.
 *
 * Limiares de inaccuracy/mistake/blunder (10/20/30 de queda) são os mesmos publicados pelo
 * Lichess (`lila`/scalachess, código aberto, feito de propósito pra ficar parecido com o
 * chess.com) — os de excellent/great/good não são públicos em nenhum dos dois sites, então
 * continuam uma aproximação (mais estreita que a versão anterior baseada em cp bruto).
 *
 * `materialDelta` = material próprio perdido pelo lance (positivo = sacrificou material).
 * Este app só tem análise single-PV (sem multi-PV como o algoritmo real do chess.com), então
 * esta é uma aproximação honesta, não uma cópia exata.
 *
 * `CALIBRATION_MULTIPLIER`: comparação real feita pelo usuário — mesma partida analisada aqui e
 * no chess.com de verdade (`rafexzk` vs `W_Sanches`, 27 lances, 23/08/2026), lance a lance: o
 * chess.com marcou ~15% dos lances de brancas como algum tipo de erro (3 imprecisão + 1 miss em
 * 27), este app marcava só ~4% (1 imprecisão em 27) com os limiares antigos — e um lance real,
 * "24. Kxf1", que o chess.com marca como imprecisão, esta análise marcava como "Melhor" (era
 * literalmente a recomendação do motor aqui). Não é só limiar mal calibrado: a queda de % de
 * chance de vitória que ESTE motor calcula (Stockfish 18 single-PV, profundidade 18, no
 * navegador) tende a sair menor que o que o sistema do chess.com usa como referência pra mesma
 * jogada — sem acesso ao motor/profundidade exatos deles, não dá pra igualar de verdade, então
 * a saída é recalibrar: multiplica a queda calculada por esse fator ANTES de classificar/pontuar,
 * empurrando os limiares "efetivos" pra baixo de propósito. Ajustado pra aproximar os dois pontos
 * reais de calibração que existem até agora (essa partida casual, 78.4% real vs muito mais alto
 * antes daqui; e uma partida do Magnus Carlsen de nível altíssimo, 84% real, que já batia bem
 * com o multiplicador 1x — jogo de altíssimo nível tem poucos lances com queda grande, então o
 * multiplicador mexe pouco nele e mexe muito nos jogos com mais erro real, como esse aqui).
 */
export const CALIBRATION_MULTIPLIER = 1.8

export function classifyMove(
  evalBefore: number,
  evalAfter: number,
  color: 'w' | 'b',
  isBestMove: boolean,
  isBook: boolean,
  materialDelta = 0,
): MoveQuality {
  if (isBook) return 'book'
  // Normaliza para a perspectiva de quem jogou
  const before = color === 'w' ? evalBefore : -evalBefore
  const after = color === 'w' ? evalAfter : -evalAfter
  const winDrop = Math.max(0, winPercent(before) - winPercent(after)) * CALIBRATION_MULTIPLIER

  if (isBestMove) {
    // Lance melhor que sacrifica material numa posição aproximadamente equilibrada
    if (materialDelta > 0 && Math.abs(before) < 400) return 'brilliant'
    return 'best'
  }
  // "Excelente" bem mais raro que antes (era <2) — pedido direto do usuário: "lance bom é
  // normal", quer a categoria reservada pra queda quase zero de verdade, não só "bem próximo do
  // melhor". Continua existindo espaço pra "Ótimo" logo abaixo pegar o que sobrar.
  if (winDrop < 0.8) return 'excellent'
  if (winDrop < 5) return 'great'
  if (winDrop < 10) return 'good'
  if (winDrop < 20) return 'inaccuracy'
  // Estava claramente ganhando (cp bruto, não %) e jogou fora boa parte da vantagem
  if (before >= 200 && winDrop >= 20 && winDrop < 30) return 'miss'
  if (winDrop < 30) return 'mistake'
  return 'blunder'
}

/** Converte um score do Stockfish para centipawns na perspectiva das brancas. */
export function toWhiteCp(cp: number | null, mate: number | null, sideToMove: 'w' | 'b'): number {
  let v: number
  if (mate !== null) v = mate > 0 ? 2000 : -2000
  else v = cp ?? 0
  // score do engine é relativo a quem joga → converte para brancas
  const white = sideToMove === 'w' ? v : -v
  return Math.max(-2000, Math.min(2000, white))
}

// Fórmula publicada (usada pelo Lichess como equivalente ao "accuracy" do chess.com) que converte
// a queda de % de chance de vitória de UM lance num "quão preciso foi esse lance", de 0 a 100.
function moveAccuracy(winDrop: number): number {
  const raw = 103.1668 * Math.exp(-0.04354 * winDrop) - 3.1669
  return Math.max(0, Math.min(100, raw))
}

/**
 * Precisão de UM lance isolado (0-100) — mesma fórmula usada por `calcAccuracy` internamente,
 * exposta à parte porque o Relatório do jogador (Sprint 3) precisa agregar precisão por fase/
 * abertura/tendência lance a lance, não só por partida inteira.
 */
export function moveAccuracyScore(evalBefore: number, evalAfter: number, color: 'w' | 'b'): number {
  const before = color === 'w' ? evalBefore : -evalBefore
  const after = color === 'w' ? evalAfter : -evalAfter
  const winDrop = Math.max(0, winPercent(before) - winPercent(after)) * CALIBRATION_MULTIPLIER
  return moveAccuracy(winDrop)
}

/**
 * Precisão da partida pra um lado. Não é mais uma média de "pesos fixos por categoria" (ex: todo
 * lance "Excelente" valia 100, todo "Erro" valia 40, sem distinguir um erro de 25 de chance de
 * vitória de um de 45) — motivado por calibração real do usuário: uma partida do Magnus Carlsen
 * deu 90% aqui contra 84% no chess.com com o esquema antigo.
 *
 * Trocar só pela média aritmética das precisões por lance (fórmula acima) melhora mas ainda não
 * basta: numa partida longa, um punhado de erros graves afunda pouco a média simples porque fica
 * diluído entre dezenas de lances bons — na prática o chess.com pesa erros muito mais que isso
 * (uma partida perdida por 2-3 capivaradas não fica com precisão "quase perfeita" só porque o
 * resto foi ok). O Lichess documenta que reproduz o "accuracy" do chess.com combinando a média
 * aritmética com a média HARMÔNICA das precisões por lance — a harmônica é dominada pelos valores
 * baixos (um único lance de precisão ~5 pesa muito mais nela do que na média simples), então o
 * resultado final = média das duas puxa pra baixo exatamente quando existem poucos erros graves
 * escondidos em meio a muitos lances ok, sem precisar reclassificar nada.
 */
export function calcAccuracy(
  moves: { color: 'w' | 'b'; evalBefore: number | null; evalAfter: number | null }[],
  color: 'w' | 'b',
): number {
  const own = moves.filter((m) => m.color === color && m.evalBefore !== null && m.evalAfter !== null)
  if (own.length === 0) return 100
  const perMove = own.map((m) => moveAccuracyScore(m.evalBefore!, m.evalAfter!, color))
  const arithmeticMean = perMove.reduce((a, b) => a + b, 0) / perMove.length
  // Math.max(1, a) no denominador só evita divisão por zero num lance de precisão exatamente 0.
  const harmonicMean = perMove.length / perMove.reduce((acc, a) => acc + 1 / Math.max(1, a), 0)
  // Uma casa decimal (não arredondado pro inteiro) — pedido direto do usuário: "deixa quebrado o
  // número, tipo não ser 95%, pode ser 94.4%" — bate com o jeito que o chess.com mostra a
  // precisão de verdade (nunca um número redondo), e o cálculo já tem essa granularidade, só
  // estava sendo jogada fora no arredondamento final.
  return Math.round((arithmeticMean + harmonicMean) * 5) / 10
}
