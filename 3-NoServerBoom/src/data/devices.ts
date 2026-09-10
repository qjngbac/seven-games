import { DeviceDef } from '../game/types'

// 设备库：状态是唯一事实来源。
// - 基础组件（initial）由故障/操作直接写入；
// - derive 组件由其它组件计算，玩家不可直接设置；
// - 跨设备依赖（如摄像头链路依赖交换机 PoE、网线链路）通过 WorldView 读取，缺失设备默认“正常”。

// 上联 PoE 交换机 id（场景内唯一）
export const CORE_SWITCH = 'sw_core'

function poeOk(w: { get: (d: string, c: string) => unknown }): boolean {
  const v = w.get(CORE_SWITCH, 'poeUp')
  return v === undefined ? true : v === true
}

/**
 * 网线链路健康：摄像头链路 = PoE 供电 + 本机网口 + (主干网线 AND 本路网线)。
 * 场景中未放置对应网线设备时，默认链路正常（向后兼容旧工单）。
 */
function cableOk(w: { get: (d: string, c: string) => unknown }, camId: string): boolean {
  const trunk = w.get('cab_trunk', 'linkOk')
  const trunkOk = trunk === undefined ? true : trunk === true
  const per = w.get('cab_' + camId, 'linkOk')
  const perOk = per === undefined ? true : per === true
  const fiber = w.get('fiber1', 'fiberOk')
  const fiberOk = fiber === undefined ? true : fiber === true
  return trunkOk && perOk && fiberOk
}

/**
 * 供电主干：市电正常，或 UPS 正常且电池有电 → 整机有电。
 * 场景中未放置市电/UPS 设备时，默认供电正常（向后兼容旧工单）。
 * 这是“一环扣一环”的根：市电跳闸且 UPS 电池耗尽 → 交换机/服务器/NVR/门禁等全部断电。
 */
function backbonePower(w: { get: (d: string, c: string) => unknown }): boolean {
  const mains = w.get('pw_main', 'mainsOk')
  const mainsOk = mains === undefined ? true : mains === true
  const ups = w.get('ups1', 'upsOk')
  const upsOk = ups === undefined ? true : ups === true
  const batt = w.get('ups1', 'batteryOk')
  const battOk = batt === undefined ? true : batt === true
  return mainsOk || (upsOk && battOk)
}

/** 机房空调是否运行（缺失默认正常） */
function acRunning(w: { get: (d: string, c: string) => unknown }): boolean {
  const v = w.get('ac1', 'acOk')
  return v === undefined ? true : v === true
}

/** 网关外网是否可达（缺失默认可达） */
function routerWan(w: { get: (d: string, c: string) => unknown }): boolean {
  const v = w.get('router1', 'wanUp')
  return v === undefined ? true : v === true
}

