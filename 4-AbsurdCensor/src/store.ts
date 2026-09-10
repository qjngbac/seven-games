import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import { SCENES, sceneById, dayByScene } from './data/scenes'
import { casesForSceneDay } from './data/cases'
import { DeskController } from './game/desk'
import { evaluate } from './game/rules'
import { ApplicantCase, CaseOutcome, DayResult, Decision, EvalResult } from './game/types'
import { Ending, EndingState, mergeDay, resolveEnding, FIRE_PRESSURE } from './game/narrative'

export type Phase = 'menu' | 'brief' | 'desk' | 'feedback' | 'dayend' | 'ending'

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
  }

  function beginDay() {
    const day = currentDay.value
    if (!day) return
    desk.value = new DeskController(day, casesForSceneDay(sceneId.value, day.date))
    phase.value = 'desk'
  }

  function doDecide(d: Decision) {
    if (!desk.value) return
    lastCase.value = desk.value.current
    lastOutcome.value = desk.value.decide(d)
    phase.value = 'feedback'
  }

  function afterFeedback() {
    if (!desk.value) return
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
    phase.value = 'ending'
  }

  function toMenu() {
    phase.value = 'menu'
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
