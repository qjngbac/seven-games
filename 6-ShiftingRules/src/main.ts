import Phaser from "phaser";
import { WIDTH, HEIGHT } from "./game/ui/layout";
import { BootScene } from "./game/scenes/BootScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { RulePreviewScene } from "./game/scenes/RulePreviewScene";
import { GameScene } from "./game/scenes/GameScene";
import { RuleChangeScene } from "./game/scenes/RuleChangeScene";
import { ResultScene } from "./game/scenes/ResultScene";
import { SettingsScene } from "./game/scenes/SettingsScene";
import "./styles.css";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: "#14161f",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, RulePreviewScene, GameScene, RuleChangeScene, ResultScene, SettingsScene],
};

new Phaser.Game(config);
