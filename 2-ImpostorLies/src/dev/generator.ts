// 谜题生成器（开发期工具 / 批量求解校验）
// 思路：用确定性求解器当「预言机」，随机组合陈述模板，只保留「能在目标世界成为解、
// 且求解器判定为唯一解」的谜题。这样保证发布的 20 关全部唯一解、无自指死循环。
// 运行方式：GEN=1 npx vitest run src/dev/generate.spec.ts
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type {
  CharacterDef,
  Constraint,
  Expr,
  Puzzle,
  RoleAssignment,
  RoleId,
  Statement,
  StatementId,
} from "../logic/ast";
import { evaluate } from "../logic/evaluator";
import { passesConstraints, solve } from "../logic/solver";
import { validatePuzzle } from "../puzzle/validator";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind =
  | "accuse"
  | "denyImpostor"
  | "selfRole"
  | "notSelfRole"
  | "eqTruth"
  | "xorTruth"
  | "lieOf"
  | "truthOf"
  | "sameRole"
  | "diffRole";

interface GenConfig {
  roles: RoleId[];
  roleLabels: Record<RoleId, string>;
  /** 候选陈述种类（不同章节解锁不同机制）。 */
  allowKinds: Kind[];
  /** 约束构造：传入本关参数（真语句数、伪装者数）。 */
  buildConstraints: (p: { trueCount: number; impostorCount: number }) => Constraint[];
  /** 目标世界里伪装者所在的下标集合（用于构造目标解）。 */
  impostorSlots: number[][];
  /** 候选「恰好 N 句真话」值。 */
  trueCounts: number[];
  /** 候选「恰好 N 个伪装者」值。 */
  impostorCounts: number[];
  /** 身份是否互不相同（身份谜）。 */
  distinct?: boolean;
}

function charIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)); // A,B,C...
}

/** 构造一个满足「distinct」或「impostorSlots」的目标世界。 */
function pickWorld(
  cfg: GenConfig,
  n: number,
  rng: () => number,
  targetImpostorCount: number,
): RoleAssignment {
  const ids = charIds(n);
  const world: RoleAssignment = {};
  if (cfg.distinct) {
    const roles = [...cfg.roles];
    // 洗牌后逐一分配，保证互不相同
    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }
    ids.forEach((id, i) => (world[id] = roles[i]));
    return world;
  }
  // 经典：normal / impostor，指定伪装者数量
  const impostorRole = cfg.roles.find((r) => r === "impostor") ?? cfg.roles[1];
  const normalRole = cfg.roles.find((r) => r === "normal") ?? cfg.roles[0];
  const slots = new Set<number>();
  while (slots.size < targetImpostorCount) {
    slots.add(Math.floor(rng() * n));
  }
  ids.forEach((id, i) => (world[id] = slots.has(i) ? impostorRole : normalRole));
  return world;
}

function nameOf(puzzleChars: CharacterDef[], stmtId: StatementId): string {
  const idx = Number(stmtId.replace(/\D/g, ""));
  return puzzleChars[idx]?.name ?? `角色${stmtId}`;
}

