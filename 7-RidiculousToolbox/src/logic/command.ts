import type { CommandRecord, GameState } from './schema';

export function cloneState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}

/** 可撤销命令历史（Command 模式 + 快照，文档 §3.5）。状态小，直接深拷贝快照。 */
export class CommandHistory {
  private undoStack: CommandRecord[] = [];
  private redoStack: CommandRecord[] = [];

  push(record: CommandRecord): void {
    this.undoStack.push(record);
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get depth(): number {
    return this.undoStack.length;
  }

  /** 已应用（未撤销）的操作记录，按时间顺序 */
  get applied(): CommandRecord[] {
    return this.undoStack;
  }

  peek(): CommandRecord | null {
    return this.undoStack.length ? this.undoStack[this.undoStack.length - 1] : null;
  }

  undo(): GameState | null {
    const r = this.undoStack.pop();
    if (!r) return null;
    this.redoStack.push(r);
    return cloneState(r.before);
  }

  redo(): GameState | null {
    const r = this.redoStack.pop();
    if (!r) return null;
    this.undoStack.push(r);
    return cloneState(r.after);
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
