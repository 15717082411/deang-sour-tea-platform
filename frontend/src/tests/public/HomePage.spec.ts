import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { Component } from 'vue'
import HomePage from '../../pages/public/HomePage.vue'
import CultureIndexPage from '../../pages/public/CultureIndexPage.vue'
import CultureDetailPage from '../../pages/public/CultureDetailPage.vue'
import CraftPage from '../../pages/public/CraftPage.vue'
import StoriesPage from '../../pages/public/StoriesPage.vue'
import { createDemoRepository } from '../../data/demoRepository'
import type { PlatformRepository } from '../../data/repository'
import type { ContentArticle } from '../../domain/types'
import { useAppStore } from '../../stores/app'

interface MountedPage {
  wrapper: VueWrapper
  router: Router
}

async function mountPage(
  component: Component,
  path: string,
  repository: PlatformRepository = createDemoRepository(window.localStorage),
): Promise<MountedPage> {
  const pinia = createPinia()
  useAppStore(pinia).setRepository(repository)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: HomePage },
      { path: '/culture', component: CultureIndexPage },
      { path: '/culture/:slug', component: CultureDetailPage },
      { path: '/craft', component: CraftPage },
      { path: '/stories', component: StoriesPage },
      { path: '/journey', component: { template: '<div />' } },
      { path: '/shop', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  return {
    wrapper: mount(component, { global: { plugins: [pinia, router] } }),
    router,
  }
}

function expectEveryImageToHaveAlt(wrapper: VueWrapper): void {
  const images = wrapper.findAll('img')
  expect(images.length).toBeGreaterThan(0)
  for (const image of images) expect(image.attributes('alt')?.trim()).toBeTruthy()
}

describe('public culture pages', () => {
  beforeEach(() => window.localStorage.clear())

  it('presents 德昂族酸茶 as the homepage H1 with the primary journey action', async () => {
    const { wrapper } = await mountPage(HomePage, '/')

    expect(wrapper.get('h1').text()).toBe('德昂族酸茶')
    const hero = wrapper.get('.culture-hero')
    const media = hero.get('.culture-hero__image')
    const overlay = hero.get('.culture-hero__veil')
    expect(hero.element.tagName).toBe('SECTION')
    expect(media.element.parentElement).toBe(hero.element)
    expect(overlay.element.parentElement).toBe(hero.element)
    expect(hero.find('.card, .el-card, [data-testid="hero-card"]').exists()).toBe(false)
    const action = wrapper.get('[data-testid="primary-journey-action"]')
    expect(action.text()).toBe('开始酸茶之旅')
    expect(action.attributes('href')).toBe('/journey')
    expect(hero.get('.culture-hero__next').attributes('href')).toBe('#uses')
  })

  it('renders a direct authoritative source link in culture detail', async () => {
    const { wrapper } = await mountPage(CultureDetailPage, '/culture/what-is-sour-tea')
    await flushPromises()

    const source = wrapper.get('a[href="https://www.ihchina.cn/project_details/23582/"]')
    expect(source.text()).toContain('德昂族酸茶制作技艺')
  })

  it('gives every content image a non-empty alt across all public culture pages', async () => {
    const pages: Array<[Component, string]> = [
      [HomePage, '/'],
      [CultureIndexPage, '/culture'],
      [CultureDetailPage, '/culture/fermentation-craft'],
      [CraftPage, '/craft'],
      [StoriesPage, '/stories'],
    ]

    for (const [component, path] of pages) {
      const { wrapper } = await mountPage(component, path)
      await flushPromises()
      expectEveryImageToHaveAlt(wrapper)
      wrapper.unmount()
    }
  })

  it('shows an explicit loading state while culture detail is being fetched', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    let resolveContent!: (content: ContentArticle) => void
    const pendingContent = new Promise<ContentArticle>((resolve) => { resolveContent = resolve })
    const repository = {
      ...baseRepository,
      getContent: () => pendingContent,
    } as PlatformRepository

    const { wrapper } = await mountPage(CultureDetailPage, '/culture/what-is-sour-tea', repository)

    expect(wrapper.get('[role="status"]').text()).toContain('正在加载')
    resolveContent((await baseRepository.getContent('what-is-sour-tea')))
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('shows a structured not-found state without depending on localized copy', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    const repository = {
      ...baseRepository,
      getContent: () => Promise.reject(Object.assign(new Error('arbitrary localized message'), { code: 'CONTENT_NOT_FOUND' })),
    } as PlatformRepository

    const { wrapper } = await mountPage(CultureDetailPage, '/culture/missing-article', repository)
    await flushPromises()

    const state = wrapper.get('[data-state="not-found"]')
    expect(state.element.tagName).toBe('SECTION')
    expect(state.get('a').attributes('href')).toBe('/culture')
  })

  it('shows a semantic error state for a general culture detail failure', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    const repository = {
      ...baseRepository,
      getContent: () => Promise.reject(new Error('服务暂时不可用')),
    } as PlatformRepository

    const { wrapper } = await mountPage(CultureDetailPage, '/culture/unavailable', repository)
    await flushPromises()

    const state = wrapper.get('[data-state="error"]')
    expect(state.attributes('role')).toBe('alert')
    expect(state.text()).toContain('服务暂时不可用')
  })

  it('keeps the culture index loading state until the repository resolves', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    let resolveContents!: (contents: ContentArticle[]) => void
    const pendingContents = new Promise<ContentArticle[]>((resolve) => { resolveContents = resolve })
    const repository = { ...baseRepository, listContents: () => pendingContents } as PlatformRepository

    const { wrapper } = await mountPage(CultureIndexPage, '/culture', repository)

    expect(wrapper.get('[data-state="loading"]').attributes('role')).toBe('status')
    resolveContents([])
    await flushPromises()
  })

  it('shows a structured empty state when the culture repository has no published content', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    const repository = { ...baseRepository, listContents: () => Promise.resolve([]) } as PlatformRepository

    const { wrapper } = await mountPage(CultureIndexPage, '/culture', repository)
    await flushPromises()

    expect(wrapper.get('[data-state="empty"]').element.tagName).toBe('DIV')
    expect(wrapper.find('.article-row').exists()).toBe(false)
  })

  it('shows a retryable semantic error state when the culture index repository fails', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    const repository = {
      ...baseRepository,
      listContents: () => Promise.reject(new Error('文化列表读取失败')),
    } as PlatformRepository

    const { wrapper } = await mountPage(CultureIndexPage, '/culture', repository)
    await flushPromises()

    const state = wrapper.get('[data-state="error"]')
    expect(state.attributes('role')).toBe('alert')
    expect(state.get('button').element.tagName).toBe('BUTTON')
    expect(state.text()).toContain('文化列表读取失败')
  })
})
