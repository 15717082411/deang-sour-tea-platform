<script setup lang="ts">
import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import QuantityStepper from '../../components/shop/QuantityStepper.vue'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { resolveAssetUrl } from '../../utils/assetUrl'

const cart = useCartStore()
const auth = useAuthStore()
const pendingProductId = ref<string | null>(null)
const error = ref<string | null>(null)

async function updateQuantity(productId: string, quantity: number) {
  pendingProductId.value = productId
  error.value = null
  try {
    await cart.setQuantity(productId, quantity)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '数量更新失败'
  } finally {
    pendingProductId.value = null
  }
}

async function remove(productId: string) {
  pendingProductId.value = productId
  try { await cart.remove(productId) } finally { pendingProductId.value = null }
}

async function retryGuestSync() {
  await auth.mergeGuestCart()
  if (auth.cartSyncMessage === null) await cart.load()
}

onMounted(() => cart.load().catch(() => undefined))
</script>

<template>
  <main class="commerce-page commerce-container cart-page">
    <header class="commerce-heading">
      <div>
        <p class="commerce-kicker">
          购买清单
        </p><h1>购物车</h1><p>按商家核对商品，结算后其他商家的商品会继续保留。</p>
      </div>
      <button
        v-if="cart.items.length"
        type="button"
        class="commerce-button commerce-button--quiet"
        @click="cart.clear"
      >
        <Trash2
          :size="18"
          aria-hidden="true"
        />清空购物车
      </button>
    </header>
    <div
      v-if="auth.cartSyncMessage"
      class="commerce-feedback commerce-feedback--error sync-notice"
      role="alert"
    >
      <span>{{ auth.cartSyncMessage }}</span>
      <button
        type="button"
        class="commerce-button"
        @click="retryGuestSync"
      >
        重新同步
      </button>
    </div>
    <p
      v-if="cart.loading"
      class="commerce-state"
      role="status"
    >
      正在加载购物车…
    </p>
    <div
      v-else-if="cart.error"
      class="commerce-state commerce-state--error"
      role="alert"
    >
      <p>{{ cart.error }}</p><button
        type="button"
        class="commerce-button"
        @click="cart.load"
      >
        重新加载
      </button>
    </div>
    <div
      v-else-if="!cart.items.length"
      class="commerce-state"
    >
      <ShoppingBag
        :size="36"
        aria-hidden="true"
      /><h2>购物车还是空的</h2><p>先去挑选一份酸茶商品。</p><RouterLink
        to="/shop"
        class="commerce-button commerce-button--primary"
      >
        浏览商城
      </RouterLink>
    </div>
    <div
      v-else
      class="merchant-groups"
    >
      <section
        v-for="group in cart.groups"
        :key="group.merchantId"
        class="merchant-group"
      >
        <header>
          <div>
            <p class="commerce-kicker">
              商家
            </p><h2>{{ group.merchantName }}</h2>
          </div><strong>小计 ¥{{ (group.subtotalCents / 100).toFixed(2) }}</strong>
        </header>
        <ul class="cart-lines">
          <li
            v-for="item in group.items"
            :key="item.productId"
          >
            <img
              v-if="item.product"
              :src="resolveAssetUrl(item.product.image)"
              :alt="item.product.name"
            >
            <div class="cart-line__info">
              <RouterLink :to="`/shop/${item.productId}`">
                {{ item.product?.name || '商品已不存在' }}
              </RouterLink><span>¥{{ (item.unitPriceCents / 100).toFixed(2) }}</span><p
                v-if="item.invalidReason"
                role="alert"
              >
                {{ item.invalidReason }}
              </p>
            </div>
            <QuantityStepper
              :model-value="item.quantity"
              :max="Math.max(1, item.product?.stock ?? item.quantity)"
              :disabled="pendingProductId === item.productId || item.product === null"
              @update:model-value="updateQuantity(item.productId, $event)"
            />
            <strong>¥{{ (item.subtotalCents / 100).toFixed(2) }}</strong>
            <button
              type="button"
              class="icon-action"
              :aria-label="`删除${item.product?.name || '商品'}`"
              title="删除商品"
              :disabled="pendingProductId === item.productId"
              @click="remove(item.productId)"
            >
              <Trash2
                :size="18"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>
        <footer>
          <span
            v-if="group.invalid"
            class="commerce-feedback commerce-feedback--error"
          >请先处理失效商品</span>
          <RouterLink
            v-else
            :to="{ path: '/checkout', query: { merchant: group.merchantId } }"
            class="commerce-button commerce-button--primary"
          >
            结算本商家<ArrowRight
              :size="18"
              aria-hidden="true"
            />
          </RouterLink>
        </footer>
      </section>
      <p class="cart-total">
        购物车合计 <strong>¥{{ (cart.subtotalCents / 100).toFixed(2) }}</strong>
      </p>
    </div>
    <p
      v-if="error"
      class="commerce-feedback commerce-feedback--error"
      role="alert"
    >
      {{ error }}
    </p>
  </main>
</template>
