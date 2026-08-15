import { describe, it, expect } from 'vitest'
import { SCENES, sceneById } from '../data/scenes'
import { CASES, casesForSceneDay } from '../data/cases'
import { evaluate } from './rules'
import { Decision } from './types'

// 「作者意图 == 引擎结果」全量自校验：新增场景绝不能引入逻辑 bug。
// 若某案件意图与引擎不一致，说明规则或案件数据有误，必须修复。
describe('内容意图一致性（新增场景无 bug 校验）', () => {
  it('全部申请者的 intent 与引擎计算结果完全一致', () => {
    let checked = 0
    for (const s of SCENES) {
      for (const d of s.days) {
        const cases = casesForSceneDay(s.id, d.date)
        for (const c of cases) {
          const r = evaluate(d.rules, c, d.today)
          const engine: Decision = r.allowLegal ? 'allow' : 'deny'
          expect(engine, `场景「${s.name}」第${d.date}天 案件 ${c.id}：作者意图(${c.intent}) 与引擎(${engine}) 不一致`).toBe(c.intent)
          checked++
        }
      }
    }
    expect(checked).toBe(CASES.length)
    expect(checked).toBeGreaterThanOrEqual(100)
  })

  it('每个场景每天至少一名申请者', () => {
    for (const s of SCENES) {
      for (const d of s.days) {
        expect(casesForSceneDay(s.id, d.date).length).toBeGreaterThan(0)
      }
    }
  })

  it('各场景签名例外确实生效（覆盖违规）', () => {
    // 审查局：猫覆盖灰区
    const cz = sceneById('censor')!.days.find((d) => d.date === 5)!
    const cat = casesForSceneDay('censor', 5).find((c) => c.id === 'd5_04')!
    expect(evaluate(cz.rules, cat, cz.today).allowLegal).toBe(true)
    // 边境：急救车覆盖宵禁
    const bo = sceneById('border')!.days.find((d) => d.date === 2)!
    const amb = casesForSceneDay('border', 2).find((c) => c.id === 'b2_04')!
    expect(evaluate(bo.rules, amb, bo.today).allowLegal).toBe(true)
    // 机场：机组覆盖任何违规
    const ap = sceneById('airport')!.days.find((d) => d.date === 1)!
    const crew = casesForSceneDay('airport', 1).find((c) => c.id === 'a1_05')!
    expect(evaluate(ap.rules, crew, ap.today).allowLegal).toBe(true)
    // 未来：市长覆盖任何违规
    const fu = sceneById('future')!.days.find((d) => d.date === 1)!
    const mayor = casesForSceneDay('future', 1).find((c) => c.id === 'f1_04')!
    expect(evaluate(fu.rules, mayor, fu.today).allowLegal).toBe(true)
  })
})
