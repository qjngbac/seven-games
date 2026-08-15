import type { ItemDefinition } from '../logic/schema';

/**
 * 全局物品类型池（文档 §3.1：类型与实例分离，标签含义固定）。
 * 关卡只引用 defId；同一物品可被多关复用。描述提示用途但不直接给答案。
 */
export const ITEM_DEFS: Record<string, ItemDefinition> = {
  fan: { id: 'fan', name: '电风扇', icon: '🌀', tags: ['fan', 'electronic'], description: '能制造气流，但自己不会凭空有电。' },
  tape: { id: 'tape', name: '胶带', icon: '🩹', tags: ['adhesive'], description: '粘性强，能把东西固定在一起。' },
  cable: { id: 'cable', name: '网线', icon: '🔌', tags: ['cable', 'electronic', 'conductive'], description: '导电的连接线，也能当临时工具使。' },
  box: { id: 'box', name: '纸箱', icon: '📦', tags: ['container', 'cardboard'], description: ' cardboard 材质，能当风道或罩子。' },
  icecream: { id: 'icecream', name: '冰淇淋', icon: '🍦', tags: ['cold', 'liquid', 'food', 'edible'], description: '冰凉，会融化，别靠近电器。' },
  cat: { id: 'cat', name: '猫', icon: '🐱', tags: ['animal', 'warm', 'alive'], description: '毛茸茸、有主见，对一切孔洞感兴趣。' },

  water: { id: 'water', name: '水', icon: '💧', tags: ['liquid', 'water'], description: '万能用处，但遇电器要谨慎。' },
  bucket: { id: 'bucket', name: '水桶', icon: '🪣', tags: ['container', 'water'], description: '能装水，也能扣东西。' },
  rope: { id: 'rope', name: '绳子', icon: '🪢', tags: ['rope', 'tool'], description: '柔韧，能绑、能吊、能拉。' },
  knife: { id: 'knife', name: '小刀', icon: '🔪', tags: ['tool', 'sharp'], description: '锋利，能切能撬。' },
  battery: { id: 'battery', name: '电池', icon: '🔋', tags: ['power', 'electronic'], description: '提供电力，小巧。' },
  bulb: { id: 'bulb', name: '灯泡', icon: '💡', tags: ['light', 'electronic'], description: '通电就亮。' },
  matches: { id: 'matches', name: '火柴', icon: '🔥', tags: ['fire', 'tool'], description: '一划就着火。' },
  candle: { id: 'candle', name: '蜡烛', icon: '🕯️', tags: ['light', 'fire'], description: '点燃后有火苗和光。' },
  stone: { id: 'stone', name: '石头', icon: '🪨', tags: ['heavy', 'tool'], description: '坚硬沉重，能砸。' },
  wood: { id: 'wood', name: '木棍', icon: '🪵', tags: ['wood', 'tool'], description: '细长，能捅能撑。' },
  cloth: { id: 'cloth', name: '布', icon: '🧵', tags: ['cloth', 'soft', 'absorb'], description: '柔软吸水，能擦能垫。' },
  paper: { id: 'paper', name: '纸', icon: '📄', tags: ['paper'], description: '轻薄，能塞缝、能折。' },
  key: { id: 'key', name: '钥匙', icon: '🔑', tags: ['key', 'tool', 'metal'], description: '开锁专用。' },
  screwdriver: { id: 'screwdriver', name: '螺丝刀', icon: '🪛', tags: ['tool', 'sharp', 'metal'], description: '能撬能拧。' },
  hammer: { id: 'hammer', name: '锤子', icon: '🔨', tags: ['tool', 'heavy', 'metal'], description: '砸东西专用。' },
  magnet: { id: 'magnet', name: '磁铁', icon: '🧲', tags: ['magnet', 'tool', 'metal'], description: '能吸金属。' },
  rubber: { id: 'rubber', name: '橡胶块', icon: '🟤', tags: ['adhesive', 'soft', 'rubber'], description: '有粘性，能临时封堵。' },
  balloon: { id: 'balloon', name: '气球', icon: '🎈', tags: ['light', 'rubber', 'soft'], description: '轻，能飘。' },
  glue: { id: 'glue', name: '胶水', icon: '🧴', tags: ['adhesive', 'liquid'], description: '粘东西，也是液体。' },
  bottle: { id: 'bottle', name: '瓶子', icon: '🍶', tags: ['container', 'glass'], description: '能罩能装，玻璃材质。' },
  phone: { id: 'phone', name: '手机', icon: '📱', tags: ['electronic', 'power'], description: '有电就有光，没电是砖。' },
  charger: { id: 'charger', name: '充电器', icon: '🔌', tags: ['power', 'electronic'], description: '给设备供电。' },
  plant: { id: 'plant', name: '植物', icon: '🪴', tags: ['plant', 'alive'], description: '绿油油，基本不参与修理。' },
  ant: { id: 'ant', name: '蚂蚁', icon: '🐜', tags: ['animal', 'small'], description: '小小的，爱甜食。' },
  sugar: { id: 'sugar', name: '糖', icon: '🍬', tags: ['food', 'sweet'], description: '甜，招蚂蚁。' },
  soap: { id: 'soap', name: '肥皂', icon: '🧼', tags: ['liquid', 'clean'], description: '滑，能润滑也能洗。' },
  towel: { id: 'towel', name: '毛巾', icon: '🧻', tags: ['cloth', 'soft', 'absorb'], description: '厚实吸水，能捂能擦。' },
  pipe_part: { id: 'pipe_part', name: '管件', icon: '🔩', tags: ['pipe', 'metal'], description: '替换水管段的金属件。' },
  pump: { id: 'pump', name: '打气筒', icon: '🎈', tags: ['tool', 'air'], description: '给轮胎、球之类充气。' },
  scissors: { id: 'scissors', name: '剪刀', icon: '✂️', tags: ['tool', 'sharp'], description: '能剪能裁。' },
  ladder: { id: 'ladder', name: '梯子', icon: '🪜', tags: ['tool', 'tall'], description: '够高处。' },
  glove: { id: 'glove', name: '手套', icon: '🧤', tags: ['cloth', 'protect'], description: '增加抓力，护手。' },
  coin: { id: 'coin', name: '硬币', icon: '🪙', tags: ['metal', 'small'], description: '小金属片，能塞缝。' },
  sock: { id: 'sock', name: '袜子', icon: '🧦', tags: ['cloth', 'soft'], description: '软绵绵，能塞能垫。' },
};

