// 案件索引：内容驱动。新增案件只需在此数组追加，无需改代码逻辑。
import type { CaseDef } from '../../case-model/types'
import { case1 } from './case1-force-push'
import { case2 } from './case2-db-truncated'
import { case3 } from './case3-secret-leaked'
import { case4 } from './case4-cascade'
import { case5 } from './case5-config-rollback'
import { case6 } from './case6-canary'
import { case7 } from './case7-cron'

export const CASES: CaseDef[] = [case1, case2, case3, case4, case5, case6, case7].sort((a, b) => a.chapter - b.chapter)

export function caseById(id: string): CaseDef | undefined {
  return CASES.find((c) => c.id === id)
}

export function caseIndex(id: string): number {
  return CASES.findIndex((c) => c.id === id)
}

export function nextCaseId(id: string): string | undefined {
  const i = caseIndex(id)
  if (i < 0 || i + 1 >= CASES.length) return undefined
  return CASES[i + 1].id
}
