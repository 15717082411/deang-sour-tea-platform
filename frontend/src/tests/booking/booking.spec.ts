import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import { JOURNEY_POSTER_STORAGE_KEY } from '../../data/posterStorage'
import { RepositoryError, type PlatformRepository } from '../../data/repository'
import type { Actor, JourneyPoster, User } from '../../domain/types'
import BookingPage from '../../pages/booking/BookingPage.vue'
import { createAppRouter } from '../../router'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const actorFor = (user: User): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
})

async function actors(repository: PlatformRepository) {
  const user = await repository.login({ username: 'user_demo', password: 'Demo123!' })
  const merchant = await repository.login({ username: 'merchant_demo', password: 'Demo123!' })
  const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })
  const other = await repository.register({ username: 'booking_other', password: 'Demo123!', phone: '13900139002' })
  return {
    user: actorFor(user.user),
    merchant: actorFor(merchant.user),
    admin: actorFor(admin.user),
    other: actorFor(other.user),
  }
}

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(RepositoryError)
  expect((error as RepositoryError).code).toBe(code)
}

const fixedClock = () => new Date('2026-07-13T08:00:00.000Z')
const validInput = { date: '2026-07-14', people: 2, phone: '13800138000' }

function validPoster(userId: string): JourneyPoster {
  return {
    id: 'JOURNEY_POSTER-BOOKING-0001',
    userId,
    recipe: {
      id: 'recipe-pure',
      name: '本真原味',
      ingredients: ['德昂族原味酸茶', '山泉水'],
      description: '以酸茶与水呈现清晰本味，适合慢慢辨认微酸、茶香与回甘的层次。',
    },
    code: 'TEA-BOOKING-0001',
    createdAt: '2026-07-13T00:00:00.000Z',
  }
}

describe('booking repository lifecycle', () => {
  beforeEach(() => window.localStorage.clear())

  it('validates a strict future date, 1-12 people and mainland phone', async () => {
    const repository = createDemoRepository(new MemoryStorage(), fixedClock)
    const { user } = await actors(repository)

    await expectCode(repository.createBooking(user, { ...validInput, date: '2026-07-13' }), 'BOOKING_INVALID_DATE')
    await expectCode(repository.createBooking(user, { ...validInput, date: '2026-02-30' }), 'BOOKING_INVALID_DATE')
    await expectCode(repository.createBooking(user, { ...validInput, people: 0 }), 'BOOKING_INVALID_PEOPLE')
    await expectCode(repository.createBooking(user, { ...validInput, people: 13 }), 'BOOKING_INVALID_PEOPLE')
    await expectCode(repository.createBooking(user, { ...validInput, phone: '123' }), 'BOOKING_INVALID_PHONE')

    const booking = await repository.createBooking(user, validInput)
    expect(booking).toMatchObject({ status: 'PENDING', date: '2026-07-14', people: 2 })
    expect(booking.timeline).toHaveLength(1)
  })

  it('accepts only a strictly parsed poster owned by the booking user', async () => {
    const storage = new MemoryStorage()
    const repository = createDemoRepository(storage, fixedClock)
    const { user, other } = await actors(repository)
    const poster = validPoster(user.userId)
    storage.setItem(JOURNEY_POSTER_STORAGE_KEY, JSON.stringify({
      version: 1,
      postersByUser: { [user.userId]: [poster] },
    }))

    const booking = await repository.createBooking(user, { ...validInput, posterId: poster.id })
    expect(booking.posterId).toBe(poster.id)
    await expectCode(repository.createBooking(other, { ...validInput, posterId: poster.id }), 'BOOKING_POSTER_INVALID')
    await expectCode(repository.createBooking(user, { ...validInput, posterId: 'JOURNEY_POSTER-MISSING-0001' }), 'BOOKING_POSTER_INVALID')
  })

  it('shows users only their records, admins all records, and rejects merchants', async () => {
    const repository = createDemoRepository(new MemoryStorage(), fixedClock)
    const { user, other, merchant, admin } = await actors(repository)
    await repository.createBooking(other, validInput)

    expect((await repository.listBookings(user)).every(({ userId }) => userId === user.userId)).toBe(true)
    expect((await repository.listBookings(other)).every(({ userId }) => userId === other.userId)).toBe(true)
    expect(await repository.listBookings(admin)).toHaveLength(2)
    await expectCode(repository.listBookings(merchant), 'BOOKING_FORBIDDEN')
  })

  it('cancels only an owned pending booking and makes repeated cancellation idempotent', async () => {
    const repository = createDemoRepository(new MemoryStorage(), fixedClock)
    const { user, other, admin } = await actors(repository)
    const booking = await repository.createBooking(user, validInput)
    await expectCode(repository.cancelBooking(other, booking.id), 'BOOKING_FORBIDDEN')

    const cancelled = await repository.cancelBooking(user, booking.id)
    expect(cancelled.status).toBe('CANCELLED')
    const repeated = await repository.cancelBooking(user, booking.id)
    expect(repeated.timeline).toEqual(cancelled.timeline)

    const verifiedCandidate = await repository.createBooking(user, { ...validInput, date: '2026-07-15' })
    await repository.verifyBooking(admin, verifiedCandidate.code)
    await expectCode(repository.cancelBooking(user, verifiedCandidate.id), 'BOOKING_CANCEL_INVALID_STATUS')
  })

  it('allows only admins to verify once and records verifier metadata without duplicate events', async () => {
    const repository = createDemoRepository(new MemoryStorage(), fixedClock)
    const { user, merchant, admin } = await actors(repository)
    const booking = await repository.createBooking(user, validInput)

    await expectCode(repository.verifyBooking(user, booking.code), 'BOOKING_FORBIDDEN')
    await expectCode(repository.verifyBooking(merchant, booking.code), 'BOOKING_FORBIDDEN')
    await expectCode(repository.verifyBooking(admin, 'BOOK-MISSING-0001'), 'BOOKING_CODE_INVALID')

    const verified = await repository.verifyBooking(admin, booking.code)
    expect(verified).toMatchObject({ status: 'VERIFIED', verifiedBy: admin.userId })
    expect(verified.verifiedAt).toBe(fixedClock().toISOString())
    await expectCode(repository.verifyBooking(admin, booking.code), 'BOOKING_CODE_USED')
    expect((await repository.listBookings(admin)).find(({ id }) => id === booking.id)?.timeline).toEqual(verified.timeline)

    const cancelled = await repository.createBooking(user, { ...validInput, date: '2026-07-16' })
    await repository.cancelBooking(user, cancelled.id)
    await expectCode(repository.verifyBooking(admin, cancelled.code), 'BOOKING_CANCELLED')
  })

  it('submits the booking form and exposes a copyable verification code', async () => {
    const pinia = createPinia()
    useAppStore(pinia).setRepository(createDemoRepository(window.localStorage, fixedClock))
    const auth = useAuthStore(pinia)
    await auth.login({ username: 'user_demo', password: 'Demo123!' })
    const router = createAppRouter(pinia)
    await router.push('/booking')
    const wrapper = mount(BookingPage, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.get('input[name="date"]').setValue('2026-07-14')
    await wrapper.get('input[name="people"]').setValue(2)
    await wrapper.get('input[name="phone"]').setValue('13800138000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="booking-success"]').text()).toContain('核销码')
    expect(wrapper.get('[data-testid="booking-code"]').text()).toMatch(/^BOOK-/)
    expect(wrapper.get('[data-testid="copy-booking-code"]').attributes('type')).toBe('button')
  })
})
