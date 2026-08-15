import { describe, it, expect } from 'vitest';
import { CommandHistory } from '../logic/command';
import type { CommandRecord, GameState } from '../logic/schema';

function fake(before: GameState, after: GameState): CommandRecord {
  return { before, operation: { kind: 'combine', instanceIds: [] }, after, result: { ok: true, kind: 'success', feedback: '', produced: [], consumed: [], sceneChanges: [], flagChanges: [] } };
}
const s0: GameState = { levelId: 't', inventory: [], scene: {}, flags: {}, nextInstanceId: 1 };
const s1: GameState = { levelId: 't', inventory: [{ instanceId: 'i1', defId: 'fan', state: {}, quantity: 1 }], scene: {}, flags: {}, nextInstanceId: 2 };
const s2: GameState = { levelId: 't', inventory: [{ instanceId: 'i1', defId: 'fan', state: { wired: true }, quantity: 1 }], scene: {}, flags: {}, nextInstanceId: 2 };

describe('command：撤销 / 重做', () => {
  it('undo 恢复到 before，redo 恢复到 after', () => {
    const h = new CommandHistory();
    h.push(fake(s0, s1));
    h.push(fake(s1, s2));
    expect(h.canUndo).toBe(true);
    expect(h.depth).toBe(2);
    const u1 = h.undo();
    expect(u1).toEqual(s1);
    const u2 = h.undo();
    expect(u2).toEqual(s0);
    expect(h.canUndo).toBe(false);
    const r1 = h.redo();
    expect(r1).toEqual(s1);
    const r2 = h.redo();
    expect(r2).toEqual(s2);
    expect(h.canRedo).toBe(false);
  });

  it('新操作清空重做栈', () => {
    const h = new CommandHistory();
    h.push(fake(s0, s1));
    h.undo();
    expect(h.canRedo).toBe(true);
    h.push(fake(s1, s2));
    expect(h.canRedo).toBe(false);
  });
});
