import { describe, it, expect } from 'vitest'
import {
  buildGameReportRows, computeAccuracyByPhase, computeErrorRateByClock,
  computeOpeningPerformance, computeAccuracyTrend, computeTopLeaks,
  computeResultStats, computeAccuracyBySide,
} from './playerReportStats'
import type { GameReportRow } from './playerReportStats'
import type { ExtractedMove, ErrorCandidate } from './errorExtraction'
import type { StoredGame } from '../persistence/types'
import type { GameInfo } from '../types/chess.types'

const FULL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const LOW_MATERIAL_FEN = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1'

function gameInfo(overrides: Partial<GameInfo> = {}): GameInfo {
  return { white: 'me', black: 'opp', whiteElo: '1500', blackElo: '1500', result: '1-0', date: '2026.01.01', event: 'Live Chess', termination: '', ...overrides }
}

function storedGame(overrides: Partial<StoredGame> = {}): StoredGame {
  return { url: 'g1', pgn: '', gameInfo: gameInfo(), savedAt: 1000, perspectiveColor: 'w', ...overrides }
}

function move(overrides: Partial<ExtractedMove>): ExtractedMove {
  return {
    gameUrl: 'g1', gameInfo: gameInfo(), moveIndex: 0, moveNumber: 1, color: 'w', san: 'e4',
    fenBefore: FULL_FEN, fenAfter: FULL_FEN, clock: null, classification: 'best',
    evalBefore: 0, evalAfter: 0, ...overrides,
  }
}

describe('buildGameReportRows', () => {
  it('resolve o lado, a abertura e a precisão de uma partida', () => {
    const games = [storedGame({ perspectiveColor: 'w' })]
    const moves = [
      move({ moveIndex: 0, moveNumber: 1, color: 'w', san: 'e4' }),
      move({ moveIndex: 1, moveNumber: 1, color: 'b', san: 'e5' }),
    ]
    const [row] = buildGameReportRows(moves, games)
    expect(row.playerColor).toBe('w')
    expect(row.familyKey).toBe("King's Pawn Game")
    expect(row.eco).toBe('C20')
    expect(row.ownMoves).toHaveLength(1)
  })

  it('descarta partida sem lado identificável (sem perspectiveColor salvo, nenhum username batendo)', () => {
    const games = [storedGame({ perspectiveColor: undefined, gameInfo: gameInfo({ white: 'someone', black: 'other' }) })]
    const moves = [move({})]
    expect(buildGameReportRows(moves, games)).toHaveLength(0)
  })
})

describe('computeAccuracyByPhase', () => {
  it('separa lance de abertura (moveNumber baixo) do de final (material baixo)', () => {
    const rows: GameReportRow[] = [{
      gameUrl: 'g1', gameInfo: gameInfo(), savedAt: 1000, playerColor: 'w', accuracy: 90,
      familyKey: null, eco: null,
      ownMoves: [
        move({ moveNumber: 2, fenBefore: FULL_FEN, evalBefore: 0, evalAfter: 0 }),
        move({ moveNumber: 40, fenBefore: LOW_MATERIAL_FEN, evalBefore: 0, evalAfter: -50 }),
      ],
    }]
    const result = computeAccuracyByPhase(rows)
    const abertura = result.find((r) => r.phase === 'abertura')!
    const final = result.find((r) => r.phase === 'final')!
    expect(abertura.moveCount).toBe(1)
    expect(final.moveCount).toBe(1)
    expect(final.accuracy).toBeLessThan(abertura.accuracy)
  })
})

describe('computeErrorRateByClock', () => {
  it('conta erro só nos lances com relógio+controle de tempo válidos, no balde certo', () => {
    const rows: GameReportRow[] = [{
      gameUrl: 'g1', gameInfo: gameInfo({ timeControl: '600' }), savedAt: 1000, playerColor: 'w', accuracy: 80,
      familyKey: null, eco: null,
      ownMoves: [
        move({ clock: '0:01:00', classification: 'blunder' }), // 60/600 = 10% -> balde 0-15%
        move({ clock: '0:05:00', classification: 'best' }),    // 300/600 = 50% -> balde 30-60%
        move({ clock: null, classification: 'blunder' }),      // sem relógio -> descartado
      ],
    }]
    const buckets = computeErrorRateByClock(rows)
    const low = buckets.find((b) => b.label === '0–15%')!
    const mid = buckets.find((b) => b.label === '30–60%')!
    expect(low.moveCount).toBe(1)
    expect(low.errorRate).toBe(100)
    expect(mid.moveCount).toBe(1)
    expect(mid.errorRate).toBe(0)
  })

  it('partida sem TimeControl não entra na agregação', () => {
    const rows: GameReportRow[] = [{
      gameUrl: 'g1', gameInfo: gameInfo({ timeControl: undefined }), savedAt: 1000, playerColor: 'w', accuracy: 80,
      familyKey: null, eco: null,
      ownMoves: [move({ clock: '0:01:00', classification: 'blunder' })],
    }]
    const buckets = computeErrorRateByClock(rows)
    expect(buckets.every((b) => b.moveCount === 0)).toBe(true)
  })
})

