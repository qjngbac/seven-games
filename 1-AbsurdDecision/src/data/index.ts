// 内容装配：合并事件包 → 校验 → 剔除非法事件（不崩溃）→ 输出 ContentPack。
// 设计原因：内容必须数据驱动、可批量生成；非法内容跳过并记日志，保证游戏始终可运行（文档 §5 / §10.1）。
import pack1 from "./events/pack1.json";
import pack2 from "./events/pack2.json";
import pack3 from "./events/pack3.json";
import pack4 from "./events/pack4.json";
import type { ContentPack, EventDef } from "../core/types";
import { buildContent, RELATIONS } from "./world";
import { validateContent, validateEvent } from "./schema";

const rawPacks = [pack1, pack2, pack3, pack4];

function load(): { content: ContentPack; errors: string[]; total: number; kept: number } {
  const all = rawPacks.flat() as EventDef[];
  const ctx = {
    relations: RELATIONS.map((r) => r.id),
    eventIds: new Set(all.map((e) => e.id)),
  };
  const valid = all.filter((e) => validateEvent(e, ctx).length === 0);
  const content = buildContent(valid);
  const { errors } = validateContent(content);
  return { content, errors, total: all.length, kept: valid.length };
}

const loaded = load();

export const CONTENT: ContentPack = loaded.content;
export const CONTENT_ERRORS: string[] = loaded.errors;
export const CONTENT_STATS = { total: loaded.total, kept: loaded.kept };

/** 供调试/测试：打印内容加载报告 */
export function reportContent(): string {
  if (CONTENT_ERRORS.length === 0)
    return `内容加载 OK：共 ${CONTENT_STATS.kept} 个事件（来自 ${rawPacks.length} 个包）。`;
  return `内容加载警告：保留 ${CONTENT_STATS.kept}/${CONTENT_STATS.total} 个事件，跳过 ${CONTENT_ERRORS.length} 处问题：\n${CONTENT_ERRORS.join("\n")}`;
}
