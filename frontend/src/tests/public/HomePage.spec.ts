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
    const action = wrapper.get('[data-testid="primary-journey-action"]')
    expect(action.text()).toBe('开始酸茶之旅')
    expect(action.attributes('href')).toBe('/journey')
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

  it('shows a useful not-found state when a culture article does not exist', async () => {
    const baseRepository = createDemoRepository(window.localStorage)
    const repository = {
      ...baseRepository,
      getContent: () => Promise.reject(new Error('内容不存在')),
    } as PlatformRepository

    const { wrapper } = await mountPage(CultureDetailPage, '/culture/missing-article', repository)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('没有找到这篇内容')
    expect(wrapper.get('a').text()).toContain('返回文化专题')
  })
})
