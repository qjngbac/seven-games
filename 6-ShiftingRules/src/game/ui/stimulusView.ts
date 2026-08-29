/**
 * 刺激渲染 (文档 §7.1 视觉方向 + §5.2 可访问性)。
 * 把 Stimulus 画成一张「事实卡」：颜色、文字、数字、形状、角色、标记全部文字化列出，
 * 保证「颜色不是唯一判据」。色弱模式下额外用形状描边提示。
 * 仅依赖 Phaser，UI 层使用，不被规则层/测试引用。
 */
import Phaser from "phaser";
import type { Stimulus } from "../rules/schema";
import type { Settings } from "../settings";
import { colorValue, COLOR_LABEL, COLOR_SHAPE, SHAPE_LABEL, SHAPE_GLYPH, CHAR_LABEL } from "./palette";

const W = 400;
const H = 300;

export function fontStack(): string {
  return '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
}

function fontSize(settings: Settings, kind: "big" | "mid" | "small"): number {
  const k = settings.fontSize === "large" ? 1.25 : 1;
  return Math.round((kind === "big" ? 34 : kind === "mid" ? 20 : 14) * k);
}

export function buildStimulusContainer(scene: Phaser.Scene, stimulus: Stimulus, settings: Settings): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const bgColor = stimulus.color ? colorValue(stimulus.color, settings.colorblind) : 0x2a2f45;
  const g = scene.add.graphics();
  g.fillStyle(bgColor, 1);
  g.fillRoundedRect(-W / 2, -H / 2, W, H, 18);
  g.lineStyle(settings.colorblind ? 4 : 2, 0xffffff, settings.colorblind ? 0.85 : 0.35);
  g.strokeRoundedRect(-W / 2, -H / 2, W, H, 18);
  c.add(g);

  // 色弱模式：右上角用车标形状提示颜色
  if (settings.colorblind && stimulus.color) {
    const sg = scene.add.graphics();
    sg.lineStyle(3, 0x111111, 0.9);
    const cx = W / 2 - 26;
    const cy = -H / 2 + 24;
    const shape = COLOR_SHAPE[stimulus.color];
    sg.beginPath();
    if (shape === "circle") sg.strokeCircle(cx, cy, 10);
    else if (shape === "square") sg.strokeRect(cx - 10, cy - 10, 20, 20);
    else if (shape === "triangle") {
      sg.moveTo(cx, cy - 12);
      sg.lineTo(cx - 11, cy + 9);
      sg.lineTo(cx + 11, cy + 9);
      sg.closePath();
      sg.strokePath();
    } else if (shape === "cross") {
      sg.moveTo(cx - 10, cy);
      sg.lineTo(cx + 10, cy);
      sg.moveTo(cx, cy - 10);
      sg.lineTo(cx, cy + 10);
      sg.strokePath();
    } else {
      sg.strokeCircle(cx, cy, 10);
    }
    c.add(sg);
  }

  const dark = stimulus.color === "yellow";
  const textColor = dark ? "#1a1a1a" : "#ffffff";

  const lines: { text: string; kind: "big" | "mid" | "small" }[] = [];
  if (stimulus.color) lines.push({ text: `【颜色】${COLOR_LABEL[stimulus.color]}`, kind: "mid" });
  if (stimulus.word) lines.push({ text: stimulus.word, kind: "big" });
  if (stimulus.number !== undefined) lines.push({ text: `数字 ${stimulus.number}`, kind: stimulus.word ? "mid" : "big" });
  if (stimulus.shape) lines.push({ text: `形状 ${SHAPE_LABEL[stimulus.shape]} ${SHAPE_GLYPH[stimulus.shape]}`, kind: "mid" });
  if (stimulus.character) lines.push({ text: `角色 ${CHAR_LABEL[stimulus.character]}`, kind: "mid" });
  if (stimulus.flags && stimulus.flags.length) {
    lines.push({ text: "标记 " + stimulus.flags.map((f) => "·" + f).join(" "), kind: "small" });
  }

  // 垂直居中布局
  const totalH = lines.reduce((acc, l) => acc + fontSize(settings, l.kind) + 8, 0);
  let y = -totalH / 2 + 6;
  for (const l of lines) {
    const fs = fontSize(settings, l.kind);
    const t = scene.add.text(0, y + fs / 2, l.text, {
      fontFamily: fontStack(),
      fontSize: `${fs}px`,
      color: textColor,
      fontStyle: l.kind === "big" ? "bold" : "normal",
      align: "center",
    });
    t.setOrigin(0.5);
    c.add(t);
    y += fs + 8;
  }

  return c;
}
