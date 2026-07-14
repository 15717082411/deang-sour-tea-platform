<script setup lang="ts">
import { Store, UserRoundSearch } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import ReviewDialog from '../../components/admin/ReviewDialog.vue'
import FilterBar from '../../components/workspace/FilterBar.vue'
import type { MerchantApplication, ReviewDecision } from '../../domain/types'
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()
const keyword = ref('')
const status = ref('PENDING')
const selected = ref<MerchantApplication | null>(null)
const dialogOpen = ref(false)
const labels = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' } as const
const statusOptions = [{ label: '全部状态', value: 'ALL' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]
const applications = computed(() => admin.merchantApplications.filter((application) => {
  const matches = `${application.shopName}${application.contact}${application.location}${application.introduction}`.toLowerCase().includes(keyword.value.trim().toLowerCase())
  return matches && (status.value === 'ALL' || application.status === status.value)
}))

onMounted(() => { void admin.loadMerchants().catch(() => undefined) })

function openReview(application: MerchantApplication) {
  selected.value = application
  dialogOpen.value = true
}

async function decide(decision: ReviewDecision) {
  if (!selected.value) return
  try {
    await admin.reviewMerchant(selected.value.id, decision)
    dialogOpen.value = false
  } catch {
    // Store error is rendered below.
  }
}
</script>

<template>
  <article class="workspace-page">
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          资质审核
        </p><h1>商家入驻审核</h1><p>核对店铺、联系方式、所在地与经营介绍后给出审核结论。</p>
      </div><span class="workspace-count">{{ admin.merchantApplications.filter(({ status: itemStatus }) => itemStatus === 'PENDING').length }} 项待审核</span>
    </header>
    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索店铺、联系人或所在地"
    />
    <p
      v-if="admin.feedback"
      class="workspace-alert workspace-alert--success"
      role="status"
    >
      {{ admin.feedback }}
    </p>
    <p
      v-if="admin.error"
      class="workspace-alert"
      role="alert"
    >
      {{ admin.error }}
    </p>
    <section
      v-if="admin.loading && admin.merchantApplications.length === 0"
      class="workspace-state"
    >
      正在加载申请…
    </section>
    <section
      v-else-if="applications.length === 0"
      class="workspace-empty"
    >
      <UserRoundSearch :size="28" /><h2>没有符合条件的申请</h2><p>调整筛选条件后重试。</p>
    </section>
    <section
      v-else
      class="admin-review-list"
    >
      <article
        v-for="application in applications"
        :key="application.id"
        class="admin-review-item"
      >
        <div class="admin-review-item__icon">
          <Store :size="24" />
        </div>
        <div>
          <span :class="['workspace-status', `workspace-status--${application.status.toLowerCase()}`]">{{ labels[application.status] }}</span><h2>{{ application.shopName }}</h2><p>{{ application.location }} · {{ application.contact }}</p><small>{{ application.introduction }}</small><p
            v-if="application.reviewReason"
            class="admin-review-reason"
          >
            审核说明：{{ application.reviewReason }}
          </p>
        </div>
        <dl><div><dt>申请账号</dt><dd>{{ application.userId }}</dd></div><div><dt>提交时间</dt><dd>{{ new Date(application.createdAt).toLocaleString('zh-CN') }}</dd></div></dl>
        <button
          v-if="application.status === 'PENDING'"
          type="button"
          class="workspace-button workspace-button--primary"
          @click="openReview(application)"
        >
          审核资料
        </button>
      </article>
    </section>
    <ReviewDialog
      :open="dialogOpen"
      :subject="selected?.shopName ?? ''"
      kind="商家"
      :pending="admin.pendingOperations > 0"
      @close="dialogOpen = false"
      @decide="decide"
    />
  </article>
</template>
