import { FaultDef, WorldView } from '../game/types'
import { bv } from '../game/types'

// 故障（根因）库：关卡开始时注入的初始状态变更，并提供“是否已修复”判定。
// 设计原则：同一症状可对应不同根因（如“离线”可能是交换机断电、本机网口松、或网线断了）。
// 针对“某台设备”的故障用 target:true 标记，由工单在 faults 中给出具体目标设备。

export const FAULT_DEFS: FaultDef[] = [
  // —— 摄像头（4 路各自不同根因） ——
  {
    id: 'cam_port_loose',
    label: '摄像头网口接头松动',
    inject: [{ target: true, comp: 'portOk', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'portOk') === true : true)
  },
  {
    id: 'cam_lens_blocked',
    label: '摄像头镜头被遮挡',
    inject: [{ target: true, comp: 'lensBlocked', set: true }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'lensBlocked') !== true : true)
  },
  {
    id: 'cam_config_lost',
    label: '摄像头配置丢失（曾恢复出厂）',
    inject: [{ target: true, comp: 'configLost', set: true }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'configLost') !== true : true)
  },
  {
    id: 'cam_power_adapter',
    label: '摄像头电源适配器损坏',
    inject: [{ target: true, comp: 'camPowered', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'camPowered') === true : true)
  },
  {
    id: 'cam_ip_conflict',
    label: '摄像头 IP 地址冲突',
    inject: [{ target: true, comp: 'ipConflict', set: true }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'ipConflict') !== true : true)
  },
  {
    id: 'cam_ir_broken',
    label: '摄像头红外灯损坏（夜视失效）',
    inject: [{ target: true, comp: 'irBroken', set: true }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'irBroken') !== true : true)
  },
  {
    id: 'cam_water',
    label: '摄像头进水短路',
    inject: [
      { target: true, comp: 'water', set: true },
      { target: true, comp: 'camPowered', set: false }
    ],
    resolved: (w: WorldView, t?: string) =>
      t ? w.get(t, 'water') !== true && w.get(t, 'camPowered') === true : true
  },
  {
    id: 'cam_focus_lost',
    label: '摄像头镜头失焦（画面模糊）',
    inject: [{ target: true, comp: 'focusLost', set: true }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'focusLost') !== true : true)
  },
  // —— 交换机 / 网线 ——
  {
    id: 'switch_plug_loose',
    label: '交换机电源插头松动（共因）',
    inject: [{ device: 'sw_core', comp: 'plugSeated', set: false }],
    resolved: (w) => bv(w, 'sw_core', 'plugSeated')
  },
  {
    id: 'cab_trunk_cut',
    label: '主干网线被剪断',
    inject: [{ device: 'cab_trunk', comp: 'intact', set: false }],
    resolved: (w) => w.get('cab_trunk', 'intact') === true
  },
  {
    id: 'cab_cut',
    label: '网线断裂',
    inject: [{ target: true, comp: 'intact', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'intact') === true : true)
  },
  {
    id: 'cab_plug_loose',
    label: '网线接头松动',
    inject: [{ target: true, comp: 'plugB', set: false }],
    resolved: (w: WorldView, t?: string) =>
      t ? w.get(t, 'plugA') === true && w.get(t, 'plugB') === true : true
  },
  // —— 录像机 / 打印机 / 门禁（沿用） ——
  {
    id: 'nvr_disk_full',
    label: 'NVR 磁盘被旧录像占满',
    inject: [{ device: 'nvr', comp: 'diskFull', set: true }],
    resolved: (w) => !bv(w, 'nvr', 'diskFull')
  },
  {
    id: 'printer_jam',
    label: '打印机卡纸',
    inject: [{ device: 'printer', comp: 'paperJam', set: true }],
    resolved: (w) => !bv(w, 'printer', 'paperJam')
  },
  {
    id: 'door_lock_jam',
    label: '门禁锁舌卡死',
    inject: [{ device: 'door1', comp: 'lockJammed', set: true }],
    resolved: (w) => !bv(w, 'door1', 'lockJammed')
  },
  // —— 服务器（派生模型） ——
  {
    id: 'server_overheat',
    label: '散热风扇停转导致过热',
    inject: [{ device: 'server', comp: 'fanOk', set: false }],
    resolved: (w) => bv(w, 'server', 'fanOk')
  },
  {
    id: 'server_service_down',
    label: '关键服务因内存泄漏崩溃',
    inject: [{ device: 'server', comp: 'memLeak', set: true }],
    resolved: (w) => !bv(w, 'server', 'memLeak')
  },
  {
    id: 'server_net_down',
    label: '服务器网卡故障断网',
    inject: [{ device: 'server', comp: 'netCardOk', set: false }],
    resolved: (w) => bv(w, 'server', 'netCardOk')
  },
  {
    id: 'server_disk_full',
    label: '服务器磁盘被日志占满',
    inject: [{ device: 'server', comp: 'diskFull', set: true }],
    resolved: (w) => !bv(w, 'server', 'diskFull')
  },
  // —— 台式机 ——
  {
    id: 'pc_plug_loose',
    label: '台式机插头松动断电',
    inject: [{ target: true, comp: 'plugSeated', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'plugSeated') === true : true)
  },
  {
    id: 'pc_ram_loose',
    label: '内存条松动',
    inject: [{ target: true, comp: 'ramSeated', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'ramSeated') === true : true)
  },
  {
    id: 'pc_monitor_bad',
    label: '显示器损坏黑屏',
    inject: [{ target: true, comp: 'monitorOk', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'monitorOk') === true : true)
  },
  {
    id: 'pc_bsod',
    label: '系统蓝屏',
    inject: [{ target: true, comp: 'bsod', set: true }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'bsod') !== true : true)
  },
  {
    id: 'pc_disk_full',
    label: '系统盘写满无法启动',
    inject: [{ target: true, comp: 'diskOk', set: false }],
    resolved: (w: WorldView, t?: string) => (t ? w.get(t, 'diskOk') === true : true)
  },
  // —— 智能感应门 ——
  {
    id: 'sd_sensor_dirty',
    label: '感应传感器脏污',
    inject: [{ device: 'sdoor1', comp: 'sensorClean', set: false }],
    resolved: (w) => bv(w, 'sdoor1', 'sensorClean')
  },
  {
    id: 'sd_sensor_misalign',
    label: '感应传感器错位',
    inject: [{ device: 'sdoor1', comp: 'sensorAligned', set: false }],
    resolved: (w) => bv(w, 'sdoor1', 'sensorAligned')
  },
  {
    id: 'sd_controller_dead',
    label: '感应门控制器死机',
    inject: [{ device: 'sdoor1', comp: 'controllerOk', set: false }],
    resolved: (w) => bv(w, 'sdoor1', 'controllerOk')
  },
  {
    id: 'sd_door_jam',
    label: '感应门门体卡阻',
    inject: [{ device: 'sdoor1', comp: 'doorJammed', set: true }],
    resolved: (w) => !bv(w, 'sdoor1', 'doorJammed')
  },
  // —— 供电主干 / UPS（一环扣一环的起点） ——
  {
    id: 'mains_out',
    label: '市电配电箱跳闸',
    inject: [{ device: 'pw_main', comp: 'mainsOk', set: false }],
    resolved: (w) => bv(w, 'pw_main', 'mainsOk')
  },
  {
    id: 'ups_battery_dead',
    label: 'UPS 电池耗尽',
    inject: [{ device: 'ups1', comp: 'batteryOk', set: false }],
    resolved: (w) => bv(w, 'ups1', 'batteryOk')
  },
  {
    id: 'ups_fault',
    label: 'UPS 自身故障',
    inject: [{ device: 'ups1', comp: 'upsOk', set: false }],
    resolved: (w) => bv(w, 'ups1', 'upsOk')
  },
  // —— 机房空调（制冷链 → 服务器过热） ——
  {
    id: 'ac_off',
    label: '机房空调停机',
    inject: [{ device: 'ac1', comp: 'acOk', set: false }],
    resolved: (w) => bv(w, 'ac1', 'acOk')
  },
  // —— 网关 / 无线 AP（外网链） ——
  {
    id: 'router_cfg_lost',
    label: '网关路由器配置丢失',
    inject: [{ device: 'router1', comp: 'configOk', set: false }],
    resolved: (w) => bv(w, 'router1', 'configOk')
  },
  {
    id: 'ap_off',
    label: '无线 AP 故障',
    inject: [{ device: 'ap1', comp: 'apOk', set: false }],
    resolved: (w) => bv(w, 'ap1', 'apOk')
  },
  // —— 光纤（主干链） ——
  {
    id: 'fiber_cut',
    label: '光纤收发模块损坏',
    inject: [{ device: 'fiber1', comp: 'fiberOk', set: false }],
    resolved: (w) => bv(w, 'fiber1', 'fiberOk')
  }
]

/** 取某故障的“已修复”判定（目标类故障绑定具体设备） */
export function faultResolved(f: FaultDef, target: string | undefined, w: WorldView): boolean {
  return f.resolved ? f.resolved(w, target) : true
}

export const FAULT_BY_ID: Record<string, FaultDef> = Object.fromEntries(
  FAULT_DEFS.map((f) => [f.id, f])
)
