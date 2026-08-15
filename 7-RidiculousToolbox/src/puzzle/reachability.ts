import type { GameState, Level, Operation } from '../logic/schema';
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
  const inv = s.inventory
    .map((i) => `${i.defId}:${JSON.stringify(i.state)}`)
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

function candidateOps(state: GameState): Operation[] {
  const ops: Operation[] = [];
  const ids = state.inventory.map((i) => i.instanceId);
  // 组合：所有 2 元子集（内容均为 2 输入配方）
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      ops.push({ kind: 'combine', instanceIds: [ids[i], ids[j]] });
    }
  }
  // 使用：每个物品 × 每个场景目标
  for (const id of ids) {
    for (const t of Object.keys(state.scene)) {
      ops.push({ kind: 'use', instanceId: id, targetId: t });
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
    const ops = candidateOps(cur);
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
