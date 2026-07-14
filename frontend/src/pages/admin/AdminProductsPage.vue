<script setup lang="ts">
import { PackageSearch } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import ReviewDialog from '../../components/admin/ReviewDialog.vue'
import FilterBar from '../../components/workspace/FilterBar.vue'
import type { Product, ProductStatus, ReviewDecision } from '../../domain/types'
import { useAdminStore } from '../../stores/admin'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { formatMoney } from '../../utils/money'

const admin = useAdminStore()
const keyword = ref('')
const status = ref('PENDING')
const selected = ref<Product | null>(null)
const dialogOpen = ref(false)
const labels: Record<ProductStatus, string> = { DRAFT: '草稿', PENDING: '待审核', APPROVED: '已上架', REJECTED: '已驳回', OFF_SHELF: '已下架' }
const statusOptions = [{ label: '全部状态', value: 'ALL' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]
const products = computed(() => admin.products.filter((product) => {
  const matches = `${product.name}${product.category}${product.merchantName ?? product.merchantId}${product.description}`.toLowerCase().includes(keyword.value.trim().toLowerCase())
  return matches && (status.value === 'ALL' || product.status === status.value)
}))

onMounted(() => { void admin.loadProducts().catch(() => undefined) })
function openReview(product: Product) { selected.value = product; dialogOpen.value = true }
async function decide(decision: ReviewDecision) {
  if (!selected.value) return
  try {
    await admin.reviewProduct(selected.value.id, decision)
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
          商品治理
        </p><h1>商品审核</h1><p>审核商家提交的酸茶商品信息，审核通过后进入公开商城。</p>
      </div><span class="workspace-count">{{ admin.productStatusCounts.PENDING }} 件待审核</span>
    </header>
    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索商品、分类或商家"
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
      v-if="admin.loading && admin.products.length === 0"
      class="workspace-state"
    >
      正在加载商品…
    </section>
    <section
      v-else-if="products.length === 0"
      class="workspace-empty"
    >
      <PackageSearch :size="28" /><h2>没有符合条件的商品</h2>
    </section>
    <div
      v-else
      class="admin-product-grid"
    >
      <article
        v-for="product in products"
        :key="product.id"
        class="admin-product-item"
      >
        <img
          :src="resolveAssetUrl(product.image)"
          :alt="`${product.name}图片`"
        ><div>
          <span :class="['workspace-status', `workspace-status--${product.status.toLowerCase()}`]">{{ labels[product.status] }}</span><h2>{{ product.name }}</h2><p>{{ product.merchantName ?? product.merchantId }} · {{ product.category }}</p><strong>{{ formatMoney(product.priceCents) }} · 库存 {{ product.stock }}</strong><small>{{ product.description }}</small><p
            v-if="product.reviewReason"
            class="admin-review-reason"
          >
            审核说明：{{ product.reviewReason }}
          </p>
        </div><button
          v-if="product.status === 'PENDING'"
          type="button"
          class="workspace-button workspace-button--primary"
          @click="openReview(product)"
        >
          审核商品
        </button>
      </article>
    </div>
    <ReviewDialog
      :open="dialogOpen"
      :subject="selected?.name ?? ''"
      kind="商品"
      :pending="admin.pendingOperations > 0"
      @close="dialogOpen = false"
      @decide="decide"
    />
  </article>
</template>
