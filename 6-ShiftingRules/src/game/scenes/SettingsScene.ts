import Phaser from "phaser";
import { WIDTH, HEIGHT, COLORS } from "../ui/layout";
import { makeButton, makeTitle, type Button } from "../ui/widgets";
import { fontStack } from "../ui/stimulusView";
import { loadSettings, updateSettings, type Settings } from "../settings";
import { applyAudioSettings, sfx } from "../audio/sfx";

/** 设置场景：可访问性（色弱/字体）、反馈（抖动/音效/音量），事务式保存。 */
export class SettingsScene extends Phaser.Scene {
  private cbBtn!: Button;
  private shakeBtn!: Button;
  private sfxBtn!: Button;
  private fontBtn!: Button;
  private volBtn!: Button;

  constructor() {
    super("Settings");
  }

  create(): void {
    this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.bg).setOrigin(0);
    makeTitle(this, WIDTH / 2, 56, "设置", 36);

    const s = loadSettings();
    const rowY = [150, 220, 290, 360, 430];
    this.add.text(180, rowY[0], "色弱模式（颜色附文字/形状提示）", this.labelStyle()).setOrigin(0, 0.5);
    this.add.text(180, rowY[1], "屏幕抖动（答错时）", this.labelStyle()).setOrigin(0, 0.5);
    this.add.text(180, rowY[2], "音效", this.labelStyle()).setOrigin(0, 0.5);
    this.add.text(180, rowY[3], "字体大小", this.labelStyle()).setOrigin(0, 0.5);
    this.add.text(180, rowY[4], "音量", this.labelStyle()).setOrigin(0, 0.5);

    this.cbBtn = makeButton(this, 700, rowY[0], this.onOff(s.colorblind), () => this.toggle("colorblind"), { w: 160, h: 44, fontSize: 18 });
    this.shakeBtn = makeButton(this, 700, rowY[1], this.onOff(s.shake), () => this.toggle("shake"), { w: 160, h: 44, fontSize: 18 });
    this.sfxBtn = makeButton(this, 700, rowY[2], this.onOff(s.sfx), () => this.toggle("sfx"), { w: 160, h: 44, fontSize: 18 });
    this.fontBtn = makeButton(this, 700, rowY[3], s.fontSize === "large" ? "大" : "正常", () => this.toggleFont(), { w: 160, h: 44, fontSize: 18 });
    this.volBtn = makeButton(this, 700, rowY[4], this.volLabel(s.volume), () => {}, { w: 160, h: 44, fontSize: 18 });
    this.volBtn.container.disableInteractive?.();
    // 音量用两个小按钮
    makeButton(this, 600, rowY[4], "－", () => this.vol(-0.1), { w: 44, h: 44, fontSize: 22, fill: 0x4b5168 });
    makeButton(this, 800, rowY[4], "＋", () => this.vol(0.1), { w: 44, h: 44, fontSize: 22, fill: 0x4b5168 });

    makeButton(this, WIDTH / 2, HEIGHT - 70, "返回菜单", () => this.scene.start("Menu"), { w: 220, h: 52, fontSize: 22 });

    this.add
      .text(WIDTH / 2, HEIGHT - 130, "提示：色弱模式下颜色总会配文字与形状，绝不只靠颜色判断。", {
        fontFamily: fontStack(),
        fontSize: "14px",
        color: COLORS.sub,
      })
      .setOrigin(0.5);
  }

  private labelStyle() {
    return { fontFamily: fontStack(), fontSize: "18px", color: COLORS.text };
  }
  private onOff(b: boolean): string {
    return b ? "开" : "关";
  }
  private volLabel(v: number): string {
    return `${Math.round(v * 100)}%`;
  }

  private toggle(key: "colorblind" | "shake" | "sfx"): void {
    const s = loadSettings();
    const next = !s[key];
    updateSettings({ [key]: next } as Partial<Settings>);
    if (key === "sfx") applyAudioSettings(next, s.volume);
    this.refresh();
  }
  private toggleFont(): void {
    const s = loadSettings();
    updateSettings({ fontSize: s.fontSize === "large" ? "normal" : "large" });
    this.refresh();
  }
  private vol(delta: number): void {
    const s = loadSettings();
    const v = Math.max(0, Math.min(1, Math.round((s.volume + delta) * 10) / 10));
    updateSettings({ volume: v });
    applyAudioSettings(s.sfx, v);
    sfx.ensure();
    sfx.click();
    this.refresh();
  }
  private refresh(): void {
    const s = loadSettings();
    this.cbBtn.setLabel(this.onOff(s.colorblind));
    this.shakeBtn.setLabel(this.onOff(s.shake));
    this.sfxBtn.setLabel(this.onOff(s.sfx));
    this.fontBtn.setLabel(s.fontSize === "large" ? "大" : "正常");
    this.volBtn.setLabel(this.volLabel(s.volume));
  }
}
