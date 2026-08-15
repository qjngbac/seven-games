import { DeviceDef, Severity, SymptomInstance, WorldView, bv } from './types'

function inst(device: DeviceDef, severity: Severity, display: string): SymptomInstance {
  return { device: device.id, deviceName: device.name, severity, display }
}

/**
 * 症状引擎：从设备当前状态推导可观察症状。
 * 同一症状（如"离线"）可能对应不同根因，这里只描述现象，不暴露答案。
 */
export function deviceSymptoms(device: DeviceDef, w: WorldView): SymptomInstance[] {
  const out: SymptomInstance[] = []
  const on = (c: string) => bv(w, device.id, c)
  const off = (c: string) => !on(c)

  switch (device.type) {
    case 'switch': {
      if (off('powered')) out.push(inst(device, 'error', '整机断电 · 所有端口灯灭'))
      else if (off('poeUp')) out.push(inst(device, 'error', 'PoE 供电异常'))
      break
    }
    case 'camera': {
      if (off('online')) out.push(inst(device, 'error', '离线 · 无画面'))
      else if (off('videoAvailable')) out.push(inst(device, 'warn', '在线但画面异常'))
      if (on('recording')) out.push(inst(device, 'info', '录像中'))
      if (off('nightVision')) out.push(inst(device, 'warn', '夜视失效（红外损坏）'))
      if (on('ipConflict')) out.push(inst(device, 'warn', 'IP 冲突 · 录像中断'))
      if (on('focusLost')) out.push(inst(device, 'warn', '画面模糊（失焦）'))
      if (on('water')) out.push(inst(device, 'error', '进水短路'))
      if (on('configLost')) out.push(inst(device, 'warn', '配置丢失（已出厂恢复）'))
      break
    }
    case 'nvr': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (on('diskFull')) out.push(inst(device, 'error', '磁盘已满 · 停止录像'))
      else if (on('recording')) out.push(inst(device, 'info', '录像中'))
      if (on('recordingsLost')) out.push(inst(device, 'warn', '历史录像已删除'))
      break
    }
    case 'server': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (on('alarmActive')) out.push(inst(device, 'error', '温度告警 · 蜂鸣'))
      if (on('diskFull')) out.push(inst(device, 'warn', '磁盘已满'))
      if (off('netUp')) out.push(inst(device, 'warn', '网络中断'))
      if (on('netUp') && off('wanUp')) out.push(inst(device, 'warn', '本地网络正常但无法访问外网'))
      if (off('serviceRunning')) out.push(inst(device, 'error', '关键服务未运行'))
      break
    }
    case 'access': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (off('openOk')) out.push(inst(device, 'error', '无法开启 · 锁舌卡死'))
      if (on('doorBroken')) out.push(inst(device, 'warn', '门体受损（被破拆）'))
      break
    }
    case 'printer': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (off('online')) out.push(inst(device, 'error', '离线'))
      else if (off('printingOk')) out.push(inst(device, 'warn', '卡纸 · 无法打印'))
      break
    }
    case 'desktop': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (off('displayNormal')) out.push(inst(device, 'error', '黑屏/蓝屏 · 无显示'))
      else if (off('osBooted')) out.push(inst(device, 'warn', '系统未启动（卡 Logo）'))
      if (off('netUp')) out.push(inst(device, 'warn', '无法上网'))
      if (off('usable')) out.push(inst(device, 'warn', '不可用（部分异常）'))
      break
    }
    case 'smartdoor': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (off('senseOk')) out.push(inst(device, 'error', '感应失灵（靠近不开）'))
      if (on('doorJammed')) out.push(inst(device, 'warn', '门体卡阻'))
      break
    }
    case 'cable': {
      if (off('intact')) out.push(inst(device, 'error', '线缆断裂'))
      else if (off('linkOk')) out.push(inst(device, 'warn', '链路不通（接头松动）'))
      else out.push(inst(device, 'info', '链路正常'))
      break
    }
    case 'power': {
      if (off('mainsOk')) out.push(inst(device, 'error', '市电跳闸'))
      else out.push(inst(device, 'info', '市电正常'))
      break
    }
    case 'ups': {
      if (off('upsOk')) out.push(inst(device, 'error', 'UPS 故障'))
      else if (off('batteryOk')) out.push(inst(device, 'warn', 'UPS 电池耗尽（市电中断将断电）'))
      else out.push(inst(device, 'info', 'UPS 正常'))
      break
    }
    case 'ac': {
      if (off('acOk')) out.push(inst(device, 'error', '空调停机 · 机房升温'))
      else out.push(inst(device, 'info', '空调运行'))
      break
    }
    case 'router': {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      else if (off('wanUp')) out.push(inst(device, 'error', '外网中断'))
      else if (off('linkToSwitch')) out.push(inst(device, 'warn', '上联链路不通'))
      else out.push(inst(device, 'info', '外网正常'))
      break
    }
    case 'ap': {
      if (off('powered')) out.push(inst(device, 'error', '断电（多为上联交换机断电）'))
      else if (off('apUp')) out.push(inst(device, 'error', '无线中断'))
      else out.push(inst(device, 'info', '无线正常'))
      break
    }
    case 'fiber': {
      if (off('fiberOk')) out.push(inst(device, 'error', '光纤模块损坏'))
      else out.push(inst(device, 'info', '光纤正常'))
      break
    }
    default: {
      if (off('powered')) out.push(inst(device, 'error', '断电'))
      break
    }
  }
  return out
}

/** 场景级"共因"提示：多设备同时离线时，提示检查上联 */
export function sceneInsight(devices: DeviceDef[], w: WorldView): string | null {
  const offlineCams = devices.filter((d) => d.type === 'camera' && !bv(w, d.id, 'online'))
  const switchDown = devices.some((d) => d.type === 'switch' && !bv(w, d.id, 'powered'))
  const hasCable = devices.some((d) => d.type === 'cable')
  if (offlineCams.length >= 2 && switchDown) {
    return `多台摄像头同时离线，且上联交换机已断电 —— 大概率共因故障，先查交换机供电。`
  }
  if (offlineCams.length >= 2 && !switchDown && hasCable) {
    return `多台摄像头离线但交换机供电正常 —— 疑似各自网线/主干问题，需逐台排查网线链路。`
  }
  if (offlineCams.length >= 2) {
    return `多台摄像头同时离线，注意寻找共同依赖（上联交换机 / 供电 / 网线）。`
  }
  // 连环故障洞察：供电主干
  const coreDown = devices.filter((d) =>
    ['switch', 'server', 'nvr', 'access'].includes(d.type) && !bv(w, d.id, 'powered')
  )
  const hasPower = devices.some((d) => d.type === 'power' || d.type === 'ups')
  if (coreDown.length >= 2 && hasPower) {
    return `多台核心设备同时断电 —— 极可能是供电主干问题（市电跳闸 / UPS 电池耗尽），先查配电箱与 UPS。`
  }
  // 连环故障洞察：空调 → 服务器过热
  const srv = devices.find((d) => d.type === 'server')
  const hasAc = devices.some((d) => d.type === 'ac')
  if (srv && hasAc && bv(w, srv.id, 'tempHigh') && bv(w, srv.id, 'fanOk')) {
    return `服务器过热但风扇正常 —— 根因在制冷，检查机房空调是否停机，别只清风扇。`
  }
  // 连环故障洞察：网关 → 外网
  if (srv && bv(w, srv.id, 'netUp') && !bv(w, srv.id, 'wanUp')) {
    return `服务器本地网络通但外网中断 —— 问题在上联网关/路由器，重启网卡没用。`
  }
  return null
}
