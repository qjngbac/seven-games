/**
 * 配色与字形 (文档 §7.1 / §5.2：颜色不是唯一判据，提供文字/形状辅助)。
 *  - 普通调色板（高对比）；
 *  - 色弱安全调色板（Okabe–Ito 近似）；
 *  - 每种颜色都配一个中文标签与形状，保证可访问性。
 */
import type { CharKey, ColorKey, ShapeKey } from "../rules/schema";

export const NORMAL_COLORS: Record<ColorKey, number> = {
  red: 0xff4d4f,
  blue: 0x4096ff,
  green: 0x52c41a,
  yellow: 0xfadb14,
  purple: 0x9254de,
};

export const CB_COLORS: Record<ColorKey, number> = {
  red: 0xd4351c,
  blue: 0x0072b2,
  green: 0x009e73,
  yellow: 0xf0e442,
  purple: 0xcc79a7,
};

export function colorValue(key: ColorKey, colorblind: boolean): number {
  return (colorblind ? CB_COLORS : NORMAL_COLORS)[key];
}

/** 颜色文字标签（始终展示，确保颜色不是唯一线索） */
export const COLOR_LABEL: Record<ColorKey, string> = {
  red: "红",
  blue: "蓝",
  green: "绿",
  yellow: "黄",
  purple: "紫",
};

/** 颜色对应的辅助形状（色弱模式下额外描边提示） */
export const COLOR_SHAPE: Record<ColorKey, ShapeKey> = {
  red: "triangle",
  blue: "circle",
  green: "square",
  yellow: "star",
  purple: "star",
};

export const SHAPE_LABEL: Record<ShapeKey, string> = {
  circle: "圆",
  square: "方",
  triangle: "三角",
  star: "星",
};

export const SHAPE_GLYPH: Record<ShapeKey, string> = {
  circle: "●",
  square: "■",
  triangle: "▲",
  star: "★",
};

export const CHAR_LABEL: Record<CharKey, string> = {
  cat: "猫",
  dog: "狗",
  robot: "机器人",
  ghost: "幽灵",
  alien: "外星人",
};

export const ACTION_LABEL: Record<string, string> = {
  LEFT: "左",
  RIGHT: "右",
  SKIP: "跳过",
  INVERT_BASE: "反转规则",
};
