import Phaser from "phaser";
import { loadSettings } from "../settings";
import { applyAudioSettings } from "../audio/sfx";

/** 启动场景：载入设置并初始化音频，随后进入主菜单。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create(): void {
    const s = loadSettings();
    applyAudioSettings(s.sfx, s.volume);
    this.scene.start("Menu");
  }
}
