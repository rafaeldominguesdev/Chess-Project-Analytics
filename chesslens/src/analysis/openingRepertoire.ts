import { Chess } from 'chess.js'
import openingsRaw from '../data/eco-openings.json'

// Mesmo banco ECO usado por `openingsDatabase.ts` (identificação de abertura na Revisão de
// partida) — aqui ele vira uma ÁRVORE de lances (trie), não só um mapa de busca, porque o
// Treino de Aberturas precisa saber "quais lances são teoria a partir daqui" em cada posição,
// não só "essa sequência inteira tem nome".
type RawEntry = [eco: string, name: string, moves: string]
const RAW = openingsRaw as RawEntry[]

export interface OpeningNode {
  san: string | null // null só na raiz (posição inicial, antes do 1º lance)
  eco: string | null // preenchido quando ESSA posição exata é uma linha nomeada no banco ECO
  name: string | null
  children: Map<string, OpeningNode>
  // Quantas linhas nomeadas existem nesse nó ou em qualquer descendente — usado como peso pra
  // sortear a resposta do "adversário" simulado (subárvore maior = mais variações documentadas
  // dali pra frente, uma aproximação razoável de "linha mais relevante/testada" sem precisar de
  // dado de popularidade real, que o banco ECO não tem).
  subtreeSize: number
}

function makeNode(san: string | null): OpeningNode {
  return { san, eco: null, name: null, children: new Map(), subtreeSize: 0 }
}

function buildGlobalTree(): OpeningNode {
  const root = makeNode(null)
  for (const [eco, name, moves] of RAW) {
    let node = root
    for (const san of moves.split(' ')) {
      if (!san) continue
      let child = node.children.get(san)
      if (!child) {
        child = makeNode(san)
        node.children.set(san, child)
      }
      node = child
    }
    node.eco = eco
    node.name = name
  }
  const computeSize = (node: OpeningNode): number => {
    let size = node.name ? 1 : 0
    for (const child of node.children.values()) size += computeSize(child)
    node.subtreeSize = size
    return size
  }
  computeSize(root)
  return root
}

let cachedTree: OpeningNode | null = null
/** Constrói a árvore completa (3810 linhas nomeadas) uma vez só e reaproveita — é rápido
 *  (banco pequeno), mas não tem por que refazer a cada troca de família/lado. */
export function getGlobalOpeningTree(): OpeningNode {
  if (!cachedTree) cachedTree = buildGlobalTree()
  return cachedTree
}

export interface OpeningFamily {
  /** Nome completo em inglês (como está no banco ECO) — chave única de agrupamento. */
  key: string
  /** Nome pra mostrar na interface — traduzido quando existe tradução conhecida, senão igual a `key`. */
  displayName: string
  /** Código ECO representativo (o da linha-raiz da família, quando existe). */
  eco: string
  /** Quantas variações nomeadas existem dentro dessa família no banco. */
  variationCount: number
  /** Lances (SAN) que definem a família — ex: `['e4','c5']` pra Sicilian Defense. Tocados
   *  automaticamente ao começar uma sessão (são a "escolha" da abertura em si, não o que se testa). */
  rootMoves: string[]
}

// Tradução dos nomes de família mais comuns/conhecidos — o resto fica em inglês (nome ECO
// padrão, que é como jogadores de xadrez conhecem a maioria das aberturas mesmo em português;
// só as mais "batizadas" ganham nome em pt-BR aqui, sem tentar traduzir as 149 famílias todas).
const FAMILY_NAME_PT: Record<string, string> = {
  'Sicilian Defense': 'Defesa Siciliana',
  'Ruy Lopez': 'Ruy Lopez (Espanhola)',
  'French Defense': 'Defesa Francesa',
  "Queen's Gambit Declined": 'Gambito da Dama Recusado',
  'Italian Game': 'Partida Italiana',
  'English Opening': 'Abertura Inglesa',
  "King's Gambit Accepted": 'Gambito do Rei Aceito',
  "King's Gambit Declined": 'Gambito do Rei Recusado',
  "King's Indian Defense": 'Defesa Índia do Rei',
  'Caro-Kann Defense': 'Defesa Caro-Kann',
  'Nimzo-Indian Defense': 'Defesa Nimzo-Índia',
  "Queen's Pawn Game": 'Jogo do Peão da Dama',
  'Dutch Defense': 'Defesa Holandesa',
  'Semi-Slav Defense': 'Defesa Semi-Eslava',
  'Benoni Defense': 'Defesa Benoni',
  'Grünfeld Defense': 'Defesa Grünfeld',
  "Queen's Gambit Accepted": 'Gambito da Dama Aceito',
  'Alekhine Defense': 'Defesa Alekhine',
  'Indian Defense': 'Defesa Índia',
  'Scotch Game': 'Partida Escocesa',
  "Queen's Indian Defense": 'Defesa Índia da Dama',
  'Slav Defense': "Defesa Eslava",
  "Petrov's Defense": 'Defesa Petrov (Russa)',
  'Four Knights Game': 'Partida dos Quatro Cavalos',
  'Scandinavian Defense': 'Defesa Escandinava',
  'Philidor Defense': 'Defesa Philidor',
  'Réti Opening': 'Abertura Réti',
  'Nimzowitsch Defense': 'Defesa Nimzowitsch',
  "Bishop's Opening": 'Abertura do Bispo',
  'Vienna Game': 'Partida Vienense',
  'Modern Defense': 'Defesa Moderna',
  "King's Pawn Game": 'Jogo do Peão do Rei',
  'Catalan Opening': 'Abertura Catalã',
  'Bird Opening': 'Abertura Bird',
  'Pirc Defense': 'Defesa Pirc',
  'Tarrasch Defense': 'Defesa Tarrasch',
  'Polish Opening': 'Abertura Polonesa',
  "London System": 'Sistema Londres',
  "Trompowsky Attack": 'Ataque Trompowsky',
  "Center Game": 'Jogo do Centro',
  "Vienna Gambit": 'Gambito Vienense',
  "Colle System": 'Sistema Colle',
  "Benko Gambit": 'Gambito Benko',
  "Budapest Gambit": 'Gambito Budapeste',
}

