import type { ItemInstance, Level } from '../logic/schema';

const it = (defId: string): ItemInstance => ({ instanceId: '', defId, state: {}, quantity: 1 });

const PRO = { professional: 2, safety: 2, comedy: 0, cost: 1 };
const TMP = { professional: 1, safety: 1, comedy: 1, cost: 1 };
const ABS = { professional: 0, safety: 0, comedy: 3, cost: 1 };

export const LEVELS: Level[] = [
  // ===================== 第一章 =====================
  // ---------- L1 服务器过热 ----------
  {
    id: 'l1',
    chapter: 1,
    title: '服务器过热',
    brief: '机房空调罢工，服务器烫得能煎蛋。备件还要两小时才到，你得先让它撑住。',
    goalText: '让服务器温度降到安全范围，并保持散热。',
    items: [it('fan'), it('tape'), it('cable'), it('box'), it('icecream'), it('cat')],
    targets: [
      { id: 'server', name: '服务器', icon: '🖥️', tags: ['server', 'electronic'], description: '进风口堵着灰，风扇位空着。', initial: { temp: 'high', intakeBlocked: true, coolingActive: false, damaged: false } },
      { id: 'outlet', name: '电源插座', icon: '🔌', tags: ['power'], description: '有电。', initial: { powered: true } },
    ],
    initialFlags: { power_available: true },
    recipes: [
      { recipeId: 'l1_wire_fan', kind: 'combine', inputs: [{ tag: 'fan' }, { tag: 'cable', consumed: false }], conditions: [{ flag: { key: 'power_available', equals: true } }], outputs: [{ addItem: { defId: 'fan', state: { wired: true }, name: '接好线的风扇' } }], feedback: '你接好线，风扇呼呼转起来了。', priority: 8, category: 'neutral' },
      { recipeId: 'l1_pro', kind: 'use', inputs: [{ tag: 'fan', requireState: { wired: true } }], target: { id: 'server' }, outputs: [{ setScene: { targetId: 'server', state: { temp: 'low', coolingActive: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '备用风扇稳稳吹出冷风，服务器温度降到安全线。专业！', priority: 10, category: 'solution' },
      { recipeId: 'l1_tape_fan', kind: 'combine', inputs: [{ tag: 'fan' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'fan', state: { taped: true }, name: '胶带导风风扇' } }], feedback: '胶带把风扇捆成导风筒，丑但能用。', priority: 8, category: 'neutral' },
      { recipeId: 'l1_temp', kind: 'use', inputs: [{ tag: 'fan', requireState: { taped: true } }], target: { id: 'server' }, outputs: [{ setScene: { targetId: 'server', state: { temp: 'medium', coolingActive: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '临时导风把热量勉强带走，温度压在警戒线。凑合过关。', priority: 10, category: 'solution' },
      { recipeId: 'l1_duct', kind: 'combine', inputs: [{ tag: 'container' }, { tag: 'fan' }], outputs: [{ addItem: { defId: 'fan', state: { duct: true }, name: '纸箱风道风扇' } }], feedback: '纸箱裁成风道接上风扇，离谱但成形了。', priority: 8, category: 'neutral' },
      { recipeId: 'l1_absurd', kind: 'use', inputs: [{ tag: 'fan', requireState: { duct: true } }], target: { id: 'server' }, outputs: [{ setScene: { targetId: 'server', state: { temp: 'medium', coolingActive: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '纸箱风道呼哧呼哧把热气引走，服务器表示勉强活命。离谱但有效！', priority: 10, category: 'solution' },
      { recipeId: 'l1_intake', kind: 'use', inputs: [{ tag: 'cable', consumed: false }], target: { id: 'server' }, outputs: [{ setScene: { targetId: 'server', state: { intakeBlocked: false } } }], feedback: '你用网线捅了捅进风口，灰尘飞扬。', priority: 5, category: 'neutral' },
      { recipeId: 'l1_f_ice_server', kind: 'use', inputs: [{ tag: 'cold' }], target: { id: 'server' }, outputs: [{ setScene: { targetId: 'server', state: { damaged: true } }, setFlag: { key: 'liquidDamage', value: true } }], feedback: '冰淇淋贴上去温度骤降——然后化成一滩水渗进主板，液体损坏！', galleryNote: '冰淇淋降温法：物理降温一时爽，主板进水火葬场。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_cat_server', kind: 'use', inputs: [{ tag: 'animal' }], target: { id: 'server' }, outputs: [{ setScene: { targetId: 'server', state: { catBlocked: true } } }], feedback: '猫舒服地趴在出风口挡住了风，还打了个哈欠。', galleryNote: '猫体散热阻挡术。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_cat_fan', kind: 'combine', inputs: [{ tag: 'animal' }, { tag: 'fan' }], feedback: '猫追着风扇叶片转圈，风扇被拍停了。', galleryNote: '猫风扇永动机（反向）。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_ice_fan', kind: 'combine', inputs: [{ tag: 'cold' }, { tag: 'fan' }], feedback: '风扇把冰淇淋吹化，地上甩出一地奶油。', galleryNote: '冰淇淋风力扩散实验。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_box_cat', kind: 'combine', inputs: [{ tag: 'container' }, { tag: 'animal' }], feedback: '猫钻进纸箱睡着了，箱子轻轻起伏。', galleryNote: '猫箱量子睡眠。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_cable_tape', kind: 'combine', inputs: [{ tag: 'cable', consumed: false }, { tag: 'adhesive' }], feedback: '你把自己缠成了木乃伊，胶带很满意。', galleryNote: '自助捆绑体验。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_ice_box', kind: 'combine', inputs: [{ tag: 'cold' }, { tag: 'container' }], feedback: '冰淇淋在纸箱里化了一滩，纸箱软成一摊。', galleryNote: '纸箱承重（负）测试。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_tape_cat', kind: 'combine', inputs: [{ tag: 'adhesive' }, { tag: 'animal' }], feedback: '猫被胶带粘住爪子，愤怒地盯着你。', galleryNote: '猫胶行为艺术。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_ice_cat', kind: 'combine', inputs: [{ tag: 'cold' }, { tag: 'animal' }], feedback: '猫闻了闻冰淇淋，拒绝配合这离谱料理。', galleryNote: '猫的味觉底线。', priority: 5, category: 'failure' },
      { recipeId: 'l1_f_cat_outlet', kind: 'use', inputs: [{ tag: 'animal' }], target: { id: 'outlet' }, feedback: '猫对插座产生浓厚兴趣，被你及时抱走。', galleryNote: '插座诱猫事件。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l1_s_pro', tier: 'professional', predicate: { and: [{ target: 'server', state: { temp: 'low', coolingActive: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '你用备用风扇做了专业散热，运维赶来时服务器稳如老狗。' },
      { id: 'l1_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'server', state: { temp: 'medium', coolingActive: true } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '胶带导风救场，虽然丑，但服务器没宕机。' },
      { id: 'l1_s_abs', tier: 'absurd', predicate: { and: [{ target: 'server', state: { temp: 'medium', coolingActive: true } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '纸箱风道闻名机房，你被同事称为「风道仙人」。' },
    ],
  },

  // ---------- L2 漏水水管 ----------
  {
    id: 'l2',
    chapter: 1,
    title: '漏水水管',
    brief: '洗手间水管爆了，水漫金山。关总阀要等物业，你先想办法止住漏点。',
    goalText: '让水管不再漏水（专业修复最佳，临时/离谱也行）。',
    items: [it('pipe_part'), it('tape'), it('cloth'), it('bucket'), it('rubber'), it('rope')],
    targets: [
      { id: 'pipe', name: '破裂水管', icon: '💥', tags: ['pipe', 'metal'], description: '接口处裂了道缝，滋滋冒水。', initial: { leak: true, fixed: false } },
    ],
    recipes: [
      { recipeId: 'l2_pro', kind: 'use', inputs: [{ tag: 'pipe' }], target: { id: 'pipe' }, outputs: [{ setScene: { targetId: 'pipe', state: { leak: false, fixed: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '你换上新的管件，接口严丝合缝，彻底修好。', priority: 10, category: 'solution' },
      { recipeId: 'l2_patch', kind: 'combine', inputs: [{ tag: 'adhesive' }, { tag: 'cloth' }], outputs: [{ addItem: { defId: 'cloth', state: { patched: true }, name: '胶带补片' } }], feedback: '胶带把布条缠成补片。', priority: 8, category: 'neutral' },
      { recipeId: 'l2_temp', kind: 'use', inputs: [{ tag: 'cloth', requireState: { patched: true } }], target: { id: 'pipe' }, outputs: [{ setScene: { targetId: 'pipe', state: { leak: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '补片压住漏点，水不喷了——但愿撑到物业来。', priority: 10, category: 'solution' },
      { recipeId: 'l2_shield', kind: 'combine', inputs: [{ tag: 'container' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'bucket', state: { shielded: true }, name: '接水护盾' } }], feedback: '胶带把水桶改造成接水护盾。', priority: 8, category: 'neutral' },
      { recipeId: 'l2_absurd', kind: 'use', inputs: [{ tag: 'container', requireState: { shielded: true } }], target: { id: 'pipe' }, outputs: [{ setScene: { targetId: 'pipe', state: { leak: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '护盾罩住漏点接住所有水，地不淹了，就是有点费桶。', priority: 10, category: 'solution' },
      { recipeId: 'l2_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'pipe' }, feedback: '你往漏点浇水，水流更大了。', galleryNote: '以毒攻毒（水）失败。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_rope_cloth', kind: 'combine', inputs: [{ tag: 'rope' }, { tag: 'cloth' }], feedback: '布条绑在绳上，像面小旗子，修管子毫无帮助。', galleryNote: '自制拖把（未投入使用）。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'pipe' }, feedback: '你敲了敲管子，咚咚响，漏得更欢了。', galleryNote: '敲击催漏法。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_tape_rope', kind: 'combine', inputs: [{ tag: 'adhesive' }, { tag: 'rope' }], feedback: '胶带缠绳子，做出了奇怪的绷带。', galleryNote: '绳式绷带。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_bucket', kind: 'use', inputs: [{ tag: 'container' }], target: { id: 'pipe' }, feedback: '水桶扣在漏点上，水从缝里喷出来溅你一脸。', galleryNote: '倒扣接水灾难。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_pipe_tape', kind: 'combine', inputs: [{ tag: 'pipe' }, { tag: 'adhesive' }], feedback: '管件和胶带粘一起，更装不回去了。', galleryNote: '管胶一体化（负面）。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_rubber', kind: 'use', inputs: [{ tag: 'rubber' }], target: { id: 'pipe' }, feedback: '橡胶堵一下，又被水压冲飞。', galleryNote: '橡胶栓塞弹射。', priority: 5, category: 'failure' },
      { recipeId: 'l2_f_cloth_water', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'liquid' }], feedback: '湿布，能擦地但修不了管。', galleryNote: '湿布的非管途。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l2_s_pro', tier: 'professional', predicate: { and: [{ target: 'pipe', state: { leak: false, fixed: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '专业换件，滴水不漏，物业来了都挑不出毛病。' },
      { id: 'l2_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'pipe', state: { leak: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '补片顶住了，临时方案也是方案。' },
      { id: 'l2_s_abs', tier: 'absurd', predicate: { and: [{ target: 'pipe', state: { leak: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '护盾接水法问世，地板上演小型水族馆。' },
    ],
  },

  // ---------- L9 遥控器没电 ----------
  {
    id: 'l9',
    chapter: 1,
    title: '遥控器没电',
    brief: '电视遥控没电了，节目正到精彩处。你翻出几样东西，让它能再撑一会儿。',
    goalText: '让遥控器恢复供电（别搞坏）。',
    items: [it('battery'), it('coin'), it('charger'), it('candle'), it('magnet'), it('cloth'), it('tape'), it('soap')],
    targets: [
      { id: 'remote', name: '遥控器', icon: '📱', tags: ['remote', 'electronic'], description: '电池仓盖紧闭，灯不亮。', initial: { dead: true, opened: false, powered: false } },
    ],
    recipes: [
      { recipeId: 'l9_open', kind: 'use', inputs: [{ tag: 'metal' }], target: { id: 'remote' }, outputs: [{ setScene: { targetId: 'remote', state: { opened: true } } }], feedback: '硬币撬开电池仓盖。', priority: 8, category: 'neutral' },
      { recipeId: 'l9_pro', kind: 'use', inputs: [{ item: 'battery' }], target: { id: 'remote' }, conditions: [{ targetState: { targetId: 'remote', state: { opened: true } } }], outputs: [{ setScene: { targetId: 'remote', state: { powered: true, dead: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '装入新电池，遥控器灯亮了。专业换电。', priority: 10, category: 'solution' },
      { recipeId: 'l9_temp', kind: 'use', inputs: [{ item: 'charger' }], target: { id: 'remote' }, conditions: [{ targetState: { targetId: 'remote', state: { opened: true } } }], outputs: [{ setScene: { targetId: 'remote', state: { powered: true, dead: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '充电器接进电池仓强行供电，灯亮了。临时电源。', priority: 10, category: 'solution' },
      { recipeId: 'l9_absurd', kind: 'use', inputs: [{ tag: 'magnet' }], target: { id: 'remote' }, outputs: [{ setScene: { targetId: 'remote', state: { powered: true, dead: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '磁铁在遥控器上晃了晃，疑似把接触点吸复位了，灯居然亮了。离谱但有效！', priority: 10, category: 'solution' },
      { recipeId: 'l9_f_coin_tape', kind: 'combine', inputs: [{ tag: 'metal' }, { tag: 'adhesive' }], feedback: '硬币被胶带粘住，拔不下来了。', galleryNote: '硬币封印（胶带版）。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_battery_water', kind: 'combine', inputs: [{ tag: 'power' }, { tag: 'liquid' }], feedback: '电池泡水，短路冒烟。', galleryNote: '泡水电池。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_candle', kind: 'use', inputs: [{ tag: 'fire' }], target: { id: 'remote' }, feedback: '蜡烛烤遥控器，后盖鼓了。', galleryNote: '烤遥控器。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_cloth', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'remote' }, feedback: '布擦遥控器，按键更脏了。', galleryNote: '擦遥控。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'remote' }, feedback: '肥皂涂遥控器，滑得拿不住。', galleryNote: '滑遥控。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_tape', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'remote' }, feedback: '胶带粘住遥控器按键，按不动了。', galleryNote: '胶键遥控。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_magnet_water', kind: 'combine', inputs: [{ tag: 'magnet' }, { tag: 'liquid' }], feedback: '磁铁泡水，锈了。', galleryNote: '锈磁铁。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_charger_batt', kind: 'combine', inputs: [{ tag: 'power', item: 'charger' }, { tag: 'power' }], feedback: '充电器和电池接反，冒火花。', galleryNote: '反接火花。', priority: 5, category: 'failure' },
      { recipeId: 'l9_f_battery_tape', kind: 'combine', inputs: [{ tag: 'power', item: 'battery' }, { tag: 'adhesive' }], feedback: '电池被胶带缠住。', galleryNote: '缠胶电池。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l9_s_pro', tier: 'professional', predicate: { and: [{ target: 'remote', state: { powered: true, dead: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '新电池一装，遥控满血复活，精彩节目没错过。' },
      { id: 'l9_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'remote', state: { powered: true, dead: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '充电器续命，节目看完再换电池。' },
      { id: 'l9_s_abs', tier: 'absurd', predicate: { and: [{ target: 'remote', state: { powered: true, dead: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '磁铁晃出了电，物理老师表示无法解释。' },
    ],
  },

  // ---------- L10 水龙头滴水 ----------
  {
    id: 'l10',
    chapter: 1,
    title: '水龙头滴水',
    brief: '水龙头关不紧，滴答滴答漏水。找点东西先止住，别把水龙头弄坏。',
    goalText: '让水龙头不再滴水（保持可用）。',
    items: [it('tape'), it('cloth'), it('rubber'), it('screwdriver'), it('rope'), it('glue'), it('water'), it('soap')],
    targets: [
      { id: 'faucet', name: '水龙头', icon: '🚰', tags: ['faucet', 'metal'], description: '把手松，关不严。', initial: { dripping: true, tightened: false, fixed: false } },
    ],
    recipes: [
      { recipeId: 'l10_wrap', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'cloth', state: { wrapped: true }, name: '缠胶布条' } }], feedback: '胶带把布条缠成补片。', priority: 8, category: 'neutral' },
      { recipeId: 'l10_pro', kind: 'use', inputs: [{ item: 'screwdriver' }], target: { id: 'faucet' }, outputs: [{ setScene: { targetId: 'faucet', state: { tightened: true, dripping: false, fixed: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '螺丝刀拧紧把手，滴水停了。专业。', priority: 10, category: 'solution' },
      { recipeId: 'l10_temp', kind: 'use', inputs: [{ tag: 'cloth', requireState: { wrapped: true } }], target: { id: 'faucet' }, outputs: [{ setScene: { targetId: 'faucet', state: { dripping: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '缠胶布条压住漏点，水不滴了。临时。', priority: 10, category: 'solution' },
      { recipeId: 'l10_absurd', kind: 'use', inputs: [{ tag: 'rubber' }], target: { id: 'faucet' }, outputs: [{ setScene: { targetId: 'faucet', state: { dripping: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '橡胶块塞住出水口，水不漏了，就是有点丑。离谱。', priority: 10, category: 'solution' },
      { recipeId: 'l10_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'faucet' }, feedback: '浇水让滴水更欢。', galleryNote: '以滴攻滴。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_rope', kind: 'use', inputs: [{ tag: 'rope' }], target: { id: 'faucet' }, feedback: '绳子缠水龙头，没用。', galleryNote: '绳龙头。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'faucet' }, feedback: '肥皂涂龙头，滑溜。', galleryNote: '滑龙头。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_glue', kind: 'use', inputs: [{ item: 'glue' }], target: { id: 'faucet' }, feedback: '胶水堵住出水口，也堵死了龙头。', galleryNote: '胶死龙头。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_screw_water', kind: 'combine', inputs: [{ item: 'screwdriver' }, { tag: 'liquid' }], feedback: '螺丝刀泡水生锈。', galleryNote: '泡水螺丝刀。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_rubber_water', kind: 'combine', inputs: [{ tag: 'rubber' }, { tag: 'liquid' }], feedback: '橡胶泡水。', galleryNote: '泡水橡胶。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_tape_water', kind: 'combine', inputs: [{ tag: 'adhesive' }, { tag: 'liquid' }], feedback: '胶带遇水不粘了。', galleryNote: '湿胶带。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_rope_tape', kind: 'combine', inputs: [{ tag: 'rope' }, { tag: 'adhesive' }], feedback: '绳缠胶带，没用。', galleryNote: '绳胶。', priority: 5, category: 'failure' },
      { recipeId: 'l10_f_cloth_glue', kind: 'combine', inputs: [{ tag: 'cloth' }, { item: 'glue' }], feedback: '布沾胶水，黏一团。', galleryNote: '胶布团。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l10_s_pro', tier: 'professional', predicate: { and: [{ target: 'faucet', state: { dripping: false, tightened: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '拧紧把手，滴水彻底止住，龙头完好。' },
      { id: 'l10_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'faucet', state: { dripping: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '布条压住漏点，等师傅来换垫圈。' },
      { id: 'l10_s_abs', tier: 'absurd', predicate: { and: [{ target: 'faucet', state: { dripping: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '橡胶塞出水口，离谱但真不漏了。' },
    ],
  },

  // ===================== 第二章 =====================
  // ---------- L3 门锁坏了 ----------
  {
    id: 'l3',
    chapter: 2,
    title: '门锁坏了',
    brief: '你忘带门卡，门锁还卡死了。房东两小时后来，你得先进屋拿钥匙备份。',
    goalText: '打开门（别把门搞坏）。',
    items: [it('key'), it('screwdriver'), it('paper'), it('coin'), it('hammer'), it('magnet'), it('rope'), it('glue')],
    targets: [
      { id: 'door', name: '防盗门', icon: '🚪', tags: ['door', 'metal'], description: '锁芯卡住，门把手松动。', initial: { locked: true, opened: false, damaged: false } },
    ],
    recipes: [
      { recipeId: 'l3_pro', kind: 'use', inputs: [{ tag: 'key' }], target: { id: 'door' }, outputs: [{ setScene: { targetId: 'door', state: { opened: true, locked: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '原来你兜里就有钥匙，一拧就开。专业（且幸运）。', priority: 10, category: 'solution' },
      { recipeId: 'l3_temp', kind: 'use', inputs: [{ tag: 'paper' }], target: { id: 'door' }, outputs: [{ setScene: { targetId: 'door', state: { opened: true, locked: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '纸片插进门缝一挑，锁舌缩回——临时技术开锁。', priority: 10, category: 'solution' },
      { recipeId: 'l3_mag_rope', kind: 'combine', inputs: [{ tag: 'magnet' }, { tag: 'rope' }], outputs: [{ addItem: { defId: 'magnet', state: { roped: true }, name: '磁绳钩' } }], feedback: '磁铁绑上绳子，做成磁绳钩。', priority: 8, category: 'neutral' },
      { recipeId: 'l3_absurd', kind: 'use', inputs: [{ tag: 'magnet', requireState: { roped: true } }], target: { id: 'door' }, outputs: [{ setScene: { targetId: 'door', state: { opened: true, locked: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '磁绳钩从门缝探进去，把锁舌吸开。离谱但门开了。', priority: 10, category: 'solution' },
      { recipeId: 'l3_f_hammer', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'door' }, outputs: [{ setScene: { targetId: 'door', state: { damaged: true } } }], feedback: '你砸了门，门框裂了，锁没开。', galleryNote: '暴力破门（门坏了）。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_screw', kind: 'use', inputs: [{ tag: 'sharp', item: 'screwdriver' }], target: { id: 'door' }, feedback: '螺丝刀撬锁，卡得更死还崩了刃。', galleryNote: '撬锁反被锁撬。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_coin_glue', kind: 'combine', inputs: [{ tag: 'metal' }, { tag: 'adhesive' }], feedback: '硬币粘住了，什么也没发生。', galleryNote: '硬币封印术。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_magnet', kind: 'use', inputs: [{ tag: 'magnet' }], target: { id: 'door' }, feedback: '磁铁吸在金属门上，纹丝不动。', galleryNote: '磁铁吸门（无效）。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_key_tape', kind: 'combine', inputs: [{ tag: 'key' }, { tag: 'adhesive' }], feedback: '钥匙被胶带缠住，拔不出来了。', galleryNote: '自锁钥匙。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_rope', kind: 'use', inputs: [{ tag: 'rope' }], target: { id: 'door' }, feedback: '绳子套门把手上猛拽，把手掉了门还锁着。', galleryNote: '拽把手行为。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_paper_glue', kind: 'combine', inputs: [{ tag: 'paper' }, { tag: 'adhesive' }], feedback: '纸片粘成一坨，开门无望。', galleryNote: '纸胶球。', priority: 5, category: 'failure' },
      { recipeId: 'l3_f_coin', kind: 'use', inputs: [{ tag: 'metal' }], target: { id: 'door' }, feedback: '硬币塞进锁孔，卡住了！现在彻底打不开。', galleryNote: '硬币锁孔封印（更严重）。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l3_s_pro', tier: 'professional', predicate: { and: [{ target: 'door', state: { opened: true, locked: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '钥匙在手，天下我有。' },
      { id: 'l3_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'door', state: { opened: true, locked: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '纸片开锁，老电影桥段成真。' },
      { id: 'l3_s_abs', tier: 'absurd', predicate: { and: [{ target: 'door', state: { opened: true, locked: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '磁绳钩吸开了锁，门锁表示从未见过这种操作。' },
    ],
  },

  // ---------- L4 黑暗房间 ----------
  {
    id: 'l4',
    chapter: 2,
    title: '黑暗房间',
    brief: '停电了，屋里漆黑。你要在邻居送发电机来之前，先弄亮点光。',
    goalText: '让房间亮起来。',
    items: [it('bulb'), it('battery'), it('candle'), it('matches'), it('phone'), it('charger'), it('cloth'), it('wood')],
    targets: [
      { id: 'room', name: '房间', icon: '🏠', tags: ['room'], description: '伸手不见五指。', initial: { lit: false } },
      { id: 'socket', name: '墙插', icon: '🔌', tags: ['power'], description: '有电。', initial: { powered: true } },
    ],
    initialFlags: { power_available: true },
    recipes: [
      { recipeId: 'l4_lamp', kind: 'combine', inputs: [{ tag: 'light' }, { tag: 'power' }], outputs: [{ addItem: { defId: 'bulb', state: { lamp: true }, name: '手制灯' } }], feedback: '灯泡接上电池，手制灯亮了。', priority: 8, category: 'neutral' },
      { recipeId: 'l4_pro', kind: 'use', inputs: [{ tag: 'light', requireState: { lamp: true } }], target: { id: 'room' }, outputs: [{ setScene: { targetId: 'room', state: { lit: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '手制灯往房间一放，明亮稳定。专业照明。', priority: 10, category: 'solution' },
      { recipeId: 'l4_candle', kind: 'combine', inputs: [{ tag: 'fire' }, { tag: 'light' }], outputs: [{ addItem: { defId: 'candle', state: { lit: true }, name: '点燃的蜡烛' } }], feedback: '蜡烛被点燃，火苗摇曳。', priority: 8, category: 'neutral' },
      { recipeId: 'l4_temp', kind: 'use', inputs: [{ tag: 'light', requireState: { lit: true } }], target: { id: 'room' }, outputs: [{ setScene: { targetId: 'room', state: { lit: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '烛光照亮一角，能看清路了。临时照明。', priority: 10, category: 'solution' },
      { recipeId: 'l4_absurd', kind: 'use', inputs: [{ tag: 'electronic' }], target: { id: 'room' }, outputs: [{ setScene: { targetId: 'room', state: { lit: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你打开手机手电筒扫过房间，亮了——虽然费电。离谱便捷。', priority: 10, category: 'solution' },
      { recipeId: 'l4_f_matches', kind: 'use', inputs: [{ tag: 'fire' }], target: { id: 'room' }, feedback: '你划了火柴，穿堂风一吹灭了。', galleryNote: '风灭火柴。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_bulb_water', kind: 'combine', inputs: [{ tag: 'light' }, { tag: 'liquid' }], feedback: '灯泡泡水里，短路冒烟。', galleryNote: '泡水灯泡。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_battery', kind: 'use', inputs: [{ tag: 'power' }], target: { id: 'room' }, feedback: '电池直接怼墙，没用。', galleryNote: '怼墙电池。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_candle_water', kind: 'combine', inputs: [{ tag: 'fire' }, { tag: 'liquid' }], feedback: '蜡烛被水浇灭，白高兴。', galleryNote: '水浇蜡烛。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_wood', kind: 'use', inputs: [{ tag: 'wood' }], target: { id: 'room' }, feedback: '木棍戳空气，房间还是黑的。', galleryNote: '戳空气棍。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_rope_bulb', kind: 'combine', inputs: [{ tag: 'rope' }, { tag: 'light' }], feedback: '绳子绑灯泡，还是不亮。', galleryNote: '绳灯（不亮）。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_phone_charge', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'power' }], feedback: '手机在充电，但房间还是黑的。', galleryNote: '充电不照明。', priority: 5, category: 'failure' },
      { recipeId: 'l4_f_matches_cloth', kind: 'combine', inputs: [{ tag: 'fire' }, { tag: 'cloth' }], feedback: '布沾了火苗，差点烧起来你赶紧拍灭。', galleryNote: '引燃布条。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l4_s_pro', tier: 'professional', predicate: { and: [{ target: 'room', state: { lit: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '自制电灯，稳定明亮，邻居都来借。' },
      { id: 'l4_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'room', state: { lit: true } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '烛光摇曳，勉强够用。' },
      { id: 'l4_s_abs', tier: 'absurd', predicate: { and: [{ target: 'room', state: { lit: true } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '手机手电筒照亮全屋，现代人的浪漫。' },
    ],
  },

  // ---------- L11 显示器不亮 ----------
  {
    id: 'l11',
    chapter: 2,
    title: '显示器不亮',
    brief: '显示器黑屏，主机还在跑。你怀疑是线松了，也可能是别的。',
    goalText: '让显示器亮起来。',
    items: [it('cable'), it('phone'), it('cloth'), it('tape'), it('battery'), it('charger'), it('candle'), it('water'), it('stone')],
    targets: [
      { id: 'monitor', name: '显示器', icon: '🖥️', tags: ['monitor', 'electronic'], description: '电源灯不亮。', initial: { lit: false, on: false } },
      { id: 'socket', name: '墙插', icon: '🔌', tags: ['power'], description: '有电。', initial: { powered: true } },
    ],
    initialFlags: { power_available: true },
    recipes: [
      { recipeId: 'l11_tape_cable', kind: 'combine', inputs: [{ tag: 'cable' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'cable', state: { taped: true }, name: '胶带捆线' } }], feedback: '胶带把线接头捆紧。', priority: 8, category: 'neutral' },
      { recipeId: 'l11_pro', kind: 'use', inputs: [{ tag: 'cable', requireState: { taped: true } }], target: { id: 'monitor' }, outputs: [{ setScene: { targetId: 'monitor', state: { on: true, lit: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '捆紧的线插回显示器，信号通了，亮了。专业接线。', priority: 10, category: 'solution' },
      { recipeId: 'l11_temp', kind: 'use', inputs: [{ item: 'charger' }], target: { id: 'monitor' }, conditions: [{ flag: { key: 'power_available', equals: true } }], outputs: [{ setScene: { targetId: 'monitor', state: { on: true, lit: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '充电器直供显示器，亮了。临时供电。', priority: 10, category: 'solution' },
      { recipeId: 'l11_absurd', kind: 'use', inputs: [{ tag: 'electronic' }], target: { id: 'monitor' }, outputs: [{ setScene: { targetId: 'monitor', state: { on: true, lit: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你把手机亮屏贴显示器上，假装它亮了——其实也算照亮了。离谱。', priority: 10, category: 'solution' },
      { recipeId: 'l11_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'monitor' }, feedback: '水泼显示器，短路。', galleryNote: '泼显示器。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_candle', kind: 'use', inputs: [{ tag: 'fire' }], target: { id: 'monitor' }, feedback: '蜡烛烤显示器，后盖鼓了。', galleryNote: '烤显示器。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_tape', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'monitor' }, feedback: '胶带粘屏幕，更看不清。', galleryNote: '胶屏。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_cloth', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'monitor' }, feedback: '布擦屏幕，不是开关。', galleryNote: '擦屏。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'monitor' }, feedback: '石头砸显示器，裂了。', galleryNote: '砸显示器。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_cloth_tape', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'adhesive' }], feedback: '布缠胶带，没用。', galleryNote: '布胶。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_cable_water', kind: 'combine', inputs: [{ tag: 'cable' }, { tag: 'liquid' }], feedback: '线泡水，危险。', galleryNote: '泡线。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_phone_charge', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'power', item: 'charger' }], feedback: '手机在充电，显示器还是黑的。', galleryNote: '充电不亮屏。', priority: 5, category: 'failure' },
      { recipeId: 'l11_f_cloth_water', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'liquid' }], feedback: '湿布擦屏，水痕。', galleryNote: '湿布屏。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l11_s_pro', tier: 'professional', predicate: { and: [{ target: 'monitor', state: { on: true, lit: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '捆紧接线，信号稳稳，显示器满血复活。' },
      { id: 'l11_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'monitor', state: { on: true, lit: true } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '充电器续命，画面回来了。' },
      { id: 'l11_s_abs', tier: 'absurd', predicate: { and: [{ target: 'monitor', state: { on: true, lit: true } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '手机贴屏假亮，离谱但你看清了。' },
    ],
  },

  // ---------- L12 自行车爆胎 ----------
  {
    id: 'l12',
    chapter: 2,
    title: '自行车爆胎',
    brief: '骑车半路爆胎，前轮瘪了。补胎工具不全，你凑合修一下。',
    goalText: '让车胎不再漏气（尽量别报废）。',
    items: [it('rubber'), it('glue'), it('cloth'), it('rope'), it('pump'), it('water'), it('stone'), it('soap')],
    targets: [
      { id: 'tire', name: '前车胎', icon: '🚲', tags: ['tire', 'rubber'], description: '瘪了，慢撒气。', initial: { flat: true, patched: false, inflated: false } },
    ],
    recipes: [
      { recipeId: 'l12_patch', kind: 'combine', inputs: [{ tag: 'rubber' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'rubber', state: { glued: true }, name: '胶补片' } }], feedback: '橡胶蘸胶水，做成补片。', priority: 8, category: 'neutral' },
      { recipeId: 'l12_pro', kind: 'use', inputs: [{ tag: 'rubber', requireState: { glued: true } }], target: { id: 'tire' }, outputs: [{ setScene: { targetId: 'tire', state: { patched: true, flat: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '胶补片贴住破口，不漏气了。专业补胎。', priority: 10, category: 'solution' },
      { recipeId: 'l12_temp', kind: 'use', inputs: [{ item: 'pump' }], target: { id: 'tire' }, outputs: [{ setScene: { targetId: 'tire', state: { inflated: true, flat: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '打气筒猛打几泵，胎鼓起来了，暂时能骑。临时补气。', priority: 10, category: 'solution' },
      { recipeId: 'l12_absurd', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'tire' }, outputs: [{ setScene: { targetId: 'tire', state: { patched: true, flat: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你把布条塞进破口，居然堵住了气。离谱但能骑。', priority: 10, category: 'solution' },
      { recipeId: 'l12_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'tire' }, feedback: '浇水没用，胎还是瘪。', galleryNote: '浇胎。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'tire' }, feedback: '石头砸胎，更扁。', galleryNote: '砸胎。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_rope', kind: 'use', inputs: [{ tag: 'rope' }], target: { id: 'tire' }, feedback: '绳子缠轮，骑不动。', galleryNote: '绳轮。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'tire' }, feedback: '肥皂涂胎，滑。', galleryNote: '滑胎。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_pump_water', kind: 'combine', inputs: [{ item: 'pump' }, { tag: 'liquid' }], feedback: '打气筒装了水。', galleryNote: '水枪筒。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_cloth_rope', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'rope' }], feedback: '布绳一团。', galleryNote: '布绳。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_rubber_water', kind: 'combine', inputs: [{ tag: 'rubber' }, { tag: 'liquid' }], feedback: '橡胶泡水。', galleryNote: '泡水橡胶。', priority: 5, category: 'failure' },
      { recipeId: 'l12_f_glue_water', kind: 'combine', inputs: [{ item: 'glue' }, { tag: 'liquid' }], feedback: '胶水化水里。', galleryNote: '化胶。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l12_s_pro', tier: 'professional', predicate: { and: [{ target: 'tire', state: { patched: true, flat: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '胶补片贴牢，慢撒气止住，稳稳骑回家。' },
      { id: 'l12_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'tire', state: { inflated: true, flat: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '打气筒顶住，先骑到修车铺。' },
      { id: 'l12_s_abs', tier: 'absurd', predicate: { and: [{ target: 'tire', state: { patched: true, flat: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '布条塞破口，离谱补胎法上线。' },
    ],
  },

  // ===================== 第三章 =====================
  // ---------- L5 火灾警报误报 ----------
  {
    id: 'l5',
    chapter: 3,
    title: '火灾警报误报',
    brief: '厨房糊锅触发了火警，刺耳铃声大作。消防车还有五分钟到，先让它闭嘴。',
    goalText: '让警报安静下来（别破坏设备）。',
    items: [it('towel'), it('water'), it('stone'), it('cloth'), it('rope'), it('icecream'), it('fan'), it('soap'), it('bucket')],
    targets: [
      { id: 'alarm', name: '火警警报器', icon: '🔔', tags: ['alarm', 'electronic'], description: '红灯狂闪，铃声刺耳。', initial: { ringing: true, silenced: false, broken: false } },
    ],
    recipes: [
      { recipeId: 'l5_pro', kind: 'use', inputs: [{ tag: 'absorb' }], target: { id: 'alarm' }, outputs: [{ setScene: { targetId: 'alarm', state: { silenced: true, ringing: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '毛巾捂住警报器的感应口，它安静了。专业处置。', priority: 10, category: 'solution' },
      { recipeId: 'l5_temp', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'alarm' }, outputs: [{ setScene: { targetId: 'alarm', state: { silenced: true, ringing: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '你泼了点水上去，电路一激灵不响了——冒险但有效。', priority: 10, category: 'solution' },
      { recipeId: 'l5_absurd', kind: 'use', inputs: [{ tag: 'cold' }], target: { id: 'alarm' }, outputs: [{ setScene: { targetId: 'alarm', state: { silenced: true, ringing: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '冰淇淋贴上去，警报器被冰得一哆嗦不响了。离谱降温静音。', priority: 11, category: 'solution' },
      { recipeId: 'l5_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'alarm' }, outputs: [{ setScene: { targetId: 'alarm', state: { broken: true } } }], feedback: '你砸了警报器，它更响并自动报警了消防。', galleryNote: '砸警报（升级事件）。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_fan', kind: 'use', inputs: [{ tag: 'fan' }], target: { id: 'alarm' }, feedback: '风扇对着警报吹，声音传得更远了。', galleryNote: '扩音风扇。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'alarm' }, feedback: '肥皂涂上去，滑溜溜没用。', galleryNote: '肥皂警报。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_rope_towel', kind: 'combine', inputs: [{ tag: 'rope' }, { tag: 'absorb' }], feedback: '毛巾挂绳上，像晾衣绳，警报照响。', galleryNote: '晾衣绳毛巾。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_bucket', kind: 'use', inputs: [{ tag: 'container' }], target: { id: 'alarm' }, feedback: '水桶罩警报，闷响但还响。', galleryNote: '罩桶闷响。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_water_soap', kind: 'combine', inputs: [{ item: 'water' }, { tag: 'clean' }], feedback: '肥皂水，能洗但灭不了警报。', galleryNote: '肥皂水非灭火。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_ice_water', kind: 'combine', inputs: [{ tag: 'cold' }, { tag: 'liquid' }], feedback: '冰淇淋化在肥皂水里，黏糊一团。', galleryNote: '冰淇淋肥皂水。', priority: 5, category: 'failure' },
      { recipeId: 'l5_f_cloth_rope', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'rope' }], feedback: '布条绑绳上，还是没捂住警报。', galleryNote: '绳布组合（无效）。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l5_s_pro', tier: 'professional', predicate: { and: [{ target: 'alarm', state: { silenced: true, ringing: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '毛巾捂感应口，专业又干净，消防来了也点头。' },
      { id: 'l5_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'alarm', state: { silenced: true, ringing: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '泼水静音，冒险但消防车来前安静了。' },
      { id: 'l5_s_abs', tier: 'absurd', predicate: { and: [{ target: 'alarm', state: { silenced: true, ringing: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '冰淇淋冰封警报，它再也没出过声（当天）。' },
    ],
  },

  // ---------- L6 卡住的抽屉 ----------
  {
    id: 'l6',
    chapter: 3,
    title: '卡住的抽屉',
    brief: '你急需抽屉里的合同，抽屉却卡死拉不出。别蛮力，弄坏要赔。',
    goalText: '打开抽屉（保持完好）。',
    items: [it('soap'), it('screwdriver'), it('hammer'), it('candle'), it('cloth'), it('rope'), it('glove'), it('knife'), it('water')],
    targets: [
      { id: 'drawer', name: '木抽屉', icon: '🗄️', tags: ['drawer', 'wood'], description: '木头胀了，卡在轨道上。', initial: { stuck: true, open: false, damaged: false } },
    ],
    recipes: [
      { recipeId: 'l6_pro', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'drawer' }, outputs: [{ setScene: { targetId: 'drawer', state: { open: true, stuck: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '肥皂涂在轨道上润滑，抽屉顺滑拉开。专业。', priority: 10, category: 'solution' },
      { recipeId: 'l6_temp', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'drawer' }, outputs: [{ setScene: { targetId: 'drawer', state: { open: true, stuck: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '布垫着增加摩擦力，左右晃着拽开了。临时但有效。', priority: 10, category: 'solution' },
      { recipeId: 'l6_absurd', kind: 'use', inputs: [{ tag: 'protect' }], target: { id: 'drawer' }, outputs: [{ setScene: { targetId: 'drawer', state: { open: true, stuck: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '戴上手套一把薅开，手不疼抽屉也开了。离谱省力。', priority: 10, category: 'solution' },
      { recipeId: 'l6_f_hammer', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'drawer' }, outputs: [{ setScene: { targetId: 'drawer', state: { damaged: true } } }], feedback: '你砸抽屉，木板裂了，合同也皱了。', galleryNote: '砸抽屉（合同受害）。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_screw', kind: 'use', inputs: [{ tag: 'sharp', item: 'screwdriver' }], target: { id: 'drawer' }, feedback: '螺丝刀撬缝，卡得更紧。', galleryNote: '撬缝反效果。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_rope', kind: 'use', inputs: [{ tag: 'rope' }], target: { id: 'drawer' }, feedback: '绳子绑抽屉把手猛拉，把手掉了。', galleryNote: '拽把手二代。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_knife_soap', kind: 'combine', inputs: [{ tag: 'sharp', item: 'knife' }, { tag: 'clean' }], feedback: '刀刮肥皂，碎一地。', galleryNote: '刮肥皂。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'drawer' }, feedback: '水进木缝，木头更胀更卡。', galleryNote: '注水胀木。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_candle', kind: 'use', inputs: [{ tag: 'fire' }], target: { id: 'drawer' }, feedback: '蜡滴进缝，凝固后更卡。', galleryNote: '蜡封抽屉。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_glove_soap', kind: 'combine', inputs: [{ tag: 'protect' }, { tag: 'clean' }], feedback: '手套沾肥皂，滑得抓不住。', galleryNote: '滑手套。', priority: 5, category: 'failure' },
      { recipeId: 'l6_f_knife', kind: 'use', inputs: [{ tag: 'sharp', item: 'knife' }], target: { id: 'drawer' }, feedback: '刀撬抽屉，划出一道印子。', galleryNote: '刀痕留念。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l6_s_pro', tier: 'professional', predicate: { and: [{ target: 'drawer', state: { open: true, stuck: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '润滑后顺滑抽出，合同毫发无损。' },
      { id: 'l6_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'drawer', state: { open: true, stuck: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '垫布晃开，合同到手。' },
      { id: 'l6_s_abs', tier: 'absurd', predicate: { and: [{ target: 'drawer', state: { open: true, stuck: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '手套薅开，简单粗暴有效。' },
    ],
  },

  // ---------- L13 打印机卡纸 ----------
  {
    id: 'l13',
    chapter: 3,
    title: '打印机卡纸',
    brief: '打印机卡纸，急着想打文件。别硬拽，弄坏要赔。',
    goalText: '取出卡纸（保持打印机完好）。',
    items: [it('paper'), it('knife'), it('tape'), it('wood'), it('cloth'), it('glue'), it('scissors'), it('water')],
    targets: [
      { id: 'printer', name: '打印机', icon: '🖨️', tags: ['printer', 'electronic'], description: '进纸口卡了张纸。', initial: { jammed: true, fixed: false } },
    ],
    recipes: [
      { recipeId: 'l13_tape_wood', kind: 'combine', inputs: [{ tag: 'wood' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'wood', state: { taped: true }, name: '胶带捅棍' } }], feedback: '胶带把木棍一头缠出倒刺。', priority: 8, category: 'neutral' },
      { recipeId: 'l13_pro', kind: 'use', inputs: [{ item: 'scissors' }], target: { id: 'printer' }, outputs: [{ setScene: { targetId: 'printer', state: { fixed: true, jammed: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '剪刀尖夹住卡纸，轻轻抽出。专业取纸。', priority: 10, category: 'solution' },
      { recipeId: 'l13_temp', kind: 'use', inputs: [{ tag: 'wood', requireState: { taped: true } }], target: { id: 'printer' }, outputs: [{ setScene: { targetId: 'printer', state: { fixed: true, jammed: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '胶带捅棍把卡纸挑出来。临时工具。', priority: 10, category: 'solution' },
      { recipeId: 'l13_absurd', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'printer' }, outputs: [{ setScene: { targetId: 'printer', state: { fixed: true, jammed: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '胶带粘住露出的卡纸边，慢慢拉出。离谱但通。', priority: 10, category: 'solution' },
      { recipeId: 'l13_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'printer' }, feedback: '水泼打印机，短路。', galleryNote: '泼打印机。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_paper', kind: 'use', inputs: [{ tag: 'paper' }], target: { id: 'printer' }, feedback: '再塞一张纸，更卡。', galleryNote: '叠卡。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_cloth', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'printer' }, feedback: '布擦打印机，纸还在。', galleryNote: '擦机。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_knife_tape', kind: 'combine', inputs: [{ tag: 'sharp', item: 'knife' }, { tag: 'adhesive' }], feedback: '刀缠胶带，钝了。', galleryNote: '胶刀。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_paper_glue', kind: 'combine', inputs: [{ tag: 'paper' }, { item: 'glue' }], feedback: '纸粘胶，废了。', galleryNote: '胶纸。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_wood_water', kind: 'combine', inputs: [{ tag: 'wood' }, { tag: 'liquid' }], feedback: '木棍泡水。', galleryNote: '泡棍。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_scissors_paper', kind: 'combine', inputs: [{ item: 'scissors' }, { tag: 'paper' }], feedback: '剪刀剪纸。', galleryNote: '剪纸。', priority: 5, category: 'failure' },
      { recipeId: 'l13_f_tape_water', kind: 'combine', inputs: [{ tag: 'adhesive' }, { tag: 'liquid' }], feedback: '胶带遇水不粘。', galleryNote: '湿胶。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l13_s_pro', tier: 'professional', predicate: { and: [{ target: 'printer', state: { fixed: true, jammed: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '剪刀稳稳取纸，打印机毫发无损。' },
      { id: 'l13_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'printer', state: { fixed: true, jammed: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '捅棍挑纸，文件到手。' },
      { id: 'l13_s_abs', tier: 'absurd', predicate: { and: [{ target: 'printer', state: { fixed: true, jammed: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '胶带拉纸法，离谱但通。' },
    ],
  },

  // ---------- L14 键盘进水 ----------
  {
    id: 'l14',
    chapter: 3,
    title: '键盘进水',
    brief: '一杯水翻在键盘上，灯还亮着。赶紧处理，别让它报废。',
    goalText: '让键盘干爽（别短路）。',
    items: [it('cloth'), it('towel'), it('water'), it('fan'), it('paper'), it('candle'), it('phone'), it('soap')],
    targets: [
      { id: 'keyboard', name: '键盘', icon: '⌨️', tags: ['keyboard', 'electronic'], description: '缝隙还在渗水。', initial: { wet: true, dry: false } },
    ],
    recipes: [
      { recipeId: 'l14_tape_fan', kind: 'combine', inputs: [{ tag: 'fan' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'fan', state: { taped: true }, name: '胶带风扇' } }], feedback: '胶带把风扇固定成吹风模式。', priority: 8, category: 'neutral' },
      { recipeId: 'l14_pro', kind: 'use', inputs: [{ tag: 'absorb' }], target: { id: 'keyboard' }, outputs: [{ setScene: { targetId: 'keyboard', state: { dry: true, wet: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '毛巾吸干缝隙的水，键盘干爽。专业吸水。', priority: 10, category: 'solution' },
      { recipeId: 'l14_temp', kind: 'use', inputs: [{ tag: 'fan', requireState: { taped: true } }], target: { id: 'keyboard' }, outputs: [{ setScene: { targetId: 'keyboard', state: { dry: true, wet: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '胶带风扇对着键盘吹，水珠吹干。临时风干。', priority: 10, category: 'solution' },
      { recipeId: 'l14_absurd', kind: 'use', inputs: [{ tag: 'electronic' }], target: { id: 'keyboard' }, outputs: [{ setScene: { targetId: 'keyboard', state: { dry: true, wet: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '手机手电照着键盘，你假装它干了。离谱但继续用。', priority: 10, category: 'solution' },
      { recipeId: 'l14_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'keyboard' }, feedback: '再泼点水，更湿。', galleryNote: '加汤。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_candle', kind: 'use', inputs: [{ tag: 'fire' }], target: { id: 'keyboard' }, feedback: '蜡烛烤键盘，冒烟。', galleryNote: '烤键。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'keyboard' }, feedback: '肥皂涂键帽，黏。', galleryNote: '皂键。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_paper', kind: 'use', inputs: [{ tag: 'paper' }], target: { id: 'keyboard' }, feedback: '纸擦键盘，吸水有限。', galleryNote: '纸擦。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_phone_tape', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'adhesive' }], feedback: '手机粘胶带。', galleryNote: '胶机。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_towel_water', kind: 'combine', inputs: [{ tag: 'absorb' }, { tag: 'liquid' }], feedback: '毛巾湿透。', galleryNote: '湿巾。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_fan_water', kind: 'combine', inputs: [{ tag: 'fan' }, { tag: 'liquid' }], feedback: '风扇泡水。', galleryNote: '泡扇。', priority: 5, category: 'failure' },
      { recipeId: 'l14_f_paper_water', kind: 'combine', inputs: [{ tag: 'paper' }, { tag: 'liquid' }], feedback: '湿纸糊键盘。', galleryNote: '湿纸。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l14_s_pro', tier: 'professional', predicate: { and: [{ target: 'keyboard', state: { dry: true, wet: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '毛巾吸干，键盘满血，文件保住。' },
      { id: 'l14_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'keyboard', state: { dry: true, wet: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '风扇吹干，先用着。' },
      { id: 'l14_s_abs', tier: 'absurd', predicate: { and: [{ target: 'keyboard', state: { dry: true, wet: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '手机照着假装干了，离谱但继续敲。' },
    ],
  },

  // ===================== 第四章 =====================
  // ---------- L7 手机没电 ----------
  {
    id: 'l7',
    chapter: 4,
    title: '手机没电',
    brief: '你要扫码进站，手机却红了 1%。让它在闸机前活过来。',
    goalText: '让屏幕亮起（充上电）。',
    items: [it('phone'), it('charger'), it('battery'), it('cable'), it('soap'), it('water'), it('candle'), it('cloth')],
    targets: [
      { id: 'screen', name: '闸机屏', icon: '📲', tags: ['screen', 'electronic'], description: '需要亮屏扫码。', initial: { on: false } },
      { id: 'socket', name: '充电口', icon: '🔌', tags: ['power'], description: '有电。', initial: { powered: true } },
    ],
    initialFlags: { power_available: true },
    recipes: [
      { recipeId: 'l7_charged', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'power', item: 'charger' }], outputs: [{ addItem: { defId: 'phone', state: { charged: true, method: 'charger' }, name: '充好电的手机' } }], feedback: '手机接上充电器，电量回血。', priority: 8, category: 'neutral' },
      { recipeId: 'l7_pro', kind: 'use', inputs: [{ tag: 'electronic', requireState: { charged: true, method: 'charger' } }], target: { id: 'screen' }, outputs: [{ setScene: { targetId: 'screen', state: { on: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '亮屏扫码，闸机「滴」地开了。专业充电。', priority: 10, category: 'solution' },
      { recipeId: 'l7_battery', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'power', item: 'battery' }], outputs: [{ addItem: { defId: 'phone', state: { charged: true, method: 'battery' }, name: '电池供电手机' } }], feedback: '电池怼进手机背夹，强行供电。', priority: 8, category: 'neutral' },
      { recipeId: 'l7_temp', kind: 'use', inputs: [{ tag: 'electronic', requireState: { charged: true, method: 'battery' } }], target: { id: 'screen' }, outputs: [{ setScene: { targetId: 'screen', state: { on: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '电池顶着亮了屏，扫码过关。临时电源。', priority: 10, category: 'solution' },
      { recipeId: 'l7_cable', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'cable' }], outputs: [{ addItem: { defId: 'phone', state: { wired: true }, name: '接线手机' } }], feedback: '手机接上接线，准备插口取电。', priority: 8, category: 'neutral' },
      { recipeId: 'l7_absurd', kind: 'use', inputs: [{ tag: 'electronic', requireState: { wired: true } }], target: { id: 'socket' }, outputs: [{ setScene: { targetId: 'screen', state: { on: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '接线手机插充电口，屏幕亮了——虽然线缠成了中国结。离谱但通。', priority: 10, category: 'solution' },
      { recipeId: 'l7_f_phone_socket', kind: 'use', inputs: [{ tag: 'electronic' }], target: { id: 'socket' }, outputs: [{ setScene: { targetId: 'screen', state: { on: false } } }], feedback: '手机直接插插座，冒烟了，屏幕更黑。', galleryNote: '手机直插插座。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_phone_water', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'liquid' }], feedback: '手机进水，直接黑屏。', galleryNote: '手机泡水。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_candle', kind: 'use', inputs: [{ tag: 'fire' }], target: { id: 'screen' }, feedback: '蜡烛烤手机，后盖鼓了。', galleryNote: '烤手机。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_charger_batt', kind: 'combine', inputs: [{ tag: 'power', item: 'charger' }, { tag: 'power' }], feedback: '充电器和电池接反，冒火花。', galleryNote: '反接火花。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_cable', kind: 'use', inputs: [{ tag: 'cable' }], target: { id: 'screen' }, feedback: '光有线和没充电的手机，屏不亮。', galleryNote: '无线无电。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_phone_soap', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'clean' }], feedback: '手机涂肥皂，滑得拿不住。', galleryNote: '滑手机。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_batt_socket', kind: 'use', inputs: [{ tag: 'power' }], target: { id: 'socket' }, feedback: '电池直接怼插座，爆了。', galleryNote: '电池直插。', priority: 5, category: 'failure' },
      { recipeId: 'l7_f_phone_tape', kind: 'combine', inputs: [{ tag: 'electronic' }, { tag: 'adhesive' }], feedback: '胶带粘屏幕，更看不清了。', galleryNote: '胶屏。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l7_s_pro', tier: 'professional', predicate: { and: [{ target: 'screen', state: { on: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '正规充电亮屏，扫码进站一气呵成。' },
      { id: 'l7_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'screen', state: { on: true } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '电池续命亮屏，赶在闸机前扫上了。' },
      { id: 'l7_s_abs', tier: 'absurd', predicate: { and: [{ target: 'screen', state: { on: true } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '接线缠成中国结也能通电，闸机表示服了。' },
    ],
  },

  // ---------- L8 堵住的马桶 ----------
  {
    id: 'l8',
    chapter: 4,
    title: '堵住的马桶',
    brief: '马桶堵了，水位飙升。客人在门外，你得在溢出前通开它。',
    goalText: '疏通马桶（别让水溢出来）。',
    items: [it('bottle'), it('rope'), it('soap'), it('water'), it('bucket'), it('stone'), it('glove'), it('cloth'), it('icecream')],
    targets: [
      { id: 'toilet', name: '马桶', icon: '🚽', tags: ['toilet'], description: '水位高，水流不下去。', initial: { clogged: true, flushed: false, overflow: false } },
    ],
    recipes: [
      { recipeId: 'l8_pro', kind: 'use', inputs: [{ item: 'bottle' }], target: { id: 'toilet' }, outputs: [{ setScene: { targetId: 'toilet', state: { flushed: true, clogged: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '瓶子倒扣当皮搋子，一压一拔，哗啦通了。专业疏通。', priority: 10, category: 'solution' },
      { recipeId: 'l8_bucket', kind: 'combine', inputs: [{ tag: 'container' }, { tag: 'liquid' }], outputs: [{ addItem: { defId: 'bucket', state: { full: true }, name: '一桶水' } }], feedback: '水桶装满了水。', priority: 8, category: 'neutral' },
      { recipeId: 'l8_temp', kind: 'use', inputs: [{ tag: 'container', requireState: { full: true } }], target: { id: 'toilet' }, outputs: [{ setScene: { targetId: 'toilet', state: { flushed: true, clogged: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '整桶水猛冲下去，水压冲开了堵塞。临时大水漫灌。', priority: 11, category: 'solution' },
      { recipeId: 'l8_absurd', kind: 'use', inputs: [{ tag: 'protect' }], target: { id: 'toilet' }, outputs: [{ setScene: { targetId: 'toilet', state: { flushed: true, clogged: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你戴上手套伸手下去，亲手掏通了。离谱但立竿见影。', priority: 10, category: 'solution' },
      { recipeId: 'l8_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'toilet' }, outputs: [{ setScene: { targetId: 'toilet', state: { overflow: true } } }], feedback: '石头砸下去，釉面裂了，水溢了一地。', galleryNote: '砸马桶（溢出）。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_rope', kind: 'use', inputs: [{ tag: 'rope' }], target: { id: 'toilet' }, feedback: '绳子卷进下水道，拉出一团更堵的东西。', galleryNote: '绳掏下水道。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'toilet' }, feedback: '肥皂滑进去，更滑但没通。', galleryNote: '肥皂滑堵。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_water_soap', kind: 'combine', inputs: [{ tag: 'liquid' }, { tag: 'clean' }], feedback: '肥皂水，滑溜但堵着。', galleryNote: '肥皂水非疏通。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_ice', kind: 'use', inputs: [{ tag: 'cold' }], target: { id: 'toilet' }, feedback: '冰淇淋堵得更瓷实，还冻住了。', galleryNote: '冰淇淋冻堵。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_rope_cloth', kind: 'combine', inputs: [{ tag: 'rope' }, { tag: 'cloth' }], feedback: '布条塞进马桶，缠成一团更堵。', galleryNote: '布绳塞堵。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_cloth', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'toilet' }, feedback: '布塞进去，雪上加霜。', galleryNote: '布堵加固。', priority: 5, category: 'failure' },
      { recipeId: 'l8_f_cloth_water', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'liquid' }], feedback: '湿布塞进去，吸饱水更堵了。', galleryNote: '湿布堵加固。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l8_s_pro', tier: 'professional', predicate: { and: [{ target: 'toilet', state: { flushed: true, clogged: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '瓶塞疏通，干净利落，客人毫无察觉。' },
      { id: 'l8_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'toilet', state: { flushed: true, clogged: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '大水冲灌通了，就是费水。' },
      { id: 'l8_s_abs', tier: 'absurd', predicate: { and: [{ target: 'toilet', state: { flushed: true, clogged: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '手套掏通法，勇者之举，离谱有效。' },
    ],
  },

  // ---------- L15 鱼缸漏水 ----------
  {
    id: 'l15',
    chapter: 4,
    title: '鱼缸漏水',
    brief: '鱼缸侧壁渗水，鱼还游着。先止漏，别惊着鱼。',
    goalText: '封住鱼缸漏点（别把鱼弄出来）。',
    items: [it('rubber'), it('tape'), it('cloth'), it('bucket'), it('water'), it('glue'), it('icecream'), it('soap')],
    targets: [
      { id: 'fishtank', name: '鱼缸', icon: '🐠', tags: ['fishtank', 'glass'], description: '接缝处渗水。', initial: { leaking: true, sealed: false, overflow: false } },
    ],
    recipes: [
      { recipeId: 'l15_tape_cloth', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'cloth', state: { taped: true }, name: '胶带布补片' } }], feedback: '胶带把布条粘成补片。', priority: 8, category: 'neutral' },
      { recipeId: 'l15_pro', kind: 'use', inputs: [{ tag: 'rubber' }], target: { id: 'fishtank' }, outputs: [{ setScene: { targetId: 'fishtank', state: { sealed: true, leaking: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '橡胶块堵住漏点，不渗了。专业止漏。', priority: 10, category: 'solution' },
      { recipeId: 'l15_temp', kind: 'use', inputs: [{ tag: 'cloth', requireState: { taped: true } }], target: { id: 'fishtank' }, outputs: [{ setScene: { targetId: 'fishtank', state: { sealed: true, leaking: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '胶带布补片贴上漏点，水不渗了。临时。', priority: 10, category: 'solution' },
      { recipeId: 'l15_absurd', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'fishtank' }, outputs: [{ setScene: { targetId: 'fishtank', state: { sealed: true, leaking: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '整圈胶带缠住接缝，丑但止漏。离谱。', priority: 10, category: 'solution' },
      { recipeId: 'l15_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'fishtank' }, feedback: '加更多水，漏更凶。', galleryNote: '加漏。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_bucket', kind: 'use', inputs: [{ tag: 'container' }], target: { id: 'fishtank' }, feedback: '水桶扣鱼缸，鱼惊了。', galleryNote: '扣缸。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'fishtank' }, feedback: '肥皂涂缸，滑。', galleryNote: '皂缸。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_ice', kind: 'use', inputs: [{ tag: 'cold' }], target: { id: 'fishtank' }, feedback: '冰堵漏点，冻住了。', galleryNote: '冰堵。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_glue_water', kind: 'combine', inputs: [{ item: 'glue' }, { tag: 'liquid' }], feedback: '胶水化水里。', galleryNote: '化胶。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_rubber_tape', kind: 'combine', inputs: [{ tag: 'rubber' }, { tag: 'adhesive' }], feedback: '橡胶缠胶带。', galleryNote: '胶橡。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_cloth_water', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'liquid' }], feedback: '湿布。', galleryNote: '湿布。', priority: 5, category: 'failure' },
      { recipeId: 'l15_f_bucket_water', kind: 'combine', inputs: [{ tag: 'container' }, { tag: 'liquid' }], feedback: '桶装水。', galleryNote: '桶水。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l15_s_pro', tier: 'professional', predicate: { and: [{ target: 'fishtank', state: { sealed: true, leaking: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '橡胶塞漏点，鱼安然无恙，水不渗了。' },
      { id: 'l15_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'fishtank', state: { sealed: true, leaking: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '布补片贴住，等换缸再处理。' },
      { id: 'l15_s_abs', tier: 'absurd', predicate: { and: [{ target: 'fishtank', state: { sealed: true, leaking: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '整圈胶带封缸，离谱但止漏。' },
    ],
  },

  // ---------- L16 下水道反味 ----------
  {
    id: 'l16',
    chapter: 4,
    title: '下水道反味',
    brief: '地漏反味，卫生间一股怪味。先封住，别让味上来。',
    goalText: '封住地漏（别堵死下水）。',
    items: [it('water'), it('rubber'), it('tape'), it('cloth'), it('soap'), it('icecream'), it('bottle'), it('rope')],
    targets: [
      { id: 'drain', name: '地漏', icon: '🕳️', tags: ['drain', 'metal'], description: '存水弯干了，味往上返。', initial: { smelly: true, sealed: false } },
    ],
    recipes: [
      { recipeId: 'l16_tape_rubber', kind: 'combine', inputs: [{ tag: 'rubber' }, { tag: 'adhesive' }], outputs: [{ addItem: { defId: 'rubber', state: { taped: true }, name: '胶带橡胶塞' } }], feedback: '胶带把橡胶缠成塞子。', priority: 8, category: 'neutral' },
      { recipeId: 'l16_pro', kind: 'use', inputs: [{ tag: 'rubber' }], target: { id: 'drain' }, outputs: [{ setScene: { targetId: 'drain', state: { sealed: true, smelly: false } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '橡胶塞堵住漏口，味不上返。专业封堵。', priority: 10, category: 'solution' },
      { recipeId: 'l16_temp', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'drain' }, outputs: [{ setScene: { targetId: 'drain', state: { flushed: true, smelly: false } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '倒水重新蓄满存水弯，水封住了气味。临时水封。', priority: 10, category: 'solution' },
      { recipeId: 'l16_absurd', kind: 'use', inputs: [{ tag: 'cold' }], target: { id: 'drain' }, outputs: [{ setScene: { targetId: 'drain', state: { sealed: true, smelly: false } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '冰塞住漏口，冻住气味。离谱但凉快。', priority: 11, category: 'solution' },
      { recipeId: 'l16_f_tape', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'drain' }, feedback: '胶带粘不住金属漏口。', galleryNote: '胶漏。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_cloth', kind: 'use', inputs: [{ tag: 'cloth' }], target: { id: 'drain' }, feedback: '布塞进去，更堵还反味。', galleryNote: '布堵。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'drain' }, feedback: '肥皂滑，塞不住。', galleryNote: '皂漏。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_bottle', kind: 'use', inputs: [{ tag: 'container' }], target: { id: 'drain' }, feedback: '瓶子卡在漏口。', galleryNote: '瓶卡。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_rope', kind: 'use', inputs: [{ tag: 'rope' }], target: { id: 'drain' }, feedback: '绳卷进下水道。', galleryNote: '绳漏。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_rubber_water', kind: 'combine', inputs: [{ tag: 'rubber' }, { tag: 'liquid' }], feedback: '橡胶泡水。', galleryNote: '泡水橡胶。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_tape_water', kind: 'combine', inputs: [{ tag: 'adhesive' }, { tag: 'liquid' }], feedback: '胶带遇水不粘。', galleryNote: '湿胶。', priority: 5, category: 'failure' },
      { recipeId: 'l16_f_ice_soap', kind: 'combine', inputs: [{ tag: 'cold' }, { tag: 'clean' }], feedback: '冰肥皂，滑。', galleryNote: '冰皂。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l16_s_pro', tier: 'professional', predicate: { and: [{ target: 'drain', state: { sealed: true, smelly: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '橡胶塞漏口，味彻底封住。' },
      { id: 'l16_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'drain', state: { flushed: true, smelly: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '水封存水弯，气味压下去了。' },
      { id: 'l16_s_abs', tier: 'absurd', predicate: { and: [{ target: 'drain', state: { sealed: true, smelly: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '冰塞漏口，离谱但凉快止味。' },
    ],
  },

  // ===================== 第五章（终章）：离谱日常 =====================
  // ---------- L17 卡住的拉链 ----------
  {
    id: 'l17',
    chapter: 5,
    title: '卡住的拉链',
    brief: '马上要出门，外套拉链卡在一半，越拽越死。',
    goalText: '让拉链顺滑拉开（别扯坏）。',
    items: [it('soap'), it('candle'), it('sock'), it('water'), it('knife'), it('tape'), it('stone')],
    targets: [
      { id: 'zipper', name: '拉链', icon: '🧥', tags: ['zipper', 'metal'], description: '齿咬得死死的，拉头一动不动。', initial: { stuck: true, free: false, broken: false } },
    ],
    recipes: [
      { recipeId: 'l17_pro', kind: 'use', inputs: [{ item: 'soap' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { stuck: false, free: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '肥皂在齿上来回蹭两遍，拉链顺滑如新。专业润滑。', priority: 10, category: 'solution' },
      { recipeId: 'l17_temp', kind: 'use', inputs: [{ item: 'candle' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { stuck: false, free: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '蜡烛往齿上蹭了层蜡，拉链一拉到底——袖口蹭了点蜡灰。临时但管用。', priority: 11, category: 'solution' },
      { recipeId: 'l17_absurd', kind: 'use', inputs: [{ item: 'sock' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { stuck: false, free: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你把袜子套在手上当防滑手套，一使劲拉链哗地开了——袜子表示立了大功。离谱防滑法。', priority: 12, category: 'solution' },
      { recipeId: 'l17_f_knife', kind: 'use', inputs: [{ tag: 'sharp' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { broken: true } } }], feedback: '刀尖一撬，链齿崩了两颗，拉链彻底报废。', galleryNote: '拉链截肢。', priority: 5, category: 'failure' },
      { recipeId: 'l17_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { stuck: true } } }], feedback: '浇水想让它滑？金属齿直接给你锈上了。', galleryNote: '水润（反向）。', priority: 5, category: 'failure' },
      { recipeId: 'l17_f_tape', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { stuck: true } } }], feedback: '胶带粘在拉链上，现在卡得更结实了。', galleryNote: '加固（负面）。', priority: 5, category: 'failure' },
      { recipeId: 'l17_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'zipper' }, outputs: [{ setScene: { targetId: 'zipper', state: { broken: true } } }], feedback: '石头砸拉链？外套先破了个洞。', galleryNote: '暴力开衣。', priority: 5, category: 'failure' },
      { recipeId: 'l17_f_candle_soap', kind: 'combine', inputs: [{ tag: 'fire' }, { tag: 'clean' }], feedback: '蜡烛在肥皂上烧出一个坑，两败俱伤。', galleryNote: '润滑剂内战。', priority: 5, category: 'failure' },
      { recipeId: 'l17_f_sock_water', kind: 'combine', inputs: [{ tag: 'cloth' }, { tag: 'liquid' }], feedback: '湿袜子套手，凉飕飕地拽了半天，拉链纹丝不动。', galleryNote: '湿手附魔。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l17_s_pro', tier: 'professional', predicate: { and: [{ target: 'zipper', state: { free: true, stuck: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '肥皂润滑，一拉到底，出门体面。' },
      { id: 'l17_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'zipper', state: { free: true, stuck: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '蜡烛打蜡，顺滑程度七成，能出门就行。' },
      { id: 'l17_s_abs', tier: 'absurd', predicate: { and: [{ target: 'zipper', state: { free: true, stuck: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '袜子手套一鼓作气，拉链投降了。' },
    ],
  },
  // ---------- L18 生锈的螺丝 ----------
  {
    id: 'l18',
    chapter: 5,
    title: '生锈的螺丝',
    brief: '椅子腿的螺丝锈死了，椅子晃得像游船。有人建议直接换椅子。',
    goalText: '把锈螺丝卸下来（别拧秃）。',
    items: [it('screwdriver'), it('knife'), it('cat'), it('water'), it('hammer'), it('magnet'), it('glue'), it('soap')],
    targets: [
      { id: 'screw', name: '锈螺丝', icon: '🪛', tags: ['screw', 'metal'], description: '锈成一团，纹丝不动。', initial: { rusty: true, loose: false, stripped: false } },
    ],
    recipes: [
      { recipeId: 'l18_pro', kind: 'use', inputs: [{ item: 'screwdriver' }], target: { id: 'screw' }, outputs: [{ setScene: { targetId: 'screw', state: { rusty: false, loose: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '螺丝刀顶住一较劲，锈层崩开，螺丝乖乖退出。专业拆解。', priority: 10, category: 'solution' },
      { recipeId: 'l18_temp', kind: 'use', inputs: [{ item: 'knife' }], target: { id: 'screw' }, outputs: [{ setScene: { targetId: 'screw', state: { loose: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '小刀尖卡进槽里硬撬，锈皮簌簌掉，螺丝松了——刀尖也卷了。临时凑合。', priority: 11, category: 'solution' },
      { recipeId: 'l18_absurd', kind: 'use', inputs: [{ item: 'cat' }], target: { id: 'screw' }, outputs: [{ setScene: { targetId: 'screw', state: { loose: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你把猫爪按在螺丝上转了半圈——猫一爪拍下去，螺丝连锈带屑飞了出去。离谱猫爪卸钉法。', priority: 12, category: 'solution' },
      { recipeId: 'l18_f_hammer', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'screw' }, outputs: [{ setScene: { targetId: 'screw', state: { stripped: true } } }], feedback: '一锤子下去，螺丝槽拧圆了，再也使不上劲。', galleryNote: '拧秃现场。', priority: 5, category: 'failure' },
      { recipeId: 'l18_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'screw' }, outputs: [{ setScene: { targetId: 'screw', state: { rusty: true } } }], feedback: '浇水除锈？越浇越锈，锈水顺着椅子腿流。', galleryNote: '加水生锈（反向）。', priority: 5, category: 'failure' },
      { recipeId: 'l18_f_glue', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'screw' }, outputs: [{ setScene: { targetId: 'screw', state: { rusty: true } } }], feedback: '胶水渗进螺纹里，现在螺丝和椅子融为一体了。', galleryNote: '永久固定（字面义）。', priority: 5, category: 'failure' },
      { recipeId: 'l18_f_magnet', kind: 'use', inputs: [{ tag: 'magnet' }], target: { id: 'screw' }, feedback: '磁铁吸是吸住了，锈死的螺丝纹丝不转。', galleryNote: '磁力空转。', priority: 5, category: 'failure' },
      { recipeId: 'l18_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'screw' }, feedback: '肥皂抹螺丝，滑得连螺丝刀都打滑。', galleryNote: '润滑过度。', priority: 5, category: 'failure' },
      { recipeId: 'l18_f_cat_soap', kind: 'combine', inputs: [{ tag: 'animal' }, { tag: 'clean' }], feedback: '你给猫爪抹肥皂再按螺丝，猫嫌弃地甩了你一手泡沫。', galleryNote: '润滑猫爪（拒绝）。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l18_s_pro', tier: 'professional', predicate: { and: [{ target: 'screw', state: { loose: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '螺丝刀正名，锈螺丝束手就擒。' },
      { id: 'l18_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'screw', state: { loose: true } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '小刀硬撬，螺丝松了，刀也退休了。' },
      { id: 'l18_s_abs', tier: 'absurd', predicate: { and: [{ target: 'screw', state: { loose: true } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '猫爪卸钉，椅子和猫都对结果表示满意。' },
    ],
  },
  // ---------- L19 打不开的果酱罐 ----------
  {
    id: 'l19',
    chapter: 5,
    title: '打不开的果酱罐',
    brief: '早餐就差这罐草莓酱，盖子像是焊死的。',
    goalText: '打开果酱罐（别打碎）。',
    items: [it('glove'), it('knife'), it('cat'), it('towel'), it('water'), it('hammer'), it('stone'), it('soap')],
    targets: [
      { id: 'jar', name: '果酱罐', icon: '🍯', tags: ['jar', 'glass'], description: '金属盖拧得死紧，玻璃罐身滑手。', initial: { sealed: true, open: false, broken: false } },
    ],
    recipes: [
      { recipeId: 'l19_pro', kind: 'use', inputs: [{ item: 'glove' }], target: { id: 'jar' }, outputs: [{ setScene: { targetId: 'jar', state: { sealed: false, open: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '戴上橡胶手套，防滑一拧，"啵"的一声开了。专业开罐。', priority: 10, category: 'solution' },
      { recipeId: 'l19_temp', kind: 'use', inputs: [{ item: 'knife' }], target: { id: 'jar' }, outputs: [{ setScene: { targetId: 'jar', state: { sealed: false, open: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '刀尖轻轻一撬盖沿，放气声一响，盖子松了——盖沿留了道小痕。临时放气法。', priority: 11, category: 'solution' },
      { recipeId: 'l19_absurd', kind: 'use', inputs: [{ item: 'cat' }], target: { id: 'jar' }, outputs: [{ setScene: { targetId: 'jar', state: { sealed: false, open: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '你把罐子放地上转身拿毛巾，猫一巴掌把盖子拍飞了。离谱猫力开罐。', priority: 12, category: 'solution' },
      { recipeId: 'l19_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'jar' }, feedback: '热水烫盖子是真的技巧，可你用的是凉水——玻璃更滑了。', galleryNote: '温差学了个寂寞。', priority: 5, category: 'failure' },
      { recipeId: 'l19_f_soap', kind: 'use', inputs: [{ tag: 'clean' }], target: { id: 'jar' }, feedback: '肥皂抹手，罐子直接起飞，接住时吓出一身汗。', galleryNote: '抛接杂技。', priority: 5, category: 'failure' },
      { recipeId: 'l19_f_hammer', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'jar' }, outputs: [{ setScene: { targetId: 'jar', state: { broken: true } } }], feedback: '锤子落下，果酱罐解脱了——以碎片的形式。', galleryNote: '果酱自由。', priority: 5, category: 'failure' },
      { recipeId: 'l19_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'jar' }, outputs: [{ setScene: { targetId: 'jar', state: { broken: true } } }], feedback: '石头磕罐底用力过猛，罐底先开了。', galleryNote: '底部先泄。', priority: 4, category: 'failure' },
      { recipeId: 'l19_towel', kind: 'use', inputs: [{ tag: 'absorb' }], target: { id: 'jar' }, feedback: '毛巾垫着手还是拧不开，但至少没滑出去。', galleryNote: '差一点。', priority: 5, category: 'neutral' },
      { recipeId: 'l19_f_knife_hammer', kind: 'combine', inputs: [{ tag: 'sharp' }, { tag: 'heavy' }], feedback: '你把刀当凿子用锤砸，刀刃崩了个口。', galleryNote: '工具互害。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l19_s_pro', tier: 'professional', predicate: { and: [{ target: 'jar', state: { open: true, sealed: false } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '手套防滑一拧开，早餐圆满。' },
      { id: 'l19_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'jar', state: { open: true, sealed: false } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '放气撬盖，盖子松了，草莓酱到手。' },
      { id: 'l19_s_abs', tier: 'absurd', predicate: { and: [{ target: 'jar', state: { open: true, sealed: false } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '猫掌开罐，盖子飞出三米，猫舔了舔爪子。' },
    ],
  },
  // ---------- L20 停电的夜晚 ----------
  {
    id: 'l20',
    chapter: 5,
    title: '停电的夜晚',
    brief: '整栋楼跳闸，物业说要修一小时。桌上的报告还没写完。',
    goalText: '把书桌照亮（安全第一）。',
    items: [it('bulb'), it('battery'), it('matches'), it('candle'), it('phone'), it('water'), it('tape'), it('stone')],
    targets: [
      { id: 'desk', name: '书桌', icon: '🪑', tags: ['desk', 'furniture'], description: '一片漆黑，纸笔就在桌上。', initial: { lit: false, burned: false, wet: false } },
    ],
    recipes: [
      { recipeId: 'l20_bulb_batt', kind: 'combine', inputs: [{ item: 'bulb' }, { item: 'battery' }], outputs: [{ addItem: { defId: 'bulb', state: { lit: true }, name: '亮着的灯泡' } }], feedback: '灯泡拧上电池，微光亮起。', priority: 8, category: 'neutral' },
      { recipeId: 'l20_candle_fire', kind: 'combine', inputs: [{ item: 'matches' }, { item: 'candle' }], outputs: [{ addItem: { defId: 'candle', state: { lit: true }, name: '点燃的蜡烛' } }], feedback: '火柴凑近蜡烛，烛光摇曳。', priority: 8, category: 'neutral' },
      { recipeId: 'l20_pro', kind: 'use', inputs: [{ item: 'bulb', requireState: { lit: true } }], target: { id: 'desk' }, outputs: [{ setScene: { targetId: 'desk', state: { lit: true } }, setFlag: { key: 'solvedTier', value: 'professional' } }], scores: PRO, feedback: '电池灯泡立在笔筒边，桌面被照亮，继续写报告。安全照明。', priority: 10, category: 'solution' },
      { recipeId: 'l20_temp', kind: 'use', inputs: [{ item: 'candle', requireState: { lit: true } }], target: { id: 'desk' }, outputs: [{ setScene: { targetId: 'desk', state: { lit: true } }, setFlag: { key: 'solvedTier', value: 'temporary' } }], scores: TMP, feedback: '点燃的蜡烛固定在烟灰缸里，烛光照亮半张桌子——记得别打瞌睡。临时照明。', priority: 11, category: 'solution' },
      { recipeId: 'l20_absurd', kind: 'use', inputs: [{ item: 'phone' }], target: { id: 'desk' }, outputs: [{ setScene: { targetId: 'desk', state: { lit: true } }, setFlag: { key: 'solvedTier', value: 'absurd' } }], scores: ABS, feedback: '手机手电筒往桌上一架，亮度拉满——就是一小时后手机先没电了。离谱照明。', priority: 12, category: 'solution' },
      { recipeId: 'l20_f_matches_direct', kind: 'use', inputs: [{ item: 'matches' }], target: { id: 'desk' }, outputs: [{ setScene: { targetId: 'desk', state: { burned: true } } }], feedback: '你直接把火柴在桌上划着，报告一角光荣牺牲。', galleryNote: '引火烧桌。', priority: 5, category: 'failure' },
      { recipeId: 'l20_f_water', kind: 'use', inputs: [{ tag: 'liquid' }], target: { id: 'desk' }, outputs: [{ setScene: { targetId: 'desk', state: { wet: true } } }], feedback: '黑灯瞎火泼水玩，报告湿了半边。', galleryNote: '水漫书桌。', priority: 5, category: 'failure' },
      { recipeId: 'l20_f_stone', kind: 'use', inputs: [{ tag: 'heavy' }], target: { id: 'desk' }, outputs: [{ setScene: { targetId: 'desk', state: { burned: false, wet: false } } }], feedback: '石头砸桌子制造火花？只制造了个坑。', galleryNote: '燧石（伪）。', priority: 5, category: 'failure' },
      { recipeId: 'l20_f_tape', kind: 'use', inputs: [{ tag: 'adhesive' }], target: { id: 'desk' }, feedback: '胶带在桌上贴了个笑脸，并没有发光。', galleryNote: '贴纸照明（无效）。', priority: 5, category: 'failure' },
      { recipeId: 'l20_f_bulb_tape', kind: 'combine', inputs: [{ tag: 'light' }, { tag: 'adhesive' }], feedback: '胶带缠灯泡，绝缘层缠得比光还亮——并没有。', galleryNote: '胶带灯罩（未遂）。', priority: 5, category: 'failure' },
    ],
    solutions: [
      { id: 'l20_s_pro', tier: 'professional', predicate: { and: [{ target: 'desk', state: { lit: true } }, { flag: 'solvedTier', equals: 'professional' }] }, endingText: '电池灯泡稳稳发光，报告如期写完。' },
      { id: 'l20_s_tmp', tier: 'temporary', predicate: { and: [{ target: 'desk', state: { lit: true } }, { flag: 'solvedTier', equals: 'temporary' }] }, endingText: '烛光夜战，报告写完，蜡油也滴了一桌。' },
      { id: 'l20_s_abs', tier: 'absurd', predicate: { and: [{ target: 'desk', state: { lit: true } }, { flag: 'solvedTier', equals: 'absurd' }] }, endingText: '手机照明一时爽，第二天充电充到中午。' },
    ],
  },
];
