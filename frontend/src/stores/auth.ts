import { defineStore } from 'pinia'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { Actor, AuthSession, LoginInput, RegisterInput, User } from '../domain/types'
import { useAppStore } from './app'

export const SESSION_STORAGE_KEY = 'deang-sour-tea:session'

interface PersistedSession {
  userId: string
  sessionId: string
}

function readPersistedSession(): PersistedSession | null {
  const serialized = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (serialized === null) return null
  try {
    const parsed = JSON.parse(serialized) as Partial<PersistedSession>
    if (typeof parsed.userId === 'string' && typeof parsed.sessionId === 'string') return parsed as PersistedSession
  } catch {
    // Invalid client storage is treated as an expired session.
  }
  return null
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    sessionId: null as string | null,
    hydrated: false,
  }),
  getters: {
    isAuthenticated: (state): boolean => state.user !== null,
    actor: (state): Actor | null => {
      if (state.user === null) return null
      return {
        userId: state.user.id,
        role: state.user.role,
        ...(state.user.merchantId === undefined ? {} : { merchantId: state.user.merchantId }),
      }
    },
  },
  actions: {
    canAccess(route: RouteLocationNormalizedLoaded): boolean {
      if (route.meta.requiresAuth !== true) return true
      if (this.user === null) return false
      const roles = route.meta.roles
      if (roles !== undefined && !roles.includes(this.user.role)) return false
      return route.meta.merchantApproved !== true || (this.user.role === 'MERCHANT' && this.user.merchantStatus === 'APPROVED')
    },
    applySession(session: AuthSession) {
      this.user = session.user
      this.sessionId = session.sessionId
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ userId: session.user.id, sessionId: session.sessionId }))
    },
    async rehydrate() {
      if (this.hydrated) return
      const persisted = readPersistedSession()
      if (persisted === null) {
        this.hydrated = true
        return
      }
      try {
        const session = await useAppStore().repository.validateSession(persisted.userId, persisted.sessionId)
        this.applySession(session)
      } catch {
        await this.logout()
      } finally {
        this.hydrated = true
      }
    },
    async login(input: LoginInput) {
      const session = await useAppStore().repository.login(input)
      this.applySession(session)
      return session.user
    },
    async register(input: RegisterInput) {
      const session = await useAppStore().repository.register(input)
      this.applySession(session)
      return session.user
    },
    async logout() {
      const sessionId = this.sessionId ?? readPersistedSession()?.sessionId ?? null
      try {
        if (sessionId !== null) await useAppStore().repository.logout(sessionId)
      } finally {
        this.user = null
        this.sessionId = null
        this.hydrated = true
        window.localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    },
  },
})
