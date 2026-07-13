# 最终提交检查清单

## 源码交付

- `frontend/` 可打开并完成普通用户、商家、管理员三类身份演示。
- `backend/` 包含 Spring Boot 启动类、Controller、Service、Mapper、实体类和安全配置。
- `backend/src/main/resources/db/schema.sql` 可创建数据库表。
- `backend/src/main/resources/db/seed.sql` 可导入演示数据。

## 功能验收

- 普通用户：酸茶科普、H5互动、生成核销码、预约、商城、购物车、下单、售后。
- 商家：发布商品、补货、订单发货、售后处理、经营数据。
- 管理员：商家审核、商品审核、预约核销、内容发布、平台数据看板。
- 后端：JWT 登录、角色权限控制、商品/内容/订单/预约/审核接口。

## 运行验收

- 前端离线演示：打开 `frontend/index.html`。
- 后端 demo 模式：`cd backend && mvn spring-boot:run`。
- 后端 MySQL 模式：初始化 `schema.sql`、`seed.sql` 后运行 `mvn spring-boot:run -Dspring-boot.run.profiles=mysql`。

## 文档材料

- PRD：`德昂族酸茶数字化互动体验平台_PRD.docx`
- 技术方案：`德昂族酸茶数字化互动体验平台_技术方案.docx`
- 演示清单：`docs/demo-checklist.md`
- README：`README.md`

## 答辩说明重点

- 定位：德昂族酸茶非遗科普、互动体验与电商转化平台。
- 技术栈：Vue 3 思路的前端结构、Java 17、Spring Boot 3、Spring Security、MyBatis-Plus、MySQL 8。
- 闭环：科普认知 -> H5互动 -> 预约核销 -> 电商购买 -> 商家履约 -> 管理员监管。
