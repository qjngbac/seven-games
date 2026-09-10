// 游戏状态：初始构造、深拷贝、资源映射。
// 设计原因：状态是纯数据，深拷贝用于"效果事务"回滚与存档快照。
import type { ContentPack, GameState, ResourceDef, ResourceKey } from "./types";
import { clampResource } from "./resources";

export const SAVE_VERSION = 1;

export type ResourceMap = Record<ResourceKey, ResourceDef>;

export function buildResourceMap(content: ContentPack): ResourceMap {
  const m = {} as ResourceMap;
  for (const d of content.resources) m[d.key] = d;
  return m;
}

export function createInitialState(
  seed: number,
  content: ContentPack,
  traitId: string | null
): GameState {
  const resources = {} as Record<ResourceKey, number>;
  for (const d of content.resources) resources[d.key] = d.start;
  const relations: Record<string, number> = {};
  for (const r of content.relations) relations[r.id] = 0;

  const state: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: seed >>> 0,
    day: 1,
    eventsPerDay: 4,
    eventsDoneToday: 0,
    maxDays: 6,
    resources,
    tags: [],
    relations,
    recentHistory: [],
    categoryFatigue: {},
    schedule: [],
    unlocked: [],
    unlockedTraits: [],
    ending: null,
    endingKind: null,
    currentEventId: null,
    lastDueNotes: [],
    choiceLog: [],
    // 初始快照在"应用开局特质之后"再写入（见下方），否则首日曲线记录的是未加特质前的数值
    history: [],
    trait: traitId,
    createdAt: Date.now(),
  };

  // 应用开局特质（若有），直接写入初始数值
  if (traitId) {
    const trait = content.traits.find((t) => t.id === traitId);
    if (trait) {
      const rm = buildResourceMap(content);
      for (const e of trait.effects) {
        if (e.type === "resource" && rm[e.target as ResourceKey]) {
          const k = e.target as ResourceKey;
          state.resources[k] = clampResource(rm[k], state.resources[k] + (typeof e.value === "number" ? e.value : 0));
        } else if (e.type === "tag" && e.value === true) {
          if (!state.tags.includes(e.target)) state.tags.push(e.target);
        }
      }
      state.unlockedTraits.push(traitId);
    }
  }
  // 开局快照（此时数值已包含开局特质，避免曲线图首点与实际不符）
  state.history.push({ day: state.day, resources: { ...state.resources } });
  return state;
}

/** 深拷贝（状态完全 JSON 可序列化） */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
