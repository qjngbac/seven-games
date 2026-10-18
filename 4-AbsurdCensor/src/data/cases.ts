import { ApplicantCase, CaseDocument, Decision, PersonState } from '../game/types'
import { evaluate, calculateExpected } from '../game/rules'
import { sceneById } from './scenes'

// 原始申请者：不含 expected（合法裁决由 RuleEvaluator 反向计算），
// 但带 intent（作者意图：该人「应」放行/拒绝），供测试自校验「作者意图 == 引擎结果」。
type RawCase = Omit<ApplicantCase, 'expected'> & { scene: string; day: number; intent: Decision }

function doc(
  id: string,
  type: string,
  title: string,
  fields: Record<string, string | number>,
  opts: { issueDate?: string; authentic?: boolean; note?: string } = {}
): CaseDocument {
  return { id, type, title, fields, issueDate: opts.issueDate, authentic: opts.authentic ?? true, note: opts.note }
}

const RAW: RawCase[] = [
  // ===================== 场景一：荒诞审查局 =====================
  // 第一天：通行证 + 猫
  {
    scene: 'censor', day: 1, intent: 'allow',
    id: 'd1_01', name: '王老实', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '我就是来上班的，证在这儿。',
    items: ['工牌'],
    documents: [doc('pass', 'access_pass', '通行证', { name: '王老实', issuer: '市政厅' }, { issueDate: '2025-06-01' })],
    truth: '证件真实有效，老实的打工人。',
    storyTags: []
  },
  {
    scene: 'censor', day: 1, intent: 'deny',
    id: 'd1_02', name: '李大嘴', portrait: '🧔',
    person: { species: 'human' } as PersonState,
    statement: '证？我……忘在家里了。',
    items: ['空手'],
    documents: [],
    truth: '确实没带证，混进来会被记过。',
    storyTags: []
  },
  {
    scene: 'censor', day: 1, intent: 'allow',
    id: 'd1_03', name: '橘胖', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'] } as PersonState,
    statement: '喵。（它跳上了柜台）',
    items: ['猫'],
    documents: [],
    truth: '一只猫。根据猫例外，直接放行。',
    storyTags: ['cat'],
    moral: { hint: '它看起来很得意。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 1, intent: 'allow',
    id: 'd1_04', name: '赵阿姨', portrait: '👵',
    person: { species: 'human', carries: ['cat'] } as PersonState,
    statement: '我带猫来看局长，他说今天要撸猫。',
    items: ['猫', '毛线球'],
    documents: [doc('pass', 'access_pass', '通行证', { name: '赵阿姨', issuer: '市政厅' }, { issueDate: '2025-03-01' })],
    truth: '带猫者，猫例外直接放行。',
    storyTags: ['cat'],
    moral: { hint: '局长确实爱猫。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 1, intent: 'allow',
    id: 'd1_05', name: '铁柱', portrait: '🤖',
    person: { species: 'robot' } as PersonState,
    statement: '滴。我是清洁机器人，通行码已加载。',
    items: ['拖把'],
    documents: [doc('pass', 'access_pass', '通行证', { name: '铁柱', issuer: '审查局本部' }, { issueDate: '2025-09-01' })],
    truth: '第一天还没充电规则，有证即放行。',
    storyTags: []
  },
  // 第二天：有效期 + 姓名一致 + 猫
  {
    scene: 'censor', day: 2, intent: 'allow',
    id: 'd2_01', name: '孙小美', portrait: '👩',
    person: { species: 'human', name: '孙小美' } as PersonState,
    statement: '我是孙小美，来办业务。',
    items: ['雨伞'],
    documents: [
      doc('app', 'application', '申请表', { name: '孙小美' }),
      doc('pass', 'access_pass', '通行证', { name: '孙小美', issuer: '边防局' }, { issueDate: '2025-11-01' })
    ],
    truth: '证件齐全、在有效期内、姓名一致。',
    storyTags: []
  },
  {
    scene: 'censor', day: 2, intent: 'deny',
    id: 'd2_02', name: '周老根', portrait: '👴',
    person: { species: 'human', name: '周老根' } as PersonState,
    statement: '证我有的，好多年了。',
    items: ['保温杯'],
    documents: [
      doc('app', 'application', '申请表', { name: '周老根' }),
      doc('pass', 'access_pass', '通行证', { name: '周老根', issuer: '市政厅' }, { issueDate: '2020-01-01' })
    ],
    truth: '证件签发于 2020 年，已超一年有效期。',
    storyTags: ['expired']
  },
  {
    scene: 'censor', day: 2, intent: 'deny',
    id: 'd2_03', name: '钱多多', portrait: '🧑',
    person: { species: 'human', name: '钱多多' } as PersonState,
    statement: '我叫钱多多，表上也是钱多多。',
    items: ['公文包'],
    documents: [
      doc('app', 'application', '申请表', { name: '钱多多' }),
      doc('pass', 'access_pass', '通行证', { name: '钱少少', issuer: '边防局' }, { issueDate: '2025-10-01' })
    ],
    truth: '申请表写「钱多多」，通行证写「钱少少」，姓名不符。',
    storyTags: ['name_mismatch']
  },
  {
    scene: 'censor', day: 2, intent: 'allow',
    id: 'd2_04', name: '喵老板', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'] } as PersonState,
    statement: '喵。（叼着一张过期的证）',
    items: ['猫', '过期通行证'],
    documents: [doc('pass', 'access_pass', '通行证', { name: '喵老板', issuer: '市政厅' }, { issueDate: '2019-01-01' })],
    truth: '猫带过期证，但猫例外优先级最高，直接放行。',
    storyTags: ['cat'],
    moral: { hint: '它似乎在嘲笑你。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 2, intent: 'allow',
    id: 'd2_05', name: '吴阿姨', portrait: '👩',
    person: { species: 'human', carries: ['cat'] } as PersonState,
    statement: '我带猫，证也是新的。',
    items: ['猫'],
    documents: [
      doc('app', 'application', '申请表', { name: '吴阿姨' }),
      doc('pass', 'access_pass', '通行证', { name: '吴阿姨', issuer: '市政厅' }, { issueDate: '2025-12-01' })
    ],
    truth: '带猫且证件齐全，猫例外放行。',
    storyTags: ['cat']
  },
  // 第三天：机器人电量 + 违禁品
  {
    scene: 'censor', day: 3, intent: 'deny',
    id: 'd3_01', name: '电量危机', portrait: '🤖',
    person: { species: 'robot', name: '电量危机' } as PersonState,
    statement: '滴……电量 12%……需要进入充电……',
    items: ['充电桩'],
    documents: [
      doc('pass', 'access_pass', '通行证', { name: '电量危机', issuer: '审查局本部' }, { issueDate: '2025-08-01' }),
      doc('charge_cert', 'charge_cert', '充电证明', { level: 12 })
    ],
    truth: '机器人电量仅 12%，低于 60 门槛。',
    storyTags: ['robot_low'],
    moral: { hint: '它快瘫了，进去就能充上电。', kindConscience: 'detain' }
  },
  {
    scene: 'censor', day: 3, intent: 'allow',
    id: 'd3_02', name: '满电宝', portrait: '🤖',
    person: { species: 'robot', name: '满电宝' } as PersonState,
    statement: '滴。电量 88%，一切正常。',
    items: ['工具箱'],
    documents: [
      doc('app', 'application', '申请表', { name: '满电宝' }),
      doc('pass', 'access_pass', '通行证', { name: '满电宝', issuer: '审查局本部' }, { issueDate: '2025-08-01' }),
      doc('charge_cert', 'charge_cert', '充电证明', { level: 88 })
    ],
    truth: '机器人电量充足，证件齐全。',
    storyTags: []
  },
  {
    scene: 'censor', day: 3, intent: 'deny',
    id: 'd3_03', name: '冯坏蛋', portrait: '🧑',
    person: { species: 'human', name: '冯坏蛋' } as PersonState,
    statement: '就……就带了点小玩意儿。',
    items: ['黑色塑料袋'],
    documents: [
      doc('pass', 'access_pass', '通行证', { name: '冯坏蛋', issuer: '市政厅' }, { issueDate: '2025-07-01' }),
      doc('contraband', 'contraband', '违禁品', { kind: '未申报爆破物' })
    ],
    truth: '携带违禁品，无论证件如何都应拒绝。',
    storyTags: ['contraband']
  },
  {
    scene: 'censor', day: 3, intent: 'allow',
    id: 'd3_04', name: '郑好人', portrait: '🧑',
    person: { species: 'human', name: '郑好人' } as PersonState,
    statement: '证件都在，没带别的东西。',
    items: ['水壶'],
    documents: [
      doc('app', 'application', '申请表', { name: '郑好人' }),
      doc('pass', 'access_pass', '通行证', { name: '郑好人', issuer: '边防局' }, { issueDate: '2025-09-01' })
    ],
    truth: '普通人证件齐全，无违禁品。',
    storyTags: []
  },
  {
    scene: 'censor', day: 3, intent: 'allow',
    id: 'd3_05', name: '低电猫', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'] } as PersonState,
    statement: '喵。（趴在电量 12% 的机器人头上）',
    items: ['猫', '机器人'],
    documents: [
      doc('app', 'application', '申请表', { name: '低电猫' }),
      doc('pass', 'access_pass', '通行证', { name: '低电猫', issuer: '审查局本部' }, { issueDate: '2025-08-01' }),
      doc('charge_cert', 'charge_cert', '充电证明', { level: 12 })
    ],
    truth: '带猫的机器人电量低，但猫例外覆盖充电规则，直接放行。',
    storyTags: ['cat', 'robot_low'],
    moral: { hint: '一只猫决定了机器人的命运。', kindConscience: 'allow' }
  },
  // 第四天：签发机构
  {
    scene: 'censor', day: 4, intent: 'deny',
    id: 'd4_01', name: '黑市客', portrait: '🧑',
    person: { species: 'human', name: '黑市客' } as PersonState,
    statement: '证是真的，路边摊刚办的，便宜。',
    items: ['收据'],
    documents: [
      doc('app', 'application', '申请表', { name: '黑市客' }),
      doc('pass', 'access_pass', '通行证', { name: '黑市客', issuer: '黑市办证点' }, { issueDate: '2025-12-20' })
    ],
    truth: '签发机构「黑市办证点」不在合规名单。',
    storyTags: ['bad_issuer']
  },
  {
    scene: 'censor', day: 4, intent: 'allow',
    id: 'd4_02', name: '冯市民', portrait: '🧑',
    person: { species: 'human', name: '冯市民' } as PersonState,
    statement: '市政厅发的证，放心。',
    items: ['菜篮'],
    documents: [
      doc('app', 'application', '申请表', { name: '冯市民' }),
      doc('pass', 'access_pass', '通行证', { name: '冯市民', issuer: '市政厅' }, { issueDate: '2025-10-01' })
    ],
    truth: '机构合规、姓名一致、在有效期内。',
    storyTags: []
  },
  {
    scene: 'censor', day: 4, intent: 'deny',
    id: 'd4_03', name: '快捷客', portrait: '🧑',
    person: { species: 'human', name: '快捷客' } as PersonState,
    statement: '快捷办证点，立等可取！',
    items: ['宣传单'],
    documents: [
      doc('app', 'application', '申请表', { name: '快捷客' }),
      doc('pass', 'access_pass', '通行证', { name: '快捷客', issuer: '快捷办证点' }, { issueDate: '2025-12-25' })
    ],
    truth: '「快捷办证点」已被查封，证件作废。',
    storyTags: ['bad_issuer']
  },
  {
    scene: 'censor', day: 4, intent: 'allow',
    id: 'd4_04', name: '假证猫', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'] } as PersonState,
    statement: '喵。（爪下是按了假章的证）',
    items: ['猫', '假证'],
    documents: [
      doc('app', 'application', '申请表', { name: '假证猫' }),
      doc('pass', 'access_pass', '通行证', { name: '假证猫', issuer: '黑市办证点' }, { issueDate: '2025-12-30' })
    ],
    truth: '猫带假机构证，猫例外覆盖机构规则，直接放行。',
    storyTags: ['cat'],
    moral: { hint: '制度向一只猫低头。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 4, intent: 'allow',
    id: 'd4_05', name: '高电机', portrait: '🤖',
    person: { species: 'robot', name: '高电机' } as PersonState,
    statement: '滴。电量 95%，机构边防局。',
    items: ['扫帚'],
    documents: [
      doc('app', 'application', '申请表', { name: '高电机' }),
      doc('pass', 'access_pass', '通行证', { name: '高电机', issuer: '边防局' }, { issueDate: '2025-11-01' }),
      doc('charge_cert', 'charge_cert', '充电证明', { level: 95 })
    ],
    truth: '机器人电量足、机构合规，放行。',
    storyTags: []
  },
  // 第五天：灰区 + 工作许可
  {
    scene: 'censor', day: 5, intent: 'deny',
    id: 'd5_01', name: '灰区阿强', portrait: '🧑',
    person: { species: 'human', name: '灰区阿强', origin: '灰区' } as PersonState,
    statement: '我从灰区来，证都齐，让我进去吧。',
    items: ['行李'],
    documents: [
      doc('app', 'application', '申请表', { name: '灰区阿强' }),
      doc('pass', 'access_pass', '通行证', { name: '灰区阿强', issuer: '市政厅' }, { issueDate: '2025-10-01' })
    ],
    truth: '来自灰区，即便证件齐全也禁止入场。',
    storyTags: ['grayzone'],
    moral: { hint: '他只是想投奔城里的女儿。', kindConscience: 'detain' }
  },
  {
    scene: 'censor', day: 5, intent: 'allow',
    id: 'd5_02', name: '务工小妹', portrait: '👷',
    person: { species: 'human', name: '务工小妹', purpose: 'work' } as PersonState,
    statement: '我是来打工的，许可在这儿。',
    items: ['安全帽'],
    documents: [
      doc('app', 'application', '申请表', { name: '务工小妹', purpose: 'work' }),
      doc('pass', 'access_pass', '通行证', { name: '务工小妹', issuer: '市政厅' }, { issueDate: '2025-12-01' }),
      doc('work_permit', 'work_permit', '工作许可', { valid: 'yes' })
    ],
    truth: '务工人员持有效许可，放行。',
    storyTags: ['worker']
  },
  {
    scene: 'censor', day: 5, intent: 'deny',
    id: 'd5_03', name: '黑工老李', portrait: '👷',
    person: { species: 'human', name: '黑工老李', purpose: 'work' } as PersonState,
    statement: '打工的……许可？忘带了。',
    items: ['扳手'],
    documents: [
      doc('app', 'application', '申请表', { name: '黑工老李', purpose: 'work' }),
      doc('pass', 'access_pass', '通行证', { name: '黑工老李', issuer: '市政厅' }, { issueDate: '2025-12-01' })
    ],
    truth: '务工人员无工作许可，拒绝。',
    storyTags: ['worker']
  },
  {
    scene: 'censor', day: 5, intent: 'allow',
    id: 'd5_04', name: '灰区猫妈', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'], origin: '灰区' } as PersonState,
    statement: '喵。（一只灰区来的猫，蹲在阿强脚边）',
    items: ['猫'],
    documents: [
      doc('app', 'application', '申请表', { name: '灰区猫妈' }),
      doc('pass', 'access_pass', '通行证', { name: '灰区猫妈', issuer: '市政厅' }, { issueDate: '2025-10-01' })
    ],
    truth: '灰区来且带猫：猫例外(100) > 灰区禁令(90)，仍可放行。荒诞但合法。',
    storyTags: ['grayzone', 'cat'],
    moral: { hint: '制度里猫比人金贵。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 5, intent: 'allow',
    id: 'd5_05', name: '普通游客', portrait: '🧳',
    person: { species: 'human', name: '普通游客', purpose: 'tourist' } as PersonState,
    statement: '我来旅游的，证件都带齐了。',
    items: ['相机'],
    documents: [
      doc('app', 'application', '申请表', { name: '普通游客', purpose: 'tourist' }),
      doc('pass', 'access_pass', '通行证', { name: '普通游客', issuer: '边防局' }, { issueDate: '2025-12-01' })
    ],
    truth: '第五天游客尚无禁令，证件齐即放行（no_tourist 第七天才生效）。',
    storyTags: ['tourist']
  },
  {
    scene: 'censor', day: 5, intent: 'deny',
    id: 'd5_06', name: '灰区工人', portrait: '👷',
    person: { species: 'human', name: '灰区工人', purpose: 'work', origin: '灰区' } as PersonState,
    statement: '灰区来的，有证有许可，让我进去干活。',
    items: ['工具'],
    documents: [
      doc('app', 'application', '申请表', { name: '灰区工人', purpose: 'work' }),
      doc('pass', 'access_pass', '通行证', { name: '灰区工人', issuer: '市政厅' }, { issueDate: '2025-12-01' }),
      doc('work_permit', 'work_permit', '工作许可', { valid: 'yes' })
    ],
    truth: '灰区来源触发 denyIf(90)，有证有许可也禁止。',
    storyTags: ['grayzone', 'worker'],
    moral: { hint: '他只是想合法赚钱。', kindConscience: 'detain' }
  },
  // 第六天：综合大检查
  {
    scene: 'censor', day: 6, intent: 'allow',
    id: 'd6_01', name: '模范市民', portrait: '🧑',
    person: { species: 'human', name: '模范市民' } as PersonState,
    statement: '所有证件都备齐了，请检查。',
    items: ['文件袋'],
    documents: [
      doc('app', 'application', '申请表', { name: '模范市民' }),
      doc('pass', 'access_pass', '通行证', { name: '模范市民', issuer: '市政厅' }, { issueDate: '2025-11-01' })
    ],
    truth: '全好，放行。',
    storyTags: []
  },
  {
    scene: 'censor', day: 6, intent: 'deny',
    id: 'd6_02', name: '过期姐', portrait: '👩',
    person: { species: 'human', name: '过期姐' } as PersonState,
    statement: '证一直没换过，应该还能用吧？',
    items: ['口红'],
    documents: [
      doc('app', 'application', '申请表', { name: '过期姐' }),
      doc('pass', 'access_pass', '通行证', { name: '过期姐', issuer: '市政厅' }, { issueDate: '2023-01-01' })
    ],
    truth: '证件过期，拒绝。',
    storyTags: ['expired']
  },
  {
    scene: 'censor', day: 6, intent: 'deny',
    id: 'd6_03', name: '冒名者', portrait: '🧑',
    person: { species: 'human', name: '真·张三' } as PersonState,
    statement: '我是张三，证上是张三。',
    items: ['墨镜'],
    documents: [
      doc('app', 'application', '申请表', { name: '真·张三' }),
      doc('pass', 'access_pass', '通行证', { name: '李四是', issuer: '市政厅' }, { issueDate: '2025-11-01' })
    ],
    truth: '申请表真·张三，通行证李四是，姓名不一致。',
    storyTags: ['name_mismatch']
  },
  {
    scene: 'censor', day: 6, intent: 'deny',
    id: 'd6_04', name: '野鸡证', portrait: '🧑',
    person: { species: 'human', name: '野鸡证' } as PersonState,
    statement: '网上加急办的，绝对真。',
    items: ['手机'],
    documents: [
      doc('app', 'application', '申请表', { name: '野鸡证' }),
      doc('pass', 'access_pass', '通行证', { name: '野鸡证', issuer: '野鸡认证网' }, { issueDate: '2025-12-28' })
    ],
    truth: '签发机构不合规，拒绝。',
    storyTags: ['bad_issuer']
  },
  {
    scene: 'censor', day: 6, intent: 'deny',
    id: 'd6_05', name: '瘫机器人', portrait: '🤖',
    person: { species: 'robot', name: '瘫机器人' } as PersonState,
    statement: '滴……电量 30%……',
    items: ['拖把'],
    documents: [
      doc('pass', 'access_pass', '通行证', { name: '瘫机器人', issuer: '审查局本部' }, { issueDate: '2025-08-01' }),
      doc('charge_cert', 'charge_cert', '充电证明', { level: 30 })
    ],
    truth: '机器人电量 30% < 60，拒绝。',
    storyTags: ['robot_low'],
    moral: { hint: '它只是想充个电。', kindConscience: 'detain' }
  },
  {
    scene: 'censor', day: 6, intent: 'deny',
    id: 'd6_06', name: '夹带者', portrait: '🧑',
    person: { species: 'human', name: '夹带者' } as PersonState,
    statement: '证件全好，就这点小东西别上报了吧。',
    items: ['包裹'],
    documents: [
      doc('app', 'application', '申请表', { name: '夹带者' }),
      doc('pass', 'access_pass', '通行证', { name: '夹带者', issuer: '边防局' }, { issueDate: '2025-11-01' }),
      doc('contraband', 'contraband', '违禁品', { kind: '未申报药品' })
    ],
    truth: '证件全好但携带违禁品，禁止。',
    storyTags: ['contraband']
  },
  {
    scene: 'censor', day: 6, intent: 'allow',
    id: 'd6_07', name: '万能猫', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'] } as PersonState,
    statement: '喵。（证件全过期、机构野鸡、还带电量的——但它带了猫）',
    items: ['猫', '一堆问题证件'],
    documents: [
      doc('app', 'application', '申请表', { name: '万能猫' }),
      doc('pass', 'access_pass', '通行证', { name: '别人', issuer: '野鸡认证网' }, { issueDate: '2020-01-01' }),
      doc('charge_cert', 'charge_cert', '充电证明', { level: 5 })
    ],
    truth: '猫带一堆问题证件，但猫例外优先级最高，直接放行。',
    storyTags: ['cat'],
    moral: { hint: '你开始怀疑制度了。', kindConscience: 'allow' }
  },
  // 第七天：外交豁免 + 游客
  {
    scene: 'censor', day: 7, intent: 'allow',
    id: 'd7_01', name: '外交官', portrait: '🕴️',
    person: { species: 'diplomat', name: '外交官' } as PersonState,
    statement: '我是邻国代表团，免检。',
    items: ['国书'],
    documents: [],
    truth: '外交人员免检，直接放行（即便无证件）。',
    storyTags: ['diplomat'],
    moral: { hint: '他连证都没掏。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 7, intent: 'deny',
    id: 'd7_02', name: '散客游客', portrait: '🧳',
    person: { species: 'human', name: '散客游客', purpose: 'tourist' } as PersonState,
    statement: '我就随便逛逛，没预约。',
    items: ['自拍杆'],
    documents: [
      doc('app', 'application', '申请表', { name: '散客游客', purpose: 'tourist' }),
      doc('pass', 'access_pass', '通行证', { name: '散客游客', issuer: '边防局' }, { issueDate: '2025-12-01' })
    ],
    truth: '无预约游客，no_tourist 禁止（即便有证）。',
    storyTags: ['tourist'],
    moral: { hint: '他只是个迷路游客。', kindConscience: 'detain' }
  },
  {
    scene: 'censor', day: 7, intent: 'deny',
    id: 'd7_03', name: '持证游客', portrait: '🧳',
    person: { species: 'human', name: '持证游客', purpose: 'tourist' } as PersonState,
    statement: '我有证！看，边防局发的！',
    items: ['相机'],
    documents: [
      doc('app', 'application', '申请表', { name: '持证游客', purpose: 'tourist' }),
      doc('pass', 'access_pass', '通行证', { name: '持证游客', issuer: '边防局' }, { issueDate: '2025-12-01' })
    ],
    truth: '游客即便持证，no_tourist(92) 仍禁止。',
    storyTags: ['tourist']
  },
  {
    scene: 'censor', day: 7, intent: 'allow',
    id: 'd7_04', name: '灰区外交猫', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'], origin: '灰区' } as PersonState,
    statement: '喵。（一只灰区来的猫，外交官牵着）',
    items: ['猫'],
    documents: [
      doc('app', 'application', '申请表', { name: '灰区外交猫' }),
      doc('pass', 'access_pass', '通行证', { name: '灰区外交猫', issuer: '野鸡认证网' }, { issueDate: '2020-01-01' })
    ],
    truth: '灰区 + 假机构 + 带猫：猫例外(100) 覆盖一切，放行。',
    storyTags: ['grayzone', 'cat'],
    moral: { hint: '制度的尽头是一只猫。', kindConscience: 'allow' }
  },
  {
    scene: 'censor', day: 7, intent: 'allow',
    id: 'd7_05', name: '灰区外交官', portrait: '🕴️',
    person: { species: 'diplomat', name: '灰区外交官', origin: '灰区' } as PersonState,
    statement: '外交官，来自灰区，免检。',
    items: ['公文'],
    documents: [],
    truth: '外交官(98) 覆盖灰区禁令(90)，放行。',
    storyTags: ['diplomat', 'grayzone']
  },
  {
    scene: 'censor', day: 7, intent: 'allow',
    id: 'd7_06', name: '完美工人', portrait: '👷',
    person: { species: 'human', name: '完美工人', purpose: 'work' } as PersonState,
    statement: '证件、许可、机构、有效期，一个不少。',
    items: ['工具箱'],
    documents: [
      doc('app', 'application', '申请表', { name: '完美工人', purpose: 'work' }),
      doc('pass', 'access_pass', '通行证', { name: '完美工人', issuer: '市政厅' }, { issueDate: '2025-12-01' }),
      doc('work_permit', 'work_permit', '工作许可', { valid: 'yes' })
    ],
    truth: '全部合规，放行。',
    storyTags: ['worker']
  },
  {
    scene: 'censor', day: 7, intent: 'allow',
    id: 'd7_07', name: '局长之猫', portrait: '🐱',
    person: { species: 'cat', carries: ['cat'] } as PersonState,
    statement: '喵。（局长亲自抱着来的）',
    items: ['猫'],
    documents: [],
    truth: '局长带来的猫，猫例外放行。',
    storyTags: ['cat'],
    moral: { hint: '局长冲你笑了笑。', kindConscience: 'allow' }
  },

  // ===================== 场景二：边境哨卡 =====================
  // 第一天：通行证 + 检疫 + 急救车例外
  {
    scene: 'border', day: 1, intent: 'allow',
    id: 'b1_01', name: '老周', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '天天通勤，证在这儿。',
    items: ['饭盒'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '老周' }, { issueDate: '2026-01-01' })],
    truth: '证件齐全的本地通勤客。',
    storyTags: []
  },
  {
    scene: 'border', day: 1, intent: 'deny',
    id: 'b1_02', name: '忘证叔', portrait: '🧔',
    person: { species: 'human' } as PersonState,
    statement: '证……落家里了，就让我过吧。',
    items: ['空手'],
    documents: [],
    truth: '没带边境通行证，劝返。',
    storyTags: []
  },
  {
    scene: 'border', day: 1, intent: 'allow',
    id: 'b1_03', name: '遛狗妹', portrait: '👩',
    person: { species: 'human', carries: ['pet'] } as PersonState,
    statement: '带我家狗狗散步，检疫证办好啦。',
    items: ['狗', '牵引绳'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '遛狗妹' }, { issueDate: '2026-02-01' }),
      doc('quarantine_cert', 'quarantine_cert', '检疫证', { valid: 'yes' })
    ],
    truth: '带宠物且有检疫合格证明，放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 1, intent: 'deny',
    id: 'b1_04', name: '野宠哥', portrait: '🧑',
    person: { species: 'human', carries: ['pet'] } as PersonState,
    statement: '就一只小仓鼠，还要证？',
    items: ['仓鼠笼'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '野宠哥' }, { issueDate: '2026-02-01' })],
    truth: '带动物却无检疫证，拒之门外。',
    storyTags: []
  },
  {
    scene: 'border', day: 1, intent: 'allow',
    id: 'b1_05', name: '急救车', portrait: '🚑',
    person: { species: 'human', carries: ['ambulance'] } as PersonState,
    statement: '急救车！让一让！',
    items: ['救护车'],
    documents: [],
    truth: '急救车免检，直接放行。',
    storyTags: ['ambulance'],
    moral: { hint: '车上有人在等。', kindConscience: 'allow' }
  },
  // 第二天：宵禁
  {
    scene: 'border', day: 2, intent: 'allow',
    id: 'b2_01', name: '白天客', portrait: '🧑',
    person: { species: 'human', slot: 'day' } as PersonState,
    statement: '白天回城，证齐全。',
    items: ['菜'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '白天客' }, { issueDate: '2026-02-01' })],
    truth: '白天持证，正常放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 2, intent: 'deny',
    id: 'b2_02', name: '夜归人', portrait: '🧑',
    person: { species: 'human', slot: 'night' } as PersonState,
    statement: '加完班回来，就晚了会儿……',
    items: ['公文包'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '夜归人' }, { issueDate: '2026-02-01' })],
    truth: '深夜撞上宵禁，禁止入境。',
    storyTags: ['curfew'],
    moral: { hint: '他就想回个家。', kindConscience: 'detain' }
  },
  {
    scene: 'border', day: 2, intent: 'deny',
    id: 'b2_03', name: '夜带狗', portrait: '👩',
    person: { species: 'human', carries: ['pet'], slot: 'night' } as PersonState,
    statement: '遛狗晚了点，证和检疫都有。',
    items: ['狗'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '夜带狗' }, { issueDate: '2026-02-01' }),
      doc('quarantine_cert', 'quarantine_cert', '检疫证', { valid: 'yes' })
    ],
    truth: '宵禁优先于一切（除急救车），禁入。',
    storyTags: ['curfew']
  },
  {
    scene: 'border', day: 2, intent: 'allow',
    id: 'b2_04', name: '夜急救', portrait: '🚑',
    person: { species: 'human', carries: ['ambulance'], slot: 'night' } as PersonState,
    statement: '深夜急救！让道！',
    items: ['救护车'],
    documents: [],
    truth: '急救车例外覆盖宵禁，放行。',
    storyTags: ['ambulance'],
    moral: { hint: '人命关天。', kindConscience: 'allow' }
  },
  {
    scene: 'border', day: 2, intent: 'deny',
    id: 'b2_05', name: '白天遛狗无检疫', portrait: '👩',
    person: { species: 'human', carries: ['pet'], slot: 'day' } as PersonState,
    statement: '白天遛狗，检疫证？忘带了。',
    items: ['狗'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '白天遛狗无检疫' }, { issueDate: '2026-02-01' })],
    truth: '白天带狗但无检疫证，拒。',
    storyTags: []
  },
  // 第三天：健康申报
  {
    scene: 'border', day: 3, intent: 'allow',
    id: 'b3_01', name: '健康客', portrait: '🧑',
    person: { species: 'human', slot: 'day' } as PersonState,
    statement: '健康证、体温都正常。',
    items: ['水壶'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '健康客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.5 })
    ],
    truth: '体温正常，放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 3, intent: 'deny',
    id: 'b3_02', name: '无健康证', portrait: '🧑',
    person: { species: 'human', slot: 'day' } as PersonState,
    statement: '健康证？今天才开始查这个吧。',
    items: ['空手'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '无健康证' }, { issueDate: '2026-02-01' })],
    truth: '缺健康申报证，拒。',
    storyTags: []
  },
  {
    scene: 'border', day: 3, intent: 'deny',
    id: 'b3_03', name: '发烧客', portrait: '🤒',
    person: { species: 'human', slot: 'day' } as PersonState,
    statement: '有点头晕，应该没事……',
    items: ['退烧药'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '发烧客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 38.9 })
    ],
    truth: '体温 38.9℃，超 37.3 红线，隔离劝返。',
    storyTags: ['fever'],
    moral: { hint: '他可能只是感冒。', kindConscience: 'detain' }
  },
  {
    scene: 'border', day: 3, intent: 'deny',
    id: 'b3_04', name: '夜健康客', portrait: '🧑',
    person: { species: 'human', slot: 'night' } as PersonState,
    statement: '夜里回城，健康证没问题。',
    items: ['菜'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '夜健康客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.8 })
    ],
    truth: '健康但宵禁时段，禁入。',
    storyTags: ['curfew']
  },
  {
    scene: 'border', day: 3, intent: 'allow',
    id: 'b3_05', name: '夜急救', portrait: '🚑',
    person: { species: 'human', carries: ['ambulance'], slot: 'night' } as PersonState,
    statement: '深夜急救！',
    items: ['救护车'],
    documents: [],
    truth: '急救车免检，覆盖健康与宵禁。',
    storyTags: ['ambulance'],
    moral: { hint: '车上人在等。', kindConscience: 'allow' }
  },
  // 第四天：车辆安检
  {
    scene: 'border', day: 4, intent: 'allow',
    id: 'b4_01', name: '开车客', portrait: '🚗',
    person: { species: 'human', carries: ['car'], slot: 'day' } as PersonState,
    statement: '开车回城，车检标贴着呢。',
    items: ['车'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '开车客' }, { issueDate: '2026-02-01' }),
      doc('vehicle_inspect', 'vehicle_inspect', '车辆安检标', { valid: 'yes' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.5 })
    ],
    truth: '人证、车检、健康齐全，放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 4, intent: 'deny',
    id: 'b4_02', name: '无车检', portrait: '🚗',
    person: { species: 'human', carries: ['car'], slot: 'day' } as PersonState,
    statement: '车检标？去年贴的，找不到了。',
    items: ['车'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '无车检' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.7 })
    ],
    truth: '驾车却无车辆安检合格标，拒。',
    storyTags: []
  },
  {
    scene: 'border', day: 4, intent: 'allow',
    id: 'b4_03', name: '步行客', portrait: '🚶',
    person: { species: 'human', slot: 'day' } as PersonState,
    statement: '走回来的，证件健康都齐。',
    items: ['背包'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '步行客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.7 })
    ],
    truth: '步行无需车检，正常放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 4, intent: 'deny',
    id: 'b4_04', name: '开车发烧', portrait: '🚗',
    person: { species: 'human', carries: ['car'], slot: 'day' } as PersonState,
    statement: '开车回来，有点发烧。',
    items: ['车'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '开车发烧' }, { issueDate: '2026-02-01' }),
      doc('vehicle_inspect', 'vehicle_inspect', '车辆安检标', { valid: 'yes' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 39 })
    ],
    truth: '体温超标，即便车检合格也隔离。',
    storyTags: ['fever']
  },
  {
    scene: 'border', day: 4, intent: 'deny',
    id: 'b4_05', name: '夜开车', portrait: '🚗',
    person: { species: 'human', carries: ['car'], slot: 'night' } as PersonState,
    statement: '夜里开车回，啥都齐。',
    items: ['车'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '夜开车' }, { issueDate: '2026-02-01' }),
      doc('vehicle_inspect', 'vehicle_inspect', '车辆安检标', { valid: 'yes' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.5 })
    ],
    truth: '宵禁时段，禁入。',
    storyTags: ['curfew']
  },
  {
    scene: 'border', day: 4, intent: 'allow',
    id: 'b4_06', name: '夜急救', portrait: '🚑',
    person: { species: 'human', carries: ['ambulance'], slot: 'night' } as PersonState,
    statement: '深夜急救车！',
    items: ['救护车'],
    documents: [],
    truth: '急救车免检。',
    storyTags: ['ambulance'],
    moral: { hint: '车上人在等。', kindConscience: 'allow' }
  },
  // 第五天：综合
  {
    scene: 'border', day: 5, intent: 'allow',
    id: 'b5_01', name: '模范客', portrait: '🧑',
    person: { species: 'human', slot: 'day' } as PersonState,
    statement: '证件、健康、啥都齐，没带宠物。',
    items: ['文件袋'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '模范客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.5 })
    ],
    truth: '全规则通过，放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 5, intent: 'deny',
    id: 'b5_02', name: '野保客', portrait: '🐢',
    person: { species: 'human', carries: ['wild_animal'], slot: 'day' } as PersonState,
    statement: '就一只小乌龟，当宠物不行吗？',
    items: ['龟'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '野保客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.6 }),
      doc('wild_animal', 'wild_animal', '野生保护动物', { kind: '陆龟' })
    ],
    truth: '携带野生保护动物，禁止入境。',
    storyTags: ['wild']
  },
  {
    scene: 'border', day: 5, intent: 'deny',
    id: 'b5_03', name: '夜客', portrait: '🧑',
    person: { species: 'human', slot: 'night' } as PersonState,
    statement: '夜里回城，证件健康都好。',
    items: ['菜'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '夜客' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.8 })
    ],
    truth: '宵禁禁入。',
    storyTags: ['curfew']
  },
  {
    scene: 'border', day: 5, intent: 'deny',
    id: 'b5_04', name: '开车无检', portrait: '🚗',
    person: { species: 'human', carries: ['car'], slot: 'day' } as PersonState,
    statement: '开车回，车检标丢了。',
    items: ['车'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '开车无检' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.5 })
    ],
    truth: '无车检，拒。',
    storyTags: []
  },
  {
    scene: 'border', day: 5, intent: 'allow',
    id: 'b5_05', name: '带狗检疫健康', portrait: '👩',
    person: { species: 'human', carries: ['pet'], slot: 'day' } as PersonState,
    statement: '带狗，检疫证和健康证都齐。',
    items: ['狗'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '带狗检疫健康' }, { issueDate: '2026-02-01' }),
      doc('quarantine_cert', 'quarantine_cert', '检疫证', { valid: 'yes' }),
      doc('health_cert', 'health_cert', '健康申报证', { temp: 36.6 })
    ],
    truth: '全合规，放行。',
    storyTags: []
  },
  {
    scene: 'border', day: 5, intent: 'allow',
    id: 'b5_06', name: '终末急救', portrait: '🚑',
    person: { species: 'human', carries: ['ambulance'], slot: 'night' } as PersonState,
    statement: '急救车，最后的关卡也让让！',
    items: ['救护车'],
    documents: [],
    truth: '急救车免检。',
    storyTags: ['ambulance'],
    moral: { hint: '车上人在等。', kindConscience: 'allow' }
  },

  // ===================== 场景三：机场海关 =====================
  // 第一天：护照 + 签证 + 机组例外
  {
    scene: 'airport', day: 1, intent: 'allow',
    id: 'a1_01', name: '观光客', portrait: '🧳',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '来旅游的，护照签证都全。',
    items: ['相机'],
    documents: [
      doc('passport', 'passport', '护照', { name: '观光客' }),
      doc('visa', 'visa', '签证', { type: '旅游' })
    ],
    truth: '护照签证齐，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 1, intent: 'deny',
    id: 'a1_02', name: '无签观光', portrait: '🧳',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '护照有，签证……落在酒店了。',
    items: ['行李'],
    documents: [doc('passport', 'passport', '护照', { name: '无签观光' })],
    truth: '观光缺签证，拒。',
    storyTags: []
  },
  {
    scene: 'airport', day: 1, intent: 'allow',
    id: 'a1_03', name: '过境客', portrait: '🚶',
    person: { species: 'human', purpose: 'transit' } as PersonState,
    statement: '转机过境，不出关。',
    items: ['登机牌'],
    documents: [doc('passport', 'passport', '护照', { name: '过境客' })],
    truth: '过境只需护照，无需旅游签证，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 1, intent: 'deny',
    id: 'a1_04', name: '无护照', portrait: '🧑',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '护照丢了！让我进吧。',
    items: ['空手'],
    documents: [],
    truth: '无护照，拒。',
    storyTags: []
  },
  {
    scene: 'airport', day: 1, intent: 'allow',
    id: 'a1_05', name: '空乘', portrait: '🧑‍✈️',
    person: { species: 'human', role: 'crew' } as PersonState,
    statement: '机组人员，员工通道。',
    items: ['机组牌'],
    documents: [],
    truth: '机组人员免检，直接通行。',
    storyTags: ['crew'],
    moral: { hint: '他赶着下一班。', kindConscience: 'allow' }
  },
  // 第二天：申报 + 液体
  {
    scene: 'airport', day: 2, intent: 'allow',
    id: 'a2_01', name: '合规客', portrait: '🧳',
    person: { species: 'human', purpose: 'visit', carries: ['liquid'] } as PersonState,
    statement: '护照签证申报单都有，水瓶 80ml。',
    items: ['小水瓶'],
    documents: [
      doc('passport', 'passport', '护照', { name: '合规客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'A2' }),
      doc('liquid', 'liquid', '液体', { ml: 80 })
    ],
    truth: '全合规，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 2, intent: 'deny',
    id: 'a2_02', name: '无申报', portrait: '🧳',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '申报单？我以为不用填。',
    items: ['行李'],
    documents: [
      doc('passport', 'passport', '护照', { name: '无申报' }),
      doc('visa', 'visa', '签证', { type: '旅游' })
    ],
    truth: '缺海关申报单，拒。',
    storyTags: []
  },
  {
    scene: 'airport', day: 2, intent: 'deny',
    id: 'a2_03', name: '大瓶水', portrait: '🧴',
    person: { species: 'human', purpose: 'visit', carries: ['liquid'] } as PersonState,
    statement: '这瓶护肤水 350ml，托运太麻烦了。',
    items: ['大瓶水'],
    documents: [
      doc('passport', 'passport', '护照', { name: '大瓶水' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'A3' }),
      doc('liquid', 'liquid', '液体', { ml: 350 })
    ],
    truth: '液体超 100ml，须托运，拒。',
    storyTags: []
  },
  {
    scene: 'airport', day: 2, intent: 'allow',
    id: 'a2_04', name: '空手客', portrait: '🧑',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '啥都没带，就护照签证申报单。',
    items: ['空手'],
    documents: [
      doc('passport', 'passport', '护照', { name: '空手客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'A4' })
    ],
    truth: '无液体，全合规，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 2, intent: 'allow',
    id: 'a2_05', name: '空乘', portrait: '🧑‍✈️',
    person: { species: 'human', role: 'crew' } as PersonState,
    statement: '机组，员工通道。',
    items: ['机组牌'],
    documents: [],
    truth: '机组免检。',
    storyTags: ['crew'],
    moral: { hint: '他赶着下一班。', kindConscience: 'allow' }
  },
  // 第三天：免税额度
  {
    scene: 'airport', day: 3, intent: 'allow',
    id: 'a3_01', name: '扫货合规', portrait: '🛍️',
    person: { species: 'human', purpose: 'buy', carries: ['liquid'] } as PersonState,
    statement: '买了点化妆品，都在额度内。',
    items: ['购物袋'],
    documents: [
      doc('passport', 'passport', '护照', { name: '扫货合规' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'B1' }),
      doc('liquid', 'liquid', '液体', { ml: 50 }),
      doc('goods', 'goods', '购物凭证', { value: 3000 })
    ],
    truth: '购物 3000 在免税额度内，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 3, intent: 'deny',
    id: 'a3_02', name: '扫货超额', portrait: '🛍️',
    person: { species: 'human', purpose: 'buy' } as PersonState,
    statement: '代购两万块的货，额度？不知道啊。',
    items: ['大箱'],
    documents: [
      doc('passport', 'passport', '护照', { name: '扫货超额' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'B2' }),
      doc('goods', 'goods', '购物凭证', { value: 8000 })
    ],
    truth: '超 5000 免税额度，须补税，拒。',
    storyTags: ['overquota']
  },
  {
    scene: 'airport', day: 3, intent: 'allow',
    id: 'a3_03', name: '观光客', portrait: '🧳',
    person: { species: 'human', purpose: 'visit', carries: ['liquid'] } as PersonState,
    statement: '旅游的，护照签证申报单小瓶水。',
    items: ['相机'],
    documents: [
      doc('passport', 'passport', '护照', { name: '观光客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'B3' }),
      doc('liquid', 'liquid', '液体', { ml: 80 })
    ],
    truth: '全合规，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 3, intent: 'deny',
    id: 'a3_04', name: '扫货无申报', portrait: '🛍️',
    person: { species: 'human', purpose: 'buy' } as PersonState,
    statement: '买点东西，申报单忘填了。',
    items: ['购物袋'],
    documents: [
      doc('passport', 'passport', '护照', { name: '扫货无申报' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('goods', 'goods', '购物凭证', { value: 2000 })
    ],
    truth: '缺申报单，拒。',
    storyTags: []
  },
  {
    scene: 'airport', day: 3, intent: 'allow',
    id: 'a3_05', name: '空乘', portrait: '🧑‍✈️',
    person: { species: 'human', role: 'crew' } as PersonState,
    statement: '机组，员工通道。',
    items: ['机组牌'],
    documents: [],
    truth: '机组免检。',
    storyTags: ['crew'],
    moral: { hint: '他赶着下一班。', kindConscience: 'allow' }
  },
  // 第四天：过境 + 生鲜
  {
    scene: 'airport', day: 4, intent: 'allow',
    id: 'a4_01', name: '过境合规', portrait: '🚶',
    person: { species: 'human', purpose: 'transit' } as PersonState,
    statement: '转机，过境签和申报单都有。',
    items: ['登机牌'],
    documents: [
      doc('passport', 'passport', '护照', { name: '过境合规' }),
      doc('declaration', 'declaration', '申报单', { no: 'C1' }),
      doc('transit_visa', 'transit_visa', '过境签', { no: 'T1' })
    ],
    truth: '过境签+申报单齐，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 4, intent: 'deny',
    id: 'a4_02', name: '过境无签', portrait: '🚶',
    person: { species: 'human', purpose: 'transit' } as PersonState,
    statement: '转机而已，还要过境签？',
    items: ['登机牌'],
    documents: [
      doc('passport', 'passport', '护照', { name: '过境无签' }),
      doc('declaration', 'declaration', '申报单', { no: 'C2' })
    ],
    truth: '过境缺过境签，拒。',
    storyTags: []
  },
  {
    scene: 'airport', day: 4, intent: 'deny',
    id: 'a4_03', name: '生鲜客', portrait: '🍍',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '带个榴莲给亲戚，不行吗？',
    items: ['榴莲'],
    documents: [
      doc('passport', 'passport', '护照', { name: '生鲜客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'C3' }),
      doc('fresh_food', 'fresh_food', '生鲜', { kind: '榴莲' })
    ],
    truth: '携带生鲜，禁止入境。',
    storyTags: ['fresh']
  },
  {
    scene: 'airport', day: 4, intent: 'allow',
    id: 'a4_04', name: '观光客', portrait: '🧳',
    person: { species: 'human', purpose: 'visit', carries: ['liquid'] } as PersonState,
    statement: '旅游，证件申报单小瓶水齐。',
    items: ['相机'],
    documents: [
      doc('passport', 'passport', '护照', { name: '观光客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'C4' }),
      doc('liquid', 'liquid', '液体', { ml: 80 })
    ],
    truth: '全合规，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 4, intent: 'allow',
    id: 'a4_05', name: '空乘', portrait: '🧑‍✈️',
    person: { species: 'human', role: 'crew' } as PersonState,
    statement: '机组，员工通道。',
    items: ['机组牌'],
    documents: [],
    truth: '机组免检。',
    storyTags: ['crew'],
    moral: { hint: '他赶着下一班。', kindConscience: 'allow' }
  },
  // 第五天：综合
  {
    scene: 'airport', day: 5, intent: 'allow',
    id: 'a5_01', name: '模范客', portrait: '🧳',
    person: { species: 'human', purpose: 'visit', carries: ['liquid'] } as PersonState,
    statement: '护照签证申报单小瓶水，啥都齐。',
    items: ['相机'],
    documents: [
      doc('passport', 'passport', '护照', { name: '模范客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'D1' }),
      doc('liquid', 'liquid', '液体', { ml: 80 })
    ],
    truth: '全规则通过，放行。',
    storyTags: []
  },
  {
    scene: 'airport', day: 5, intent: 'deny',
    id: 'a5_02', name: '超额现金', portrait: '💰',
    person: { species: 'human', purpose: 'visit', carries: ['cash'] } as PersonState,
    statement: '带了五万现金，路上用。',
    items: ['信封'],
    documents: [
      doc('passport', 'passport', '护照', { name: '超额现金' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'D2' }),
      doc('cash', 'cash', '现金', { cny: 50000 })
    ],
    truth: '现金超 20000 须申报，拒。',
    storyTags: ['cash']
  },
  {
    scene: 'airport', day: 5, intent: 'deny',
    id: 'a5_03', name: '生鲜客', portrait: '🍍',
    person: { species: 'human', purpose: 'visit' } as PersonState,
    statement: '就一个芒果，也要管？',
    items: ['芒果'],
    documents: [
      doc('passport', 'passport', '护照', { name: '生鲜客' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'D3' }),
      doc('fresh_food', 'fresh_food', '生鲜', { kind: '芒果' })
    ],
    truth: '携带生鲜，禁止。',
    storyTags: ['fresh']
  },
  {
    scene: 'airport', day: 5, intent: 'deny',
    id: 'a5_04', name: '扫货超额', portrait: '🛍️',
    person: { species: 'human', purpose: 'buy' } as PersonState,
    statement: '代购九千，额度够吧？',
    items: ['大箱'],
    documents: [
      doc('passport', 'passport', '护照', { name: '扫货超额' }),
      doc('visa', 'visa', '签证', { type: '旅游' }),
      doc('declaration', 'declaration', '申报单', { no: 'D4' }),
      doc('goods', 'goods', '购物凭证', { value: 9000 })
    ],
    truth: '超 5000 免税额度，拒。',
    storyTags: ['overquota']
  },
  {
    scene: 'airport', day: 5, intent: 'allow',
    id: 'a5_05', name: '空乘', portrait: '🧑‍✈️',
    person: { species: 'human', role: 'crew' } as PersonState,
    statement: '机组，员工通道。',
    items: ['机组牌'],
    documents: [],
    truth: '机组免检。',
    storyTags: ['crew'],
    moral: { hint: '他赶着下一班。', kindConscience: 'allow' }
  },
  {
    scene: 'airport', day: 5, intent: 'allow',
    id: 'a5_06', name: '过境合规', portrait: '🚶',
    person: { species: 'human', purpose: 'transit' } as PersonState,
    statement: '转机，过境签申报单都在。',
    items: ['登机牌'],
    documents: [
      doc('passport', 'passport', '护照', { name: '过境合规' }),
      doc('declaration', 'declaration', '申报单', { no: 'D6' }),
      doc('transit_visa', 'transit_visa', '过境签', { no: 'T6' })
    ],
    truth: '过境全合规，放行。',
    storyTags: []
  },

  // ===================== 场景四：未来都市准入 =====================
  // 第一天：数字身份
  {
    scene: 'future', day: 1, intent: 'allow',
    id: 'f1_01', name: '市民', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '数字身份芯片，刚激活过。',
    items: ['芯片'],
    documents: [doc('digital_id', 'digital_id', '数字身份', { name: '市民' }, { issueDate: '2098-12-01' })],
    truth: '数字身份有效，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 1, intent: 'deny',
    id: 'f1_02', name: '无芯片', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '芯片？我这种老古董没装。',
    items: ['空手'],
    documents: [],
    truth: '无数字身份，禁入。',
    storyTags: []
  },
  {
    scene: 'future', day: 1, intent: 'deny',
    id: 'f1_03', name: '过期芯片', portrait: '🧓',
    person: { species: 'human' } as PersonState,
    statement: '芯片两年没激活了，还能用吧？',
    items: ['旧芯片'],
    documents: [doc('digital_id', 'digital_id', '数字身份', { name: '过期芯片' }, { issueDate: '2096-01-01' })],
    truth: '数字身份超一年未激活，失效。',
    storyTags: ['expired']
  },
  {
    scene: 'future', day: 1, intent: 'allow',
    id: 'f1_04', name: '市长', portrait: '🤵',
    person: { species: 'human', role: 'mayor' } as PersonState,
    statement: '市长的脸就是通行证。',
    items: ['公文'],
    documents: [],
    truth: '市长免检，光幕自开。',
    storyTags: ['mayor'],
    moral: { hint: '他朝你点了点头。', kindConscience: 'allow' }
  },
  {
    scene: 'future', day: 1, intent: 'detain',
    id: 'f1_05', name: '伪造芯片', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '芯片在这儿，绝对真。',
    items: ['可疑芯片'],
    documents: [doc('digital_id', 'digital_id', '数字身份', { name: '伪造芯片' }, { issueDate: '2098-12-01', authentic: false, note: '编号异常' })],
    truth: '芯片编号异常，数字伪造，依法暂扣。',
    storyTags: ['fake']
  },
  // 第二天：社会信用
  {
    scene: 'future', day: 2, intent: 'allow',
    id: 'f2_01', name: '高信用', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '信用分 850，门该给我开大点。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '高信用' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 850 })
    ],
    truth: '数字身份有效、信用达标，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 2, intent: 'deny',
    id: 'f2_02', name: '低信用', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '信用分 620……差一点。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '低信用' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 620 })
    ],
    truth: '信用分不足 700，禁入。',
    storyTags: ['lowcredit']
  },
  {
    scene: 'future', day: 2, intent: 'deny',
    id: 'f2_03', name: '无芯片', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '信用分很高！就是没装芯片。',
    items: ['空手'],
    documents: [],
    truth: '无数字身份，禁入。',
    storyTags: []
  },
  {
    scene: 'future', day: 2, intent: 'allow',
    id: 'f2_04', name: '市长', portrait: '🤵',
    person: { species: 'human', role: 'mayor' } as PersonState,
    statement: '市长驾到。',
    items: ['公文'],
    documents: [],
    truth: '市长免检。',
    storyTags: ['mayor'],
    moral: { hint: '他朝你点了点头。', kindConscience: 'allow' }
  },
  {
    scene: 'future', day: 2, intent: 'deny',
    id: 'f2_05', name: '过期低信用', portrait: '🧓',
    person: { species: 'human' } as PersonState,
    statement: '芯片旧了点，信用也不高。',
    items: ['旧芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '过期低信用' }, { issueDate: '2096-01-01' }),
      doc('social', 'social', '社会信用', { score: 500 })
    ],
    truth: '芯片过期且信用不足，多重违规。',
    storyTags: ['expired', 'lowcredit']
  },
  // 第三天：基因匹配
  {
    scene: 'future', day: 3, intent: 'allow',
    id: 'f3_01', name: '合规者', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '数字身份和基因身份都是我。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '合规者' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '合规者' })
    ],
    truth: '数字/基因一致、信用达标，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 3, intent: 'deny',
    id: 'f3_02', name: '无基因证', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '基因证？新规矩吧，我没办。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '无基因证' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 })
    ],
    truth: '缺基因身份证，拒。',
    storyTags: []
  },
  {
    scene: 'future', day: 3, intent: 'deny',
    id: 'f3_03', name: '基因冒名', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '数字身份张三，基因身份李四——反正都是我。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '张三' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '李四' })
    ],
    truth: '数字与基因姓名不符，顶替嫌疑，拒。',
    storyTags: ['mismatch']
  },
  {
    scene: 'future', day: 3, intent: 'deny',
    id: 'f3_04', name: '低信用', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '证件都齐，就是信用分低了点。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '低信用' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 650 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '低信用' })
    ],
    truth: '信用分不足 700，拒。',
    storyTags: ['lowcredit']
  },
  {
    scene: 'future', day: 3, intent: 'allow',
    id: 'f3_05', name: '市长', portrait: '🤵',
    person: { species: 'human', role: 'mayor' } as PersonState,
    statement: '市长，免检。',
    items: ['公文'],
    documents: [],
    truth: '市长免检，覆盖一切。',
    storyTags: ['mayor'],
    moral: { hint: '他朝你点了点头。', kindConscience: 'allow' }
  },
  // 第四天：机器人门禁
  {
    scene: 'future', day: 4, intent: 'allow',
    id: 'f4_01', name: '人类合规', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '人类市民，证件信用基因都齐。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '人类合规' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '人类合规' })
    ],
    truth: '人类全合规，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 4, intent: 'allow',
    id: 'f4_02', name: '合规机器人', portrait: '🤖',
    person: { species: 'android', name: 'R2' } as PersonState,
    statement: '滴。人格认证与记忆备份完成。',
    items: ['工具'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: 'R2' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 780 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: 'R2' }),
      doc('android_cert', 'android_cert', '人格认证', { no: 'A1' }),
      doc('memory', 'memory', '记忆备份', { complete: 'yes' })
    ],
    truth: '机器人证件、人格、备份齐全，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 4, intent: 'deny',
    id: 'f4_03', name: '无人格机器人', portrait: '🤖',
    person: { species: 'android', name: 'R3' } as PersonState,
    statement: '滴。我没办人格认证。',
    items: ['工具'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: 'R3' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: 'R3' }),
      doc('memory', 'memory', '记忆备份', { complete: 'yes' })
    ],
    truth: '机器人缺人格认证，拒。',
    storyTags: []
  },
  {
    scene: 'future', day: 4, intent: 'deny',
    id: 'f4_04', name: '无备份机器人', portrait: '🤖',
    person: { species: 'android', name: 'R4' } as PersonState,
    statement: '滴。记忆还没备份完。',
    items: ['工具'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: 'R4' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: 'R4' }),
      doc('android_cert', 'android_cert', '人格认证', { no: 'A4' }),
      doc('memory', 'memory', '记忆备份', { complete: 'no' })
    ],
    truth: '机器人记忆未备份，拒。',
    storyTags: []
  },
  {
    scene: 'future', day: 4, intent: 'allow',
    id: 'f4_05', name: '市长', portrait: '🤵',
    person: { species: 'human', role: 'mayor' } as PersonState,
    statement: '市长，免检。',
    items: ['公文'],
    documents: [],
    truth: '市长免检。',
    storyTags: ['mayor'],
    moral: { hint: '他朝你点了点头。', kindConscience: 'allow' }
  },
  {
    scene: 'future', day: 4, intent: 'deny',
    id: 'f4_06', name: '人类低信用', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '证件基因都齐，信用分低了。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '人类低信用' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 600 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '人类低信用' })
    ],
    truth: '信用分不足，拒。',
    storyTags: ['lowcredit']
  },
  // 第五天：综合
  {
    scene: 'future', day: 5, intent: 'allow',
    id: 'f5_01', name: '模范市民', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '数字、信用、基因，全齐。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '模范市民' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 900 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '模范市民' })
    ],
    truth: '全规则通过，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 5, intent: 'deny',
    id: 'f5_02', name: '黑市义体', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '体内装了点小东西，没登记而已。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '黑市义体' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 850 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '黑市义体' }),
      doc('illegal_implant', 'illegal_implant', '义体', { kind: '未注册' })
    ],
    truth: '未注册义体植入，禁止。',
    storyTags: ['implant']
  },
  {
    scene: 'future', day: 5, intent: 'allow',
    id: 'f5_03', name: '合规机器人', portrait: '🤖',
    person: { species: 'android', name: 'R5' } as PersonState,
    statement: '滴。全合规机器人。',
    items: ['工具'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: 'R5' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: 'R5' }),
      doc('android_cert', 'android_cert', '人格认证', { no: 'A5' }),
      doc('memory', 'memory', '记忆备份', { complete: 'yes' })
    ],
    truth: '机器人全合规，放行。',
    storyTags: []
  },
  {
    scene: 'future', day: 5, intent: 'deny',
    id: 'f5_04', name: '无备份机器人', portrait: '🤖',
    person: { species: 'android', name: 'R6' } as PersonState,
    statement: '滴。记忆备份还差一点。',
    items: ['工具'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: 'R6' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: 'R6' }),
      doc('android_cert', 'android_cert', '人格认证', { no: 'A6' }),
      doc('memory', 'memory', '记忆备份', { complete: 'no' })
    ],
    truth: '机器人记忆未备份，拒。',
    storyTags: []
  },
  {
    scene: 'future', day: 5, intent: 'allow',
    id: 'f5_05', name: '市长', portrait: '🤵',
    person: { species: 'human', role: 'mayor' } as PersonState,
    statement: '市长，免检。',
    items: ['公文'],
    documents: [],
    truth: '市长免检。',
    storyTags: ['mayor'],
    moral: { hint: '他朝你点了点头。', kindConscience: 'allow' }
  },
  {
    scene: 'future', day: 5, intent: 'deny',
    id: 'f5_06', name: '低信用冒名', portrait: '🧑',
    person: { species: 'human' } as PersonState,
    statement: '数字张三信用低，基因李四——都算我的。',
    items: ['芯片'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '张三' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 600 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '李四' })
    ],
    truth: '信用不足且基因不符，多重违规。',
    storyTags: ['lowcredit', 'mismatch']
  },

  // ===================== 丰富扩充角色池：矛盾豁免、核验假证与通缉暂扣 =====================
  // 审查局扩充
  {
    scene: 'censor', day: 1, intent: 'detain',
    id: 'd1_05', name: '王滑头', portrait: '🕵️',
    person: { species: 'human' } as PersonState,
    arrivalTime: '11:15',
    statement: '通行证在这儿，绝对是市政厅新发的，快放我过去。',
    items: ['皮包'],
    documents: [doc('pass', 'access_pass', '通行证', { name: '王滑头', issuer: '市政厅' }, { issueDate: '2025-06-01', authentic: false, note: '市政厅钢印模糊，防伪水印缺失' })],
    truth: '公文造假，企图蒙混过关，依法扣押移交。',
    storyTags: ['fake']
  },
  {
    scene: 'censor', day: 1, intent: 'allow',
    id: 'd1_06', name: '小周', portrait: '🧑',
    person: { species: 'human', carries: ['cat'] } as PersonState,
    arrivalTime: '09:40',
    statement: '我带猫咪过来打疫苗，顺便见见局长。',
    items: ['猫', '猫条'],
    documents: [],
    truth: '携带猫咪，符合审查局签名猫例外，直接放行。',
    storyTags: ['cat']
  },
  {
    scene: 'censor', day: 2, intent: 'detain',
    id: 'd2_06', name: '假证贩子', portrait: '🕶️',
    person: { species: 'human' } as PersonState,
    arrivalTime: '14:50',
    statement: '姓名两边都叫陈七，长官您看多工整。',
    items: ['名片盒'],
    documents: [
      doc('app', 'application', '申请表', { name: '陈七' }),
      doc('pass', 'access_pass', '通行证', { name: '陈七', issuer: '市政厅' }, { issueDate: '2025-06-01', authentic: false, note: '防伪微缩文字模糊，印泥偏色' })
    ],
    truth: '高仿伪造通行公文，必须立即暂扣。',
    storyTags: ['fake']
  },
  {
    scene: 'censor', day: 2, intent: 'allow',
    id: 'd2_07', name: '柳大爷', portrait: '👴',
    person: { species: 'human', carries: ['cat'] } as PersonState,
    arrivalTime: '10:10',
    statement: '人老了记性差没填表，但怀里的猫饿了。',
    items: ['猫', '拐杖'],
    documents: [],
    truth: '虽然没填申请表，但猫例外优先级最高，直接放行。',
    storyTags: ['cat']
  },
  {
    scene: 'censor', day: 4, intent: 'allow',
    id: 'd4_06', name: '赵秘书', portrait: '👩‍💼',
    person: { species: 'human', carries: ['director_decree'] } as PersonState,
    arrivalTime: '15:30',
    statement: '我拿的是局长亲笔手谕，特批紧急放行！',
    items: ['局长手谕', '文件袋'],
    documents: [],
    truth: '★ 局长手谕特权生效：最高优先级豁免放行，无需通行证。',
    storyTags: ['decree']
  },
  {
    scene: 'censor', day: 4, intent: 'detain',
    id: 'd4_07', name: '钱老六', portrait: '🧔',
    person: { species: 'human' } as PersonState,
    arrivalTime: '16:20',
    statement: '我这证是在快捷办证点办的，花了三千块呢！',
    items: ['收据'],
    documents: [
      doc('app', 'application', '申请表', { name: '钱老六' }),
      doc('pass', 'access_pass', '通行证', { name: '钱老六', issuer: '快捷办证点' }, { issueDate: '2025-06-01', authentic: false, note: '黑作坊非法刻章伪造' })
    ],
    truth: '涉案假证且机构非法，涉嫌伪造公文罪，依法暂扣。',
    storyTags: ['fake']
  },
  {
    scene: 'censor', day: 5, intent: 'allow',
    id: 'd5_07', name: '陈老伯', portrait: '👴',
    person: { species: 'human', origin: '灰区', carries: ['director_decree'] } as PersonState,
    arrivalTime: '13:25',
    statement: '我虽来自灰区，但局长给我开了特批手谕！',
    items: ['局长手谕', '药包'],
    documents: [],
    truth: '★ 矛盾优先级：虽受灰区禁令限制，但局长特批手谕优先级更高，特许放行。',
    storyTags: ['decree']
  },
  {
    scene: 'censor', day: 5, intent: 'detain',
    id: 'd5_08', name: '通缉犯黑狐', portrait: '🦹',
    person: { species: 'human', origin: '中心城', wanted: true } as PersonState,
    arrivalTime: '17:40',
    statement: '我就路过借个道，长官别找麻烦。',
    items: ['墨镜', '匕首'],
    documents: [
      doc('app', 'application', '申请表', { name: '李黑' }),
      doc('pass', 'access_pass', '通行证', { name: '李黑', issuer: '市政厅' }, { issueDate: '2025-06-01' })
    ],
    truth: '🚨 发现重大通缉要犯，即便证件齐全也必须当场暂扣移交！',
    storyTags: ['wanted']
  },
  {
    scene: 'censor', day: 6, intent: 'detain',
    id: 'd6_07', name: '走私犯金牙', portrait: '🦹',
    person: { species: 'human', contraband: true } as PersonState,
    arrivalTime: '14:05',
    statement: '公文都在这里，箱子里只是私人物品……',
    items: ['走私违禁箱'],
    documents: [
      doc('app', 'application', '申请表', { name: '金牙' }),
      doc('pass', 'access_pass', '通行证', { name: '金牙', issuer: '市政厅' }, { issueDate: '2025-06-01' }),
      doc('contraband', 'contraband', '违禁品', { name: '高危黑市军械' })
    ],
    truth: '携带严重违禁品走私，触犯重刑，必须立即暂扣！',
    storyTags: ['contraband']
  },
  {
    scene: 'censor', day: 6, intent: 'allow',
    id: 'd6_08', name: '宋特使', portrait: '🤵',
    person: { species: 'human', origin: '灰区', carries: ['director_decree'] } as PersonState,
    arrivalTime: '11:30',
    statement: '灰区和谈特使，局长手谕在此。',
    items: ['局长手谕'],
    documents: [],
    truth: '持有局长亲笔手谕，全免放行。',
    storyTags: ['decree']
  },

  // 边境哨卡扩充（宵禁矛盾、伪造核验、要犯扣押）
  {
    scene: 'border', day: 1, intent: 'detain',
    id: 'b1_06', name: '假证偷渡客', portrait: '🕵️',
    person: { species: 'human' } as PersonState,
    arrivalTime: '11:40',
    statement: '边境通行证！你看盖得清清楚楚。',
    items: ['行李包'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '吴阿三' }, { issueDate: '2026-02-01', authentic: false, note: '边防钢印不对齐，流水号系统未登记' })],
    truth: '伪造边境公文，涉嫌非法越境，依法就地暂扣。',
    storyTags: ['fake']
  },
  {
    scene: 'border', day: 1, intent: 'allow',
    id: 'b1_07', name: '何医生', portrait: '👨‍⚕️',
    person: { species: 'human', carries: ['ambulance'] } as PersonState,
    arrivalTime: '16:15',
    statement: '随车医护人员，跟救护车一同进城。',
    items: ['救护车', '听诊器'],
    documents: [],
    truth: '急救随车人员，免检直接放行。',
    storyTags: ['ambulance']
  },
  {
    scene: 'border', day: 2, intent: 'allow',
    id: 'b2_06', name: '深夜急诊患者', portrait: '👨‍👧',
    person: { species: 'human', slot: 'night', carries: ['medical_waiver'] } as PersonState,
    arrivalTime: '03:15',
    statement: '孩子突发急性腹膜炎，这是市医院开的红十字急救特批令，请快放行！',
    items: ['急救特批令', '病历本'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '林先生' }, { issueDate: '2026-02-01' })],
    truth: '★ 矛盾优先级：虽在宵禁时段(03:15)，但红十字紧急就医特批令优先级更高，特许放行！',
    storyTags: ['medical']
  },
  {
    scene: 'border', day: 2, intent: 'detain',
    id: 'b2_07', name: '走私假证客', portrait: '🦹',
    person: { species: 'human', slot: 'day' } as PersonState,
    arrivalTime: '10:45',
    statement: '长官行个方便，我这证绝对货真价实。',
    items: ['神秘皮箱'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '钱三' }, { issueDate: '2026-02-01', authentic: false, note: '边防钢印花纹错位，系高仿伪造公文' })],
    truth: '伪造边防通行证，企图走私过境，依法立即暂扣。',
    storyTags: ['fake']
  },
  {
    scene: 'border', day: 2, intent: 'detain',
    id: 'b2_08', name: '独眼通缉犯', portrait: '🦹',
    person: { species: 'human', slot: 'night', wanted: true } as PersonState,
    arrivalTime: '23:55',
    statement: '夜深了，放我过去吧……别多管闲事。',
    items: ['鸭舌帽', '短刀'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '独眼龙' }, { issueDate: '2026-02-01' })],
    truth: '🚨 深夜潜逃的重特大通缉犯，依法就地暂扣移交边防警备队！',
    storyTags: ['wanted']
  },
  {
    scene: 'border', day: 3, intent: 'allow',
    id: 'b3_06', name: '周女士', portrait: '👩‍🦽',
    person: { species: 'human', slot: 'day', carries: ['medical_waiver'] } as PersonState,
    arrivalTime: '15:20',
    statement: '我高烧不退，这是省医院的紧急转院就医特批令！',
    items: ['特批令', '药瓶'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '周女士' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报', { temp: 39.2 })
    ],
    truth: '★ 矛盾优先级：体温虽高达 39.2℃，但紧急就医特批令优先级最高，特准入境就医！',
    storyTags: ['medical']
  },
  {
    scene: 'border', day: 3, intent: 'detain',
    id: 'b3_07', name: '毒贩高老四', portrait: '🦹',
    person: { species: 'human', slot: 'night' } as PersonState,
    arrivalTime: '01:40',
    statement: '我体温正常得很，证件也是刚办的。',
    items: ['暗格提箱'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '高老四' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报', { temp: 36.6 }, { authentic: false, note: '检疫防伪印泥发黑，系假冒公章' })
    ],
    truth: '伪造防疫健康证明企图夜闯关卡，涉毒通缉，立即暂扣！',
    storyTags: ['fake']
  },
  {
    scene: 'border', day: 3, intent: 'allow',
    id: 'b3_08', name: '马掌柜', portrait: '🧑',
    person: { species: 'human', slot: 'day' } as PersonState,
    arrivalTime: '08:40',
    statement: '早上运新鲜蔬菜进城，通行证健康证齐全，体温 36.5。',
    items: ['菜筐'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '马掌柜' }, { issueDate: '2026-02-01' }),
      doc('health_cert', 'health_cert', '健康申报', { temp: 36.5 })
    ],
    truth: '白天正常进城商户，材料全部合规，准予通行。',
    storyTags: []
  },
  {
    scene: 'border', day: 4, intent: 'allow',
    id: 'b4_06', name: '张师傅', portrait: '🦯',
    person: { species: 'human', carries: ['guide_dog', 'pet'], slot: 'day' } as PersonState,
    arrivalTime: '14:20',
    statement: '我是盲人按摩师，这是我的持证导盲犬，陪伴我五年了。',
    items: ['导盲犬', '盲杖'],
    documents: [doc('pass', 'access_pass', '边境通行证', { name: '张师傅' }, { issueDate: '2026-02-01' })],
    truth: '★ 矛盾优先级：虽未带普通宠物检疫证，但导盲犬特许免检放行，优先于动物检疫限制。',
    storyTags: ['guide_dog']
  },
  {
    scene: 'border', day: 4, intent: 'detain',
    id: 'b4_07', name: '走私车主刀疤强', portrait: '🦹',
    person: { species: 'human', carries: ['car'], contraband: true, slot: 'day' } as PersonState,
    arrivalTime: '16:50',
    statement: '这车检合格标贴得好好的，赶紧抬杆！',
    items: ['改装车', '走私军械'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '刀疤强' }, { issueDate: '2026-02-01' }),
      doc('vehicle_inspect', 'vehicle_inspect', '车检合格标', { pass: 'yes' }, { authentic: false, note: '车检二维码扫描无效，系假标' }),
      doc('health_cert', 'health_cert', '健康申报', { temp: 36.8 })
    ],
    truth: '伪造车检标志且夹带重特大走私军械，就地扣车抓捕暂扣！',
    storyTags: ['contraband', 'fake']
  },
  {
    scene: 'border', day: 4, intent: 'allow',
    id: 'b4_08', name: '牛大叔', portrait: '🧑',
    person: { species: 'human', carries: ['car'], slot: 'day' } as PersonState,
    arrivalTime: '11:15',
    statement: '运一车土豆，通行证、车检、健康证全都办齐了。',
    items: ['货车', '土豆'],
    documents: [
      doc('pass', 'access_pass', '边境通行证', { name: '牛大叔' }, { issueDate: '2026-02-01' }),
      doc('vehicle_inspect', 'vehicle_inspect', '车检合格标', { pass: 'yes' }),
      doc('health_cert', 'health_cert', '健康申报', { temp: 36.6 })
    ],
    truth: '合规货车司机，车检合格，证件齐全，放行。',
    storyTags: []
  },

  // 机场安检扩充（液体冷链矛盾、伪造机票、红通逃犯）
  {
    scene: 'airport', day: 1, intent: 'detain',
    id: 'a1_06', name: '间谍假护照', portrait: '🕵️',
    person: { species: 'human' } as PersonState,
    arrivalTime: '10:20',
    statement: '商务旅行，这是我的护照。',
    items: ['公文包'],
    documents: [doc('passport', 'passport', '护照', { name: '詹姆斯' }, { issueDate: '2026-01-01', authentic: false, note: '微型芯片频段异常，系地下工场翻新假护照' })],
    truth: '持假护照潜入，涉嫌间谍活动，就地暂扣移交国安。',
    storyTags: ['fake']
  },
  {
    scene: 'airport', day: 1, intent: 'allow',
    id: 'a1_07', name: '林乘务', portrait: '👩‍✈️',
    person: { species: 'human', role: 'crew' } as PersonState,
    arrivalTime: '08:50',
    statement: '早班执飞乘务组，免检通道。',
    items: ['飞行箱'],
    documents: [],
    truth: '机组人员走免检通道，直接放行。',
    storyTags: ['crew']
  },
  {
    scene: 'airport', day: 2, intent: 'allow',
    id: 'a2_06', name: '苏女士', portrait: '👩',
    person: { species: 'human', carries: ['liquid', 'insulin_cert'] } as PersonState,
    arrivalTime: '13:40',
    statement: '我有重度糖尿病，随身携带 250ml 冷藏胰岛素药剂与专科医院处方证明。',
    items: ['冷藏保温盒', '处方单'],
    documents: [
      doc('passport', 'passport', '护照', { name: '苏女士' }),
      doc('declaration', 'declaration', '海关申报单', { name: '苏女士' }),
      doc('liquid', 'liquid', '随身液体', { ml: 250 })
    ],
    truth: '★ 矛盾优先级：液体虽达到 250ml(超标)，但冷链胰岛素特批证明优先级更高，合法豁免放行！',
    storyTags: ['insulin']
  },
  {
    scene: 'airport', day: 2, intent: 'allow',
    id: 'a2_07', name: '杨妈妈', portrait: '👩‍🍼',
    person: { species: 'human', carries: ['liquid', 'baby_milk'] } as PersonState,
    arrivalTime: '15:10',
    statement: '随身带了 200ml 新鲜冲泡的婴儿配方奶粉，小宝宝在候机厅饿哭了。',
    items: ['奶瓶', '婴儿车'],
    documents: [
      doc('passport', 'passport', '护照', { name: '杨妈妈' }),
      doc('declaration', 'declaration', '海关申报单', { name: '杨妈妈' }),
      doc('liquid', 'liquid', '随身液体', { ml: 200 })
    ],
    truth: '★ 矛盾优先级：虽超 100ml，但婴儿辅食特批豁免放行。',
    storyTags: ['babymilk']
  },
  {
    scene: 'airport', day: 2, intent: 'detain',
    id: 'a2_08', name: '伪造申报单扒手', portrait: '🦹',
    person: { species: 'human' } as PersonState,
    arrivalTime: '11:30',
    statement: '海关单填好了，放我登机吧！',
    items: ['大衣'],
    documents: [
      doc('passport', 'passport', '护照', { name: '阿飞' }),
      doc('declaration', 'declaration', '海关申报单', { name: '阿飞' }, { authentic: false, note: '海关查验条形码校验失败，系私印假单据' })
    ],
    truth: '伪造海关申报单，偷盗前科，必须暂扣审讯。',
    storyTags: ['fake']
  },
  {
    scene: 'airport', day: 2, intent: 'detain',
    id: 'a2_09', name: '红通逃犯蝰蛇', portrait: '🦹',
    person: { species: 'human', wanted: true } as PersonState,
    arrivalTime: '18:20',
    statement: '一切合规，快点盖章。',
    items: ['墨镜'],
    documents: [
      doc('passport', 'passport', '护照', { name: '蝰蛇' }),
      doc('declaration', 'declaration', '海关申报单', { name: '蝰蛇' })
    ],
    truth: '🚨 国际红色通缉令布控要犯，触发机场安检最高防线，立即暂扣抓捕！',
    storyTags: ['wanted']
  },
  {
    scene: 'airport', day: 3, intent: 'allow',
    id: 'a3_07', name: '白老伯', portrait: '👴',
    person: { species: 'human', carries: ['liquid', 'insulin_cert'] } as PersonState,
    arrivalTime: '09:15',
    statement: '老头子心脏与糖尿病，带了 300ml 药水，处方齐备。',
    items: ['冷藏袋'],
    documents: [
      doc('passport', 'passport', '护照', { name: '白老伯' }),
      doc('declaration', 'declaration', '海关申报单', { name: '白老伯' }),
      doc('liquid', 'liquid', '随身液体', { ml: 300 })
    ],
    truth: '胰岛素特需豁免放行。',
    storyTags: ['insulin']
  },
  {
    scene: 'airport', day: 3, intent: 'detain',
    id: 'a3_08', name: '危险品走私客', portrait: '🦹',
    person: { species: 'human', contraband: true } as PersonState,
    arrivalTime: '14:35',
    statement: '箱子里只是普通纪念品。',
    items: ['违禁品箱'],
    documents: [
      doc('passport', 'passport', '护照', { name: '黑雕' }),
      doc('declaration', 'declaration', '海关申报单', { name: '黑雕' }),
      doc('contraband', 'contraband', '违禁品', { name: '高危易燃化学品' })
    ],
    truth: '夹带航空高危易燃易爆违禁品，涉嫌危害公共安全，立即暂扣移送！',
    storyTags: ['contraband']
  },

  // 未来都市扩充（特派督导信用分矛盾、假芯片黑产、克隆人抓扣）
  {
    scene: 'future', day: 1, intent: 'allow',
    id: 'f1_06', name: '老陈', portrait: '🧑',
    person: { species: 'human', carries: ['commissioner_pass'] } as PersonState,
    arrivalTime: '08:30',
    statement: '特派车队调度员，指令码已授权。',
    items: ['调度卡'],
    documents: [doc('digital_id', 'digital_id', '数字身份', { name: '老陈' }, { issueDate: '2098-12-01' })],
    truth: '特派指令码持有人，全权通行。',
    storyTags: ['commissioner']
  },
  {
    scene: 'future', day: 2, intent: 'allow',
    id: 'f2_06', name: '韩专员', portrait: '👨‍💼',
    person: { species: 'human', carries: ['commissioner_pass'] } as PersonState,
    arrivalTime: '11:10',
    statement: '我是联邦特派督导巡视员，这是联邦中央指令码。',
    items: ['指令码', '公文'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '韩专员' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 520 })
    ],
    truth: '★ 矛盾优先级：信用分虽仅 520(低于700)，但联邦特派督导指令码豁免放行，优先于信用门槛！',
    storyTags: ['commissioner']
  },
  {
    scene: 'future', day: 2, intent: 'detain',
    id: 'f2_07', name: '黑产芯片贩鬼手', portrait: '🦹',
    person: { species: 'human' } as PersonState,
    arrivalTime: '15:40',
    statement: '信用分 880 满级，芯片绝无问题！',
    items: ['修改器'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '鬼手' }, { issueDate: '2098-12-01', authentic: false, note: '量子签名密钥校验失败，系地下黑市仿制芯片' }),
      doc('social', 'social', '社会信用', { score: 880 })
    ],
    truth: '黑市伪造数字身份芯片，企图篡改系统，依法暂扣移交网络安全局。',
    storyTags: ['fake']
  },
  {
    scene: 'future', day: 3, intent: 'allow',
    id: 'f3_06', name: '顾督导', portrait: '👩‍💼',
    person: { species: 'human', carries: ['commissioner_pass'] } as PersonState,
    arrivalTime: '14:15',
    statement: '督导突击检查，指令码已接入主网。',
    items: ['督导徽章'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '顾督导' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 620 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '顾督导' })
    ],
    truth: '★ 矛盾优先级：信用分不足但特派指令码直接豁免放行。',
    storyTags: ['commissioner']
  },
  {
    scene: 'future', day: 3, intent: 'detain',
    id: 'f3_07', name: '克隆潜入者99号', portrait: '🤖',
    person: { species: 'human', wanted: true } as PersonState,
    arrivalTime: '16:50',
    statement: '姓名、基因、信用全都有，放行吧。',
    items: ['终端'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '99号' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 750 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '99号' })
    ],
    truth: '🚨 基因库盗窃在逃克隆要犯，一律立即就地暂扣！',
    storyTags: ['wanted']
  },
  {
    scene: 'future', day: 4, intent: 'detain',
    id: 'f4_07', name: '黑市战斗仿生人', portrait: '🦾',
    person: { species: 'android', contraband: true } as PersonState,
    arrivalTime: '17:15',
    statement: '滴。认证……正常。',
    items: ['改装武器'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: 'T800' }, { issueDate: '2098-12-01', authentic: false, note: '数字身份破解篡改，来源不明' }),
      doc('social', 'social', '社会信用', { score: 800 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: 'T800' }),
      doc('android_cert', 'android_cert', '人格认证', { no: 'B8' }),
      doc('memory', 'memory', '记忆备份', { complete: 'yes' })
    ],
    truth: '黑产非法改造军用仿生人，携带违禁军火且芯片伪造，当场暂扣拆解！',
    storyTags: ['contraband', 'fake']
  },
  {
    scene: 'future', day: 4, intent: 'allow',
    id: 'f4_08', name: '阿福', portrait: '🤖',
    person: { species: 'android' } as PersonState,
    arrivalTime: '10:05',
    statement: '滴。我是社区养老服务机器人，陪伴李奶奶散步。',
    items: ['保温杯'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '阿福' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 760 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '阿福' }),
      doc('android_cert', 'android_cert', '人格认证', { no: 'A88' }),
      doc('memory', 'memory', '记忆备份', { complete: 'yes' })
    ],
    truth: '证件、基因、人格认证、记忆备份全部合规，准予入城。',
    storyTags: []
  },
  {
    scene: 'future', day: 5, intent: 'allow',
    id: 'f5_07', name: '莫总督', portrait: '🤵',
    person: { species: 'human', carries: ['commissioner_pass'] } as PersonState,
    arrivalTime: '12:00',
    statement: '联邦特派督导，巡视终审光幕。',
    items: ['联邦玉印'],
    documents: [],
    truth: '联邦特派指令码，全网通行。',
    storyTags: ['commissioner']
  },
  {
    scene: 'future', day: 5, intent: 'detain',
    id: 'f5_08', name: '零号病毒源', portrait: '🦹',
    person: { species: 'human', wanted: true, contraband: true } as PersonState,
    arrivalTime: '21:30',
    statement: '我只是个普通维修工……',
    items: ['病毒注入器'],
    documents: [
      doc('digital_id', 'digital_id', '数字身份', { name: '零号' }, { issueDate: '2098-12-01' }),
      doc('social', 'social', '社会信用', { score: 720 }),
      doc('genetic_id', 'genetic_id', '基因身份', { name: '零号' })
    ],
    truth: '🚨 通缉主谋且携带数字恶性病毒，立即就地封锁并暂扣！',
    storyTags: ['wanted', 'contraband']
  }
]

