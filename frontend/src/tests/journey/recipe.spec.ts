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

function storedPoster(userId: string, token = 'abc123'): Record<string, unknown> {
  return {
    id: `JOURNEY_POSTER-m${token}-0001`,
    userId,
    recipe: buildRecipe([
      choice('origin', 'PURE'),
      choice('nature', 'PURE'),
      choice('craft', 'PURE'),
    ]),
    code: `TEA-M${token.toUpperCase()}-0002`,
    createdAt: '2026-07-13T00:00:00.000Z',
  }
}

function writePosterStorage(postersByUser: Record<string, unknown>) {
  window.localStorage.setItem(JOURNEY_POSTER_STORAGE_KEY, JSON.stringify({ version: 1, postersByUser }))
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
    store.bindActor(userTwo.id)
    completeJourney(['WARM', 'WARM', 'FRESH'])
    const secondPoster = store.savePoster()

    expect(store.listPosters().map(({ id }) => id)).toEqual([secondPoster.id])
    expect(store.loadPoster(firstPoster.id)).toBeNull()

    auth.user = userOne
    expect(store.listPosters().map(({ id }) => id)).toEqual([firstPoster.id])
    expect(store.loadPoster(secondPoster.id)).toBeNull()
  })

  it.each([
    ['logout', null],
    ['account switch', userTwo],
  ])('clears an authenticated journey on %s', (_label, nextUser) => {
    const auth = useAuthStore()
    auth.user = userOne
    const store = useJourneyStore()
    store.bindActor(userOne.id)
    completeJourney()
    store.savePoster()

    auth.user = nextUser
    store.bindActor(nextUser?.id ?? null)

    expect(store.boundUserId).toBe(nextUser?.id ?? null)
    expect(store.currentStepIndex).toBe(0)
    expect(store.choices).toEqual({})
    expect(store.currentPoster).toBeNull()
    expect(store.savedPoster).toBeNull()
    expect(store.saveStatus).toBe('idle')
  })

  it('preserves only a completed unsaved guest draft when binding the login user', () => {
    const store = useJourneyStore()
    store.bindActor(null)
    completeJourney(['FRESH', 'FRESH', 'PURE'])
    const guestCode = store.currentPoster?.code

    const auth = useAuthStore()
    auth.user = userOne
    store.bindActor(userOne.id)
    const saved = store.savePoster()

    expect(store.boundUserId).toBe(userOne.id)
    expect(saved.code).toBe(guestCode)
    expect(saved.userId).toBe(userOne.id)
  })

  it('rebinds inside savePoster so a later account cannot save or see the previous account state', () => {
    const auth = useAuthStore()
    auth.user = userOne
    const store = useJourneyStore()
    store.bindActor(userOne.id)
    completeJourney()
    const first = store.savePoster()

    auth.user = userTwo

    expect(() => store.savePoster()).toThrow('尚未完成')
    expect(store.boundUserId).toBe(userTwo.id)
    expect(store.currentPoster).toBeNull()
    expect(store.listPosters()).toEqual([])
    expect(store.loadPoster(first.id)).toBeNull()
  })

  it('normalizes extra poster and recipe fields and never rewrites them on a later save', () => {
    const forged = {
      ...storedPoster(userOne.id),
      role: 'ADMIN',
      user: { id: 'forged-user', role: 'ADMIN' },
      unknown: { nested: true },
      recipe: {
        ...(storedPoster(userOne.id).recipe as Record<string, unknown>),
        role: 'ADMIN',
        user: { id: 'forged-user' },
      },
    }
    writePosterStorage({ [userOne.id]: [forged] })
    const auth = useAuthStore()
    auth.user = userOne
    const store = useJourneyStore()

    const [normalized] = store.listPosters()
    expect(Object.keys(normalized!).sort()).toEqual(['code', 'createdAt', 'id', 'recipe', 'userId'])
    expect(Object.keys(normalized!.recipe).sort()).toEqual(['description', 'id', 'ingredients', 'name'])

    store.bindActor(userOne.id)
    completeJourney(['WARM', 'WARM', 'PURE'])
    store.savePoster()
    const rewritten = JSON.parse(window.localStorage.getItem(JOURNEY_POSTER_STORAGE_KEY)!) as {
      postersByUser: Record<string, Array<Record<string, unknown>>>
    }

    for (const poster of rewritten.postersByUser[userOne.id]!) {
      expect(Object.keys(poster).sort()).toEqual(['code', 'createdAt', 'id', 'recipe', 'userId'])
      expect(Object.keys(poster.recipe as Record<string, unknown>).sort()).toEqual(['description', 'id', 'ingredients', 'name'])
    }
  })

  it('keeps valid partitions and records when another partition or record is damaged', () => {
    const otherUser = { ...userTwo, id: 'journey-user-three' }
    writePosterStorage({
      [userOne.id]: [storedPoster(userOne.id, 'valid1'), { ...storedPoster(userOne.id, 'bad001'), code: 'invalid' }],
      [userTwo.id]: 'damaged-partition',
      [otherUser.id]: [storedPoster(otherUser.id, 'valid3')],
    })
    const auth = useAuthStore()
    const store = useJourneyStore()

    auth.user = userOne
    expect(store.listPosters()).toHaveLength(1)
    auth.user = userTwo
    expect(store.listPosters()).toEqual([])
    auth.user = otherUser
    expect(store.listPosters()).toHaveLength(1)
  })

  it('drops invalid business ids, codes, dates, and duplicate ids or codes', () => {
    const valid = storedPoster(userOne.id, 'valid9')
    writePosterStorage({
      [userOne.id]: [
        valid,
        { ...valid, id: 'poster-invalid' },
        { ...valid, id: 'JOURNEY_POSTER-other-0003', code: 'BOOK-invalid' },
        { ...valid, id: 'JOURNEY_POSTER-other-0004', code: 'TEA-other-0004', createdAt: '2026-07-13' },
        { ...valid, id: 'JOURNEY_POSTER-other-0005', code: 'TEA-other-0005', createdAt: 'not-a-date' },
        { ...valid },
        { ...valid, id: 'JOURNEY_POSTER-other-0006', code: String(valid.code).toLowerCase() },
      ],
    })
    const auth = useAuthStore()
    auth.user = userOne
    const store = useJourneyStore()

    const posters = store.listPosters()

    expect(posters).toHaveLength(1)
    expect(Number.isNaN(Date.parse(posters[0]!.createdAt))).toBe(false)
    expect(new Date(posters[0]!.createdAt).toISOString()).toBe(posters[0]!.createdAt)
  })

  it('deduplicates within one user without allowing another partition to shadow valid data', () => {
    const first = storedPoster(userOne.id, 'shared1')
    const second = { ...first, userId: userTwo.id }
    writePosterStorage({ [userOne.id]: [first], [userTwo.id]: [second] })
    const auth = useAuthStore()
    const store = useJourneyStore()

    auth.user = userOne
    expect(store.listPosters()).toHaveLength(1)
    auth.user = userTwo
    expect(store.listPosters()).toHaveLength(1)
  })

  it('accepts case-insensitive business ids with sequence segments longer than four digits', () => {
    writePosterStorage({
      [userOne.id]: [{
        ...storedPoster(userOne.id),
        id: 'journey_poster-mvalid-00001',
        code: 'tea-MVALID-00002',
      }],
    })
    const auth = useAuthStore()
    auth.user = userOne

    expect(useJourneyStore().listPosters()).toHaveLength(1)
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
