import { defineStore } from 'pinia'
import type { JourneyChoice, JourneyPoster, JourneyRecipe } from '../domain/types'
import { createBusinessId } from '../utils/identifiers'
import { useAuthStore } from './auth'

export const JOURNEY_POSTER_STORAGE_KEY = 'deang-sour-tea:journey-posters:v1'

const journeyStepIds = ['origin', 'nature', 'craft'] as const
const journeyTraits = ['PURE', 'FRESH', 'WARM'] as const
const storageVersion = 1
const posterIdPattern = /^JOURNEY_POSTER-[A-Z0-9]+-[A-Z0-9]{4,}$/i
const posterCodePattern = /^TEA-[A-Z0-9]+-[A-Z0-9]{4,}$/i

export type JourneyStepId = (typeof journeyStepIds)[number]
export type JourneyTrait = JourneyChoice['trait']

export interface JourneyOption {
  id: string
  label: string
  detail: string
  trait: JourneyTrait
}

export interface JourneyStepDefinition {
  id: JourneyStepId
  eyebrow: string
  title: string
  prompt: string
  options: JourneyOption[]
}

export const JOURNEY_STEPS: JourneyStepDefinition[] = [
  {
    id: 'origin',
    eyebrow: '第一程 · 源起',
    title: '听见火塘边的第一盏茶',
    prompt: '初见酸茶，你更想记住哪一种感受？',
    options: [
      { id: 'origin-pure', label: '守住本来的茶味', detail: '让酸、香与回甘保持清晰。', trait: 'PURE' },
      { id: 'origin-fresh', label: '循着山野清气', detail: '偏爱轻快明亮的草木气息。', trait: 'FRESH' },
      { id: 'origin-warm', label: '围坐分享一盏', detail: '喜欢柔和丰润的相聚氛围。', trait: 'WARM' },
    ],
  },
  {
    id: 'nature',
    eyebrow: '第二程 · 自然',
    title: '沿古茶林辨认风味',
    prompt: '山路展开时，哪一种气息会让你停步？',
    options: [
      { id: 'nature-pure', label: '茶叶与山泉的本味', detail: '简净直接，不遮盖酸茶自身风味。', trait: 'PURE' },
      { id: 'nature-fresh', label: '青柠与薄荷的清香', detail: '清亮的果香与草本香彼此映照。', trait: 'FRESH' },
      { id: 'nature-warm', label: '桂花与桂圆的柔香', detail: '花香与甜香构成温和层次。', trait: 'WARM' },
    ],
  },
  {
    id: 'craft',
    eyebrow: '第三程 · 技艺',
    title: '在慢工里完成取舍',
    prompt: '为这次品饮收束风味，你会如何搭配？',
    options: [
      { id: 'craft-pure', label: '只用酸茶与水', detail: '留下最少的变量，专注原味。', trait: 'PURE' },
      { id: 'craft-fresh', label: '添一笔清新果香', detail: '用青柠和薄荷拉开明快层次。', trait: 'FRESH' },
      { id: 'craft-warm', label: '添一笔温润花香', detail: '用桂花和桂圆丰富柔和香气。', trait: 'WARM' },
    ],
  },
]

const recipes: Record<JourneyTrait, JourneyRecipe> = {
  PURE: {
    id: 'recipe-pure',
    name: '本真原味',
    ingredients: ['德昂族原味酸茶', '山泉水'],
    description: '以酸茶与水呈现清晰本味，适合慢慢辨认微酸、茶香与回甘的层次。',
  },
  FRESH: {
    id: 'recipe-fresh',
    name: '山野清新',
    ingredients: ['德昂族酸茶', '青柠片', '新鲜薄荷', '山泉水'],
    description: '青柠与薄荷带来明快香气，与酸茶本身的风味形成轻盈呼应。',
  },
  WARM: {
    id: 'recipe-warm',
    name: '温润花香',
    ingredients: ['德昂族酸茶', '干桂花', '桂圆', '山泉水'],
    description: '桂花与桂圆叠加柔和香气，让这份互动配方呈现温暖、圆润的风味印象。',
  },
}

interface JourneyPosterStorage {
  version: typeof storageVersion
  postersByUser: Record<string, JourneyPoster[]>
}

type JourneyChoiceMap = Partial<Record<JourneyStepId, JourneyChoice>>
type SaveStatus = 'idle' | 'saved'

export class JourneyAuthenticationRequiredError extends Error {
  constructor() {
    super('登录后才能保存配方海报')
    this.name = 'JourneyAuthenticationRequiredError'
  }
}

function invalidChoices(): never {
  throw new Error('旅程选择无效：需要三个唯一且有效的步骤选择')
}

