/**
 * 键盘输入映射 (文档 §6.1 可访问性：键盘操作完整)。
 * 把按键名映射为游戏动作；纯函数，可单测。
 */
import type { Action } from "../rules/schema";

export function keyToAction(key: string): Action | null {
  switch (key) {
    case "ArrowLeft":
    case "a":
    case "A":
    case "左":
      return "LEFT";
    case "ArrowRight":
    case "d":
    case "D":
    case "右":
      return "RIGHT";
    case "ArrowDown":
    case " ":
    case "s":
    case "S":
    case "下":
      return "SKIP";
    default:
      return null;
  }
}

export const ACTION_HINT = "← / A 左      ↓ / 空格 跳过      → / D 右";
