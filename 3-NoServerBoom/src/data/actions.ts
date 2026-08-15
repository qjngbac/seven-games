import { ActionDef, WorldView } from '../game/types'
import { bv } from '../game/types'
import { devType } from './devices'

// 动作库：每个操作声明目标、耗时、风险、可逆性与状态效果。
// 恢复出厂/格式化/破拆等高危不可逆操作标记 highRisk，UI 需要二次确认。
// 检查类动作不直接给答案，只在 reveal 中披露证据。

function hasComp(w: WorldView, target: string | undefined, comp: string): boolean {
  if (!target) return false
  const v = w.get(target, comp)
  return v !== undefined
}

export const ACTION_DEFS: ActionDef[] = [
  // —— 检查类（不修改状态，只披露证据） ——
  {
    id: 'inspect_power',
    name: '检查供电',
    tool: '万用表',
    category: 'inspect',
    desc: '测量目标设备的供电状态。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => hasComp(w, t, 'powered') || hasComp(w, t, 'plugSeated'),
    reqHint: '需选择一台带电控的设备',
    reveal: (w, t) =>
      t
        ? `供电状态：${bv(w, t, 'powered') ? '有电' : bv(w, t, 'plugSeated') === false ? '插头松动/断电' : '断电'}`
        : '未选择设备',
    log: '用万用表测量供电',
    effects: []
  },
  {
    id: 'inspect_link',
    name: '查看指示灯',
    tool: '肉眼',
    category: 'inspect',
    desc: '观察端口/链路指示灯，判断数据链路是否通。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => ['camera', 'switch', 'nvr', 'printer', 'server', 'cable', 'router', 'ap', 'fiber', 'power', 'ups', 'ac'].includes(devType(t) ?? ''),
    reqHint: '适用：摄像头 / 交换机 / 录像机 / 打印机 / 服务器 / 网线 / 网关 / AP / 光纤 / 配电箱 / UPS / 空调',
    reveal: (w, t) => {
      if (!t) return '未选择设备'
      const typ = devType(t)
      if (typ === 'switch') return `交换机：整机供电 ${bv(w, t, 'powered') ? '亮' : '灭'}，PoE ${bv(w, t, 'poeUp') ? '亮' : '灭'}`
      if (typ === 'camera') return `摄像头 ${t}：链路 ${bv(w, t, 'linkUp') ? '通' : '断'}，在线 ${bv(w, t, 'online') ? '是' : '否'}`
      if (typ === 'nvr') return `录像机：供电 ${bv(w, t, 'powered') ? '亮' : '灭'}`
      if (typ === 'printer') return `打印机：在线 ${bv(w, t, 'online') ? '是' : '否'}`
      if (typ === 'server') return `服务器：网络 ${bv(w, t, 'netUp') ? '通' : '断'}，外网 ${bv(w, t, 'wanUp') ? '可达' : '中断'}`
      if (typ === 'cable') return `网线 ${t}：链路 ${bv(w, t, 'linkOk') ? '通' : '断'}，完好 ${bv(w, t, 'intact') ? '是' : '否'}`
      if (typ === 'router') return `网关：供电 ${bv(w, t, 'powered') ? '有' : '无'}，外网 ${bv(w, t, 'wanUp') ? '可达' : '中断'}`
      if (typ === 'ap') return `AP：供电 ${bv(w, t, 'powered') ? '有' : '无'}，无线 ${bv(w, t, 'apUp') ? '通' : '断'}`
      if (typ === 'fiber') return `光纤模块：${bv(w, t, 'fiberOk') ? '正常' : '损坏！'}`
      if (typ === 'power') return `市电：${bv(w, t, 'mainsOk') ? '正常' : '已跳闸！'}`
      if (typ === 'ups') return `UPS：${bv(w, t, 'upsOk') ? '正常' : '故障'}，电池 ${bv(w, t, 'batteryOk') ? '有电' : '耗尽'}`
      if (typ === 'ac') return `空调：${bv(w, t, 'acOk') ? '运行' : '停机'}`
      return '该设备无可观察链路灯'
    },
    log: '观察设备指示灯',
    effects: []
  },
  {
    id: 'test_cable',
    name: '测网线 / 查接头',
    tool: '测线仪',
    category: 'inspect',
    desc: '检测网口或电源插头是否松动、断裂。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => ['camera', 'switch', 'cable'].includes(devType(t) ?? ''),
    reqHint: '适用：摄像头 / 交换机 / 网线',
    reveal: (w, t) => {
      if (!t) return '未选择设备'
      const typ = devType(t)
      if (typ === 'camera') return `摄像头 ${t} 网口接触：${bv(w, t, 'portOk') ? '良好' : '松动！'}`
      if (typ === 'cable') return `网线 ${t}：线缆 ${bv(w, t, 'intact') ? '完好' : '断裂！'}，交换机端 ${bv(w, t, 'plugA') ? '插好' : '松'} / 设备端 ${bv(w, t, 'plugB') ? '插好' : '松'}`
      return `交换机电源插头：${bv(w, t, 'plugSeated') ? '插紧' : '松动！'}`
    },
    log: '测试线缆与接头',
    effects: []
  },
  // —— 摄像头诊断 ——
  {
    id: 'check_cam',
    name: '查看摄像头状态',
    tool: '控制台',
    category: 'inspect',
    desc: '读取摄像头在线/画面/录像/夜视及冲突等状态。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    reveal: (w, t) =>
      t
        ? `在线 ${bv(w, t, 'online') ? '是' : '否'}｜画面 ${bv(w, t, 'videoAvailable') ? '正常' : '异常'}｜录像 ${bv(w, t, 'recording') ? '中' : '停'}｜夜视 ${bv(w, t, 'nightVision') ? '正常' : '失效'}｜IP冲突 ${bv(w, t, 'ipConflict') ? '是' : '否'}`
        : '未选择设备',
    log: '查看摄像头状态',
    effects: []
  },
  // —— 修复类（低风险、可逆） ——
  {
    id: 'replug_cable',
    name: '重新插紧接头',
    tool: '手',
    category: 'repair',
    desc: '把松动的网口或电源插头重新插牢。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => {
      if (devType(t) === 'camera') return !bv(w, t, 'portOk')
      if (devType(t) === 'switch') return !bv(w, t, 'plugSeated')
      return false
    },
    reqHint: '仅当接头确实松动时可用',
    effects: (t) =>
      devType(t) === 'camera'
        ? [{ target: true, comp: 'portOk', set: true }]
        : [{ target: true, comp: 'plugSeated', set: true }],
    log: '重新插紧接头，链路恢复'
  },
  {
    id: 'restart_camera',
    name: '重启摄像头',
    tool: '控制台',
    category: 'restart',
    desc: '远程重启摄像头，清掉临时卡死、刷新 IP。不解决物理根因。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    effects: () => [
      { target: true, comp: 'camPowered', set: true },
      { target: true, comp: 'ipConflict', set: false }
    ],
    log: '重启摄像头，刷新状态'
  },
  {
    id: 'clean_lens',
    name: '擦拭镜头',
    tool: '镜头布',
    category: 'repair',
    desc: '擦掉遮挡摄像头的污渍或异物，恢复画面。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'camera' && bv(w, t as string, 'lensBlocked'),
    reqHint: '仅当镜头被遮挡时可用',
    effects: [{ target: true, comp: 'lensBlocked', set: false }],
    log: '擦拭镜头，画面恢复'
  },
  {
    id: 'replace_adapter',
    name: '更换电源适配器',
    tool: '适配器',
    category: 'repair',
    desc: '换上好的电源适配器，恢复摄像头本机供电。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'camera' && !bv(w, t, 'camPowered'),
    reqHint: '仅当摄像头本机断电时可用',
    effects: [{ target: true, comp: 'camPowered', set: true }],
    log: '更换电源适配器，摄像头上电'
  },
  {
    id: 'fix_ip',
    name: '释放并续租 IP',
    tool: '控制台',
    category: 'repair',
    desc: '解决 IP 地址冲突，让摄像头重新正常录像。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'camera' && bv(w, t, 'ipConflict'),
    reqHint: '仅当 IP 冲突时可用',
    effects: [{ target: true, comp: 'ipConflict', set: false }],
    log: '释放冲突 IP，录像恢复'
  },
  {
    id: 'refocus',
    name: '重新对焦',
    tool: '镜头扳手',
    category: 'repair',
    desc: '调整镜头焦距，消除画面模糊。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'camera' && bv(w, t, 'focusLost'),
    reqHint: '仅当失焦时可用',
    effects: [{ target: true, comp: 'focusLost', set: false }],
    log: '重新对焦，画面清晰'
  },
  {
    id: 'dry_camera',
    name: '断电烘干摄像头',
    tool: '吹风机',
    category: 'repair',
    desc: '断电、擦干进水后重新上电，救回短路的摄像头。',
    time: 3,
    risk: 1,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'camera' && bv(w, t, 'water'),
    reqHint: '仅当摄像头进水时可用',
    effects: [
      { target: true, comp: 'water', set: false },
      { target: true, comp: 'camPowered', set: true }
    ],
    log: '烘干摄像头并重新上电'
  },
  {
    id: 'replace_ir',
    name: '更换红外灯板',
    tool: '红外灯板',
    category: 'repair',
    desc: '换掉损坏的红外灯，恢复夜视。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'camera' && bv(w, t, 'irBroken'),
    reqHint: '仅当红外损坏时可用',
    effects: [{ target: true, comp: 'irBroken', set: false }],
    log: '更换红外灯板，夜视恢复'
  },
  // —— 服务器 ——
  {
    id: 'inspect_thermal',
    name: '读取温度',
    tool: '测温枪',
    category: 'inspect',
    desc: '读取服务器内部温度，判断是否过热。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'server',
    reqHint: '适用：服务器',
    reveal: (w, t) => `服务器温度：${bv(w, t as string, 'tempHigh') ? '过高（触发告警）' : '正常'}`,
    log: '读取服务器温度',
    effects: []
  },
  {
    id: 'clean_fan',
    name: '清理/更换散热风扇',
    tool: '吹尘球',
    category: 'repair',
    desc: '清理或更换服务器风扇，让温度回落。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'server' && !bv(w, t, 'fanOk'),
    reqHint: '仅当风扇停转时可用',
    effects: [{ target: true, comp: 'fanOk', set: true }],
    log: '更换风扇，温度回落'
  },
  {
    id: 'mute_alarm',
    name: '静音温度告警',
    tool: '控制台',
    category: 'restart',
    desc: '临时屏蔽蜂鸣。根因未除会再次告警——属于“临时修好”。',
    time: 1,
    risk: 1,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'server' && bv(w, t, 'alarmActive'),
    reqHint: '仅当告警响时可用',
    effects: [{ target: true, comp: 'alarmMuted', set: true }],
    log: '静音告警（温度未降，可能复发）'
  },
  {
    id: 'clear_disk',
    name: '清理磁盘空间',
    tool: '控制台',
    category: 'repair',
    desc: '删除过期日志/缓存释放空间，恢复录像或服务。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => (devType(t) === 'server' || devType(t) === 'nvr') && bv(w, t, 'diskFull'),
    reqHint: '仅当磁盘满时可用',
    effects: [{ target: true, comp: 'diskFull', set: false }],
    log: '清理磁盘空间'
  },
  {
    id: 'restart_service',
    name: '重启关键服务',
    tool: '控制台',
    category: 'restart',
    desc: '拉起因内存泄漏崩溃的关键服务。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'server' && !bv(w, t, 'serviceRunning'),
    reqHint: '仅当服务未运行时可用',
    effects: [{ target: true, comp: 'memLeak', set: false }],
    log: '重启关键服务'
  },
  {
    id: 'reset_nic',
    name: '复位网卡',
    tool: '控制台',
    category: 'restart',
    desc: '复位故障网卡，恢复服务器网络。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'server' && !bv(w, t, 'netCardOk'),
    reqHint: '仅当网卡故障时可用',
    effects: [{ target: true, comp: 'netCardOk', set: true }],
    log: '复位网卡，网络恢复'
  },
  // —— 打印机 ——
  {
    id: 'clear_paper_jam',
    name: '清除卡纸',
    tool: '手',
    category: 'repair',
    desc: '打开纸盒取出卡住的纸张。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'printer' && bv(w, t, 'paperJam'),
    reqHint: '仅当卡纸时可用',
    effects: [{ target: true, comp: 'paperJam', set: false }],
    log: '清除卡纸'
  },
  // —— 门禁（电控锁） ——
  {
    id: 'reopen_door',
    name: '润滑并复位锁舌',
    tool: '润滑剂',
    category: 'repair',
    desc: '处理卡死的锁舌，正常开门。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'access' && bv(w, t, 'lockJammed'),
    reqHint: '仅当锁舌卡死时可用',
    effects: [{ target: true, comp: 'lockJammed', set: false }],
    log: '复位锁舌，门可正常开启'
  },
  // —— 台式机 ——
  {
    id: 'check_pc',
    name: '查看电脑状态',
    tool: '肉眼',
    category: 'inspect',
    desc: '读取电脑供电/显示/系统/网络状态。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'desktop',
    reqHint: '适用：台式机',
    reveal: (w, t) =>
      t
        ? `供电 ${bv(w, t, 'powered') ? '有' : '无'}｜显示 ${bv(w, t, 'displayNormal') ? '正常' : '异常'}｜系统 ${bv(w, t, 'osBooted') ? '已启动' : '未启动'}｜网络 ${bv(w, t, 'netUp') ? '通' : '断'}`
        : '未选择设备',
    log: '查看电脑状态',
    effects: []
  },
  {
    id: 'pc_reseat_plug',
    name: '插紧电源线',
    tool: '手',
    category: 'repair',
    desc: '把松动的电源线重新插牢。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'desktop' && !bv(w, t, 'plugSeated'),
    reqHint: '仅当插头松动时可用',
    effects: [{ target: true, comp: 'plugSeated', set: true }],
    log: '插紧电源线，电脑上电'
  },
  {
    id: 'pc_reseat_ram',
    name: '重插内存条',
    tool: '螺丝刀',
    category: 'repair',
    desc: '把松动的内存条重新插紧，让系统能启动。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'desktop' && !bv(w, t, 'ramSeated'),
    reqHint: '仅当内存松动时可用',
    effects: [{ target: true, comp: 'ramSeated', set: true }],
    log: '重插内存条，系统可启动'
  },
  {
    id: 'pc_swap_monitor',
    name: '更换显示器',
    tool: '显示器',
    category: 'repair',
    desc: '换上一台好的显示器，恢复画面。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'desktop' && !bv(w, t, 'monitorOk'),
    reqHint: '仅当显示器损坏时可用',
    effects: [{ target: true, comp: 'monitorOk', set: true }],
    log: '更换显示器，画面恢复'
  },
  {
    id: 'pc_reboot',
    name: '重启电脑',
    tool: '电源键',
    category: 'restart',
    desc: '重启清除蓝屏，系统重新引导。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'desktop' && bv(w, t, 'bsod'),
    reqHint: '仅当蓝屏时可用',
    effects: [{ target: true, comp: 'bsod', set: false }],
    log: '重启电脑，蓝屏消失'
  },
  {
    id: 'pc_clear_disk',
    name: '清理系统盘',
    tool: '控制台',
    category: 'repair',
    desc: '删除临时文件释放系统盘，让电脑能启动。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'desktop' && !bv(w, t, 'diskOk'),
    reqHint: '仅当系统盘满时可用',
    effects: [{ target: true, comp: 'diskOk', set: true }],
    log: '清理系统盘'
  },
  // —— 智能感应门 ——
  {
    id: 'check_sdoor',
    name: '查看感应门状态',
    tool: '肉眼',
    category: 'inspect',
    desc: '读取感应门供电/传感器/门体状态。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'smartdoor',
    reqHint: '适用：智能感应门',
    reveal: (w, t) =>
      t
        ? `供电 ${bv(w, t, 'powered') ? '有' : '无'}｜传感器洁净 ${bv(w, t, 'sensorClean') ? '是' : '否'}｜校准 ${bv(w, t, 'sensorAligned') ? '是' : '否'}｜控制器 ${bv(w, t, 'controllerOk') ? '正常' : '死机'}｜门体卡阻 ${bv(w, t, 'doorJammed') ? '是' : '否'}`
        : '未选择设备',
    log: '查看感应门状态',
    effects: []
  },
  {
    id: 'sd_clean_sensor',
    name: '清洁传感器',
    tool: '酒精棉',
    category: 'repair',
    desc: '擦净脏污的感应传感器，恢复感应。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'smartdoor' && !bv(w, t, 'sensorClean'),
    reqHint: '仅当传感器脏时可用',
    effects: [{ target: true, comp: 'sensorClean', set: true }],
    log: '清洁传感器，感应恢复'
  },
  {
    id: 'sd_align_sensor',
    name: '校准传感器',
    tool: '校准仪',
    category: 'repair',
    desc: '重新校准错位的感应传感器。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'smartdoor' && !bv(w, t, 'sensorAligned'),
    reqHint: '仅当传感器错位时可用',
    effects: [{ target: true, comp: 'sensorAligned', set: true }],
    log: '校准传感器，感应恢复'
  },
  {
    id: 'sd_reset_controller',
    name: '复位控制器',
    tool: '控制台',
    category: 'restart',
    desc: '软复位死机的感应门控制器（不丢配置）。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'smartdoor' && !bv(w, t, 'controllerOk'),
    reqHint: '仅当控制器死机时可用',
    effects: [{ target: true, comp: 'controllerOk', set: true }],
    log: '复位控制器，感应恢复'
  },
  {
    id: 'sd_lube',
    name: '润滑门体',
    tool: '润滑剂',
    category: 'repair',
    desc: '处理卡阻的门体，让门顺利开合。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'smartdoor' && bv(w, t, 'doorJammed'),
    reqHint: '仅当门体卡阻时可用',
    effects: [{ target: true, comp: 'doorJammed', set: false }],
    log: '润滑门体，开合顺畅'
  },
  // —— 网线 ——
  {
    id: 'cab_replug',
    name: '重插网线两端',
    tool: '手',
    category: 'repair',
    desc: '把松动的网线两头重新插牢。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'cable' && (!bv(w, t, 'plugA') || !bv(w, t, 'plugB')),
    reqHint: '仅当接头松动时可用',
    effects: [
      { target: true, comp: 'plugA', set: true },
      { target: true, comp: 'plugB', set: true }
    ],
    log: '重插网线两端'
  },
  {
    id: 'cab_swap',
    name: '更换网线',
    tool: '新网线',
    category: 'repair',
    desc: '整根换掉断裂/老化的网线。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'cable' && !bv(w, t, 'intact'),
    reqHint: '仅当线缆断裂时可用',
    effects: [
      { target: true, comp: 'intact', set: true },
      { target: true, comp: 'plugA', set: true },
      { target: true, comp: 'plugB', set: true }
    ],
    log: '更换网线，链路恢复'
  },
  // —— 供电主干 / UPS 诊断与修复（一环扣一环） ——
  {
    id: 'check_ups',
    name: '查看配电/UPS',
    tool: '万用表',
    category: 'inspect',
    desc: '读取市电与 UPS 状态，判断供电主干是否健康。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'power' || devType(t) === 'ups',
    reqHint: '适用：市电配电箱 / UPS',
    reveal: (w, t) => {
      if (!t) return '未选择设备'
      if (devType(t) === 'power') return `市电：${bv(w, t, 'mainsOk') ? '正常' : '已跳闸！'}`
      return `UPS：${bv(w, t, 'upsOk') ? '正常' : '故障'}｜电池 ${bv(w, t, 'batteryOk') ? '有电' : '耗尽！'}`
    },
    log: '查看配电/UPS 状态',
    effects: []
  },
  {
    id: 'reset_breaker',
    name: '合上电闸',
    tool: '手',
    category: 'repair',
    desc: '把跳闸的配电箱合上，恢复市电。下游所有设备随之复电（连环故障的根因解法）。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'power' && !bv(w, t, 'mainsOk'),
    reqHint: '仅当市电跳闸时可用',
    effects: [{ device: 'pw_main', comp: 'mainsOk', set: true }],
    log: '合上电闸，市电恢复'
  },
  {
    id: 'replace_ups_battery',
    name: '更换 UPS 电池',
    tool: '电池',
    category: 'repair',
    desc: '换上新电池，解除 UPS 电池耗尽的隐患（市电中断时仍能续命）。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'ups' && !bv(w, t, 'batteryOk'),
    reqHint: '仅当 UPS 电池耗尽时可用',
    effects: [{ device: 'ups1', comp: 'batteryOk', set: true }],
    log: '更换 UPS 电池'
  },
  {
    id: 'fix_ups',
    name: '修复 UPS',
    tool: '万用表',
    category: 'repair',
    desc: '修复故障的 UPS 主机，恢复供电主干冗余。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'ups' && !bv(w, t, 'upsOk'),
    reqHint: '仅当 UPS 自身故障时可用',
    effects: [{ device: 'ups1', comp: 'upsOk', set: true }],
    log: '修复 UPS 主机'
  },
  // —— 机房空调（制冷链） ——
  {
    id: 'check_ac',
    name: '查看空调状态',
    tool: '肉眼',
    category: 'inspect',
    desc: '读取机房空调是否运行。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'ac',
    reqHint: '适用：机房空调',
    reveal: (w, t) => (t ? `空调运行：${bv(w, t, 'acOk') ? '是' : '否（停机）'}` : '未选择设备'),
    log: '查看空调状态',
    effects: []
  },
  {
    id: 'restart_ac',
    name: '重启/复位空调',
    tool: '遥控器',
    category: 'repair',
    desc: '复位停机的机房空调，恢复制冷，从根因上消除服务器过热。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'ac' && !bv(w, t, 'acOk'),
    reqHint: '仅当空调停机时可用',
    effects: [{ target: true, comp: 'acOk', set: true }],
    log: '复位空调，制冷恢复'
  },
  // —— 网关 / 无线 AP（外网链） ——
  {
    id: 'check_router',
    name: '查看网关状态',
    tool: '控制台',
    category: 'inspect',
    desc: '读取网关供电/配置/上联/外网状态。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'router',
    reqHint: '适用：网关路由器',
    reveal: (w, t) =>
      t
        ? `供电 ${bv(w, t, 'powered') ? '有' : '无'}｜配置 ${bv(w, t, 'configOk') ? '正常' : '丢失'}｜上联 ${bv(w, t, 'linkToSwitch') ? '通' : '断'}｜外网 ${bv(w, t, 'wanUp') ? '可达' : '中断'}`
        : '未选择设备',
    log: '查看网关状态',
    effects: []
  },
  {
    id: 'reset_router',
    name: '复位网关配置',
    tool: '控制台',
    category: 'restart',
    desc: '重置丢失的网关配置，恢复外网与下联 AP。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'router' && !bv(w, t, 'configOk'),
    reqHint: '仅当网关配置丢失时可用',
    effects: [{ target: true, comp: 'configOk', set: true }],
    log: '复位网关配置，外网恢复'
  },
  {
    id: 'check_ap',
    name: '查看 AP 状态',
    tool: '肉眼',
    category: 'inspect',
    desc: '读取无线 AP 供电/状态。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'ap',
    reqHint: '适用：无线 AP',
    reveal: (w, t) =>
      t ? `供电 ${bv(w, t, 'powered') ? '有' : '无'}｜AP ${bv(w, t, 'apOk') ? '正常' : '故障'}｜无线 ${bv(w, t, 'apUp') ? '通' : '断'}` : '未选择设备',
    log: '查看 AP 状态',
    effects: []
  },
  {
    id: 'repair_ap',
    name: '重启无线 AP',
    tool: '控制台',
    category: 'restart',
    desc: '复位故障的无线 AP（依赖上联交换机供电，交换机断电时重启无效）。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'ap' && !bv(w, t, 'apOk'),
    reqHint: '仅当 AP 故障时可用',
    effects: [{ target: true, comp: 'apOk', set: true }],
    log: '重启无线 AP'
  },
  // —— 光纤（主干链） ——
  {
    id: 'replace_fiber',
    name: '更换光纤模块',
    tool: '光纤模块',
    category: 'repair',
    desc: '换上好的光纤收发模块，恢复主干上行链路。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'fiber' && !bv(w, t, 'fiberOk'),
    reqHint: '仅当光纤模块损坏时可用',
    effects: [{ target: true, comp: 'fiberOk', set: true }],
    log: '更换光纤模块，主干链路恢复'
  },
  // —— 高危不可逆（恢复出厂 / 格式化 / 破拆） ——
  {
    id: 'factory_reset',
    name: '恢复出厂设置',
    tool: '针捅复位孔',
    category: 'risky',
    desc: '清空配置重新初始化。会丢失地址/密码/历史录像，需二次确认。',
    time: 3,
    risk: 3,
    reversible: false,
    highRisk: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'camera' || devType(t) === 'nvr',
    reqHint: '适用：摄像头 / 录像机',
    effects: (t) =>
      devType(t) === 'camera'
        ? [{ target: true, comp: 'configLost', set: true }]
        : [{ target: true, comp: 'recordingsLost', set: true }],
    log: '执行恢复出厂设置',
    damage: 30
  },
  {
    id: 'delete_recordings',
    name: '格式化录像盘',
    tool: '控制台',
    category: 'risky',
    desc: '直接清空历史录像以腾出空间。数据不可恢复，需二次确认。',
    time: 2,
    risk: 3,
    reversible: false,
    highRisk: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'nvr' && bv(w, t, 'diskFull'),
    reqHint: '仅当磁盘满时可用（高危）',
    effects: [
      { target: true, comp: 'diskFull', set: false },
      { target: true, comp: 'recordingsLost', set: true }
    ],
    log: '格式化录像盘，历史录像全部丢失',
    damage: 25
  },
  {
    id: 'force_break',
    name: '破拆开门',
    tool: '撬棍',
    category: 'risky',
    desc: '暴力破门，门能开但门体会受损。下策。',
    time: 3,
    risk: 2,
    reversible: false,
    highRisk: true,
    requiresTarget: true,
    requirements: (w, t) => devType(t) === 'access' && bv(w, t, 'openOk') === false,
    reqHint: '门禁打不开时的下策',
    effects: [
      { target: true, comp: 'lockJammed', set: false },
      { target: true, comp: 'doorBroken', set: true }
    ],
    log: '破拆开门，门体受损',
    damage: 15
  }
]

export const ACTION_BY_ID: Record<string, ActionDef> = Object.fromEntries(
  ACTION_DEFS.map((a) => [a.id, a])
)