function isJourneyTrait(value: unknown): value is JourneyTrait {
  return journeyTraits.includes(value as JourneyTrait)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJourneyChoice(value: unknown): value is JourneyChoice {
  return isRecord(value)
    && typeof value.stepId === 'string'
    && typeof value.optionId === 'string'
    && value.optionId.length > 0
    && isJourneyTrait(value.trait)
}

export function buildRecipe(choices: JourneyChoice[]): JourneyRecipe {
  if (!Array.isArray(choices) || choices.length !== journeyStepIds.length) invalidChoices()
  if (choices.some((choice) => !isJourneyChoice(choice))) invalidChoices()

  const stepIds = choices.map(({ stepId }) => stepId)
  const uniqueStepIds = new Set(stepIds)
  const hasExactSteps = journeyStepIds.every((stepId) => uniqueStepIds.has(stepId))
  if (uniqueStepIds.size !== journeyStepIds.length || !hasExactSteps) invalidChoices()
  if (choices.some(({ trait }) => !isJourneyTrait(trait))) invalidChoices()

  const counts: Record<JourneyTrait, number> = { PURE: 0, FRESH: 0, WARM: 0 }
  choices.forEach(({ trait }) => { counts[trait] += 1 })
  const winningTrait = journeyTraits.reduce((winner, trait) => (
    counts[trait] > counts[winner] ? trait : winner
  ), journeyTraits[0])
  const recipe = recipes[winningTrait]
  return { ...recipe, ingredients: [...recipe.ingredients] }
}

function normalizeJourneyRecipe(value: unknown): JourneyRecipe | null {
  if (!isRecord(value)) return null
  const canonicalRecipe = Object.values(recipes).find(({ id, name }) => id === value.id && name === value.name)
  if (canonicalRecipe === undefined
    || value.description !== canonicalRecipe.description
    || !Array.isArray(value.ingredients)
    || value.ingredients.length !== canonicalRecipe.ingredients.length
    || !value.ingredients.every((ingredient, index) => ingredient === canonicalRecipe.ingredients[index])) {
    return null
  }
  return { ...canonicalRecipe, ingredients: [...canonicalRecipe.ingredients] }
}

function isCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function isDraftPoster(value: unknown): value is JourneyPoster {
  if (!isRecord(value)) return false
  return typeof value.id === 'string'
    && posterIdPattern.test(value.id)
    && (value.userId === undefined || typeof value.userId === 'string')
    && normalizeJourneyRecipe(value.recipe) !== null
    && typeof value.code === 'string'
    && posterCodePattern.test(value.code)
    && isCanonicalIsoDate(value.createdAt)
}

function normalizePersistedPoster(value: unknown, userId: string): JourneyPoster | null {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || !posterIdPattern.test(value.id)
    || value.userId !== userId
    || typeof value.code !== 'string'
    || !posterCodePattern.test(value.code)
    || !isCanonicalIsoDate(value.createdAt)) {
    return null
  }
  const recipe = normalizeJourneyRecipe(value.recipe)
  if (recipe === null) return null
  return {
    id: value.id,
    userId,
    recipe,
    code: value.code,
    createdAt: value.createdAt,
  }
}

function recipesMatch(left: JourneyRecipe, right: JourneyRecipe): boolean {
  return left.id === right.id
    && left.name === right.name
    && left.description === right.description
    && left.ingredients.length === right.ingredients.length
    && left.ingredients.every((ingredient, index) => ingredient === right.ingredients[index])
}

function emptyPosterStorage(): JourneyPosterStorage {
  return { version: storageVersion, postersByUser: {} }
}

function readPosterStorage(): JourneyPosterStorage {
  const serialized = window.localStorage.getItem(JOURNEY_POSTER_STORAGE_KEY)
  if (serialized === null) return emptyPosterStorage()

  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isRecord(parsed) || parsed.version !== storageVersion || !isRecord(parsed.postersByUser)) {
      return emptyPosterStorage()
    }
    const postersByUser: Record<string, JourneyPoster[]> = {}
    for (const [userId, posters] of Object.entries(parsed.postersByUser)) {
      if (userId.length === 0 || !Array.isArray(posters)) continue
      const normalizedPosters: JourneyPoster[] = []
      const seenIds = new Set<string>()
      const seenCodes = new Set<string>()
      for (const candidate of posters) {
        const poster = normalizePersistedPoster(candidate, userId)
        if (poster === null) continue
        const normalizedId = poster.id.toUpperCase()
        const normalizedCode = poster.code.toUpperCase()
        if (seenIds.has(normalizedId) || seenCodes.has(normalizedCode)) continue
        seenIds.add(normalizedId)
        seenCodes.add(normalizedCode)
        normalizedPosters.push(poster)
      }
      if (normalizedPosters.length > 0) postersByUser[userId] = normalizedPosters
    }
    return { version: storageVersion, postersByUser }
  } catch {
    return emptyPosterStorage()
  }
}

function createDraftPoster(recipe: JourneyRecipe): JourneyPoster {
  return {
    id: createBusinessId('JOURNEY_POSTER'),
    recipe,
    code: createBusinessId('TEA').toUpperCase(),
    createdAt: new Date().toISOString(),
  }
}