describe('computeOpeningPerformance', () => {
  it('agrupa por família+lado e ordena as piores primeiro', () => {
    const rows: GameReportRow[] = [
      { gameUrl: 'g1', gameInfo: gameInfo(), savedAt: 1, playerColor: 'w', accuracy: 90, familyKey: 'Sicilian Defense', eco: 'B20', ownMoves: [] },
      { gameUrl: 'g2', gameInfo: gameInfo(), savedAt: 2, playerColor: 'w', accuracy: 60, familyKey: 'Italian Game', eco: 'C50', ownMoves: [] },
    ]
    const result = computeOpeningPerformance(rows)
    expect(result[0].familyKey).toBe('Italian Game')
    expect(result[0].avgAccuracy).toBe(60)
    expect(result[1].familyKey).toBe('Sicilian Defense')
  })
})

describe('computeAccuracyTrend', () => {
  it('ordena por savedAt (mais antiga primeiro) e corta pras últimas N', () => {
    const rows: GameReportRow[] = [
      { gameUrl: 'g2', gameInfo: gameInfo(), savedAt: 200, playerColor: 'w', accuracy: 70, familyKey: null, eco: null, ownMoves: [] },
      { gameUrl: 'g1', gameInfo: gameInfo(), savedAt: 100, playerColor: 'w', accuracy: 90, familyKey: null, eco: null, ownMoves: [] },
    ]
    const trend = computeAccuracyTrend(rows, 20)
    expect(trend.map((t) => t.gameUrl)).toEqual(['g1', 'g2'])
  })
})

describe('computeResultStats', () => {
  it('resolve vitória/empate/derrota relativo ao lado do jogador e ignora partida sem resultado reconhecido', () => {
    const rows: GameReportRow[] = [
      { gameUrl: 'g1', gameInfo: gameInfo({ result: '1-0' }), savedAt: 1, playerColor: 'w', accuracy: 90, familyKey: null, eco: null, ownMoves: [] }, // vitória
      { gameUrl: 'g2', gameInfo: gameInfo({ result: '1-0' }), savedAt: 2, playerColor: 'b', accuracy: 70, familyKey: null, eco: null, ownMoves: [] }, // derrota (brancas ganharam, eu era preto)
      { gameUrl: 'g3', gameInfo: gameInfo({ result: '1/2-1/2' }), savedAt: 3, playerColor: 'w', accuracy: 80, familyKey: null, eco: null, ownMoves: [] }, // empate
      { gameUrl: 'g4', gameInfo: gameInfo({ result: '*' }), savedAt: 4, playerColor: 'w', accuracy: 50, familyKey: null, eco: null, ownMoves: [] }, // em andamento, ignora
    ]
    const stats = computeResultStats(rows)
    expect(stats).toEqual({ wins: 1, draws: 1, losses: 1, winRate: 33.3 })
  })
})

describe('computeAccuracyBySide', () => {
  it('agrupa a precisão média separadamente por lado jogado', () => {
    const rows: GameReportRow[] = [
      { gameUrl: 'g1', gameInfo: gameInfo(), savedAt: 1, playerColor: 'w', accuracy: 90, familyKey: null, eco: null, ownMoves: [] },
      { gameUrl: 'g2', gameInfo: gameInfo(), savedAt: 2, playerColor: 'w', accuracy: 80, familyKey: null, eco: null, ownMoves: [] },
      { gameUrl: 'g3', gameInfo: gameInfo(), savedAt: 3, playerColor: 'b', accuracy: 60, familyKey: null, eco: null, ownMoves: [] },
    ]
    const result = computeAccuracyBySide(rows)
    const white = result.find((r) => r.side === 'w')!
    const black = result.find((r) => r.side === 'b')!
    expect(white).toEqual({ side: 'w', accuracy: 85, games: 2 })
    expect(black).toEqual({ side: 'b', accuracy: 60, games: 1 })
  })
})

describe('computeTopLeaks', () => {
  // FEN validada em `mistakeReasons.test.ts` — torre branca sem defesa atacada pelo bispo preto.
  function candidate(overrides: Partial<ErrorCandidate>): ErrorCandidate {
    return {
      gameUrl: 'g1', moveIndex: 0, fenBefore: '', fenAfter: '4k3/8/1b6/8/3R4/8/8/4K3 b - - 0 1',
      sanPlayed: '', playerColor: 'w', bestMoveUci: 'a1a1', bestMoveAfterUci: null,
      classification: 'blunder', evalBefore: 0, evalAfter: 0, evalDelta: 0, gameInfo: gameInfo(),
      ...overrides,
    }
  }

  it("só conta candidatos do lado do jogador e ignora 'generic'", () => {
    const candidates = [
      candidate({ playerColor: 'w' }), // peça pendurada de verdade
      candidate({ playerColor: 'b' }), // do adversário — não deve contar
    ]
    const myColorByGame = new Map([['g1', 'w' as const]])
    const leaks = computeTopLeaks(candidates, myColorByGame)
    expect(leaks).toHaveLength(1)
    expect(leaks[0].reason).toBe('hanging_piece')
    expect(leaks[0].count).toBe(1)
  })
})
