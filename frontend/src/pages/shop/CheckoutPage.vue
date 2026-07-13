<script setup lang="ts">
import { ArrowLeft, LockKeyhole } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { useOrdersStore } from '../../stores/orders'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const orders = useOrdersStore()
const merchantId = computed(() => String(route.query.merchant ?? ''))
const group = computed(() => cart.groups.find((item) => item.merchantId === merchantId.value) ?? null)
const contact = reactive({ recipient: auth.user?.displayName ?? '', phone: auth.user?.phone ?? '', address: '' })
const error = ref<string | null>(null)

async function submit() {
  error.value = null
  try {
    const order = await orders.checkout(merchantId.value, contact)
    await router.push(`/payment/${order.id}`)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '订单创建失败'
  }
}

onMounted(() => cart.load().catch((caught) => { error.value = caught instanceof Error ? caught.message : '购物车加载失败' }))
</script>

<template>
  <main class="commerce-page commerce-container checkout-page">
    <RouterLink
      to="/cart"
      class="back-link"
    >
      <ArrowLeft
        :size="18"
        aria-hidden="true"
      />返回购物车
    </RouterLink>
    <header class="commerce-heading">
      <div>
        <p class="commerce-kicker">
          确认订单
        </p><h1>结算</h1><p>下单前会重新校验当前价格、商品状态与库存。</p>
      </div><LockKeyhole
        :size="28"
        aria-label="安全校验"
      />
    </header>
    <p
      v-if="cart.loading"
      class="commerce-state"
      role="status"
    >
      正在核对商品…
    </p>
    <div
      v-else-if="!group"
      class="commerce-state"
    >
      <h2>没有可结算的商家商品</h2><p>该组商品可能已被移除或失效。</p><RouterLink
        to="/cart"
        class="commerce-button"
      >
        返回购物车
      </RouterLink>
    </div>
    <div
      v-else
      class="checkout-layout"
    >
      <section
        class="checkout-products"
        aria-labelledby="checkout-products-title"
      >
        <p class="commerce-kicker">
          {{ group.merchantName }}
        </p><h2 id="checkout-products-title">
          商品明细
        </h2>
        <ul>
          <li
            v-for="item in group.items"
            :key="item.productId"
          >
            <img
              v-if="item.product"
              :src="item.product.image"
              :alt="item.product.name"
            ><span>{{ item.product?.name }} × {{ item.quantity }}</span><strong>¥{{ (item.subtotalCents / 100).toFixed(2) }}</strong>
          </li>
        </ul>
        <p class="checkout-products__total">
          应付总额 <strong>¥{{ (group.subtotalCents / 100).toFixed(2) }}</strong>
        </p>
      </section>
      <form
        class="checkout-form"
        @submit.prevent="submit"
      >
        <h2>收货信息</h2>
        <label><span>收件人</span><input
          v-model="contact.recipient"
          name="recipient"
          autocomplete="name"
          required
        ></label>
        <label><span>手机号</span><input
          v-model="contact.phone"
          name="phone"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          maxlength="11"
          required
        ></label>
        <label><span>详细地址</span><textarea
          v-model="contact.address"
          name="address"
          autocomplete="street-address"
          rows="4"
          required
        /></label>
        <p
          v-if="error"
          class="commerce-feedback commerce-feedback--error"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="commerce-button commerce-button--primary"
          :disabled="orders.checkoutPending || group.invalid"
        >
          {{ orders.checkoutPending ? '正在创建订单…' : '创建订单并进入支付' }}
        </button>
      </form>
    </div>
  </main>
</template>
