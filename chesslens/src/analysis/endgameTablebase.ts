// Consulta a Tablebase pública do Lichess (https://tablebase.lichess.ovh/standard?fen=...) —
// mesmo padrão de fetch já usado nos outros hooks de API do projeto (useLichessSearch.ts,
// useChesscomApi.ts): sem chave, sem backend próprio, cache simples em memória por FEN. Decisão
// de fonte de dado do Sprint 4 (ROADMAP.md): mais simples que embutir arquivos Syzygy localmente
// e consistente com o padrão já existente de consumir APIs externas.

// As 8 categorias que a API devolve — win/draw/loss são as normais; cursed-win/blessed-loss só
// aparecem quando a regra dos 50 lances desfaz um resultado que seria vitória/derrota "de
// verdade" (tablebases de 6-7 peças); maybe-win/maybe-loss aparecem quando a tablebase de 7 peças
// não cobre a posição inteira. unknown = sem dado nenhum. Nas posições pequenas desse treino
// (3-5 peças) só win/draw/loss de verdade devem aparecer na prática, mas a validação trata as
// variantes do mesmo jeito pra não quebrar se algum dia entrar posição maior.
export type TablebaseCategory =
  | 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss' | 'maybe-win' | 'maybe-loss' | 'unknown'

export interface TablebaseMove {
  uci: string
  san: string
  /** Categoria da posição resultante, do ponto de vista de quem PASSA a ter o lance depois desse
   *  movimento (o adversário de quem jogou) — não do ponto de vista de quem jogou. Ver
   *  `isMovePreserving` pra como isso se traduz em "esse lance preserva o resultado". */
  category: TablebaseCategory
  dtz: number | null
}

export interface TablebasePosition {
  /** Categoria da posição consultada, do ponto de vista de quem TEM o lance nela. */
  category: TablebaseCategory
  moves: TablebaseMove[]
}

interface RawTablebaseMove {
  uci: string
  san: string
  category: TablebaseCategory
  dtz: number | null
}

interface RawTablebaseResponse {
  category: TablebaseCategory
  moves: RawTablebaseMove[]
}

const cache = new Map<string, TablebasePosition>()

/** Busca a categoria WDL da posição e, pra cada lance legal, a categoria resultante — é a partir
 *  dessas duas informações que dá pra saber quais lances preservam o resultado teórico (ver
 *  `isMovePreserving`). Lança erro em qualquer falha de rede/resposta ruim — quem chama decide
 *  como tratar (ver `useEndgameTrainer`, que vira um status de erro visível, não trava silencioso). */
export async function fetchTablebase(fen: string): Promise<TablebasePosition> {
  const cached = cache.get(fen)
  if (cached) return cached

  const res = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`)
  if (!res.ok) throw new Error('tablebase indisponível')
  const data = await res.json() as RawTablebaseResponse

  const result: TablebasePosition = {
    category: data.category,
    moves: (data.moves ?? []).map((m) => ({ uci: m.uci, san: m.san, category: m.category, dtz: m.dtz ?? null })),
  }
  cache.set(fen, result)
  return result
}

/** Colapsa as 8 categorias da API em 3 buckets — pra comparação de resultado teórico não importa
 *  se é "win" de verdade ou "cursed-win" (regra dos 50 lances), o que importa é se dá pra dizer
 *  que é bom/ruim/neutro pra quem tem o lance. */
function normalizeOutcome(category: TablebaseCategory): 'win' | 'draw' | 'loss' | 'unknown' {
  switch (category) {
    case 'win': case 'cursed-win': case 'maybe-win': return 'win'
    case 'loss': case 'blessed-loss': case 'maybe-loss': return 'loss'
    case 'draw': return 'draw'
    default: return 'unknown'
  }
}

function invertOutcome(outcome: 'win' | 'draw' | 'loss' | 'unknown'): 'win' | 'draw' | 'loss' | 'unknown' {
  if (outcome === 'win') return 'loss'
  if (outcome === 'loss') return 'win'
  return outcome
}

/** Um lance preserva o resultado teórico quando o resultado (do ponto de vista de quem TINHA o
 *  lance na posição original) continua o mesmo depois dele. A categoria de cada lance que a API
 *  devolve já vem do ponto de vista do ADVERSÁRIO (quem passa a jogar depois) — por isso inverte
 *  antes de comparar com a categoria da posição raiz (ex: raiz "win" pra quem joga + lance que
 *  deixa o adversário em "loss" = o lance manteve a vitória). Numa posição já perdida de qualquer
 *  jeito, qualquer lance que continue perdido conta como certo — não existe lance que mude o
 *  resultado teórico numa posição de tablebase, só a resistência — e é assim que "vários lances
 *  corretos" acontece na prática nesse treino, não só o único melhor lance do motor. */
export function isMovePreserving(rootCategory: TablebaseCategory, moveCategory: TablebaseCategory): boolean {
  const rootOutcome = normalizeOutcome(rootCategory)
  if (rootOutcome === 'unknown') return true // sem dado suficiente pra reprovar — não trava o treino
  const resultingOutcome = invertOutcome(normalizeOutcome(moveCategory))
  return resultingOutcome === rootOutcome
}

/** Escolhe um lance de dica entre os que preservam o resultado — o de menor DTZ absoluto (mais
 *  perto de zerar a contagem dos 50 lances, ou seja, mais "direto"). Não é técnica de mate ótima
 *  quando a posição já tá perdida (aí o certo seria o MAIOR dtz, pra resistir mais) — é só uma
 *  primeira aproximação honesta pra mostrar UM lance válido, não o melhor plano de jogo inteiro. */
export function pickHintMove(tablebase: TablebasePosition): TablebaseMove | null {
  const preserving = tablebase.moves.filter((m) => isMovePreserving(tablebase.category, m.category))
  if (preserving.length === 0) return null
  return preserving.reduce((best, m) => {
    const bestAbs = best.dtz === null ? Infinity : Math.abs(best.dtz)
    const mAbs = m.dtz === null ? Infinity : Math.abs(m.dtz)
    return mAbs < bestAbs ? m : best
  })
}
