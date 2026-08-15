// 案件 5：生产配置回滚选错版本——运维深夜回滚时误用了 staging 分支配置（未标注环境），
// 旧配置上线反而引发更严重的故障。架构师未建立环境标注与回滚保护（管理责任）。
// 玩家需识破"按标准流程回滚"的谎言：证据显示用的是 staging 配置。
import type { CaseDef } from '../../case-model/types'

export const case5: CaseDef = {
  id: 'config-rollback',
  title: '回滚的陷阱',
  chapter: 5,
  brief:
    '今晨 00:05 生产环境告警，回滚操作后故障反而更严重。已知：昨夜有人对生产配置执行了回滚。\n请查明：谁执行了回滚、回滚到了什么配置、为何比不回滚还糟、是否有人埋下了隐患。',
  intro:
    '半夜的机房只有服务器的嗡鸣。生产报警说"配置回滚后服务更慢了"。小赵说自己是按流程办事，大钱说规范早就发了，小孙说配置是他给的。可当调度表摊开，没人说得清那份配置到底属于哪个环境。',
  characters: [
    { id: 'zhao', name: '小赵', role: '运维工程师', avatar: '🧰', blurb: '负责生产发布，信奉"回滚能解决一切"。' },
    { id: 'qian', name: '大钱', role: '架构师', avatar: '📐', blurb: '定了配置规范，却没强制落地。' },
    { id: 'sun', name: '小孙', role: '后端开发', avatar: '🧑‍💻', blurb: '写配置的人，提交时从没标过环境。' },
    { id: 'sre', name: '小监控', role: 'SRE', avatar: '📟', blurb: '半夜盯着告警曲线的人。' }
  ],
  truthEvents: [
    {
      id: 'qian_no_label',
      time: '21:00',
      location: '架构评审会',
      actors: ['qian'],
      action: 'no_env_label',
      cause: '未强制配置标注环境，留下隐患',
      facts: ['config_no_env_label', 'qian_missed_review']
    },
    {
      id: 'zhao_rollback',
      time: '23:40',
      location: '小赵工位',
      actors: ['zhao'],
      action: 'rollback_wrong_config',
      cause: '深夜回滚时误用 staging 分支配置',
      facts: ['zhao_rollback_wrong', 'used_staging_config', 'prod_broken_by_rollback']
    },
    {
      id: 'alert',
      time: '00:05',
      location: '生产环境',
      actors: ['sre'],
      action: 'receive_alert',
      facts: ['deploy_alert', 'prod_broken_by_rollback']
    }
  ],
  knowledge: [
    {
      character: 'zhao',
      observed: ['zhao_rollback_wrong', 'used_staging_config', 'prod_broken_by_rollback'],
      heard: ['config_no_env_label'],
      beliefs: ['zhao_claimed_prod_config'],
      intent: 'lie',
      secrets: ['zhao_rollback_wrong', 'used_staging_config']
    },
    {
      character: 'qian',
      observed: ['config_no_env_label', 'qian_missed_review'],
      heard: [],
      beliefs: [],
      intent: 'forget',
      secrets: []
    },
    {
      character: 'sun',
      observed: ['sun_wrote_no_env'],
      heard: [],
      beliefs: [],
      intent: 'honest',
      secrets: []
    },
    {
      character: 'sre',
      observed: ['deploy_alert', 'prod_broken_by_rollback'],
      heard: [],
      beliefs: [],
      intent: 'honest',
      secrets: []
    }
  ],
  evidence: [
    {
      id: 'ev_audit',
      name: '操作审计日志',
      source: '运维审计系统',
      reliability: 1.0,
      facts: ['zhao_rollback_wrong', 'used_staging_config'],
      desc: '23:40 小赵对 prod 执行 rollback，目标配置来自 staging 分支（commit 于测试环境）。'
    },
    {
      id: 'ev_config_diff',
      name: '配置仓库 diff',
      source: 'Git 配置仓库',
      reliability: 1.0,
      facts: ['config_no_env_label', 'qian_missed_review'],
      desc: '被回滚的配置无任何 env 标注，架构评审记录里没有"必须标注环境"的条目。'
    },
    {
      id: 'ev_alert',
      name: '告警与性能曲线',
      source: '监控平台',
      reliability: 1.0,
      facts: ['deploy_alert', 'prod_broken_by_rollback'],
      desc: '00:05 回滚后服务 RT 飙升、错误率翻倍，明显比回滚前更糟。'
    }
  ],
  topics: {
    zhao: [
      {
        id: 't_lastnight',
        subject: '昨晚你回滚了吗',
        ask: '昨夜生产配置回滚，是你操作的吗？',
        responses: [
          {
            id: 'r_lie',
            priority: 10,
            facts: ['zhao_claimed_prod_config'],
            text: '是我回滚的，按标准流程，用的就是生产配置，没问题。'
          },
          {
            id: 'r_truth',
            priority: 100,
            when: { presentedEvidence: ['ev_audit'] },
            facts: ['zhao_rollback_wrong', 'used_staging_config', 'prod_broken_by_rollback'],
            text: '……审计日志都出来了。我承认，手一滑选了 staging 那份配置回滚，当时太困没看分支。',
            unlocks: ['t_why', 't_config'],
            shakeTrust: 5
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么要回滚',
        ask: '当时为什么要做这次回滚？',
        unlock: { discoveredFacts: ['zhao_rollback_wrong'] },
        responses: [
          { id: 'r_why', priority: 50, facts: ['zhao_rollback_wrong'], text: '上游说生产有问题，让我先回滚试试，我就照做了。' }
        ]
      },
      {
        id: 't_config',
        subject: '配置来源',
        ask: '你回滚用的配置是哪来的？',
        unlock: { discoveredFacts: ['zhao_rollback_wrong'] },
        responses: [
          { id: 'r_config', priority: 50, facts: ['used_staging_config'], text: '我以为那是生产配置，结果是 staging 的，两份长得一模一样。' }
        ]
      }
    ],
    qian: [
      {
        id: 't_review',
        subject: '配置规范',
        ask: '团队对生产配置有规范要求吗？',
        responses: [
          {
            id: 'r_review',
            priority: 10,
            facts: ['config_no_env_label', 'qian_missed_review'],
            text: '规范文档里提过要标环境，但我没强制落地，也没在评审里卡这一条。',
            unlocks: ['t_process']
          }
        ]
      },
      {
        id: 't_process',
        subject: '评审流程',
        ask: '配置变更走评审吗？',
        unlock: { askedTopics: ['t_review'] },
        responses: [
          { id: 'r_process', priority: 10, facts: ['qian_missed_review'], text: '回滚一般走应急通道，事后补单，环境标注这块确实没守住。' }
        ]
      }
    ],
    sun: [
      {
        id: 't_config',
        subject: '你提交过配置吗',
        ask: '这份被回滚的配置是你写的吗？',
        responses: [
          {
            id: 'r_config',
            priority: 10,
            facts: ['sun_wrote_no_env'],
            text: '是我提交的。我习惯不写 env，反正本地和测试都是同一份……生产那份我也没单独标。'
          }
        ]
      }
    ],
    sre: [
      {
        id: 't_alert',
        subject: '告警情况',
        ask: '回滚之后生产是什么状态？',
        responses: [
          {
            id: 'r_alert',
            priority: 10,
            facts: ['deploy_alert', 'prod_broken_by_rollback', 'sre_saw_log'],
            text: '回滚完反而更糟，RT 翻倍、错误率上去了。那份配置明显不对劲。',
            unlocks: ['t_perf']
          }
        ]
      },
      {
        id: 't_perf',
        subject: '性能曲线',
        ask: '曲线能说明问题吗？',
        unlock: { discoveredFacts: ['deploy_alert'] },
        responses: [
          { id: 'r_perf', priority: 10, facts: ['prod_broken_by_rollback'], text: '回滚前后的曲线对比很清楚，是配置本身把服务拖垮了。' }
        ]
      }
    ]
  },
  contradictions: [
    ['zhao_claimed_prod_config', 'used_staging_config']
  ],
  supports: [
    ['zhao_rollback_wrong', 'prod_broken_by_rollback']
  ],
  factLabels: {
    zhao_rollback_wrong: '小赵错误执行了生产回滚',
    used_staging_config: '回滚误用了 staging 配置',
    prod_broken_by_rollback: '回滚后生产反而更糟',
    config_no_env_label: '配置无环境标注',
    qian_missed_review: '大钱未强制环境标注',
    zhao_claimed_prod_config: '小赵自称用的是生产配置',
    sun_wrote_no_env: '小孙提交的配置未标环境',
    deploy_alert: '生产环境告警',
    sre_saw_log: '小监控查看了性能曲线'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['zhao'],
    contributory: ['qian'],
    action: 'rollback_wrong_config',
    actionAliases: ['错误回滚', '回滚错误配置', '误用staging配置', '回滚到错误版本', '选错配置版本', '回滚了错误配置'],
    requiredEvidence: ['ev_audit', 'ev_config_diff'],
    minEvidence: 2,
    requiredFacts: ['zhao_rollback_wrong', 'used_staging_config', 'config_no_env_label'],
    timeWindowMin: 15
  },
  ending: {
    success:
      '你还原了真相：小赵深夜回滚时误用了未标注环境的 staging 配置，导致生产比不回滚更糟；大钱作为架构师未强制环境标注、留下隐患，负管理责任。团队此后给配置加上环境锁与回滚二次确认，类似的"手滑"再没发生过。',
    partial:
      '你锁定了小赵，但证据链仍有缺口，或遗漏了大钱的管理责任。指控成立但不完整——下次记得把"执行回滚"和"埋下隐患"分开看。',
    fail: '指控落空。真凶仍在机房里。记住：配置必须标注环境，日志不会替你背锅。'
  }
}
