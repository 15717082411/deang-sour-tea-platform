# 最终提交检查清单

## 源码与文档

- [ ] `frontend/` 包含 Vue 3 + TypeScript + Vite 源码、单元测试和 Playwright 测试。
- [ ] `backend/` 包含 Java 17 + Spring Boot 3 源码、测试、`schema.sql` 与 `seed.sql`。
- [ ] PRD、技术方案、README 和 `docs/demo-checklist.md` 与实际功能一致。
- [ ] Git 仓库未包含真实密码、API Key、数据库凭据、个人数据或构建缓存。

## 自动化验收

在 `frontend/` 执行并确认全部通过：

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

在 `backend/` 执行：

```bash
mvn test
```

本机未配置命令行 JDK/Maven 时，使用 README 中的 IDEA 自带运行时命令。

## 功能验收

- [ ] 普通用户可注册/登录、浏览科普、完成互动、保存海报、购物下单、模拟支付、确认收货、申请售后和预约。
- [ ] 商家可提交商品、查看经营数据、发货、通过售后并完成模拟退款。
- [ ] 管理员可审核商家/商品、发布带来源内容、核销预约并查看看板。
- [ ] 三角色串联后，订单、售后和预约时间线各状态仅出现一次且顺序正确。
- [ ] 未登录、角色越权、未审核商家和不存在资源会进入明确的登录、403、提示或 404 状态。

## 视觉与构建

- [ ] 首页、科普、商城和三个工作台在 1440x900、768x1024、390x844 下无横向溢出或内容遮挡。
- [ ] 键盘焦点可见，表单标签完整，空态、加载态和错误态清晰。
- [ ] `frontend/dist/` 可生成，刷新深层路由时由部署服务器回退到 `index.html`。
- [ ] 提交截图能清楚展示酸茶主体、普通用户、商家和管理员四组关键页面。

## 答辩口径

- 产品定位：德昂族酸茶非遗科普、互动体验与电商转化平台。
- 技术栈：Vue 3、TypeScript、Vite、Pinia、Java 17、Spring Boot 3、Spring Security、MyBatis-Plus、MySQL 8。
- A 方案：后端在线时仅公开科普内容走 API，可变业务闭环保持本地演示，页面会明确显示数据模式。
- 支付说明：支付与退款均为模拟状态机，不接入真实资金。
- 工程边界：MySQL 登录、真实支付、文件存储、生产部署和监控不属于当前毕设交付范围。

## 打包前

- [ ] 执行 `git status`，确认没有临时报告、测试截图、日志和本地环境文件被误提交。
- [ ] 记录最终 commit、测试结果和演示地址。
- [ ] 按 `docs/demo-checklist.md` 从清空数据开始完整演练一次。
