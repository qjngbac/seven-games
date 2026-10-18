import { ActionDef, bv } from '../game/types'
import { devType } from './devices'

// 动作库：每个操作声明目标、耗时、风险、可逆性与状态效果。
// 恢复出厂/格式化/破拆等高危不可逆操作标记 highRisk，UI 需要二次确认。
// 灾难性错误操作标记 catastrophic，执行即当场引爆机房（BOOM）。
// 检查类动作不直接给答案，只在 reveal 中披露证据。
// 修复类动作支持动态 log：根据执行前后的实际状态提供真实、有趣且具有教学意义的反思反馈。

export const ACTION_DEFS: ActionDef[] = [
  // ==========================================
  // —— 检查类（不修改状态，只披露证据） ——
  // ==========================================
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
    requirements: (_w, t) => Boolean(t),
    reqHint: '需选择一台设备',
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
    requirements: (_w, t) => Boolean(t),
    reqHint: '需选择一台设备',
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
      return '该设备无可观察链路指示灯'
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
    requirements: (_w, t) => ['camera', 'switch', 'cable', 'server', 'nvr', 'desktop', 'printer', 'router', 'ap'].includes(devType(t) ?? ''),
    reqHint: '适用：摄像头 / 交换机 / 网线 / 主机等带网口设备',
    reveal: (w, t) => {
      if (!t) return '未选择设备'
      const typ = devType(t)
      if (typ === 'camera') return `摄像头 ${t} 网口接触：${bv(w, t, 'portOk') ? '良好' : '松动！'}`
      if (typ === 'cable') return `网线 ${t}：线缆 ${bv(w, t, 'intact') ? '完好' : '断裂！'}，交换机端 ${bv(w, t, 'plugA') ? '插好' : '松'} / 设备端 ${bv(w, t, 'plugB') ? '插好' : '松'}`
      if (typ === 'switch') return `交换机电源插头：${bv(w, t, 'plugSeated') ? '插紧' : '松动！'}`
      return `${t} 线缆接头：接触${bv(w, t, 'portOk') || bv(w, t, 'plugSeated') ? '牢固' : '松动异常'}`
    },
    log: '测试线缆与接头',
    effects: []
  },
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
    requirements: (_w, t) => ['server', 'desktop', 'switch'].includes(devType(t) ?? ''),
    reqHint: '适用：服务器 / 主机 / 交换机',
    reveal: (w, t) => `设备内部温度：${bv(w, t as string, 'tempHigh') ? '88℃ 严重过热（触发硬件保护）' : '42℃ 正常稳定'}`,
    log: '读取设备温度',
    effects: []
  },
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
    id: 'check_ups',
    name: '查看配电/UPS',
    tool: '万用表',
    category: 'inspect',
    desc: '读取市电与 UPS 状态，判断供电主干是否健康。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => ['power', 'ups'].includes(devType(t) ?? ''),
    reqHint: '适用：市电配电箱 / UPS',
    reveal: (w, t) => {
      if (!t) return '未选择设备'
      if (devType(t) === 'power') return `市电：${bv(w, t, 'mainsOk') ? '正常通电' : '已跳闸断电！'}`
      return `UPS：${bv(w, t, 'upsOk') ? '正常' : '故障'}｜电池 ${bv(w, t, 'batteryOk') ? '有电' : '耗尽！'}`
    },
    log: '查看配电/UPS 状态',
    effects: []
  },
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

  // ==========================================
  // —— 修复类（解开暗门，保留可操作性） ——
  // ==========================================
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
    requirements: (_w, t) => ['camera', 'switch', 'server', 'nvr', 'printer', 'desktop', 'router', 'ap', 'cable', 'access', 'smartdoor'].includes(devType(t) ?? ''),
    reqHint: '适用：各类带网口或电源接头的设备',
    effects: (t) => {
      const typ = devType(t)
      if (typ === 'camera') return [{ target: true, comp: 'portOk', set: true }]
      if (typ === 'switch' || typ === 'desktop') return [{ target: true, comp: 'plugSeated', set: true }]
      if (typ === 'cable') return [{ target: true, comp: 'plugA', set: true }, { target: true, comp: 'plugB', set: true }]
      if (typ === 'access') return [{ target: true, comp: 'powered', set: true }]
      return []
    },
    log: (wb, _wa, t) => {
      const typ = devType(t)
      const wasLoose = typ === 'camera' ? !bv(wb, t, 'portOk') : typ === 'switch' || typ === 'desktop' ? !bv(wb, t, 'plugSeated') : typ === 'cable' ? (!bv(wb, t, 'plugA') || !bv(wb, t, 'plugB')) : false
      return wasLoose
        ? '用力把松脱的接头重新插紧，卡扣咔哒一声到位，链路指示灯恢复闪烁！'
        : '重新拔插了接头，卡扣原先就插得很紧，接上后故障毫无起色（无用功，浪费时间）。'
    }
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
    log: (wb, _wa, t) =>
      bv(wb, t, 'ipConflict')
        ? '远程重启摄像头，清空了冲突的网络会话，重新注册上线成功！'
        : '远程重启摄像头，摄像头自检旋转了一圈，但物理链路/供电仍未解决，依然黑屏。'
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
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    effects: [{ target: true, comp: 'lensBlocked', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'lensBlocked')
        ? '用镜头布擦拭了镜头，抹去了镜头上的厚重油污，监控画面恢复清晰！'
        : '用镜头布仔细擦拭了镜头，镜片表面本来就一尘不染，画面依然无信号（无用功）。'
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
    requirements: (_w, t) => ['camera', 'router', 'ap', 'access', 'smartdoor'].includes(devType(t) ?? ''),
    reqHint: '适用：外置 12V 供电设备',
    effects: [{ target: true, comp: 'camPowered', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'camPowered')
        ? '换上了全新的 12V 电源适配器，设备指示灯终于亮起，供电恢复！'
        : '换上了全新的电源适配器，但原适配器本身工作正常，故障依旧（浪费备件）。'
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
    requirements: (_w, t) => ['camera', 'server', 'printer', 'desktop', 'router', 'ap'].includes(devType(t) ?? ''),
    reqHint: '适用：网络终端设备',
    effects: [{ target: true, comp: 'ipConflict', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'ipConflict')
        ? '在终端释放了冲突的 IP 并重新向 DHCP 续租，网络地址正常恢复！'
        : '执行了 IP 释放并重新续租，但原 IP 本就正常，网络故障未见好转。'
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
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    effects: [{ target: true, comp: 'focusLost', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'focusLost')
        ? '旋转调焦环重新校准焦距，模糊的画面恢复清晰锐利！'
        : '反复拧动调焦环对焦，原镜头本来就在焦平面上，折腾半天毫无改善。'
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
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    effects: [
      { target: true, comp: 'water', set: false },
      { target: true, comp: 'camPowered', set: true }
    ],
    log: (wb, _wa, t) =>
      bv(wb, t, 'water')
        ? '断电烘干机身内部积水并清理短路水渍，重新上电，设备奇迹般救回！'
        : '用热风对着机壳反复吹拂，机身内部本来就很干燥，没有任何效果。'
  },
  {
    id: 'reload_cam_config',
    name: '重新下发配置',
    tool: '配置终端',
    category: 'repair',
    desc: '从 NVR 重新下发摄像头配置，找回被"恢复出厂"抹掉的参数。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    effects: [{ target: true, comp: 'configLost', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'configLost')
        ? '从 NVR 备份下发摄像头通道配置，丢失的 IP、码流与识别参数成功找回！'
        : '重新下发了摄像头配置，但原有配置并未丢失，画面依旧异常。'
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
    requirements: (_w, t) => devType(t) === 'camera',
    reqHint: '适用：摄像头',
    effects: [{ target: true, comp: 'irBroken', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'irBroken')
        ? '更换了烧毁的红外补光灯板，夜视红外灯恢复微红亮起！'
        : '换上了新的红外补光灯板，但原灯板本来就是好的，白费工时。'
  },

  // —— 服务器修复 ——
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
    requirements: (_w, t) => ['server', 'desktop', 'switch'].includes(devType(t) ?? ''),
    reqHint: '适用：服务器 / 交换机 / 台式机',
    effects: [{ target: true, comp: 'fanOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'fanOk')
        ? '拆开散热罩清除风道积尘并更换卡滞风扇，冷风重新吹入，温度迅速回落！'
        : '拆开散热罩吹了吹，风道内部很干净，异响或报警并非灰尘引起。'
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
    requirements: (_w, t) => ['server', 'ups', 'power'].includes(devType(t) ?? ''),
    reqHint: '适用：服务器 / UPS / 配电',
    effects: [{ target: true, comp: 'alarmMuted', set: true }],
    log: '按下消音键屏蔽蜂鸣（根因未除，随时可能复发）。'
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
    requirements: (_w, t) => ['server', 'desktop', 'nvr'].includes(devType(t) ?? ''),
    reqHint: '适用：服务器 / 录像机 / 台式机',
    effects: [{ target: true, comp: 'diskFull', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'diskFull')
        ? '清理了数以千计的临时日志与崩溃 Dump 文件，释放了 80GB 空间！'
        : '扫描了磁盘分区，原本可用空间就很充裕，清理并未解决核心故障。'
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
    requirements: (_w, t) => ['server', 'nvr'].includes(devType(t) ?? ''),
    reqHint: '适用：服务器 / 录像机',
    effects: [{ target: true, comp: 'memLeak', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'memLeak') || !bv(wb, t, 'serviceRunning')
        ? '重启关键业务服务，内存泄漏释放，业务端口重新监听！'
        : '重启了业务服务，但由于底层网络/硬件故障未解决，服务依然处于失联状态。'
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
    requirements: (_w, t) => ['server', 'desktop'].includes(devType(t) ?? ''),
    reqHint: '适用：服务器 / 台式机',
    effects: [{ target: true, comp: 'netCardOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'netCardOk')
        ? '软复位了故障网卡固件，网口握手重新建立，网络连通！'
        : '复位了网卡驱动，但物理链路本来就不通，复位后依然无法联网。'
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
    requirements: (_w, t) => devType(t) === 'printer',
    reqHint: '适用：打印机',
    effects: [{ target: true, comp: 'paperJam', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'paperJam')
        ? '打开纸盒小心翼翼拉出被走纸滚轮卡烂的碎纸，打印机自检就绪！'
        : '打开纸盒里里外外翻了个遍，内部根本没有卡纸，白沾了一手墨粉。'
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
    requirements: (_w, t) => devType(t) === 'access',
    reqHint: '适用：门禁电控锁',
    effects: [{ target: true, comp: 'lockJammed', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'lockJammed')
        ? '用专用润滑油处理卡死的锁舌并复位机械插销，门禁锁体咔哒一声弹开！'
        : '给锁芯喷了润滑油，但机械结构并无卡死，门打不开是控制器断电所致。'
  },

  // —— 台式机 ——
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
    requirements: (_w, t) => ['desktop', 'server', 'printer', 'switch'].includes(devType(t) ?? ''),
    reqHint: '适用：主机 / 交换机 / 打印机',
    effects: [{ target: true, comp: 'plugSeated', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'plugSeated')
        ? '用力插紧了主机后部松脱的电源线，主机指示灯瞬间亮起！'
        : '重新插拔了电源线，但插头本来就插得好好的，上电依然失败。'
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
    requirements: (_w, t) => ['desktop', 'server'].includes(devType(t) ?? ''),
    reqHint: '适用：台式机 / 服务器',
    effects: [{ target: true, comp: 'ramSeated', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'ramSeated')
        ? '取出内存条擦拭金手指后用力扣入卡槽，主板滴的一声自检通过，系统成功引导！'
        : '重新插拔了内存条，但内存本来就插得很稳，主机按电源依然毫无反应。'
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
    requirements: (_w, t) => devType(t) === 'desktop',
    reqHint: '适用：台式机',
    effects: [{ target: true, comp: 'monitorOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'monitorOk')
        ? '换上了一台完好的备用显示器，屏幕终于点亮并进入桌面！'
        : '换了一台新显示器，屏幕依然黑屏无信号——根本不是显示器坏了！'
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
    requirements: (_w, t) => ['desktop', 'server'].includes(devType(t) ?? ''),
    reqHint: '适用：台式机 / 服务器',
    effects: [{ target: true, comp: 'bsod', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'bsod')
        ? '长按电源键强制重启，清除蓝屏崩溃状态，系统重新正常引导！'
        : '重启了系统，但电脑本来就不开机或缺引导，重启毫无作用。'
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
    requirements: (_w, t) => devType(t) === 'desktop',
    reqHint: '适用：台式机',
    effects: [{ target: true, comp: 'diskOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'diskOk')
        ? '进入 PE 环境清理撑爆系统盘的虚拟内存与日志文件，系统恢复正常启动！'
        : '清理了系统临时文件，原本剩余空间就很充裕，启动故障并非磁盘原因。'
  },

  // —— 智能感应门 ——
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
    requirements: (_w, t) => devType(t) === 'smartdoor',
    reqHint: '适用：智能感应门',
    effects: [{ target: true, comp: 'sensorClean', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'sensorClean')
        ? '用酒精棉片擦拭了感应器探头表面的指纹和污垢，红外感应灯重新亮起！'
        : '仔细擦拭了传感器表面，表面本来就很干净，感应门依旧纹丝不动。'
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
    requirements: (_w, t) => devType(t) === 'smartdoor',
    reqHint: '适用：智能感应门',
    effects: [{ target: true, comp: 'sensorAligned', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'sensorAligned')
        ? '调整了歪斜的探头照射角度，红外光束正对通行通道，感应触发恢复！'
        : '校准了探头角度，但原角度本来就是对准的，门依然不自动开。'
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
    requirements: (_w, t) => devType(t) === 'smartdoor',
    reqHint: '适用：智能感应门',
    effects: [{ target: true, comp: 'controllerOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'controllerOk')
        ? '按下微动开关软复位死机的门禁主控板，蜂鸣自检通过，门禁恢复工作！'
        : '软复位了控制器，但主板本就正常，门不开是机械卡阻或传感器故障。'
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
    requirements: (_w, t) => devType(t) === 'smartdoor',
    reqHint: '适用：智能感应门',
    effects: [{ target: true, comp: 'doorJammed', set: false }],
    log: (wb, _wa, t) =>
      bv(wb, t, 'doorJammed')
        ? '清理滑轨夹缝异物并喷涂低噪润滑剂，门体滑动顺畅如丝！'
        : '给滑轨喷了润滑油，但导轨本来就很顺滑，门不动作另有原因。'
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
    requirements: (_w, t) => devType(t) === 'cable',
    reqHint: '适用：网线',
    effects: [
      { target: true, comp: 'plugA', set: true },
      { target: true, comp: 'plugB', set: true }
    ],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'plugA') || !bv(wb, t, 'plugB')
        ? '重新把网线两端的 RJ45 水晶头推进插座底部，卡扣咔哒一声到位，链路通了！'
        : '插拔了网线两端接头，但接头原本就是卡牢的，连不通是因为线缆断芯。'
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
    requirements: (_w, t) => devType(t) === 'cable',
    reqHint: '适用：网线',
    effects: [
      { target: true, comp: 'intact', set: true },
      { target: true, comp: 'plugA', set: true },
      { target: true, comp: 'plugB', set: true }
    ],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'intact')
        ? '换上了一根全新的超六类抗拉双绞线，被踩碎压断的破旧线路被替换，链路满血复活！'
        : '费劲换了一根新网线，但旧线本身就是完好的，白白浪费了 3 步！'
  },

  // —— 供电主干 / UPS ——
  {
    id: 'reset_breaker',
    name: '合上电闸',
    tool: '手',
    category: 'repair',
    desc: '把跳闸的配电箱合上，恢复市电。下游所有设备随之复电。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'power',
    reqHint: '适用：市电配电箱',
    effects: [{ device: 'pw_main', comp: 'mainsOk', set: true }],
    log: (wb, _wa) =>
      !bv(wb, 'pw_main', 'mainsOk')
        ? '用力把配电箱脱扣的空气开关往上一推！啪的一声强电接通，整机房日光灯与设备齐鸣！'
        : '配电箱空开明明处于合闸位置，推了推空开，市电本来就有，并非跳闸。'
  },
  {
    id: 'replace_ups_battery',
    name: '更换 UPS 电池',
    tool: '电池',
    category: 'repair',
    desc: '换上新电池，解除 UPS 电池耗尽的隐患。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => devType(t) === 'ups',
    reqHint: '适用：UPS 电池组',
    effects: [{ device: 'ups1', comp: 'batteryOk', set: true }],
    log: (wb, _wa) =>
      !bv(wb, 'ups1', 'batteryOk')
        ? '换上全新的后备蓄电池组，绿色指示灯亮起，UPS 具备断电续航能力！'
        : '换了一组沉重的蓄电池，但原来的电池本来就是满电的，纯属白费力气。'
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
    requirements: (_w, t) => devType(t) === 'ups',
    reqHint: '适用：UPS',
    effects: [{ device: 'ups1', comp: 'upsOk', set: true }],
    log: (wb, _wa) =>
      !bv(wb, 'ups1', 'upsOk')
        ? '检修并复位了 UPS 故障的主板逆变电路，后备电源恢复在线冗余！'
        : '检修了 UPS 主机，逆变电路本就工作良好，白忙一场。'
  },

  // —— 机房空调 ——
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
    requirements: (_w, t) => devType(t) === 'ac',
    reqHint: '适用：机房空调',
    effects: [{ target: true, comp: 'acOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'acOk')
        ? '复位停机保护的精密空调，压缩机平稳轰鸣启动，冷气吹入机房！'
        : '重启了机房空调，但空调本来就在制冷，设备高温并非空调罢工。'
  },

  // —— 网关 / 无线 AP ——
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
    requirements: (_w, t) => devType(t) === 'router',
    reqHint: '适用：网关路由器',
    effects: [{ target: true, comp: 'configOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'configOk')
        ? '重新加载外网路由表与 NAT 转换规则，网关连接与外网链路全线畅通！'
        : '重置了路由器配置，但配置原本就完好无损，网络不通是上级光纤或物理链路故障。'
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
    requirements: (_w, t) => devType(t) === 'ap',
    reqHint: '适用：无线 AP',
    effects: [{ target: true, comp: 'apOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'apOk')
        ? '复位了死锁的无线射频固件，2.4G/5G 双频 Wi-Fi 信号恢复广播！'
        : '重启了无线 AP，但 AP 本就正常，掉线是交换机供电中断引起的。'
  },

  // —— 光纤 ——
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
    requirements: (_w, t) => devType(t) === 'fiber',
    reqHint: '适用：光纤',
    effects: [{ target: true, comp: 'fiberOk', set: true }],
    log: (wb, _wa, t) =>
      !bv(wb, t, 'fiberOk')
        ? '拔出烧毁的光纤收发模块换上全新单模模块，光衰正常，主干链路点亮！'
        : '换了一个贵重的光纤模块，但原来那个光功率好得很，纯属浪费备件。'
  },

  // ==========================================
  // —— 干扰项 / 无用项（增加真实排障迷雾） ——
  // ==========================================
  {
    id: 'shake_device',
    name: '量子力学·拍打机壳',
    tool: '巴掌',
    category: 'risky',
    desc: '企图通过大力拍打机箱震好虚焊接头。老一辈传下来的玄学手法。',
    time: 1,
    risk: 1,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => Boolean(t),
    reqHint: '需选择一台设备',
    log: '你哐哐拍打了两下设备外壳，除了手掌震得生疼扬起一阵灰尘外，什么都没改变。',
    effects: []
  },
  {
    id: 'blow_dust',
    name: '对接口吹气/哈气',
    tool: '肺活量',
    category: 'repair',
    desc: '用嘴对着插头或网口缝隙用力吹气。心理安慰大于实际效果。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => Boolean(t),
    reqHint: '需选择一台设备',
    log: '你鼓起腮帮子对着接口猛吹了几口，差点把唾沫星子喷进金手指，设备毫无反应。',
    effects: []
  },
  {
    id: 'magic_reboot',
    name: '急躁狂按电源键',
    tool: '手指',
    category: 'risky',
    desc: '失去耐心，对着设备的电源开关连续快速狂按几十次。',
    time: 2,
    risk: 2,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => Boolean(t),
    reqHint: '需选择一台设备',
    log: '你连续疯狂按压电源开关，设备内部继电器咔哒咔哒狂响，电源电容严重受创！',
    effects: [],
    damage: 10
  },
  {
    id: 'flush_dns_blindly',
    name: '盲目刷新 DNS/ARP',
    tool: '终端',
    category: 'repair',
    desc: '在控制台狂敲 ipconfig /flushdns 和 arp -d *。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => ['server', 'desktop', 'router', 'camera', 'printer'].includes(devType(t) ?? ''),
    reqHint: '适用：网络设备与主机',
    log: '控制台回显「已成功刷新解析程序缓存」，然而根本不是域名或ARP解析的问题，故障依然故我。',
    effects: []
  },
  {
    id: 'reinstall_driver',
    name: '重装通用硬件驱动',
    tool: '驱动程序',
    category: 'repair',
    desc: '重新下载并安装设备底层驱动程序。',
    time: 3,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => ['desktop', 'server', 'printer'].includes(devType(t) ?? ''),
    reqHint: '适用：台式机 / 服务器 / 打印机',
    log: '安装进度条走完了，系统提示「硬件未就绪或未连接」，耗时 3 步一无所获！',
    effects: []
  },
  {
    id: 'tape_fix',
    name: '绝缘黑胶布缠绕',
    tool: '电工胶带',
    category: 'repair',
    desc: '不管三七二十一，用电工黑胶带把接头和线身缠个密密麻麻。',
    time: 2,
    risk: 0,
    reversible: true,
    requiresTarget: true,
    requirements: (_w, t) => ['cable', 'camera', 'power', 'switch', 'access'].includes(devType(t) ?? ''),
    reqHint: '适用：线缆与外露设备',
    log: '你把线头包得像木乃伊一样扎实，看起来极有安全感，但内部断芯并不会因此自愈。',
    effects: []
  },
  {
    id: 'pray_totem',
    name: '赛博玄学·机柜贴符',
    tool: '黄纸朱砂符',
    category: 'inspect',
    desc: '在机柜正面郑重贴上「永不宕机·八核庇佑」符咒。',
    time: 1,
    risk: 0,
    reversible: true,
    requiresTarget: false,
    log: '心诚则灵……然而冰冷的晶体管不吃这一套，告警红灯依然嚣张地闪烁着。',
    effects: []
  },

  // ==========================================
  // —— 高危破坏项 / 灾难性炸机项（BOOM！） ——
  // ==========================================
  {
    id: 'short_power_pins',
    name: '短接引脚测试供电',
    tool: '金属螺丝刀',
    category: 'risky',
    desc: '用裸露金属螺丝刀直接短接主板电源或跳线触点尝试通电（极度危险！）。',
    time: 1,
    risk: 3,
    reversible: false,
    highRisk: true,
    catastrophic: true,
    catastrophicReason: '金属螺丝刀打滑触碰高压母线！耀眼的电弧瞬间爆闪，引发机房主断路器跳闸，主板当场烧穿，全场一片漆黑，机房炸了！',
    requiresTarget: true,
    requirements: (_w, t) => ['server', 'switch', 'desktop', 'power', 'smartdoor', 'access'].includes(devType(t) ?? ''),
    reqHint: '适用：带电主板与电控设备（极高危）',
    effects: [],
    log: '💥 金属螺丝刀引发短路爆闪，机房断路器跳闸，机房炸了！',
    damage: 100
  },
  {
    id: 'poe_overvolt',
    name: '强行注入 48V PoE 强电',
    tool: '无源注入器',
    category: 'risky',
    desc: '不管目标设备协议，强行开启 48V 直流高压测试端口供电（极度危险！）。',
    time: 1,
    risk: 3,
    reversible: false,
    highRisk: true,
    catastrophic: true,
    catastrophicReason: '48V 高压直灌普通 5V/12V 网卡芯片！设备内部发出一声脆响，网口冒出刺鼻滚滚黑烟，主板芯片瞬间击穿熔毁，机房炸了！',
    requiresTarget: true,
    requirements: (_w, t) => ['camera', 'printer', 'desktop', 'router', 'ap', 'cable'].includes(devType(t) ?? ''),
    reqHint: '适用：网口设备（极高危）',
    effects: [],
    log: '💥 48V 强电击穿芯片冒烟烧焦，设备永久报废，机房炸了！',
    damage: 100
  },
  {
    id: 'hot_unplug_raid',
    name: '热拔插 RAID 阵列活跃盘',
    tool: '蛮力',
    category: 'risky',
    desc: '在阵列指示灯高频闪烁写入时，直接用力扳开硬盘扣具拔盘（极度危险！）。',
    time: 1,
    risk: 3,
    reversible: false,
    highRisk: true,
    catastrophic: true,
    catastrophicReason: '阵列正在高速同步奇偶校验数据！暴力拔盘瞬间损坏 RAID Superblock 元数据，导致多盘同步离线，数据池不可逆雪崩，机房炸了！',
    requiresTarget: true,
    requirements: (_w, t) => ['server', 'nvr'].includes(devType(t) ?? ''),
    reqHint: '适用：存储服务器 / 录像机（极高危）',
    effects: [],
    log: '💥 强制拔盘导致 RAID 元数据彻底损毁，数据雪崩，机房炸了！',
    damage: 100
  },
  {
    id: 'format_system_drive',
    name: '强行格式化全盘分区',
    tool: 'mkfs 强冲',
    category: 'risky',
    desc: '未做镜像备份，直接对系统所在的启动分区执行强制格式化（极度危险！）。',
    time: 2,
    risk: 3,
    reversible: false,
    highRisk: true,
    catastrophic: true,
    catastrophicReason: '你直接对挂载了根目录的系统盘执行了强制格式化！所有系统文件、引导扇区和注册配置灰飞烟灭，服务器当场瘫痪变砖，无法开机！',
    requiresTarget: true,
    requirements: (_w, t) => ['server', 'desktop', 'nvr'].includes(devType(t) ?? ''),
    reqHint: '适用：主机 / 存储（极高危）',
    effects: [],
    log: '💥 系统分区被全盘抹空，机器彻底变砖，工单失败！',
    damage: 100
  },
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
    requirements: (_w, t) => ['camera', 'nvr', 'switch', 'router', 'ap'].includes(devType(t) ?? ''),
    reqHint: '适用：摄像头 / 录像机 / 交换机 / 网关',
    effects: (t) =>
      devType(t) === 'camera'
        ? [{ target: true, comp: 'configLost', set: true }]
        : [{ target: true, comp: 'recordingsLost', set: true }],
    log: '用针捅住 Reset 孔恢复出厂设置！设备配置全被抹除，参数丢失。',
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
    requirements: (_w, t) => devType(t) === 'nvr',
    reqHint: '适用：录像机（高危）',
    effects: [
      { target: true, comp: 'diskFull', set: false },
      { target: true, comp: 'recordingsLost', set: true }
    ],
    log: '格式化了整个录像硬盘，磁盘虽然空了，但全部历史录像永久灰飞烟灭！',
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
    requirements: (_w, t) => ['access', 'smartdoor'].includes(devType(t) ?? ''),
    reqHint: '适用：门禁 / 感应门',
    effects: [
      { target: true, comp: 'lockJammed', set: false },
      { target: true, comp: 'doorBroken', set: true }
    ],
    log: '抄起撬棍用力将门撬开！门虽然开了，但门框变形锁芯崩断，现场一片狼藉。',
    damage: 15
  }
]

export const ACTION_BY_ID: Record<string, ActionDef> = Object.fromEntries(
  ACTION_DEFS.map((a) => [a.id, a])
)