export const DEVICE_DEFS: DeviceDef[] = [
  {
    id: CORE_SWITCH,
    name: 'PoE 交换机',
    type: 'switch',
    icon: '🔀',
    desc: '为摄像头与 AP 集中供电并转发数据。整机断电会让所有下联设备同时离线。',
    components: [
      { key: 'plugSeated', label: '电源插头', observable: false, initial: true },
      {
        key: 'powered',
        label: '整机供电',
        observable: true,
        derive: (w) => w.get(CORE_SWITCH, 'plugSeated') === true && backbonePower(w)
      },
      {
        key: 'poeUp',
        label: 'PoE 输出',
        observable: true,
        derive: (w) => w.get(CORE_SWITCH, 'powered') === true
      }
    ]
  },
  ...['cam1', 'cam2', 'cam3', 'cam4'].map<DeviceDef>((id, i) => ({
    id,
    name: `摄像头 ${['A', 'B', 'C', 'D'][i]}`,
    type: 'camera',
    icon: '📷',
    desc: '监控摄像头，依赖上联交换机 PoE 供电、网线与本机状态。每路故障各不相同。',
    components: [
      { key: 'camPowered', label: '本机电源', observable: false, initial: true },
      { key: 'portOk', label: '网口接触', observable: false, initial: true },
      { key: 'lensBlocked', label: '镜头遮挡', observable: false, initial: false },
      { key: 'configLost', label: '配置丢失', observable: false, initial: false },
      { key: 'ipConflict', label: 'IP 冲突', observable: false, initial: false },
      { key: 'irBroken', label: '红外损坏', observable: false, initial: false },
      { key: 'water', label: '进水', observable: false, initial: false },
      { key: 'focusLost', label: '失焦', observable: false, initial: false },
      {
        key: 'linkUp',
        label: '链路',
        observable: false,
        derive: (w) => poeOk(w) && w.get(id, 'portOk') === true && cableOk(w, id)
      },
      {
        key: 'online',
        label: '在线',
        observable: true,
        derive: (w) => w.get(id, 'linkUp') === true && w.get(id, 'camPowered') === true
      },
      {
        key: 'videoAvailable',
        label: '画面正常',
        observable: true,
        derive: (w) =>
          w.get(id, 'online') === true &&
          w.get(id, 'lensBlocked') !== true &&
          w.get(id, 'focusLost') !== true
      },
      {
        key: 'recording',
        label: '录像中',
        observable: true,
        derive: (w) =>
          w.get(id, 'online') === true &&
          w.get(id, 'configLost') !== true &&
          w.get(id, 'ipConflict') !== true
      },
      {
        key: 'nightVision',
        label: '夜视',
        observable: true,
        derive: (w) => w.get(id, 'online') === true && w.get(id, 'irBroken') !== true
      }
    ]
  })),
  {
    id: 'nvr',
    name: '录像机 NVR',
    type: 'nvr',
    icon: '💾',
    desc: '存储并管理摄像头录像。断电或磁盘满会停止录像。',
    components: [
      { key: 'plugSeated', label: '电源插头', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get('nvr', 'plugSeated') === true && backbonePower(w)
      },
      { key: 'diskFull', label: '磁盘空间', observable: true, initial: false },
      { key: 'recordingsLost', label: '历史录像', observable: false, initial: false },
      {
        key: 'recording',
        label: '录像中',
        observable: true,
        derive: (w) => w.get('nvr', 'powered') === true && w.get('nvr', 'diskFull') !== true
      }
    ]
  },
  {
    id: 'server',
    name: '机房服务器',
    type: 'server',
    icon: '🖥️',
    desc: '运行关键业务。风扇停转会过热、内存泄漏会拖垮服务、网卡故障会断网。',
    components: [
      { key: 'plugSeated', label: '电源插头', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get('server', 'plugSeated') === true && backbonePower(w)
      },
      { key: 'fanOk', label: '风扇', observable: true, initial: true },
      { key: 'netCardOk', label: '网卡', observable: true, initial: true },
      { key: 'diskFull', label: '磁盘空间', observable: true, initial: false },
      { key: 'memLeak', label: '内存泄漏', observable: false, initial: false },
      { key: 'alarmMuted', label: '告警静音', observable: false, initial: false },
      {
        key: 'tempHigh',
        label: '温度',
        observable: false,
        derive: (w) =>
          w.get('server', 'powered') === true &&
          (w.get('server', 'fanOk') !== true || !acRunning(w))
      },
      {
        key: 'netUp',
        label: '网络',
        observable: true,
        derive: (w) => w.get('server', 'powered') === true && w.get('server', 'netCardOk') === true
      },
      {
        key: 'wanUp',
        label: '外网',
        observable: true,
        derive: (w) => w.get('server', 'netUp') === true && routerWan(w)
      },
      {
        key: 'serviceRunning',
        label: '关键服务',
        observable: true,
        // 磁盘写满同样会让关键服务停摆（原本漏了这一条因果，导致“服务器磁盘满”故障没有任何可观察症状）
        derive: (w) =>
          w.get('server', 'powered') === true &&
          w.get('server', 'memLeak') !== true &&
          w.get('server', 'diskFull') !== true
      },
      {
        key: 'alarmActive',
        label: '温度告警',
        observable: true,
        derive: (w) => w.get('server', 'tempHigh') === true && w.get('server', 'alarmMuted') !== true
      }
    ]
  },
  {
    id: 'door1',
    name: '门禁锁',
    type: 'access',
    icon: '🚪',
    desc: '电控门禁。锁舌卡死或断电都无法开启；破拆能开门但会损坏门体。',
    components: [
      { key: 'plugSeated', label: '电源插头', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get('door1', 'plugSeated') === true && backbonePower(w)
      },
      { key: 'lockJammed', label: '锁舌', observable: false, initial: false },
      { key: 'doorBroken', label: '门体', observable: false, initial: false },
      {
        key: 'openOk',
        label: '可开启',
        observable: true,
        derive: (w) =>
          w.get('door1', 'powered') === true &&
          w.get('door1', 'lockJammed') !== true &&
          w.get('door1', 'doorBroken') !== true
      }
    ]
  },
  {
    id: 'printer',
    name: '网络打印机',
    type: 'printer',
    icon: '🖨️',
    desc: '共享打印机。卡纸或脱网都无法打印。',
    components: [
      { key: 'powered', label: '供电', observable: true, initial: true },
      { key: 'netOk', label: '网络', observable: false, initial: true },
      { key: 'paperJam', label: '纸张', observable: false, initial: false },
      {
        key: 'online',
        label: '在线',
        observable: true,
        derive: (w) => w.get('printer', 'powered') === true && w.get('printer', 'netOk') === true
      },
      {
        key: 'printingOk',
        label: '可打印',
        observable: true,
        derive: (w) => w.get('printer', 'online') === true && w.get('printer', 'paperJam') !== true
      }
    ]
  },
  // ===== 新增：台式机 =====
  ...['pc1', 'pc2'].map<DeviceDef>((id, i) => ({
    id,
    name: `台式机 ${['①', '②'][i]}`,
    type: 'desktop',
    icon: '🖥',
    desc: '办公台式机。插头松、内存松、显示器坏、蓝屏、磁盘满都会让它不能用。',
    components: [
      { key: 'plugSeated', label: '电源插头', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get(id, 'plugSeated') === true
      },
      { key: 'monitorOk', label: '显示器', observable: true, initial: true },
      { key: 'ramSeated', label: '内存', observable: false, initial: true },
      { key: 'diskOk', label: '系统盘', observable: false, initial: true },
      { key: 'bsod', label: '蓝屏', observable: false, initial: false },
      { key: 'netCardOk', label: '网卡', observable: true, initial: true },
      {
        key: 'monitorOn',
        label: '显示器亮',
        observable: true,
        derive: (w) => w.get(id, 'powered') === true && w.get(id, 'monitorOk') === true
      },
      {
        key: 'osBooted',
        label: '系统启动',
        observable: true,
        derive: (w) =>
          w.get(id, 'powered') === true &&
          w.get(id, 'ramSeated') === true &&
          w.get(id, 'diskOk') === true &&
          w.get(id, 'bsod') !== true
      },
      {
        key: 'netUp',
        label: '上网',
        observable: true,
        derive: (w) => w.get(id, 'powered') === true && w.get(id, 'netCardOk') === true
      },
      {
        key: 'displayNormal',
        label: '显示正常',
        observable: true,
        derive: (w) => w.get(id, 'monitorOn') === true && w.get(id, 'bsod') !== true
      },
      {
        key: 'usable',
        label: '可用',
        observable: true,
        derive: (w) =>
          w.get(id, 'osBooted') === true &&
          w.get(id, 'displayNormal') === true &&
          w.get(id, 'netUp') === true
      }
    ]
  })),
  // ===== 新增：智能感应门 =====
  {
    id: 'sdoor1',
    name: '智能感应门',
    type: 'smartdoor',
    icon: '🚶',
    desc: '人体感应自动门。传感器脏/错位、控制器死、门体卡阻都会让它失灵。',
    components: [
      { key: 'plugSeated', label: '电源', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get('sdoor1', 'plugSeated') === true
      },
      { key: 'sensorClean', label: '传感器洁净', observable: true, initial: true },
      { key: 'sensorAligned', label: '传感器校准', observable: true, initial: true },
      { key: 'controllerOk', label: '控制器', observable: true, initial: true },
      { key: 'doorJammed', label: '门体卡阻', observable: false, initial: false },
      {
        key: 'senseOk',
        label: '感应正常',
        observable: true,
        derive: (w) =>
          w.get('sdoor1', 'powered') === true &&
          w.get('sdoor1', 'sensorClean') === true &&
          w.get('sdoor1', 'sensorAligned') === true &&
          w.get('sdoor1', 'controllerOk') === true
      },
      {
        key: 'openOk',
        label: '可开启',
        observable: true,
        derive: (w) => w.get('sdoor1', 'senseOk') === true && w.get('sdoor1', 'doorJammed') !== true
      }
    ]
  },
  // ===== 新增：网线（主干 + 每路摄像头各一根） =====
  {
    id: 'cab_trunk',
    name: '主干网线',
    type: 'cable',
    icon: '🔌',
    desc: '连接交换机与摄像头汇聚的上行主干。断了会让所有摄像头同时掉线，但交换机仍亮。',
    components: [
      { key: 'intact', label: '线缆完好', observable: true, initial: true },
      { key: 'plugA', label: '交换机端', observable: false, initial: true },
      { key: 'plugB', label: '汇聚端', observable: false, initial: true },
      {
        key: 'linkOk',
        label: '链路',
        observable: true,
        derive: (w) =>
          w.get('cab_trunk', 'intact') === true &&
          w.get('cab_trunk', 'plugA') === true &&
          w.get('cab_trunk', 'plugB') === true
      }
    ]
  },
  ...['cab_cam1', 'cab_cam2', 'cab_cam3', 'cab_cam4'].map<DeviceDef>((id, i) => ({
    id,
    name: `网线 ${['A', 'B', 'C', 'D'][i]} 路`,
    type: 'cable',
    icon: '🔌',
    desc: '连接交换机与对应摄像头的一根网线。断裂或接头松会让该路摄像头离线。',
    components: [
      { key: 'intact', label: '线缆完好', observable: true, initial: true },
      { key: 'plugA', label: '交换机端', observable: false, initial: true },
      { key: 'plugB', label: '摄像头端', observable: false, initial: true },
      {
        key: 'linkOk',
        label: '链路',
        observable: true,
        derive: (w) =>
          w.get(id, 'intact') === true && w.get(id, 'plugA') === true && w.get(id, 'plugB') === true
      }
    ]
  })),
  // ===== 新增：供电主干（市电 + UPS） =====
  {
    id: 'pw_main',
    name: '市电配电箱',
    type: 'power',
    icon: '⚡',
    desc: '整层楼供电来源。跳闸会让所有依赖市电/UPS 的设备同时断电——连环故障的起点。',
    components: [{ key: 'mainsOk', label: '市电', observable: true, initial: true }]
  },
  {
    id: 'ups1',
    name: 'UPS 不间断电源',
    type: 'ups',
    icon: '🔋',
    desc: '市电中断时由电池续命。电池耗尽则下游设备随之断电。',
    components: [
      { key: 'upsOk', label: 'UPS 正常', observable: true, initial: true },
      { key: 'batteryOk', label: '电池有电', observable: true, initial: true }
    ]
  },
  // ===== 新增：机房空调（制冷链 → 服务器过热） =====
  {
    id: 'ac1',
    name: '机房空调',
    type: 'ac',
    icon: '❄️',
    desc: '维持机房温度。停机后服务器即便风扇正常也会过热告警——连环故障链。',
    components: [{ key: 'acOk', label: '空调运行', observable: true, initial: true }]
  },
  // ===== 新增：网关路由器（外网链） =====
  {
    id: 'router1',
    name: '网关路由器',
    type: 'router',
    icon: '🌐',
    desc: '上联外网。配置丢失会让服务器无法访问外网、无线 AP 也跟着掉。',
    components: [
      { key: 'plugSeated', label: '电源插头', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get('router1', 'plugSeated') === true && backbonePower(w)
      },
      { key: 'configOk', label: '配置', observable: true, initial: true },
      {
        key: 'linkToSwitch',
        label: '上联链路',
        observable: true,
        derive: (w) => poeOk(w)
      },
      {
        key: 'wanUp',
        label: '外网',
        observable: true,
        derive: (w) =>
          w.get('router1', 'powered') === true &&
          w.get('router1', 'configOk') === true &&
          w.get('router1', 'linkToSwitch') === true
      }
    ]
  },
  // ===== 新增：无线 AP（依赖交换机 PoE） =====
  {
    id: 'ap1',
    name: '无线 AP',
    type: 'ap',
    icon: '📡',
    desc: '提供 Wi-Fi。依赖上联交换机 PoE 供电，交换机一断电它就跟着掉。',
    components: [
      { key: 'plugSeated', label: '电源接头', observable: false, initial: true },
      {
        key: 'powered',
        label: '供电',
        observable: true,
        derive: (w) => w.get('ap1', 'plugSeated') === true && backbonePower(w) && poeOk(w)
      },
      { key: 'apOk', label: 'AP 正常', observable: true, initial: true },
      {
        key: 'apUp',
        label: '无线',
        observable: true,
        derive: (w) => w.get('ap1', 'powered') === true && w.get('ap1', 'apOk') === true && routerWan(w)
      }
    ]
  },
  // ===== 新增：光纤收发模块（主干链） =====
  {
    id: 'fiber1',
    name: '光纤收发器',
    type: 'fiber',
    icon: '🛰️',
    desc: '汇聚上行光纤。模块坏了主干链路断，所有摄像头同时掉线、录像机停录。',
    components: [{ key: 'fiberOk', label: '光纤模块', observable: true, initial: true }]
  }
]

export const DEVICE_BY_ID: Record<string, DeviceDef> = Object.fromEntries(
  DEVICE_DEFS.map((d) => [d.id, d])
)

export function devType(target?: string): string | undefined {
  return target ? DEVICE_BY_ID[target]?.type : undefined
}
