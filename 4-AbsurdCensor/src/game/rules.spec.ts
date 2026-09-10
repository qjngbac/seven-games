import { describe, it, expect } from 'vitest'
import { SCENES, sceneById, dayByScene } from '../data/scenes'
import { CASES, casesForSceneDay, CaseWithScene } from '../data/cases'
import { evaluate } from './rules'

function sceneDay(scene: string, day: number) {
  const s = sceneById(scene)!
  return s.days.find((d) => d.date === day)!
}
function one(scene: string, day: number, id: string): CaseWithScene {
  return casesForSceneDay(scene, day).find((c) => c.id === id)!
}

describe('规则引擎：默认放行模型', () => {
  it('证件齐全的普通人应放行（不再误拒）', () => {
    const r = evaluate(sceneDay('censor', 1).rules, one('censor', 1, 'd1_01'), sceneDay('censor', 1).today)
    expect(r.allowLegal).toBe(true)
    expect(r.denyLegal).toBe(false)
  })
  it('缺少通行证应拒绝', () => {
    const r = evaluate(sceneDay('censor', 1).rules, one('censor', 1, 'd1_02'), sceneDay('censor', 1).today)
    expect(r.allowLegal).toBe(false)
  })
})

describe('规则引擎：优先级与例外（各场景签名例外）', () => {
  it('猫例外覆盖所有违规（带猫+假机构仍放行）', () => {
    const r = evaluate(sceneDay('censor', 4).rules, one('censor', 4, 'd4_04'), sceneDay('censor', 4).today)
    expect(r.allowLegal).toBe(true)
  })
  it('灰区禁令被猫例外覆盖（灰区+带猫仍可进）', () => {
    const r = evaluate(sceneDay('censor', 5).rules, one('censor', 5, 'd5_04'), sceneDay('censor', 5).today)
    expect(r.allowLegal).toBe(true)
  })
  it('外交豁免覆盖灰区禁令', () => {
    const r = evaluate(sceneDay('censor', 7).rules, one('censor', 7, 'd7_05'), sceneDay('censor', 7).today)
    expect(r.allowLegal).toBe(true)
  })
  it('边境：急救车例外覆盖宵禁与健康', () => {
    const r = evaluate(sceneDay('border', 3).rules, one('border', 3, 'b3_05'), sceneDay('border', 3).today)
    expect(r.allowLegal).toBe(true)
  })
  it('边境：宵禁禁止普通夜归人', () => {
    const r = evaluate(sceneDay('border', 2).rules, one('border', 2, 'b2_02'), sceneDay('border', 2).today)
    expect(r.allowLegal).toBe(false)
  })
  it('机场：机组例外免检', () => {
    const r = evaluate(sceneDay('airport', 1).rules, one('airport', 1, 'a1_05'), sceneDay('airport', 1).today)
    expect(r.allowLegal).toBe(true)
  })
  it('机场：液体超 100ml 拒绝', () => {
    const r = evaluate(sceneDay('airport', 2).rules, one('airport', 2, 'a2_03'), sceneDay('airport', 2).today)
    expect(r.allowLegal).toBe(false)
  })
  it('未来：市长例外免检', () => {
    const r = evaluate(sceneDay('future', 1).rules, one('future', 1, 'f1_04'), sceneDay('future', 1).today)
    expect(r.allowLegal).toBe(true)
  })
  it('未来：信用分不足拒绝', () => {
    const r = evaluate(sceneDay('future', 2).rules, one('future', 2, 'f2_02'), sceneDay('future', 2).today)
    expect(r.allowLegal).toBe(false)
  })
  it('未来：基因不符拒绝', () => {
    const r = evaluate(sceneDay('future', 3).rules, one('future', 3, 'f3_03'), sceneDay('future', 3).today)
    expect(r.allowLegal).toBe(false)
  })
})