let cachedFamilies: OpeningFamily[] | null = null
export function getOpeningFamilies(): OpeningFamily[] {
  if (cachedFamilies) return cachedFamilies

  interface Acc { eco: string; count: number; rootMoves: string[] | null; shortestMoves: string[] }
  const byFamily = new Map<string, Acc>()

  for (const [eco, name, moves] of RAW) {
    const colon = name.indexOf(':')
    const family = colon === -1 ? name : name.slice(0, colon).trim()
    const tokens = moves.split(' ').filter(Boolean)
    const isRootEntry = colon === -1

    const existing = byFamily.get(family)
    if (!existing) {
      byFamily.set(family, { eco, count: 1, rootMoves: isRootEntry ? tokens : null, shortestMoves: tokens })
      continue
    }
    existing.count++
    // Algumas famílias têm MAIS DE UMA linha com o nome exatamente igual ao da família, sem ":",
    // em profundidades bem diferentes — ex: "Sicilian Defense" aparece sozinha tanto em "e4 c5"
    // (2 lances, a raiz de verdade) quanto em "e4 c5 Nf3 d6 d4 cxd4" (6 lances, já bem mais
    // fundo). Sem esse `<` a última encontrada no banco vencia e virava "raiz" — a sessão
    // tocava vários lances sozinha antes da primeira vez de quem treina, sem pedir nada. Sempre
    // fica com a mais curta.
    if (isRootEntry && (!existing.rootMoves || tokens.length < existing.rootMoves.length)) existing.rootMoves = tokens
    if (tokens.length < existing.shortestMoves.length) existing.shortestMoves = tokens
  }

  cachedFamilies = Array.from(byFamily.entries())
    .map(([key, v]) => ({
      key,
      displayName: FAMILY_NAME_PT[key] ?? key,
      eco: v.eco,
      variationCount: v.count,
      // Sem entrada "raiz" exata (nome sem ":"), usa o prefixo mais curto encontrado — sempre um
      // prefixo válido de teoria real da família, só não necessariamente o mais "canônico".
      rootMoves: v.rootMoves ?? v.shortestMoves,
    }))
    .sort((a, b) => b.variationCount - a.variationCount)

  return cachedFamilies
}

/** Sorteia um filho ponderado por `subtreeSize` (aproximação de "quão documentada"/relevante é
 *  essa continuação) — usado pra escolher o lance do "adversário" simulado. */
export function pickWeightedChild(node: OpeningNode, rng: () => number = Math.random): OpeningNode | null {
  const entries = Array.from(node.children.values())
  if (entries.length === 0) return null
  const totalWeight = entries.reduce((sum, c) => sum + Math.max(1, c.subtreeSize), 0)
  let r = rng() * totalWeight
  for (const child of entries) {
    r -= Math.max(1, child.subtreeSize)
    if (r <= 0) return child
  }
  return entries[entries.length - 1]
}

/** Filho com a maior subárvore (determinístico, não sorteado) — usado como "o lance recomendado"
 *  pra mostrar como seta na vez de quem treina. Maior subárvore = mais variações documentadas
 *  dali pra frente, a mesma aproximação de relevância usada em `pickWeightedChild`, só sem sorteio
 *  (a seta de sugestão não pode mudar sozinha a cada re-render). */
export function pickBestChild(node: OpeningNode): OpeningNode | null {
  let best: OpeningNode | null = null
  for (const child of node.children.values()) {
    if (!best || child.subtreeSize > best.subtreeSize) best = child
  }
  return best
}

/**
 * Acha a `OpeningFamily` de um nome de abertura vindo de `openingsDatabase.ts`/`identifyOpening()`
 * (ex: `"Sicilian Defense: Najdorf Variation"`) — usado pelo Relatório do jogador (Sprint 3) pra
 * agrupar desempenho por família e linkar de volta pro Treino de Aberturas daquela linha. Mesma
 * convenção de chave usada em `getOpeningFamilies()`: tudo antes do primeiro `:`.
 */
export function findFamilyForOpening(openingName: string): OpeningFamily | null {
  const key = openingName.split(':')[0].trim()
  return getOpeningFamilies().find((f) => f.key === key) ?? null
}

/** FEN da posição depois dos lances-raiz de uma família — usado pra mostrar a miniatura do
 *  tabuleiro na lista de escolha do Treino de Aberturas. */
export function getFamilyRootFen(family: OpeningFamily): string {
  const chess = new Chess()
  for (const san of family.rootMoves) {
    try {
      if (!chess.move(san)) break
    } catch {
      break
    }
  }
  return chess.fen()
}
