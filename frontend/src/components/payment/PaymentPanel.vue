<script setup lang="ts">
import { Ban, CheckCircle2, XCircle } from 'lucide-vue-next'

withDefaults(defineProps<{ pending?: boolean }>(), { pending: false })
defineEmits<{ pay: [result: 'SUCCESS' | 'FAILURE' | 'CANCEL'] }>()
</script>

<template>
  <section
    class="payment-panel"
    aria-labelledby="payment-title"
  >
    <p class="commerce-kicker">
      演示环境
    </p>
    <h2 id="payment-title">
      模拟支付
    </h2>
    <p>本页面不会发起真实扣款，请选择一个结果继续演示订单状态。</p>
    <div class="payment-panel__actions">
      <button
        type="button"
        class="commerce-button commerce-button--primary"
        data-result="SUCCESS"
        :disabled="pending"
        @click="$emit('pay', 'SUCCESS')"
      >
        <CheckCircle2
          :size="19"
          aria-hidden="true"
        />支付成功
      </button>
      <button
        type="button"
        class="commerce-button"
        data-result="FAILURE"
        :disabled="pending"
        @click="$emit('pay', 'FAILURE')"
      >
        <XCircle
          :size="19"
          aria-hidden="true"
        />支付失败
      </button>
      <button
        type="button"
        class="commerce-button commerce-button--quiet"
        data-result="CANCEL"
        :disabled="pending"
        @click="$emit('pay', 'CANCEL')"
      >
        <Ban
          :size="19"
          aria-hidden="true"
        />取消订单
      </button>
    </div>
    <p
      v-if="pending"
      role="status"
    >
      正在更新模拟支付结果…
    </p>
  </section>
</template>