/** 依据种类与参数，生成一条陈述（含展示文本与 AST）。引用只指向更早的陈述。 */
function buildStatement(
  kind: Kind,
  selfId: string,
  selfIdx: number,
  ids: string[],
  names: string[],
  roleLabels: Record<RoleId, string>,
  world: RoleAssignment,
  truthSoFar: Record<StatementId, boolean>,
  rng: () => number,
): Statement | null {
  const self = selfId;
  const impostor = "impostor";
  const label = (r: RoleId) => roleLabels[r] ?? r;
  const otherRoles = (r: RoleId) => {
    // 选一个与 r 不同的身份（用于 selfRole/notSelfRole 的对照）
    const alt = Object.keys(roleLabels).find((k) => k !== r);
    return alt ?? r;
  };
  const pickRole = () => {
    const ks = Object.keys(roleLabels);
    return ks[Math.floor(rng() * ks.length)];
  };
  const pickOtherChar = (exclude: number) => {
    let i = Math.floor(rng() * ids.length);
    if (ids.length > 1) while (i === exclude) i = Math.floor(rng() * ids.length);
    return i;
  };
  const stmtId = (i: number): StatementId => `stmt_${ids[i]}`;

  switch (kind) {
    case "accuse": {
      const t = pickOtherChar(selfIdx);
      const e: Expr = { op: "roleIs", character: ids[t], role: impostor };
      return {
        id: stmtId(selfIdx),
        speaker: self,
        text: `${names[t]} 是${label(impostor)}。`,
        expr: e,
      };
    }
    case "denyImpostor": {
      const t = pickOtherChar(selfIdx);
      const e: Expr = { op: "not", arg: { op: "roleIs", character: ids[t], role: impostor } };
      return {
        id: stmtId(selfIdx),
        speaker: self,
        text: `${names[t]} 不是${label(impostor)}。`,
        expr: e,
      };
    }
    case "selfRole": {
      const r = pickRole();
      const e: Expr = { op: "roleIs", character: self, role: r };
      return {
        id: stmtId(selfIdx),
        speaker: self,
        text: `我是${label(r)}。`,
        expr: e,
      };
    }
    case "notSelfRole": {
      const r = pickRole();
      const e: Expr = { op: "not", arg: { op: "roleIs", character: self, role: r } };
      return {
        id: stmtId(selfIdx),
        speaker: self,
        text: `我不是${label(r)}。`,
        expr: e,
      };
    }
    case "eqTruth":
    case "xorTruth":
    case "lieOf":
    case "truthOf": {
      if (selfIdx < 1) return null;
      // 选两个更早的陈述（distinct）
      const a = Math.floor(rng() * selfIdx);
      let b = Math.floor(rng() * selfIdx);
      if (selfIdx > 1) while (b === a) b = Math.floor(rng() * selfIdx);
      const na = names[a];
      const nb = names[b];
      if (kind === "eqTruth")
        return {
          id: stmtId(selfIdx),
          speaker: self,
          text: `${na} 和 ${nb} 说的真假相同。`,
          expr: { op: "eqTruth", left: stmtId(a), right: stmtId(b) },
        };
      if (kind === "xorTruth")
        return {
          id: stmtId(selfIdx),
          speaker: self,
          text: `${na} 和 ${nb} 说的真假不一样。`,
          expr: { op: "xorTruth", left: stmtId(a), right: stmtId(b) },
        };
      if (kind === "lieOf")
        return {
          id: stmtId(selfIdx),
          speaker: self,
          text: `${na} 在说谎。`,
          expr: { op: "not", arg: { op: "stmtTruth", statement: stmtId(a) } },
        };
      return {
        id: stmtId(selfIdx),
        speaker: self,
        text: `${na} 说的是真话。`,
        expr: { op: "stmtTruth", statement: stmtId(a) },
      };
    }
    case "sameRole":
    case "diffRole": {
      if (ids.length < 2) return null;
      const t = pickOtherChar(selfIdx);
      const e: Expr =
        kind === "sameRole"
          ? { op: "sameRole", a: self, b: ids[t] }
          : { op: "not", arg: { op: "sameRole", a: self, b: ids[t] } };
      return {
        id: stmtId(selfIdx),
        speaker: self,
        text:
          kind === "sameRole"
            ? `我和 ${names[t]} 是同一类人。`
            : `我和 ${names[t]} 不是同一类人。`,
        expr: e,
      };
    }
    default:
      return null;
  }
}

