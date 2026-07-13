# Task 7 实施报告

## 交付信息

- 分支：`codex/vue-final-frontend`
- 初始提交：`b8c81d3`（`Complete simulated commerce flow`）
- 复核修复提交主题：`fix: harden commerce recovery flows`
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

- 商城专项：`npm test -- src/tests/shop`，7 files / 34 tests passed。
- 合同影响范围：`npm test -- src/tests/data src/tests/auth src/tests/router src/tests/domain src/tests/utils`，6 files / 86 tests passed。
- 全量测试：`npm test`，20 files / 170 tests passed。
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

## 双路复核修复

### RED

- 命令：`npm test -- src/tests/data/commerceRepository.spec.ts src/tests/shop/cart.spec.ts src/tests/shop/checkout.spec.ts src/tests/shop/recoveryPages.spec.ts`
- 结果：4 files 中 3 failed，`9 failed / 19 passed`。
- 复现范围：缺失幂等键仍可建单；A 状态驻留后切 B 首次 add 覆盖 B 原购物车；账号切换不清订单；Payment/OrderSummary 不监听路由并显示旧订单；乱序请求覆盖最新订单；checkout 加载错误被误判为空组；失效原因和恢复操作缺失。
- checkout 清理失败重试用例首次即通过：Repository 中已有订单保持 1 个，稳定 key 重试返回同单并在第二次成功清理目标商家组。
- 最终差异审阅追加竞态 RED：账号在 cart cleanup 等待期间切换时，旧 checkout 错误地 resolve 并恢复 A 的 `currentOrder`；专项结果为 `1 failed / 6 passed`。保存返回后与 remember 前增加 actor 复核后，该文件 `7/7` 通过。

### GREEN

- `createOrder` 的 `idempotencyKey` 改为类型与运行时均必填；空值、`undefined` 和非法格式统一拒绝，同 USER+key 返回同单。
- cart 所有读改写入口先共享加载目标 actor，并在异步写入前复核 owner，账号切换测试确认 B 从 3 增至 5 且 A 不变。
- orders store 在账号切换/登出时重置；订单加载按 userId、expected order id 与请求序号提交，晚到响应无法覆盖最新结果。
- Payment/OrderSummary 使用局部订单并立即监听 auth userId 与路由参数；错误优先渲染，不再泄露旧订单号、金额或支付面板。
- Checkout 明确区分 loading、load error、missing group、normal；逐行展示失效原因，提供返回购物车和重新核对操作，失效时提交入口不会调用 orders store。

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

- 生产构建仍报告主入口 chunk 约 1.09 MB；商城页面已懒加载，但公共依赖仍可在后续任务中进一步拆包。
- localStorage Repository 满足两个实例的顺序操作刷新合同；浏览器多标签页在同一毫秒内真正并发写入仍不具备事务锁，这是 localStorage 存储模型的固有限制。

## 跨账号异步隔离复核修复

### RED

- 新增 `frontend/src/tests/shop/actorIsolation.spec.ts`，首次运行 `npm test -- src/tests/shop/actorIsolation.spec.ts`：`4 failed / 4 total`。
- 失败分别复现：旧 checkout 清空 B 的同商家购物车；A checkout rejection 关闭 B 的 pending；A payment rejection 关闭 B 的 pending；A 的订单列表响应写入 B 的 store。

### GREEN

- orders store 为 actor 切换引入递增 `actorEpoch`，并为 checkout、payment、order detail 和 order list 分别维护 request sequence。仅当前 actor epoch 与当前 flight 可以写入状态、错误和 pending。
- checkout 在第一个异步操作前固定 actor，并将固定 `expectedOwnerId` 传给 `cart.removeMerchant`。购物车清理在异步前后校验该 owner，账号已切换时不会读取或保存新账号购物车。
- `loadOrder` 和 `loadOrders` 在响应提交前校验 actor epoch、用户、角色及请求序号；旧账号响应不再进入当前 store。

### 验证

- 竞态专项：`npm test -- src/tests/shop/actorIsolation.spec.ts`，`1 file / 4 tests passed`。
- 商城专项：`npm test -- src/tests/shop`，`8 files / 38 tests passed`。
- 全量测试：`npm test`，`21 files / 174 tests passed`。
- `npm run lint`、`npm run typecheck`、`npm run build`、`git diff --check` 均通过；构建仅保留上文记录的既有 chunk 体积警告。

## 独立复核测试补强

- 复核确认生产修复没有新的 Critical/Important 代码缺陷，但要求为首次异步边界后的 owner 复核、同账号多 flight 和订单查询乱序补齐直接证据。
- `actorIsolation.spec.ts` 从 4 项扩展为 9 项：新增 cart post-await owner guard、同账号 checkout/payment 旧 flight cleanup、同账号 `loadOrders` 乱序、跨账号 `loadOrder` 响应测试。
- `recoveryPages.spec.ts` 既有“同账号 `loadOrder` 乱序只提交最新请求”用例继续保留，与新增用例共同覆盖评审范围。
- 专项：`npm test -- src/tests/shop/actorIsolation.spec.ts src/tests/shop/recoveryPages.spec.ts`，`2 files / 16 tests passed`。
- 全量：`npm test`，`21 files / 179 tests passed`；`npm run lint`、`npm run typecheck`、`npm run build` 均通过，构建仅有既有 chunk 体积警告。
