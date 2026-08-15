import { describe, it, expect } from 'vitest'
import { WORK_ORDERS } from '../data/workorders'
import { WorkOrderController } from './controller'
import { ACTION_BY_ID } from '../data/actions'
import { DEVICE_BY_ID } from '../data/devices'
import { deviceSymptoms } from './symptoms'

/** 沿参考路径执行，返回控制器 */
function runReference(woId: string): WorkOrderController {
  const wo = WORK_ORDERS.find((w) => w.id === woId)!
  const c = new WorkOrderController(wo)
  for (const step of wo.referencePath) {
    const r = c.apply(step.action, step.target)
    expect(r.ok, `参考步骤应可执行: ${step.action}@${step.target}`).toBe(true)
  }
  return c
}

describe('内容校验：每关都有可行解', () => {
  for (const wo of WORK_ORDERS) {
    it(`${wo.id}（${wo.title}）参考解法满足验收且不违反约束`, () => {
      const c = runReference(wo.id)
      expect(c.acceptanceMet(), '验收条件应满足').toBe(true)
      expect(c.rootCauseFixed(), '根因应已消除').toBe(true)
      expect(c.violated, '不应违反限制').toBe(false)
      expect(c.timeOverdue(), '不应超时').toBe(false)
      const res = c.submit()
      expect(res.cleared).toBe(true)
      expect(['S', 'A', 'B']).toContain(res.grade)
    })
  }
})

describe('依赖传播：交换机断电 → 所有摄像头离线 → 复电恢复', () => {
  it('交换机插头松动导致四路摄像头同时离线', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_four_cam')!)
    const cams = ['cam1', 'cam2', 'cam3', 'cam4']
    for (const cam of cams) {
      expect(c.world.get(cam, 'online')).toBe(false)
    }
    const syms = c.symptoms().filter((s) => s.device === 'sw_core')
    expect(syms.some((s) => s.severity === 'error')).toBe(true)
  })

  it('重新插紧交换机插头后摄像头全部恢复在线', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_four_cam')!)
    c.apply('replug_cable', 'sw_core')
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) {
      expect(c.world.get(cam, 'online')).toBe(true)
      expect(c.world.get(cam, 'videoAvailable')).toBe(true)
    }
  })
})

describe('症状由状态推导（非写死）', () => {
  it('摄像头在线但镜头遮挡 → 仅“画面异常”而非“离线”', () => {
    const wo = WORK_ORDERS.find((w) => w.id === 'wo_cam_config')!
    const c = new WorkOrderController(wo)
    expect(c.world.get('cam2', 'online')).toBe(true)
    expect(c.world.get('cam2', 'videoAvailable')).toBe(false)
    const syms = deviceSymptoms(DEVICE_BY_ID['cam2'], c.world.View)
    expect(syms.some((s) => s.display.includes('画面异常'))).toBe(true)
    expect(syms.some((s) => s.display.includes('离线'))).toBe(false)
  })
})

describe('操作前置条件不可绕过', () => {
  it('服务未崩溃时“重启服务”不可用', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_server_alarm')!)
    expect(c.canApply('restart_service', 'server').ok).toBe(false)
  })
  it('未选目标设备时需要目标的动作不可用', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_cam1_loose')!)
    expect(c.canApply('replug_cable').ok).toBe(false)
  })
})

describe('高危不可逆操作需二次确认且产生损失', () => {
  it('恢复出厂设置标记 highRisk，执行后配置丢失并计损失', () => {
    const a = ACTION_BY_ID['factory_reset']
    expect(a.highRisk).toBe(true)
    expect(a.reversible).toBe(false)
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_cam1_loose')!)
    const r = c.apply('factory_reset', 'cam1')
    expect(r.ok).toBe(true)
    expect(c.world.get('cam1', 'configLost')).toBe(true)
    expect(r.damage).toBeGreaterThan(0)
  })
})

describe('约束违反触发失败', () => {
  it('wo_four_cam 禁止恢复出厂，使用则 violated=true', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_four_cam')!)
    c.apply('factory_reset', 'cam1')
    expect(c.violated).toBe(true)
    // 即便摄像头可能被推回在线，违反约束仍判失败
    const res = c.submit()
    expect(res.cleared).toBe(false)
  })
})

