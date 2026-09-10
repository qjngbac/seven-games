// 规则引擎：根据当天规则与申请者真实材料，计算「制度上合法」的裁决集合。
// 不处理任何道德/剧情后果（那属于 NarrativeEngine）。
//
// 设计文档 6.4 算法：
//   active = rules.filter(matchesContext).sort(active by priority ascending)
//   result = initialPolicy
//   for rule in active: result = rule.apply(result, caseData)
//   return result
//
// 初始策略：默认「放行」合法（制度默认开门），「拒绝」须由某条规则明确触发
// （缺证件 / 过期 / 不一致 / 机构不合规 / 违禁品 / 灰区等违规，或 denyIf 例外）。
// 这样才符合叙事：证件齐全的普通人本应放行，只有违规者才被拒；而 allowIf
// 例外（如猫例外、外交豁免）可在违规之上「覆盖放行」。

import {
  ApplicantCase,
  CaseDocument,
  Decision,
  EvalResult,
  ReasonEntry,
  Rule,
  WhenCond
} from './types'

interface Policy {
  allow: boolean
  deny: boolean
}

/** 判断 when 条件是否命中（基于 person 属性） */
export function matchesWhen(when: WhenCond | undefined, c: ApplicantCase): boolean {
  if (!when) return true
  for (const [attr, val] of Object.entries(when)) {
    const actual = c.person[attr]
    if (actual === undefined) return false
    if (Array.isArray(actual)) {
      if (!actual.map((x) => String(x)).includes(String(val))) return false
    } else {
      if (String(actual) !== String(val)) return false
    }
  }
  return true
}

/** 找到某类证件（取第一份匹配 type 的文档） */
function docByType(c: ApplicantCase, type: string): CaseDocument | undefined {
  return c.documents.find((d) => d.type === type)
}
function docById(c: ApplicantCase, id: string): CaseDocument | undefined {
  return c.documents.find((d) => d.id === id)
}

function cmp(a: string | number, op: NonNullable<Rule['compare']>, b: string | number): boolean {
  const na = typeof a === 'number' ? a : Number(a)
  const nb = typeof b === 'number' ? b : Number(b)
  const sa = String(a)
  const sb = String(b)
  switch (op) {
    case '>=':
      return na >= nb
    case '<=':
      return na <= nb
    case '>':
      return na > nb
    case '==':
      return sa === sb
    case '!=':
      return sa !== sb
    default:
      return false
  }
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00').getTime()
  const db = new Date(b + 'T00:00:00').getTime()
  return Math.round((db - da) / 86400000)
}

/** 规则是否对当前申请者「上下文相关」（参与评估） */
function ruleActive(rule: Rule, c: ApplicantCase, today: string): boolean {
  if (
    rule.op === 'requireField' ||
    rule.op === 'allowIf' ||
    rule.op === 'denyIf' ||
    rule.op === 'requireDocument' ||
    rule.op === 'forbidDocument'
  ) {
    if (rule.when && !matchesWhen(rule.when, c)) return false
  }
  // notExpired 需要 issueDate 才有意义；若文档存在即参与
  if (rule.op === 'notExpired') {
    const d = rule.doc ? docById(c, rule.doc) : rule.docType ? docByType(c, rule.docType) : undefined
    if (!d) return false
  }
  return true
}

