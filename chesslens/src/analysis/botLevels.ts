// Faixas de força do modo "Jogar contra a Capivara" (Sprint 4 do ROADMAP.md) + a função que
// escolhe qual lance o bot realmente joga. Fica em `analysis/` (não `hooks/`) porque é lógica
// pura, sem React nem Worker — mesmo critério já usado pra `moveClassifier.ts`/`mistakeReasons.ts`.
//
// REINVESTIGAÇÃO (pedido do usuário: "bots estão muito bobos", mesma sessão em que a v1 abaixo
// foi escrita) — pesquisa na documentação/código-fonte oficial do Stockfish mostrou que a v1
// desta lógica tinha uma premissa errada. `UCI_LimitStrength`+`UCI_Elo` NÃO limita a busca em si:
// o motor sempre roda em força TOTAL, e só na hora de decidir o `bestmove` final escolhe entre as
// melhores linhas do root com viés aleatório calibrado pelo Elo pedido (`Skill::pick_best`, no
// código-fonte oficial — testado pelos mantenedores contra pools reais de partidas). Só que as
// linhas `info ... multipv N ... pv ...` que o motor manda DURANTE a busca refletem o ranking de
// força TOTAL, não esse lance já enfraquecido — o enfraquecimento só aparece na linha `bestmove`.
// A v1 lia as linhas `multipv` (força total) e sorteava entre elas por conta própria — ou seja,
// IGNORAVA o `bestmove` real do motor (o lance já calibrado pro Elo pedido) e substituía por um
// sorteio artesanal entre candidatos que continuavam fortes. Pior: pedir `MultiPV` alto (até 5)
// com `movetimeMs` curto (até 1200ms) diluía o tempo de busca entre as linhas reportadas, deixando
// o rank 3–5 raso/instável — candidato "top" só por artefato de busca rasa, não por ser realmente
// uma opção que um humano cogitaria. É plausível que essa combinação (motor já enfraquecido +
// sorteio raso por cima) fosse justamente a fonte dos "erros bizarros e inconsistentes" que
// motivaram a v1 a existir.
//
// Dessa reinvestigação: as faixas dentro do alcance nativo do Stockfish (ver `MIN_UCI_ELO`
// abaixo) agora confiam direto no `bestmove` do motor (`multiPv: 1`, sem sorteio por cima) — é o
// mecanismo já calibrado, não uma reimplementação pior dele. Só as DUAS faixas mais fracas (abaixo
// do piso que o motor sozinho alcança) mantêm uma camada extra e bem mais leve de sorteio
// (`noiseDecay` baixo, `multiPv: 2`) — não pra substituir o `UCI_Elo`, mas pra empurrar o jogo pra
// baixo do piso que ele consegue atingir sozinho.
//
// `MIN_UCI_ELO`/`MAX_UCI_ELO`: `UCI_Elo` é uma spin option do Stockfish com mínimo 1320 e máximo
// 3190 (documentação oficial + código-fonte) — 1320 é o Elo alcançado no `Skill Level` 0, o mais
// fraco que o motor sozinho sabe fazer; não existe hoje um jeito nativo de fazer o Stockfish jogar
// de verdade como iniciante (~800) só com essas opções UCI (os próprios mantenedores confirmam:
// não há motivo técnico pro piso ser 1320, é só o valor que o Skill Level 0 alcança — quem precisa
// de mais fraco tem que hackear por fora, não tem opção UCI pra isso). Por isso os valores de
// `elo` das duas faixas mais fracas abaixo (800, 1000) são o Elo "de vitrine" mostrado ao usuário
// (mantém a progressão da tela de seleção e o texto do blurb, que descreve o COMPORTAMENTO
// desejado) — o valor de fato mandado ao motor é sempre clampado pro intervalo real
// (`clampUciElo`), nunca mandamos um `UCI_Elo` fora do que o motor aceita.

/** Intervalo real que o Stockfish aceita pra `UCI_Elo` (spin option, documentação oficial). Fora
 *  disso o comportamento de clamp interno do motor não é garantido/documentado — por isso
 *  clampamos aqui, no nosso código, em vez de confiar em como cada build lida com o valor. */
export const MIN_UCI_ELO = 1320
export const MAX_UCI_ELO = 3190

/** Valor seguro pra mandar em `setoption name UCI_Elo value ...` — nunca fora do intervalo que o
 *  motor documenta suportar (ver comentário no topo do arquivo pro porquê disso importar: abaixo
 *  de 1320 não existe garantia de como o motor reage, então clampamos explicitamente). */
export function clampUciElo(elo: number): number {
  return Math.min(MAX_UCI_ELO, Math.max(MIN_UCI_ELO, elo))
}

