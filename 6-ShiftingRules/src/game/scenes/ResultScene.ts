import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { makeButton, makeTitle } from "../ui/widgets";
import { fontStack } from "../ui/stimulusView";
import { GameSession, type RunResult } from "../session";
import { getPack } from "../../data/packs";
import { MODES, type ModeId } from "../modes/types";
import { recordBest, markDailyDone, getBest } from "../settings";
import type { RunMeta } from "../ui/runMeta";

/** 结算场景：准确率/速度/连击/最常错规则 + 表现标签（文档 §4 GAME_RESULT / §2.3）。 */
export class ResultScene extends Phaser.Scene {
  private result!: RunResult;
  private meta!: RunMeta;

  constructor() {
    super("Result");
  }

  init(data: { result: RunResult; meta: RunMeta }): void {
    this.result = data.result;
    this.meta = data.meta;
  }

  create(): void {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    const r = this.result;
    const meta = this.meta;

    // 记录成绩
    const date = new Date().toISOString().slice(0, 10);
    const isNewBest = recordBest(meta.modeId, meta.packId, { score: r.score, accuracy: r.accuracy, date });
    if (meta.daily) markDailyDone(meta.seedKey);
    const best = getBest(meta.modeId, meta.packId);

    makeTitle(this, WIDTH / 2, 56, r.reason === "lives" ? "生命耗尽" : "挑战完成", 38, r.reason === "lives" ? "#ff7875" : "#95de64");

    const modeName = MODES[meta.modeId as keyof typeof MODES]?.name ?? meta.modeId;
    const lines = [
      `模式：${modeName}`,
      `准确率：${(r.accuracy * 100).toFixed(1)}%   （${r.correct}/${r.rounds} 轮）`,
      `得分：${r.score}${isNewBest ? "  🏆新纪录" : ""}`,
      `最高连击：${r.maxCombo}`,
      `反应：平均 ${r.reaction.avg}ms / 最快 ${r.reaction.min}ms`,
    ];
    lines.forEach((l, i) => {
      this.add
        .text(WIDTH / 2, 120 + i * 34, l, { fontFamily: fontStack(), fontSize: "20px", color: COLORS.text })
        .setOrigin(0.5);
    });

    // 最常错规则
    const pack = getPack(meta.packId);
    const top = Object.entries(r.mistakesByRule).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const label = top[0] === "default" ? "默认项（无规则命中时）" : pack?.rules.find((x) => x.id === top[0])?.text ?? top[0];
      this.add
        .text(WIDTH / 2, 120 + lines.length * 34 + 6, `最常错：${label}（${top[1]} 次）`, {
          fontFamily: fontStack(),
          fontSize: "17px",
          color: "#ffd666",
        })
        .setOrigin(0.5);
    }

    // 表现标签
    const tags = this.tags(r);
    this.add
      .text(WIDTH / 2, 320, "表现标签：" + tags.map((t) => `「${t}」`).join(" "), {
        fontFamily: fontStack(),
        fontSize: "18px",
        color: "#69c0ff",
      })
      .setOrigin(0.5);
    if (best) {
      this.add
        .text(WIDTH / 2, 352, `历史最佳：${best.score} 分`, { fontFamily: fontStack(), fontSize: "14px", color: COLORS.sub })
        .setOrigin(0.5);
    }

    makeButton(this, WIDTH / 2 - 250, HEIGHT - 70, "再来一局", () => this.replay(), { w: 200, h: 54, fontSize: 20 });
    makeButton(this, WIDTH / 2, HEIGHT - 70, "练习室", () => this.practice(), { w: 180, h: 54, fontSize: 20, fill: 0x4b5168 });
    makeButton(this, WIDTH / 2 + 250, HEIGHT - 70, "返回菜单", () => this.scene.start("Menu"), { w: 200, h: 54, fontSize: 20, fill: 0x4b5168 });
  }

  private tags(r: RunResult): string[] {
    const t: string[] = [];
    if (r.accuracy >= 0.95) t.push("铁律执行者");
    else if (r.accuracy >= 0.8) t.push("稳如老狗");
    else if (r.accuracy < 0.5) t.push("规则眩晕中");
    if (r.reaction.count > 0 && r.reaction.avg < 500) t.push("闪电反应");
    if (r.maxCombo >= 10) t.push("连击狂魔");
    const top = Object.entries(r.mistakesByRule).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      if (top[0] === "cat_invert" || top[0].includes("cat")) t.push("被猫整蛊");
      else if (top[0] === "default") t.push("错在默认项");
      else t.push("细节翻车");
    }
    if (t.length === 0) t.push("完成挑战");
    return t.slice(0, 3);
  }

  private replay(): void {
    const meta = this.meta;
    const pack = getPack(meta.packId);
    if (!pack) {
      this.scene.start("Menu");
      return;
    }
    const seed = meta.daily ? meta.seed : (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    const session = new GameSession({ mode: meta.modeId as ModeId, ruleset: pack, seed });
    this.registry.set("session", session);
    this.registry.set("meta", { ...meta, seed });
    this.scene.start("RulePreview");
  }

  private practice(): void {
    const meta = this.meta;
    const pack = getPack(meta.packId);
    if (!pack) {
      this.scene.start("Menu");
      return;
    }
    const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    const session = new GameSession({ mode: "practice", ruleset: pack, seed });
    const newMeta: RunMeta = { modeId: "practice", packId: meta.packId, seed, daily: false, seedKey: "" };
    this.registry.set("session", session);
    this.registry.set("meta", newMeta);
    this.scene.start("RulePreview");
  }
}
