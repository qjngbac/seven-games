import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { makeButton, makeTitle, type Button } from "../ui/widgets";
import { fontStack } from "../ui/stimulusView";
import { PACKS } from "../../data/packs";
import { getPack } from "../../data/packs";
import { MODES, type ModeId } from "../modes/types";
import { GameSession } from "../session";
import { makeSeed } from "../rng";
import { getBest, isDailyDone } from "../settings";
import type { RunMeta } from "../ui/runMeta";

const MODE_ORDER: ModeId[] = ["normal", "zen", "daily", "practice"];

export class MenuScene extends Phaser.Scene {
  private selectedMode: ModeId = "normal";
  private selectedPack = PACKS[0]?.id ?? "pack-base";
  private modeButtons: Button[] = [];
  private packButtons: Button[] = [];
  private bestText!: Phaser.GameObjects.Text;
  private dailyNote!: Phaser.GameObjects.Text;

  constructor() {
    super("Menu");
  }

  create(): void {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    makeTitle(this, WIDTH / 2, 84, "规则正在跑路", 46);
    this.add
      .text(WIDTH / 2, 132, "看清规则，按对方向——规则会变，还会跑路", {
        fontFamily: fontStack(),
        fontSize: "18px",
        color: COLORS.sub,
      })
      .setOrigin(0.5);

    this.add.text(150, 188, "① 选择模式", { fontFamily: fontStack(), fontSize: "20px", color: COLORS.text }).setOrigin(0, 0.5);
    this.renderModes();

    this.add.text(150, 300, "② 选择规则包", { fontFamily: fontStack(), fontSize: "20px", color: COLORS.text }).setOrigin(0, 0.5);
    this.renderPacks();

    makeButton(this, WIDTH / 2, 470, "开始游戏 ▶", () => this.startGame(), { w: 320, h: 60, fontSize: 26 });
    this.bestText = this.add
      .text(WIDTH / 2, 520, "", { fontFamily: fontStack(), fontSize: "16px", color: COLORS.sub })
      .setOrigin(0.5);
    this.dailyNote = this.add
      .text(WIDTH / 2, 544, "", { fontFamily: fontStack(), fontSize: "15px", color: "#ffd666" })
      .setOrigin(0.5);

    makeButton(this, 130, 606, "设置 ⚙", () => this.scene.start("Settings"), { w: 180, h: 44, fontSize: 18, fill: 0x4b5168 });

    this.add
      .text(WIDTH / 2, 606, "← / A 左      ↓ / 空格 跳过      → / D 右", {
        fontFamily: fontStack(),
        fontSize: "15px",
        color: COLORS.sub,
      })
      .setOrigin(0.5);

    this.refreshSelection();
  }

  private renderModes(): void {
    this.modeButtons.forEach((b) => b.container.destroy());
    this.modeButtons = [];
    const w = 210;
    const gap = 20;
    const total = MODE_ORDER.length * w + (MODE_ORDER.length - 1) * gap;
    const startX = (WIDTH - total) / 2 + w / 2;
    MODE_ORDER.forEach((m, i) => {
      const x = startX + i * (w + gap);
      const btn = makeButton(this, x, 234, MODES[m].name, () => {
        this.selectedMode = m;
        this.refreshSelection();
      }, { w, h: 48, fontSize: 19 });
      this.modeButtons.push(btn);
    });
  }

  private renderPacks(): void {
    this.packButtons.forEach((b) => b.container.destroy());
    this.packButtons = [];
    const w = 168;
    const gap = 14;
    const total = PACKS.length * w + (PACKS.length - 1) * gap;
    const startX = (WIDTH - total) / 2 + w / 2;
    PACKS.forEach((p, i) => {
      const x = startX + i * (w + gap);
      const btn = makeButton(this, x, 350, `${p.name}\n难度 ${p.ruleset.difficulty}`, () => {
        this.selectedPack = p.id;
        this.refreshSelection();
      }, { w, h: 56, fontSize: 16 });
      btn.container.setData("pid", p.id);
      this.packButtons.push(btn);
    });
  }

  private refreshSelection(): void {
    this.modeButtons.forEach((b, i) => {
      const sel = MODE_ORDER[i] === this.selectedMode;
      (b.container.list[1] as Phaser.GameObjects.Text).setColor(sel ? "#ffd666" : "#ffffff");
    });
    this.packButtons.forEach((b) => {
      const txt = b.container.list[1] as Phaser.GameObjects.Text;
      const sel = b.container.getData("pid") === this.selectedPack;
      txt.setColor(sel ? "#ffd666" : "#ffffff");
    });

    const best = getBest(this.selectedMode, this.selectedPack);
    this.bestText.setText(best ? `最佳：${best.score} 分 · 准确率 ${(best.accuracy * 100).toFixed(0)}%` : "最佳：暂无记录");

    if (this.selectedMode === "daily") {
      const key = this.dailyKey();
      this.dailyNote.setText(isDailyDone(key) ? "今日挑战已完成，可重玩" : "每日挑战：全员同题，公平排名");
    } else {
      this.dailyNote.setText("");
    }
  }

  private dailyKey(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `daily-${y}-${m}-${day}`;
  }

  private startGame(): void {
    const daily = this.selectedMode === "daily";
    const key = this.dailyKey();
    const seed = daily ? makeSeed(key) : (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
    const pack = getPack(this.selectedPack);
    if (!pack) return;
    const session = new GameSession({ mode: this.selectedMode, ruleset: pack, seed });
    const meta: RunMeta = { modeId: this.selectedMode, packId: this.selectedPack, seed, daily, seedKey: key };
    this.registry.set("session", session);
    this.registry.set("meta", meta);
    this.scene.start("RulePreview");
  }
}
