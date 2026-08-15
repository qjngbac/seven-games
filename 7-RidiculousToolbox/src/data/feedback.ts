import type { GenericFailureRule } from '../logic/feedback';

/**
 * 通用失败反馈规则表（文档 §6.4：无精确配方时按标签给出有意义反馈，而非统一「不能组合」）。
 * 规则按 tags 子集匹配，匹配标签越多越优先。
 */
export const GENERIC_FAILURE_RULES: GenericFailureRule[] = [
  { tags: ['liquid', 'electronic'], msg: '液体泼到电子设备上，一阵青烟伴随着焦糊味升起——这很贵。' },
  { tags: ['liquid', 'fire'], msg: '水浇上火，蒸汽「呲」地喷了你一脸，火势暂时小了点。' },
  { tags: ['cold', 'electronic'], msg: '冰冷的物体贴上电路，凝出的水珠顺着缝隙往下淌，你默默拿开。' },
  { tags: ['animal', 'electronic'], msg: '小动物对电子产品产生了浓厚兴趣，并开始用爪子拍打电源键。' },
  { tags: ['animal', 'food'], msg: '小动物迅速判定这是食物，并在你反应过来前解决了一半。' },
  { tags: ['animal', 'liquid'], msg: '小动物舔了一口液体，露出一种你读不懂但值得警惕的表情。' },
  { tags: ['adhesive', 'animal'], msg: '胶水粘住了毛发，小动物发出抗议，并记住了你的样子。' },
  { tags: ['container', 'liquid'], msg: '容器接住了液体，晃了晃，暂时盛住了——但这显然不是正解。' },
  { tags: ['cable', 'liquid'], msg: '线缆泡进液体里，你仿佛听见了保修条款在哭泣。' },
  { tags: ['paper', 'liquid'], msg: '纸张吸饱了水，字迹晕开成一团墨云。' },
  { tags: ['cardboard', 'liquid'], msg: '纸箱遇水变软塌成一团，完全失去了支撑力。' },
  { tags: ['fan', 'liquid'], msg: '风扇把液体吹得四处飞溅，你成功把问题扩散到了整个房间。' },
  { tags: ['cold', 'animal'], msg: '冰凉的东西贴上去，小动物猛地弹开，并决定与你保持距离。' },
  { tags: ['tool', 'animal'], msg: '工具对小动物毫无用处，它只是好奇你为什么要举着它。' },
  { tags: ['food', 'fire'], msg: '食物架在火上，香气四溢——可惜这关要的不是烧烤。' },
  { tags: ['adhesive', 'paper'], msg: '胶带把纸粘成了不可描述的形状，撕下来时纸也跟着牺牲了。' },
];
