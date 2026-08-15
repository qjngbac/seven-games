import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { fontStack } from "../ui/stimulusView";
import { buildStimulusContainer } from "../ui/stimulusView";
import { keyToAction, ACTION_HINT } from "../input/keymap";
import { GameSession, type SubmitResult } from "../session";
import { explainMistake, explainTrace } from "../rules/explainer";
import type { Action, EvalResult, Rule } from "../rules/schema";
import { loadSettings, type Settings } from "../settings";
import { sfx } from "../audio/sfx";
import type { RunMeta } from "../ui/runMeta";

/**
 * 游戏主场景：内部实现文档 §4 的 COUNTDOWN → ROUND_ACTIVE → ROUND_RESULT → (RULE_CHANGE) 子状态机。
 * 普通/禅/每日/练习 共用本场景；练习模式每轮都展示讲解。
 */
export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private meta!: RunMeta;
  private settings!: Settings;

  private roundLayer!: Phaser.GameObjects.Container;
  private ruleLayer!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;
  private timerG!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private centerText!: Phaser.GameObjects.Text;

  private phase: "countdown" | "active" | "result" = "countdown";
  private locked = false;
  private startTime = 0;
  private pausedAccum = 0;
  private pauseStart = 0;
  private deadline = 2000;
  private practice = false;

  constructor() {
    super("Game");
  }

  create(): void {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    this.session = this.registry.get("session") as GameSession;
    this.meta = this.registry.get("meta") as RunMeta;
    this.settings = loadSettings();
    this.practice = this.meta.modeId === "practice";

    if (!this.session) {
      this.scene.start("Menu");
      return;
    }

    // 静态层
    this.ruleLayer = this.add.container(0, 0);
    this.add.text(WIDTH / 2, 64, "当前规则（优先级越大越晚生效）", { fontFamily: fontStack(), fontSize: "14px", color: COLORS.sub }).setOrigin(0.5);
    this.roundLayer = this.add.container(0, 0);
    this.overlay = this.add.container(0, 0);

    this.timerG = this.add.graphics();

    // HUD
    this.scoreText = this.add.text(WIDTH - 24, 20, "得分 0", { fontFamily: fontStack(), fontSize: "20px", color: COLORS.text }).setOrigin(1, 0);
    this.comboText = this.add.text(WIDTH - 24, 48, "连击 0", { fontFamily: fontStack(), fontSize: "16px", color: "#69c0ff" }).setOrigin(1, 0);
    this.livesText = this.add.text(24, 20, "", { fontFamily: fontStack(), fontSize: "18px", color: "#ff7875" }).setOrigin(0, 0);
    this.roundText = this.add.text(WIDTH / 2, 20, "", { fontFamily: fontStack(), fontSize: "16px", color: COLORS.sub }).setOrigin(0.5);

    this.centerText = this.add
      .text(WIDTH / 2, HEIGHT / 2 - 40, "", { fontFamily: fontStack(), fontSize: "72px", color: "#fff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.add
      .text(WIDTH / 2, HEIGHT - 22, ACTION_HINT, { fontFamily: fontStack(), fontSize: "15px", color: COLORS.sub })
      .setOrigin(0.5);

    // 输入
    this.input.keyboard?.on("keydown", this.onKey, this);

    // 失焦冻结计时（文档 §3.3 / §6.4：暂停、失焦期间冻结计时）
    this.game.events.on("blur", this.onBlur, this);
    this.game.events.on("focus", this.onFocus, this);
    this.events.once("shutdown", () => {
      this.input.keyboard?.off("keydown", this.onKey, this);
      this.game.events.off("blur", this.onBlur, this);
      this.game.events.off("focus", this.onFocus, this);
    });

    this.startRound();
  }

  private renderRuleBar(rules: Rule[]): void {
    this.ruleLayer.removeAll(true);
    const perRow = 4;
    const areaW = 760;
    const step = areaW / perRow;
    const startX = WIDTH / 2 - areaW / 2 + step / 2;
    rules.forEach((r, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const x = startX + col * step;
      const y = 92 + row * 28;
      this.ruleLayer.add(
        this.add.text(x, y, `【${r.priority}】${r.text}`, { fontFamily: fontStack(), fontSize: "15px", color: "#cdd6f4" }).setOrigin(0.5),
      );
    });
  }

  private startRound(): void {
    this.overlay.removeAll(true);
    this.roundLayer.removeAll(true);
    this.centerText.setText("");

    const view = this.session.beginRound();
    this.deadline = view.deadlineMs;
    this.renderRuleBar(view.activeRules);

    const card = buildStimulusContainer(this, view.stimulus, this.settings);
    card.setPosition(WIDTH / 2, HEIGHT / 2 - 20);
    card.setVisible(false);
    this.roundLayer.add(card);

    this.updateHud();
    this.roundText.setText(`第 ${view.index} 轮`);

    // 倒计时（公平计时：刺激在倒计时结束后才可见、才可交互）
    this.phase = "countdown";
    this.locked = false;
    const seq = ["3", "2", "1", "开始!"];
    seq.forEach((txt, i) => {
      this.time.delayedCall(i * 450, () => {
        this.centerText.setText(txt);
        this.centerText.setColor(txt === "开始!" ? "#95de64" : "#fff");
        if (txt === "开始!") sfx.go();
        else sfx.countdown();
        if (i === seq.length - 1) this.beginActive(card);
      });
    });
  }

  private beginActive(card: Phaser.GameObjects.Container): void {
    card.setVisible(true);
    this.centerText.setText("");
    this.phase = "active";
    this.locked = false;
    this.startTime = this.time.now;
    this.pausedAccum = 0;
    this.pauseStart = 0;
    this.timerG.clear();
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.phase !== "active" || this.locked) return;
    const action = keyToAction(ev.key);
    if (!action) return;
    ev.preventDefault();
    this.handleInput(action);
  }

  private handleInput(action: Action): void {
    this.locked = true;
    const reactionMs = Math.max(0, this.time.now - this.startTime - this.pausedAccum);
    const res = this.session.submit(action, reactionMs);
    this.showResult(res, action);
  }

  private handleTimeout(): void {
    this.locked = true;
    const res = this.session.submit(null, this.deadline);
    this.showResult(res, null);
  }

  private showResult(res: SubmitResult, playerAction: Action | null): void {
    this.phase = "result";
    const correct = res.correct;
    if (correct) {
      sfx.correct();
      if (res.combo > 1) sfx.combo(res.combo);
    } else {
      sfx.wrong();
      if (this.settings.shake) this.cameras.main.shake(180, 0.006);
    }
    this.updateHud(res);

    const ev: EvalResult = { action: res.correctAction, trace: res.trace, rawMatches: [] };
    const explain = correct ? explainTrace(ev) : explainMistake(playerAction, ev);

    this.overlay.removeAll(true);
    const panel = this.add.graphics();
    panel.fillStyle(correct ? 0x16331a : 0x3a1718, 0.94);
    panel.fillRoundedRect(WIDTH / 2 - 380, HEIGHT / 2 - 150, 760, 300, 16);
    panel.lineStyle(3, correct ? COLORS.good : COLORS.bad, 1);
    panel.strokeRoundedRect(WIDTH / 2 - 380, HEIGHT / 2 - 150, 760, 300, 16);
    this.overlay.add(panel);

    const mark = correct ? "✓ 正确" : playerAction === null ? "⏱ 超时" : "✗ 错误";
    this.overlay.add(
      this.add
        .text(WIDTH / 2, HEIGHT / 2 - 116, mark + `  +${res.gained}`, { fontFamily: fontStack(), fontSize: "30px", color: correct ? "#95de64" : "#ff7875", fontStyle: "bold" })
        .setOrigin(0.5),
    );
    // 解释按行显示
    explain.split("\n").forEach((line, i) => {
      this.overlay.add(
        this.add
          .text(WIDTH / 2, HEIGHT / 2 - 60 + i * 26, line, { fontFamily: fontStack(), fontSize: "17px", color: "#e8ecf5", align: "center" })
          .setOrigin(0.5),
      );
    });

    const delay = this.practice ? 1800 : 1000;
    this.time.delayedCall(delay, () => this.afterResult(res));
  }

  private afterResult(res: SubmitResult): void {
    if (res.over && res.result) {
      this.scene.start("Result", { result: res.result, meta: this.meta });
    } else if (res.revealed.length > 0) {
      this.scene.start("RuleChange", { revealed: res.revealed });
    } else {
      this.startRound();
    }
  }

  private updateHud(res?: SubmitResult): void {
    this.scoreText.setText(`得分 ${res ? res.score : this.session.getScore()}`);
    this.comboText.setText(`连击 ${res ? res.combo : this.session.getCombo()}`);
    const lives = this.session.getLives();
    this.livesText.setText(this.meta.modeId === "zen" || this.meta.modeId === "practice" ? "" : `生命 ${"❤".repeat(Math.max(0, lives))}`);
  }

  private onBlur(): void {
    if (this.phase === "active" && !this.locked && this.pauseStart === 0) {
      this.pauseStart = this.time.now;
    }
  }
  private onFocus(): void {
    if (this.pauseStart > 0) {
      this.pausedAccum += this.time.now - this.pauseStart;
      this.pauseStart = 0;
    }
  }

  update(time: number): void {
    if (this.phase !== "active" || this.locked) return;
    const elapsed = time - this.startTime - this.pausedAccum;
    const remaining = Math.max(0, this.deadline - elapsed);
    const ratio = remaining / this.deadline;
    this.timerG.clear();
    const barW = 720;
    const x = WIDTH / 2 - barW / 2;
    const y = HEIGHT - 56;
    this.timerG.fillStyle(0x000000, 0.4);
    this.timerG.fillRoundedRect(x, y, barW, 14, 7);
    this.timerG.fillStyle(ratio > 0.4 ? COLORS.good : COLORS.bad, 1);
    this.timerG.fillRoundedRect(x, y, Math.max(0, barW * ratio), 14, 7);
    if (remaining <= 0) this.handleTimeout();
  }
}
