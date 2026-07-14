<script setup lang="ts">
import { ArrowLeft, ShoppingCart, Zap } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuantityStepper from '../../components/shop/QuantityStepper.vue'
import type { Product } from '../../domain/types'
import { useCartStore } from '../../stores/cart'
import { useCatalogStore } from '../../stores/catalog'
import { resolveAssetUrl } from '../../utils/assetUrl'

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const cart = useCartStore()
const product = ref<Product | null>(null)
const quantity = ref(1)
const loading = ref(true)
const pending = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    product.value = await catalog.get(String(route.params.id))
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '商品不存在'
  } finally {
    loading.value = false
  }
}

async function addToCart() {
  if (product.value === null) return
  pending.value = true
  error.value = null
  try {
    await cart.add(product.value.id, quantity.value)
    success.value = '已加入购物车'
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '加入购物车失败'
  } finally {
    pending.value = false
  }
}

async function buyNow() {
  if (product.value === null) return
  await addToCart()
  if (error.value === null) await router.push({ path: '/checkout', query: { merchant: product.value.merchantId } })
}

onMounted(async () => {
  await cart.load().catch(() => undefined)
  await load()
})
</script>

<template>
  <main class="commerce-page commerce-container product-detail-page">
    <RouterLink
      to="/shop"
      class="back-link"
    >
      <ArrowLeft
        :size="18"
        aria-hidden="true"
      />返回商城
    </RouterLink>
    <p
      v-if="loading"
      class="commerce-state"
      role="status"
    >
      正在加载商品…
    </p>
    <div
      v-else-if="error && !product"
      class="commerce-state commerce-state--error"
      role="alert"
    >
      <h1>无法查看商品</h1><p>{{ error }}</p><button
        type="button"
        class="commerce-button"
        @click="load"
      >
        重新加载
      </button>
    </div>
    <article
      v-else-if="product"
      class="product-detail"
    >
      <figure>
        <img
          :src="resolveAssetUrl(product.image)"
          :alt="product.name"
        ><figcaption>商品实拍展示图</figcaption>
      </figure>
      <div class="product-detail__content">
        <p class="commerce-kicker">
          {{ product.category }}
        </p>
        <h1>{{ product.name }}</h1>
        <p class="product-detail__merchant">
          商家：{{ product.merchantName || '酸茶工坊' }}
        </p>
        <p class="product-detail__price">
          ¥{{ (product.priceCents / 100).toFixed(2) }}
        </p>
        <p>{{ product.description }}</p>
        <p
          class="stock-label"
          :class="{ 'stock-label--empty': product.stock === 0 }"
        >
          {{ product.stock > 0 ? `库存 ${product.stock} 件` : '暂时无货' }}
        </p>
        <QuantityStepper
          v-model="quantity"
          :max="Math.max(1, product.stock)"
          :disabled="pending || product.stock === 0"
        />
        <div class="product-detail__actions">
          <button
            type="button"
            class="commerce-button"
            :disabled="pending || product.stock === 0"
            @click="addToCart"
          >
            <ShoppingCart
              :size="19"
              aria-hidden="true"
            />加入购物车
          </button>
          <button
            type="button"
            class="commerce-button commerce-button--primary"
            :disabled="pending || product.stock === 0"
            @click="buyNow"
          >
            <Zap
              :size="19"
              aria-hidden="true"
            />立即购买
          </button>
        </div>
        <p
          v-if="success"
          class="commerce-feedback commerce-feedback--success"
          role="status"
        >
          {{ success }}
        </p>
        <p
          v-if="error"
          class="commerce-feedback commerce-feedback--error"
          role="alert"
        >
          {{ error }}
        </p>
      </div>
    </article>
  </main>
</template>
