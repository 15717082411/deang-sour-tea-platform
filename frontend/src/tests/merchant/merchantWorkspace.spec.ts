import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import type {
  Actor,
  MerchantApplicationInput,
  OrderContact,
} from "../../domain/types";
import { createDemoRepository } from "../../data/demoRepository";
import type { PlatformRepository } from "../../data/repository";
import { createAppRouter } from "../../router";
import MerchantApplyPage from "../../pages/merchant/MerchantApplyPage.vue";
import { useAppStore } from "../../stores/app";
import { useAuthStore } from "../../stores/auth";
import { useMerchantStore } from "../../stores/merchant";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const actorFor = (user: {
  id: string;
  role: Actor["role"];
  merchantId?: string;
}): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
});

const applicationInput: MerchantApplicationInput = {
  shopName: "山野酸茶工坊",
  contact: "13800138009",
  location: "云南省德宏州芒市",
  introduction: "专注德昂族酸茶产品与线下体验。",
  agreementAccepted: true,
};

const contact: OrderContact = {
  recipient: "商家测试用户",
  phone: "13800138000",
  address: "云南省德宏州芒市测试路 9 号",
};

async function createApprovedMerchant(
  repository: PlatformRepository,
  username: string,
  phone: string,
) {
  const applicant = await repository.register({
    username,
    password: "Demo123!",
    phone,
  });
  const application = await repository.applyMerchant(
    actorFor(applicant.user),
    applicationInput,
  );
  const admin = await repository.login({
    username: "admin_demo",
    password: "Demo123!",
  });
  await repository.reviewMerchant(actorFor(admin.user), application.id, {
    result: "APPROVE",
    reason: "资料完整",
  });
  return repository.login({ username, password: "Demo123!" });
}

describe("merchant repository workflow", () => {
  it("requires an explicit agreement and prevents a second pending application", async () => {
    const repository = createDemoRepository(new MemoryStorage());
    const applicant = await repository.register({
      username: "agreement-user",
      password: "Demo123!",
      phone: "13800138010",
    });
    const actor = actorFor(applicant.user);

    await expect(
      repository.applyMerchant(actor, {
        ...applicationInput,
        agreementAccepted: false,
      }),
    ).rejects.toThrow("协议");
    const application = await repository.applyMerchant(actor, applicationInput);

    expect(application).toMatchObject({
      userId: applicant.user.id,
      status: "PENDING",
    });
    expect(application.agreementAcceptedAt).toEqual(expect.any(String));
    await expect(
      repository.applyMerchant(actor, applicationInput),
    ).rejects.toThrow("待审核");
  });

  it("lists every status for the persisted merchant and never leaks another shop products", async () => {
    const repository = createDemoRepository(new MemoryStorage());
    const merchant = await repository.login({
      username: "merchant_demo",
      password: "Demo123!",
    });
    const otherMerchant = await createApprovedMerchant(
      repository,
      "other-shop",
      "13800138011",
    );
    const otherProduct = await repository.saveProduct(
      actorFor(otherMerchant.user),
      {
        name: "另一家酸茶体验装",
        category: "体验装",
        priceCents: 6800,
        stock: 8,
        description: "仅另一家商家可见。",
        image: "/images/product-tasting.webp",
      },
    );

    const ownProducts = await repository.listMerchantProducts(
      actorFor(merchant.user),
    );
    const otherProducts = await repository.listMerchantProducts(
      actorFor(otherMerchant.user),
    );

    expect(ownProducts.map(({ status }) => status)).toEqual(
      expect.arrayContaining(["APPROVED", "PENDING"]),
    );
    expect(
      ownProducts.every(
        ({ merchantId }) => merchantId === merchant.user.merchantId,
      ),
    ).toBe(true);
    expect(ownProducts.some(({ id }) => id === otherProduct.id)).toBe(false);
    expect(otherProducts).toEqual([
      expect.objectContaining({ id: otherProduct.id, status: "DRAFT" }),
    ]);
    await expect(
      repository.listMerchantProducts({
        userId: merchant.user.id,
        role: "MERCHANT",
        merchantId: otherMerchant.user.merchantId,
      }),
    ).rejects.toThrow();
  });

  it("validates a positive product price and moves a draft through submission once", async () => {
    const repository = createDemoRepository(new MemoryStorage());
    const merchant = await repository.login({
      username: "merchant_demo",
      password: "Demo123!",
    });
    const actor = actorFor(merchant.user);

    await expect(
      repository.saveProduct(actor, {
        name: "零元商品",
        category: "体验装",
        priceCents: 0,
        stock: 1,
        description: "价格必须大于零。",
        image: "/images/product-tasting.webp",
      }),
    ).rejects.toThrow("价格");

    const draft = await repository.saveProduct(actor, {
      name: "发酵酸茶随行装",
      category: "体验装",
      priceCents: 6900,
      stock: 16,
      description: "用于验证商家商品提交流程。",
      image: "/images/product-tasting.webp",
    });
    const pending = await repository.submitProduct(actor, draft.id);

    expect(draft.status).toBe("DRAFT");
    expect(pending.status).toBe("PENDING");
    await expect(repository.submitProduct(actor, draft.id)).rejects.toThrow();
  });

  it("shows only own orders and allows shipping exactly once from PAID", async () => {
    const repository = createDemoRepository(new MemoryStorage());
    const user = await repository.login({
      username: "user_demo",
      password: "Demo123!",
    });
    const merchant = await repository.login({
      username: "merchant_demo",
      password: "Demo123!",
    });
    const userActor = actorFor(user.user);
    const merchantActor = actorFor(merchant.user);
    const order = await repository.createOrder(
      userActor,
      [{ productId: "product-tasting", quantity: 1 }],
      contact,
      "merchant-ship-once",
    );

    await expect(
      repository.shipOrder(merchantActor, order.id),
    ).rejects.toThrow();
    await repository.payOrder(userActor, order.id, "SUCCESS");
    const shipped = await repository.shipOrder(merchantActor, order.id);

    expect(shipped.status).toBe("SHIPPED");
    expect(
      (await repository.listOrders(merchantActor)).every(
        ({ merchantId }) => merchantId === merchant.user.merchantId,
      ),
    ).toBe(true);
    await expect(
      repository.shipOrder(merchantActor, order.id),
    ).rejects.toThrow();
  });
});