describe('规则引擎：字段逻辑差异（非像素刁难）', () => {
  it('姓名不一致 → 不放行', () => {
    const r = evaluate(sceneDay('censor', 2).rules, one('censor', 2, 'd2_03'), sceneDay('censor', 2).today)
    expect(r.allowLegal).toBe(false)
    expect(r.reasons.some((x) => x.kind === 'violation' && x.text.includes('姓名'))).toBe(true)
  })
  it('过期证件 → 不放行', () => {
    const r = evaluate(sceneDay('censor', 2).rules, one('censor', 2, 'd2_02'), sceneDay('censor', 2).today)
    expect(r.allowLegal).toBe(false)
  })
  it('机器人电量不足 → 不放行', () => {
    const r = evaluate(sceneDay('censor', 3).rules, one('censor', 3, 'd3_01'), sceneDay('censor', 3).today)
    expect(r.allowLegal).toBe(false)
  })
  it('签发机构不合规 → 不放行', () => {
    const r = evaluate(sceneDay('censor', 4).rules, one('censor', 4, 'd4_01'), sceneDay('censor', 4).today)
    expect(r.allowLegal).toBe(false)
  })
  it('携带违禁品 → 拒绝', () => {
    const r = evaluate(sceneDay('censor', 3).rules, one('censor', 3, 'd3_03'), sceneDay('censor', 3).today)
    expect(r.denyLegal).toBe(true)
    expect(r.allowLegal).toBe(false)
  })
  it('灰区来源 → 禁止（即便证件齐全）', () => {
    const r = evaluate(sceneDay('censor', 5).rules, one('censor', 5, 'd5_01'), sceneDay('censor', 5).today)
    expect(r.allowLegal).toBe(false)
  })
  it('无预约游客 → 禁止（第七天）', () => {
    const r = evaluate(sceneDay('censor', 7).rules, one('censor', 7, 'd7_02'), sceneDay('censor', 7).today)
    expect(r.allowLegal).toBe(false)
  })
  it('外交官免检 → 放行（无证件）', () => {
    const r = evaluate(sceneDay('censor', 7).rules, one('censor', 7, 'd7_01'), sceneDay('censor', 7).today)
    expect(r.allowLegal).toBe(true)
  })
})

describe('内容可解性批量校验（设计文档 5.2）', () => {
  it('每个申请者至少一个合法裁决，且 expected 与引擎一致', () => {
    expect(CASES.length).toBeGreaterThanOrEqual(100)
    for (const c of CASES) {
      const s = sceneById(c.scene)!
      const d = s.days.find((x) => x.date === c.day)!
      const r = evaluate(d.rules, c, d.today)
      const hasLegal = r.allowLegal || r.denyLegal
      expect(hasLegal, `case ${c.id} 无合法裁决`).toBe(true)
      const engineExpected = r.allowLegal ? 'allow' : 'deny'
      expect(c.expected, `case ${c.id} expected(${c.expected}) 与引擎(${engineExpected}) 不一致`).toBe(engineExpected)
    }
  })
  it('每天案件数满足配额', () => {
    for (const s of SCENES) {
      for (const d of s.days) {
        expect(casesForSceneDay(s.id, d.date).length, `scene ${s.id} day ${d.date} 案件不足配额`).toBeGreaterThanOrEqual(d.quota)
      }
    }
  })
  it('暂扣永远合法', () => {
    const d = sceneDay('censor', 6)
    const c = one('censor', 6, 'd6_01')
    const r = evaluate(d.rules, c, d.today)
    expect(r.detainLegal).toBe(true)
  })
})

describe('规则理由的正确性（防止"假违规"掩盖内容缺口）', () => {
  it('文档缺失只产生 missing 理由，绝不产生 violation 理由', () => {
    // b1_04「野宠哥」：带动物但无检疫证 —— 应当是「缺材料」，不是「字段填错」
    const d = sceneDay('border', 1)
    const c = one('border', 1, 'b1_04')
    const r = evaluate(d.rules, c, d.today)
    const violations = r.reasons.filter((x) => x.kind === 'violation')
    const missing = r.reasons.filter((x) => x.kind === 'missing')
    expect(r.allowLegal).toBe(false)
    expect(violations.map((v) => v.ruleId)).toContain('pet_quarantine')
    expect(missing.map((m) => m.ruleId)).toContain('pet_quarantine_valid')
  })

  it('每个被判拒绝的案件都必须有真实依据（violation 或例外禁止），不能只靠"缺材料"', () => {
    for (const s of SCENES) {
      for (const d of s.days) {
        for (const c of casesForSceneDay(s.id, d.date)) {
          const r = evaluate(d.rules, c, d.today)
          if (r.allowLegal) continue
          // denyIf 类型的禁令会产生 exception 理由，同样属于真实依据
          const grounds = r.reasons.filter((x) => x.kind === 'violation' || x.kind === 'exception')
          expect(
            grounds.length,
            `场景「${s.name}」第${d.date}天 ${c.id}(${c.name}) 判为拒绝，却没有任何真实依据 —— 很可能是把 requireField 当成了 requireDocument 用`,
          ).toBeGreaterThan(0)
        }
      }
    }
  })

  it('务工人员无工作许可必须被"缺少证件"拒绝（而不是字段不合规）', () => {
    const d = sceneDay('censor', 5)
    const c = one('censor', 5, 'd5_03')
    const r = evaluate(d.rules, c, d.today)
    expect(r.allowLegal).toBe(false)
    expect(r.reasons.some((x) => x.kind === 'violation' && x.ruleId === 'work_permit')).toBe(true)
  })
})
