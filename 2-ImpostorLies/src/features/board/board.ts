import type { Puzzle, RoleId, StatementId } from "../../logic/ast";

export type Mark<T> = T | null;

export interface BoardSnapshot {
  characters: Record<string, Mark<RoleId>>;
  statements: Record<string, Mark<boolean>>;
  notes: Record<string, string>;
}

/**
 * 玩家推理板：只保存玩家的判断，绝不修改谜题真相。
 * 支持标记、撤销、清空，以及对「恰好 N」类约束做最小自动推导
 * （当剩余未知槽位数恰好等于剩余所需数时自动填满——玩家本也能数出来）。
 */
export class ReasoningBoard {
  private characters: Record<string, Mark<RoleId>> = {};
  private statements: Record<string, Mark<boolean>> = {};
  private notes: Record<string, string> = {};
  private history: BoardSnapshot[] = [];
  private puzzle: Puzzle;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    for (const c of puzzle.characters) this.characters[c.id] = null;
    for (const s of puzzle.statements) this.statements[s.id] = null;
  }

  private snapshot(): BoardSnapshot {
    return {
      characters: { ...this.characters },
      statements: { ...this.statements },
      notes: { ...this.notes },
    };
  }

  private pushHistory(): void {
    this.history.push(this.snapshot());
    if (this.history.length > 100) this.history.shift();
  }

  get canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): void {
    const prev = this.history.pop();
    if (prev) {
      this.characters = prev.characters;
      this.statements = prev.statements;
      this.notes = prev.notes;
    }
  }

  clear(): void {
    this.pushHistory();
    for (const c of this.puzzle.characters) this.characters[c.id] = null;
    for (const s of this.puzzle.statements) this.statements[s.id] = null;
    this.notes = {};
  }

  markCharacter(id: string, role: Mark<RoleId>): void {
    this.pushHistory();
    this.characters[id] = role;
    this.propagate();
  }

  markStatement(id: StatementId, truth: Mark<boolean>): void {
    this.pushHistory();
    this.statements[id] = truth;
    this.propagate();
  }

  setNote(target: string, note: string): void {
    this.notes[target] = note;
  }

  getCharacterMark(id: string): Mark<RoleId> {
    return this.characters[id];
  }

  getStatementMark(id: StatementId): Mark<boolean> {
    return this.statements[id];
  }

  getNote(target: string): string {
    return this.notes[target] ?? "";
  }

  /** 当前角色标记（用于提交时构造答案）。 */
  characterAnswers(): Record<string, Mark<RoleId>> {
    return { ...this.characters };
  }

  /**
   * 最小自动推导：依据 exactRoleCount / exactTrueStatements 等「恰好 N」约束，
   * 当未知槽位数 = 剩余所需数时自动填满。不触及「身份决定说话规则」等需推理的规则。
   */
  private propagate(): void {
    // 角色计数约束
    for (const c of this.puzzle.constraints) {
      if (c.type === "exactRoleCount") {
        const total = this.puzzle.characters.length;
        let known = 0;
        let knownTarget = 0;
        for (const ch of this.puzzle.characters) {
          const m = this.characters[ch.id];
          if (m !== null) {
            known++;
            if (m === c.role) knownTarget++;
          }
        }
        const unknown = total - known;
        const remaining = c.count - knownTarget;
        if (unknown === remaining && unknown > 0) {
          // 剩余未知者必为 c.role
          for (const ch of this.puzzle.characters) {
            if (this.characters[ch.id] !== null) continue;
            const candidates = ch.candidateRoles;
            if (candidates && !candidates.includes(c.role)) continue;
            this.characters[ch.id] = c.role;
          }
        } else if (unknown === total - c.count - (known - knownTarget) && unknown > 0) {
          // 剩余未知者必非 c.role。只有当谜题恰好只有两种身份时才能确定地填 alt；
          // 身份多于两种时无法用单一标记表达「非 c.role」，交给玩家自行判断，
          // 否则会把所有未知槽错误填成同一个身份（并违反 allRolesDistinct）。
          if (this.puzzle.roles.length === 2) {
            const alt = this.puzzle.roles.find((r) => r !== c.role);
            if (alt) {
              for (const ch of this.puzzle.characters) {
                if (this.characters[ch.id] !== null) continue;
                const candidates = ch.candidateRoles;
                if (candidates && !candidates.includes(alt)) continue;
                this.characters[ch.id] = alt;
              }
            }
          }
        }
      }
      if (c.type === "exactTrueStatements") {
        const total = this.puzzle.statements.length;
        let known = 0;
        let knownTrue = 0;
        for (const s of this.puzzle.statements) {
          const m = this.statements[s.id];
          if (m !== null) {
            known++;
            if (m) knownTrue++;
          }
        }
        const unknown = total - known;
        const remaining = c.count - knownTrue;
        if (unknown === remaining && unknown > 0) {
          for (const s of this.puzzle.statements)
            if (this.statements[s.id] === null) this.statements[s.id] = true;
        } else if (unknown === total - c.count - (known - knownTrue) && unknown > 0) {
          for (const s of this.puzzle.statements)
            if (this.statements[s.id] === null) this.statements[s.id] = false;
        }
      }
    }
  }
}
