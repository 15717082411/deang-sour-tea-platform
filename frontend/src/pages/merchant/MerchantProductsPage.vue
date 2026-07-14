<script setup lang="ts">
import { Boxes, FilePenLine, Send } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import FilterBar from "../../components/workspace/FilterBar.vue";
import type { ProductStatus } from "../../domain/types";
import { useMerchantStore } from "../../stores/merchant";
import { resolveAssetUrl } from "../../utils/assetUrl";
import { formatMoney } from "../../utils/money";

const merchant = useMerchantStore();
const router = useRouter();
const keyword = ref("");
const status = ref("ALL");
const page = ref(1);
const pageSize = 8;
const feedback = ref<string | null>(null);

const statusLabels: Record<ProductStatus, string> = {
  DRAFT: "草稿",
  PENDING: "待审核",
  APPROVED: "已上架",
  REJECTED: "已驳回",
  OFF_SHELF: "已下架",
};
const statusOptions = [
  { label: "全部状态", value: "ALL" },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
];
const filteredProducts = computed(() =>
  merchant.products.filter((product) => {
    const matchesKeyword =
      `${product.name}${product.category}${product.description}`
        .toLowerCase()
        .includes(keyword.value.trim().toLowerCase());
    return (
      matchesKeyword &&
      (status.value === "ALL" || product.status === status.value)
    );
  }),
);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredProducts.value.length / pageSize)),
);
const pagedProducts = computed(() =>
  filteredProducts.value.slice(
    (page.value - 1) * pageSize,
    page.value * pageSize,
  ),
);

watch([keyword, status], () => {
  page.value = 1;
});
onMounted(() => {
  if (merchant.products.length === 0)
    void merchant.loadWorkspace().catch(() => undefined);
});

async function submitProduct(productId: string) {
  feedback.value = null;
  try {
    await merchant.submitProduct(productId);
    feedback.value = "商品已提交管理员审核";
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
          商品管理
        </p>
        <h1>酸茶商品</h1>
        <p>维护草稿并提交平台审核，审核通过后进入商城公开目录。</p>
      </div>
      <span class="workspace-count">{{ merchant.products.length }} 件商品</span>
    </header>

    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索商品名称、分类或介绍"
      action-label="新增商品"
      @action="router.push('/merchant/products/new')"
    />
    <p
      v-if="feedback"
      class="workspace-alert workspace-alert--success"
      role="status"
    >
      {{ feedback }}
    </p>
    <p
      v-if="merchant.error"
      class="workspace-alert"
      role="alert"
    >
      {{ merchant.error }}
    </p>

    <section
      v-if="merchant.loading && merchant.products.length === 0"
      class="workspace-state"
    >
      正在加载商品…
    </section>
    <section
      v-else-if="pagedProducts.length === 0"
      class="workspace-empty"
    >
      <Boxes :size="28" />
      <h2>没有符合条件的商品</h2>
      <p>调整筛选条件，或新建第一件酸茶商品。</p>
    </section>
    <template v-else>
      <div class="workspace-table-wrap">
        <table class="workspace-table">
          <thead>
            <tr>
              <th>商品</th>
              <th>状态</th>
              <th>价格</th>
              <th>库存</th>
              <th>销量</th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in pagedProducts"
              :key="product.id"
            >
              <td>
                <div class="workspace-product-cell">
                  <img
                    :src="resolveAssetUrl(product.image)"
                    :alt="`${product.name}图片`"
                  >
                  <div>
                    <strong>{{ product.name }}</strong><span>{{ product.category }}</span><small v-if="product.reviewReason">驳回原因：{{ product.reviewReason }}</small>
                  </div>
                </div>
              </td>
              <td>
                <span
                  :class="[
                    'workspace-status',
                    `workspace-status--${product.status.toLowerCase()}`,
                  ]"
                >{{ statusLabels[product.status] }}</span>
              </td>
              <td>{{ formatMoney(product.priceCents) }}</td>
              <td>{{ product.stock }}</td>
              <td>{{ product.sales }}</td>
              <td>
                <div class="workspace-row-actions">
                  <RouterLink
                    class="workspace-icon-button"
                    :to="`/merchant/products/${product.id}/edit`"
                    :aria-label="`编辑${product.name}`"
                    title="编辑商品"
                  >
                    <FilePenLine :size="18" />
                  </RouterLink><button
                    v-if="product.status === 'DRAFT'"
                    class="workspace-icon-button"
                    type="button"
                    :disabled="merchant.pendingOperations > 0"
                    :aria-label="`提交${product.name}审核`"
                    title="提交审核"
                    @click="submitProduct(product.id)"
                  >
                    <Send :size="18" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="workspace-mobile-list">
        <article
          v-for="product in pagedProducts"
          :key="product.id"
          class="workspace-mobile-item"
        >
          <img
            :src="resolveAssetUrl(product.image)"
            :alt="`${product.name}图片`"
          >
          <div>
            <span
              :class="[
                'workspace-status',
                `workspace-status--${product.status.toLowerCase()}`,
              ]"
            >{{ statusLabels[product.status] }}</span>
            <h2>{{ product.name }}</h2>
            <p>
              {{ product.category }} · 库存 {{ product.stock }} · 销量
              {{ product.sales }}
            </p>
            <strong>{{ formatMoney(product.priceCents) }}</strong>
          </div>
          <div class="workspace-row-actions">
            <RouterLink
              class="workspace-icon-button"
              :to="`/merchant/products/${product.id}/edit`"
              aria-label="编辑商品"
            >
              <FilePenLine :size="18" />
            </RouterLink><button
              v-if="product.status === 'DRAFT'"
              class="workspace-icon-button"
              type="button"
              aria-label="提交审核"
              :disabled="merchant.pendingOperations > 0"
              @click="submitProduct(product.id)"
            >
              <Send :size="18" />
            </button>
          </div>
        </article>
      </div>

      <nav
        class="workspace-pagination"
        aria-label="商品分页"
      >
        <button
          type="button"
          :disabled="page <= 1"
          @click="page -= 1"
        >
          上一页
        </button><span>第 {{ page }} / {{ pageCount }} 页</span><button
          type="button"
          :disabled="page >= pageCount"
          @click="page += 1"
        >
          下一页
        </button>
      </nav>
    </template>
  </article>
</template>
