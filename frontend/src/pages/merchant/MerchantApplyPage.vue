<script setup lang="ts">
import { CheckCircle2, Clock3, Store, XCircle } from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import AppHeader from "../../components/common/AppHeader.vue";
import ModeBanner from "../../components/common/ModeBanner.vue";
import { useAuthStore } from "../../stores/auth";
import { useMerchantStore } from "../../stores/merchant";

const auth = useAuthStore();
const merchant = useMerchantStore();
const router = useRouter();
const localError = ref<string | null>(null);
const form = reactive({
  shopName: "",
  contact: auth.user?.phone ?? "",
  location: "",
  introduction: "",
  agreementAccepted: false,
});

const status = computed(
  () => merchant.application?.status ?? auth.user?.merchantStatus ?? "NONE",
);
const showForm = computed(
  () => status.value === "NONE" || status.value === "REJECTED",
);

onMounted(async () => {
  if (
    auth.user?.role === "MERCHANT" &&
    auth.user.merchantStatus === "APPROVED"
  ) {
    await router.replace("/merchant");
    return;
  }
  try {
    const application = await merchant.loadApplication();
    if (application?.status === "REJECTED") {
      Object.assign(form, {
        shopName: application.shopName,
        contact: application.contact,
        location: application.location,
        introduction: application.introduction,
      });
    }
  } catch {
    // Store error is rendered below.
  }
});

async function submit() {
  localError.value = null;
  if (
    !form.shopName.trim() ||
    !form.contact.trim() ||
    !form.location.trim() ||
    !form.introduction.trim()
  ) {
    localError.value = "请完整填写店铺、联系、所在地和经营介绍";
    return;
  }
  if (!form.agreementAccepted) {
    localError.value = "请阅读并同意商家入驻协议";
    return;
  }
  try {
    await merchant.apply({ ...form });
  } catch {
    // Store error is rendered below.
  }
}
</script>

<template>
  <ModeBanner />
  <AppHeader />
  <main class="merchant-apply-page">
    <header class="workspace-page__header merchant-apply-page__header">
      <div>
        <p class="workspace-eyebrow">
          商家入驻
        </p>
        <h1>把德昂族酸茶带给更多人</h1>
        <p>
          提交真实经营资料，经平台管理员审核通过后即可管理商品、订单与售后。
        </p>
      </div>
      <Store
        :size="36"
        aria-hidden="true"
      />
    </header>

    <section
      v-if="merchant.loading && merchant.application === null"
      class="workspace-state"
      aria-live="polite"
    >
      <Clock3 :size="24" />
      <p>正在读取申请状态…</p>
    </section>

    <section
      v-else-if="status === 'PENDING'"
      class="merchant-application-status"
    >
      <Clock3
        :size="28"
        aria-hidden="true"
      />
      <div>
        <p class="workspace-eyebrow">
          审核中
        </p>
        <h2>{{ merchant.application?.shopName ?? "商家入驻申请" }}</h2>
        <p>申请已提交，管理员审核后账号身份会自动更新。请勿重复提交。</p>
        <dl v-if="merchant.application">
          <div>
            <dt>联系人</dt>
            <dd>{{ merchant.application.contact }}</dd>
          </div>
          <div>
            <dt>所在地</dt>
            <dd>{{ merchant.application.location }}</dd>
          </div>
          <div>
            <dt>提交时间</dt>
            <dd>
              {{
                new Date(merchant.application.createdAt).toLocaleString("zh-CN")
              }}
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <section
      v-else-if="status === 'APPROVED'"
      class="merchant-application-status merchant-application-status--approved"
    >
      <CheckCircle2 :size="28" />
      <div>
        <h2>入驻已通过</h2>
        <p>商家权限已经生效，可进入商家中心开展经营。</p>
        <RouterLink
          class="workspace-button workspace-button--primary"
          to="/merchant"
        >
          进入商家中心
        </RouterLink>
      </div>
    </section>

    <section
      v-else-if="showForm"
      class="merchant-apply-layout"
    >
      <form
        class="workspace-form merchant-apply-form"
        @submit.prevent="submit"
      >
        <div
          v-if="status === 'REJECTED'"
          class="workspace-alert"
        >
          <XCircle :size="20" />
          <span>上次申请未通过：{{
            merchant.application?.reviewReason ?? "请核对资料后重新提交"
          }}</span>
        </div>
        <div class="workspace-form__grid">
          <label>店铺名称<input
            v-model="form.shopName"
            autocomplete="organization"
            maxlength="40"
            placeholder="例如：山野酸茶工坊"
          ></label>
          <label>联系方式<input
            v-model="form.contact"
            autocomplete="tel"
            maxlength="40"
            placeholder="手机号或常用联系方式"
          ></label>
          <label class="workspace-form__wide">经营所在地<input
            v-model="form.location"
            autocomplete="address-level2"
            maxlength="80"
            placeholder="省 / 市 / 区县 / 乡镇"
          ></label>
          <label class="workspace-form__wide">经营介绍<textarea
            v-model="form.introduction"
            maxlength="500"
            rows="6"
            placeholder="介绍酸茶来源、产品特色与经营计划"
          />
          </label>
        </div>
        <label class="workspace-checkbox"><input
          v-model="form.agreementAccepted"
          type="checkbox"
        ><span>我确认资料真实，并同意平台商家入驻与模拟交易规则</span></label>
        <p
          v-if="localError || merchant.error"
          class="workspace-form__error"
          role="alert"
        >
          {{ localError ?? merchant.error }}
        </p>
        <button
          type="submit"
          class="workspace-button workspace-button--primary"
          :disabled="merchant.pendingOperations > 0"
        >
          {{
            merchant.pendingOperations > 0
              ? "提交中…"
              : status === "REJECTED"
                ? "重新提交审核"
                : "提交入驻申请"
          }}
        </button>
      </form>
      <aside class="merchant-apply-notes">
        <h2>审核资料</h2>
        <ol>
          <li><strong>1</strong><span>店铺名称与经营主体信息清晰</span></li>
          <li>
            <strong>2</strong><span>经营内容聚焦德昂族酸茶及相关体验</span>
          </li>
          <li><strong>3</strong><span>审核通过后使用商家账号重新登录</span></li>
        </ol>
      </aside>
    </section>
  </main>
</template>