/** 单个谜题搜索：返回唯一解谜题或 null。 */
function searchPuzzle(
  cfg: GenConfig,
  n: number,
  names: string[],
  blurbs: string[],
  seed: number,
  attempts: number,
): Puzzle | null {
  const rng = mulberry32(seed);
  const ids = charIds(n);
  const characters: CharacterDef[] = ids.map((id, i) => ({
    id,
    name: names[i],
    blurb: blurbs[i],
  }));

  for (let a = 0; a < attempts; a++) {
    const trueCount = cfg.trueCounts[a % cfg.trueCounts.length];
    const impostorCount = cfg.impostorCounts[a % cfg.impostorCounts.length];
    const world = pickWorld(cfg, n, rng, impostorCount);

    const statements: Statement[] = [];
    const truthSoFar: Record<StatementId, boolean> = {};
    let ok = true;
    for (let i = 0; i < n; i++) {
      let st: Statement | null = null;
      for (let tries = 0; tries < 12; tries++) {
        const kind = cfg.allowKinds[Math.floor(rng() * cfg.allowKinds.length)];
        const cand = buildStatement(
          kind,
          ids[i],
          i,
          ids,
          names,
          cfg.roleLabels,
          world,
          truthSoFar,
          rng,
        );
        if (cand) {
          st = cand;
          break;
        }
      }
      if (!st) {
        ok = false;
        break;
      }
      // 计算该陈述在当前世界中的真假（仅依赖更早陈述，safe）
      const v = evaluate(st.expr, world, truthSoFar);
      if (v === undefined) {
        ok = false;
        break;
      }
      statements.push(st);
      truthSoFar[st.id] = v;
    }
    if (!ok) continue;

    const constraints = cfg.buildConstraints({ trueCount, impostorCount });
    if (!passesConstraints(world, truthSoFar, statements, constraints)) continue;

    const puzzle: Puzzle = {
      id: "",
      title: "",
      scene: "",
      roles: cfg.roles,
      roleLabels: cfg.roleLabels,
      constraints,
      characters,
      statements,
    };
    const res = solve(puzzle);
    if (res.status !== "unique") continue;
    // 确认唯一解就是目标世界
    const sol = res.solutions[0];
    const matches = ids.every((id) => sol.roles[id] === world[id]);
    if (!matches) continue;
    if (validatePuzzle(puzzle).some((i) => i.level === "error")) continue;
    return puzzle;
  }
  return null;
}

export interface ChapterSpec {
  id: string;
  title: string;
  mechanic: string;
  scenePool: string[];
  names: string[];
  blurbs: string[];
  cfg: GenConfig;
  perChapter: number;
}

