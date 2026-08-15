// 推理板：保存玩家连接与笔记。不自动改变案件事实（设计文档 §3.4 / §6.3）。
import type { CaseDef, FactId, EvidenceId } from '../case-model/types'

export type NodeKind = 'fact' | 'evidence'
export interface BoardNode {
  id: string // 稳定 id（fact:<FactId> / ev:<EvidenceId>）
  kind: NodeKind
  ref: string
  label: string
}
export type LinkKind = 'support' | 'contradiction'
export interface BoardLink {
  a: string
  b: string
  kind: LinkKind
}

export interface BoardState {
  nodes: BoardNode[]
  links: BoardLink[]
  notes: string
}

export class EvidenceBoard {
  nodes = new Map<string, BoardNode>()
  links: BoardLink[] = []
  notes = ''

  /** 节点 id 生成。 */
  static factNodeId(f: FactId) {
    return `fact:${f}`
  }
  static evNodeId(e: EvidenceId) {
    return `ev:${e}`
  }

  addFactNode(fact: FactId, label: string) {
    const id = EvidenceBoard.factNodeId(fact)
    if (!this.nodes.has(id)) this.nodes.set(id, { id, kind: 'fact', ref: fact, label })
  }
  addEvidenceNode(evId: EvidenceId, label: string) {
    const id = EvidenceBoard.evNodeId(evId)
    if (!this.nodes.has(id)) this.nodes.set(id, { id, kind: 'evidence', ref: evId, label })
  }

  link(a: string, b: string, kind: LinkKind): boolean {
    if (a === b) return false
    if (!this.nodes.has(a) || !this.nodes.has(b)) return false
    // 去重（无向）
    const exists = this.links.some(
      (l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)
    )
    if (!exists) this.links.push({ a, b, kind })
    return true
  }

  unlink(a: string, b: string) {
    this.links = this.links.filter(
      (l) => !((l.a === a && l.b === b) || (l.a === b && l.b === a))
    )
  }

  /** 判定某条连接是否符合案件定义的真实关系。 */
  isValidLink(a: string, b: string, kind: LinkKind, def: CaseDef): boolean {
    const na = this.nodes.get(a)
    const nb = this.nodes.get(b)
    if (!na || !nb) return false
    if (kind === 'contradiction') {
      const pairs = def.contradictions ?? []
      return pairs.some(
        ([x, y]) =>
          (na.ref === x && nb.ref === y) || (na.ref === y && nb.ref === x)
      )
    }
    // support
    const sup = def.supports ?? []
    return sup.some(
      ([x, y]) =>
        (na.ref === x && nb.ref === y) || (na.ref === y && nb.ref === x)
    )
  }

  /** 当前已连接且真实有效的矛盾（玩家已识别）。 */
  validContradictions(def: CaseDef): BoardLink[] {
    return this.links.filter((l) => l.kind === 'contradiction' && this.isValidLink(l.a, l.b, 'contradiction', def))
  }

  /**
   * 提示：玩家已发现、但尚未连接的两个互斥事实（both 已作为节点存在且 discovered）。
   */
  suggestContradictions(def: CaseDef, discoveredFacts: FactId[]): Array<[FactId, FactId]> {
    const disc = new Set(discoveredFacts)
    const out: Array<[FactId, FactId]> = []
    for (const [x, y] of def.contradictions ?? []) {
      if (!disc.has(x) || !disc.has(y)) continue
      const ax = EvidenceBoard.factNodeId(x)
      const ay = EvidenceBoard.factNodeId(y)
      const linked = this.links.some(
        (l) =>
          l.kind === 'contradiction' &&
          ((l.a === ax && l.b === ay) || (l.a === ay && l.b === ax))
      )
      if (!linked) out.push([x, y])
    }
    return out
  }

  toState(): BoardState {
    return { nodes: [...this.nodes.values()], links: this.links, notes: this.notes }
  }

  loadState(s: BoardState) {
    this.nodes.clear()
    for (const n of s.nodes) this.nodes.set(n.id, n)
    this.links = s.links ?? []
    this.notes = s.notes ?? ''
  }
}
