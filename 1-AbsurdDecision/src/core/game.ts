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
  /** 结局象征图标 */
  icon: string;
  /** 解锁条件描述 */
  conditionDesc: string;
}

export const ENDINGS: Record<string, EndingInfo> = {
  // ---- 通关胜利结局 ----
  win: {
    kind: "win",
    key: "win",
    title: "平稳收官·平凡一天",
    text: "这一周终于熬过去了。公司还活着，你也没被优化。在这个充满荒诞的世界里，平凡地活过一周本身就是最了不起的胜利。",
    honor: "苟住大师",
    icon: "🌱",
    conditionDesc: "平稳生存至第 6 天结束（平稳渡过）",
  },
  win_wealth: {
    kind: "win",
    key: "win_wealth",
    title: "财务自由·提早退休",
    text: "在无数荒诞的决定里，你竟然神奇地攒下了一大笔财富。周五下午，你把工卡潇洒地拍在老板桌上：「世界那么大，我想去看看。」老板甚至客气地问你能不能带他一个。",
    honor: "暴富神仙",
    icon: "💰",
    conditionDesc: "坚持到第 6 天，且最终金钱 ≥ 65（投资搞钱两不误）",
  },
  win_legend: {
    kind: "win",
    key: "win_legend",
    title: "行业领袖·职场教皇",
    text: "你在职场和行业圈声誉爆棚，被誉为「化腐朽为神奇的当代管理大师」。无数人争相引用你的荒诞语录，甚至有人为你出版了《如何用抽象思维拯救团队》。",
    honor: "画饼教皇",
    icon: "👑",
    conditionDesc: "坚持到第 6 天，且最终声誉 ≥ 65（名满天下行业领袖）",
  },
  win_zen: {
    kind: "win",
    key: "win_zen",
    title: "赛博飞升·肉身成圣",
    text: "经历了一整周离谱事件的洗礼，你的精神境界彻底突破凡尘。你坐在工位上，键盘声如木鱼，屏幕蓝光如佛光，万物不扰，无欲无求，同事路过都要对你合十作揖。",
    honor: "工位佛陀",
    icon: "🧘",
    conditionDesc: "坚持到第 6 天，且最终精神 ≥ 80（肉身在工位神魂游天外）",
  },
  win_clean: {
    kind: "win",
    key: "win_clean",
    title: "架构宗师·重构神迹",
    text: "面对漫天技术债，你以无上的定力把所有历史包袱和补丁梳理得纤尘不染。生产环境稳如磐石，整个团队甚至不知道你何时把屎山重构成了一座水晶宫殿。",
    honor: "代码圣徒",
    icon: "✨",
    conditionDesc: "坚持到第 6 天，且最终技术债 ≤ 5（将初始技术债清理至微）",
  },
  win_magician: {
    kind: "win",
    key: "win_magician",
    title: "屎山舞者·动态平衡",
    text: "面对高企的技术债，系统每天报警不断，但只要你一坐下，它就奇迹般地正常运转。全公司没人敢动你的代码，也没人敢优化你，因为你是唯一懂这堆魔法的人。",
    honor: "屎山守护神",
    icon: "🎭",
    conditionDesc: "坚持到第 6 天，且最终技术债 ≥ 30（突破警戒线依然驾驭）",
  },
  win_slacker: {
    kind: "win",
    key: "win_slacker",
    title: "摸鱼宗师·隐形员工",
    text: "你悟透了带薪摸鱼的极致心法：开会点头微笑，邮件稍后处理，工位上永远有一杯热气腾腾的水。你悄无声息地完成了本周工作，还顺便通关了三部电视剧。",
    honor: "薪水收割机",
    icon: "🐟",
    conditionDesc: "坚持到第 6 天，精神 ≥ 60 且声誉 ≤ 45（深谙摸鱼心法）",
  },

  // ---- 失败崩溃结局 ----
  money: {
    kind: "lose",
    key: "money",
    title: "破产结局·钱包见底",
    text: "财务发来紧急消息：账户余额连一杯咖啡都买不起。房东在门外有节奏地敲门，共享单车提示你信用分受损。你站在风中，手里只剩一张发票。",
    honor: "月光破产家",
    icon: "💸",
    conditionDesc: "金钱跌破 0",
  },
  reputation: {
    kind: "lose",
    key: "reputation",
    title: "被优化·毕业通知",
    text: "HR 拿着印有大厂 logo 的保温杯找你长谈：「感谢你为公司做的贡献，这是毕业礼包。」你的门禁卡已失效，大群已被移出，连公司 Wi-Fi 都不再认你。",
    honor: "前·核心员工",
    icon: "📦",
    conditionDesc: "声誉跌破 0",
  },
  spirit: {
    kind: "lose",
    key: "spirit",
    title: "精神崩溃·对线世界",
    text: "你对着打印机深情对线了半个小时，随后用二进制向全员抄送了一篇灵魂论文。保安微笑着把你护送出了大楼，并体贴地替你叫了救护车。",
    honor: "对线狂人",
    icon: "🤯",
    conditionDesc: "精神跌破 0",
  },
  techDebt: {
    kind: "lose",
    key: "techDebt",
    title: "技术爆雷·史诗宕机",
    text: "系统在微风中彻底暴毙。数据库连带灾备一起飞向太空，运维的电话被打爆，消防报警器欢快响起。你终于想起那张被风扇吸住的纸条——可惜晚了。",
    honor: "债务偿还者",
    icon: "💥",
    conditionDesc: "技术债突破 100",
  },
  burnout: {
    kind: "lose",
    key: "burnout",
    title: "身心俱疲·彻底躺平",
    text: "钱没了，精神也空了，你直接在工位底下铺了张瑜伽垫沉沉睡去。醒来时保洁阿姨递给你一个扫把：「小伙子，转行不？」你认真地点了点头。",
    honor: "瑜伽垫居士",
    icon: "🛌",
    conditionDesc: "金钱与精神双双跌入绝境",
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
    const e = evaluateEnding(state, content) ?? ENDINGS.win;
    state.ending = e.key;
    state.endingKind = e.kind;
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
  // 特殊组合失败：金钱与精神双双耗尽
  if (state.resources.money <= 0 && state.resources.spirit <= 0) {
    return ENDINGS.burnout;
  }
  // 失败优先级：精神 > 声誉 > 金钱 > 技术债（最"突然"的先判）
  const order: ResourceKey[] = ["spirit", "reputation", "money", "techDebt"];
  for (const k of order) {
    if (isFailing(rm[k], state.resources[k])) return ENDINGS[k];
  }
  // 撑过最大天数后的通关评定
  if (state.day > state.maxDays || (state.day >= state.maxDays && state.eventsDoneToday >= state.eventsPerDay)) {
    const m = state.resources.money;
    const r = state.resources.reputation;
    const s = state.resources.spirit;
    const td = state.resources.techDebt;

    // 特殊风格结局优先判定（玩家主动追求的极值）
    // 1. 技术债极端：30为预警临界线（初始10），低于等于5为重构神迹
    if (td >= 30) return ENDINGS.win_magician;
    if (td <= 5) return ENDINGS.win_clean;

    // 2. 摸鱼宗师：高精神且低声誉（深谙摸鱼心法）
    if (s >= 60 && r <= 45) return ENDINGS.win_slacker;

    // 3. 核心单项巅峰（若有多项达到标线，取相对最高者）
    if (m >= 65 && m >= r && m >= s) return ENDINGS.win_wealth;
    if (r >= 65 && r >= m && r >= s) return ENDINGS.win_legend;
    if (s >= 80 && s >= m && s >= r) return ENDINGS.win_zen;

    // 单项达标兜底
    if (m >= 65) return ENDINGS.win_wealth;
    if (r >= 65) return ENDINGS.win_legend;
    if (s >= 80) return ENDINGS.win_zen;

    return ENDINGS.win;
  }
  return null;
}

/** 抽下一个事件（供 store 在 EVENT_PRESENT 阶段调用）。 */
export function drawNextEvent(state: GameState, content: ContentPack, rng: Rng): EventDef | null {
  return selectEvent(state, content, rng);
}