describe("merchant store and routes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
  });

  it("loads live merchant metrics from owned products, orders and after-sales", async () => {
    const repository = createDemoRepository(window.localStorage);
    useAppStore().setRepository(repository);
    await useAuthStore().login({
      username: "merchant_demo",
      password: "Demo123!",
    });
    const merchant = useMerchantStore();

    await merchant.loadWorkspace();

    expect(merchant.metrics).toMatchObject({
      productCount: 3,
      orderCount: 2,
      pendingShipmentCount: 1,
      afterSaleCount: 1,
    });
    expect(merchant.metrics.revenueCents).toBeGreaterThan(0);
    expect(merchant.productStatusCounts.PENDING).toBe(1);
  });

  it("wires application, dashboard, product edit, orders and after-sales to real lazy pages", () => {
    const router = createAppRouter(createPinia());
    for (const path of [
      "/merchant/apply",
      "/merchant",
      "/merchant/products",
      "/merchant/products/new",
      "/merchant/products/product-pending/edit",
      "/merchant/orders",
      "/merchant/after-sales",
    ]) {
      const matched = router.resolve(path).matched;
      const leaf = matched[matched.length - 1];
      expect(leaf, path).toBeDefined();
      expect(typeof leaf?.components?.default, path).toBe("function");
    }
  });

  it("requires agreement confirmation before submitting the merchant application page", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const repository = createDemoRepository(window.localStorage);
    useAppStore(pinia).setRepository(repository);
    const auth = useAuthStore(pinia);
    await auth.register({
      username: "page-applicant",
      password: "Demo123!",
      phone: "13800138012",
    });
    const router = createAppRouter(pinia);
    await router.push("/merchant/apply");
    const wrapper = mount(MerchantApplyPage, {
      global: { plugins: [pinia, router] },
    });
    await flushPromises();

    await wrapper
      .get('input[autocomplete="organization"]')
      .setValue("页面测试酸茶铺");
    await wrapper
      .get('input[autocomplete="tel"]')
      .setValue("13800138012");
    await wrapper
      .get('input[autocomplete="address-level2"]')
      .setValue("云南省德宏州芒市");
    await wrapper.get("textarea").setValue("通过页面提交真实商家申请。");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("请阅读并同意商家入驻协议");
    expect(await repository.getMerchantApplication(auth.user!.id)).toBeNull();

    await wrapper.get('input[type="checkbox"]').setValue(true);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("审核中");
    expect(
      await repository.getMerchantApplication(auth.user!.id),
    ).toMatchObject({ status: "PENDING" });
  });
});