/** 五个章节的配置。 */
export const CHAPTER_SPECS: ChapterSpec[] = [
  {
    id: "ch1",
    title: "第一章 · 机房疑云",
    mechanic: "基础：恰好 1 个伪装者，且只有若干句话为真。先看谁在说谎。",
    scenePool: [
      "三台服务器在争：到底谁半夜偷偷重启了集群。",
      "机房巡检机器人围成一团，互相甩锅。",
      "新员工搞混了账号，三个系统里藏着一个冒名顶替的。",
      "值班室里三杯咖啡，只有一杯被人动过手脚。",
    ],
    names: ["服务器α", "服务器β", "服务器γ"],
    blurbs: ["自称从不掉线", "喜欢甩锅", "默默背锅"],
    cfg: {
      roles: ["normal", "impostor"],
      roleLabels: { normal: "老实人", impostor: "伪装者" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "lieOf", "truthOf"],
      buildConstraints: ({ trueCount }) => [
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2]],
      trueCounts: [1, 2],
      impostorCounts: [1],
    },
    perChapter: 4,
  },
  {
    id: "ch2",
    title: "第二章 · 外星食堂",
    mechanic: "进阶：角色会引用彼此的真假（「我和他说的相同/不同」）。注意互指。",
    scenePool: [
      "外星食堂里三个触手服务员，其中一个是伪装成服务员的间谍。",
      "星际补给舱三人小组，话里有话。",
      "翻译官两两对质，谁在配合谁？",
      "外星小孩玩「谁在骗人」游戏，规则是恰好一句真话。",
    ],
    names: ["触手甲", "触手乙", "触手丙"],
    blurbs: ["绿色那只", "紫色那只", "蓝色那只"],
    cfg: {
      roles: ["normal", "impostor"],
      roleLabels: { normal: "老实外星人", impostor: "伪装间谍" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "eqTruth", "xorTruth", "lieOf", "truthOf"],
      buildConstraints: () => [
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: 1 },
      ],
      impostorSlots: [[0], [1], [2]],
      trueCounts: [1],
      impostorCounts: [1],
    },
    perChapter: 4,
  },
  {
    id: "ch3",
    title: "第三章 · 办公室政治",
    mechanic: "规则：伪装者永远说假话（身份决定说话规则）。利用这条铁律。",
    scenePool: [
      "周报会上，三位同事，其中一个是冒名顶替的实习生。",
      "报销群里三人在互相揭短，伪装者从不说真话。",
      "工位三人组，内鬼只撒谎。",
      "晋升答辩前夜，三人里藏着冒牌货。",
    ],
    names: ["同事阿强", "同事小美", "同事老王"],
    blurbs: ["爱表现", "爱摸鱼", "爱背锅"],
    cfg: {
      roles: ["normal", "impostor"],
      roleLabels: { normal: "真同事", impostor: "冒牌货" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "lieOf", "truthOf", "eqTruth"],
      buildConstraints: ({ trueCount }) => [
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "roleStatementTruth", role: "impostor", truth: false },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2]],
      trueCounts: [1, 2],
      impostorCounts: [1],
    },
    perChapter: 4,
  },
  {
    id: "ch4",
    title: "第四章 · 侦探事务所",
    mechanic: "量词：可能有多个伪装者，且「恰好 N 人说真话」。组合约束更紧。",
    scenePool: [
      "四名嫌疑人，侦探要揪出全部伪装者。",
      "档案室五人，真假话数量被严格限定。",
      "线人四人中藏着两个内鬼。",
      "结案会上四个人，只有两句真话。",
    ],
    names: ["嫌疑人甲", "嫌疑人乙", "嫌疑人丙", "嫌疑人丁"],
    blurbs: ["戴帽子", "拿咖啡", "转笔", "抖腿"],
    cfg: {
      roles: ["normal", "impostor"],
      roleLabels: { normal: "清白者", impostor: "伪装者" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "lieOf", "truthOf", "sameRole", "diffRole"],
      buildConstraints: ({ trueCount, impostorCount }) => [
        { type: "exactRoleCount", role: "impostor", count: impostorCount },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2], [3]],
      trueCounts: [1, 2],
      impostorCounts: [1, 2],
    },
    perChapter: 4,
  },
  {
    id: "ch5",
    title: "第五章 · 全员身份谜",
    mechanic: "身份谜：每人身份各不相同，伪装者混在其中。先排出所有人的真实身份。",
    scenePool: [
      "医院里四人，分别是医生/护士/病人/伪装者，各不同。",
      "剧组四人，导演/主演/场记/冒名者，各不相同。",
      "实验室四人，主任/助理/访客/间谍，互不相同。",
      "航班四人，机长/空乘/乘客/偷渡者，各就各位。",
    ],
    names: ["白大褂", "护士服", "病号服", "黑外套"],
    blurbs: ["镇定", "忙碌", "虚弱", "神秘"],
    cfg: {
      roles: ["doctor", "nurse", "patient", "impostor"],
      roleLabels: { doctor: "医生", nurse: "护士", patient: "病人", impostor: "伪装者" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "sameRole", "diffRole", "lieOf", "truthOf"],
      buildConstraints: ({ trueCount }) => [
        { type: "allRolesDistinct" },
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2], [3]],
      trueCounts: [1, 2],
      impostorCounts: [1],
      distinct: true,
    },
      perChapter: 4,
  },
  {
    id: "ch6",
    title: "第六章 · 密室逃脱",
    mechanic: "五人剧本杀：恰好 1 个伪装者，且「恰好 N 人说真话」。人多了，先把话分成真假两堆。",
    scenePool: [
      "密室门砰地锁上，五名玩家里藏着冒名顶替的 NPC。",
      "剧本杀终局，五名角色中只有一个是内鬼。",
      "逃生舱只剩五个座位，其中一人身份有诈。",
      "狼人杀散场，五个朋友里混进一个伪装者。",
    ],
    names: ["红衣玩家", "蓝衣玩家", "绿衣玩家", "黄衣玩家", "紫衣玩家"],
    blurbs: ["紧张冒汗", "故作冷静", "话痨", "沉默寡言", "神神秘秘"],
    cfg: {
      roles: ["normal", "impostor"],
      roleLabels: { normal: "真人", impostor: "伪装者" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "lieOf", "truthOf", "eqTruth", "xorTruth"],
      buildConstraints: ({ trueCount }) => [
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2], [3], [4]],
      trueCounts: [2, 3, 4],
      impostorCounts: [1],
    },
    perChapter: 4,
  },
  {
    id: "ch7",
    title: "第七章 · 双重间谍",
    mechanic: "人海战术：可能有 2 个伪装者，且「恰好 N 人说真话」。先数清内鬼再排查。",
    scenePool: [
      "情报站五名干员，档案里至少有两个是双重间谍。",
      "五人行动组执行卧底任务，内鬼不止一个。",
      "峰会安保五人，眼线混进了两个。",
      "秘密实验室五名研究员，其中两位身份有假。",
    ],
    names: ["特工K", "特工R", "特工S", "特工T", "特工V"],
    blurbs: ["代号老练", "新人紧张", "笑里藏刀", "沉默观察", "过度热情"],
    cfg: {
      roles: ["normal", "impostor"],
      roleLabels: { normal: "忠诚干员", impostor: "双重间谍" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "lieOf", "truthOf", "sameRole", "diffRole"],
      buildConstraints: ({ trueCount, impostorCount }) => [
        { type: "exactRoleCount", role: "impostor", count: impostorCount },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2], [3], [4]],
      trueCounts: [1, 2, 3],
      impostorCounts: [2],
    },
    perChapter: 4,
  },
  {
    id: "ch8",
    title: "第八章 · 末日方舟",
    mechanic: "身份谜·四人版：每人身份各不相同（船长/领航/工程师/伪装者），先排出全员真实身份。",
    scenePool: [
      "方舟启航前夜，四名乘员身份各异，内鬼混在其中。",
      "避难所登记处，四人各持一种身份，其中一人是冒名者。",
      "殖民船四名船员，名册上身份互不相同，藏着伪装者。",
      "最后列车四节车厢，乘员身份各不相同，有人顶替。",
    ],
    names: ["灰袍乘员", "白袍乘员", "黑袍乘员", "棕袍乘员"],
    blurbs: ["沉着", "健谈", "警惕", "不安"],
    cfg: {
      roles: ["captain", "pilot", "engineer", "impostor"],
      roleLabels: { captain: "船长", pilot: "领航员", engineer: "工程师", impostor: "伪装者" },
      allowKinds: ["accuse", "denyImpostor", "selfRole", "notSelfRole", "sameRole", "diffRole", "lieOf", "truthOf"],
      buildConstraints: ({ trueCount }) => [
        { type: "allRolesDistinct" },
        { type: "exactRoleCount", role: "impostor", count: 1 },
        { type: "exactTrueStatements", count: trueCount },
      ],
      impostorSlots: [[0], [1], [2], [3]],
      trueCounts: [1, 2],
      impostorCounts: [1],
      distinct: true,
    },
    perChapter: 4,
  },
];

