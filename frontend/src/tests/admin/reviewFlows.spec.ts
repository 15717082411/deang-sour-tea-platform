import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Actor, ContentInput } from '../../domain/types'
import { createDemoRepository } from '../../data/demoRepository'
import { createAppRouter } from '../../router'
import ReviewDialog from '../../components/admin/ReviewDialog.vue'
import AdminContentsPage from '../../pages/admin/AdminContentsPage.vue'
import { useAdminStore } from '../../stores/admin'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'

const actorFor = (user: { id: string; role: Actor['role']; merchantId?: string }): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
})

const draftContent: ContentInput = {
  title: '酸茶发酵观察记录',
  slug: 'fermentation-field-notes',
  category: '工坊记录',
  summary: '记录德昂族酸茶工坊中的发酵观察。',
  body: '正文第一段。\n\n正文第二段。',
  cover: '/images/craft-fermentation.webp',
  sources: [{
    title: '德昂族酸茶制作技艺',
    publisher: '中国非物质文化遗产网',
    url: 'https://www.ihchina.cn/project_details/23582/',
    claim: '用于支持制作技艺相关信息。',
  }],
  published: false,
}

describe('admin review repository flows', () => {
  beforeEach(() => window.localStorage.clear())

  it('allows only ADMIN to read private review queues', async () => {
    const repository = createDemoRepository(window.localStorage)
    const user = await repository.login({ username: 'user_demo', password: 'Demo123!' })
    const merchant = await repository.login({ username: 'merchant_demo', password: 'Demo123!' })
    const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })

    await expect(repository.listMerchantApplications(actorFor(user.user))).rejects.toThrow()
    await expect(repository.listAdminProducts(actorFor(merchant.user))).rejects.toThrow()
    await expect(repository.listAdminContents(actorFor(user.user))).rejects.toThrow()
    expect((await repository.listAdminProducts(actorFor(admin.user))).some(({ status }) => status === 'PENDING')).toBe(true)
    expect(await repository.listAdminContents(actorFor(admin.user))).toHaveLength(2)
  })

  it('requires a rejection reason and prevents repeated merchant review', async () => {
    const repository = createDemoRepository(window.localStorage)
    const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })
    const actor = actorFor(admin.user)

    await expect(repository.reviewMerchant(actor, 'merchant-application-pending', { result: 'REJECT', reason: ' ' })).rejects.toThrow('理由')
    const rejected = await repository.reviewMerchant(actor, 'merchant-application-pending', { result: 'REJECT', reason: '经营资料不完整' })

    expect(rejected).toMatchObject({ status: 'REJECTED', reviewReason: '经营资料不完整' })
    await expect(repository.reviewMerchant(actor, rejected.id, { result: 'APPROVE' })).rejects.toThrow()
  })

  it('approves a pending merchant and persists the merchant identity', async () => {
    const repository = createDemoRepository(window.localStorage)
    const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })

    const approved = await repository.reviewMerchant(actorFor(admin.user), 'merchant-application-pending', { result: 'APPROVE', reason: '资料完整' })
    const merchant = await repository.login({ username: 'user_demo', password: 'Demo123!' })

    expect(approved.status).toBe('APPROVED')
    expect(merchant.user).toMatchObject({ role: 'MERCHANT', merchantStatus: 'APPROVED', merchantId: expect.any(String) })
  })

  it('requires a product rejection reason and allows each pending product to be reviewed once', async () => {
    const repository = createDemoRepository(window.localStorage)
    const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })
    const actor = actorFor(admin.user)

    await expect(repository.reviewProduct(actor, 'product-pending', { result: 'REJECT' })).rejects.toThrow('理由')
    const approved = await repository.reviewProduct(actor, 'product-pending', { result: 'APPROVE', reason: '信息完整' })

    expect(approved.status).toBe('APPROVED')
    await expect(repository.reviewProduct(actor, approved.id, { result: 'REJECT', reason: '重复操作' })).rejects.toThrow()
  })

  it('creates, edits, publishes and unpublishes content with source metadata', async () => {
    const repository = createDemoRepository(window.localStorage)
    const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })
    const actor = actorFor(admin.user)
    const created = await repository.saveContent(actor, draftContent)

    expect(created).toMatchObject({ ...draftContent, id: expect.any(String), published: false })
    expect((await repository.listContents()).some(({ id }) => id === created.id)).toBe(false)

    const published = await repository.saveContent(actor, { ...draftContent, id: created.id, title: '酸茶发酵田野记录', published: true })
    expect((await repository.getContent(published.slug)).title).toBe('酸茶发酵田野记录')

    await repository.saveContent(actor, { ...draftContent, id: created.id, published: false })
    await expect(repository.getContent(created.slug)).rejects.toThrow()
    await expect(repository.saveContent(actor, { ...draftContent, title: '', slug: 'bad content' })).rejects.toThrow()
  })
})

