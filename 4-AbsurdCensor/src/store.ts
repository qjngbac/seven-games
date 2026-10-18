import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { SCENES, sceneById, dayByScene } from './data/scenes'
import { casesForSceneDay, sampleCasesForDay } from './data/cases'
import { DeskController } from './game/desk'
import { evaluate } from './game/rules'
import { ApplicantCase, CaseOutcome, DayResult, Decision, EvalResult, HistoryRecord } from './game/types'
import { Ending, EndingState, mergeDay, resolveEnding, FIRE_PRESSURE } from './game/narrative'
import { sound } from './game/audio'

export type Phase = 'menu' | 'brief' | 'desk' | 'feedback' | 'dayend' | 'ending'

const SAVE_KEY = 'absurd_censor_save_v1'
const HISTORY_KEY = 'absurd_censor_history_v1'

interface CensorSave {
  completedScenes: string[]
  sceneDays: Record<string, number>
  unlockedEndings: string[]
}

function loadCensorSave(): CensorSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { completedScenes: [], sceneDays: {}, unlockedEndings: [] }
}

function persistCensorSave(s: CensorSave) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function loadHistory(): HistoryRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

function persistHistory(records: HistoryRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 300)))
  } catch {
    /* ignore */
  }
}

export const useGame = defineStore('absurd-censor', () => {
  const phase = ref<Phase>('menu')
  const sceneId = ref<string>(SCENES[0].id)
  const dayNumber = ref(1)
  const desk = ref<DeskController | null>(null)
  const lastOutcome = ref<CaseOutcome | null>(null)
  const lastCase = ref<ApplicantCase | null>(null)
  const lastReasons = computed(() => {
    if (!lastCase.value || !currentDay.value) return []
    return evaluate(currentDay.value.rules, lastCase.value, currentDay.value.today).reasons
  })
  const dayResults = ref<DayResult[]>([])
  const ending = ref<Ending | null>(null)
  const fired = ref(false)
  const totalSalary = ref(0)
  const savedProgress = ref<CensorSave>(loadCensorSave())
  const verifiedCountThisCase = ref(0)

  // 跨天叙事累计状态
  const cum = reactive<Omit<EndingState, 'fired'>>({
    accuracy: 1,
    orgPressure: 0,
    conscience: 0,
    catFavors: 0,
    grayzoneHelped: 0,
    diplomatFavors: 0
  })

  const currentScene = computed(() => sceneById(sceneId.value))
  const currentDay = computed(() => dayByScene(sceneId.value, dayNumber.value))
  const currentCase = computed<ApplicantCase | null>(() => desk.value?.current ?? null)
  const currentRules = computed(() => currentDay.value?.rules ?? [])
  const currentEval = computed<EvalResult | null>(() => {
    if (!desk.value || !currentCase.value || !currentDay.value) return null
    return evaluate(currentDay.value.rules, currentCase.value, currentDay.value.today)
  })
  const progress = computed(() => ({
    done: desk.value ? desk.value.index : 0,
    total: desk.value ? desk.value.cases.length : 0
  }))
  const isLastDay = computed(() => !!currentScene.value && dayNumber.value >= currentScene.value.days.length)

  function startGame(scene: string) {
    sceneId.value = scene
    phase.value = 'brief'
    dayNumber.value = 1
    desk.value = null
    lastOutcome.value = null
    dayResults.value = []
    ending.value = null
    fired.value = false
    totalSalary.value = 0
    cum.accuracy = 1
    cum.orgPressure = 0
    cum.conscience = 0
    cum.catFavors = 0
    cum.grayzoneHelped = 0
    cum.diplomatFavors = 0
    verifiedCountThisCase.value = 0
  }

  const history = ref<HistoryRecord[]>(loadHistory())

  function clearHistory() {
    history.value = []
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch {
      /* ignore */
    }
  }

  function clearSceneHistory(targetSceneId: string) {
    history.value = history.value.filter((r) => r.sceneId !== targetSceneId)
    persistHistory(history.value)
  }

  function beginDay() {
    const day = currentDay.value
    if (!day) return
    desk.value = new DeskController(day, sampleCasesForDay(sceneId.value, day.date, day.quota))
    verifiedCountThisCase.value = 0
    phase.value = 'desk'
  }

  function doDecide(d: Decision) {
    if (!desk.value) return
    if (d === 'allow') sound.stampAllow()
    else if (d === 'deny') sound.stampDeny()
    else sound.stampDetain()

    const c = desk.value.current
    lastCase.value = c
    const outcome = desk.value.decide(d)
    lastOutcome.value = outcome

    // 存入审查档案（历史记录）
    if (c) {
      const rec: HistoryRecord = {
        id: `${c.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        sceneId: sceneId.value,
        sceneName: currentScene.value?.name ?? '未知场景',
        dayDate: dayNumber.value,
        today: currentDay.value?.today ?? '',
        applicantName: c.name,
        portrait: c.portrait,
        statement: c.statement,
        arrivalTime: c.arrivalTime ?? (c.person.slot === 'night' ? '23:40' : '14:20'),
        items: c.items || [],
        docCount: c.documents?.length || 0,
        decision: d,
        expected: c.expected,
        legalCorrect: outcome.legalCorrect,
        feedbackTitle: outcome.isCorrectDetain
          ? '🎯 成功查获并暂扣'
          : outcome.isWrongDetain
            ? '⚠️ 滥用职权（错误暂扣）'
            : outcome.isWrongAllow
              ? '❌ 违规错放'
              : outcome.isWrongDeny
                ? (c.expected === 'detain' ? '🚨 错放通缉/伪造分子' : '❌ 误拒守法公民')
                : '✅ 合法裁定',
        truth: c.truth,
        penalty: outcome.penalty
      }
      history.value.unshift(rec)
      if (history.value.length > 300) history.value.pop()
      persistHistory(history.value)
    }

    phase.value = 'feedback'
  }

  function afterFeedback() {
    if (!desk.value) return
    verifiedCountThisCase.value = 0
    if (desk.value.finished) {
      finishDay()
    } else {
      phase.value = 'desk'
    }
  }

  function finishDay() {
    if (!desk.value) return
    const dr = desk.value.dayResult()
    dayResults.value.push(dr)
    totalSalary.value += dr.net
    const next = mergeDay(
      { accuracy: cum.accuracy, orgPressure: cum.orgPressure, conscience: cum.conscience, catFavors: cum.catFavors, grayzoneHelped: cum.grayzoneHelped, diplomatFavors: cum.diplomatFavors },
      dr
    )
    cum.accuracy = next.accuracy
    cum.orgPressure = next.orgPressure
    cum.conscience = next.conscience
    cum.catFavors = next.catFavors
    cum.grayzoneHelped = next.grayzoneHelped
    cum.diplomatFavors = next.diplomatFavors
    if (cum.orgPressure >= FIRE_PRESSURE) fired.value = true

    // 更新场景天数进度
    savedProgress.value.sceneDays[sceneId.value] = Math.max(
      savedProgress.value.sceneDays[sceneId.value] ?? 1,
      dayNumber.value
    )
    persistCensorSave(savedProgress.value)

    if (isLastDay.value || fired.value) {
      computeEnding()
    } else {
      phase.value = 'dayend'
    }
  }

  function nextDay() {
    dayNumber.value++
    phase.value = 'brief'
  }

  function computeEnding() {
    ending.value = resolveEnding({
      accuracy: cum.accuracy,
      orgPressure: cum.orgPressure,
      conscience: cum.conscience,
      catFavors: cum.catFavors,
      grayzoneHelped: cum.grayzoneHelped,
      diplomatFavors: cum.diplomatFavors,
      fired: fired.value
    })

    if (fired.value) {
      sound.fired()
    } else {
      sound.win()
      if (!savedProgress.value.completedScenes.includes(sceneId.value)) {
        savedProgress.value.completedScenes.push(sceneId.value)
      }
    }
    if (ending.value && !savedProgress.value.unlockedEndings.includes(ending.value.kind)) {
      savedProgress.value.unlockedEndings.push(ending.value.kind)
    }
    persistCensorSave(savedProgress.value)
    phase.value = 'ending'
  }

  function toMenu() {
    phase.value = 'menu'
  }

  function canVerify(): boolean {
    return verifiedCountThisCase.value < 1
  }

  function recordVerify() {
    sound.inspect()
    verifiedCountThisCase.value++
  }

  return {
    phase,
    sceneId,
    dayNumber,
    desk,
    lastOutcome,
    lastCase,
    lastReasons,
    dayResults,
    ending,
    fired,
    totalSalary,
    cum,
    currentScene,
    currentDay,
    currentCase,
    currentRules,
    currentEval,
    progress,
    isLastDay,
    savedProgress,
    history,
    clearHistory,
    clearSceneHistory,
    canVerify,
    recordVerify,
    startGame,
    beginDay,
    doDecide,
    afterFeedback,
    finishDay,
    nextDay,
    computeEnding,
    toMenu
  }
})
