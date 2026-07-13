import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import type { User } from '../../domain/types'
import JourneyPage from '../../pages/journey/JourneyPage.vue'
import { createAppRouter } from '../../router'
import { useAuthStore } from '../../stores/auth'
import { JOURNEY_POSTER_STORAGE_KEY, useJourneyStore } from '../../stores/journey'

const loggedInUser: User = {
  id: 'journey-page-user',
  username: 'journey_page',
  displayName: '山野寻茶人',
  phone: '13800138012',
  role: 'USER',
  merchantStatus: 'NONE',
}

const secondLoggedInUser: User = {
  ...loggedInUser,
  id: 'journey-page-user-two',
  username: 'journey_page_two',
  displayName: '另一位寻茶人',
}

async function mountJourney() {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/journey', name: 'journey', component: JourneyPage },
      { path: '/login', name: 'login', component: { template: '<main>登录页</main>' } },
    ],
  })
  await router.push('/journey')
  await router.isReady()
  const wrapper = mount(JourneyPage, { global: { plugins: [pinia, router] } })
  return { pinia, router, wrapper }
}

async function chooseFirstAndAdvance(wrapper: Awaited<ReturnType<typeof mountJourney>>['wrapper']) {
  await wrapper.get('input[type="radio"]').setValue()
  await wrapper.get('[data-testid="journey-next"]').trigger('click')
}

describe('JourneyPage', () => {
  beforeEach(() => window.localStorage.clear())

  it('is registered as the lazy journey route', () => {
    const route = createAppRouter(createPinia()).getRoutes().find(({ name }) => name === 'journey')

    expect(route).toBeDefined()
    expect(typeof route?.components?.default).toBe('function')
  })

  it('disables the next action until one radio option is selected', async () => {
    const { wrapper } = await mountJourney()

    expect(wrapper.get('[data-testid="journey-next"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3)

    await wrapper.get('input[type="radio"]').setValue()

    expect(wrapper.get('[data-testid="journey-next"]').attributes('disabled')).toBeUndefined()
  })

  it('preserves the selected option after advancing and returning', async () => {
    const { wrapper, pinia } = await mountJourney()
    const firstOption = wrapper.get('input[type="radio"]')
    await firstOption.setValue()
    const selectedValue = (firstOption.element as HTMLInputElement).value

    await wrapper.get('[data-testid="journey-next"]').trigger('click')
    expect(useJourneyStore(pinia).currentStepIndex).toBe(1)
    await wrapper.get('[data-testid="journey-back"]').trigger('click')

    const restored = wrapper.get(`input[value="${selectedValue}"]`).element as HTMLInputElement
    expect(restored.checked).toBe(true)
  })

  it('renders structured ingredients and a TEA code after all three steps', async () => {
    const { wrapper } = await mountJourney()

    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)

    const poster = wrapper.get('[data-testid="recipe-poster"]')
    expect(poster.findAll('[data-testid="recipe-ingredient"]')).toHaveLength(2)
    expect(poster.text()).toContain('德昂族原味酸茶')
    expect(poster.get('[data-testid="poster-code"]').text()).toMatch(/^TEA-/)
    expect(poster.get('img').attributes('alt')).toContain('项目原创视觉')
  })

  it('clears choices, result, and save state when restarting', async () => {
    const { wrapper, pinia } = await mountJourney()
    useAuthStore(pinia).user = loggedInUser
    await flushPromises()
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await wrapper.get('[data-testid="save-poster"]').trigger('click')

    expect(useJourneyStore(pinia).saveStatus).toBe('saved')
    await wrapper.get('[data-testid="journey-restart"]').trigger('click')

    const store = useJourneyStore(pinia)
    expect(store.currentStepIndex).toBe(0)
    expect(store.choices).toEqual({})
    expect(store.currentPoster).toBeNull()
    expect(store.saveStatus).toBe('idle')
    expect(wrapper.find('[data-testid="recipe-poster"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="journey-next"]').attributes('disabled')).toBeDefined()
  })

  it('sends a guest to login with a safe journey redirect without writing storage', async () => {
    const { wrapper, router, pinia } = await mountJourney()
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    const draftCode = useJourneyStore(pinia).currentPoster?.code

    await wrapper.get('[data-testid="save-poster"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/journey')
    expect(window.localStorage.getItem(JOURNEY_POSTER_STORAGE_KEY)).toBeNull()
    expect(useJourneyStore(pinia).currentPoster?.code).toBe(draftCode)
  })

  it('keeps the completed guest result through login in the same SPA session and binds it on save', async () => {
    const { wrapper, router, pinia } = await mountJourney()
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    const journey = useJourneyStore(pinia)
    const draftCode = journey.currentPoster?.code

    await wrapper.get('[data-testid="save-poster"]').trigger('click')
    useAuthStore(pinia).user = loggedInUser
    await flushPromises()
    await router.push('/journey')
    await wrapper.get('[data-testid="save-poster"]').trigger('click')

    expect(journey.currentPoster?.code).toBe(draftCode)
    expect(journey.boundUserId).toBe(loggedInUser.id)
    expect(journey.currentPoster?.userId).toBe(loggedInUser.id)
    expect(wrapper.get('[role="status"]').text()).toContain('保存成功')
    expect(wrapper.text()).toContain(loggedInUser.displayName)
    expect(wrapper.find('[data-testid="booking-action"]').exists()).toBe(false)
  })

  it('clears a saved result immediately when the authenticated account changes', async () => {
    const { wrapper, pinia } = await mountJourney()
    const auth = useAuthStore(pinia)
    const journey = useJourneyStore(pinia)
    auth.user = loggedInUser
    await flushPromises()
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await chooseFirstAndAdvance(wrapper)
    await wrapper.get('[data-testid="save-poster"]').trigger('click')
    const firstCode = journey.currentPoster?.code

    auth.user = secondLoggedInUser
    await flushPromises()

    expect(journey.boundUserId).toBe(secondLoggedInUser.id)
    expect(journey.currentStepIndex).toBe(0)
    expect(journey.choices).toEqual({})
    expect(journey.currentPoster).toBeNull()
    expect(journey.savedPoster).toBeNull()
    expect(journey.saveStatus).toBe('idle')
    expect(wrapper.find('[data-testid="recipe-poster"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(firstCode)
  })
})
