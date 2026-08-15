/** 跨场景传递的「本局」上下文（存于 game.registry） */
export interface RunMeta {
  modeId: string;
  packId: string;
  seed: number;
  daily: boolean;
  seedKey: string;
}
