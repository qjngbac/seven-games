/**
 * 可复现随机数发生器 (mulberry32)。
 * 规则层与生成器都依赖它，保证「固定种子 → 同一局可重放」(文档 §5.2 / §8.4)。
 * 不依赖任何浏览器 API，可在 node 下单元测试。
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // 规整为 32 位无符号整数
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** [0,1) 浮点 */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [0, n) 整数 */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  /** [min, max] 闭区间整数 */
  range(min: number, max: number): number {
    return min + this.int(max - min + 1);
  }

  /** 从数组中等概率取一个 */
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }

  /** 加权抽取；weight 返回 0 的项等价于不参与 */
  weighted<T>(items: readonly { item: T; weight: number }[]): T | null {
    let total = 0;
    for (const it of items) if (it.weight > 0) total += it.weight;
    if (total <= 0) return null;
    let r = this.next() * total;
    for (const it of items) {
      if (it.weight <= 0) continue;
      r -= it.weight;
      if (r < 0) return it.item;
    }
    return items[items.length - 1]?.item ?? null;
  }

  /** 以概率 p 返回 true */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** 当前内部状态（用于存档/重放） */
  getState(): number {
    return this.state >>> 0;
  }

  setState(s: number): void {
    this.state = s >>> 0;
  }
}

/** 由字符串生成一个 32 位种子（用于每日挑战等固定种子） */
export function makeSeed(input: string | number): number {
  if (typeof input === "number") return input >>> 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 生成「今天」的每日挑战种子 (YYYY-MM-DD)。
 * 用 UTC 而非本地时区：否则跨时区（或夏令时切换）的玩家会算出不同种子，
 * 得到不同的题目，破坏"同一天同一套题"的前提。
 */
export function dailySeed(date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return makeSeed(`daily-${y}-${m}-${d}`);
}
