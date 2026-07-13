# 德昂族酸茶数字化互动体验平台

本项目是一个面向毕业设计的 Web 系统 MVP，定位为“德昂族酸茶非遗科普、互动体验与电商转化平台”。系统覆盖普通用户、商家、管理员三类身份，包含酸茶科普、H5 互动、线下预约核销、酸茶商城、购物车、订单模拟支付、商家中心、管理员审核、内容管理和数据看板。

## 项目结构

```text
frontend/                         静态前端演示，可直接打开
  index.html
  styles.css
  app.js
backend/                          Java Spring Boot 后端工程
  pom.xml
  src/main/java/com/deang/sourtea
  src/main/resources/application.yml
  src/main/resources/db/schema.sql
docs/                             后续可放设计图、截图、答辩材料
*.docx                            PRD 与技术方案文档
```

## 前端演示

直接打开：

```bash
open frontend/index.html
```

也可以用本地静态服务：

```bash
cd frontend
npx serve .
```

前端当前使用 `localStorage` 模拟数据，可演示：

- 普通用户：H5 互动、生成核销码、预约、购物车、下单、订单查看
- 商家：商品发布、补货、订单发货、售后处理、经营数据查看
- 管理员：商家审核、商品审核、预约核销、内容发布、平台数据查看

## 后端运行

后端技术栈：Java 17 + Spring Boot 3 + Spring Security + MyBatis-Plus + MySQL 8。

本机需要安装 JDK 17 和 Maven：

```bash
cd backend
mvn spring-boot:run
```

默认使用 `demo` profile，走内存数据，不依赖 MySQL。正式数据库模式使用：

```bash
cd backend
export JWT_SECRET='replace-with-a-long-random-secret'
export DB_USERNAME='sour_tea'
export DB_PASSWORD='your-local-database-password'
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

可选：通过 `DB_URL` 覆盖默认的本地 MySQL 连接地址。不要将真实密码或 JWT 密钥写入仓库配置文件。

初始化 MySQL 数据库：

```bash
mysql -u root -p < src/main/resources/db/schema.sql
mysql -u root -p < src/main/resources/db/seed.sql
```

前端会自动尝试连接 `http://localhost:8080/api`。后端在线时同步 API 数据；后端不在线时继续使用 `localStorage` 离线演示。

## 默认接口

- `POST /api/auth/login`
- `GET /api/contents`
- `POST /api/contents`
- `GET /api/products`
- `POST /api/products`
- `GET /api/merchants`
- `POST /api/admin/merchants/{id}/approve`
- `POST /api/admin/products/{id}/approve`
- `POST /api/orders`
- `POST /api/orders/{id}/ship`
- `GET /api/bookings`
- `POST /api/bookings`
- `POST /api/bookings/verify`
- `GET /api/dashboard`

## 说明

毕设阶段使用模拟支付，不接入真实资金清算。后端已包含 JWT/RBAC、demo 内存模式与 MySQL 持久化模式；图片上传和更细粒度的订单明细持久化可作为后续增强点。
