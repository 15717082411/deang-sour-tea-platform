import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { JourneyChoice, User } from '../../domain/types'
import { useAuthStore } from '../../stores/auth'
import {
  buildRecipe,
  JOURNEY_POSTER_STORAGE_KEY,
  useJourneyStore,
} from '../../stores/journey'

const userOne: User = {
  id: 'journey-user-one',
  username: 'journey_one',
  displayName: '寻茶人甲',
  phone: '13800138010',
  role: 'USER',
  merchantStatus: 'NONE',
}

const userTwo: User = {
  id: 'journey-user-two',
  username: 'journey_two',
  displayName: '寻茶人乙',
  phone: '13800138011',
  role: 'USER',
  merchantStatus: 'NONE',
}

function choice(stepId: string, trait: JourneyChoice['trait']): JourneyChoice {
  return { stepId, optionId: `${stepId}-${trait.toLowerCase()}`, trait }
}

function completeJourney(traits: JourneyChoice['trait'][] = ['PURE', 'PURE', 'PURE']) {
  const store = useJourneyStore()
  const stepIds = ['origin', 'nature', 'craft']
  traits.forEach((trait, index) => {
    store.selectChoice(choice(stepIds[index]!, trait))
    store.advance()
  })
  return store
}

describe('buildRecipe', () => {
  it.each([
    [['PURE', 'PURE', 'FRESH'], '本真原味'],
    [['FRESH', 'WARM', 'FRESH'], '山野清新'],
    [['WARM', 'WARM', 'PURE'], '温润花香'],
  ] as const)('maps a trait majority to a complete recipe', (traits, expectedName) => {
    const recipe = buildRecipe([
      choice('origin', traits[0]),
      choice('nature', traits[1]),
      choice('craft', traits[2]),
    ])

    expect(recipe).toMatchObject({ name: expectedName })
    expect(recipe.ingredients.length).toBeGreaterThanOrEqual(2)
    expect(recipe.description.length).toBeGreaterThan(10)
  })

  it('uses a stable PURE priority for a three-way tie regardless of input order', () => {
    const ordered = [choice('origin', 'FRESH'), choice('nature', 'WARM'), choice('craft', 'PURE')]
    const shuffled = [ordered[2]!, ordered[0]!, ordered[1]!]

    expect(buildRecipe(ordered).name).toBe('本真原味')
    expect(buildRecipe(shuffled)).toEqual(buildRecipe(ordered))
  })

  it.each([
    [
      'duplicate steps',
      [choice('origin', 'PURE'), choice('origin', 'FRESH'), choice('craft', 'WARM')],
    ],
    ['missing steps', [choice('origin', 'PURE'), choice('nature', 'FRESH')]],
    [
      'unknown steps',
      [choice('origin', 'PURE'), choice('nature', 'FRESH'), choice('unknown', 'WARM')],
    ],
    [
      'invalid traits',
      [choice('origin', 'PURE'), choice('nature', 'FRESH'), { stepId: 'craft', optionId: 'bad', trait: 'COOL' }],
    ],
  ])('rejects %s', (_label, choices) => {
    expect(() => buildRecipe(choices as JourneyChoice[])).toThrow('旅程选择无效')
  })
})

describe('journey poster persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('does not persist an unfinished or guest journey', () => {
    const store = useJourneyStore()
    expect(() => store.savePoster()).toThrow('尚未完成')

    completeJourney()
    expect(() => store.savePoster()).toThrow('登录')
    expect(window.localStorage.getItem(JOURNEY_POSTER_STORAGE_KEY)).toBeNull()
  })

  it('saves one completed run idempotently for an authenticated user', () => {
    const auth = useAuthStore()
    auth.user = userOne
    const store = completeJourney(['FRESH', 'FRESH', 'PURE'])

    const first = store.savePoster()
    const second = store.savePoster()

    expect(second).toEqual(first)
    expect(first).toMatchObject({ userId: userOne.id, recipe: { name: '山野清新' } })
    expect(first.code).toMatch(/^TEA-/)
    expect(store.listPosters()).toEqual([first])
    expect(store.loadPoster(first.id)).toEqual(first)
    expect(store.saveStatus).toBe('saved')
  })

  it('creates a new poster after restarting and completing another run', () => {
    const auth = useAuthStore()
    auth.user = userOne
    const store = completeJourney()
    const first = store.savePoster()

    store.restart()
    completeJourney(['WARM', 'WARM', 'WARM'])
    const second = store.savePoster()

    expect(second.id).not.toBe(first.id)
    expect(second.code).not.toBe(first.code)
    expect(store.listPosters()).toHaveLength(2)
  })

  it('isolates saved posters by the current user', () => {
    const auth = useAuthStore()
    auth.user = userOne
    const store = completeJourney()
    const firstPoster = store.savePoster()

    store.restart()
    auth.user = userTwo
    completeJourney(['WARM', 'WARM', 'FRESH'])
    const secondPoster = store.savePoster()

    expect(store.listPosters().map(({ id }) => id)).toEqual([secondPoster.id])
    expect(store.loadPoster(firstPoster.id)).toBeNull()

    auth.user = userOne
    expect(store.listPosters().map(({ id }) => id)).toEqual([firstPoster.id])
    expect(store.loadPoster(secondPoster.id)).toBeNull()
  })

  it('recovers safely from damaged storage and replaces it on the next save', () => {
    window.localStorage.setItem(JOURNEY_POSTER_STORAGE_KEY, '{not-json')
    const auth = useAuthStore()
    auth.user = userOne
    const store = useJourneyStore()

    expect(store.listPosters()).toEqual([])
    completeJourney()
    const poster = store.savePoster()

    expect(store.listPosters()).toEqual([poster])
    expect(JSON.parse(window.localStorage.getItem(JOURNEY_POSTER_STORAGE_KEY)!)).toMatchObject({
      version: 1,
      postersByUser: { [userOne.id]: [{ id: poster.id }] },
    })
  })
})
