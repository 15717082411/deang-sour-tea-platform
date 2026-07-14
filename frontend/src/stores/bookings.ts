import { defineStore } from 'pinia'
import type { Booking, BookingInput } from '../domain/types'
import { useAppStore } from './app'
import { useAuthStore } from './auth'

export const useBookingsStore = defineStore('bookings', {
  state: () => ({
    bookings: [] as Booking[],
    currentBooking: null as Booking | null,
    loading: false,
    submitting: false,
    error: null as string | null,
    actorEpoch: 0,
    loadSequence: 0,
    mutationSequence: 0,
  }),
  actions: {
    resetForActorChange() {
      this.bookings = []
      this.currentBooking = null
      this.loading = false
      this.submitting = false
      this.error = null
      this.actorEpoch += 1
      this.loadSequence += 1
      this.mutationSequence += 1
    },
    remember(booking: Booking) {
      const index = this.bookings.findIndex(({ id }) => id === booking.id)
      if (index === -1) this.bookings.unshift(booking)
      else this.bookings[index] = booking
      this.currentBooking = booking
    },
    async load(): Promise<Booking[]> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权查看预约')
      const actor = auth.actor
      const epoch = this.actorEpoch
      const sequence = ++this.loadSequence
      const ownsState = () => this.actorEpoch === epoch
        && this.loadSequence === sequence
        && auth.actor?.userId === actor.userId
        && auth.actor.role === actor.role
      this.loading = true
      this.error = null
      try {
        const bookings = await useAppStore().repository.listBookings(actor)
        if (!ownsState()) throw new Error('登录账号已切换，请重新加载预约')
        this.bookings = bookings
        return bookings
      } catch (error) {
        if (ownsState()) this.error = error instanceof Error ? error.message : '预约加载失败'
        throw error
      } finally {
        if (ownsState()) this.loading = false
      }
    },
    async create(input: BookingInput): Promise<Booking> {
      return this.runMutation((actor) => useAppStore().repository.createBooking(actor, input))
    },
    async cancel(bookingId: string): Promise<Booking> {
      return this.runMutation((actor) => useAppStore().repository.cancelBooking(actor, bookingId))
    },
    async runMutation(operation: (actor: NonNullable<ReturnType<typeof useAuthStore>['actor']>) => Promise<Booking>): Promise<Booking> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权操作预约')
      const actor = auth.actor
      const epoch = this.actorEpoch
      const sequence = ++this.mutationSequence
      const ownsState = () => this.actorEpoch === epoch
        && this.mutationSequence === sequence
        && auth.actor?.userId === actor.userId
        && auth.actor.role === actor.role
      this.submitting = true
      this.error = null
      try {
        const booking = await operation(actor)
        if (!ownsState()) throw new Error('登录账号已切换，请重新操作预约')
        this.remember(booking)
        return booking
      } catch (error) {
        if (ownsState()) this.error = error instanceof Error ? error.message : '预约操作失败'
        throw error
      } finally {
        if (ownsState()) this.submitting = false
      }
    },
  },
})
