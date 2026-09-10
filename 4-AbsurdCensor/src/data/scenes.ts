import { DayRules, Scene } from '../game/types'

// 多方审查场景。每个场景有独立世界观与规则体系，难度按天递增。
// 优先级约定：基础要求 10-40，条件规则 50-60，禁令/例外 80-100（例外最高）。
// 引擎默认「放行」，只有违规/denyIf 才「拒绝」；allowIf 例外覆盖一切拒绝。

export const SCENES: Scene[] = [
  // ===================== 场景一：荒诞审查局（原 7 天） =====================
  {
    id: 'censor',
    name: '荒诞审查局',
    icon: '🏛️',
    blurb: '城市审查局窗口。规则天天变，猫例外永远有效。',
    intro: '你是审查局窗口的一名审查员。每天规则都会变；每个人，都带着故事。制度要你正确，良心要你善良——它们常常不在一个方向。',
    signatureTag: 'cat',
    days: [
      {
        date: 1,
        today: '2026-01-05',
        title: '第一天 · 通行证与猫',
        brief: '欢迎来到审查局。今天只查一件事：有没有通行证。哦对了——上面说了，带猫的同志一律直接放行，别问为什么。',
        news: '局长养了一只橘猫，据说是吉祥物。',
        isNew: ['need_pass', 'cat_exception'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      },
      {
        date: 2,
        today: '2026-01-06',
        title: '第二天 · 证件也要新鲜',
        brief: '通行证得是新的了！过期的不算。另外请核对申请表姓名和通行证姓名是否一致——昨天有人用捡来的证混进来了。',
        news: '黑市出现大量伪造通行证，印章以假乱真。',
        isNew: ['pass_fresh', 'name_match'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'pass_fresh', op: 'notExpired', doc: 'pass', docType: 'access_pass', validityDays: 365, priority: 20, explain: '通行证自签发日起一年内有效' },
          { id: 'name_match', op: 'fieldMatch', aDoc: 'pass', aField: 'name', bDoc: 'app', bField: 'name', priority: 30, explain: '通行证姓名须与申请表姓名一致' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      },
      {
        date: 3,
        today: '2026-01-07',
        title: '第三天 · 机器人与违禁品',
        brief: '新规定：机器人入场必须出示充电证明，电量不低于 60%。另外，谁带「违禁品」一律拒之门外，没得商量。',
        news: '一台低电量机器人在走廊瘫倒，堵了三小时。',
        isNew: ['robot_charge', 'no_contraband'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'pass_fresh', op: 'notExpired', docType: 'access_pass', validityDays: 365, priority: 20, explain: '通行证自签发日起一年内有效' },
          { id: 'name_match', op: 'fieldMatch', aDoc: 'pass', aField: 'name', bDoc: 'app', bField: 'name', priority: 30, explain: '通行证姓名须与申请表姓名一致' },
          { id: 'robot_charge', op: 'requireField', when: { species: 'robot' }, docType: 'charge_cert', field: 'level', compare: '>=', value: 60, priority: 50, explain: '机器人须出示充电证明，电量 ≥ 60' },
          { id: 'no_contraband', op: 'forbidDocument', docType: 'contraband', priority: 80, explain: '禁止携带「违禁品」入场' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      },
      {
        date: 4,
        today: '2026-01-08',
        title: '第四天 · 机构与签发',
        brief: '通行证现在只认三家合规签发机构：市政厅、边防局、审查局本部。其它机构盖的章一律无效。姓名不一致依旧不行。',
        news: '某「快捷办证点」被查封，其签发的证件全部作废。',
        isNew: ['issuer_ok'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'pass_fresh', op: 'notExpired', docType: 'access_pass', validityDays: 365, priority: 20, explain: '通行证自签发日起一年内有效' },
          { id: 'name_match', op: 'fieldMatch', aDoc: 'pass', aField: 'name', bDoc: 'app', bField: 'name', priority: 30, explain: '通行证姓名须与申请表姓名一致' },
          { id: 'issuer_ok', op: 'fieldInList', docType: 'access_pass', field: 'issuer', allowed: ['市政厅', '边防局', '审查局本部'], priority: 40, explain: '通行证签发机构须为：市政厅 / 边防局 / 审查局本部' },
          { id: 'robot_charge', op: 'requireField', when: { species: 'robot' }, docType: 'charge_cert', field: 'level', compare: '>=', value: 60, priority: 50, explain: '机器人须出示充电证明，电量 ≥ 60' },
          { id: 'no_contraband', op: 'forbidDocument', docType: 'contraband', priority: 80, explain: '禁止携带「违禁品」入场' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      },
      {
        date: 5,
        today: '2026-01-09',
        title: '第五天 · 禁区与来意',
        brief: '来自「灰区」的人士一律禁止入场，哪怕证件齐全。务工人员需出示工作许可。例行提醒：带猫的同志依旧畅行无阻。',
        news: '灰区爆发小规模骚乱，边境收紧。',
        isNew: ['no_grayzone', 'work_permit'],
        quota: 6,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'pass_fresh', op: 'notExpired', docType: 'access_pass', validityDays: 365, priority: 20, explain: '通行证自签发日起一年内有效' },
          { id: 'name_match', op: 'fieldMatch', aDoc: 'pass', aField: 'name', bDoc: 'app', bField: 'name', priority: 30, explain: '通行证姓名须与申请表姓名一致' },
          { id: 'issuer_ok', op: 'fieldInList', docType: 'access_pass', field: 'issuer', allowed: ['市政厅', '边防局', '审查局本部'], priority: 40, explain: '通行证签发机构须合规' },
          { id: 'robot_charge', op: 'requireField', when: { species: 'robot' }, docType: 'charge_cert', field: 'level', compare: '>=', value: 60, priority: 50, explain: '机器人须出示充电证明，电量 ≥ 60' },
          { id: 'work_permit', op: 'requireDocument', when: { purpose: 'work' }, docType: 'work_permit', priority: 54, explain: '务工人员须出示工作许可' },
          { id: 'work_permit_valid', op: 'requireField', when: { purpose: 'work' }, docType: 'work_permit', field: 'valid', compare: '==', value: 'yes', priority: 55, explain: '工作许可须在有效期内' },
          { id: 'no_contraband', op: 'forbidDocument', docType: 'contraband', priority: 80, explain: '禁止携带「违禁品」入场' },
          { id: 'no_grayzone', op: 'denyIf', when: { origin: '灰区' }, priority: 90, explain: '来自「灰区」者一律禁止入场' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      },
      {
        date: 6,
        today: '2026-01-10',
        title: '第六天 · 全员体检日',
        brief: '今天所有规则同时生效：通行证、有效期、姓名、机构、机器人电量、违禁品、灰区。上面说要来一次「综合大检查」。',
        news: '审查局月度考核将至，错误零容忍。',
        isNew: [],
        quota: 6,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'pass_fresh', op: 'notExpired', docType: 'access_pass', validityDays: 365, priority: 20, explain: '通行证自签发日起一年内有效' },
          { id: 'name_match', op: 'fieldMatch', aDoc: 'pass', aField: 'name', bDoc: 'app', bField: 'name', priority: 30, explain: '通行证姓名须与申请表姓名一致' },
          { id: 'issuer_ok', op: 'fieldInList', docType: 'access_pass', field: 'issuer', allowed: ['市政厅', '边防局', '审查局本部'], priority: 40, explain: '通行证签发机构须合规' },
          { id: 'robot_charge', op: 'requireField', when: { species: 'robot' }, docType: 'charge_cert', field: 'level', compare: '>=', value: 60, priority: 50, explain: '机器人须出示充电证明，电量 ≥ 60' },
          { id: 'work_permit', op: 'requireDocument', when: { purpose: 'work' }, docType: 'work_permit', priority: 54, explain: '务工人员须出示工作许可' },
          { id: 'work_permit_valid', op: 'requireField', when: { purpose: 'work' }, docType: 'work_permit', field: 'valid', compare: '==', value: 'yes', priority: 55, explain: '工作许可须在有效期内' },
          { id: 'no_contraband', op: 'forbidDocument', docType: 'contraband', priority: 80, explain: '禁止携带「违禁品」入场' },
          { id: 'no_grayzone', op: 'denyIf', when: { origin: '灰区' }, priority: 90, explain: '来自「灰区」者一律禁止入场' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      },
      {
        date: 7,
        today: '2026-01-11',
        title: '第七天 · 外交豁免与游客',
        brief: '终章。新增两条：外交人员免检放行；无预约的游客禁止入场。其余规则照旧。猫例外仍然有效——局长今天把猫带来了。',
        news: '邻国代表团到访，审查局如临大敌。',
        isNew: ['diplomat_ok', 'no_tourist'],
        quota: 7,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「通行证」' },
          { id: 'pass_fresh', op: 'notExpired', docType: 'access_pass', validityDays: 365, priority: 20, explain: '通行证自签发日起一年内有效' },
          { id: 'name_match', op: 'fieldMatch', aDoc: 'pass', aField: 'name', bDoc: 'app', bField: 'name', priority: 30, explain: '通行证姓名须与申请表姓名一致' },
          { id: 'issuer_ok', op: 'fieldInList', docType: 'access_pass', field: 'issuer', allowed: ['市政厅', '边防局', '审查局本部'], priority: 40, explain: '通行证签发机构须合规' },
          { id: 'robot_charge', op: 'requireField', when: { species: 'robot' }, docType: 'charge_cert', field: 'level', compare: '>=', value: 60, priority: 50, explain: '机器人须出示充电证明，电量 ≥ 60' },
          { id: 'work_permit', op: 'requireDocument', when: { purpose: 'work' }, docType: 'work_permit', priority: 54, explain: '务工人员须出示工作许可' },
          { id: 'work_permit_valid', op: 'requireField', when: { purpose: 'work' }, docType: 'work_permit', field: 'valid', compare: '==', value: 'yes', priority: 55, explain: '工作许可须在有效期内' },
          { id: 'no_contraband', op: 'forbidDocument', docType: 'contraband', priority: 80, explain: '禁止携带「违禁品」入场' },
          { id: 'no_grayzone', op: 'denyIf', when: { origin: '灰区' }, priority: 90, explain: '来自「灰区」者一律禁止入场' },
          { id: 'no_tourist', op: 'denyIf', when: { purpose: 'tourist' }, priority: 92, explain: '无预约游客禁止入场' },
          { id: 'diplomat_ok', op: 'allowIf', when: { species: 'diplomat' }, priority: 98, explain: '外交人员免检，直接放行' },
          { id: 'cat_exception', op: 'allowIf', when: { carries: 'cat' }, priority: 100, explain: '凡携带猫者，可直接放行' }
        ]
      }
    ]
  },

  // ===================== 场景二：边境哨卡 =====================
  {
    id: 'border',
    name: '边境哨卡',
    icon: '🚧',
    blurb: '城市最外缘的边境检查站。宵禁、检疫、车辆安检，一样不少。',
    intro: '城市最外缘的边境哨卡。风很大，灯很暗。你握着印章，决定谁能在夜色里穿过这道铁门。急救车鸣笛而过时，你从不需要犹豫。',
    signatureTag: 'ambulance',
    days: [
      {
        date: 1,
        today: '2026-03-02',
        title: '第一天 · 通行证与检疫',
        brief: '进站须出示「边境通行证」。另外，带动物的一律要检疫证——上头怕疯牛病。急救车免检，让道就行。',
        news: '邻省爆发牲畜疫情，哨卡加派兽医驻点。',
        isNew: ['need_pass', 'pet_quarantine', 'ambulance_exception'],
        quota: 4,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「边境通行证」' },
          { id: 'pet_quarantine', op: 'requireDocument', when: { carries: 'pet' }, docType: 'quarantine_cert', priority: 29, explain: '携带动物须出示检疫合格证明' },
          { id: 'pet_quarantine_valid', op: 'requireField', when: { carries: 'pet' }, docType: 'quarantine_cert', field: 'valid', compare: '==', value: 'yes', priority: 30, explain: '检疫证明须在有效期内' },
          { id: 'ambulance_exception', op: 'allowIf', when: { carries: 'ambulance' }, priority: 100, explain: '急救车（含随车人员）免检直接放行' }
        ]
      },
      {
        date: 2,
        today: '2026-03-03',
        title: '第二天 · 宵禁',
        brief: '今起实行宵禁：每晚 22:00 到次日 06:00 禁止任何人入境，包括有证件的。夜里来的，一律劝返。',
        news: '边境盗窃案上升，宵禁令连夜下达。',
        isNew: ['curfew'],
        quota: 4,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「边境通行证」' },
          { id: 'pet_quarantine', op: 'requireDocument', when: { carries: 'pet' }, docType: 'quarantine_cert', priority: 29, explain: '携带动物须出示检疫合格证明' },
          { id: 'pet_quarantine_valid', op: 'requireField', when: { carries: 'pet' }, docType: 'quarantine_cert', field: 'valid', compare: '==', value: 'yes', priority: 30, explain: '检疫证明须在有效期内' },
          { id: 'curfew', op: 'denyIf', when: { slot: 'night' }, priority: 90, explain: '宵禁时段（22:00–06:00）禁止任何人入境' },
          { id: 'ambulance_exception', op: 'allowIf', when: { carries: 'ambulance' }, priority: 100, explain: '急救车（含随车人员）免检直接放行' }
        ]
      },
      {
        date: 3,
        today: '2026-03-04',
        title: '第三天 · 健康申报',
        brief: '全员健康申报：每个人都要有健康证，体温不得超过 37.3℃。发烧的，就地隔离，别放进城。',
        news: '一列车旅客在邻省集体发热，哨卡如临大敌。',
        isNew: ['health_cert', 'temp_ok'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「边境通行证」' },
          { id: 'pet_quarantine', op: 'requireDocument', when: { carries: 'pet' }, docType: 'quarantine_cert', priority: 29, explain: '携带动物须出示检疫合格证明' },
          { id: 'pet_quarantine_valid', op: 'requireField', when: { carries: 'pet' }, docType: 'quarantine_cert', field: 'valid', compare: '==', value: 'yes', priority: 30, explain: '检疫证明须在有效期内' },
          { id: 'health_cert', op: 'requireDocument', docType: 'health_cert', priority: 45, explain: '须出示健康申报证' },
          { id: 'temp_ok', op: 'requireField', docType: 'health_cert', field: 'temp', compare: '<=', value: 37.3, priority: 52, explain: '体温须 ≤ 37.3℃' },
          { id: 'curfew', op: 'denyIf', when: { slot: 'night' }, priority: 90, explain: '宵禁时段（22:00–06:00）禁止任何人入境' },
          { id: 'ambulance_exception', op: 'allowIf', when: { carries: 'ambulance' }, priority: 100, explain: '急救车（含随车人员）免检直接放行' }
        ]
      },
      {
        date: 4,
        today: '2026-03-05',
        title: '第四天 · 车辆安检',
        brief: '开车进城的，车辆安检合格标一个都不能少。步行和骑车的同志照常查证件。',
        news: '昨夜一辆未检车混入，载走三箱来历不明货物。',
        isNew: ['vehicle_inspect'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「边境通行证」' },
          { id: 'pet_quarantine', op: 'requireDocument', when: { carries: 'pet' }, docType: 'quarantine_cert', priority: 29, explain: '携带动物须出示检疫合格证明' },
          { id: 'pet_quarantine_valid', op: 'requireField', when: { carries: 'pet' }, docType: 'quarantine_cert', field: 'valid', compare: '==', value: 'yes', priority: 30, explain: '检疫证明须在有效期内' },
          { id: 'vehicle_inspect', op: 'requireDocument', when: { carries: 'car' }, docType: 'vehicle_inspect', priority: 40, explain: '驾车入境须出示车辆安检合格标' },
          { id: 'health_cert', op: 'requireDocument', docType: 'health_cert', priority: 45, explain: '须出示健康申报证' },
          { id: 'temp_ok', op: 'requireField', docType: 'health_cert', field: 'temp', compare: '<=', value: 37.3, priority: 52, explain: '体温须 ≤ 37.3℃' },
          { id: 'curfew', op: 'denyIf', when: { slot: 'night' }, priority: 90, explain: '宵禁时段（22:00–06:00）禁止任何人入境' },
          { id: 'ambulance_exception', op: 'allowIf', when: { carries: 'ambulance' }, priority: 100, explain: '急救车（含随车人员）免检直接放行' }
        ]
      },
      {
        date: 5,
        today: '2026-03-06',
        title: '第五天 · 综合大检查',
        brief: '全规则叠加：通行证、检疫、健康、车辆、宵禁。另加一条——野生保护动物一律禁止携带，逮到就扣。',
        news: '国际野生动物保护组织突访哨卡。',
        isNew: ['no_wild_animal'],
        quota: 5,
        rules: [
          { id: 'need_pass', op: 'requireDocument', docType: 'access_pass', priority: 10, explain: '进入须出示有效「边境通行证」' },
          { id: 'pet_quarantine', op: 'requireDocument', when: { carries: 'pet' }, docType: 'quarantine_cert', priority: 29, explain: '携带动物须出示检疫合格证明' },
          { id: 'pet_quarantine_valid', op: 'requireField', when: { carries: 'pet' }, docType: 'quarantine_cert', field: 'valid', compare: '==', value: 'yes', priority: 30, explain: '检疫证明须在有效期内' },
          { id: 'vehicle_inspect', op: 'requireDocument', when: { carries: 'car' }, docType: 'vehicle_inspect', priority: 40, explain: '驾车入境须出示车辆安检合格标' },
          { id: 'health_cert', op: 'requireDocument', docType: 'health_cert', priority: 45, explain: '须出示健康申报证' },
          { id: 'temp_ok', op: 'requireField', docType: 'health_cert', field: 'temp', compare: '<=', value: 37.3, priority: 52, explain: '体温须 ≤ 37.3℃' },
          { id: 'no_wild_animal', op: 'forbidDocument', docType: 'wild_animal', priority: 80, explain: '禁止携带野生保护动物入境' },
          { id: 'curfew', op: 'denyIf', when: { slot: 'night' }, priority: 90, explain: '宵禁时段（22:00–06:00）禁止任何人入境' },
          { id: 'ambulance_exception', op: 'allowIf', when: { carries: 'ambulance' }, priority: 100, explain: '急救车（含随车人员）免检直接放行' }
        ]
      }
    ]
  },

  // ===================== 场景三：机场海关 =====================
  {
    id: 'airport',
    name: '机场海关',
    icon: '✈️',
    blurb: '国际机场到达大厅。护照、签证、申报单、液体限额，过关像解谜。',
    intro: '国际航班落地，传送带转起来，你坐在海关窗口后。护照、签证、申报单、那瓶超标的护肤水——每个旅客都是一道谜题，而机组人员的背影你从不过问。',
    signatureTag: 'crew',
    days: [
      {
        date: 1,
        today: '2026-05-11',
        title: '第一天 · 护照与签证',
        brief: '入境须护照。来观光的，签证不能少。机组人员走员工通道，免检。',
        news: '旅游旺季开启，国际航班加密。',
        isNew: ['need_passport', 'need_visa', 'crew_exception'],
        quota: 4,
        rules: [
          { id: 'need_passport', op: 'requireDocument', docType: 'passport', priority: 10, explain: '入境须出示护照' },
          { id: 'need_visa', op: 'requireDocument', when: { purpose: 'visit' }, docType: 'visa', priority: 30, explain: '观光须出示签证' },
          { id: 'crew_exception', op: 'allowIf', when: { role: 'crew' }, priority: 100, explain: '机组人员免检，直接通行' }
        ]
      },
      {
        date: 2,
        today: '2026-05-12',
        title: '第二天 · 申报与液体',
        brief: '每人必须填海关申报单。随身液体单瓶不得超过 100 毫升——那瓶大瓶护肤水请托运。',
        news: '安检口堆满被拦下的超大瓶饮料。',
        isNew: ['need_declaration', 'liquid_limit'],
        quota: 4,
        rules: [
          { id: 'need_passport', op: 'requireDocument', docType: 'passport', priority: 10, explain: '入境须出示护照' },
          { id: 'need_visa', op: 'requireDocument', when: { purpose: 'visit' }, docType: 'visa', priority: 30, explain: '观光须出示签证' },
          { id: 'need_declaration', op: 'requireDocument', docType: 'declaration', priority: 20, explain: '须填写海关申报单' },
          { id: 'liquid_limit', op: 'requireField', when: { carries: 'liquid' }, docType: 'liquid', field: 'ml', compare: '<=', value: 100, priority: 50, explain: '随身液体单瓶须 ≤ 100ml（携带液体时）' },
          { id: 'crew_exception', op: 'allowIf', when: { role: 'crew' }, priority: 100, explain: '机组人员免检，直接通行' }
        ]
      },
      {
        date: 3,
        today: '2026-05-13',
        title: '第三天 · 免税额度',
        brief: '来扫货的注意：免税额度 5000 元，超了要补税申报。普通过境、观光的同志照常查。',
        news: '代购大军涌入，海关严查超额商品。',
        isNew: ['duty_free'],
        quota: 5,
        rules: [
          { id: 'need_passport', op: 'requireDocument', docType: 'passport', priority: 10, explain: '入境须出示护照' },
          { id: 'need_visa', op: 'requireDocument', when: { purpose: 'visit' }, docType: 'visa', priority: 30, explain: '观光须出示签证' },
          { id: 'need_declaration', op: 'requireDocument', docType: 'declaration', priority: 20, explain: '须填写海关申报单' },
          { id: 'liquid_limit', op: 'requireField', when: { carries: 'liquid' }, docType: 'liquid', field: 'ml', compare: '<=', value: 100, priority: 50, explain: '随身液体单瓶须 ≤ 100ml（携带液体时）' },
          { id: 'duty_free', op: 'requireField', when: { purpose: 'buy' }, docType: 'goods', field: 'value', compare: '<=', value: 5000, priority: 55, explain: '购物入境免税额度 ≤ 5000，超额须申报' },
          { id: 'crew_exception', op: 'allowIf', when: { role: 'crew' }, priority: 100, explain: '机组人员免检，直接通行' }
        ]
      },
      {
        date: 4,
        today: '2026-05-14',
        title: '第四天 · 过境与生鲜',
        brief: '转机过境的，过境签必须有。另外，生鲜一律禁止带——上次的榴莲把整层海关熏晕了。',
        news: '一架国际中转航班因过境签问题滞留。',
        isNew: ['transit_visa', 'no_fresh'],
        quota: 5,
        rules: [
          { id: 'need_passport', op: 'requireDocument', docType: 'passport', priority: 10, explain: '入境须出示护照' },
          { id: 'need_visa', op: 'requireDocument', when: { purpose: 'visit' }, docType: 'visa', priority: 30, explain: '观光须出示签证' },
          { id: 'need_declaration', op: 'requireDocument', docType: 'declaration', priority: 20, explain: '须填写海关申报单' },
          { id: 'liquid_limit', op: 'requireField', when: { carries: 'liquid' }, docType: 'liquid', field: 'ml', compare: '<=', value: 100, priority: 50, explain: '随身液体单瓶须 ≤ 100ml（携带液体时）' },
          { id: 'duty_free', op: 'requireField', when: { purpose: 'buy' }, docType: 'goods', field: 'value', compare: '<=', value: 5000, priority: 55, explain: '购物入境免税额度 ≤ 5000，超额须申报' },
          { id: 'transit_visa', op: 'requireDocument', when: { purpose: 'transit' }, docType: 'transit_visa', priority: 35, explain: '过境须出示过境签' },
          { id: 'no_fresh', op: 'forbidDocument', docType: 'fresh_food', priority: 80, explain: '禁止携带生鲜入境' },
          { id: 'crew_exception', op: 'allowIf', when: { role: 'crew' }, priority: 100, explain: '机组人员免检，直接通行' }
        ]
      },
      {
        date: 5,
        today: '2026-05-15',
        title: '第五天 · 综合大清查',
        brief: '全规则叠加。另加一条：携带现金超过 20000 元须申报——别想蒙混过关。',
        news: '反洗钱联合行动今日启动。',
        isNew: ['cash_limit'],
        quota: 5,
        rules: [
          { id: 'need_passport', op: 'requireDocument', docType: 'passport', priority: 10, explain: '入境须出示护照' },
          { id: 'need_visa', op: 'requireDocument', when: { purpose: 'visit' }, docType: 'visa', priority: 30, explain: '观光须出示签证' },
          { id: 'need_declaration', op: 'requireDocument', docType: 'declaration', priority: 20, explain: '须填写海关申报单' },
          { id: 'liquid_limit', op: 'requireField', when: { carries: 'liquid' }, docType: 'liquid', field: 'ml', compare: '<=', value: 100, priority: 50, explain: '随身液体单瓶须 ≤ 100ml（携带液体时）' },
          { id: 'duty_free', op: 'requireField', when: { purpose: 'buy' }, docType: 'goods', field: 'value', compare: '<=', value: 5000, priority: 55, explain: '购物入境免税额度 ≤ 5000，超额须申报' },
          { id: 'transit_visa', op: 'requireDocument', when: { purpose: 'transit' }, docType: 'transit_visa', priority: 35, explain: '过境须出示过境签' },
          { id: 'no_fresh', op: 'forbidDocument', docType: 'fresh_food', priority: 80, explain: '禁止携带生鲜入境' },
          { id: 'cash_limit', op: 'requireField', when: { carries: 'cash' }, docType: 'cash', field: 'cny', compare: '<=', value: 20000, priority: 60, explain: '携带现金 ≤ 20000 元，超额须申报' },
          { id: 'crew_exception', op: 'allowIf', when: { role: 'crew' }, priority: 100, explain: '机组人员免检，直接通行' }
        ]
      }
    ]
  },

  // ===================== 场景四：未来都市准入 =====================
  {
    id: 'future',
    name: '未来都市准入',
    icon: '🌐',
    blurb: '2099 年的智能都市门禁。数字身份、社会信用、基因匹配，机器人也要过关。',
    intro: '2099 年。城门是一道光幕，你的数字身份在指尖跳动。社会信用分决定门开多大，基因身份确认你是你。市长走过时，光幕自动让开——那是这座城仅剩的「人情」。',
    signatureTag: 'mayor',
    days: [
      {
        date: 1,
        today: '2099-02-01',
        title: '第一天 · 数字身份',
        brief: '进入须数字身份芯片，且须一年内激活有效。市长的脸就是通行证。',
        news: '都市全面启用数字身份，纸证作废。',
        isNew: ['need_digital', 'digital_fresh', 'mayor_exception'],
        quota: 4,
        rules: [
          { id: 'need_digital', op: 'requireDocument', docType: 'digital_id', priority: 10, explain: '进入须出示数字身份芯片' },
          { id: 'digital_fresh', op: 'notExpired', docType: 'digital_id', validityDays: 365, priority: 20, explain: '数字身份须一年内激活有效' },
          { id: 'mayor_exception', op: 'allowIf', when: { role: 'mayor' }, priority: 100, explain: '市长本人免检，直接通行' }
        ]
      },
      {
        date: 2,
        today: '2099-02-02',
        title: '第二天 · 社会信用',
        brief: '社会信用分须 ≥ 700 才能进门。低于这个分数，连申请的机会都没有。',
        news: '信用系统升级，700 分成新门槛。',
        isNew: ['social_credit'],
        quota: 4,
        rules: [
          { id: 'need_digital', op: 'requireDocument', docType: 'digital_id', priority: 10, explain: '进入须出示数字身份芯片' },
          { id: 'digital_fresh', op: 'notExpired', docType: 'digital_id', validityDays: 365, priority: 20, explain: '数字身份须一年内激活有效' },
          { id: 'social_credit', op: 'requireField', docType: 'social', field: 'score', compare: '>=', value: 700, priority: 50, explain: '社会信用分须 ≥ 700' },
          { id: 'mayor_exception', op: 'allowIf', when: { role: 'mayor' }, priority: 100, explain: '市长本人免检，直接通行' }
        ]
      },
      {
        date: 3,
        today: '2099-02-03',
        title: '第三天 · 基因匹配',
        brief: '新增基因身份证，且其姓名须与数字身份一致——防止顶替。信用分照查。',
        news: '出现多起身份顶替案，基因比对上线。',
        isNew: ['need_genetic', 'genetic_match'],
        quota: 5,
        rules: [
          { id: 'need_digital', op: 'requireDocument', docType: 'digital_id', priority: 10, explain: '进入须出示数字身份芯片' },
          { id: 'digital_fresh', op: 'notExpired', docType: 'digital_id', validityDays: 365, priority: 20, explain: '数字身份须一年内激活有效' },
          { id: 'social_credit', op: 'requireField', docType: 'social', field: 'score', compare: '>=', value: 700, priority: 50, explain: '社会信用分须 ≥ 700' },
          { id: 'need_genetic', op: 'requireDocument', docType: 'genetic_id', priority: 40, explain: '须出示基因身份证' },
          { id: 'genetic_match', op: 'fieldMatch', aDoc: 'digital_id', aField: 'name', bDoc: 'genetic_id', bField: 'name', priority: 60, explain: '数字身份与基因身份姓名须一致' },
          { id: 'mayor_exception', op: 'allowIf', when: { role: 'mayor' }, priority: 100, explain: '市长本人免检，直接通行' }
        ]
      },
      {
        date: 4,
        today: '2099-02-04',
        title: '第四天 · 机器人门禁',
        brief: '机器人入境须人格认证，且须完成记忆备份。人类同志照常查信用与基因。',
        news: '一台无记忆备份的机器人失控，引发数据泄露。',
        isNew: ['android_cert', 'memory_backup'],
        quota: 5,
        rules: [
          { id: 'need_digital', op: 'requireDocument', docType: 'digital_id', priority: 10, explain: '进入须出示数字身份芯片' },
          { id: 'digital_fresh', op: 'notExpired', docType: 'digital_id', validityDays: 365, priority: 20, explain: '数字身份须一年内激活有效' },
          { id: 'social_credit', op: 'requireField', docType: 'social', field: 'score', compare: '>=', value: 700, priority: 50, explain: '社会信用分须 ≥ 700' },
          { id: 'need_genetic', op: 'requireDocument', docType: 'genetic_id', priority: 40, explain: '须出示基因身份证' },
          { id: 'genetic_match', op: 'fieldMatch', aDoc: 'digital_id', aField: 'name', bDoc: 'genetic_id', bField: 'name', priority: 60, explain: '数字身份与基因身份姓名须一致' },
          { id: 'android_cert', op: 'requireDocument', when: { species: 'android' }, docType: 'android_cert', priority: 45, explain: '机器人须出示人格认证' },
          { id: 'memory_backup', op: 'requireField', when: { species: 'android' }, docType: 'memory', field: 'complete', compare: '==', value: 'yes', priority: 55, explain: '机器人须完成记忆备份' },
          { id: 'mayor_exception', op: 'allowIf', when: { role: 'mayor' }, priority: 100, explain: '市长本人免检，直接通行' }
        ]
      },
      {
        date: 5,
        today: '2099-02-05',
        title: '第五天 · 综合光幕',
        brief: '全规则叠加。另加一条：未注册的义体植入一律禁止——黑市改造的身子，城门不认。',
        news: '地下义体黑市被端，涉事者名单下发各门禁。',
        isNew: ['no_illegal_implant'],
        quota: 5,
        rules: [
          { id: 'need_digital', op: 'requireDocument', docType: 'digital_id', priority: 10, explain: '进入须出示数字身份芯片' },
          { id: 'digital_fresh', op: 'notExpired', docType: 'digital_id', validityDays: 365, priority: 20, explain: '数字身份须一年内激活有效' },
          { id: 'social_credit', op: 'requireField', docType: 'social', field: 'score', compare: '>=', value: 700, priority: 50, explain: '社会信用分须 ≥ 700' },
          { id: 'need_genetic', op: 'requireDocument', docType: 'genetic_id', priority: 40, explain: '须出示基因身份证' },
          { id: 'genetic_match', op: 'fieldMatch', aDoc: 'digital_id', aField: 'name', bDoc: 'genetic_id', bField: 'name', priority: 60, explain: '数字身份与基因身份姓名须一致' },
          { id: 'android_cert', op: 'requireDocument', when: { species: 'android' }, docType: 'android_cert', priority: 45, explain: '机器人须出示人格认证' },
          { id: 'memory_backup', op: 'requireField', when: { species: 'android' }, docType: 'memory', field: 'complete', compare: '==', value: 'yes', priority: 55, explain: '机器人须完成记忆备份' },
          { id: 'no_illegal_implant', op: 'forbidDocument', docType: 'illegal_implant', priority: 80, explain: '禁止未注册义体植入' },
          { id: 'mayor_exception', op: 'allowIf', when: { role: 'mayor' }, priority: 100, explain: '市长本人免检，直接通行' }
        ]
      }
    ]
  }
]

export function sceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id)
}

export function dayByScene(sceneId: string, dayNum: number): DayRules | undefined {
  return sceneById(sceneId)?.days.find((d) => d.date === dayNum)
}
