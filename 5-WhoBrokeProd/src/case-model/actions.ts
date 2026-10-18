// 动作展示映射与标准化选项生成
import type { CaseDef } from './types'

export interface ActionOption {
  label: string
  value: string
  isDecoy?: boolean
}

/** 内部 action 到规范人类可读中文（可保留标准英文技术术语）的映射 */
export const ACTION_DISPLAY_MAP: Record<string, string> = {
  // 案件 1：凌晨的强制推送
  force_push: '向主干强制推送（force push）',
  build_failed: 'CI 构建失败未中断流程',
  change_requirement: '临时紧急变更需求',
  receive_alert: '生产监控告警未及时响应',

  // 案件 2：空了的订单表
  truncate: '清空表数据（TRUNCATE）',
  change_env_to_prod: '误将环境变量指向生产（prod）',
  approve_script: '未仔细核验即审批清理脚本',

  // 案件 3：泄露的密钥
  commit_secret: '向公开仓库提交含密钥的 .env',
  print_secret_in_log: 'CI 构建日志打印明文密钥',
  detect_leak: '安全扫描检测到密钥泄露',
  revoke_key: '紧急吊销已泄露 API 密钥',

  // 案件 4：雪崩之夜
  tighten_timeout: '激进下调网关超时（30s→3s）',
  deploy_retry: '发布新版本并引入多倍重试（重试×5）',
  cascade_outage: '引发级联崩溃（服务雪崩）',

  // 案件 5：回滚的陷阱
  rollback_wrong_config: '回滚时误用测试环境（staging）配置',
  no_env_label: '架构评审未强制要求标注环境',

  // 案件 6：灰度的全量
  wrong_canary_config: '全量发布带有内存泄漏的新版本',
  write_bad_canary: '灰度比例误配置为 100%',
  approve_without_check: '未核对灰度配置直接通过审批',

  // 案件 7：凌晨两点的死锁
  add_conflicting_cron: '新增与现有任务冲突的定时任务',
  job_collision: '两个定时任务争抢同一把锁触发死锁',
  no_cron_review: '未建立定时任务评审与注册机制'
}

/** 各案件精心设计的 6 项专业且互斥的危险行为选项（含 1 个正确项与 5 个高拟真干扰项） */
const CASE_ACTION_PRESETS: Record<string, ActionOption[]> = {
  'force-push': [
    { label: '向主干强制推送（force push）', value: 'force_push' },
    { label: '临时紧急变更需求', value: 'change_requirement', isDecoy: true },
    { label: 'CI 构建失败未中断流程', value: 'build_failed', isDecoy: true },
    { label: '生产监控告警未及时响应', value: 'receive_alert', isDecoy: true },
    { label: '在生产服务器热修补代码（hotfix）', value: 'decoy_hotfix', isDecoy: true },
    { label: '绕过代码评审直接合入 MR', value: 'decoy_merge_mr', isDecoy: true }
  ],
  'db-truncated': [
    { label: '清空表数据（TRUNCATE）', value: 'truncate' },
    { label: '误将环境变量指向生产（prod）', value: 'change_env_to_prod', isDecoy: true },
    { label: '未仔细核验即审批清理脚本', value: 'approve_script', isDecoy: true },
    { label: '生产监控告警未及时响应', value: 'receive_alert', isDecoy: true },
    { label: '误删数据库全量备份文件', value: 'decoy_delete_backup', isDecoy: true },
    { label: '在线直接执行 DROP TABLE', value: 'decoy_drop_table', isDecoy: true }
  ],
  'secret-leaked': [
    { label: '向公开仓库提交含密钥的 .env', value: 'commit_secret' },
    { label: 'CI 构建日志打印明文密钥', value: 'print_secret_in_log', isDecoy: true },
    { label: '安全扫描检测到密钥泄露', value: 'detect_leak', isDecoy: true },
    { label: '紧急吊销已泄露 API 密钥', value: 'revoke_key', isDecoy: true },
    { label: '在公网未授权开放 Debug 端口', value: 'decoy_open_debug', isDecoy: true },
    { label: '将包含密码的本地配置同步至网盘', value: 'decoy_sync_disk', isDecoy: true }
  ],
  'cascade': [
    { label: '激进下调网关超时（30s→3s）', value: 'tighten_timeout' },
    { label: '发布新版本并引入多倍重试（重试×5）', value: 'deploy_retry', isDecoy: true },
    { label: '引发级联崩溃（服务雪崩）', value: 'cascade_outage', isDecoy: true },
    { label: '生产监控告警未及时响应', value: 'receive_alert', isDecoy: true },
    { label: '未做熔断限流直接全量压测', value: 'decoy_stress_test', isDecoy: true },
    { label: '手动切断所有实例健康检查', value: 'decoy_cut_health', isDecoy: true }
  ],
  'config-rollback': [
    { label: '回滚时误用测试环境（staging）配置', value: 'rollback_wrong_config' },
    { label: '架构评审未强制要求标注环境', value: 'no_env_label', isDecoy: true },
    { label: '生产监控告警未及时响应', value: 'receive_alert', isDecoy: true },
    { label: '回滚时清空了发布版本元数据', value: 'decoy_clear_metadata', isDecoy: true },
    { label: '直接在生产机器上修改本地 hosts', value: 'decoy_modify_hosts', isDecoy: true },
    { label: '将已废弃的旧版本二进制覆盖上线', value: 'decoy_overwrite_bin', isDecoy: true }
  ],
  'bad-canary': [
    { label: '全量发布带有内存泄漏的新版本', value: 'wrong_canary_config' },
    { label: '灰度比例误配置为 100%', value: 'write_bad_canary', isDecoy: true },
    { label: '未核对灰度配置直接通过审批', value: 'approve_without_check', isDecoy: true },
    { label: '生产监控告警未及时响应', value: 'receive_alert', isDecoy: true },
    { label: '将测试桩（mock）代码带入生产环境', value: 'decoy_mock_code', isDecoy: true },
    { label: '关闭了生产容器内存限制（OOM 保护）', value: 'decoy_disable_oom', isDecoy: true }
  ],
  'cron-crash': [
    { label: '新增与现有任务冲突的定时任务', value: 'add_conflicting_cron' },
    { label: '两个定时任务争抢同一把锁触发死锁', value: 'job_collision', isDecoy: true },
    { label: '未建立定时任务评审与注册机制', value: 'no_cron_review', isDecoy: true },
    { label: '生产监控告警未及时响应', value: 'receive_alert', isDecoy: true },
    { label: '在业务高峰期执行大表全局扫描', value: 'decoy_full_scan', isDecoy: true },
    { label: '定时脚本未设重试上限导致无限重试', value: 'decoy_infinite_retry', isDecoy: true }
  ]
}

/** 获取案件对应的行为选项列表 */
export function getActionOptionsForCase(c: CaseDef): ActionOption[] {
  if (CASE_ACTION_PRESETS[c.id]) {
    return CASE_ACTION_PRESETS[c.id]
  }

  // 兜底通用生成
  const acc = c.acceptance
  const correctLabel = ACTION_DISPLAY_MAP[acc.action] || acc.action
  const result: ActionOption[] = [{ label: correctLabel, value: acc.action }]

  const seen = new Set<string>([acc.action])
  for (const e of c.truthEvents) {
    if (!seen.has(e.action)) {
      seen.add(e.action)
      result.push({
        label: ACTION_DISPLAY_MAP[e.action] || e.action,
        value: e.action,
        isDecoy: true
      })
    }
  }
  return result
}
