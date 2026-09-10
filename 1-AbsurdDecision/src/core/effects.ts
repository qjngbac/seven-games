// 效果引擎：效果校验 + 事务化结算（先全部校验，再一次性提交，失败回滚）。
// 设计原因：文档 §6.4 要求"效果事务"——任何效果非法则回滚并记录内容错误，绝不残写半截状态。
import type { ContentPack, EffectDef, GameState, ResourceKey } from "./types";
import { buildResourceMap, cloneState, type ResourceMap } from "./state";
import { clampResource } from "./resources";

export interface EffectResult {
  ok: boolean;
  error?: string;
  /** 本批效果造成的资源增量（用于结果卡展示） */
  resourceDelta: Partial<Record<ResourceKey, number>>;
  appliedTags: string[];
}

export function validateEffect(
  e: EffectDef,
  content: ContentPack,
  rm: ResourceMap
): string | null {
  switch (e.type) {
    case "resource": {
      if (!rm[e.target as ResourceKey]) return `未知资源: ${e.target}`;
      if (typeof e.value !== "number") return `资源效果缺 value: ${e.target}`;
      return null;
    }
    case "relation": {
      if (!content.relations.some((r) => r.id === e.target))
        return `未知角色关系: ${e.target}`;
      if (typeof e.value !== "number") return `关系效果缺 value: ${e.target}`;
      return null;
    }
    case "tag":
      if (typeof e.value !== "boolean") return `标签效果 value 必须为布尔: ${e.target}`;
      return null;
    case "schedule":
      if (!e.eventId) return `schedule 效果缺 eventId`;
      if (!content.events.some((ev) => ev.id === e.eventId))
        return `schedule 指向不存在的事件: ${e.eventId}`;
      if (typeof e.value !== "number" || e.value < 1) return `schedule 的 daysLater 必须为 >=1 的整数`;
      return null;
    case "unlock":
      if (!e.target) return `unlock 效果缺 target`;
      return null;
    default:
      return `未知效果类型: ${(e as EffectDef).type}`;
  }
}

/** 单个效果落库（假设已校验） */
function commitOne(
  state: GameState,
  e: EffectDef,
  rm: ResourceMap
): Partial<Record<ResourceKey, number>> {
  const delta: Partial<Record<ResourceKey, number>> = {};
  switch (e.type) {
    case "resource": {
      const k = e.target as ResourceKey;
      const before = state.resources[k];
      state.resources[k] = clampResource(rm[k], before + (e.value as number));
      delta[k] = (delta[k] ?? 0) + (state.resources[k] - before);
      break;
    }
    case "relation": {
      const cur = state.relations[e.target] ?? 0;
      state.relations[e.target] = cur + (e.value as number);
      break;
    }
    case "tag": {
      if (e.value === true) {
        if (!state.tags.includes(e.target)) state.tags.push(e.target);
      } else {
        state.tags = state.tags.filter((t) => t !== e.target);
      }
      break;
    }
    case "schedule": {
      // 立即效果中不应出现 schedule（延迟效果由 scheduleEvent 单独入队）。此处置为无操作，避免误写。
      break;
    }
    case "unlock": {
      if (!state.unlocked.includes(e.target)) state.unlocked.push(e.target);
      break;
    }
  }
  return delta;
}

/**
 * 结算一批"即时效果"。事务化：先全部校验，再提交；任何非法则回滚到快照。
 * source 用于日志/延迟效果溯源。
 */
export function applyEffects(
  state: GameState,
  effects: EffectDef[],
  content: ContentPack
): EffectResult {
  const rm = buildResourceMap(content);
  // 1) 校验全部
  for (const e of effects) {
    const err = validateEffect(e, content, rm);
    if (err) return { ok: false, error: err, resourceDelta: {}, appliedTags: [] };
  }
  // 2) 提交（带快照回滚）
  const snap = cloneState(state);
  try {
    const resourceDelta: Partial<Record<ResourceKey, number>> = {};
    const appliedTags: string[] = [];
    for (const e of effects) {
      const d = commitOne(state, e, rm);
      if (e.type === "tag") appliedTags.push(e.target);
      for (const k of Object.keys(d) as ResourceKey[]) {
        resourceDelta[k] = (resourceDelta[k] ?? 0) + (d[k] ?? 0);
      }
    }
    return { ok: true, resourceDelta, appliedTags };
  } catch (err) {
    // 回滚并报告内容错误
    Object.assign(state, snap);
    return {
      ok: false,
      error: "结算异常: " + (err instanceof Error ? err.message : String(err)),
      resourceDelta: {},
      appliedTags: [],
    };
  }
}

/**
 * 预约一个未来事件（延迟效果）。区别于即时 applyEffects：这里把整批 effects 暂存到 schedule。
 * 返回是否成功入队。
 */
export function scheduleEvent(
  state: GameState,
  eventId: string,
  daysLater: number,
  effects: EffectDef[],
  note: string,
  source: string
): boolean {
  state.schedule.push({
    id: `sched_${source}_${state.schedule.length}_${eventId}`,
    dueDay: state.day + daysLater,
    effects,
    note: note || `来自 ${source} 的后续`,
    source,
  });
  return true;
}

/** 在第 day 开始时结算所有到期延迟效果，返回结算结果汇总（用于界面提示） */
export function resolveDueScheduled(state: GameState, content: ContentPack): EffectResult & { notes: string[] } {
  const due = state.schedule.filter((s) => s.dueDay <= state.day);
  state.schedule = state.schedule.filter((s) => s.dueDay > state.day);
  let merged: EffectResult = { ok: true, resourceDelta: {}, appliedTags: [] };
  const notes: string[] = [];
  for (const s of due) {
    const r = applyEffects(state, s.effects, content);
    if (!r.ok) {
      merged.ok = false;
      merged.error = r.error;
    } else {
      for (const k of Object.keys(r.resourceDelta) as ResourceKey[]) {
        merged.resourceDelta[k] = (merged.resourceDelta[k] ?? 0) + (r.resourceDelta[k] ?? 0);
      }
    }
    notes.push(s.note);
  }
  return { ...merged, notes };
}
