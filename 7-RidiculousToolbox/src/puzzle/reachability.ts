import type { GameState, Level, Operation, Verb } from '../logic/schema';
import { ITEM_DEFS } from '../data/items';
import { applyOperation, initState } from '../logic/engine';
import { evaluateSolutions } from '../logic/solutions';

export interface ReachabilityResult {
  levelId: string;
  reachable: boolean;
  nodesExplored: number;
  truncated: boolean;
  path: Operation[];
  error?: string;
}

function stateKey(s: GameState): string {
  // 注意：必须带 quantity，否则"同一物品不同数量"会被当成同一状态而误判可达性
  const inv = s.inventory
    .map((i) => `${i.defId}:${i.quantity ?? 1}:${JSON.stringify(i.state)}`)
    .sort()
    .join(',');
  const scene = Object.entries(s.scene)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .sort()
    .join(',');
  const flags = Object.entries(s.flags)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .sort()
    .join(',');
  return `${inv}#${scene}#${flags}`;
}

/** 从 arr 中取 k 元子集（k 通常很小，直接递归即可） */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k <= 0) return [[]];
  if (k > arr.length) return [];
  const out: T[][] = [];
  const pick = (start: number, acc: T[]) => {
    if (acc.length === k) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      acc.push(arr[i]);
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

function candidateOps(state: GameState, level: Level): Operation[] {
  const ops: Operation[] = [];
  const ids = state.inventory.map((i) => i.instanceId);

  // 组合：需要几元就枚举几元 —— 不再硬编码「2 元子集」，
  // 否则将来出现 1 元或 3 元配方时 BFS 会漏掉合法路径、误报"不可解"。
  const sizes = new Set<number>();
  for (const r of level.recipes) {
    const n = r.inputs.reduce((a, b) => a + (b.count ?? 1), 0);
    if (n > 0) sizes.add(n);
  }
  if (sizes.size === 0) sizes.add(2);
  for (const k of sizes) {
    for (const combo of combinations(ids, k)) {
      ops.push({ kind: 'combine', instanceIds: combo });
    }
  }

  // 使用：每个物品 × 每个场景目标 ×（无动词 + 本关出现过的动词）。
  // 带上 verb 才能覆盖 verb 门控配方，避免"假可达"。
  const verbs = [...new Set(level.recipes.map((r) => r.verb).filter(Boolean))] as Verb[];
  for (const id of ids) {
    for (const t of Object.keys(state.scene)) {
      ops.push({ kind: 'use', instanceId: id, targetId: t });
      for (const v of verbs) ops.push({ kind: 'use', instanceId: id, targetId: t, verb: v });
    }
  }
  return ops;
}

const NODE_CAP = 60000;

/**
 * 可达性搜索（文档 §6.4 / §10.1）：BFS 遍历状态空间，证明至少一条解法存在。
 * visited 集合天然阻断无限生产循环（状态数有限）。
 */
export function checkReachable(level: Level, startId = 1): ReachabilityResult {
  const start = initState(level, startId);
  const queue: GameState[] = [start];
  const prev = new Map<string, { key: string; op: Operation } | null>();
  const visited = new Set<string>([stateKey(start)]);
  prev.set(stateKey(start), null);
  let nodes = 0;
  let truncated = false;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (evaluateSolutions(level.solutions, cur)) {
      // 回溯路径
      const path: Operation[] = [];
      let k: string | null = stateKey(cur);
      while (k !== null) {
        const step = prev.get(k);
        if (!step) break;
        path.unshift(step.op);
        k = step.key;
      }
      return { levelId: level.id, reachable: true, nodesExplored: nodes, truncated, path };
    }
    const ops = candidateOps(cur, level);
    for (const op of ops) {
      const { next } = applyOperation(ITEM_DEFS, level, cur, op);
      const key = stateKey(next);
      if (visited.has(key)) continue;
      // 未改变状态的探索（no-recipe / 中性无输出）跳过以节省空间
      const changed = key !== stateKey(cur);
      if (!changed) continue;
      visited.add(key);
      prev.set(key, { key: stateKey(cur), op });
      queue.push(next);
      nodes++;
      if (nodes > NODE_CAP) {
        truncated = true;
        return { levelId: level.id, reachable: false, nodesExplored: nodes, truncated, path: [], error: '状态空间超过上限，未搜索到解法（可能内容过复杂）' };
      }
    }
  }
  return { levelId: level.id, reachable: false, nodesExplored: nodes, truncated, path: [], error: 'BFS 结束仍未找到任何解法' };
}

export function checkAll(levels: Level[]): ReachabilityResult[] {
  return levels.map((l) => checkReachable(l));
}
