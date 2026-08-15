// 案件 7：定时任务撞车——数据工程师新增一个 02:00 的数据同步任务，与已有的 02:00 账单批处理
// 争抢同一把数据库锁，死锁导致批处理失败、数据不一致。Leader 未建立 cron 评审/注册表（管理责任）。
// 玩家需识破"这个时段就我一个任务"的谎言：调度表显示已有 02:00 账单任务。
import type { CaseDef } from '../../case-model/types'

export const case7: CaseDef = {
  id: 'cron-crash',
  title: '凌晨两点的死锁',
  chapter: 7,
  brief:
    '今晨 02:10 批处理告警，账单任务死锁失败、数据不一致。已知：调度系统上有多个定时任务。\n请查明：谁新增了冲突任务、为何撞车、是否有人没守住评审。',
  intro:
    '凌晨两点，数据库锁在尖叫。账单批处理每年这时候都乖乖跑，今夜却卡死。小吴说自己是新来的、这个时段没别人；小陈说账单任务一直两点跑；老郑说 cron 评审"以后再说"。调度表里，两个 02:00 静静并排躺着。',
  characters: [
    { id: 'wu', name: '小吴', role: '数据工程师', avatar: '🗄️', blurb: '新来的，加了个数据同步任务。' },
    { id: 'zheng', name: '老郑', role: '技术 Leader', avatar: '👔', blurb: '管排期，cron 评审一直没建。' },
    { id: 'dev2', name: '小陈', role: '后端开发', avatar: '🧑‍💻', blurb: '账单批处理的 owner，任务一直 02:00。' },
    { id: 'sre', name: '小监控', role: 'SRE', avatar: '📟', blurb: '盯着死锁日志的人。' }
  ],
  truthEvents: [
    {
      id: 'zheng_no_review',
      time: '20:00',
      location: '周会',
      actors: ['zheng'],
      action: 'no_cron_review',
      cause: '未建立定时任务评审与注册表',
      facts: ['no_cron_review', 'zheng_no_registry']
    },
    {
      id: 'wu_add',
      time: '21:30',
      location: '小吴工位',
      actors: ['wu'],
      action: 'add_conflicting_cron',
      cause: '新增 02:00 任务未核对已有调度',
      facts: ['wu_added_job', 'cron_collision', 'wu_didnt_check']
    },
    {
      id: 'collision',
      time: '02:00',
      location: '生产数据库',
      actors: ['wu', 'dev2'],
      action: 'job_collision',
      cause: '两个 02:00 任务争抢同一把锁',
      facts: ['cron_collision', 'db_deadlock', 'batch_failed', 'data_inconsistent']
    },
    {
      id: 'alert',
      time: '02:10',
      location: '生产数据库',
      actors: ['sre'],
      action: 'receive_alert',
      facts: ['deploy_alert', 'batch_failed']
    }
  ],
  knowledge: [
    {
      character: 'wu',
      observed: ['wu_added_job', 'cron_collision', 'wu_didnt_check'],
      heard: [],
      beliefs: ['wu_claimed_unique'],
      intent: 'lie',
      secrets: ['cron_collision', 'wu_didnt_check']
    },
    {
      character: 'zheng',
      observed: ['no_cron_review', 'zheng_no_registry'],
      heard: [],
      beliefs: [],
      intent: 'forget',
      secrets: []
    },
    {
      character: 'dev2',
      observed: ['dev2_owned_job', 'existing_0200_job'],
      heard: [],
      beliefs: [],
      intent: 'honest',
      secrets: []
    },
    {
      character: 'sre',
      observed: ['deploy_alert', 'batch_failed'],
      heard: [],
      beliefs: ['db_deadlock_seen', 'data_inconsistent'],
      intent: 'honest',
      secrets: []
    }
  ],
  evidence: [
    {
      id: 'ev_cron_table',
      name: '调度系统任务表',
      source: '调度平台',
      reliability: 1.0,
      facts: ['cron_collision', 'existing_0200_job', 'wu_added_job'],
      desc: '02:00 存在两个任务：账单批处理(小陈)、数据同步(小吴)，二者抢同一把锁。'
    },
    {
      id: 'ev_db_log',
      name: '数据库死锁日志',
      source: '数据库审计',
      reliability: 1.0,
      facts: ['db_deadlock', 'batch_failed', 'data_inconsistent'],
      desc: '02:00 死锁，账单批处理失败，部分数据写入不一致。'
    },
    {
      id: 'ev_review_log',
      name: '评审记录',
      source: '研发流程系统',
      reliability: 1.0,
      facts: ['no_cron_review'],
      desc: '定时任务新增无评审环节，无 cron 注册表。'
    },
    {
      id: 'ev_alert',
      name: '告警记录',
      source: '监控平台',
      reliability: 1.0,
      facts: ['deploy_alert'],
      desc: '02:10 批处理失败告警。'
    }
  ],
  topics: {
    wu: [
      {
        id: 't_job',
        subject: '你加了什么任务',
        ask: '你最近在调度系统上加了任务吗？',
        responses: [
          {
            id: 'r_lie',
            priority: 10,
            facts: ['wu_claimed_unique'],
            text: '我加了数据同步，这个时段就我一个任务，没跟谁冲突。'
          },
          {
            id: 'r_truth',
            priority: 100,
            when: { presentedEvidence: ['ev_cron_table'] },
            facts: ['wu_added_job', 'cron_collision', 'wu_didnt_check'],
            text: '……任务表都在这。我加的时候没看已有调度，确实和账单任务撞在 02:00 了。',
            unlocks: ['t_why'],
            shakeTrust: 5
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么撞车',
        ask: '你加任务时没核对已有调度吗？',
        unlock: { discoveredFacts: ['cron_collision'] },
        responses: [
          { id: 'r_why', priority: 50, facts: ['wu_didnt_check'], text: '我以为 02:00 是空档，随手填了，没去查别人有没有任务。' }
        ]
      }
    ],
    zheng: [
      {
        id: 't_review',
        subject: 'cron 评审',
        ask: '团队对定时任务有评审吗？',
        responses: [
          {
            id: 'r_review',
            priority: 10,
            facts: ['no_cron_review', 'zheng_no_registry'],
            text: '这块我一直说要建注册表，但排期紧就搁下了，没强制评审。',
            unlocks: ['t_registry']
          }
        ]
      },
      {
        id: 't_registry',
        subject: '注册表',
        ask: '有 cron 注册表吗？',
        unlock: { askedTopics: ['t_review'] },
        responses: [
          { id: 'r_registry', priority: 10, facts: ['zheng_no_registry'], text: '没有统一注册表，谁加任务全靠自觉，这次就漏了。' }
        ]
      }
    ],
    dev2: [
      {
        id: 't_existing',
        subject: '原有任务',
        ask: '02:00 原本就有任务在跑吗？',
        responses: [
          {
            id: 'r_existing',
            priority: 10,
            facts: ['dev2_owned_job', 'existing_0200_job'],
            text: '账单批处理一直 02:00 跑，组里谁不知道，锁也是这把。',
            unlocks: ['t_conflict']
          }
        ]
      },
      {
        id: 't_conflict',
        subject: '知道新任务吗',
        ask: '你知道有人新加了 02:00 的任务吗？',
        unlock: { discoveredFacts: ['existing_0200_job'] },
        responses: [
          { id: 'r_conflict', priority: 10, facts: ['existing_0200_job'], text: '事先没人跟我说，上线后才发现锁被抢了。' }
        ]
      }
    ],
    sre: [
      {
        id: 't_alert',
        subject: '告警情况',
        ask: '凌晨批处理出了什么状况？',
        responses: [
          {
            id: 'r_alert',
            priority: 10,
            facts: ['deploy_alert', 'batch_failed', 'db_deadlock_seen'],
            text: '02:00 两个任务同时跑，死锁，账单直接挂了。',
            unlocks: ['t_db']
          }
        ]
      },
      {
        id: 't_db',
        subject: '数据库日志',
        ask: '死锁日志能说明什么？',
        unlock: { discoveredFacts: ['deploy_alert'] },
        responses: [
          { id: 'r_db', priority: 10, facts: ['db_deadlock', 'data_inconsistent'], text: '两个任务抢同一把锁，死锁后部分数据写歪了，不一致。' }
        ]
      }
    ]
  },
  contradictions: [
    ['wu_claimed_unique', 'existing_0200_job']
  ],
  supports: [
    ['cron_collision', 'db_deadlock']
  ],
  factLabels: {
    wu_added_job: '小吴新增了数据同步任务',
    cron_collision: '两个任务调度时间撞车',
    wu_didnt_check: '小吴未核对已有调度',
    no_cron_review: '无定时任务评审',
    zheng_no_registry: '老郑未建 cron 注册表',
    db_deadlock: '数据库死锁',
    batch_failed: '账单批处理失败',
    data_inconsistent: '部分数据不一致',
    deploy_alert: '批处理失败告警',
    wu_claimed_unique: '小吴自称时段无冲突',
    existing_0200_job: '已有 02:00 账单任务',
    dev2_owned_job: '小陈拥有账单任务',
    db_deadlock_seen: '监控发现死锁'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['wu'],
    contributory: ['zheng'],
    action: 'add_conflicting_cron',
    actionAliases: ['新增冲突定时任务', 'cron冲突', '定时任务撞车', '重复定时任务', '新增撞车任务', '重复调度任务', '加了两个同时的任务'],
    requiredEvidence: ['ev_cron_table', 'ev_db_log'],
    minEvidence: 2,
    requiredFacts: ['cron_collision', 'db_deadlock', 'no_cron_review'],
    timeWindowMin: 60
  },
  ending: {
    success:
      '你还原了真相：小吴新增数据同步任务时未核对已有调度，与 02:00 的账单批处理撞车争锁，死锁致批处理失败、数据不一致；老郑作为 Leader 未建立 cron 评审与注册表，负管理责任。团队此后上线 cron 注册表与新增任务评审，类似的"凌晨撞车"再没发生。',
    partial:
      '你锁定了小吴，但证据链仍有缺口，或遗漏了老郑的管理责任。指控成立但不完整——下次记得把"加任务"和"没守住评审"分开看。',
    fail: '指控落空。真凶仍在调度表里。记住：定时任务要查重，注册表不会替你记。'
  }
}
