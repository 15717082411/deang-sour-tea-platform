<script setup lang="ts">
import { RotateCcw, Search, ShoppingCart } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import ProductCard from '../../components/shop/ProductCard.vue'
import { useCatalogStore } from '../../stores/catalog'

const catalog = useCatalogStore()
const keyword = ref('')
const category = ref('')
const sort = ref('')
const inStock = ref(false)

const products = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  let result = catalog.products.filter((product) => (
    (!normalizedKeyword || `${product.name}${product.description}${product.merchantName ?? ''}`.toLowerCase().includes(normalizedKeyword))
    && (!category.value || product.category === category.value)
    && (!inStock.value || product.stock > 0)
  ))
  if (sort.value === 'PRICE_ASC') result = [...result].sort((a, b) => a.priceCents - b.priceCents)
  if (sort.value === 'PRICE_DESC') result = [...result].sort((a, b) => b.priceCents - a.priceCents)
  return result
})

function resetFilters() {
  keyword.value = ''
  category.value = ''
  sort.value = ''
  inStock.value = false
}

onMounted(() => catalog.load().catch(() => undefined))
</script>

<template>
  <main class="commerce-page shop-page">
    <header class="commerce-heading commerce-container">
      <div>
        <p class="commerce-kicker">
          德昂酸茶好物
        </p>
        <h1>酸茶商城</h1>
        <p>从工坊体验装到古树酸茶礼盒，查看实时价格与库存。</p>
      </div>
      <RouterLink
        to="/cart"
        class="commerce-button"
      >
        <ShoppingCart
          :size="19"
          aria-hidden="true"
        />购物车
      </RouterLink>
    </header>

    <section
      class="commerce-toolbar"
      aria-label="商品筛选"
    >
      <div class="commerce-container commerce-toolbar__inner">
        <label class="search-field">
          <span>搜索商品</span>
          <span class="search-field__control"><Search
            :size="18"
            aria-hidden="true"
          /><input
            v-model="keyword"
            name="keyword"
            type="search"
            placeholder="商品、工坊或风味"
          ></span>
        </label>
        <label><span>分类</span><select
          v-model="category"
          name="category"
        ><option value="">全部分类</option><option
          v-for="item in catalog.categories"
          :key="item"
          :value="item"
        >{{ item }}</option></select></label>
        <label><span>价格排序</span><select
          v-model="sort"
          name="sort"
        ><option value="">默认排序</option><option value="PRICE_ASC">价格从低到高</option><option value="PRICE_DESC">价格从高到低</option></select></label>
        <label class="checkbox-field"><input
          v-model="inStock"
          name="inStock"
          type="checkbox"
        >仅看有货</label>
        <button
          type="button"
          class="icon-action"
          aria-label="重置筛选"
          title="重置筛选"
          @click="resetFilters"
        >
          <RotateCcw
            :size="19"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>

    <section
      class="commerce-container commerce-results"
      aria-live="polite"
    >
      <p
        v-if="catalog.loading"
        class="commerce-state"
        role="status"
      >
        正在加载商品…
      </p>
      <div
        v-else-if="catalog.error"
        class="commerce-state commerce-state--error"
        role="alert"
      >
        <p>{{ catalog.error }}</p><button
          type="button"
          class="commerce-button"
          @click="catalog.load"
        >
          重新加载
        </button>
      </div>
      <div
        v-else-if="products.length"
        class="product-grid"
      >
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
        />
      </div>
      <div
        v-else
        class="commerce-state"
      >
        <h2>没有符合条件的商品</h2><p>调整筛选条件，或重置后查看全部商品。</p><button
          type="button"
          class="commerce-button"
          @click="resetFilters"
        >
          重置筛选
        </button>
      </div>
    </section>
  </main>
</template>
