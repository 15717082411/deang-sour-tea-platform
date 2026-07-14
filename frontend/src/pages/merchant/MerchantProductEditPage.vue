<script setup lang="ts">
import { ArrowLeft, Image as ImageIcon, Save, Send } from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Product } from "../../domain/types";
import { useMerchantStore } from "../../stores/merchant";
import { resolveAssetUrl } from "../../utils/assetUrl";

const route = useRoute();
const router = useRouter();
const merchant = useMerchantStore();
const routeId = computed(() =>
  typeof route.params.id === "string" ? route.params.id : null,
);
const isNew = computed(() => route.name === "merchant-product-new");
const currentProduct = ref<Product | null>(null);
const localError = ref<string | null>(null);
const feedback = ref<string | null>(null);
const form = reactive({
  name: "",
  category: "",
  priceYuan: "",
  stock: 0,
  description: "",
  image: "",
});
const canEdit = computed(
  () =>
    currentProduct.value === null ||
    ["DRAFT", "REJECTED"].includes(currentProduct.value.status),
);

function fillForm(product: Product) {
  currentProduct.value = product;
  Object.assign(form, {
    name: product.name,
    category: product.category,
    priceYuan: (product.priceCents / 100).toFixed(2),
    stock: product.stock,
    description: product.description,
    image: product.image,
  });
}

onMounted(async () => {
  if (isNew.value) return;
  try {
    if (merchant.products.length === 0) await merchant.loadWorkspace();
    const product = merchant.products.find(({ id }) => id === routeId.value);
    if (product === undefined) {
      localError.value = "商品不存在或不属于当前商家";
      return;
    }
    fillForm(product);
  } catch {
    // Store error is rendered below.
  }
});

function toPriceCents(): number | null {
  const value = form.priceYuan.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

async function save(submitAfterSave = false) {
  localError.value = null;
  feedback.value = null;
  const priceCents = toPriceCents();
  if (
    !form.name.trim() ||
    !form.category.trim() ||
    !form.description.trim() ||
    !form.image.trim()
  ) {
    localError.value = "请完整填写商品名称、分类、介绍和图片地址";
    return;
  }
  if (priceCents === null) {
    localError.value = "请输入大于 0 且最多两位小数的商品价格";
    return;
  }
  if (!Number.isSafeInteger(form.stock) || form.stock < 0) {
    localError.value = "库存必须是大于等于 0 的整数";
    return;
  }
  try {
    const product = await merchant.saveProduct({
      ...(currentProduct.value === null ? {} : { id: currentProduct.value.id }),
      name: form.name.trim(),
      category: form.category.trim(),
      priceCents,
      stock: form.stock,
      description: form.description.trim(),
      image: form.image.trim(),
    });
    fillForm(product);
    if (isNew.value)
      await router.replace(`/merchant/products/${product.id}/edit`);
    if (submitAfterSave) {
      fillForm(await merchant.submitProduct(product.id));
      feedback.value = "商品已保存并提交审核";
    } else {
      feedback.value = "商品草稿已保存";
    }
  } catch {
    // Store error is rendered below.
  }
}
</script>

<template>
  <article class="workspace-page workspace-page--narrow">
    <RouterLink
      class="workspace-back"
      to="/merchant/products"
    >
      <ArrowLeft :size="18" />返回商品列表
    </RouterLink>
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          商品管理
        </p>
        <h1>{{ isNew ? "新增商品" : "编辑商品" }}</h1>
        <p>保存为草稿后，可提交管理员审核。</p>
      </div>
      <span
        v-if="currentProduct"
        :class="[
          'workspace-status',
          `workspace-status--${currentProduct.status.toLowerCase()}`,
        ]"
      >{{ currentProduct.status }}</span>
    </header>

    <p
      v-if="feedback"
      class="workspace-alert workspace-alert--success"
      role="status"
    >
      {{ feedback }}
    </p>
    <p
      v-if="localError || merchant.error"
      class="workspace-alert"
      role="alert"
    >
      {{ localError ?? merchant.error }}
    </p>
    <p
      v-if="!canEdit"
      class="workspace-alert workspace-alert--neutral"
    >
      当前状态不可编辑。待审核商品需等待管理员处理，已上架商品保持当前公开信息。
    </p>

    <form
      class="workspace-product-editor"
      @submit.prevent="save(false)"
    >
      <div class="workspace-form workspace-product-editor__fields">
        <div class="workspace-form__grid">
          <label class="workspace-form__wide">商品名称<input
            v-model="form.name"
            :disabled="!canEdit"
            maxlength="60"
            placeholder="例如：德昂古树酸茶体验装"
          ></label>
          <label>商品分类<input
            v-model="form.category"
            :disabled="!canEdit"
            maxlength="30"
            placeholder="体验装 / 酸茶礼盒"
          ></label>
          <label>销售价格（元）<input
            v-model="form.priceYuan"
            :disabled="!canEdit"
            inputmode="decimal"
            placeholder="59.00"
          ></label>
          <label>库存数量<input
            v-model.number="form.stock"
            :disabled="!canEdit"
            type="number"
            min="0"
            step="1"
          ></label>
          <label class="workspace-form__wide">商品图片地址<input
            v-model="form.image"
            :disabled="!canEdit"
            placeholder="/images/product-tasting.webp"
          ></label>
          <label class="workspace-form__wide">商品介绍<textarea
            v-model="form.description"
            :disabled="!canEdit"
            rows="7"
            maxlength="1000"
            placeholder="介绍原料、风味、规格与适用场景"
          />
          </label>
        </div>
        <div
          v-if="canEdit"
          class="workspace-form__actions"
        >
          <button
            type="submit"
            class="workspace-button"
            :disabled="merchant.pendingOperations > 0"
          >
            <Save :size="18" />保存草稿
          </button><button
            type="button"
            class="workspace-button workspace-button--primary"
            :disabled="merchant.pendingOperations > 0"
            @click="save(true)"
          >
            <Send :size="18" />保存并提交
          </button>
        </div>
      </div>

      <aside class="product-image-preview">
        <p class="workspace-eyebrow">
          商品预览
        </p>
        <img
          v-if="form.image"
          :src="resolveAssetUrl(form.image)"
          :alt="form.name ? `${form.name}预览` : '商品图片预览'"
        >
        <div v-else>
          <ImageIcon :size="32" /><span>填写图片地址后显示预览</span>
        </div>
        <h2>{{ form.name || "商品名称" }}</h2>
        <p>{{ form.description || "商品介绍将显示在这里。" }}</p>
      </aside>
    </form>
  </article>
</template>