describe('临时修好：静音告警满足验收但根因未除', () => {
  it('服务器告警静音后 alarmActive=false，但 rootCauseFixed=false', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_server_alarm')!)
    c.apply('mute_alarm', 'server')
    expect(c.acceptanceMet()).toBe(true)
    expect(c.rootCauseFixed()).toBe(false)
    const res = c.submit()
    expect(res.cleared).toBe(true)
    expect(res.title).toContain('临时')
  })
})

describe('时间线可复现最终状态', () => {
  it('每条时间线含状态快照，最后一条等于当前世界', () => {
    const c = runReference('wo_final')
    const last = c.timeline[c.timeline.length - 1]
    expect(last.stateAfter).toBeDefined()
    expect(last.stateAfter!['sw_core.poeUp']).toBe(true)
    expect(last.stateAfter!['nvr.recording']).toBe(true)
  })
})

describe('网线链路依赖（摄像头链路 = PoE + 网口 + 网线）', () => {
  it('主干网线被剪 → 交换机仍亮但四路摄像头全离线', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_core_cable')!)
    expect(c.world.get('sw_core', 'powered')).toBe(true)
    expect(c.world.get('cab_trunk', 'linkOk')).toBe(false)
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) {
      expect(c.world.get(cam, 'online')).toBe(false)
    }
  })
  it('更换主干网线后四路摄像头全部恢复在线', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_core_cable')!)
    c.apply('cab_swap', 'cab_trunk')
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) {
      expect(c.world.get(cam, 'online')).toBe(true)
      expect(c.world.get(cam, 'videoAvailable')).toBe(true)
    }
  })
  it('单路网线断裂只影响该路摄像头', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_cam_cable')!)
    expect(c.world.get('cam1', 'online')).toBe(false)
    expect(c.world.get('cab_cam1', 'linkOk')).toBe(false)
    c.apply('cab_swap', 'cab_cam1')
    expect(c.world.get('cab_cam1', 'linkOk')).toBe(true)
    expect(c.world.get('cam1', 'online')).toBe(true)
    expect(c.world.get('cam1', 'videoAvailable')).toBe(true)
  })
})

describe('台式机可解性', () => {
  it('内存松动 → 不可用；重插内存后可用', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_pc_blackscreen')!)
    expect(c.world.get('pc1', 'usable')).toBe(false)
    c.apply('pc_reseat_ram', 'pc1')
    expect(c.world.get('pc1', 'usable')).toBe(true)
  })
  it('蓝屏 → 重启后恢复', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_pc_bsod')!)
    c.apply('pc_reboot', 'pc1')
    expect(c.world.get('pc1', 'usable')).toBe(true)
  })
})

describe('智能感应门可解性', () => {
  it('传感器脏+错位 → 感应失灵；清洁并校准后正常开启', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_sdoor_double')!)
    expect(c.world.get('sdoor1', 'openOk')).toBe(false)
    c.apply('sd_clean_sensor', 'sdoor1')
    c.apply('sd_align_sensor', 'sdoor1')
    expect(c.world.get('sdoor1', 'openOk')).toBe(true)
  })
})

describe('服务器网络可解性', () => {
  it('网卡故障 → 断网；复位网卡后恢复', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_server_net')!)
    expect(c.world.get('server', 'netUp')).toBe(false)
    c.apply('reset_nic', 'server')
    expect(c.world.get('server', 'netUp')).toBe(true)
  })
})

describe('摄像头四路差异化（各路根因不同）', () => {
  it('A 网口松 / B 遮挡 / C IP冲突 / D 进水，参考解法全部满足验收', () => {
    const c = runReference('wo_cam_quad_diff')
    expect(c.acceptanceMet()).toBe(true)
    expect(c.rootCauseFixed()).toBe(true)
    const res = c.submit()
    expect(res.cleared).toBe(true)
  })
  it('四路各自根因真实不同', () => {
    const wo = WORK_ORDERS.find((w) => w.id === 'wo_cam_quad_diff')!
    const ids = wo.faults.map((f) => f.fault).sort()
    expect(ids).toEqual(['cam_ip_conflict', 'cam_lens_blocked', 'cam_port_loose', 'cam_water'])
  })
})