export function getItemDef(id: string): ItemDefinition {
  const d = ITEM_DEFS[id];
  if (!d) throw new Error(`未知物品定义: ${id}`);
  return d;
}

/**
 * 标签 → 中文展示名。图鉴在缺少精确物品名时，用标签拼出可读标题（如「冰 × 动物」）。
 * 仅用于展示，不影响匹配逻辑。
 */
export const TAG_LABELS: Record<string, string> = {
  absorb: '吸水物',
  adhesive: '粘性物',
  air: '打气',
  animal: '动物',
  cable: '线缆',
  clean: '清洁物',
  cloth: '布料',
  cold: '冰淇淋',
  container: '容器',
  electronic: '电器',
  fan: '风扇',
  fire: '火源',
  heavy: '重物',
  key: '钥匙',
  light: '光源',
  liquid: '液体',
  magnet: '磁铁',
  metal: '金属',
  paper: '纸张',
  pipe: '管件',
  power: '电源',
  protect: '护具',
  rope: '绳子',
  rubber: '橡胶',
  sharp: '利器',
  wood: '木棍',
};

/** 物品展示名（优先用实例覆盖名） */
export function instanceName(inst: { defId: string; name?: string }): string {
  const d = ITEM_DEFS[inst.defId];
  if (!d) return inst.defId;
  return inst.name ?? d.name;
}