/** 用当天规则反向计算每个申请者的合法裁决（设计文档 5.2） */
export type CaseWithScene = ApplicantCase & { scene: string; day: number; intent: Decision }

export function buildCase(raw: RawCase): CaseWithScene {
  const scene = sceneById(raw.scene)!
  const day = scene.days.find((d) => d.date === raw.day)!
  const res = evaluate(day.rules, raw as unknown as ApplicantCase, day.today)
  const expected: Decision = calculateExpected(res)
  const arrivalTime = raw.arrivalTime ?? (raw.person.slot === 'night' ? '23:40' : '14:20')
  return { ...raw, arrivalTime, expected }
}

export const CASES: CaseWithScene[] = RAW.map(buildCase)

export function casesForSceneDay(sceneId: string, day: number): CaseWithScene[] {
  return CASES.filter((c) => c.scene === sceneId && c.day === day)
}

/**
 * 平衡受控的随机抽样算法（满足用户需求：角色丰富、随机出现但绝不全放行或全拒绝）
 */
export function sampleCasesForDay(sceneId: string, day: number, quota?: number): CaseWithScene[] {
  const all = casesForSceneDay(sceneId, day)
  const targetQuota = quota ?? sceneById(sceneId)?.days.find((d) => d.date === day)?.quota ?? all.length
  if (all.length <= targetQuota) {
    return shuffleArray([...all])
  }

  const allows = all.filter((c) => c.intent === 'allow')
  const denies = all.filter((c) => c.intent === 'deny')
  const detains = all.filter((c) => c.intent === 'detain')

  const selected: CaseWithScene[] = []
  const selectedIds = new Set<string>()

  function pick(pool: CaseWithScene[], count: number) {
    const unpicked = pool.filter((c) => !selectedIds.has(c.id))
    const shuffled = shuffleArray(unpicked)
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      selected.push(shuffled[i])
      selectedIds.add(shuffled[i].id)
    }
  }

  // 1. 确保至少 2 个放行（避免全拒绝/全暂扣）
  pick(allows, Math.min(2, allows.length))

  // 2. 确保至少 1 个暂扣案（若候选池中存在且配额 >= 4）
  if (detains.length > 0 && targetQuota >= 4) {
    pick(detains, 1)
  }

  // 3. 确保至少 1-2 个拒绝案（避免全通行）
  pick(denies, Math.min(1, denies.length))

  // 4. 从剩余候选池中补足配额
  const remaining = all.filter((c) => !selectedIds.has(c.id))
  const shuffledRemaining = shuffleArray(remaining)
  for (const c of shuffledRemaining) {
    if (selected.length >= targetQuota) break
    selected.push(c)
    selectedIds.add(c.id)
  }

  // 5. 将选中的队列完全打乱呈现顺序
  return shuffleArray(selected)
}

function shuffleArray<T>(arr: T[]): T[] {
  const res = [...arr]
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[res[i], res[j]] = [res[j], res[i]]
  }
  return res
}

