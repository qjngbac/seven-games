// 可复现随机数：mulberry32。状态是单个 uint32，便于存档与重放。
// 设计原因：同一 seed + 同一选择序列必须得到完全相同的事件与结算（文档 §10.1 要求）。

export class Rng {
  private s: number;
  constructor(seed: number) {
    // 归一化为 uint32，避免 0 状态退化
    this.s = (seed >>> 0) || 0x9e3779b9;
  }
  /** 当前内部状态（用于存档） */
  get state(): number {
    return this.s >>> 0;
  }
  set state(v: number) {
    this.s = v >>> 0;
  }
  /** 返回 [0,1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** 返回 [0,n) 整数 */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  /** 带权抽取：传入 [{item, weight}]，weight<=0 的项会被跳过 */
  weighted<T>(items: { item: T; weight: number }[]): T | null {
    const valid = items.filter((x) => x.weight > 0);
    if (valid.length === 0) return null;
    const total = valid.reduce((a, b) => a + b.weight, 0);
    let r = this.next() * total;
    for (const x of valid) {
      r -= x.weight;
      if (r < 0) return x.item;
    }
    return valid[valid.length - 1].item;
  }
  /** 从数组随机取一个 */
  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }
}

/** 用当前时间生成一个 seed（仅在"新游戏"入口用，存档里固定下来后可重放） */
export function makeSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
