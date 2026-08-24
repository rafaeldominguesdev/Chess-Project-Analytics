import { useEffect, useState } from 'react'
import { extractAllClassifiedMoves, extractErrorCandidates } from '../analysis/errorExtraction'
import { loadAllGames } from '../persistence/gamesRepo'
import {
  buildGameReportRows, computeAccuracyByPhase, computeErrorRateByClock,
  computeOpeningPerformance, computeAccuracyTrend, computeTopLeaks,
} from '../analysis/playerReportStats'
import type { PhaseAccuracy, ClockBucket, OpeningPerformance, TrendPoint, TopLeak } from '../analysis/playerReportStats'
import { reportComment } from '../analysis/reportComments'
import type { CoachMessage } from '../analysis/coachComments'

export type ReportStatus = 'loading' | 'empty' | 'ready'

interface ReportStats {
  overallAccuracy: number
  gamesCount: number
  phaseAccuracy: PhaseAccuracy[]
  clockBuckets: ClockBucket[]
  openingPerformance: OpeningPerformance[]
  trend: TrendPoint[]
  topLeaks: TopLeak[]
  comment: CoachMessage | null
}

const EMPTY_STATS: ReportStats = {
  overallAccuracy: 0, gamesCount: 0, phaseAccuracy: [], clockBuckets: [],
  openingPerformance: [], trend: [], topLeaks: [], comment: null,
}

/**
 * Varre as partidas salvas+analisadas uma vez ao montar (assíncrono, IndexedDB — mesmo motivo do
 * `status: 'loading'` explícito de `useErrorTrainer.ts`) e monta as 5 agregações do Relatório do
 * jogador (`analysis/playerReportStats.ts`). `'empty'` cobre tanto "nenhuma partida analisada
 * ainda" quanto "nenhuma partida com o lado do jogador identificável" — as duas têm a mesma
 * consequência aqui (nada pra mostrar), a UI não precisa distinguir os dois casos.
 */
export function useReportData(): { status: ReportStatus } & ReportStats {
  const [status, setStatus] = useState<ReportStatus>('loading')
  const [stats, setStats] = useState<ReportStats>(EMPTY_STATS)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    Promise.all([extractAllClassifiedMoves(), extractErrorCandidates(), loadAllGames()]).then(([allMoves, candidates, games]) => {
      if (cancelled) return

      const rows = buildGameReportRows(allMoves, games)
      if (rows.length === 0) {
        setStats(EMPTY_STATS)
        setStatus('empty')
        return
      }

      const myColorByGame = new Map(rows.map((r) => [r.gameUrl, r.playerColor]))
      const topLeaks = computeTopLeaks(candidates, myColorByGame)
      const overallAccuracy = Math.round((rows.reduce((sum, r) => sum + r.accuracy, 0) / rows.length) * 10) / 10

      setStats({
        overallAccuracy,
        gamesCount: rows.length,
        phaseAccuracy: computeAccuracyByPhase(rows),
        clockBuckets: computeErrorRateByClock(rows),
        openingPerformance: computeOpeningPerformance(rows),
        trend: computeAccuracyTrend(rows),
        topLeaks,
        comment: reportComment({ overallAccuracy, topLeak: topLeaks[0] ?? null }),
      })
      setStatus('ready')
    })

    return () => { cancelled = true }
  }, [])

  return { status, ...stats }
}