/** 生成全部章节谜题（每章 perChapter 个），写入 data/puzzles JSON。返回统计。 */
export function generateAllPuzzles(rootDir: string): {
  total: number;
  byChapter: Record<string, number>;
  failed: string[];
} {
  const outDir = join(rootDir, "src", "data", "puzzles");
  mkdirSync(outDir, { recursive: true });
  const byChapter: Record<string, number> = {};
  const failed: string[] = [];
  let globalSeed = 20260814;

  for (const spec of CHAPTER_SPECS) {
    const puzzles: Puzzle[] = [];
    let idx = 1;
    let guard = 0;
    while (puzzles.length < spec.perChapter && guard < spec.perChapter * 60) {
      guard++;
      globalSeed += 1;
      const n = spec.names.length;
      const p = searchPuzzle(spec.cfg, n, spec.names, spec.blurbs, globalSeed, 6000);
      if (!p) {
        failed.push(`${spec.id}: 未找到 (guard=${guard})`);
        continue;
      }
      // 去重（按陈述文本集合）
      const sig = p.statements.map((s) => s.text).sort().join("|");
      if (puzzles.some((q) => q.statements.map((s) => s.text).sort().join("|") === sig)) {
        continue;
      }
      const id = `${spec.id}_${String(idx).padStart(2, "0")}`;
      p.id = id;
      p.title = `${spec.title} · 第 ${idx} 关`;
      p.scene = spec.scenePool[(idx - 1) % spec.scenePool.length];
      p.mechanic = spec.mechanic;
      puzzles.push(p);
      idx++;
    }
    byChapter[spec.id] = puzzles.length;
    const file = join(outDir, `${spec.id}.json`);
    writeFileSync(file, JSON.stringify(puzzles, null, 2), "utf8");
  }
  return { total: Object.values(byChapter).reduce((a, b) => a + b, 0), byChapter, failed };
}

