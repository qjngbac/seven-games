// 游戏状态机与进度（设计文档 §4）。不承担推理算法（§6.3）。
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type {
  CaseDef,
  Claim,
  ClaimVerdict,
  FactId,
  EvidenceId,
  CharacterId,
  TopicId,
  DialogueResponse
} from './case-model/types'
import { CASES, caseById, nextCaseId } from './data/cases'
import { TruthGraph } from './case-model/truth-graph'
import { selectResponse } from './dialogue/response-selector'
import { topicsWithState } from './dialogue/topic-engine'
import { validateClaim } from './case-model/claim-validator'
import { EvidenceBoard, type BoardState } from './evidence/board'
import type { InvestigationContext } from './case-model/conditions'

export type Screen = 'case_select' | 'briefing' | 'investigation' | 'dialogue' | 'board' | 'accusation' | 'result'

const SAVE_KEY = 'whobrokeprod.save.v1'
const SAVE_TMP = 'whobrokeprod.save.v1.tmp'
const SAVE_VERSION = 1

export interface Settings {
  fontSize: number // px，基础字号
  colorblind: boolean
  noShake: boolean
  sound: boolean
}

export interface TranscriptLine {
  who: string // 角色名或 "证据" / "系统"
  text: string
  kind: 'say' | 'evidence' | 'present' | 'system'
}

interface SaveData {
  version: number
  reputation: number
  settings: Settings
  solvedCases: string[]
  verdicts: Record<string, ClaimVerdict['outcome']>
  currentCaseId: string | null
  screen: Screen
  progress: {
    actionsUsed: number
    discoveredFacts: FactId[]
    examinedEvidence: EvidenceId[]
    presentedEvidence: Record<CharacterId, EvidenceId[]>
    askedTopics: Record<CharacterId, TopicId[]>
    trust: Record<CharacterId, number>
    board: BoardState
    dialogueChar: CharacterId | null
    accusation: Claim
    transcript: TranscriptLine[]
  } | null
}

