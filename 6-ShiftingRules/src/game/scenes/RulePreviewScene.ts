import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { makeButton, makeTitle } from "../ui/widgets";
import { fontStack } from "../ui/stimulusView";
import { GameSession } from "../session";
import { MODES } from "../modes/types";
import type { RunMeta } from "../ui/runMeta";
import { sfx } from "../audio/sfx";

/** 规则预览：展示当前生效规则与示例，确认后进入游戏（文档 §4 RULE_PREVIEW）。 */
export class RulePreviewScene extends Phaser.Scene {
  constructor() {
    super("RulePreview");
  }

  create(): void {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    const session = this.registry.get("session") as GameSession;
    const meta = this.registry.get("meta") as RunMeta;
    if (!session) {
      this.scene.start("Menu");
      return;
    }
    makeTitle(this, WIDTH / 2, 54, "当前规则", 34);
    this.add
      .text(WIDTH / 2, 92, "优先级数字越大，越晚生效、越能覆盖前面的规则", {
        fontFamily: fontStack(),
        fontSize: "15px",
        color: COLORS.sub,
      })
      .setOrigin(0.5);

    const rules = session.getActiveRules();
    const startY = 138;
    const rowH = 44;
    rules.forEach((r, i) => {
      const y = startY + i * rowH;
      const panel = this.add.graphics();
      panel.fillStyle(COLORS.panel, 1);
      panel.fillRoundedRect(WIDTH / 2 - 370, y - 17, 740, 34, 8);
      panel.lineStyle(1, COLORS.panelLine, 1);
      panel.strokeRoundedRect(WIDTH / 2 - 370, y - 17, 740, 34, 8);
      this.add
        .text(WIDTH / 2 - 354, y, `【${r.priority}】${r.text}`, { fontFamily: fontStack(), fontSize: "18px", color: COLORS.text })
        .setOrigin(0, 0.5);
      if (r.example) {
        this.add
          .text(WIDTH / 2 + 60, y, `例：${r.example}`, { fontFamily: fontStack(), fontSize: "14px", color: COLORS.sub })
          .setOrigin(0, 0.5);
      }
    });

    const mode = MODES[meta.modeId as keyof typeof MODES];
    if (mode?.enableDynamicRules && session.ruleset.rules.length > rules.length) {
      this.add
        .text(WIDTH / 2, HEIGHT - 150, "⚠ 规则会随关卡逐步增加，留意「规则变化」提示", {
          fontFamily: fontStack(),
          fontSize: "16px",
          color: "#ffd666",
        })
        .setOrigin(0.5);
    }

    makeButton(this, WIDTH / 2 - 110, HEIGHT - 70, "开始游戏 ▶", () => {
      sfx.ensure();
      this.scene.start("Game");
    }, { w: 240, h: 54, fontSize: 24 });
    makeButton(this, WIDTH / 2 + 130, HEIGHT - 70, "返回", () => this.scene.start("Menu"), { w: 160, h: 54, fontSize: 20, fill: 0x4b5168 });
  }
}
