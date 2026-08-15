// 案件 6：灰度发布配置错误——开发把灰度比例写成 100%，新版本带内存泄漏被全量发布，
// 全部实例 OOM。测试未校验灰度配置就批准（管理责任）。
// 玩家需识破"按规范 1% 灰度"的谎言：发布系统记录显示 100%。
import type { CaseDef } from '../../case-model/types'

export const case6: CaseDef = {
  id: 'bad-canary',
  title: '灰度的全量',
  chapter: 6,
  brief:
    '今夜 22:45 生产告警，新版本全量上线后实例大面积 OOM。已知：本应灰度 1% 发布。\n请查明：谁把灰度比例写错、为何全量发布、谁放行了这次发布。',
  intro:
    '发布窗口的灯还亮着。小孙说灰度只放了 1%，小周说她点了批准，发布系统却显示全量。监控曲线在 22:30 之后一路往上——不是流量，是内存。真相卡在一条被忽略的配置里。',
  characters: [
    { id: 'sun2', name: '小孙', role: '后端开发', avatar: '🧑‍💻', blurb: '写发布配置的人，坚信自己只放了 1%。' },
    { id: 'zhou', name: '小周', role: '测试工程师', avatar: '🔍', blurb: '发布审批人，习惯扫一眼就点通过。' },
    { id: 'rel', name: '小发布', role: '发布工程师', avatar: '🚀', blurb: '按下发布按钮的人，照配置执行。' },
    { id: 'sre', name: '小监控', role: 'SRE', avatar: '📟', blurb: '看着内存曲线一路飙升的人。' }
  ],
  truthEvents: [
    {
      id: 'sun_write',
      time: '22:00',
      location: '小孙工位',
      actors: ['sun2'],
      action: 'write_bad_canary',
      cause: '灰度比例误写成 100%',
      facts: ['sun_wrote_canary', 'canary_100pct', 'config_unit_error']
    },
    {
      id: 'zhou_approve',
      time: '22:20',
      location: '审批系统',
      actors: ['zhou'],
      action: 'approve_without_check',
      cause: '未校验灰度配置即批准',
      facts: ['canary_not_reviewed', 'zhou_approved']
    },
    {
      id: 'release',
      time: '22:30',
      location: '生产环境',
      actors: ['rel'],
      action: 'wrong_canary_config',
      cause: '按错误配置全量发布带泄漏的新版本',
      facts: ['canary_100pct', 'mem_leak', 'prod_oom']
    },
    {
      id: 'alert',
      time: '22:45',
      location: '生产环境',
      actors: ['sre'],
      action: 'receive_alert',
      facts: ['deploy_alert', 'prod_oom']
    }
  ],
  knowledge: [
    {
      character: 'sun2',
      observed: ['sun_wrote_canary', 'canary_100pct', 'config_unit_error'],
      heard: [],
      beliefs: ['sun_claimed_1pct'],
      intent: 'lie',
      secrets: ['canary_100pct', 'config_unit_error']
    },
    {
      character: 'zhou',
      observed: ['zhou_approved', 'canary_not_reviewed'],
      heard: [],
      beliefs: [],
      intent: 'forget',
      secrets: []
    },
    {
      character: 'rel',
      observed: ['prod_oom', 'release_done'],
      heard: ['canary_100pct'],
      beliefs: [],
      intent: 'honest',
      secrets: []
    },
    {
      character: 'sre',
      observed: ['deploy_alert', 'prod_oom'],
      heard: [],
      beliefs: ['mem_leak_seen'],
      intent: 'honest',
      secrets: []
    }
  ],
  evidence: [
    {
      id: 'ev_release_log',
      name: '发布系统记录',
      source: '发布平台',
      reliability: 1.0,
      facts: ['canary_100pct', 'sun_wrote_canary'],
      desc: '22:30 实际放量 100%（灰度比例字段=100），配置由小孙提交。'
    },
    {
      id: 'ev_perf_log',
      name: '性能监控日志',
      source: 'APM 平台',
      reliability: 1.0,
      facts: ['mem_leak', 'prod_oom'],
      desc: '新版本存在内存泄漏，全量后实例 OOM，错误率飙升。'
    },
    {
      id: 'ev_approval',
      name: '审批记录',
      source: '审批系统',
      reliability: 1.0,
      facts: ['canary_not_reviewed', 'zhou_approved'],
      desc: '22:20 小周批准发布，备注"配置已确认"，但未附灰度配置复核。'
    },
    {
      id: 'ev_alert',
      name: '告警记录',
      source: '监控平台',
      reliability: 1.0,
      facts: ['deploy_alert'],
      desc: '22:45 生产 OOM 告警。'
    }
  ],
  topics: {
    sun2: [
      {
        id: 't_canary',
        subject: '灰度怎么配的',
        ask: '这次发布的灰度比例你是怎么配的？',
        responses: [
          {
            id: 'r_lie',
            priority: 10,
            facts: ['sun_claimed_1pct'],
            text: '我按规范写的，灰度 1%，只放了一小部分流量。'
          },
          {
            id: 'r_truth',
            priority: 100,
            when: { presentedEvidence: ['ev_release_log'] },
            facts: ['canary_100pct', 'config_unit_error', 'sun_wrote_canary'],
            text: '……发布记录打脸了。我把比例字段手滑写成了 100，提交前没核对。',
            unlocks: ['t_why'],
            shakeTrust: 5
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么会写错',
        ask: '比例怎么会写成 100%？',
        unlock: { discoveredFacts: ['canary_100pct'] },
        responses: [
          { id: 'r_why', priority: 50, facts: ['config_unit_error'], text: '复制粘贴的模板，单位没注意，以为 1 就够，结果填成了 100。' }
        ]
      }
    ],
    zhou: [
      {
        id: 't_approve',
        subject: '你批了发布吗',
        ask: '这次发布是你审批放行的吗？',
        responses: [
          {
            id: 'r_approve',
            priority: 10,
            facts: ['zhou_approved', 'canary_not_reviewed'],
            text: '是我批的。我看标题说"小灰度"，就点了通过，没去翻灰度配置。',
            unlocks: ['t_check']
          }
        ]
      },
      {
        id: 't_check',
        subject: '校验配置了吗',
        ask: '你审批时校验过灰度比例吗？',
        unlock: { askedTopics: ['t_approve'] },
        responses: [
          { id: 'r_check', priority: 10, facts: ['canary_not_reviewed'], text: '没有，流程没要求我查配置，我就信了开发写的。' }
        ]
      }
    ],
    rel: [
      {
        id: 't_release',
        subject: '发布情况',
        ask: '你执行了这次发布吗？',
        responses: [
          {
            id: 'r_release',
            priority: 10,
            facts: ['prod_oom', 'release_done'],
            text: '我照配置点发布的，跑完没多久实例就 OOM 了。',
            unlocks: ['t_config']
          }
        ]
      },
      {
        id: 't_config',
        subject: '配置哪来的',
        ask: '发布用的配置是谁给的？',
        unlock: { discoveredFacts: ['prod_oom'] },
        responses: [
          { id: 'r_config', priority: 10, facts: ['canary_100pct'], text: '系统显示放量 100%，配置是小孙那边提交的，我只管执行。' }
        ]
      }
    ],
    sre: [
      {
        id: 't_alert',
        subject: '告警情况',
        ask: '发布之后生产是什么状态？',
        responses: [
          {
            id: 'r_alert',
            priority: 10,
            facts: ['deploy_alert', 'prod_oom', 'mem_leak_seen'],
            text: '22:30 之后内存曲线一路往上，新版本有泄漏，全量直接把实例拖垮。',
            unlocks: ['t_perf']
          }
        ]
      },
      {
        id: 't_perf',
        subject: '性能曲线',
        ask: '曲线能说明什么？',
        unlock: { discoveredFacts: ['deploy_alert'] },
        responses: [
          { id: 'r_perf', priority: 10, facts: ['mem_leak'], text: '全量放的新版本内存不回收，OOM 是必然的。' }
        ]
      }
    ]
  },
  contradictions: [
    ['sun_claimed_1pct', 'canary_100pct']
  ],
  supports: [
    ['canary_100pct', 'prod_oom']
  ],
  factLabels: {
    sun_wrote_canary: '小孙编写了灰度配置',
    canary_100pct: '灰度比例被写成 100%',
    config_unit_error: '比例字段单位/数值写错',
    canary_not_reviewed: '灰度配置未被校验',
    zhou_approved: '小周批准了发布',
    prod_oom: '实例大面积 OOM',
    release_done: '发布已执行',
    deploy_alert: '生产 OOM 告警',
    sun_claimed_1pct: '小孙自称只灰度 1%',
    mem_leak_seen: '监控发现内存泄漏'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['sun2'],
    contributory: ['zhou'],
    action: 'wrong_canary_config',
    actionAliases: ['灰度配置错误', '灰度比例错误', '全量灰度发布', '误发全量', '发布配置错误', '灰度写成100', '灰度比例写成100'],
    requiredEvidence: ['ev_release_log', 'ev_approval'],
    minEvidence: 2,
    requiredFacts: ['canary_100pct', 'mem_leak', 'canary_not_reviewed'],
    timeWindowMin: 15
  },
  ending: {
    success:
      '你还原了真相：小孙把灰度比例误写成 100%，带内存泄漏的新版本被全量发布，实例大面积 OOM；小周作为审批人未校验灰度配置即放行，负管理责任。团队此后要求灰度比例双人复核、并加发布前配置扫描，类似的"手滑 100%"再没出现过。',
    partial:
      '你锁定了小孙，但证据链仍有缺口，或遗漏了小周的审批责任。指控成立但不完整——下次记得把"写错配置"和"放行的人"分开看。',
    fail: '指控落空。真凶仍在发布窗口里。记住：灰度比例必须复核，日志里 100% 不会撒谎。'
  }
}