export interface BotLevel {
  id: string
  label: string
  /** Elo "de vitrine" pra UI (tela de seleção, blurb) — descreve o COMPORTAMENTO alvo da faixa,
   *  não necessariamente o valor cru mandado ao motor (ver `clampUciElo`: as duas faixas mais
   *  fracas pedem um Elo abaixo do piso real do Stockfish, 1320). */
  elo: number
  /** Frase curta pra tela de seleção — não é o texto do coach, só descreve o nível. */
  blurb: string
  /** Sempre `var(--color-x)` — nunca hex direto (ver skill chesslens-design). Reaproveita a
   *  progressão verde→azuis→vermelho já existente nos tokens da marca como "termômetro" de
   *  dificuldade (mais fácil de escanear que 6 tons de azul quase iguais), sem inventar cor nova. */
  color: string
  /** Quantas linhas melhores pedir ao motor (`MultiPV`). A partir da reinvestigação: as faixas
   *  dentro do alcance nativo do `UCI_Elo` (>= `MIN_UCI_ELO`) usam sempre 1 — confiam direto no
   *  `bestmove` do motor, que já é o lance calibrado pro Elo pedido (ver topo do arquivo). Só as
   *  duas faixas abaixo do piso pedem 2, pra ter uma segunda opção pra empurrar o nível pra baixo
   *  do que o motor sozinho alcança. */
  multiPv: number
  /** Peso da linha de rank `i` (0 = melhor) é `noiseDecay ** i` — 0 = sempre a melhor linha (ou
   *  seja, sempre o `bestmove` real do motor). Só as faixas abaixo do piso do `UCI_Elo` usam um
   *  valor > 0, e propositalmente baixo (a maioria dos lances ainda é o `bestmove` do motor — a
   *  camada extra é um empurrão ocasional, não o mecanismo principal de enfraquecimento). Ver
   *  `pickBotMove`. */
  noiseDecay: number
  /** Tempo de busca por lance (`go movetime`). Com `multiPv: 1` nas faixas dentro do alcance
   *  nativo, todo o tempo vai pra única linha que de fato jogamos (antes, pedir `MultiPV` alto
   *  dividia esse tempo entre linhas que nem sempre usávamos) — por isso as faixas mais fortes
   *  ganharam mais tempo de busca nesta reinvestigação: sobra tempo real pra aprofundar, não só
   *  pra preencher linhas extras que seriam descartadas. */
  movetimeMs: number
}

export const BOT_LEVELS: BotLevel[] = [
  {
    id: 'filhote',
    label: 'Capivara Filhote',
    elo: 800,
    blurb: 'Ainda aprendendo as regras — larga peças e não vê ameaças óbvias.',
    color: 'var(--color-success)',
    multiPv: 2,
    noiseDecay: 0.3,
    movetimeMs: 350,
  },
  {
    id: 'curiosa',
    label: 'Capivara Curiosa',
    elo: 1000,
    blurb: 'Conhece as regras, mas se distrai e comete erros bobos.',
    color: 'var(--color-blue-ice)',
    multiPv: 2,
    noiseDecay: 0.18,
    movetimeMs: 450,
  },
  {
    id: 'aprendiz',
    label: 'Capivara Aprendiz',
    elo: 1300,
    blurb: 'Já pensa duas jogadas à frente, mas ainda escapa tática.',
    color: 'var(--color-blue-light)',
    multiPv: 1,
    noiseDecay: 0,
    movetimeMs: 700,
  },
  {
    id: 'experiente',
    label: 'Capivara Experiente',
    elo: 1600,
    blurb: 'Nível clube — poucos erros bobos, você precisa jogar sólido.',
    color: 'var(--color-blue-bright)',
    multiPv: 1,
    noiseDecay: 0,
    movetimeMs: 1000,
  },
  {
    id: 'veterana',
    label: 'Capivara Veterana',
    elo: 1900,
    blurb: 'Calcula com cuidado — quase não perdoa imprecisão.',
    color: 'var(--color-blue-primary)',
    multiPv: 1,
    noiseDecay: 0,
    movetimeMs: 1400,
  },
  {
    id: 'mestra',
    label: 'Capivara Mestra',
    elo: 2200,
    blurb: 'Joga quase sem erros — respeite cada lance dela.',
    color: 'var(--color-error)',
    multiPv: 1,
    noiseDecay: 0,
    movetimeMs: 1800,
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
 * "sem ruído", usado por todas as faixas dentro do alcance nativo do `UCI_Elo` (que já é a linha
 * real de `bestmove` do motor, calibrada pro Elo pedido — ver topo do arquivo). Só as duas faixas
 * abaixo do piso do `UCI_Elo` usam `noiseDecay > 0`.
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