export const useGame = defineStore('game', () => {
  // ---- 全局 / 跨案 ----
  const screen = ref<Screen>('case_select')
  const reputation = ref(0)
  const settings = reactive<Settings>({ fontSize: 16, colorblind: false, noShake: false, sound: true })
  const solvedCases = ref<string[]>([])
  const verdicts = reactive<Record<string, ClaimVerdict['outcome']>>({})

  // ---- 当前案件进度 ----
  const currentCaseId = ref<string | null>(null)
  const actionsUsed = ref(0)
  const discoveredFacts = ref<FactId[]>([])
  const examinedEvidence = ref<EvidenceId[]>([])
  const presentedEvidence = reactive<Record<CharacterId, EvidenceId[]>>({})
  const askedTopics = reactive<Record<CharacterId, TopicId[]>>({})
  const trust = reactive<Record<CharacterId, number>>({})
  const board = reactive(new EvidenceBoard())
  const dialogueChar = ref<CharacterId | null>(null)
  const lastResponse = ref<DialogueResponse | null>(null)
  const accusation = reactive<Claim>({ actors: [], action: '', time: '', motive: '', evidence: [], facts: [] })
  const verdict = ref<ClaimVerdict | null>(null)
  const transcript = ref<TranscriptLine[]>([])
  const lastError = ref<string | null>(null)

  // ---- 派生 ----
  const currentCase = computed<CaseDef | undefined>(() => (currentCaseId.value ? caseById(currentCaseId.value) : undefined))
  const tg = computed(() => (currentCase.value ? new TruthGraph(currentCase.value) : null))
  const maxActions = computed(() => currentCase.value?.maxActions ?? 12)
  const actionsLeft = computed(() => Math.max(0, maxActions.value - actionsUsed.value))

  const ctx = computed<InvestigationContext>(() => ({
    discoveredFacts: discoveredFacts.value,
    presentedEvidence: presentedEvidence as InvestigationContext['presentedEvidence'],
    askedTopics: askedTopics as InvestigationContext['askedTopics'],
    trust: trust as InvestigationContext['trust']
  }))

  // ---- 内部工具 ----
  function discover(fact: FactId) {
    if (!discoveredFacts.value.includes(fact)) {
      discoveredFacts.value.push(fact)
      const label = currentCase.value?.factLabels?.[fact] ?? fact
      board.addFactNode(fact, label)
    }
  }
  function discoverMany(facts: FactId[]) {
    for (const f of facts) if (f) discover(f)
  }
  function pushTranscript(line: TranscriptLine) {
    transcript.value.push(line)
  }
  function setError(msg: string | null) {
    lastError.value = msg
  }

  // ---- 案件流程 ----
  function resetProgress() {
    actionsUsed.value = 0
    discoveredFacts.value = []
    examinedEvidence.value = []
    for (const k of Object.keys(presentedEvidence)) delete presentedEvidence[k]
    for (const k of Object.keys(askedTopics)) delete askedTopics[k]
    for (const k of Object.keys(trust)) delete trust[k]
    board.loadState({ nodes: [], links: [], notes: '' })
    dialogueChar.value = null
    lastResponse.value = null
    accusation.actors = []
    accusation.action = ''
    accusation.time = ''
    accusation.motive = ''
    accusation.evidence = []
    accusation.facts = []
    verdict.value = null
    transcript.value = []
    setError(null)
  }

  function selectCase(id: string) {
    const c = caseById(id)
    if (!c) return
    currentCaseId.value = id
    resetProgress()
    screen.value = 'briefing'
    save()
  }

  function beginInvestigation() {
    screen.value = 'investigation'
    save()
  }

  function examineEvidence(evId: EvidenceId): boolean {
    const c = currentCase.value
    if (!c) return false
    const ev = c.evidence.find((e) => e.id === evId)
    if (!ev) return false
    const firstTime = !examinedEvidence.value.includes(evId)
    if (firstTime) {
      examinedEvidence.value.push(evId)
      discoverMany(ev.facts)
      board.addEvidenceNode(evId, ev.name)
      pushTranscript({ who: '证据', text: `${ev.name}：${ev.desc}`, kind: 'evidence' })
    }
    return firstTime
  }

  function openDialogue(char: CharacterId) {
    if (!currentCase.value?.characters.some((x) => x.id === char)) return
    dialogueChar.value = char
    lastResponse.value = null
    screen.value = 'dialogue'
  }

  function topicsFor(char: CharacterId) {
    if (!currentCase.value) return []
    return topicsWithState(currentCase.value, char, ctx.value)
  }

  /** 当前对话角色在某话题下的可用回答（用于预览/重问）。 */
  function currentResponseFor(char: CharacterId, topicId: TopicId): DialogueResponse | null {
    const c = currentCase.value
    if (!c) return null
    const topic = c.topics[char]?.find((t) => t.id === topicId)
    if (!topic) return null
    return selectResponse(topic, char, ctx.value)
  }

  function askTopic(char: CharacterId, topicId: TopicId): DialogueResponse | null {
    const c = currentCase.value
    if (!c) return null
    const topic = c.topics[char]?.find((t) => t.id === topicId)
    if (!topic) {
      setError('话题不存在')
      return null
    }
    // 解锁检查
    const st = topicsWithState(c, char, ctx.value).find((s) => s.topic.id === topicId)
    if (st && !st.unlocked) {
      setError('该话题尚未解锁')
      return null
    }
    if (actionsLeft.value <= 0) {
      setError('提问次数已用尽，请直接推理并指控')
      return null
    }
    // 记录已问
    if (!askedTopics[char]) askedTopics[char] = []
    if (!askedTopics[char].includes(topicId)) askedTopics[char].push(topicId)
    actionsUsed.value += 1

    const res = selectResponse(topic, char, ctx.value)
    lastResponse.value = res
    pushTranscript({ who: '你', text: topic.ask, kind: 'say' })
    discoverMany(res.facts)
    // 解锁话题无需显式操作（条件随 discoveredFacts/presentedEvidence 自动满足）
    if (res.revealsEvidence) for (const ev of res.revealsEvidence) examineEvidence(ev)
    pushTranscript({ who: c.characters.find((x) => x.id === char)?.name ?? char, text: res.text, kind: 'say' })
    save()
    return res
  }

  function presentEvidenceInDialogue(char: CharacterId, evId: EvidenceId) {
    const c = currentCase.value
    if (!c) return
    if (!presentedEvidence[char]) presentedEvidence[char] = []
    if (!presentedEvidence[char].includes(evId)) presentedEvidence[char].push(evId)
    examineEvidence(evId)
    const ev = c.evidence.find((e) => e.id === evId)
    pushTranscript({
      who: '系统',
      text: `你向${c.characters.find((x) => x.id === char)?.name ?? char}出示了证据：${ev?.name ?? evId}`,
      kind: 'present'
    })
    save()
  }

  function openBoard() {
    screen.value = 'board'
  }

  // ---- 推理板操作 ----
  function linkNodes(a: string, b: string, kind: 'support' | 'contradiction') {
    board.link(a, b, kind)
  }
  function unlinkNodes(a: string, b: string) {
    board.unlink(a, b)
  }
  function setNotes(n: string) {
    board.notes = n
  }
  function suggestContradictions() {
    if (!currentCase.value) return []
    return board.suggestContradictions(currentCase.value, discoveredFacts.value)
  }
  function validContradictions() {
    if (!currentCase.value) return []
    return board.validContradictions(currentCase.value)
  }

  // ---- 指控 ----
  function openAccusation() {
    screen.value = 'accusation'
  }

  function setAccusationField<K extends keyof Claim>(key: K, value: Claim[K]) {
    accusation[key] = value
  }
  function toggleAccusationEvidence(evId: EvidenceId) {
    const i = accusation.evidence.indexOf(evId)
    if (i >= 0) accusation.evidence.splice(i, 1)
    else accusation.evidence.push(evId)
  }
  function toggleAccusationActor(char: CharacterId) {
    const i = accusation.actors.indexOf(char)
    if (i >= 0) accusation.actors.splice(i, 1)
    else accusation.actors.push(char)
  }

  function submitAccusation(): ClaimVerdict | null {
    const c = currentCase.value
    if (!c) return null
    // 把玩家当前的已知事实作为指控事实集合传入（用于 requiredFacts 校验）
    const claim: Claim = { ...accusation, facts: discoveredFacts.value.slice() }
    const v = validateClaim(c, claim, discoveredFacts.value)
    verdict.value = v
    // 声誉影响
    if (v.outcome === 'success') reputation.value += 10
    else if (v.outcome === 'partial') reputation.value += 3
    else reputation.value -= 5
    if (v.outcome !== 'fail' && !solvedCases.value.includes(c.id)) {
      solvedCases.value.push(c.id)
    }
    verdicts[c.id] = v.outcome
    screen.value = 'result'
    save()
    return v
  }

  function retryCase() {
    const id = currentCaseId.value
    if (id) selectCase(id)
  }
  function nextCase() {
    const id = currentCaseId.value
    if (!id) return
    const n = nextCaseId(id)
    if (n) selectCase(n)
    else screen.value = 'case_select'
  }
  function toCaseSelect() {
    screen.value = 'case_select'
    save()
  }

  // ---- 存档（事务式：先写临时键再覆盖主键）----
  function buildSave(): SaveData {
    return {
      version: SAVE_VERSION,
      reputation: reputation.value,
      settings: { ...settings },
      solvedCases: solvedCases.value.slice(),
      verdicts: { ...verdicts },
      currentCaseId: currentCaseId.value,
      screen: screen.value,
      progress:
        currentCase.value && screen.value !== 'case_select'
          ? {
              actionsUsed: actionsUsed.value,
              discoveredFacts: discoveredFacts.value.slice(),
              examinedEvidence: examinedEvidence.value.slice(),
              presentedEvidence: { ...presentedEvidence },
              askedTopics: { ...askedTopics },
              trust: { ...trust },
              board: board.toState(),
              dialogueChar: dialogueChar.value,
              accusation: { ...accusation },
              transcript: transcript.value.slice()
            }
          : null
    }
  }

  function save() {
    try {
      const data = JSON.stringify(buildSave())
      localStorage.setItem(SAVE_TMP, data)
      localStorage.setItem(SAVE_KEY, localStorage.getItem(SAVE_TMP) as string)
      localStorage.removeItem(SAVE_TMP)
    } catch (e) {
      // 存储不可用（隐私模式等）：仅记录，不阻断游戏
      console.warn('[save] 写入失败', e)
    }
  }

  function load(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return false
      const data = JSON.parse(raw) as SaveData
      if (data.version !== SAVE_VERSION) return false
      reputation.value = data.reputation ?? 0
      Object.assign(settings, data.settings ?? {})
      solvedCases.value = data.solvedCases ?? []
      Object.assign(verdicts, data.verdicts ?? {})
      currentCaseId.value = data.currentCaseId ?? null
      if (data.progress && currentCaseId.value) {
        const p = data.progress
        actionsUsed.value = p.actionsUsed
        discoveredFacts.value = p.discoveredFacts.slice()
        examinedEvidence.value = p.examinedEvidence.slice()
        Object.assign(presentedEvidence, p.presentedEvidence)
        Object.assign(askedTopics, p.askedTopics)
        Object.assign(trust, p.trust)
        board.loadState(p.board)
        dialogueChar.value = p.dialogueChar
        Object.assign(accusation, p.accusation)
        transcript.value = p.transcript.slice()
        // verdict 不入档，结算页刷新后无法恢复，回落到指控页（指控内容已保存在 progress 中）
        screen.value =
          p.board && data.screen === 'dialogue'
            ? 'investigation'
            : data.screen === 'result'
              ? 'accusation'
              : data.screen
      } else {
        screen.value = 'case_select'
      }
      return true
    } catch (e) {
      console.warn('[load] 读取失败，忽略存档', e)
      return false
    }
  }

  function newGame() {
    try {
      localStorage.removeItem(SAVE_KEY)
      localStorage.removeItem(SAVE_TMP)
    } catch {
      /* ignore */
    }
    reputation.value = 0
    solvedCases.value = []
    for (const k of Object.keys(verdicts)) delete verdicts[k]
    currentCaseId.value = null
    resetProgress()
    screen.value = 'case_select'
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY)
      localStorage.removeItem(SAVE_TMP)
    } catch {
      /* ignore */
    }
  }

  function applySettings(patch: Partial<Settings>) {
    Object.assign(settings, patch)
    save()
  }

  return {
    // state
    screen,
    reputation,
    settings,
    solvedCases,
    verdicts,
    currentCaseId,
    actionsUsed,
    discoveredFacts,
    examinedEvidence,
    presentedEvidence,
    askedTopics,
    trust,
    dialogueChar,
    lastResponse,
    accusation,
    verdict,
    transcript,
    lastError,
    board,
    // derived
    currentCase,
    tg,
    maxActions,
    actionsLeft,
    ctx,
    // actions
    selectCase,
    beginInvestigation,
    examineEvidence,
    openDialogue,
    topicsFor,
    currentResponseFor,
    askTopic,
    presentEvidenceInDialogue,
    openBoard,
    linkNodes,
    unlinkNodes,
    setNotes,
    suggestContradictions,
    validContradictions,
    openAccusation,
    setAccusationField,
    toggleAccusationEvidence,
    toggleAccusationActor,
    submitAccusation,
    retryCase,
    nextCase,
    toCaseSelect,
    save,
    load,
    newGame,
    clearSave,
    applySettings,
    resetProgress,
    setError
  }
})

export { CASES }
