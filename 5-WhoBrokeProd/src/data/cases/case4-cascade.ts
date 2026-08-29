// 案件 4：服务雪崩（多责任复杂结算）。
// 真相：oncall 阿峰把网关超时从 30s 激进调到 3s；支付负责人阿珍同期部署新版本引入重试×5，
// 两者叠加触发雪崩。两人共同责任。SRE 阿涛复盘，旁观开发小宇在群里目睹了"豪言"。
import type { CaseDef } from '../../case-model/types'

export const case4: CaseDef = {
  id: 'cascade',
  title: '雪崩之夜',
  chapter: 4,
  brief:
    '昨夜 23:00 核心服务雪崩，错误率冲到 100%，持续 40 分钟。已知：当晚既有配置变更，也有一次新版本部署。\n请查明：谁改了什么、为何叠加成灾难、这是不是"两个人一起闯的祸"。',
  intro:
    '一场本可避免的雪崩。一边是 oncall 把超时调短，一边是支付团队上新版本叠加重试。群里有人放话"调小点应该没事"，有人接茬"重试多加几次更稳"。当它们相遇，服务塌了。',
  characters: [
    { id: 'oncall_feng', name: '阿峰', role: 'On-Call 开发', avatar: '🧑‍💻', blurb: '昨夜值班，动过网关配置。' },
    { id: 'pay_lead_zhen', name: '阿珍', role: '支付负责人', avatar: '👩‍💻', blurb: '昨夜发布了支付新版本。' },
    { id: 'sre_tao', name: '阿涛', role: 'SRE', avatar: '🛰️', blurb: '负责复盘，手里有根因分析。' },
    { id: 'dev_obs', name: '小宇', role: '旁观开发', avatar: '👀', blurb: '在群里围观了那场"豪言"。' }
  ],
  truthEvents: [
    {
      id: 'timeout',
      time: '22:00',
      location: '网关配置',
      actors: ['oncall_feng'],
      action: 'tighten_timeout',
      cause: '把网关超时从 30s 调到 3s',
      facts: ['timeout_tightened', 'oncall_changed_config']
    },
    {
      id: 'deploy',
      time: '22:30',
      location: '支付服务',
      actors: ['pay_lead_zhen'],
      action: 'deploy_retry',
      cause: '新版本引入重试×5，放大调用压力',
      facts: ['pay_deployed', 'retry_storm']
    },
    { id: 'cascade', time: '23:00', location: '生产环境', actors: ['oncall_feng', 'pay_lead_zhen'], action: 'cascade_outage', facts: ['cascade_outage', 'prod_down'] },
    { id: 'sre_alert', time: '23:01', location: '监控', actors: ['sre_tao'], action: 'receive_alert', facts: ['sre_alert', 'sre_rootcause'] }
  ],
  knowledge: [
    { character: 'oncall_feng', observed: ['timeout_tightened', 'oncall_changed_config'], heard: [], beliefs: ['oncall_small_change'], intent: 'lie', secrets: ['timeout_tightened'] },
    { character: 'pay_lead_zhen', observed: ['pay_deployed', 'retry_storm'], heard: [], beliefs: ['pay_normal'], intent: 'misunderstand', secrets: [] },
    { character: 'sre_tao', observed: ['cascade_outage', 'prod_down', 'sre_rootcause'], heard: [], beliefs: [], intent: 'honest', secrets: [] },
    { character: 'dev_obs', observed: [], heard: ['oncall_quip', 'pay_quip'], beliefs: [], intent: 'honest', secrets: [] }
  ],
  evidence: [
    {
      id: 'gateway_cfg',
      name: '网关配置历史',
      source: '配置中心',
      reliability: 1.0,
      facts: ['timeout_tightened', 'oncall_changed_config'],
      desc: '22:00 网关 timeout 由 30s 改为 3s，修改人 oncall_feng。'
    },
    {
      id: 'pay_deploy',
      name: '支付发布记录',
      source: '发布平台',
      reliability: 1.0,
      facts: ['pay_deployed', 'retry_storm'],
      desc: '22:30 支付 v2.3 上线，引入调用重试×5，发布人 pay_lead_zhen。'
    },
    {
      id: 'monitor',
      name: '监控快照',
      source: '监控系统',
      reliability: 1.0,
      facts: ['cascade_outage', 'prod_down'],
      desc: '23:00 雪崩，错误率 100%，持续约 40 分钟。'
    },
    {
      id: 'sre_note',
      name: 'SRE 复盘',
      source: '复盘文档',
      reliability: 0.9,
      facts: ['sre_rootcause'],
      desc: '根因：网关超时过短（3s）叠加重试风暴，单点被放大的请求压垮，触发级联失败。'
    },
    {
      id: 'chat',
      name: '值班群聊天',
      source: '聊天记录',
      reliability: 0.9,
      facts: ['oncall_quip', 'pay_quip'],
      desc: '阿峰："调小点应该没事。" 阿珍："重试多加几次更稳。"'
    }
  ],
  topics: {
    oncall_feng: [
      {
        id: 't_cfg',
        subject: '你改配置了吗',
        ask: '昨晚网关超时是你改的？',
        responses: [
          {
            id: 'r_small',
            priority: 10,
            facts: ['oncall_small_change'],
            text: '我就调了一点点超时，不至于出事。'
          },
          {
            id: 'r_truth',
            priority: 100,
            when: { presentedEvidence: ['gateway_cfg'] },
            facts: ['timeout_tightened', 'oncall_changed_config'],
            text: '好吧，我改到 3 秒了，想着快点失败、快点重试，没想到会塌。',
            unlocks: ['t_why']
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么调这么短',
        ask: '为什么把超时调得这么激进？',
        unlock: { discoveredFacts: ['timeout_tightened'] },
        responses: [
          { id: 'r_why', priority: 50, facts: [], text: '上游有点慢，我想让失败快一点、重试快一点，经验主义。' }
        ]
      }
    ],
    pay_lead_zhen: [
      {
        id: 't_deploy',
        subject: '你部署了吗',
        ask: '昨晚支付新版本是你上的？',
        responses: [
          {
            id: 'r_normal',
            priority: 10,
            facts: ['pay_normal'],
            text: '我部署很正常，重试多几次更稳，怎么会有问题。'
          },
          {
            id: 'r_yes',
            priority: 100,
            when: { presentedEvidence: ['pay_deploy'] },
            facts: ['pay_deployed', 'retry_storm'],
            text: '重试是 5 次，我没想到会和那个超短的超时叠出雪崩。'
          }
        ]
      }
    ],
    sre_tao: [
      {
        id: 't_root',
        subject: '根因是什么',
        ask: '复盘下来根因是什么？',
        responses: [
          {
            id: 'r_root',
            priority: 10,
            facts: ['cascade_outage', 'prod_down', 'sre_rootcause', 'sre_alert'],
            text: '网关超时过短，叠加重试风暴，单点被放大压垮，级联失败。两份变更单独看都不致命，凑一起就雪崩。'
          }
        ]
      }
    ],
    dev_obs: [
      {
        id: 't_chat',
        subject: '群里说了啥',
        ask: '昨晚群里大家怎么说的？',
        responses: [
          {
            id: 'r_chat',
            priority: 10,
            facts: ['oncall_quip', 'pay_quip'],
            text: '阿峰说"调小点应该没事"，阿珍接茬"重试多加几次更稳"——我当时还点了赞。'
          }
        ]
      }
    ]
  },
  contradictions: [
    ['oncall_small_change', 'timeout_tightened'],
    ['pay_normal', 'retry_storm']
  ],
  supports: [['timeout_tightened', 'oncall_changed_config'], ['pay_deployed', 'retry_storm']],
  factLabels: {
    timeout_tightened: '网关超时 30s→3s',
    oncall_changed_config: '阿峰改了网关配置',
    pay_deployed: '阿珍部署支付新版本',
    retry_storm: '新版本引入重试×5',
    cascade_outage: '服务雪崩',
    prod_down: '生产环境宕机',
    sre_rootcause: '根因为超时叠加重试风暴',
    sre_alert: 'SRE 收到告警',
    oncall_small_change: '阿峰自称只调了一点点',
    pay_normal: '阿珍自称部署正常',
    oncall_quip: '阿峰："调小点应该没事"',
    pay_quip: '阿珍："重试多加几次更稳"'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['oncall_feng', 'pay_lead_zhen'],
    contributory: [],
    action: 'tighten_timeout',
    actionAliases: ['调短超时并叠加重试', '超时过短加重试风暴', '缩短超时', '超短超时叠加重试', '两份变更叠加'],
    requiredEvidence: ['gateway_cfg', 'pay_deploy'],
    minEvidence: 2,
    requiredFacts: ['timeout_tightened', 'retry_storm', 'cascade_outage'],
    timeWindowMin: 30
  },
  ending: {
    success:
      '你还原了真相：阿峰把网关超时激进调到 3s，阿珍同期部署引入重试×5，两份单独不致命的变更叠加触发雪崩——这是一次典型的"共同责任"。团队此后对配置变更与发布建立互斥窗口与容量保护。',
    partial:
      '你指认了部分责任人，但雪崩是两个变更叠加的结果，少一个人就不完整。请重新确认共同责任。',
    fail: '指控落空。雪崩的真相是两个变更相遇，而非某一个人的单独行为。'
  }
}
