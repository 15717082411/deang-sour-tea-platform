<script setup lang="ts">
import { ShoppingBag } from 'lucide-vue-next'
import type { Product } from '../../domain/types'
import { resolveAssetUrl } from '../../utils/assetUrl'

defineProps<{ product: Product }>()
</script>

<template>
  <article
    class="product-card"
    data-testid="product-card"
  >
    <RouterLink
      :to="`/shop/${product.id}`"
      class="product-card__image-link"
    >
      <img
        :src="resolveAssetUrl(product.image)"
        :alt="product.name"
      >
    </RouterLink>
    <div class="product-card__body">
      <p class="product-card__merchant">
        {{ product.merchantName || '酸茶工坊' }}
      </p>
      <h2>
        <RouterLink :to="`/shop/${product.id}`">
          {{ product.name }}
        </RouterLink>
      </h2>
      <p class="product-card__description">
        {{ product.description }}
      </p>
      <div class="product-card__footer">
        <strong>¥{{ (product.priceCents / 100).toFixed(2) }}</strong>
        <RouterLink
          :to="`/shop/${product.id}`"
          class="icon-action"
          :aria-label="`查看${product.name}`"
          title="查看商品"
        >
          <ShoppingBag
            :size="19"
            aria-hidden="true"
          />
        </RouterLink>
      </div>
    </div>
  </article>
</template>