/** 单条规则作用于策略 */
function applyRule(rule: Rule, c: ApplicantCase, today: string, p: Policy, reasons: ReasonEntry[]): void {
  const push = (kind: ReasonEntry['kind'], text: string) =>
    reasons.push({ ruleId: rule.id, rule, kind, text })

  switch (rule.op) {
    case 'requireDocument': {
      const d = rule.docType ? docByType(c, rule.docType) : undefined
      if (!d) {
        p.allow = false
        push('violation', `缺少必需证件：${rule.explain}`)
      } else if (!d.authentic) {
        p.allow = false
        push('violation', `证件疑似伪造：${rule.explain}`)
      } else {
        push('satisfied', `持有有效证件：${rule.explain}`)
      }
      break
    }
    case 'forbidDocument': {
      const d = rule.docType ? docByType(c, rule.docType) : undefined
      if (d) {
        p.deny = true
        p.allow = false
        push('violation', `禁止持有此类证件：${rule.explain}`)
      }
      break
    }
    case 'requireField': {
      const d = rule.doc ? docById(c, rule.doc) : rule.docType ? docByType(c, rule.docType) : undefined
      if (!d) {
        // 材料本身不存在：这不是"字段不合规"，而是"缺材料"。
        // 是否因此拒绝，交由 requireDocument 规则判定，避免给出错误理由（如"信息不一致"）。
        push('missing', `材料缺失：${rule.explain}`)
      } else {
        const fv = d.fields[rule.field!]
        if (fv === undefined || !cmp(fv, rule.compare!, rule.value!)) {
          p.allow = false
          push('violation', `条件不满足：${rule.explain}（实为 ${fv ?? '缺失'}）`)
        } else {
          push('satisfied', `条件满足：${rule.explain}`)
        }
      }
      break
    }
    case 'fieldInList': {
      const d = rule.doc ? docById(c, rule.doc) : rule.docType ? docByType(c, rule.docType) : undefined
      if (!d) {
        push('missing', `材料缺失：${rule.explain}`)
      } else {
        const fv = d.fields[rule.field!]
        const ok = (rule.allowed ?? []).map(String).includes(String(fv))
        if (!ok) {
          p.allow = false
          push('violation', `字段值不在允许范围：${rule.explain}（实为 ${fv ?? '缺失'}）`)
        } else {
          push('satisfied', `字段值合规：${rule.explain}`)
        }
      }
      break
    }
    case 'fieldMatch': {
      const a = rule.aDoc ? docById(c, rule.aDoc) : docByType(c, rule.aDoc ?? '')
      const b = rule.bDoc ? docById(c, rule.bDoc) : docByType(c, rule.bDoc ?? '')
      if (!a || !b) {
        // 交叉比对需要两份材料都在场；缺一份时无法比对，不能判成"信息不一致"。
        push('missing', `交叉比对所需材料缺失：${rule.explain}`)
        break
      }
      const av = a.fields[rule.aField!]
      const bv2 = b.fields[rule.bField!]
      if (av === undefined || bv2 === undefined || String(av) !== String(bv2)) {
        p.allow = false
        push('violation', `信息不一致：${rule.explain}（${rule.aField}=${av ?? '缺失'} ≠ ${rule.bField}=${bv2 ?? '缺失'}）`)
      } else {
        push('satisfied', `信息一致：${rule.explain}`)
      }
      break
    }
    case 'notExpired': {
      const d = rule.doc ? docById(c, rule.doc) : rule.docType ? docByType(c, rule.docType) : undefined
      if (d?.issueDate) {
        const valid = rule.validityDays ?? 365
        const elapsed = daysBetween(d.issueDate, today)
        if (elapsed > valid) {
          p.allow = false
          push('violation', `证件已过期：${rule.explain}（签发 ${d.issueDate}，超期 ${elapsed - valid} 天）`)
        } else {
          push('satisfied', `证件在有效期内：${rule.explain}`)
        }
      }
      break
    }
    case 'allowIf': {
      if (matchesWhen(rule.when, c)) {
        p.allow = true
        p.deny = false
        push('exception', `例外允许：${rule.explain}`)
      }
      break
    }
    case 'denyIf': {
      if (matchesWhen(rule.when, c)) {
        p.deny = true
        p.allow = false
        push('exception', `例外禁止：${rule.explain}`)
      }
      break
    }
  }
}

/** 评估单个申请者：返回合法裁决集合与原因 */
export function evaluate(rules: Rule[], c: ApplicantCase, today: string): EvalResult {
  const reasons: ReasonEntry[] = []
  const p: Policy = { allow: true, deny: false } // 默认放行合法；违规才 deny
  const active = rules.filter((r) => ruleActive(r, c, today)).sort((a, b) => a.priority - b.priority)
  for (const r of active) applyRule(r, c, today, p, reasons)
  // 兜底：若没有任何合法裁决（异常），至少保留拒绝
  if (!p.allow && !p.deny) p.deny = true
  return {
    allowLegal: p.allow,
    denyLegal: p.deny,
    detainLegal: true, // 暂扣永远是安全选项（低效但不违法）
    reasons
  }
}

/** 给定裁决是否合法 */
export function isLegal(result: EvalResult, decision: Decision): boolean {
  if (decision === 'allow') return result.allowLegal
  if (decision === 'deny') return result.denyLegal
  return result.detainLegal
}

export { ruleActive }
