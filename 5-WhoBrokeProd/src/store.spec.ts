import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGame } from './store'

/** 最小 localStorage 垫片（node 测试环境没有 localStorage） */
class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string): string | null {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v)
  }
  removeItem(k: string): void {
    this.m.delete(k)
  }
  clear(): void {
    this.m.clear()
  }
}

describe('store：指控结算的幂等性', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage()
    setActivePinia(createPinia())
  })

  it('重复提交同一案件不会重复扣/加声誉（防止刷新结算页刷分）', () => {
    const g = useGame()
    g.selectCase('force-push')
    g.beginInvestigation()

    // 第一次提交：空指控必然 fail → 声誉 -5
    const first = g.submitAccusation()
    expect(first?.outcome).toBe('fail')
    const afterFirst = g.reputation
    expect(afterFirst).toBe(-5)

    // 第二次提交同一案件：结果照旧，但声誉不得再变
    const second = g.submitAccusation()
    expect(second?.outcome).toBe('fail')
    expect(g.reputation, '重复提交不应再次扣声誉').toBe(afterFirst)
  })

  it('同一案件只记录一次 verdict', () => {
    const g = useGame()
    g.selectCase('force-push')
    g.beginInvestigation()
    g.submitAccusation()
    g.submitAccusation()
    expect(Object.keys(g.verdicts)).toEqual(['force-push'])
  })
})
