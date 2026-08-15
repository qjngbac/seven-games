// 案件 3：API 密钥泄露到公开仓库。
// 真相：开发阿楠把含密钥的 .env 提交到公开仓库（以为私有）；CI 把密钥打印到公开日志（verbose 未关）。
// 责任：阿楠（提交密钥）主要；阿海（CI 配置打印密钥）管理/次要责任。
import type { CaseDef } from '../../case-model/types'

export const case3: CaseDef = {
  id: 'secret-leaked',
  title: '泄露的密钥',
  chapter: 3,
  brief:
    '安全团队凌晨发现一条生产 API 密钥出现在公开代码仓库与构建日志中。已知：昨夜有一次含 .env 的提交，CI 日志外泄。\n请查明：谁提交了密钥、密钥如何流入公开日志、能否及时吊销。',
  intro:
    '一条 sk_live_ 开头的密钥，赫然挂在公开仓库的提交记录和 CI 日志里。安全小柯凌晨拉响了警报。开发说"我没提交过"，运维说"CI 没打日志"——可日志不会撒谎。',
  characters: [
    { id: 'dev_nan', name: '阿楠', role: '后端开发', avatar: '🧑‍💻', blurb: '昨夜提交过代码，坚称清白。' },
    { id: 'sec_ke', name: '小柯', role: '安全工程师', avatar: '🔐', blurb: '发现泄露并第一时间吊销。' },
    { id: 'devops_hai', name: '阿海', role: '运维/CI', avatar: '🛠️', blurb: '负责 CI 配置，有点健忘。' },
    { id: 'reviewer', name: '小周', role: '代码评审', avatar: '📝', blurb: 'approve 了那条提交。' }
  ],
  truthEvents: [
    {
      id: 'commit',
      time: '23:40',
      location: '公开仓库',
      actors: ['dev_nan'],
      action: 'commit_secret',
      cause: '把含密钥的 .env 当作私有仓库提交',
      facts: ['secret_committed', 'dev_committed_env']
    },
    {
      id: 'ci_leak',
      time: '23:45',
      location: 'CI 公开日志',
      actors: ['devops_hai'],
      action: 'print_secret_in_log',
      cause: 'verbose 模式未关，回显环境变量',
      facts: ['ci_printed_secret', 'secret_in_log', 'ci_verbose_on']
    },
    { id: 'scan', time: '00:10', location: '安全扫描', actors: ['sec_ke'], action: 'detect_leak', facts: ['secret_scanned'] },
    { id: 'revoke', time: '00:30', location: '密钥管理', actors: ['sec_ke'], action: 'revoke_key', facts: ['secret_revoked'] }
  ],
  knowledge: [
    { character: 'dev_nan', observed: ['secret_committed', 'dev_committed_env'], heard: [], beliefs: [], intent: 'lie', secrets: ['secret_committed'] },
    { character: 'sec_ke', observed: ['secret_scanned', 'secret_revoked', 'secret_in_log'], heard: [], beliefs: [], intent: 'honest', secrets: [] },
    { character: 'devops_hai', observed: ['ci_verbose_on', 'ci_printed_secret'], heard: [], beliefs: ['ci_no_log'], intent: 'misunderstand', secrets: [] },
    { character: 'reviewer', observed: ['reviewer_approved'], heard: [], beliefs: [], intent: 'honest', secrets: [] }
  ],
  evidence: [
    {
      id: 'git_history',
      name: 'Git 提交历史',
      source: '代码仓库',
      reliability: 1.0,
      facts: ['secret_committed', 'dev_committed_env'],
      desc: '23:40 提交含 .env 文件（内含 API 密钥），作者 dev_nan，仓库为 public。'
    },
    {
      id: 'ci_log',
      name: 'CI 构建日志（公开）',
      source: 'CI 系统',
      reliability: 1.0,
      facts: ['ci_printed_secret', 'secret_in_log'],
      desc: "构建步骤打印了 'API_KEY=sk_live_xxxx'。"
    },
    {
      id: 'scan_report',
      name: '安全扫描报告',
      source: '安全平台',
      reliability: 1.0,
      facts: ['secret_scanned'],
      desc: '00:10 在公开仓库发现泄露的生产密钥。'
    },
    {
      id: 'pr_review',
      name: 'PR 评审记录',
      source: '代码平台',
      reliability: 0.9,
      facts: ['reviewer_approved'],
      desc: '小周 approve 了该提交，未要求移除 .env。'
    },
    {
      id: 'config_ci',
      name: 'CI 配置快照',
      source: 'CI 系统',
      reliability: 1.0,
      facts: ['ci_verbose_on'],
      desc: 'verbose 模式开启，会回显环境变量。'
    }
  ],
  topics: {
    dev_nan: [
      {
        id: 't_commit',
        subject: '你提交过密钥吗',
        ask: '昨夜那条提交里有 .env 吗？',
        responses: [
          {
            id: 'r_no',
            priority: 10,
            facts: ['dev_no_secret'],
            text: '我从没提交过任何密钥，别冤枉我。'
          },
          {
            id: 'r_yes',
            priority: 100,
            when: { presentedEvidence: ['git_history'] },
            facts: ['secret_committed', 'dev_committed_env'],
            text: '……行，我提交了，但我以为那个仓库是私有的。',
            unlocks: ['t_why']
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么提交 .env',
        ask: '你明知道不该提交密钥啊？',
        unlock: { discoveredFacts: ['secret_committed'] },
        responses: [
          { id: 'r_why', priority: 50, facts: [], text: '本地跑需要这个文件，我顺手就加进去了，没多想。' }
        ]
      }
    ],
    sec_ke: [
      {
        id: 't_scan',
        subject: '泄露情况',
        ask: '密钥泄露你查清楚了吗？',
        responses: [
          {
            id: 'r_scan',
            priority: 10,
            facts: ['secret_scanned', 'secret_in_log', 'secret_revoked'],
            text: '公开日志里就有明文密钥，我已经吊销了，但泄露窗口已经存在。'
          }
        ]
      }
    ],
    devops_hai: [
      {
        id: 't_ci',
        subject: 'CI 打日志了吗',
        ask: 'CI 有没有把密钥打印到日志？',
        responses: [
          {
            id: 'r_no',
            priority: 10,
            facts: ['ci_no_log'],
            text: 'CI 配置是标准模板，我没让它打日志。'
          },
          {
            id: 'r_yes',
            priority: 100,
            when: { presentedEvidence: ['ci_log'] },
            facts: ['ci_verbose_on', 'ci_printed_secret'],
            text: '哦……verbose 确实开着，是我忘了关，密钥被回显出来了。'
          }
        ]
      }
    ],
    reviewer: [
      {
        id: 't_review',
        subject: '你审过那条 PR 吗',
        ask: '那条提交你 review 了吗？',
        responses: [
          { id: 'r_review', priority: 10, facts: ['reviewer_approved'], text: '我 approve 了，但没注意里面有个 .env 文件。' }
        ]
      }
    ]
  },
  contradictions: [
    ['dev_no_secret', 'secret_committed'],
    ['ci_no_log', 'secret_in_log']
  ],
  supports: [['ci_verbose_on', 'ci_printed_secret']],
  factLabels: {
    secret_committed: '阿楠提交了含密钥的 .env',
    dev_committed_env: '提交中包含环境文件',
    ci_printed_secret: 'CI 打印了密钥明文',
    secret_in_log: '密钥出现在公开日志',
    ci_verbose_on: 'CI verbose 模式开启',
    secret_scanned: '安全扫描发现泄露',
    secret_revoked: '密钥已吊销',
    reviewer_approved: '小周 approve 了提交',
    dev_no_secret: '阿楠自称未提交密钥',
    ci_no_log: '阿海自称 CI 没打日志'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['dev_nan'],
    contributory: ['devops_hai'],
    action: 'commit_secret',
    actionAliases: ['提交密钥', '泄露密钥', '提交.env', '上传密钥', '泄露凭证', '提交了密钥文件'],
    requiredEvidence: ['git_history', 'ci_log'],
    minEvidence: 2,
    requiredFacts: ['secret_committed', 'ci_printed_secret'],
    timeWindowMin: 15
  },
  ending: {
    success:
      '你还原了真相：阿楠把含密钥的 .env 提交到公开仓库（以为私有），阿海未关 CI 的 verbose 模式导致密钥被打印到公开日志；小柯已吊销密钥。团队此后启用密钥扫描与日志脱敏，类似的明文密钥再不会出现。',
    partial:
      '你锁定了阿楠，但证据链仍有缺口，或遗漏了阿海未关 CI 日志打印这一管理责任。指控成立但不完整。',
    fail: '指控落空。密钥仍挂在公开日志里。记住：Git 历史与 CI 日志都会留下铁证。'
  }
}