describe('admin review UI contracts', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('does not emit a rejection until the reviewer enters a reason', async () => {
    const wrapper = mount(ReviewDialog, {
      props: { open: true, subject: '山野酸茶小铺', kind: '商家' },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.get('[data-testid="review-reject"]').trigger('click')
    expect(wrapper.text()).toContain('请填写驳回理由')
    expect(wrapper.emitted('decide')).toBeUndefined()

    await wrapper.get('textarea').setValue('经营介绍需要补充')
    await wrapper.get('[data-testid="review-reject"]').trigger('click')
    expect(wrapper.emitted('decide')?.[0]).toEqual([{ result: 'REJECT', reason: '经营介绍需要补充' }])
  })

  it('loads dashboard metrics and wires every admin route to a real lazy page', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore(pinia).setRepository(createDemoRepository(window.localStorage))
    await useAuthStore(pinia).login({ username: 'admin_demo', password: 'Demo123!' })
    const admin = useAdminStore(pinia)
    await admin.loadDashboard()
    expect(admin.metrics).toMatchObject({ orderCount: 2, productCount: 3, bookingCount: 1, afterSaleCount: 1 })

    const router = createAppRouter(pinia)
    for (const path of ['/admin', '/admin/merchants', '/admin/products', '/admin/contents', '/admin/bookings']) {
      const matched = router.resolve(path).matched
      const leaf = matched[matched.length - 1]
      expect(typeof leaf?.components?.default, path).toBe('function')
    }
    await flushPromises()
  })

  it('publishes a content form without cloning the Vue reactive proxy', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore(pinia).setRepository(createDemoRepository(window.localStorage))
    await useAuthStore(pinia).login({ username: 'admin_demo', password: 'Demo123!' })
    const wrapper = mount(AdminContentsPage, {
      global: { plugins: [pinia], stubs: { Teleport: true } },
    })
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('新建内容'))!.trigger('click')
    const editor = wrapper.get('.admin-content-editor')
    const inputs = editor.findAll('input')
    const textareas = editor.findAll('textarea')
    for (const [index, value] of [
      [0, '响应式内容发布测试'], [1, 'reactive-content-test'], [2, '酸茶科普'],
      [3, '/images/hero-sour-tea.webp'], [4, '德昂族酸茶制作技艺'],
      [5, '中国非物质文化遗产网'], [6, 'https://www.ihchina.cn/'],
    ] as const) await inputs[index].setValue(value)
    for (const [index, value] of [
      [0, '用于组件回归测试的摘要。'], [1, '用于组件回归测试的正文。'], [2, '支持相关非遗事实。'],
    ] as const) await textareas[index].setValue(value)

    await editor.findAll('button').find((button) => button.text().includes('保存并发布'))!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(useAdminStore(pinia).contents).toContainEqual(expect.objectContaining({ slug: 'reactive-content-test', published: true }))
  })
})
