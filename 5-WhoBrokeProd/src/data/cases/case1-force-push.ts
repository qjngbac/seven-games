// 案件 1（旗舰示例）：生产环境凌晨被强制推送。
// 真相：开发阿杰为快速修复小 bug，绕过评审于 03:02 向主干强制推送，坏代码上线致生产异常；
// 产品老王临时改需求制造时间压力（管理责任）；测试小琳只看到构建失败；运维大刘收到告警。
// 玩家需区分"制造诱因"(pm) 与"执行危险操作"(dev_A)。
import type { CaseDef } from '../../case-model/types'

export const case1: CaseDef = {
  id: 'force-push',
  title: '凌晨的强制推送',
  chapter: 1,
  brief:
    '今晨 03:05 生产环境告警，坏代码被部署上线，订单服务中断。已知：凌晨 CI 构建失败，有人绕过了评审流程。\n请查明：谁执行了危险操作、为何、是否有人制造了诱因子。',
  intro:
    '凌晨三点，运维大刘被告警惊醒。生产环境挂了。办公室里四个人各执一词——有人说自己早走了，有人说只是改了个需求，有人说"关我什么事"。真相藏在他们的话和冷冰冰的日志之间。',
  characters: [
    { id: 'dev_A', name: '阿杰', role: '后端开发', avatar: '🧑‍💻', blurb: '负责订单服务，急性子，信奉"先上了再说"。' },
    { id: 'tester', name: '小琳', role: '测试工程师', avatar: '🔍', blurb: '盯着 CI 的人，红了的构建她第一个知道。' },
    { id: 'pm', name: '老王', role: '产品经理', avatar: '📋', blurb: '需求永动机，昨夜临时改了需求。' },
    { id: 'ops', name: '大刘', role: '运维', avatar: '🛠️', blurb: '半夜被告警叫醒，手里有部署日志。' }
  ],
  truthEvents: [
    { id: 'build_failed', time: '02:35', location: 'CI 系统', actors: ['tester'], action: 'build_failed', facts: ['build_failed', 'ci_red'] },
    {
      id: 'pm_change_req',
      time: '01:50',
      location: '产品群',
      actors: ['pm'],
      action: 'change_requirement',
      cause: '临时改需求，制造上线时间压力',
      facts: ['pm_changed_req', 'pm_pressured']
    },
    {
      id: 'force_push',
      time: '03:02',
      location: '阿杰工位',
      actors: ['dev_A'],
      action: 'force_push',
      cause: '为快速修复小 bug 绕过评审直接推主干',
      facts: ['dev_A_force_push', 'bypassed_review', 'prod_deployed_bad']
    },
    {
      id: 'ops_alert',
      time: '03:05',
      location: '生产环境',
      actors: ['ops'],
      action: 'receive_alert',
      facts: ['deploy_alert', 'prod_deployed_bad']
    }
  ],
  knowledge: [
    {
      character: 'dev_A',
      observed: ['dev_A_force_push', 'bypassed_review', 'prod_deployed_bad', 'build_failed'],
      heard: ['pm_changed_req'],
      beliefs: [],
      intent: 'lie',
      secrets: ['dev_A_force_push']
    },
    { character: 'tester', observed: ['build_failed', 'ci_red'], heard: [], beliefs: [], intent: 'honest', secrets: [] },
    { character: 'pm', observed: ['pm_changed_req', 'pm_pressured'], heard: [], beliefs: [], intent: 'honest', secrets: [] },
    { character: 'ops', observed: ['deploy_alert', 'prod_deployed_bad', 'dev_A_force_push'], heard: [], beliefs: [], intent: 'honest', secrets: [] }
  ],
  evidence: [
    {
      id: 'git_log',
      name: 'Git 服务器日志',
      source: 'Git 服务器',
      reliability: 1.0,
      facts: ['dev_A_force_push', 'bypassed_review'],
      desc: '03:02 dev_A 向 main 分支执行 force push，无对应 Merge Request。'
    },
    {
      id: 'door_log',
      name: '门禁记录',
      source: '门禁系统',
      reliability: 1.0,
      facts: ['dev_A_in_office'],
      desc: 'dev_A 于 02:58 刷码进入办公区，03:35 离开。'
    },
    {
      id: 'chat_pm',
      name: '产品群聊天截图',
      source: '聊天记录',
      reliability: 0.9,
      facts: ['pm_changed_req', 'pm_pressured'],
      desc: '01:50 老王："这个需求今晚必须上，先发了再说。"'
    },
    {
      id: 'build_log',
      name: 'CI 构建日志',
      source: 'CI 系统',
      reliability: 1.0,
      facts: ['build_failed', 'ci_red'],
      desc: '02:35 构建失败，单元测试报错。'
    },
    {
      id: 'deploy_log',
      name: '部署监控告警',
      source: '运维监控',
      reliability: 1.0,
      facts: ['deploy_alert', 'prod_deployed_bad'],
      desc: '03:05 生产环境异常，疑似坏代码上线。'
    }
  ],
  topics: {
    dev_A: [
      {
        id: 't_lastnight',
        subject: '昨晚你在哪',
        ask: '昨晚生产出问题前后，你在做什么？',
        responses: [
          {
            id: 'r_lie',
            priority: 10,
            facts: ['dev_A_left_early'],
            text: '我昨晚十点就回家了，电脑都关了，啥也不知道。'
          },
          {
            id: 'r_truth',
            priority: 100,
            when: { presentedEvidence: ['git_log'] },
            facts: ['dev_A_force_push', 'bypassed_review'],
            text: '……行吧。构建红了我想赶紧修，就直接 force push 了 main，没走评审。',
            unlocks: ['t_why', 't_review'],
            shakeTrust: 5
          }
        ]
      },
      {
        id: 't_why',
        subject: '为什么要这么做',
        ask: '为什么不直接走评审流程？',
        unlock: { discoveredFacts: ['dev_A_force_push'] },
        responses: [
          {
            id: 'r_why',
            priority: 50,
            facts: ['bypassed_review', 'prod_deployed_bad'],
            text: '小 bug 而已，review 太慢，我想赶紧上线。'
          }
        ]
      },
      {
        id: 't_review',
        subject: '评审流程',
        ask: '你知道绕过评审的风险吗？',
        unlock: { askedTopics: ['t_why'] },
        responses: [
          { id: 'r_review', priority: 50, facts: [], text: '知道，但当时没想那么多。' }
        ]
      },
      {
        id: 't_pm',
        subject: '产品改需求',
        ask: '老王昨晚改需求，你知情吗？',
        responses: [
          { id: 'r_pm', priority: 10, facts: [], text: '他改需求跟我没关系，我没逼他。' }
        ]
      }
    ],
    tester: [
      {
        id: 't_build',
        subject: '构建情况',
        ask: '昨晚构建怎么样？',
        responses: [
          {
            id: 'r_build',
            priority: 10,
            facts: ['build_failed', 'ci_red'],
            text: '两点半左右 CI 红了，构建挂了，我一开始以为是环境问题。',
            unlocks: ['t_seewho']
          }
        ]
      },
      {
        id: 't_seewho',
        subject: '你看到谁',
        ask: '出事那会儿你看到谁在工位上？',
        unlock: { discoveredFacts: ['build_failed'] },
        responses: [
          { id: 'r_seewho', priority: 10, facts: ['tester_saw_devA'], text: '我看见阿杰在工位上鼓捣，没注意他具体干了啥。' }
        ]
      },
      {
        id: 't_suspect',
        subject: '你怀疑谁',
        ask: '你觉得这事儿谁干的？',
        responses: [
          { id: 'r_suspect', priority: 10, facts: ['tester_not_push'], text: '我没碰过生产，别看我。' }
        ]
      }
    ],
    pm: [
      {
        id: 't_req',
        subject: '昨晚需求',
        ask: '昨晚需求有变动吗？',
        responses: [
          {
            id: 'r_req',
            priority: 10,
            facts: ['pm_changed_req', 'pm_not_push', 'pm_pressured'],
            text: '是有个紧急改动，我说今晚必须上。但代码不是我写的，我也没碰过生产。',
            unlocks: ['t_pressure']
          }
        ]
      },
      {
        id: 't_pressure',
        subject: '你施压了吗',
        ask: '你有没有给开发施压？',
        unlock: { askedTopics: ['t_req'] },
        responses: [
          { id: 'r_pressure', priority: 10, facts: ['pm_pressured'], text: '我是催了，但推代码是开发的事，责任不在我。' }
        ]
      }
    ],
    ops: [
      {
        id: 't_alert',
        subject: '告警情况',
        ask: '生产告警你看到了吗？',
        responses: [
          {
            id: 'r_alert',
            priority: 10,
            facts: ['deploy_alert', 'prod_deployed_bad', 'ops_saw_log'],
            text: '三点零五分部署系统告警，生产环境异常，查了下是坏代码上去了。',
            unlocks: ['t_log']
          }
        ]
      },
      {
        id: 't_log',
        subject: '部署日志',
        ask: '日志里能看出是谁推的吗？',
        unlock: { discoveredFacts: ['deploy_alert'] },
        responses: [
          { id: 'r_log', priority: 10, facts: ['dev_A_force_push'], text: '日志显示 03:02 有人往 main 强推了，账号是阿杰的。' }
        ]
      }
    ]
  },
  contradictions: [
    ['dev_A_left_early', 'dev_A_force_push'],
    ['dev_A_left_early', 'dev_A_in_office']
  ],
  supports: [
    ['dev_A_force_push', 'dev_A_in_office'],
    ['pm_changed_req', 'pm_pressured']
  ],
  factLabels: {
    dev_A_force_push: '阿杰向主干强制推送',
    bypassed_review: '阿杰绕过代码评审',
    prod_deployed_bad: '坏代码上线生产',
    build_failed: 'CI 构建失败',
    ci_red: '构建变红',
    pm_changed_req: '老王临时改需求',
    pm_pressured: '老王施压要求上线',
    pm_not_push: '老王未触碰生产',
    deploy_alert: '生产环境告警',
    dev_A_left_early: '阿杰自称早已离开',
    dev_A_in_office: '阿杰 02:58 在办公室',
    tester_saw_devA: '小琳看见阿杰在工位',
    tester_not_push: '小琳未碰生产',
    ops_saw_log: '大刘查看了部署日志'
  },
  maxActions: 14,
  acceptance: {
    responsible: ['dev_A'],
    contributory: ['pm'],
    action: 'force_push',
    actionAliases: ['强制推送', 'force push', '强行推送', '绕过评审推送', '直接推主干', '强推'],
    requiredEvidence: ['git_log', 'chat_pm'],
    minEvidence: 2,
    requiredFacts: ['dev_A_force_push', 'bypassed_review', 'pm_changed_req'],
    timeWindowMin: 5
  },
  ending: {
    success:
      '你还原了真相：阿杰为快速修复小 bug，绕过评审于凌晨 03:02 向主干强制推送，坏代码上线致生产异常；老王临时改需求制造时间压力，负管理责任。团队此后推行强制评审与发布门禁，类似的"先上了再说"再没发生过。',
    partial:
      '你锁定了阿杰，但证据链仍有缺口，或遗漏了老王的管理责任。指控成立但不完整——下次记得把"诱因"和"执行"分开看。',
    fail: '指控落空。真凶仍在团队里。记住：比对证词与客观记录，谎言总会在日志前露馅。'
  }
}
