// 内容 schema 校验：事件 id 唯一、选项 >=2、效果目标存在、延迟效果合法等。
// 设计原因：文档 §5.2 / §10.1 要求"AI 生成内容经过 schema 校验"，且错误数据不应让游戏崩溃。
import type { ContentPack, EffectDef, EventDef, ResourceKey } from "../core/types";

const RES_KEYS: ResourceKey[] = ["money", "reputation", "spirit", "techDebt"];

function validateEffect(e: EffectDef, ctx: { relations: string[]; eventIds: Set<string> }): string | null {
  switch (e.type) {
    case "resource":
      if (!RES_KEYS.includes(e.target as ResourceKey)) return `效果引用未知资源: ${e.target}`;
      if (typeof e.value !== "number") return `resource 效果缺数值: ${e.target}`;
      break;
    case "relation":
      if (!ctx.relations.includes(e.target)) return `效果引用未知关系: ${e.target}`;
      if (typeof e.value !== "number") return `relation 效果缺数值: ${e.target}`;
      break;
    case "tag":
      if (typeof e.value !== "boolean") return `tag 效果 value 必须为布尔: ${e.target}`;
      break;
    case "schedule":
      if (!e.eventId) return `schedule 效果缺 eventId`;
      if (!ctx.eventIds.has(e.eventId)) return `schedule 指向不存在的事件: ${e.eventId}`;
      if (typeof e.value !== "number" || e.value < 1) return `schedule 的 daysLater 必须 >=1`;
      break;
    case "unlock":
      if (!e.target) return `unlock 效果缺 target`;
      break;
    default:
      return `未知效果类型: ${(e as EffectDef).type}`;
  }
  return null;
}

/** 校验单个事件，返回错误列表（空=通过） */
export function validateEvent(
  ev: EventDef,
  ctx: { relations: string[]; eventIds: Set<string> }
): string[] {
  const errs: string[] = [];
  if (!ev.id || typeof ev.id !== "string") errs.push("事件缺少 id");
  if (!ev.title) errs.push(`${ev.id}: 缺 title`);
  if (!ev.body) errs.push(`${ev.id}: 缺 body`);
  if (!Array.isArray(ev.choices) || ev.choices.length < 2)
    errs.push(`${ev.id}: 选项不足 2 个`);
  if (ev.conditions?.resourceRange) {
    for (const k of Object.keys(ev.conditions.resourceRange)) {
      if (!RES_KEYS.includes(k as ResourceKey)) errs.push(`${ev.id}: 条件引用未知资源 ${k}`);
    }
  }
  for (const c of ev.choices ?? []) {
    if (!c.id) errs.push(`${ev.id}: 某选项缺 id`);
    if (!c.text) errs.push(`${ev.id}/${c.id}: 缺 text`);
    if (!c.resultText) errs.push(`${ev.id}/${c.id}: 缺 resultText`);
    if (!Array.isArray(c.effects) || c.effects.length === 0)
      errs.push(`${ev.id}/${c.id}: 无 effects`);
    for (const e of c.effects ?? []) {
      const ve = validateEffect(e, ctx);
      if (ve) errs.push(`${ev.id}/${c.id}: ${ve}`);
    }
    if (c.delayed) {
      if (typeof c.delayed.daysLater !== "number" || c.delayed.daysLater < 1)
        errs.push(`${ev.id}/${c.id}: delayed.daysLater 非法`);
      for (const e of c.delayed.effects ?? []) {
        const ve = validateEffect(e, ctx);
        if (ve) errs.push(`${ev.id}/${c.id} delayed: ${ve}`);
      }
    }
  }
  return errs;
}

/** 批量校验；统计 id 重复。 */
export function validateContent(content: ContentPack): { errors: string[]; validIds: Set<string> } {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  const ctx = {
    relations: content.relations.map((r) => r.id),
    eventIds: new Set(content.events.map((e) => e.id)),
  };
  for (const ev of content.events) {
    seen.set(ev.id, (seen.get(ev.id) ?? 0) + 1);
    errors.push(...validateEvent(ev, ctx));
  }
  for (const [id, n] of seen) if (n > 1) errors.push(`事件 id 重复: ${id} (x${n})`);
  return { errors, validIds: new Set(content.events.map((e) => e.id)) };
}
