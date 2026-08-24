// Faixas de força do modo "Jogar contra a Capivara" (Sprint 4 do ROADMAP.md) + a função que
// escolhe qual lance o bot realmente joga. Fica em `analysis/` (não `hooks/`) porque é lógica
// pura, sem React nem Worker — mesmo critério já usado pra `moveClassifier.ts`/`mistakeReasons.ts`.
//
// Por que não confiar só em `UCI_LimitStrength`/`UCI_Elo`: o Stockfish real com Elo baixo joga
// "estranho" — erros bizarros e inconsistentes (larga uma dama do nada numa jogada, depois acerta
// um tático avançado na próxima), não "fraco como um humano de verdade" (que erra de forma mais
// previsível — geralmente fica perto da melhor linha, só que não SEMPRE na melhor). A abordagem
// aqui: além de configurar `UCI_Elo` (que já limita a força de cada linha individual), pedimos
// `MultiPV` > 1 pro motor e sorteamos entre as top-N linhas em vez de jogar sempre a 1ª — nas
// faixas mais baixas, o "erro" do bot passa a ser "joga a 2ª ou 3ª melhor opção" (ainda um lance
// plausível, um humano cogitaria) em vez de "joga qualquer coisa" (o que a randomização interna
// do UCI_Elo baixo tende a produzir sozinha).

export interface BotLevel {
  id: string
  label: string
  elo: number
  /** Frase curta pra tela de seleção — não é o texto do coach, só descreve o nível. */
  blurb: string
  /** Sempre `var(--color-x)` — nunca hex direto (ver skill chesslens-design). Reaproveita a
   *  progressão verde→azuis→vermelho já existente nos tokens da marca como "termômetro" de
   *  dificuldade (mais fácil de escanear que 6 tons de azul quase iguais), sem inventar cor nova. */
  color: string
  /** Quantas linhas melhores pedir ao motor (`MultiPV`) — a faixa mais forte pede só 1 (sempre
   *  joga o melhor lance encontrado; nesse ponto o próprio `UCI_Elo` já é a única limitação). */
  multiPv: number
  /** Peso da linha de rank `i` (0 = melhor) é `noiseDecay ** i` — 0 = sempre a melhor linha
   *  (equivalente a não ter ruído nenhum), perto de 1 = quase sorteio uniforme entre as `multiPv`
   *  linhas. Ver `pickBotMove`. */
  noiseDecay: number
  /** Tempo de busca por lance (`go movetime`) — a faixa mais forte pensa um pouco mais, mas
   *  mesmo ela fica bem abaixo da profundidade/tempo usados na Revisão de partida: aqui o motor
   *  só precisa jogar um lance por vez, não persuadir análise, então resposta rápida (bot "vivo",
   *  sem pausa longa) importa mais que espremer os últimos pontos de força. */
  movetimeMs: number
}

export const BOT_LEVELS: BotLevel[] = [
  {
    id: 'filhote',
    label: 'Capivara Filhote',
    elo: 800,
    blurb: 'Ainda aprendendo as regras — larga peças e não vê ameaças óbvias.',
    color: 'var(--color-success)',
    multiPv: 5,
    noiseDecay: 0.85,
    movetimeMs: 400,
  },
  {
    id: 'curiosa',
    label: 'Capivara Curiosa',
    elo: 1000,
    blurb: 'Conhece as regras, mas se distrai e comete erros bobos.',
    color: 'var(--color-blue-ice)',
    multiPv: 4,
    noiseDecay: 0.7,
    movetimeMs: 500,
  },
  {
    id: 'aprendiz',
    label: 'Capivara Aprendiz',
    elo: 1300,
    blurb: 'Já pensa duas jogadas à frente, mas ainda escapa tática.',
    color: 'var(--color-blue-light)',
    multiPv: 3,
    noiseDecay: 0.55,
    movetimeMs: 600,
  },
  {
    id: 'experiente',
    label: 'Capivara Experiente',
    elo: 1600,
    blurb: 'Nível clube — poucos erros bobos, você precisa jogar sólido.',
    color: 'var(--color-blue-bright)',
    multiPv: 3,
    noiseDecay: 0.35,
    movetimeMs: 800,
  },
  {
    id: 'veterana',
    label: 'Capivara Veterana',
    elo: 1900,
    blurb: 'Calcula com cuidado — quase não perdoa imprecisão.',
    color: 'var(--color-blue-primary)',
    multiPv: 2,
    noiseDecay: 0.2,
    movetimeMs: 1000,
  },
  {
    id: 'mestra',
    label: 'Capivara Mestra',
    elo: 2200,
    blurb: 'Joga quase sem erros — respeite cada lance dela.',
    color: 'var(--color-error)',
    multiPv: 1,
    noiseDecay: 0,
    movetimeMs: 1200,
  },
]

/** Forma mínima de uma linha do motor pra escolha de lance — desacoplado do shape completo de
 *  `StockfishEval` (que carrega cp/mate/depth) porque `pickBotMove` só precisa do lance em si. */
export interface EngineLineLike {
  bestMove: string | null
}

/**
 * Escolhe qual lance jogar entre as linhas que o motor devolveu (`lines[0]` = melhor, `lines[1]`
 * = segunda melhor, etc.), sorteando com peso decrescente por rank em vez de jogar sempre a
 * melhor — ver comentário no topo do arquivo pro porquê. `rng` é injetável só pra dar pra testar
 * de forma determinística (produção usa `Math.random`, o padrão do parâmetro).
 *
 * `noiseDecay <= 0` (ou só uma linha disponível) sempre joga a melhor linha — comportamento
 * "sem ruído", usado pela faixa mais forte.
 */
export function pickBotMove(
  lines: (EngineLineLike | null)[],
  noiseDecay: number,
  rng: () => number = Math.random,
): string | null {
  const candidates = lines.filter((l): l is EngineLineLike => !!l && !!l.bestMove)
  if (candidates.length === 0) return null
  if (candidates.length === 1 || noiseDecay <= 0) return candidates[0].bestMove

  const weights = candidates.map((_, i) => noiseDecay ** i)
  const total = weights.reduce((sum, w) => sum + w, 0)
  let r = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r <= 0) return candidates[i].bestMove
  }
  // Só chega aqui por erro de arredondamento de ponto flutuante bem no limite — devolve a última
  // candidata em vez de `null` (a soma dos pesos já foi inteiramente consumida).
  return candidates[candidates.length - 1].bestMove
}
