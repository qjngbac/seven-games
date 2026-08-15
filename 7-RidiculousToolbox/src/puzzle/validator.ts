import type { Level, Recipe } from '../logic/schema';
import { ITEM_DEFS } from '../data/items';

export interface ValidationIssue {
  levelId: string;
  recipeId?: string;
  severity: 'error' | 'warn';
  message: string;
}

const TAG_INDEX = new Set<string>();
for (const d of Object.values(ITEM_DEFS)) for (const t of d.tags) TAG_INDEX.add(t);

function inputSig(r: Recipe): string {
  const ins = r.inputs
    .map((i) => `${i.tag ?? ''}|${i.item ?? ''}|${JSON.stringify(i.requireState ?? {})}|${i.count ?? 1}|${i.consumed ?? true}`)
    .sort()
    .join('+');
  const tgt = r.target ? `${r.target.id ?? ''}#${r.target.tag ?? ''}` : '';
  return `${r.kind}|${ins}|${tgt}|${r.verb ?? ''}`;
}

function collectTargets(pred: unknown, ids: Set<string>, out: ValidationIssue[], levelId: string): void {
  if (!pred || typeof pred !== 'object') return;
  const p = pred as Record<string, unknown>;
  if ('target' in p && typeof p.target === 'string') {
    if (!ids.has(p.target)) out.push({ levelId, severity: 'error', message: `解法谓词引用了不存在的场景目标: ${p.target}` });
  }
  for (const k of ['and', 'or', 'not'] as const) {
    if (k in p && Array.isArray(p[k])) for (const sub of p[k] as unknown[]) collectTargets(sub, ids, out, levelId);
  }
}

/** 数据校验（文档 §5.2）：引用完整性、优先级冲突、至少一解。 */
export function validateLevel(level: Level): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const targetIds = new Set(level.targets.map((t) => t.id));
  const tagSet = TAG_INDEX;

  if (level.solutions.length === 0) {
    issues.push({ levelId: level.id, severity: 'error', message: '关卡没有任何解法定义' });
  }

  // 优先级冲突：同签名同优先级多条 → 加载报错
  const bySig = new Map<string, { recipe: Recipe; priorities: number[] }>();
  for (const r of level.recipes) {
    const sig = inputSig(r);
    const rec = bySig.get(sig);
    if (!rec) bySig.set(sig, { recipe: r, priorities: [r.priority ?? 0] });
    else rec.priorities.push(r.priority ?? 0);
  }
  for (const [sig, rec] of bySig) {
    const dup = rec.priorities.filter((p, i) => rec.priorities.indexOf(p) !== i);
    if (dup.length > 0) {
      issues.push({
        levelId: level.id,
        recipeId: rec.recipe.recipeId,
        severity: 'error',
        message: `配方优先级冲突（签名 ${sig} 存在相同最高优先级多条，运行期结果不确定）`,
      });
    }
  }

  for (const r of level.recipes) {
    for (const inp of r.inputs) {
      if (inp.item && !ITEM_DEFS[inp.item]) {
        issues.push({ levelId: level.id, recipeId: r.recipeId, severity: 'error', message: `输入引用了未知物品: ${inp.item}` });
      }
      if (inp.tag && !tagSet.has(inp.tag)) {
        issues.push({ levelId: level.id, recipeId: r.recipeId, severity: 'error', message: `输入引用了未知标签: ${inp.tag}` });
      }
    }
    if (r.target?.id && !targetIds.has(r.target.id)) {
      issues.push({ levelId: level.id, recipeId: r.recipeId, severity: 'error', message: `use 配方目标不存在: ${r.target.id}` });
    }
    for (const c of r.conditions ?? []) {
      if (c.targetState && !targetIds.has(c.targetState.targetId)) {
        issues.push({ levelId: level.id, recipeId: r.recipeId, severity: 'error', message: `条件引用了未知场景目标: ${c.targetState.targetId}` });
      }
    }
    for (const o of r.outputs ?? []) {
      if (o.addItem && !ITEM_DEFS[o.addItem.defId]) {
        issues.push({ levelId: level.id, recipeId: r.recipeId, severity: 'error', message: `输出引用了未知物品: ${o.addItem.defId}` });
      }
      if (o.setScene && !targetIds.has(o.setScene.targetId)) {
        issues.push({ levelId: level.id, recipeId: r.recipeId, severity: 'error', message: `输出改写了未知场景目标: ${o.setScene.targetId}` });
      }
    }
  }

  for (const s of level.solutions) {
    collectTargets(s.predicate, targetIds, issues, level.id);
  }

  return issues;
}

export function validateAll(levels: Level[]): ValidationIssue[] {
  return levels.flatMap((l) => validateLevel(l));
}
