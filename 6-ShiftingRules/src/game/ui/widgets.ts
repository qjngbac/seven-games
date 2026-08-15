/**
 * 通用 UI 控件 (文档 §10.1：按钮有悬停/按下/禁用状态)。
 * 仅 Phaser/UI 层使用。
 */
import Phaser from "phaser";
import { fontStack } from "./stimulusView";
import { sfx } from "../audio/sfx";

export interface ButtonOpts {
  w?: number;
  h?: number;
  fill?: number;
  fillHover?: number;
  fillPress?: number;
  disabled?: boolean;
  fontSize?: number;
  textColor?: string;
}

export interface Button {
  container: Phaser.GameObjects.Container;
  setLabel: (s: string) => void;
  setEnabled: (b: boolean) => void;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {},
): Button {
  const w = opts.w ?? 260;
  const h = opts.h ?? 52;
  const fill = opts.fill ?? 0x3a6df0;
  const fillHover = opts.fillHover ?? 0x5a86ff;
  const fillPress = opts.fillPress ?? 0x2a55c0;

  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const draw = (color: number, alpha = 1) => {
    bg.clear();
    bg.fillStyle(color, alpha);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    bg.lineStyle(2, 0xffffff, 0.22);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  };
  draw(fill);

  const t = scene.add
    .text(0, 0, label, {
      fontFamily: fontStack(),
      fontSize: `${opts.fontSize ?? 22}px`,
      color: opts.textColor ?? "#ffffff",
    })
    .setOrigin(0.5);
  c.add([bg, t]);
  c.setSize(w, h);

  let enabled = !opts.disabled;
  const refresh = () => {
    if (enabled) {
      draw(fill);
      t.setColor("#ffffff");
      c.setAlpha(1);
    } else {
      draw(0x555a66, 0.6);
      t.setColor("#aab");
      c.setAlpha(0.7);
    }
  };
  refresh();

  if (enabled) {
    c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c.on("pointerover", () => {
      if (enabled) {
        draw(fillHover);
        scene.input.setDefaultCursor("pointer");
      }
    });
    c.on("pointerout", () => {
      if (enabled) {
        draw(fill);
        scene.input.setDefaultCursor("default");
      }
    });
    c.on("pointerdown", () => {
      if (enabled) draw(fillPress);
    });
    c.on("pointerup", () => {
      if (!enabled) return;
      draw(fillHover);
      sfx.click();
      onClick();
    });
  }

  return {
    container: c,
    setLabel: (s: string) => t.setText(s),
    setEnabled: (b: boolean) => {
      enabled = b;
      refresh();
      if (b && !c.input) {
        c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
      }
    },
  };
}

/** 简单居中标题文本 */
export function makeTitle(scene: Phaser.Scene, x: number, y: number, text: string, size = 40, color = "#ffffff"): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, { fontFamily: fontStack(), fontSize: `${size}px`, color, fontStyle: "bold" })
    .setOrigin(0.5);
}
