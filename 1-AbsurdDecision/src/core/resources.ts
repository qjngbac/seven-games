// 资源区间与钳制：把数值映射为 stable/warning/danger/critical 四档。
// 设计原因：区间同时驱动界面配色、事件权重与音效（文档 §3.3 / §6.4）。
import type { Band, ResourceDef } from "./types";

/** 把数值夹到 [min,max] */
export function clampResource(def: ResourceDef, value: number): number {
  return Math.max(def.min, Math.min(def.max, value));
}

/**
 * 计算资源所处区间。
 * 正向资源（如金钱）：值越高越好；反向资源（techDebt）：值越高越糟。
 */
export function bandOf(def: ResourceDef, value: number): Band {
  const [b1, b2, b3] = def.bands; // 升序三阈值
  if (def.invert) {
    // 反向：越高越糟 -> 高分区为更危险
    if (value >= b3) return "critical";
    if (value >= b2) return "danger";
    if (value >= b1) return "warning";
    return "stable";
  }
  // 正向：越低越糟
  if (value < b1) return "critical";
  if (value < b2) return "danger";
  if (value < b3) return "warning";
  return "stable";
}

export function isFailing(def: ResourceDef, value: number): boolean {
  return def.invert ? value >= def.failAt : value <= def.failAt;
}

/** 区间文案（用于界面提示） */
export const BAND_LABEL: Record<Band, string> = {
  stable: "稳定",
  warning: "警告",
  danger: "危险",
  critical: "临界",
};