describe('场景洞察：交换机正常但多摄离线', () => {
  it('主干网线断导致多摄离线时，提示逐根排查网线', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_core_cable')!)
    const insight = c.insight()
    expect(insight).not.toBeNull()
    expect(insight).toContain('网线')
  })
})

describe('一环扣一环：供电主干（市电+UPS）', () => {
  it('市电跳闸且 UPS 电池耗尽 → 交换机/服务器/NVR 全断电', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_power')!)
    expect(c.world.get('sw_core', 'powered')).toBe(false)
    expect(c.world.get('nvr', 'powered')).toBe(false)
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) expect(c.world.get(cam, 'online')).toBe(false)
    expect(c.world.get('nvr', 'recording')).toBe(false)
  })
  it('合电闸后全部复电（UPS 电池仍耗尽，但市电已恢复）', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_power')!)
    c.apply('reset_breaker', 'pw_main')
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) expect(c.world.get(cam, 'online')).toBe(true)
    expect(c.world.get('nvr', 'recording')).toBe(true)
    // 但 UPS 电池根因未除 → 仍判定临时修好
    expect(c.rootCauseFixed()).toBe(false)
  })
})

describe('一环扣一环：空调停机 → 服务器过热', () => {
  it('空调停机导致服务器过热告警；清风扇无效，复位空调才治本', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_ac')!)
    expect(c.world.get('server', 'tempHigh')).toBe(true)
    expect(c.world.get('server', 'alarmActive')).toBe(true)
    // 风扇本就正常，清洁动作不可用（前置不满足）
    expect(c.canApply('clean_fan', 'server').ok).toBe(false)
    c.apply('restart_ac', 'ac1')
    expect(c.world.get('server', 'alarmActive')).toBe(false)
    expect(c.rootCauseFixed()).toBe(true)
  })
})

describe('一环扣一环：网关配置丢失 → 外网 + AP 双掉', () => {
  it('网关配置丢失 → 服务器外网中断且无线 AP 掉', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_router')!)
    expect(c.world.get('server', 'wanUp')).toBe(false)
    expect(c.world.get('ap1', 'apUp')).toBe(false)
    c.apply('reset_router', 'router1')
    expect(c.world.get('server', 'wanUp')).toBe(true)
    expect(c.world.get('ap1', 'apUp')).toBe(true)
  })
})

describe('一环扣一环：交换机断电连带无线 AP', () => {
  it('交换机插头松 → 摄像头与 AP 同时掉；插紧交换机一并恢复', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_switch_ap')!)
    expect(c.world.get('ap1', 'apUp')).toBe(false)
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) expect(c.world.get(cam, 'online')).toBe(false)
    c.apply('replug_cable', 'sw_core')
    expect(c.world.get('ap1', 'apUp')).toBe(true)
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) expect(c.world.get(cam, 'online')).toBe(true)
  })
})

describe('一环扣一环：光纤模块损坏 → 主干断', () => {
  it('光纤模块损坏 → 交换机亮但主干链路断，摄像头与 NVR 全掉', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_fiber')!)
    expect(c.world.get('sw_core', 'powered')).toBe(true)
    expect(c.world.get('cab_trunk', 'linkOk')).toBe(true)
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) expect(c.world.get(cam, 'online')).toBe(false)
    c.apply('replace_fiber', 'fiber1')
    for (const cam of ['cam1', 'cam2', 'cam3', 'cam4']) expect(c.world.get(cam, 'online')).toBe(true)
    expect(c.world.get('nvr', 'recording')).toBe(true)
  })
})

describe('场景洞察：连环故障提示', () => {
  it('多台核心设备同时断电 → 提示查市电/UPS', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_blackout')!)
    const insight = c.insight()
    expect(insight).not.toBeNull()
    expect(insight).toContain('供电')
  })
  it('服务器过热但风扇正常 → 提示查空调', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_ac')!)
    const insight = c.insight()
    expect(insight).not.toBeNull()
    expect(insight).toContain('空调')
  })
  it('服务器本地网通但外网断 → 提示查网关', () => {
    const c = new WorkOrderController(WORK_ORDERS.find((w) => w.id === 'wo_chain_router')!)
    const insight = c.insight()
    expect(insight).not.toBeNull()
    expect(insight).toContain('网关')
  })
})

