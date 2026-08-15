// 事件抽取系统：条件过滤 → 带权抽取（类别疲劳 / 剧情优先级 / 最近事件冷却 / 互斥降权）。
// 设计原因：文档 §3.1 / §6.4 要求"带权抽取与冷却"，且必须保证抽到的事件至少有一个可选选项（§10.1）。
import type { ChoiceDef, ContentPack, EventCondition, EventDef, GameState, ResourceKey } from "./types";
import { buildResourceMap } from "./state";
import { bandOf } from "./resources";
import type { Rng } from "./rng";

const RECENT_CAP = 8; // 最近事件记录长度（冷却去重用）
const RECENT_COOLDOWN = 6; // 最近 N 个事件内不重复

/** 把"第几天"映射成周几 1-5（用于 weekday 条件） */
export function weekdayOf(day: number): number {
  return ((day - 1) % 5) + 1;
}

/** 判断条件是否满足（用于事件出现条件与选项前置条件） */
export function matchesCondition(
  cond: EventCondition | undefined,
  state: GameState,
  content: ContentPack
): boolean {
  if (!cond) return true;
  if (cond.dayMin != null && state.day < cond.dayMin) return false;
  if (cond.dayMax != null && state.day > cond.dayMax) return false;
  if (cond.weekdays && !cond.weekdays.includes(weekdayOf(state.day))) return false;
  if (cond.requiredTags && !cond.requiredTags.every((t) => state.tags.includes(t))) return false;
  if (cond.forbiddenTags && cond.forbiddenTags.some((t) => state.tags.includes(t))) return false;
  if (cond.resourceRange) {
    const rm = buildResourceMap(content);
    for (const k of Object.keys(cond.resourceRange) as ResourceKey[]) {
      const [lo, hi] = cond.resourceRange[k]!;
      const v = state.resources[k];
      if (v < lo || v > hi) return false;
      // 反向资源（techDebt）用区间表示"高=危险"时，也按数值闭区间判断即可
      void rm;
      void bandOf;
    }
  }
  return true;
}

/** 选项在当前状态下是否可选（前置条件满足） */
export function choiceAvailable(choice: ChoiceDef, state: GameState, content: ContentPack): boolean {
  return matchesCondition(choice.requires, state, content);
}

/** 事件至少有一个可选选项 */
export function eventHasAvailableChoice(event: EventDef, state: GameState, content: ContentPack): boolean {
  return event.choices.some((c) => choiceAvailable(c, state, content));
}

/** 事件是否可进入候选池 */
export function eventEligible(event: EventDef, state: GameState, content: ContentPack): boolean {
  if (!matchesCondition(event.conditions, state, content)) return false;
  return eventHasAvailableChoice(event, state, content);
}

/** 计算事件最终权重 */
function weightOf(event: EventDef, state: GameState, content: ContentPack): number {
  let w = event.weight;
  // 剧情优先级
  w *= event.priority ?? 1;
  // 最近事件冷却：近期出现过的直接大幅降权
  const recent = state.recentHistory.slice(-RECENT_COOLDOWN);
  if (recent.includes(event.id)) w *= 0.1;
  // 类别疲劳：统计最近同类事件次数
  const catStreak = recent.filter((id) => {
    const ev = content.events.find((e) => e.id === id);
    return ev && ev.category === event.category;
  }).length;
  if (catStreak >= 1) w *= Math.pow(0.45, catStreak); // 连续同类 -> 迅速衰减
  // 互斥标签降权
  if (event.mutexTags && event.mutexTags.some((t) => state.tags.includes(t))) w *= 0.3;
  return w;
}

/**
 * 抽取下一个事件。返回 null 表示无候选（内容配置错误，调用方应兜底）。
 * 同时会更新 state.recentHistory（推进冷却）。
 */
export function selectEvent(state: GameState, content: ContentPack, rng: Rng): EventDef | null {
  const eligible = content.events.filter((e) => eventEligible(e, state, content));
  if (eligible.length === 0) return null;
  const recent = state.recentHistory.slice(-RECENT_COOLDOWN);
  // 硬冷却：冷却窗口内出现过的事件直接排除（保证冷却窗口内不重复）
  let candidates = eligible.filter((e) => !recent.includes(e.id));
  // 兜底：若排除后无候选（候选池过小），退回全量，避免死锁（文档 §10.1）
  if (candidates.length === 0) candidates = eligible;
  const picked = rng.weighted(candidates.map((e) => ({ item: e, weight: weightOf(e, state, content) })));
  if (!picked) return null;
  // 更新冷却记录
  state.recentHistory.push(picked.id);
  if (state.recentHistory.length > RECENT_CAP) state.recentHistory.shift();
  return picked;
}
