// 叙事引擎：处理 storyTags 的延迟后果与多结局判定。
// 原则（设计文档 6.3）：NarrativeEngine 不判定法规正确性，只决定「故事上造成什么后果」。

import { CaseOutcome, DayResult, Decision } from './types'

export interface EndingState {
  accuracy: number // 全游戏累计准确率 0..1
  orgPressure: number // 累计组织压力
  conscience: number // 累计良心值
  catFavors: number // 放过猫相关次数
  grayzoneHelped: number // 帮助灰区次数
  diplomatFavors: number // 优待外交次数
  fired: boolean // 是否因压力被停职
}

export interface Ending {
  kind: 'bureaucrat' | 'rebel' | 'catnation' | 'diplomat' | 'model' | 'fired' | 'doomed'
  title: string
  text: string
}

/** 根据当天裁决生成延迟后果消息（日结时揭示） */
export function buildDayEvents(outcomes: CaseOutcome[]): string[] {
  const events: string[] = []
  for (const o of outcomes) {
    const tags = o.storyEffects
    if (o.isWrongAllow && tags.includes('contraband')) {
      events.push('次日新闻：审查局附近发生小型爆燃，调查指向漏检的违禁品。')
    }
    if (o.isWrongDeny && tags.includes('grayzone')) {
      events.push('城外收容所来电：一名灰区来客在寒夜中滞留，再没能等到亲人。')
    }
    if (o.decision === 'allow' && tags.includes('cat')) {
      events.push('局长在内部群发了撸猫照片，配文「今日心情：佳」。')
    }
    if (o.isWrongDeny && tags.includes('cat')) {
      events.push('局长脸色阴沉地路过你的窗口——他最爱的猫今天没能进来。')
    }
    if (o.isWrongDeny && tags.includes('diplomat')) {
      events.push('外交部发来照会，对「无礼扣留外交人员」提出严正交涉。')
    }
    if (o.decision === 'detain' && tags.includes('grayzone')) {
      events.push('你在角落悄悄给了他一张下班的便条——也许还有别的门。')
    }
  }
  return events
}

/** 多结局判定 */
export function resolveEnding(s: EndingState): Ending {
  if (s.fired) {
    return {
      kind: 'fired',
      title: '结局 · 停职通知',
      text: '连续的重大差错让组织压力突破红线。你收到了一封没有温度的停职函，印章被收走。审查局依旧运转，只是再没你的位置。'
    }
  }
  if (s.orgPressure >= 120) {
    return {
      kind: 'bureaucrat',
      title: '结局 · 完美的齿轮',
      text: '你不再犹豫，不再心软。每一次盖章都精准贴合规则。上级很满意，你成了系统里一颗锃亮的齿轮——只是偶尔会在深夜想起，那些被你挡在门外的人。'
    }
  }
  if (s.catFavors >= 3 && s.conscience >= 20) {
    return {
      kind: 'catnation',
      title: '结局 · 喵之国',
      text: '你放过了太多猫，也放过太多故事。某天局长宣布：审查局改制为「猫猫事务局」，你被任命为首席撸猫官。制度崩塌在一声喵里，而你笑得比谁都轻松。'
    }
  }
  if (s.grayzoneHelped >= 2 && s.conscience >= 15) {
    return {
      kind: 'rebel',
      title: '结局 · 暗门',
      text: '你记住了每一个被规则碾过的人。下班后，你开始在他们掌心写下另一条路。审查局的墙很高，但墙根下，多了一扇只有你知道的暗门。'
    }
  }
  if (s.diplomatFavors >= 2) {
    return {
      kind: 'diplomat',
      title: '结局 · 通关文牒',
      text: '你对外交人员的优待传到了上层。一封调令将你挪去礼宾司——那里没有灰区，没有违禁品，只有永远不会被拒绝的红毯。'
    }
  }
  if (s.accuracy >= 0.9 && s.conscience >= 0) {
    return {
      kind: 'model',
      title: '结局 · 称职的审查员',
      text: '你守住了规则，也没完全丢下良心。报表干净，投诉寥寥。也许这不是传奇，但一座城需要这样不动声色的人。'
    }
  }
  return {
    kind: 'doomed',
    title: '结局 · 悬而未决',
    text: '你在规则与良心之间反复横跳，两边都没站满。故事没有漂亮的句号，但你还坐在窗口后，等着下一位申请者。'
  }
}

/** 合并两天结果为新的累计状态（store 调用） */
export function mergeDay(
  prev: Omit<EndingState, 'fired'>,
  day: DayResult
): Omit<EndingState, 'fired'> {
  const catFavors = day.outcomes.filter((o) => o.decision === 'allow' && o.storyEffects.includes('cat')).length
  const grayzoneHelped = day.outcomes.filter(
    (o) => (o.decision === 'detain' || (o.decision === 'allow' && o.storyEffects.includes('grayzone'))) && o.storyEffects.includes('grayzone')
  ).length
  const diplomatFavors = day.outcomes.filter((o) => o.decision === 'allow' && o.storyEffects.includes('diplomat')).length
  return {
    accuracy: prev.accuracy * 0.6 + day.accuracy * 0.4,
    orgPressure: prev.orgPressure + day.orgPressure,
    conscience: prev.conscience + day.conscience,
    catFavors: prev.catFavors + catFavors,
    grayzoneHelped: prev.grayzoneHelped + grayzoneHelped,
    diplomatFavors: prev.diplomatFavors + diplomatFavors
  }
}

export type { Decision }
