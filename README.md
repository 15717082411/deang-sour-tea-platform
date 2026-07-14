# 德昂族酸茶数字化互动体验平台

面向毕业设计的最终可交互 Web 系统，聚焦德昂族酸茶本身，提供非遗科普、工艺互动、线下体验预约与电商转化。系统包含普通用户、商家、管理员三类身份，并完整演示下单、模拟支付、发货、收货、售后、退款、商品审核、内容发布和预约核销。

## 技术栈

- 前端：Vue 3、TypeScript、Vite、Pinia、Vue Router、ECharts、Lucide、Vitest、Playwright
- 后端：Java 17、Spring Boot 3、Spring Security、MyBatis-Plus、MySQL 8
- 数据模式：浏览器本地完整演示数据 + Spring Boot 公开内容 API

## 项目结构

```text
frontend/       Vue 3 应用、单元测试与端到端测试
backend/        Spring Boot API、测试与数据库脚本
docs/           演示、验收、设计规格与实施计划
*.docx          PRD 与技术方案交付物
build_*_docx.py 文档生成脚本
```

## 启动前端

需要 Node.js 20+ 和本机 Chrome。首次运行：

```bash
cd frontend
npm ci
npm run dev
```

打开终端显示的地址，默认通常为 `http://localhost:5173`。演示账号密码均为 `Demo123!`：

| 身份 | 用户名 | 入口 |
| --- | --- | --- |
| 普通用户 | `user_demo` | `/account` |
| 商家 | `merchant_demo` | `/merchant` |
| 管理员 | `admin_demo` | `/admin` |

也可以注册新的普通用户并提交商家申请。数据保存在当前浏览器的 `localStorage`，清除站点数据即可恢复种子状态。

## 数据模式

- 离线演示：全部功能使用本地数据，可稳定完成三角色业务闭环。
- 混合模式：检测到 `GET /api/contents` 可用后，仅科普内容从 API 读取；账号、商品、订单、支付、预约、商家和管理流程仍使用本地演示数据。
- API 地址默认为 `http://localhost:8080/api`，可在 `frontend/.env.local` 设置 `VITE_API_BASE_URL` 覆盖。

页面顶部会持续显示当前模式，可手动切回离线演示。该边界是 A 方案的正式设计，避免把尚未持久化的后端流程误示为完整联调。

## 启动后端

默认 `demo` profile 使用内存数据，不需要 MySQL。若命令行未配置 Java 和 Maven，可直接使用 IDEA 自带运行时：

```bash
cd backend
JAVA_HOME='/Applications/IntelliJ IDEA.app/Contents/jbr/Contents/Home' \
  '/Applications/IntelliJ IDEA.app/Contents/plugins/maven/lib/maven3/bin/mvn' spring-boot:run
```

MySQL 模式先执行 `db/schema.sql` 和 `db/seed.sql`，再配置 `DB_URL`、`DB_USERNAME`、`DB_PASSWORD` 与高强度 `JWT_SECRET`：

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

MySQL profile 当前是持久化与权限脚手架，不提供演示账号登录，也不作为前端可变业务闭环的数据源。

## 质量检查

```bash
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e

cd ../backend
mvn test
```

端到端测试覆盖桌面、平板、手机响应式检查，并在桌面端覆盖普通用户、商家、管理员及三角色完整生命周期。详细答辩路径见 `docs/demo-checklist.md`，提交前检查见 `docs/final-submission-checklist.md`。

## 边界说明

支付与退款均为状态机驱动的模拟流程，不接入真实资金渠道。生产化仍需补充数据库账号认证、刷新令牌、真实支付回调、对象级权限、文件存储、日志监控和部署配置；演示凭据不得用于真实环境。
