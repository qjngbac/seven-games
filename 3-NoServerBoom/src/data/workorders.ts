import { WorkOrder } from '../game/types'

// 工单库：难度从“单一故障+清晰线索”渐增到“并发故障+错误客户描述+多机综合+一环扣一环连环故障”。
// 每单含根因、证据动作、修复动作、可选高危错误操作、验收条件、搞笑反馈与参考解法路径。
// 校验：参考路径执行后必须满足 acceptance，且不违反约束（可解性由测试保证）。

export const WORK_ORDERS: WorkOrder[] = [
  // ===== 第一章：单故障、清晰线索（含新机器入门） =====
  {
    id: 'wo_cam1_loose',
    title: 'A 摄像头没了画面',
    chapter: 1,
    scene: '小办公室',
    customer: 'A 摄像头黑屏了，是不是彻底坏了？急！',
    customerAccurate: true,
    constraints: { timeBudget: 30 },
    devices: ['sw_core', 'cam1'],
    faults: [{ fault: 'cam_port_loose', target: 'cam1' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'restart_camera', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam1', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '你对着黑屏比了个耶。客户以为修好了。',
    referencePath: [
      { action: 'inspect_link', target: 'cam1' },
      { action: 'test_cable', target: 'cam1' },
      { action: 'replug_cable', target: 'cam1' }
    ],
    customerMessages: [{ atTime: 12, text: '师傅还在吗？A 点看不见人影啊！' }],
    tutorial: '先看指示灯判断链路，再用测线仪找松动的接头，最后插紧即可。别一上来就恢复出厂。'
  },
  {
    id: 'wo_four_cam',
    title: '四路摄像头同时离线',
    chapter: 1,
    scene: '小办公室',
    customer: '四个摄像头全黑了！是不是被黑客攻击了？！',
    customerAccurate: true,
    constraints: { timeBudget: 35, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4'],
    faults: [{ fault: 'switch_plug_loose' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'restart_camera', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam1', comp: 'videoAvailable', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true }
    ],
    funnyFeedback: '客户连夜给摄像头贴了符，说防黑客。',
    referencePath: [
      { action: 'inspect_link', target: 'sw_core' },
      { action: 'test_cable', target: 'sw_core' },
      { action: 'replug_cable', target: 'sw_core' }
    ],
    customerMessages: [
      { atTime: 10, text: '报警公司说我全盲了，快点啊！' },
      { atTime: 25, text: '不会真要挨个重设摄像头吧？那太崩溃了。' }
    ]
  },
  {
    id: 'wo_pc_blackscreen',
    title: '台式机黑屏开不了机',
    chapter: 1,
    scene: '办公位',
    customer: '电脑按了没反应，显示器也不亮，急用！',
    customerAccurate: true,
    constraints: { timeBudget: 30 },
    devices: ['pc1'],
    faults: [{ fault: 'pc_ram_loose', target: 'pc1' }],
    availableActions: ['check_pc', 'pc_reseat_plug', 'pc_reseat_ram', 'pc_swap_monitor', 'pc_reboot', 'pc_clear_disk'],
    acceptance: [{ device: 'pc1', comp: 'usable', equals: true }],
    funnyFeedback: '你重插内存时掉出一颗螺丝，客户说那是他上周丢的。',
    referencePath: [
      { action: 'check_pc', target: 'pc1' },
      { action: 'pc_reseat_ram', target: 'pc1' }
    ],
    customerMessages: [{ atTime: 10, text: '会不会是显示器坏了？要不要直接换台新的？' }],
    tutorial: '先看电脑状态：供电/显示/系统/网络。内存松动会让系统起不来，重插内存条即可。'
  },
  {
    id: 'wo_sdoor_dirty',
    title: '感应门不自动开',
    chapter: 1,
    scene: '门厅',
    customer: '人走过去门不开，得手动推，太丢人了。',
    customerAccurate: true,
    constraints: { timeBudget: 30 },
    devices: ['sdoor1'],
    faults: [{ fault: 'sd_sensor_dirty' }],
    availableActions: ['check_sdoor', 'sd_clean_sensor', 'sd_align_sensor', 'sd_reset_controller', 'sd_lube'],
    acceptance: [{ device: 'sdoor1', comp: 'openOk', equals: true }],
    funnyFeedback: '你擦完传感器，门“唰”地开了，把客户吓一跳。',
    referencePath: [
      { action: 'check_sdoor', target: 'sdoor1' },
      { action: 'sd_clean_sensor', target: 'sdoor1' }
    ],
    customerMessages: [{ atTime: 8, text: '是不是门坏了？直接换新门贵不贵？' }],
    tutorial: '看感应门状态：传感器脏/错位、控制器死、门体卡阻都会失灵。先清洁传感器试试。'
  },
  // ===== 第二章：多设备、网线、服务器网络 =====
  {
    id: 'wo_server_alarm',
    title: '服务器狂叫',
    chapter: 2,
    scene: '机房',
    customer: '服务器一直嗡嗡报警，吵死了，帮我弄静就行！',
    customerAccurate: false,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['server'],
    faults: [{ fault: 'server_overheat' }],
    availableActions: ['inspect_power', 'inspect_thermal', 'inspect_link', 'clean_fan', 'mute_alarm', 'restart_service', 'reset_nic'],
    acceptance: [{ device: 'server', comp: 'alarmActive', equals: false }],
    funnyFeedback: '你把告警静音了，服务器感动得继续发烧。',
    referencePath: [
      { action: 'inspect_thermal', target: 'server' },
      { action: 'clean_fan', target: 'server' }
    ],
    customerMessages: [{ atTime: 8, text: '静音就行，别动别的，我赶时间。' }]
  },
  {
    id: 'wo_nvr_disk',
    title: '录像停了',
    chapter: 2,
    scene: '机房',
    customer: '回放找不到最近录像，NVR 灯红了。',
    customerAccurate: true,
    constraints: { timeBudget: 30 },
    devices: ['nvr'],
    faults: [{ fault: 'nvr_disk_full' }],
    availableActions: ['inspect_power', 'clear_disk', 'delete_recordings', 'factory_reset'],
    acceptance: [{ device: 'nvr', comp: 'recording', equals: true }],
    funnyFeedback: '你格式化了盘，客户三年前的“重要”录像没了，他其实只想要昨天的。',
    referencePath: [{ action: 'clear_disk', target: 'nvr' }],
    customerMessages: [{ atTime: 15, text: '实在不行把盘格了也行，反正旧的不看。' }]
  },
  {
    id: 'wo_printer_jam',
    title: '打印机罢工',
    chapter: 2,
    scene: '办公区',
    customer: '打印机卡纸了，财务急着打报表！',
    customerAccurate: true,
    constraints: { timeBudget: 25, noFactoryReset: true },
    devices: ['printer'],
    faults: [{ fault: 'printer_jam' }],
    availableActions: ['inspect_power', 'inspect_link', 'clear_paper_jam'],
    acceptance: [{ device: 'printer', comp: 'printingOk', equals: true }],
    funnyFeedback: '你掏出半张被卡住的报表，上面写着“机密”。',
    referencePath: [
      { action: 'inspect_link', target: 'printer' },
      { action: 'clear_paper_jam', target: 'printer' }
    ]
  },
  {
    id: 'wo_cam_cable',
    title: 'A 摄像头网线断了',
    chapter: 2,
    scene: '小办公室',
    customer: 'A 摄像头又黑了，这次好像不是接头松，是线有问题。',
    customerAccurate: true,
    constraints: { timeBudget: 35, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cab_cam1'],
    faults: [{ fault: 'cab_cut', target: 'cab_cam1' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'cab_replug', 'cab_swap', 'restart_camera', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam1', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '你换完线，发现旧线是被椅子轮子碾断的。',
    referencePath: [
      { action: 'test_cable', target: 'cab_cam1' },
      { action: 'cab_swap', target: 'cab_cam1' }
    ],
    customerMessages: [{ atTime: 12, text: '别又让我重设摄像头啊，上回折腾半天。' }],
    tutorial: '用测线仪查网线：断裂要整根换，接头松只需重插两端。'
  },
  {
    id: 'wo_core_cable',
    title: '主干网线被剪',
    chapter: 2,
    scene: '机房',
    customer: '四个摄像头又黑了！是不是交换机插头又松了？',
    customerAccurate: false,
    constraints: { timeBudget: 40, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'cab_trunk'],
    faults: [{ fault: 'cab_trunk_cut' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'cab_replug', 'cab_swap', 'restart_camera', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true }
    ],
    funnyFeedback: '你换好主干线，客户还在对着交换机念叨“插头松了吧”。',
    referencePath: [
      { action: 'inspect_link', target: 'sw_core' },
      { action: 'test_cable', target: 'cab_trunk' },
      { action: 'cab_swap', target: 'cab_trunk' }
    ],
    customerMessages: [
      { atTime: 10, text: '肯定又是交换机松了，老毛病！' },
      { atTime: 28, text: '不会要我逐台重设吧？' }
    ]
  },
  {
    id: 'wo_server_net',
    title: '服务器断网了',
    chapter: 2,
    scene: '机房',
    customer: '业务系统上不去了，Ping 不通服务器，是不是网线松了？',
    customerAccurate: true,
    constraints: { timeBudget: 30 },
    devices: ['server'],
    faults: [{ fault: 'server_net_down' }],
    availableActions: ['inspect_power', 'inspect_thermal', 'inspect_link', 'clean_fan', 'mute_alarm', 'restart_service', 'reset_nic'],
    acceptance: [{ device: 'server', comp: 'netUp', equals: true }],
    funnyFeedback: '你复位网卡，网络通了，服务器长舒一口气。',
    referencePath: [
      { action: 'inspect_link', target: 'server' },
      { action: 'reset_nic', target: 'server' }
    ],
    customerMessages: [{ atTime: 10, text: '先别重启服务，万一是网络的事呢？' }]
  },
  // ===== 第三章：错误客户描述、并发、摄像头差异化、蓝屏 =====
  {
    id: 'wo_door',
    title: '门禁打不开',
    chapter: 3,
    scene: '门厅',
    customer: '这门彻底坏了，干脆砸开吧！',
    customerAccurate: false,
    constraints: { timeBudget: 30 },
    devices: ['door1'],
    faults: [{ fault: 'door_lock_jam' }],
    availableActions: ['inspect_power', 'reopen_door', 'force_break'],
    acceptance: [{ device: 'door1', comp: 'openOk', equals: true }],
    funnyFeedback: '你真砸了门。物业看着你，默默记下了工号。',
    referencePath: [
      { action: 'inspect_power', target: 'door1' },
      { action: 'reopen_door', target: 'door1' }
    ],
    customerMessages: [{ atTime: 5, text: '别修那破锁了，直接撬！' }]
  },
  {
    id: 'wo_cam_config',
    title: 'B 摄像头画面花了',
    chapter: 3,
    scene: '小办公室',
    customer: 'B 摄像头离线了，重连一下就行吧？',
    customerAccurate: false,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['sw_core', 'cam2'],
    faults: [{ fault: 'cam_lens_blocked', target: 'cam2' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'restart_camera', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam2', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '你给摄像头恢复出厂，结果它 Online 了但画面还是被一只袜子挡着。',
    referencePath: [
      { action: 'inspect_link', target: 'cam2' },
      { action: 'clean_lens', target: 'cam2' }
    ],
    customerMessages: [{ atTime: 10, text: '肯定离线了，我老经验了。' }]
  },
  {
    id: 'wo_server_double',
    title: '服务器双重故障',
    chapter: 3,
    scene: '机房',
    customer: '服务器又报警又提示服务不可用，我忙疯了。',
    customerAccurate: true,
    constraints: { timeBudget: 40, noFactoryReset: true },
    devices: ['server'],
    faults: [{ fault: 'server_overheat' }, { fault: 'server_service_down' }],
    availableActions: ['inspect_power', 'inspect_thermal', 'inspect_link', 'clean_fan', 'mute_alarm', 'restart_service', 'reset_nic'],
    acceptance: [
      { device: 'server', comp: 'alarmActive', equals: false },
      { device: 'server', comp: 'serviceRunning', equals: true }
    ],
    funnyFeedback: '你清了灰又拉起服务，服务器终于安静得像在装睡。',
    referencePath: [
      { action: 'inspect_thermal', target: 'server' },
      { action: 'clean_fan', target: 'server' },
      { action: 'restart_service', target: 'server' }
    ]
  },
  {
    id: 'wo_cam_ip',
    title: 'C 摄像头不录像',
    chapter: 3,
    scene: '小办公室',
    customer: 'C 摄像头在线但回放找不到录像，重启一下？',
    customerAccurate: false,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['sw_core', 'cam3'],
    faults: [{ fault: 'cam_ip_conflict', target: 'cam3' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'restart_camera', 'fix_ip', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam3', comp: 'recording', equals: true }
    ],
    funnyFeedback: '你续了 IP，录像回来了；客户却说“我就知道重启管用”。',
    referencePath: [
      { action: 'check_cam', target: 'cam3' },
      { action: 'fix_ip', target: 'cam3' }
    ],
    customerMessages: [{ atTime: 10, text: '重启肯定好，别整那些花的。' }],
    tutorial: '在线却不录像，多半是 IP 冲突而非离线。看状态里的“IP冲突”，释放续租即可。'
  },
  {
    id: 'wo_pc_bsod',
    title: '台式机蓝屏',
    chapter: 3,
    scene: '办公位',
    customer: '电脑蓝屏了，重启有用吗？',
    customerAccurate: true,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['pc1'],
    faults: [{ fault: 'pc_bsod', target: 'pc1' }],
    availableActions: ['check_pc', 'pc_reseat_plug', 'pc_reseat_ram', 'pc_swap_monitor', 'pc_reboot', 'pc_clear_disk'],
    acceptance: [{ device: 'pc1', comp: 'usable', equals: true }],
    funnyFeedback: '重启后蓝屏没了，桌面上还留着半杯没洒的咖啡。',
    referencePath: [
      { action: 'check_pc', target: 'pc1' },
      { action: 'pc_reboot', target: 'pc1' }
    ],
    customerMessages: [{ atTime: 8, text: '重启能好就别修，我赶报告。' }]
  },
  {
    id: 'wo_cam_focus',
    title: 'D 摄像头画面模糊',
    chapter: 3,
    scene: '小办公室',
    customer: 'D 摄像头在线但画面糊得像打了马赛克。',
    customerAccurate: true,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['sw_core', 'cam4'],
    faults: [{ fault: 'cam_focus_lost', target: 'cam4' }],
    availableActions: ['inspect_power', 'inspect_link', 'test_cable', 'check_cam', 'replug_cable', 'restart_camera', 'refocus', 'clean_lens', 'factory_reset'],
    acceptance: [
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'cam4', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '你一拧对焦环，画面清晰了，客户说“原来它没瞎”。',
    referencePath: [
      { action: 'check_cam', target: 'cam4' },
      { action: 'refocus', target: 'cam4' }
    ],
    customerMessages: [{ atTime: 10, text: '是不是镜头脏了？擦擦呗。' }],
    tutorial: '在线但画面异常，可能是失焦（而非遮挡）。看清状态再动手。'
  },
  // ===== 第四章：荒诞并发、四路差异化、感应门双重 =====
  {
    id: 'wo_absurd_cat',
    title: '猫把光纤啃了',
    chapter: 4,
    scene: '荒诞机房',
    customer: '监控全黑，机房里还有猫叫！',
    customerAccurate: true,
    constraints: { timeBudget: 40, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4'],
    faults: [
      { fault: 'switch_plug_loose' },
      { fault: 'cam_lens_blocked', target: 'cam3' }
    ],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'restart_camera',
      'clean_lens',
      'factory_reset'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam3', comp: 'videoAvailable', equals: true },
      { device: 'cam4', comp: 'online', equals: true }
    ],
    funnyFeedback: '你把猫请出机房，它回头叼走了你的螺丝刀。',
    referencePath: [
      { action: 'replug_cable', target: 'sw_core' },
      { action: 'clean_lens', target: 'cam3' }
    ],
    customerMessages: [{ atTime: 12, text: '猫是我养的，别伤它啊！' }]
  },
  {
    id: 'wo_cam_quad_diff',
    title: '四路各怀鬼胎',
    chapter: 4,
    scene: '机房',
    customer: '四路摄像头毛病都不一样：A 没画面、B 被挡、C 不录像、D 进水，救救我！',
    customerAccurate: true,
    constraints: { timeBudget: 52, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'cab_cam1', 'cab_cam2', 'cab_cam3', 'cab_cam4'],
    faults: [
      { fault: 'cam_port_loose', target: 'cam1' },
      { fault: 'cam_lens_blocked', target: 'cam2' },
      { fault: 'cam_ip_conflict', target: 'cam3' },
      { fault: 'cam_water', target: 'cam4' }
    ],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'restart_camera',
      'clean_lens',
      'fix_ip',
      'refocus',
      'dry_camera',
      'replace_adapter',
      'replace_ir',
      'factory_reset'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam1', comp: 'videoAvailable', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam2', comp: 'videoAvailable', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam3', comp: 'videoAvailable', equals: true },
      { device: 'cam3', comp: 'recording', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'cam4', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '你修完四路，发现 D 摄像头里还漂着半片叶子。',
    referencePath: [
      { action: 'test_cable', target: 'cam1' },
      { action: 'replug_cable', target: 'cam1' },
      { action: 'clean_lens', target: 'cam2' },
      { action: 'fix_ip', target: 'cam3' },
      { action: 'dry_camera', target: 'cam4' }
    ],
    customerMessages: [
      { atTime: 15, text: 'A 肯定是线松了！' },
      { atTime: 35, text: 'C 是不是该重启？' }
    ],
    tutorial: '四路根因各不相同：A 网口松、B 镜头挡、C IP 冲突、D 进水。逐个诊断、对症下药，别一刀切恢复出厂。'
  },
  {
    id: 'wo_sdoor_double',
    title: '感应门双重失灵',
    chapter: 4,
    scene: '门厅',
    customer: '感应门有时开有时不开，摸不着头脑。',
    customerAccurate: true,
    constraints: { timeBudget: 35, noFactoryReset: true },
    devices: ['sdoor1'],
    faults: [{ fault: 'sd_sensor_dirty' }, { fault: 'sd_sensor_misalign' }],
    availableActions: ['check_sdoor', 'sd_clean_sensor', 'sd_align_sensor', 'sd_reset_controller', 'sd_lube'],
    acceptance: [{ device: 'sdoor1', comp: 'openOk', equals: true }],
    funnyFeedback: '你擦又校，门终于老老实实感应了。',
    referencePath: [
      { action: 'check_sdoor', target: 'sdoor1' },
      { action: 'sd_clean_sensor', target: 'sdoor1' },
      { action: 'sd_align_sensor', target: 'sdoor1' }
    ],
    customerMessages: [{ atTime: 10, text: '该不会要换门吧？' }]
  },
  {
    id: 'wo_final',
    title: '全栈崩溃',
    chapter: 4,
    scene: '综合机房',
    customer: '摄像头全黑，录像也停了。今天别把机房炸了！',
    customerAccurate: true,
    constraints: { timeBudget: 44, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'nvr'],
    faults: [{ fault: 'switch_plug_loose' }, { fault: 'nvr_disk_full' }],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'restart_camera',
      'clear_disk',
      'delete_recordings',
      'factory_reset'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'nvr', comp: 'recording', equals: true }
    ],
    funnyFeedback: '你修完全栈，客户给你点了杯奶茶，备注“别炸机房”。',
    referencePath: [
      { action: 'replug_cable', target: 'sw_core' },
      { action: 'clear_disk', target: 'nvr' }
    ],
    customerMessages: [{ atTime: 20, text: '稳住，我们老板在看着监控……可惜监控也黑了。' }]
  },
  // ===== 第五章：综合多机（最难） =====
  {
    id: 'wo_mixed',
    title: '综合故障大乱斗',
    chapter: 5,
    scene: '综合机房',
    customer: '摄像头黑、电脑死、门不感应，三个毛病一起来的，稳住！',
    customerAccurate: true,
    constraints: { timeBudget: 54, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cab_cam1', 'pc1', 'sdoor1'],
    faults: [
      { fault: 'cab_cut', target: 'cab_cam1' },
      { fault: 'pc_ram_loose', target: 'pc1' },
      { fault: 'sd_sensor_dirty' }
    ],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'cab_replug',
      'cab_swap',
      'restart_camera',
      'clean_lens',
      'check_pc',
      'pc_reseat_plug',
      'pc_reseat_ram',
      'pc_swap_monitor',
      'pc_reboot',
      'pc_clear_disk',
      'check_sdoor',
      'sd_clean_sensor',
      'sd_align_sensor',
      'sd_reset_controller',
      'sd_lube'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam1', comp: 'videoAvailable', equals: true },
      { device: 'pc1', comp: 'usable', equals: true },
      { device: 'sdoor1', comp: 'openOk', equals: true }
    ],
    funnyFeedback: '你三件事一次搞定，客户怀疑你有没有分身。',
    referencePath: [
      { action: 'test_cable', target: 'cab_cam1' },
      { action: 'cab_swap', target: 'cab_cam1' },
      { action: 'pc_reseat_ram', target: 'pc1' },
      { action: 'sd_clean_sensor', target: 'sdoor1' }
    ],
    customerMessages: [{ atTime: 20, text: '三样都要修？那我请你吃饭吧。' }],
    tutorial: '跨设备综合题：网线断→换线；内存松→重插；传感器脏→清洁。逐台诊断，别慌。'
  },
  {
    id: 'wo_server_pc',
    title: '机房与工位双线告急',
    chapter: 5,
    scene: '机房+办公区',
    customer: '服务器狂叫，工位电脑又蓝屏，今天活该加班。',
    customerAccurate: true,
    constraints: { timeBudget: 44, noFactoryReset: true },
    devices: ['server', 'pc1'],
    faults: [{ fault: 'server_overheat' }, { fault: 'pc_bsod', target: 'pc1' }],
    availableActions: [
      'inspect_power',
      'inspect_thermal',
      'inspect_link',
      'clean_fan',
      'mute_alarm',
      'restart_service',
      'reset_nic',
      'check_pc',
      'pc_reseat_plug',
      'pc_reseat_ram',
      'pc_swap_monitor',
      'pc_reboot',
      'pc_clear_disk'
    ],
    acceptance: [
      { device: 'server', comp: 'alarmActive', equals: false },
      { device: 'pc1', comp: 'usable', equals: true }
    ],
    funnyFeedback: '你两头跑，服务器安静了，电脑也醒了，自己累趴了。',
    referencePath: [
      { action: 'inspect_thermal', target: 'server' },
      { action: 'clean_fan', target: 'server' },
      { action: 'check_pc', target: 'pc1' },
      { action: 'pc_reboot', target: 'pc1' }
    ],
    customerMessages: [{ atTime: 15, text: '服务器别静音了事啊，根因要除！' }]
  },
  {
    id: 'wo_cam_config',
    title: '被"恢复出厂"的摄像头',
    chapter: 5,
    scene: '收银台+仓库',
    customer: '我就按了一下摄像头后面那个小孔说是能修卡顿，现在 A 摄像头不录像了，B 摄像头也时有时无……',
    customerAccurate: true,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['nvr', 'cam1', 'cam2'],
    faults: [
      { fault: 'cam_config_lost', target: 'cam1' },
      { fault: 'cam_ip_conflict', target: 'cam2' }
    ],
    availableActions: ['inspect_power', 'inspect_link', 'check_cam', 'restart_camera', 'reload_cam_config'],
    acceptance: [
      { device: 'cam1', comp: 'recording', equals: true },
      { device: 'cam2', comp: 'recording', equals: true }
    ],
    funnyFeedback: '你重新下发配置，A 摄像头乖乖继续录像；客户发誓再也不乱按小孔了。',
    referencePath: [
      { action: 'check_cam', target: 'cam1' },
      { action: 'reload_cam_config', target: 'cam1' },
      { action: 'restart_camera', target: 'cam2' }
    ],
    customerMessages: [{ atTime: 12, text: '那个小孔我再按一下能复原吗？——别！' }],
    tutorial: '"恢复出厂"会抹掉摄像头配置：链路正常但永远不录像。用"重新下发配置"找回参数；IP 冲突则重启摄像头刷新。'
  },
  // ===== 第六章：一环扣一环（连环故障） =====
  {
    id: 'wo_chain_ac',
    title: '空调停了服务器发疯',
    chapter: 6,
    scene: '机房',
    customer: '服务器一直报警，风扇我上周刚清过，怎么又热了？要不你再清一遍？',
    customerAccurate: false,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['server', 'ac1'],
    faults: [{ fault: 'ac_off' }],
    availableActions: ['inspect_power', 'inspect_thermal', 'check_ac', 'clean_fan', 'restart_ac', 'mute_alarm', 'restart_service', 'reset_nic'],
    acceptance: [{ device: 'server', comp: 'alarmActive', equals: false }],
    funnyFeedback: '你复位空调，冷风一吹，服务器不叫了，客户愣是没反应过来空调才是真凶。',
    referencePath: [
      { action: 'check_ac', target: 'ac1' },
      { action: 'restart_ac', target: 'ac1' }
    ],
    customerMessages: [{ atTime: 8, text: '清风扇就行，别动别的，我赶时间。' }],
    tutorial: '服务器过热 ≠ 风扇坏。本关空调停机导致升温，清风扇无效——必须复位空调（根因）才能消除告警。'
  },
  {
    id: 'wo_chain_power',
    title: '整层楼跳闸了',
    chapter: 6,
    scene: '综合机房',
    customer: '全楼监控黑了，NVR 也说断电，是不是交换机又松了？',
    customerAccurate: false,
    constraints: { timeBudget: 45, noFactoryReset: true },
    devices: ['pw_main', 'ups1', 'sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'nvr'],
    faults: [{ fault: 'mains_out' }, { fault: 'ups_battery_dead' }],
    availableActions: [
      'inspect_power',
      'check_ups',
      'inspect_link',
      'test_cable',
      'check_cam',
      'reset_breaker',
      'replace_ups_battery',
      'fix_ups',
      'replug_cable',
      'restart_camera',
      'clean_lens',
      'cab_replug',
      'cab_swap'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'nvr', comp: 'recording', equals: true }
    ],
    funnyFeedback: '你合上电闸，监控齐刷刷亮了；客户还念叨交换机松动，殊不知是整层楼跳闸。',
    referencePath: [
      { action: 'check_ups', target: 'ups1' },
      { action: 'reset_breaker', target: 'pw_main' },
      { action: 'replace_ups_battery', target: 'ups1' }
    ],
    customerMessages: [
      { atTime: 10, text: '肯定交换机松了，老毛病！' },
      { atTime: 30, text: 'UPS 灯怎么也红着？' }
    ],
    tutorial: '市电跳闸 + UPS 电池耗尽 → 交换机/服务器/NVR 全部断电（连环）。合电闸恢复供电；换电池解除隐患。别只折腾摄像头。'
  },
  {
    id: 'wo_chain_router',
    title: '网关抽风全网瘫',
    chapter: 6,
    scene: '机房',
    customer: '服务器上不了外网，是不是网卡又坏了？还有 WiFi 也没了，两台毛病？',
    customerAccurate: false,
    constraints: { timeBudget: 30, noFactoryReset: true },
    devices: ['router1', 'server', 'ap1'],
    faults: [{ fault: 'router_cfg_lost' }],
    availableActions: ['inspect_power', 'inspect_link', 'check_router', 'reset_router', 'inspect_thermal', 'clean_fan', 'mute_alarm', 'restart_service', 'reset_nic', 'check_ap', 'repair_ap'],
    acceptance: [
      { device: 'server', comp: 'wanUp', equals: true },
      { device: 'ap1', comp: 'apUp', equals: true }
    ],
    funnyFeedback: '你复位网关，外网和 WiFi 一起回来，客户“哦”了一声。',
    referencePath: [
      { action: 'check_router', target: 'router1' },
      { action: 'reset_router', target: 'router1' }
    ],
    customerMessages: [{ atTime: 8, text: '先复位网卡试试？' }],
    tutorial: '服务器本地网通但外网断，且无线 AP 同掉——根因在网关（配置丢失），并非网卡。复位网卡/重启 AP 都治标。'
  },
  {
    id: 'wo_chain_switch_ap',
    title: '交换机松了连 WiFi 也没',
    chapter: 6,
    scene: '综合机房',
    customer: '监控黑了，WiFi 也连不上，两台毛病一起的？',
    customerAccurate: true,
    constraints: { timeBudget: 35, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'ap1'],
    faults: [{ fault: 'switch_plug_loose' }],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'restart_camera',
      'clean_lens',
      'check_ap',
      'repair_ap',
      'cab_replug',
      'cab_swap'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'ap1', comp: 'apUp', equals: true }
    ],
    funnyFeedback: '你插紧交换机，摄像头和 WiFi 一起复活，客户以为你施了魔法。',
    referencePath: [
      { action: 'inspect_link', target: 'sw_core' },
      { action: 'test_cable', target: 'sw_core' },
      { action: 'replug_cable', target: 'sw_core' }
    ],
    customerMessages: [{ atTime: 10, text: '监控和 WiFi 是不是两套系统啊？' }]
  },
  {
    id: 'wo_chain_fiber',
    title: '光纤被猫啃了',
    chapter: 6,
    scene: '机房',
    customer: '四路监控又黑了！是不是又交换机松？',
    customerAccurate: false,
    constraints: { timeBudget: 40, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'nvr', 'fiber1', 'cab_trunk'],
    faults: [{ fault: 'fiber_cut' }],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'cab_replug',
      'cab_swap',
      'restart_camera',
      'clean_lens',
      'replace_fiber'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'nvr', comp: 'recording', equals: true }
    ],
    funnyFeedback: '你换上光纤模块，客户想起猫最近总在机柜上蹭——原来真凶是猫。',
    referencePath: [
      { action: 'inspect_link', target: 'sw_core' },
      { action: 'inspect_link', target: 'fiber1' },
      { action: 'replace_fiber', target: 'fiber1' }
    ],
    customerMessages: [{ atTime: 12, text: '交换机肯定松了，去插紧啊！' }],
    tutorial: '交换机亮、网线完好，但主干链路仍断——查光纤收发模块。测线仪看不出光纤，用“查看指示灯”点光纤模块即可定位。'
  },
  {
    id: 'wo_chain_ac_server',
    title: '又热又断网',
    chapter: 6,
    scene: '机房',
    customer: '服务器又报警又上不了内网（Ping 不通），今天啥都坏。',
    customerAccurate: true,
    constraints: { timeBudget: 40, noFactoryReset: true },
    devices: ['server', 'ac1'],
    faults: [{ fault: 'ac_off' }, { fault: 'server_net_down' }],
    availableActions: ['inspect_power', 'inspect_thermal', 'check_ac', 'clean_fan', 'restart_ac', 'mute_alarm', 'inspect_link', 'reset_nic', 'restart_service'],
    acceptance: [
      { device: 'server', comp: 'alarmActive', equals: false },
      { device: 'server', comp: 'netUp', equals: true }
    ],
    funnyFeedback: '空调一开网卡一复位，服务器终于安分了。',
    referencePath: [
      { action: 'check_ac', target: 'ac1' },
      { action: 'restart_ac', target: 'ac1' },
      { action: 'inspect_link', target: 'server' },
      { action: 'reset_nic', target: 'server' }
    ],
    customerMessages: [{ atTime: 12, text: '热和断网是两件事吧？' }]
  },
  {
    id: 'wo_chain_blackout',
    title: '全楼断电连环',
    chapter: 6,
    scene: '综合机房',
    customer: '全楼都没电了！监控黑、录像停、服务器叫、还热，这是要炸？',
    customerAccurate: true,
    constraints: { timeBudget: 55, noFactoryReset: true },
    devices: ['pw_main', 'ups1', 'ac1', 'sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'nvr', 'server'],
    faults: [{ fault: 'mains_out' }, { fault: 'ac_off' }, { fault: 'ups_battery_dead' }],
    availableActions: [
      'inspect_power',
      'check_ups',
      'inspect_link',
      'test_cable',
      'check_cam',
      'check_ac',
      'reset_breaker',
      'replace_ups_battery',
      'restart_ac',
      'replug_cable',
      'restart_camera',
      'clean_lens',
      'cab_replug',
      'cab_swap',
      'inspect_thermal',
      'clean_fan',
      'mute_alarm',
      'clear_disk',
      'restart_service',
      'reset_nic'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'nvr', comp: 'recording', equals: true },
      { device: 'server', comp: 'alarmActive', equals: false }
    ],
    funnyFeedback: '你合闸、换电池、开空调，整层楼缓缓苏醒，客户默默把“别炸机房”设成了屏保。',
    referencePath: [
      { action: 'check_ups', target: 'ups1' },
      { action: 'reset_breaker', target: 'pw_main' },
      { action: 'replace_ups_battery', target: 'ups1' },
      { action: 'restart_ac', target: 'ac1' }
    ],
    customerMessages: [{ atTime: 15, text: '先别慌，一步步来！' }],
    tutorial: '连环三因：市电跳闸→全断电、UPS 电池耗尽→无冗余、空调停机→服务器过热。合电闸恢复供电、换电池除隐患、开空调降温度。'
  },
  {
    id: 'wo_chain_master',
    title: '终极连环：机房濒死',
    chapter: 6,
    scene: '综合机房',
    customer: '全完了：监控黑、录像停、服务器又热又上不了外网、WiFi 也没了，还闻到糊味！',
    customerAccurate: true,
    constraints: { timeBudget: 70, noFactoryReset: true },
    devices: ['pw_main', 'ups1', 'ac1', 'router1', 'sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'nvr', 'server', 'ap1', 'fiber1', 'cab_trunk'],
    faults: [
      { fault: 'fiber_cut' },
      { fault: 'mains_out' },
      { fault: 'ups_battery_dead' },
      { fault: 'router_cfg_lost' },
      { fault: 'ac_off' }
    ],
    availableActions: [
      'inspect_power',
      'check_ups',
      'inspect_link',
      'test_cable',
      'check_cam',
      'check_ac',
      'check_router',
      'check_ap',
      'reset_breaker',
      'replace_ups_battery',
      'restart_ac',
      'reset_router',
      'repair_ap',
      'replug_cable',
      'restart_camera',
      'clean_lens',
      'cab_replug',
      'cab_swap',
      'replace_fiber',
      'inspect_thermal',
      'clean_fan',
      'mute_alarm',
      'clear_disk',
      'restart_service',
      'reset_nic'
    ],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam4', comp: 'online', equals: true },
      { device: 'nvr', comp: 'recording', equals: true },
      { device: 'server', comp: 'alarmActive', equals: false },
      { device: 'server', comp: 'wanUp', equals: true },
      { device: 'ap1', comp: 'apUp', equals: true }
    ],
    funnyFeedback: '你把五条链路挨个理顺，机房从濒死回到正常运转。客户决定给你颁个“机房守护神”奖。',
    referencePath: [
      { action: 'replace_fiber', target: 'fiber1' },
      { action: 'reset_breaker', target: 'pw_main' },
      { action: 'replace_ups_battery', target: 'ups1' },
      { action: 'restart_ac', target: 'ac1' },
      { action: 'reset_router', target: 'router1' }
    ],
    customerMessages: [{ atTime: 20, text: '你……还搞得定吧？' }],
    tutorial: '五条根因连环：光纤断→主干断、市电跳闸+UPS 电池耗尽→全断电、空调停机→服务器过热、网关配置丢→外网/WiFi 断。逐一复位对应设备即可。'
  },
  {
    id: 'wo_chain_factory',
    title: '客户"帮了倒忙"',
    chapter: 6,
    scene: '综合机房',
    customer: '监控黑了我就把每个摄像头都恢复出厂、还把交换机拔下来吹了吹灰，结果全黑了，是不是设备坏了？',
    customerAccurate: false,
    constraints: { timeBudget: 45, noFactoryReset: true },
    devices: ['sw_core', 'cam1', 'cam2', 'cam3', 'cam4', 'nvr'],
    faults: [{ fault: 'switch_plug_loose' }, { fault: 'cam_config_lost', target: 'cam1' }],
    availableActions: [
      'inspect_power',
      'inspect_link',
      'test_cable',
      'check_cam',
      'replug_cable',
      'cab_replug',
      'cab_swap',
      'restart_camera',
      'reload_cam_config',
      'clean_lens'
    ],
    acceptance: [
      { device: 'cam1', comp: 'recording', equals: true },
      { device: 'cam2', comp: 'online', equals: true },
      { device: 'nvr', comp: 'recording', equals: true }
    ],
    funnyFeedback: '你插回交换机、重新下发配置，一切复原；客户决定以后动手前先给你打电话。',
    referencePath: [
      { action: 'inspect_link', target: 'sw_core' },
      { action: 'replug_cable', target: 'sw_core' },
      { action: 'check_cam', target: 'cam1' },
      { action: 'reload_cam_config', target: 'cam1' }
    ],
    customerMessages: [
      { atTime: 10, text: '设备是不是该换了？我这就下单。' },
      { atTime: 28, text: '哦对，我还按了摄像头的小孔……要紧吗？' }
    ],
    tutorial: '双重人为事故：交换机被拔松→全楼离线（共因）；恢复出厂→cam1 链路恢复后仍不录像。先复电，再"重新下发配置"。'
  },
  // ===== 第七章：工具箱补齐 =====
  // 说明：以下 11 单用于覆盖此前"定义了故障库但从未被任何工单注入"的死内容，
  // 使每一种故障及其对应的修复动作都真正可玩（由 controller.spec.ts 的防腐蚀测试保证不再回退）。
  {
    id: 'wo_ap_down',
    title: '无线 AP 掉线',
    chapter: 7,
    scene: '办公区',
    customer: 'Wi-Fi 全没了，是不是路由器坏了？你顺便帮我换个路由吧。',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['sw_core', 'ap1'],
    faults: [{ fault: 'ap_off' }],
    availableActions: ['inspect_link', 'inspect_power', 'repair_ap'],
    acceptance: [{ device: 'ap1', comp: 'apUp', equals: true }],
    funnyFeedback: '你没换路由器，只是重启了 AP。客户表示"早知道我也重启一下"。',
    referencePath: [
      { action: 'inspect_link', target: 'ap1' },
      { action: 'repair_ap', target: 'ap1' }
    ],
    tutorial: '交换机正常但 AP 自己不工作 → 先看 AP 的供电与状态灯，再重启 AP，不要误换路由器。'
  },
  {
    id: 'wo_pc_nopower',
    title: '台式机开不了机',
    chapter: 7,
    scene: '财务室',
    customer: '电脑按开机键一点反应都没有，肯定是主板烧了，我这就下单换主板。',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['pc1'],
    faults: [{ fault: 'pc_plug_loose', target: 'pc1' }],
    availableActions: ['inspect_power', 'pc_reseat_plug'],
    acceptance: [{ device: 'pc1', comp: 'usable', equals: true }],
    funnyFeedback: '插头松了。你替主板洗清了罪名，客户把新主板退了。',
    referencePath: [
      { action: 'inspect_power', target: 'pc1' },
      { action: 'pc_reseat_plug', target: 'pc1' }
    ],
    tutorial: '"一点反应都没有"最常见的原因是供电，而不是主板。先查供电，再插紧电源线。'
  },
  {
    id: 'wo_pc_monitor',
    title: '显示器黑屏但主机在转',
    chapter: 7,
    scene: '财务室',
    customer: '屏幕黑的，但主机风扇在转、灯也亮，是不是显卡坏了？',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['pc1'],
    faults: [{ fault: 'pc_monitor_bad', target: 'pc1' }],
    availableActions: ['inspect_power', 'pc_swap_monitor'],
    acceptance: [{ device: 'pc1', comp: 'usable', equals: true }],
    funnyFeedback: '换了显示器就好了。显卡松了一口气。',
    referencePath: [
      { action: 'inspect_power', target: 'pc1' },
      { action: 'pc_swap_monitor', target: 'pc1' }
    ],
    tutorial: '主机供电正常、显示器不亮 → 显示链路问题，换显示器验证。'
  },
  {
    id: 'wo_pc_disk',
    title: '台式机卡在开机画面',
    chapter: 7,
    scene: '财务室',
    customer: '开机一直转圈圈，进不去系统，重要合同都在里面！',
    customerAccurate: true,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['pc1'],
    faults: [{ fault: 'pc_disk_full', target: 'pc1' }],
    availableActions: ['inspect_power', 'pc_clear_disk'],
    acceptance: [{ device: 'pc1', comp: 'usable', equals: true }],
    funnyFeedback: '清了 40G 缓存，系统顺利进入。合同还在，客户发出了灵魂感叹。',
    referencePath: [
      { action: 'inspect_power', target: 'pc1' },
      { action: 'pc_clear_disk', target: 'pc1' }
    ],
    tutorial: '系统盘写满会导致无法启动；清理系统盘即可恢复，无需重装。'
  },
  {
    id: 'wo_server_disk',
    title: '服务器关键服务停摆',
    chapter: 7,
    scene: '机房',
    customer: '业务全挂了！是不是内存又漏了？上次重启一下就好了。',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['server'],
    faults: [{ fault: 'server_disk_full' }],
    availableActions: ['inspect_power', 'restart_service', 'clear_disk'],
    acceptance: [{ device: 'server', comp: 'serviceRunning', equals: true }],
    funnyFeedback: '重启服务没用——磁盘满了。清完日志，服务自己就起来了。',
    referencePath: [
      { action: 'inspect_power', target: 'server' },
      { action: 'clear_disk', target: 'server' }
    ],
    tutorial: '服务停摆不止"内存泄漏"一种原因，磁盘写满同样会让服务起不来；先看清根因再动手。'
  },
  {
    id: 'wo_sdoor_dead',
    title: '感应门纹丝不动',
    chapter: 7,
    scene: '写字楼大堂',
    customer: '门一点反应都没有，推也推不开，是不是停电了？',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['sdoor1'],
    faults: [{ fault: 'sd_controller_dead' }],
    availableActions: ['inspect_power', 'sd_reset_controller'],
    acceptance: [{ device: 'sdoor1', comp: 'openOk', equals: true }],
    funnyFeedback: '控制器死机了，复位后门"叮"地开了。客户尴尬地收回了"停电论"。',
    referencePath: [
      { action: 'inspect_power', target: 'sdoor1' },
      { action: 'sd_reset_controller', target: 'sdoor1' }
    ],
    tutorial: '供电正常但门没反应 → 查控制器是否死机，复位控制器即可。'
  },
  {
    id: 'wo_sdoor_jam',
    title: '感应门卡住推不开',
    chapter: 7,
    scene: '写字楼大堂',
    customer: '感应到了但门只开一条缝，像被什么卡住了。',
    customerAccurate: true,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['sdoor1'],
    faults: [{ fault: 'sd_door_jam' }],
    availableActions: ['inspect_power', 'sd_lube'],
    acceptance: [{ device: 'sdoor1', comp: 'openOk', equals: true }],
    funnyFeedback: '门体导轨干涩卡阻，润滑之后顺畅开合。客户当场给它报了保养。',
    referencePath: [
      { action: 'inspect_power', target: 'sdoor1' },
      { action: 'sd_lube', target: 'sdoor1' }
    ],
    tutorial: '感应正常但门体不动 → 机械卡阻，润滑门体。'
  },
  {
    id: 'wo_cam_night',
    title: '摄像头夜里拍不到人',
    chapter: 7,
    scene: '园区',
    customer: '白天画面好好的，一到晚上就一片黑，是不是被人黑了？',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['sw_core', 'cam2'],
    faults: [{ fault: 'cam_ir_broken', target: 'cam2' }],
    availableActions: ['inspect_link', 'check_cam', 'replace_ir'],
    acceptance: [{ device: 'cam2', comp: 'nightVision', equals: true }],
    funnyFeedback: '红外灯板老化，换上新的夜视灯板，黑夜重新"亮"了。',
    referencePath: [
      { action: 'inspect_link', target: 'cam2' },
      { action: 'check_cam', target: 'cam2' },
      { action: 'replace_ir', target: 'cam2' }
    ],
    tutorial: '在线、白天正常，只有夜视失效 → 定位红外灯板，而不是链路或供电。'
  },
  {
    id: 'wo_cam_adapter',
    title: '摄像头整路断电',
    chapter: 7,
    scene: '园区',
    customer: '这个摄像头彻底不亮了，灯都不闪，肯定得换整机。',
    customerAccurate: false,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['sw_core', 'cam1'],
    faults: [{ fault: 'cam_power_adapter', target: 'cam1' }],
    availableActions: ['inspect_link', 'check_cam', 'replace_adapter'],
    acceptance: [
      { device: 'cam1', comp: 'online', equals: true },
      { device: 'cam1', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '只是电源适配器坏了。换了适配器，摄像头复活，整机订单被取消。',
    referencePath: [
      { action: 'inspect_link', target: 'cam1' },
      { action: 'check_cam', target: 'cam1' },
      { action: 'replace_adapter', target: 'cam1' }
    ],
    tutorial: '摄像头本机断电（灯不亮）而交换机正常 → 先查本机供电/适配器，别急着换整机。'
  },
  {
    id: 'wo_cable_plug',
    title: '一路摄像头掉线：网线接头松',
    chapter: 7,
    scene: '园区',
    customer: 'C 点这个摄像头突然就离线了，其他的都好。',
    customerAccurate: true,
    constraints: { timeBudget: 20, noFactoryReset: true },
    devices: ['sw_core', 'cam3', 'cab_cam3'],
    faults: [{ fault: 'cab_plug_loose', target: 'cab_cam3' }],
    availableActions: ['inspect_link', 'test_cable', 'cab_replug', 'cab_swap'],
    acceptance: [
      { device: 'cam3', comp: 'online', equals: true },
      { device: 'cam3', comp: 'videoAvailable', equals: true }
    ],
    funnyFeedback: '接头松了。你把它插紧，C 点回来了，交换机也终于被排除了嫌疑。',
    referencePath: [
      { action: 'inspect_link', target: 'cam3' },
      { action: 'test_cable', target: 'cab_cam3' },
      { action: 'cab_replug', target: 'cab_cam3' }
    ],
    tutorial: '单路离线、其余正常 → 只查这一路的网线与接头（先测线，再重插两端）。'
  },
  {
    id: 'wo_ups_broken',
    title: '市电跳闸，UPS 也坏了',
    chapter: 7,
    scene: '机房',
    customer: '整层楼都没电了！UPS 应该有电的吧，怎么也全断了？',
    customerAccurate: false,
    constraints: { timeBudget: 25, noFactoryReset: true },
    devices: ['pw_main', 'ups1', 'sw_core', 'server', 'nvr'],
    faults: [{ fault: 'mains_out' }, { fault: 'ups_fault' }],
    availableActions: ['inspect_link', 'check_ups', 'reset_breaker', 'fix_ups'],
    acceptance: [
      { device: 'sw_core', comp: 'powered', equals: true },
      { device: 'nvr', comp: 'recording', equals: true }
    ],
    funnyFeedback: '市电跳闸 + UPS 自身故障，双保险同时失效。你合闸、修 UPS，世界重新通电。',
    referencePath: [
      { action: 'inspect_link', target: 'ups1' },
      { action: 'reset_breaker', target: 'pw_main' },
      { action: 'fix_ups', target: 'ups1' }
    ],
    tutorial: '市电与 UPS 同时失效才叫"双保险全断"。只合闸能临时复电，但 UPS 故障这一根因仍在。'
  }
]

export const WORK_ORDER_BY_ID: Record<string, WorkOrder> = Object.fromEntries(
  WORK_ORDERS.map((w) => [w.id, w])
)
