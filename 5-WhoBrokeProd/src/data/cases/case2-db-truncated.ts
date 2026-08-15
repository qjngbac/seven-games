// 案件 2：生产数据库被清空。
// 真相：实习生小吴误把部署环境变量从 staging 改成 prod；开发阿强跑"清理脚本"以为在 staging，
// 实际 TRUNCATE 了生产订单表；DBA 小慧批了脚本但备注写的是 staging。
// 玩家需区分"执行 TRUNCATE"(dev_qiang) 与"把配置指向生产"(intern_wu)。
import type { CaseDef } from '../../case-model/types'

export const case2: CaseDef = {
  id: 'db-truncated',
  title: '空了的订单表',
  chapter: 2,
  brief:
    '今晨发现生产订单表被清空，近 12 小时交易全部丢失。已知：昨夜有人跑过一个"清理脚本"，且部署环境配置有过改动。\n请查明：谁执行了 TRUNCATE、环境为何指向生产、备份是否还能救。',
  intro:
    '订单表空了。客服电话被打爆，老板脸色铁青。四个当事人围在白板前：开发说"我只在 staging 跑的"，实习生低头不语，DBA 翻着工单，安全盯着告警。配置里藏着答案。',
  characters: [
    { id: 'dev_qiang', name: '阿强', role: '后端开发', avatar: '💾', blurb: '写了清理脚本，坚信自己只在测试环境跑。' },
    { id: 'intern_wu', name: '小吴', role: '实习生', avatar: '🐣', blurb: '昨夜改过部署配置，此刻很慌。' },
    { id: 'dba', name: '小慧', role: 'DBA', avatar: '🗄️', blurb: '审批了清理脚本，备注写的是 staging。' },
    { id: 'sec', name: '小安', role: '安全工程师', avatar: '🔐', blurb: '第一个看到告警的人。' }
  ],
  truthEvents: [
    {
      id: 'config_changed',
      time: '02:00',
      location: '部署配置',
      actors: ['intern_wu'],
      action: 'change_env_to_prod',
      cause: '误将环境变量由 staging 改为 prod',
      facts: ['env_prod', 'config_changed_by_intern']
    },
    {
      id: 'truncate',
      time: '02:20',
      location: '生产数据库',
      actors: ['dev_qiang'],
      action: 'truncate',
      cause: '在"以为的 staging"执行 TRUNCATE orders',
      facts: ['db_truncated', 'dev_ran_script', 'prod_data_loss']
    },
    {
      id: 'dba_approve',
      time: '01:30',
      location: 'DBA 工单',
      actors: ['dba'],
      action: 'approve_script',
      facts: ['dba_approved_script']
    },
    { id: 'alert', time: '02:25', location: '监控', actors: ['sec'], action: 'receive_alert', facts: ['db_alert', 'prod_data_loss'] }
  ],
  knowledge: [
    {
      character: 'dev_qiang',
      observed: ['dev_ran_script', 'script_truncate_staging'],
      heard: [],
      beliefs: ['dev_staging_only', 'script_truncate_staging'],
      intent: 'misunderstand',
      secrets: ['db_truncated']
    },
    { character: 'intern_wu', observed: ['env_prod', 'config_changed_by_intern'], heard: [], beliefs: [], intent: 'secret', secrets: ['config_changed_by_intern'] },
    { character: 'dba', observed: ['dba_approved_script'], heard: [], beliefs: ['dba_thought_staging'], intent: 'honest', secrets: [] },
    { character: 'sec', observed: ['db_alert', 'prod_data_loss', 'backup_stale'], heard: [], beliefs: [], intent: 'honest', secrets: [] }
  ],
  evidence: [
    {
      id: 'db_audit',
      name: '数据库审计日志',
      source: '数据库审计',
      reliability: 1.0,
      facts: ['db_truncated', 'dev_ran_script'],
      desc: '02:20 账号 dev_qiang 对 orders 表执行 TRUNCATE。'
    },
    {
      id: 'conn_log',
      name: '连接配置历史',
      source: '配置中心',
      reliability: 1.0,
      facts: ['env_prod', 'config_changed_by_intern'],
      desc: '02:00 环境变量 env 由 staging 改为 prod，修改人 intern_wu。'
    },
    {
      id: 'script_file',
      name: '清理脚本内容',
      source: '代码仓库',
      reliability: 1.0,
      facts: ['script_truncate_staging', 'db_truncated'],
      desc: 'TRUNCATE orders; 注释写"仅 staging 执行"。'
    },
    {
      id: 'dba_ticket',
      name: 'DBA 审批工单',
      source: '工单系统',
      reliability: 0.9,
      facts: ['dba_approved_script', 'dba_thought_staging'],
      desc: '小慧审批通过清理脚本，备注"已确认环境为 staging"。'
    },
    {
      id: 'backup_log',
      name: '备份记录',
      source: '备份系统',
      reliability: 1.0,
      facts: ['backup_stale'],
      desc: '最近一次有效全量备份在 3 天前。'
    }
  ],
  topics: {
    dev_qiang: [
      {
        id: 't_ran',
        subject: '你跑脚本了吗',
        ask: '昨晚那个清理脚本是你跑的吧？',
        responses: [
          {
            id: 'r_staging',
            priority: 10,
            facts: ['dev_staging_only'],
            text: '我只在 staging 跑了清理脚本，绝没碰过生产数据库。'
          },
          {
            id: 'r_truth',
            priority: 100,
            when: { presentedEvidence: ['conn_log'] },
            facts: ['db_truncated', 'prod_data_loss', 'env_prod'],
            text: '……配置怎么是 prod？我以为连的是 staging，结果把生产的表清了。',
            unlocks: ['t_why']
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么不清空',
        ask: '清理脚本为什么要 TRUNCATE？',
        unlock: { discoveredFacts: ['db_truncated'] },
        responses: [
          { id: 'r_why', priority: 50, facts: ['script_truncate_staging'], text: '脚本是清测试脏数据的，注释写了仅 staging，我照常用了。' }
        ]
      }
    ],
    intern_wu: [
      {
        id: 't_config',
        subject: '你动过配置吗',
        ask: '昨晚部署配置你改过吗？',
        responses: [
          {
            id: 'r_no',
            priority: 10,
            facts: ['intern_no_change'],
            text: '我……我没动过什么配置啊。'
          },
          {
            id: 'r_yes',
            priority: 100,
            when: { presentedEvidence: ['conn_log'] },
            facts: ['config_changed_by_intern', 'env_prod'],
            text: '我、我本来想改端口测试，手滑把 env 改成 prod 了，忘了改回来……',
            unlocks: ['t_sorry']
          }
        ]
      },
      {
        id: 't_sorry',
        subject: '你意识到吗',
        ask: '你知道这会导致什么吗？',
        unlock: { askedTopics: ['t_config'] },
        responses: [
          { id: 'r_sorry', priority: 50, facts: [], text: '我不知道它会连到生产库……真的不是故意的。' }
        ]
      }
    ],
    dba: [
      {
        id: 't_ticket',
        subject: '脚本工单',
        ask: '清理脚本的工单是你批的？',
        responses: [
          {
            id: 'r_ticket',
            priority: 10,
            facts: ['dba_approved_script', 'dba_thought_staging'],
            text: '我批了，但备注写的是 staging 环境。谁把 env 改成 prod 了我不知道。'
          }
        ]
      }
    ],
    sec: [
      {
        id: 't_alert',
        subject: '告警详情',
        ask: '告警里说了什么？',
        responses: [
          {
            id: 'r_alert',
            priority: 10,
            facts: ['db_alert', 'prod_data_loss', 'backup_stale'],
            text: '订单表空了，最近备份还是三天前的——这次数据很难全找回。'
          }
        ]
      }
    ]
  },
  contradictions: [
    ['dev_staging_only', 'env_prod'],
    ['dev_staging_only', 'db_truncated'],
    ['intern_no_change', 'config_changed_by_intern']
  ],
  supports: [['config_changed_by_intern', 'env_prod']],
  factLabels: {
    env_prod: '环境变量指向生产',
    config_changed_by_intern: '小吴把 env 改为 prod',
    db_truncated: '生产订单表被清空',
    dev_ran_script: '阿强执行了清理脚本',
    prod_data_loss: '生产数据丢失',
    script_truncate_staging: '脚本注释写"仅 staging"',
    dba_approved_script: '小慧审批了脚本',
    dba_thought_staging: '小慧以为环境是 staging',
    backup_stale: '备份已过期(3天前)',
    db_alert: '数据库告警',
    dev_staging_only: '阿强自称只在 staging 跑',
    intern_no_change: '小吴自称没动配置'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['dev_qiang'],
    contributory: ['intern_wu'],
    action: 'truncate',
    actionAliases: ['清空', 'truncate', 'truncate table', '删除表数据', '清表', '清空订单表'],
    requiredEvidence: ['db_audit', 'conn_log'],
    minEvidence: 2,
    requiredFacts: ['db_truncated', 'env_prod', 'config_changed_by_intern'],
    timeWindowMin: 10
  },
  ending: {
    success:
      '你还原了真相：实习生小吴误将环境变量指向生产，开发阿强在"以为的 staging"执行了 TRUNCATE，生产订单表被清空；DBA 小慧批了脚本但备注为 staging。团队补全了环境隔离与备份策略，类似的"手滑"再不会连到生产。',
    partial:
      '你锁定了阿强，但证据链仍有缺口，或遗漏了小吴把配置指向生产这一环。指控成立但不完整。',
    fail: '指控落空。数据仍在丢失中。记住：环境配置与执行脚本，缺一不可。'
  }
}
