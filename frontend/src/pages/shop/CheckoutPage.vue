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
const loading = ref(true)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)

async function loadCart() {
  loading.value = true
  loadError.value = null
  try {
    await cart.load()
  } catch (caught) {
    loadError.value = caught instanceof Error ? caught.message : '购物车加载失败'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (loading.value || loadError.value !== null || group.value === null || group.value.invalid) return
  submitError.value = null
  try {
    const order = await orders.checkout(merchantId.value, contact)
    await router.push(`/payment/${order.id}`)
  } catch (caught) {
    submitError.value = caught instanceof Error ? caught.message : '订单创建失败'
  }
}

onMounted(loadCart)
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
      v-if="loading"
      class="commerce-state"
      role="status"
    >
      正在核对商品…
    </p>
    <div
      v-else-if="loadError"
      class="commerce-state commerce-state--error"
      data-testid="checkout-load-error"
      role="alert"
    >
      <h2>购物车加载失败</h2><p>{{ loadError }}</p><button
        type="button"
        class="commerce-button"
        @click="loadCart"
      >
        重新加载
      </button>
    </div>
    <div
      v-else-if="!group"
      class="commerce-state"
      data-testid="checkout-missing-group"
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
        data-testid="checkout-products"
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
            ><span class="checkout-line__info"><span>{{ item.product?.name }} × {{ item.quantity }}</span><small
              v-if="item.invalidReason"
              data-testid="checkout-invalid-reason"
            >{{ item.invalidReason }}</small></span><strong>¥{{ (item.subtotalCents / 100).toFixed(2) }}</strong>
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
          v-if="group.invalid"
          class="commerce-feedback commerce-feedback--error"
          data-testid="checkout-invalid-actions"
          role="alert"
        >
          部分商品已失效，请返回购物车调整，或重新核对当前商品信息。
          <span class="checkout-invalid-actions"><RouterLink
            to="/cart"
            class="commerce-button"
          >返回购物车</RouterLink><button
            type="button"
            class="commerce-button"
            @click="loadCart"
          >重新核对</button></span>
        </p>
        <p
          v-if="submitError"
          class="commerce-feedback commerce-feedback--error"
          role="alert"
        >
          {{ submitError }}
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
