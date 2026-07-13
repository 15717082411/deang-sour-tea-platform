import type { JourneyChoice, JourneyPoster, JourneyRecipe } from '../domain/types'

export const JOURNEY_POSTER_STORAGE_KEY = 'deang-sour-tea:journey-posters:v1'
export const JOURNEY_POSTER_STORAGE_VERSION = 1

type JourneyTrait = JourneyChoice['trait']

export const JOURNEY_RECIPES: Record<JourneyTrait, JourneyRecipe> = {
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

export interface JourneyPosterStorage {
  version: typeof JOURNEY_POSTER_STORAGE_VERSION
  postersByUser: Record<string, JourneyPoster[]>
}

const posterIdPattern = /^JOURNEY_POSTER-[A-Z0-9]+-[A-Z0-9]{4,}$/i
const posterCodePattern = /^TEA-[A-Z0-9]+-[A-Z0-9]{4,}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

function normalizeJourneyRecipe(value: unknown): JourneyRecipe | null {
  if (!isRecord(value)) return null
  const canonical = Object.values(JOURNEY_RECIPES).find(({ id, name }) => id === value.id && name === value.name)
  if (canonical === undefined
    || value.description !== canonical.description
    || !Array.isArray(value.ingredients)
    || value.ingredients.length !== canonical.ingredients.length
    || !value.ingredients.every((ingredient, index) => ingredient === canonical.ingredients[index])) {
    return null
  }
  return { ...canonical, ingredients: [...canonical.ingredients] }
}

export function normalizePosterKey(value: string): string {
  return value.toUpperCase()
}

export function isDraftJourneyPoster(value: unknown): value is JourneyPoster {
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
  return { id: value.id, userId, recipe, code: value.code, createdAt: value.createdAt }
}

export function journeyRecipesMatch(left: JourneyRecipe, right: JourneyRecipe): boolean {
  return left.id === right.id
    && left.name === right.name
    && left.description === right.description
    && left.ingredients.length === right.ingredients.length
    && left.ingredients.every((ingredient, index) => ingredient === right.ingredients[index])
}

export function emptyJourneyPosterStorage(): JourneyPosterStorage {
  return { version: JOURNEY_POSTER_STORAGE_VERSION, postersByUser: {} }
}

export function readJourneyPosterStorage(storage: Storage): JourneyPosterStorage {
  const serialized = storage.getItem(JOURNEY_POSTER_STORAGE_KEY)
  if (serialized === null) return emptyJourneyPosterStorage()

  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isRecord(parsed)
      || parsed.version !== JOURNEY_POSTER_STORAGE_VERSION
      || !isRecord(parsed.postersByUser)) {
      return emptyJourneyPosterStorage()
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
        const normalizedId = normalizePosterKey(poster.id)
        const normalizedCode = normalizePosterKey(poster.code)
        if (seenIds.has(normalizedId) || seenCodes.has(normalizedCode)) continue
        seenIds.add(normalizedId)
        seenCodes.add(normalizedCode)
        normalizedPosters.push(poster)
      }
      if (normalizedPosters.length > 0) postersByUser[userId] = normalizedPosters
    }
    return { version: JOURNEY_POSTER_STORAGE_VERSION, postersByUser }
  } catch {
    return emptyJourneyPosterStorage()
  }
}
