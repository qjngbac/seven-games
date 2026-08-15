// 世界定义：核心资源、角色关系、开局特质。属"内容配置"，与规则代码分离。
import type { ContentPack, RelationDef, ResourceDef } from "../core/types";

export const RESOURCES: ResourceDef[] = [
  {
    key: "money",
    name: "金钱",
    icon: "💰",
    min: 0,
    max: 100,
    start: 50,
    bands: [20, 40, 60],
    failAt: 0, // 跌破 0 -> 破产
  },
  {
    key: "reputation",
    name: "声誉",
    icon: "⭐",
    min: 0,
    max: 100,
    start: 50,
    bands: [20, 40, 60],
    failAt: 0, // 跌破 0 -> 被优化
  },
  {
    key: "spirit",
    name: "精神",
    icon: "🧠",
    min: 0,
    max: 100,
    start: 50,
    bands: [20, 40, 60],
    failAt: 0, // 跌破 0 -> 精神崩溃
  },
  {
    key: "techDebt",
    name: "技术债",
    icon: "💣",
    min: 0,
    max: 100,
    start: 10,
    invert: true, // 越高越糟
    bands: [30, 60, 90],
    failAt: 100, // 突破 100 -> 技术债爆雷
  },
];

export const RELATIONS: RelationDef[] = [
  { id: "boss", name: "老板", icon: "👔" },
  { id: "client", name: "客户", icon: "🧑‍💼" },
  { id: "team", name: "同事", icon: "🧑‍🤝‍🧑" },
  { id: "ops", name: "运维", icon: "🛠️" },
];

export const TRAITS: ContentPack["traits"] = [
  {
    id: "veteran",
    name: "老油条",
    desc: "职场十年，金钱 +10，精神 -5。",
    effects: [
      { type: "resource", target: "money", value: 10 },
      { type: "resource", target: "spirit", value: -5 },
    ],
  },
  {
    id: "rookie",
    name: "职场萌新",
    desc: "满怀干劲，精神 +10，声誉 -5。",
    effects: [
      { type: "resource", target: "spirit", value: 10 },
      { type: "resource", target: "reputation", value: -5 },
    ],
  },
  {
    id: "firefighter",
    name: "救火队员",
    desc: "专治疑难杂症，技术债 -10，金钱 -5。",
    effects: [
      { type: "resource", target: "techDebt", value: -10 },
      { type: "resource", target: "money", value: -5 },
    ],
  },
  {
    id: "luckydog",
    name: "天选打工人",
    desc: "锦鲤附体，声誉 +10，金钱 -5。",
    effects: [
      { type: "resource", target: "reputation", value: 10 },
      { type: "resource", target: "money", value: -5 },
    ],
  },
];

export function buildContent(events: ContentPack["events"]): ContentPack {
  return { resources: RESOURCES, relations: RELATIONS, events, traits: TRAITS };
}
