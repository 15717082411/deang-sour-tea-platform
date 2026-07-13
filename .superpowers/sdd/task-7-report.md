# Task 7 实施报告

## 交付信息

- 分支：`codex/vue-final-frontend`
- 提交主题：`Complete simulated commerce flow`
- 提交号：本报告与实现位于同一提交；Git 提交无法稳定内嵌自身哈希，精确提交号记录在最终交付回复中。

## RED 证据

1. Repository 合同测试首次运行：`npm test -- src/tests/data/commerceRepository.spec.ts src/tests/data/demoRepository.spec.ts`
   - 结果：19 failed / 20 passed。
   - 代表性失败：`mergeCart` 不存在；actor 被旧接口当作 userId，触发“用户不存在”；旧接口无法验证角色、归属和幂等键。
2. Guest cart 测试首次运行：`npm test -- src/tests/shop/guestCart.spec.ts`
   - 结果：测试套件因缺少 `utils/guestCart` 无法加载。
3. Store/UI 测试首次运行：`npm test -- src/tests/shop`
   - 结果：4 个测试套件失败，缺少 cart/catalog/orders stores、`PaymentPanel` 与真实 `OrderSummaryPage`。

## GREEN 证据

- 商城专项：`npm test -- src/tests/shop`，6 files / 24 tests passed。
- 合同影响范围：`npm test -- src/tests/data src/tests/auth src/tests/router src/tests/domain src/tests/utils`，6 files / 86 tests passed。
- 全量测试：`npm test`，19 files / 160 tests passed。
- 代码规范：`npm run lint`，通过。
- 类型检查：`npm run typecheck`，通过。
- 生产构建：`npm run build`，通过。
- 差异检查：`git diff --check`，通过。

## 实现摘要

- Repository 改为 actor 驱动的购物车、下单、支付合同；仓库层校验真实 USER、订单归属、联系人和幂等键，并在每次操作前刷新 localStorage 快照。
- 新增无价格 `CartRequestLine`；购物车合并按商品求和、库存封顶并使用当前目录价格；支付先完整校验库存再统一扣减，重复成功不会重复扣库存或追加时间线。
- 新增严格白名单、版本化 guest cart；登录、注册和 rehydrate 后尝试合并，失败保留 guest 数据与可恢复提示，认证状态不回滚。
- 新增 catalog/cart/orders stores，支持 actor 隔离、多商家分组、单商家结算、稳定幂等键和共享 in-flight Promise。
- 完成商城列表、商品详情、购物车、结算、模拟支付和订单详情页面；真实懒加载路由及 USER 角色守卫已接入。
- 模拟支付覆盖成功、失败、取消；失败可重试，取消为终态，成功或取消均进入真实订单详情。

## 主要修改文件

- Repository/领域：`frontend/src/data/{repository,demoRepository,seed}.ts`、`frontend/src/domain/types.ts`
- 认证与持久化：`frontend/src/stores/auth.ts`、`frontend/src/utils/guestCart.ts`
- 商城状态：`frontend/src/stores/{catalog,cart,orders}.ts`
- 商城 UI：`frontend/src/pages/shop/*`、`frontend/src/pages/account/OrderSummaryPage.vue`、`frontend/src/components/{shop,payment,orders}/*`
- 路由与样式：`frontend/src/router/index.ts`、`frontend/src/styles/commerce.css`、`frontend/src/components/common/AppHeader.vue`、`frontend/src/layouts/AccountLayout.vue`
- 测试：`frontend/src/tests/data/*`、`frontend/src/tests/shop/*`

## 视觉烟测

- `1440x900`：商城、结算、订单详情无横向溢出，商品图片正常，双列商品布局稳定。
- `390x844`：商城、商品详情、结算、支付、订单详情无横向溢出；主要操作目标不小于 44px；图片 alt 可检查。
- 浏览器实测支付失败后保持待支付且可重试；随后成功进入订单详情，时间线仅出现“订单已创建 / 支付失败 / 支付成功”。

## 残余风险

- 生产构建仍报告主入口 chunk 约 1.08 MB；商城页面已懒加载，但公共依赖仍可在后续任务中进一步拆包。
- localStorage Repository 满足两个实例的顺序操作刷新合同；浏览器多标签页在同一毫秒内真正并发写入仍不具备事务锁，这是 localStorage 存储模型的固有限制。
