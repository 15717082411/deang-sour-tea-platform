# Task 8 实施报告

## 交付范围

- 用户订单：本人订单列表与详情、待支付入口、SHIPPED 确认收货、订单时间线与收货信息。
- 售后：履约状态与售后实体分离；申请、商家处理、通过/拒绝及显式模拟退款状态；用户售后列表。
- 预约：未来日期、1 至 12 人、大陆手机号、本人配方海报；用户取消、管理员核销、核销元数据与时间线。
- 用户中心：用户概览、订单、预约、配方海报、售后六个真实懒加载页面，全部 USER-only。

## TDD 证据

### Domain RED

- 命令：`npm test -- src/tests/account/orderActions.spec.ts src/tests/booking/booking.spec.ts src/tests/domain/stateMachines.spec.ts`
- 结果：2 suites failed；订单/售后 5 项失败，预约 suite 因共享 `posterStorage` 尚不存在而失败；状态机 11 项通过。
- 失败原因覆盖稳定错误码、收货状态、售后分离、模拟退款、v4 -> v5 迁移、预约权限与配方海报归属。

### UI RED

- 命令：`npm test -- src/tests/account/orderActions.spec.ts src/tests/booking/booking.spec.ts`
- 结果：2 suites failed，真实 `OrdersPage`、`BookingPage` 与对应 stores 尚不存在。

### GREEN

- 领域/迁移/旅程：`npm test -- src/tests/data/demoRepository.spec.ts src/tests/data/commerceRepository.spec.ts src/tests/account/orderActions.spec.ts src/tests/booking/booking.spec.ts src/tests/journey src/tests/domain`，7 files / 93 tests passed（UI 实现前 4 todo）。
- 账号/预约/路由：`npm test -- src/tests/account src/tests/booking src/tests/router/guards.spec.ts src/tests/shop/routes.spec.ts`，5 files / 40 tests passed。
- 最终全量：`npm test`，24 files / 199 tests passed，无 todo/skipped。
- `npm run lint`、`npm run typecheck`、`npm run build`、`git diff --check` 均通过。构建仅保留既有主入口 chunk 体积警告。

## 领域与迁移

- `OrderStatus` 不再包含 `AFTER_SALE_REQUESTED`；订单时间线可记录售后申请，但 PAID/SHIPPED/RECEIVED 履约状态保持不变。
- 新增稳定 `RepositoryErrorCode`、`refundAfterSale`、严格 booking 验证和注入式 `DemoClock`。
- 数据升级到 v5；显式迁移 v4 的旧售后订单与 booking timeline，并串联既有 v3 迁移，保留自建用户、商品、订单、预约与内容。
- Journey 与 Repository 共用严格 `posterStorage` 白名单解析；预约不能引用缺失、畸形或他人海报。

## 状态与页面

- 扩展唯一 `orders` store 的 receive action；新增 actor 隔离的 `bookings` 与 `afterSales` stores，并在登录切换/登出时重置。
- 用户中心页面提供 loading、error、empty 和可恢复操作；预约成功展示可复制核销码，配方海报可直接进入预约。
- 新增账号异步隔离测试，旧账号 booking/after-sale 响应不能写入新账号状态。

## 主要修改文件

- Domain/Data：`domain/{types,stateMachines}.ts`、`data/{repository,demoRepository,seed,posterStorage}.ts`
- Stores：`stores/{orders,bookings,afterSales,auth,journey}.ts`
- UI：`pages/account/*`、`pages/booking/BookingPage.vue`、`components/{booking,afterSales}/*`、`layouts/AccountLayout.vue`
- Route/Style：`router/index.ts`、`styles/account.css`、`main.ts`
- Tests：`tests/{account,booking}/*` 及相关 migration/auth/shop tests。

## 残余风险

- 真实浏览器视觉与 1440/768/390 三视口截图将在 Task 12 统一验证。
- 生产构建主入口约 1.10 MB，属于既有公共依赖拆包问题，将在最终性能检查中处理。
