import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { makeButton, makeTitle } from "../ui/widgets";
import { fontStack } from "../ui/stimulusView";
import { buildStimulusContainer } from "../ui/stimulusView";
import { satisfy } from "../stimuli/generator";
import { Rng } from "../rng";
import { loadSettings } from "../settings";
import { sfx } from "../audio/sfx";
import type { Rule } from "../rules/schema";

/** 规则变化场景：揭示新规则并给一个练习例子（文档 §2.1 / §4 RULE_CHANGE）。 */
export class RuleChangeScene extends Phaser.Scene {
  private revealed: Rule[] = [];

  constructor() {
    super("RuleChange");
  }

  init(data: { revealed?: Rule[] }): void {
    this.revealed = data.revealed ?? [];
  }

  create(): void {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    sfx.ruleChange();
    makeTitle(this, WIDTH / 2, 70, "规则变化！", 38, "#ffd666");
    this.add
      .text(WIDTH / 2, 110, "新规则已加入，下面看个例子", { fontFamily: fontStack(), fontSize: "16px", color: COLORS.sub })
      .setOrigin(0.5);

    const settings = loadSettings();
    const rng = new Rng(0x5eed);
    this.revealed.forEach((r, i) => {
      const y = 170 + i * 150;
      this.add
        .text(WIDTH / 2, y, `【优先级 ${r.priority}】${r.text}`, { fontFamily: fontStack(), fontSize: "24px", color: "#fff", fontStyle: "bold" })
        .setOrigin(0.5);
      if (r.example) {
        this.add
          .text(WIDTH / 2, y + 32, `例：${r.example}`, { fontFamily: fontStack(), fontSize: "16px", color: COLORS.sub })
          .setOrigin(0.5);
      }
      const stim = satisfy(r.predicate, rng);
      const card = buildStimulusContainer(this, stim, settings);
      card.setScale(0.55);
      card.setPosition(WIDTH / 2, y + 100);
    });

    makeButton(this, WIDTH / 2, HEIGHT - 64, "继续 ▶", () => this.scene.start("Game"), { w: 240, h: 54, fontSize: 24 });
  }
}
