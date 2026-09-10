// 游戏流程编排：开局特质、每日开始（结算延迟效果）、选择结算、日终、结局判定。
// 设计原因：把"流程"从 UI 抽离，UI 只调用这些纯函数，业务状态不被组件直接修改（文档 §9）。
import type { ChoiceDef, ContentPack, EventDef, GameState, ResourceKey } from "./types";
import { buildResourceMap } from "./state";
import { applyEffects, resolveDueScheduled, scheduleEvent, type EffectResult } from "./effects";
import { isFailing } from "./resources";
import { selectEvent } from "./eventSelector";
import type { Rng } from "./rng";

export interface EndingInfo {
  kind: "win" | "lose";
  key: string;
  title: string;
  text: string;
  /** 结算称号 */
  honor: string;
}

export const ENDINGS: Record<string, EndingInfo> = {
  win: {
    kind: "win",
    key: "win",
    title: "平稳收官",
    text: "这一周过去了。公司还活着，你也没被优化。明天，依然是全新的一天荒诞。",
    honor: "苟住大师",
  },
  money: {
    kind: "lose",
    key: "money",
    title: "破产结局",
    text: "财务在周四发来贺电：账户余额不够买一杯咖啡。投资人在群里发了个表情。",
    honor: "月光破产家",
  },
  reputation: {
    kind: "lose",
    key: "reputation",
    title: "被优化",
    text: "HR 约你喝奶茶，顺便通知你工位明天起归会议室所有。门禁卡已失效。",
    honor: "前·核心员工",
  },
  spirit: {
    kind: "lose",
    key: "spirit",
    title: "精神崩溃",
    text: "你对着打印机笑了十分钟，同事默默把你拉进了「已读不回」名单。",
    honor: "禅修失败者",
  },
  techDebt: {
    kind: "lose",
    key: "techDebt",
    title: "技术债爆雷",
    text: "系统在平凡周二彻底瘫痪。你终于想起那张被风扇吸住的纸条——可惜晚了。",
    honor: "债务偿还者",
  },
};

export interface ChooseResult {
  ok: boolean;
  error?: string;
  delta: Partial<Record<ResourceKey, number>>;
  delayedScheduled: boolean;
  delayedNote?: string;
}

/** 结算一个选择：即时效果 + 记录 + 延迟效果入队。 */
export function choose(
  state: GameState,
  content: ContentPack,
  event: EventDef,
  choice: ChoiceDef
): ChooseResult {
  const r = applyEffects(state, choice.effects, content);
  if (!r.ok) return { ok: false, error: r.error, delta: {}, delayedScheduled: false };

  state.choiceLog.push({
    day: state.day,
    eventId: event.id,
    eventTitle: event.title,
    choiceId: choice.id,
    choiceText: choice.text,
    resultText: choice.resultText,
    resourceDelta: r.resourceDelta,
  });

  let delayedScheduled = false;
  let delayedNote: string | undefined;
  if (choice.delayed) {
    scheduleEvent(
      state,
      event.id,
      choice.delayed.daysLater,
      choice.delayed.effects,
      choice.delayed.note,
      event.id
    );
    delayedScheduled = true;
    delayedNote = choice.delayed.note;
  }

  state.eventsDoneToday += 1;
  return { ok: true, delta: r.resourceDelta, delayedScheduled, delayedNote };
}

/** 当天事件是否已处理完 */
export function isDayComplete(state: GameState): boolean {
  return state.eventsDoneToday >= state.eventsPerDay;
}

/**
 * 开始新的一天：结算到期延迟效果、写入当日资源快照、重置当日计数。
 * 返回到期延迟效果的汇总（供界面展示"后续事件"提示）。
 */
export function beginDay(state: GameState, content: ContentPack): EffectResult & { notes: string[] } {
  const due = resolveDueScheduled(state, content);
  state.eventsDoneToday = 0;
  // 每天只保留一条快照：同一天重复进入（如从存档恢复、或开局当天）时覆盖为最新数值，
  // 避免出现两条相同 day 的记录、也避免首条漏掉开局特质。
  const last = state.history[state.history.length - 1];
  if (last && last.day === state.day) {
    last.resources = { ...state.resources };
  } else {
    state.history.push({ day: state.day, resources: { ...state.resources } });
  }
  return due;
}

/** 日终推进：若未到上限则进入下一天，否则触发通关结局判定。 */
export function endDay(state: GameState, content: ContentPack): void {
  if (state.ending) return;
  // 先判失败（避免"已经崩了还进下一天"）
  const fail = evaluateEnding(state, content);
  if (fail && fail.kind === "lose") {
    state.ending = fail.key;
    state.endingKind = "lose";
    return;
  }
  if (state.day >= state.maxDays) {
    const e = ENDINGS.win;
    state.ending = e.key;
    state.endingKind = "win";
    return;
  }
  state.day += 1;
}

/** 判定当前是否触发结局（失败优先于通关）。 */
export function evaluateEnding(state: GameState, content: ContentPack): EndingInfo | null {
  if (state.ending) {
    return ENDINGS[state.ending] ?? null;
  }
  const rm = buildResourceMap(content);
  // 失败优先级：精神 > 声誉 > 金钱 > 技术债（最"突然"的先判）
  const order: ResourceKey[] = ["spirit", "reputation", "money", "techDebt"];
  for (const k of order) {
    if (isFailing(rm[k], state.resources[k])) return ENDINGS[k];
  }
  if (state.day > state.maxDays) return ENDINGS.win;
  return null;
}

/** 抽下一个事件（供 store 在 EVENT_PRESENT 阶段调用）。 */
export function drawNextEvent(state: GameState, content: ContentPack, rng: Rng): EventDef | null {
  return selectEvent(state, content, rng);
}
