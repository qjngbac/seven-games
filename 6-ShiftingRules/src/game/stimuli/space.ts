/**
 * 刺激空间定义 (文档 §5 Stimulus 实体 + §3.1 受约束随机)。
 * 集中维护所有可取的值，生成器/校验器共用，避免散落各处。
 */
import type { CharKey, ColorKey, ShapeKey, Stimulus } from "../rules/schema";
import type { Rng } from "../rng";

export const COLORS: ColorKey[] = ["red", "blue", "green", "yellow", "purple"];
export const SHAPES: ShapeKey[] = ["circle", "square", "triangle", "star"];
export const CHARS: CharKey[] = ["cat", "dog", "robot", "ghost", "alien"];

/** 作为「文字」出现、且本身是颜色名的词（用于文字优先/Stroop 规则） */
export const COLOR_WORDS = ["红", "蓝", "绿", "黄", "紫"];
/** 与判断无关的干扰词 */
export const NOISE_WORDS = ["香蕉", "宇宙", "加班", "摸鱼", "咖啡", "Bug", "需求", "开会", "奶茶", " deadline"];
export const ALL_WORDS = [...COLOR_WORDS, ...NOISE_WORDS];

export const NUMBER_MIN = 0;
export const NUMBER_MAX = 99;
export const FLAGS = ["glow", "flipped", "sparkle"];

export const COLOR_LABEL: Record<ColorKey, string> = {
  red: "红",
  blue: "蓝",
  green: "绿",
  yellow: "黄",
  purple: "紫",
};

export const CHAR_LABEL: Record<CharKey, string> = {
  cat: "猫",
  dog: "狗",
  robot: "机器人",
  ghost: "幽灵",
  alien: "外星人",
};

export const SHAPE_LABEL: Record<ShapeKey, string> = {
  circle: "圆",
  square: "方",
  triangle: "三角",
  star: "星",
};

/** 随机一个「无关词」 */
function noiseWord(rng: Rng): string {
  return rng.pick(NOISE_WORDS);
}

/**
 * 生成一个「完整但部分字段可能缺失」的随机刺激。
 * fillRate 控制每个可选字段被填充的概率（制造不同干扰强度）。
 */
export function randomStimulus(rng: Rng, fillRate = 0.6): Stimulus {
  const s: Stimulus = {};
  s.color = rng.pick(COLORS);
  if (rng.chance(fillRate)) s.word = rng.pick(ALL_WORDS);
  if (rng.chance(fillRate)) s.number = rng.range(NUMBER_MIN, NUMBER_MAX);
  if (rng.chance(fillRate)) s.shape = rng.pick(SHAPES);
  if (rng.chance(fillRate)) s.character = rng.pick(CHARS);
  if (rng.chance(fillRate * 0.5)) s.flags = [rng.pick(FLAGS)];
  return s;
}

/** 把无关词拼进候选（供生成器让文字字段不为空） */
export function randomWord(rng: Rng): string {
  return rng.pick(ALL_WORDS);
}

export { noiseWord };