export const useJourneyStore = defineStore('journey', {
  state: () => ({
    boundUserId: undefined as string | null | undefined,
    currentStepIndex: 0,
    choices: {} as JourneyChoiceMap,
    currentPoster: null as JourneyPoster | null,
    savedPoster: null as JourneyPoster | null,
    saveStatus: 'idle' as SaveStatus,
  }),
  getters: {
    isComplete: (state): boolean => state.currentStepIndex === JOURNEY_STEPS.length && state.currentPoster !== null,
  },
  actions: {
    clearJourneyState() {
      this.currentStepIndex = 0
      this.choices = {}
      this.currentPoster = null
      this.savedPoster = null
      this.saveStatus = 'idle'
    },
    bindActor(userId: string | null) {
      if (userId !== null && userId.length === 0) throw new Error('旅程用户标识无效')
      if (this.boundUserId === undefined) {
        this.boundUserId = userId
        return
      }
      if (this.boundUserId === userId) return

      const canClaimGuestDraft = this.boundUserId === null
        && userId !== null
        && this.isComplete
        && isDraftPoster(this.currentPoster)
        && this.currentPoster.userId === undefined
        && this.savedPoster === null
        && this.saveStatus === 'idle'
      if (!canClaimGuestDraft) this.clearJourneyState()
      this.boundUserId = userId
    },
    selectChoice(choice: JourneyChoice) {
      const step = JOURNEY_STEPS[this.currentStepIndex]
      const option = step?.options.find(({ id }) => id === choice.optionId)
      if (step === undefined || choice.stepId !== step.id || option?.trait !== choice.trait) invalidChoices()
      this.choices[step.id] = { ...choice }
    },
    advance() {
      const step = JOURNEY_STEPS[this.currentStepIndex]
      if (step === undefined) return
      if (this.choices[step.id] === undefined) throw new Error('请先完成当前步骤')

      if (this.currentStepIndex < JOURNEY_STEPS.length - 1) {
        this.currentStepIndex += 1
        return
      }

      const orderedChoices = JOURNEY_STEPS.map(({ id }) => this.choices[id])
      if (orderedChoices.some((choice) => choice === undefined)) invalidChoices()
      const recipe = buildRecipe(orderedChoices as JourneyChoice[])
      this.currentPoster = createDraftPoster(recipe)
      this.savedPoster = null
      this.saveStatus = 'idle'
      this.currentStepIndex = JOURNEY_STEPS.length
    },
    goBack() {
      if (this.currentStepIndex > 0 && this.currentStepIndex < JOURNEY_STEPS.length) this.currentStepIndex -= 1
    },
    restart() {
      this.clearJourneyState()
    },
    savePoster(): JourneyPoster {
      const auth = useAuthStore()
      this.bindActor(auth.user?.id ?? null)
      if (!this.isComplete || !isDraftPoster(this.currentPoster)) throw new Error('旅程尚未完成，不能保存海报')
      if (auth.user === null) throw new JourneyAuthenticationRequiredError()
      if (this.savedPoster?.userId === auth.user.id) return this.savedPoster
      if (this.savedPoster !== null) throw new Error('当前结果已由其他账户保存，请重新开始')

      const orderedChoices = JOURNEY_STEPS.map(({ id }) => this.choices[id])
      const expectedRecipe = buildRecipe(orderedChoices as JourneyChoice[])
      if (!recipesMatch(expectedRecipe, this.currentPoster.recipe)) {
        throw new Error('旅程结果无效，不能保存海报')
      }

      const storage = readPosterStorage()
      const userPosters = storage.postersByUser[auth.user.id] ?? []
      const existing = userPosters.find(({ id, code }) => id === this.currentPoster?.id || code === this.currentPoster?.code)
      if (existing !== undefined) {
        this.currentPoster = existing
        this.savedPoster = existing
        this.saveStatus = 'saved'
        return existing
      }

      const poster: JourneyPoster = {
        id: this.currentPoster.id,
        userId: auth.user.id,
        recipe: {
          id: expectedRecipe.id,
          name: expectedRecipe.name,
          ingredients: [...expectedRecipe.ingredients],
          description: expectedRecipe.description,
        },
        code: this.currentPoster.code,
        createdAt: this.currentPoster.createdAt,
      }
      storage.postersByUser[auth.user.id] = [...userPosters, poster]
      window.localStorage.setItem(JOURNEY_POSTER_STORAGE_KEY, JSON.stringify(storage))
      this.currentPoster = poster
      this.savedPoster = poster
      this.saveStatus = 'saved'
      return poster
    },
    listPosters(): JourneyPoster[] {
      const userId = useAuthStore().user?.id
      if (userId === undefined) return []
      return [...(readPosterStorage().postersByUser[userId] ?? [])]
    },
    loadPoster(posterId: string): JourneyPoster | null {
      return this.listPosters().find(({ id }) => id === posterId) ?? null
    },
  },
})
