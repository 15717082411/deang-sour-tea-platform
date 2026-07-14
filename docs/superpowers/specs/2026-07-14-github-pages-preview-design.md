# GitHub Pages 在线预览设计规格

## 1. 目标

将现有 Vue 3 + Vite 前端发布为公开可访问的 GitHub Pages 项目站点，预期地址为：

```text
https://15717082411.github.io/deang-sour-tea-platform/
```

访问者无需安装 Node.js、Java、Maven 或 MySQL，即可浏览德昂族酸茶科普内容，并体验普通用户、商家和管理员的完整演示流程。

## 2. 产品边界

线上预览定位为“毕设交互演示站”，不是生产电商系统。GitHub Pages 只托管静态文件，线上固定使用浏览器本地演示数据；模拟支付、订单、预约、商家审核和商品审核记录保存在各访问者自己的 `localStorage` 中。

线上构建不得尝试连接访问者电脑上的 `http://localhost:8080/api`。本地开发保持现有能力：开发者仍可启动 Spring Boot，并由前端检测公开内容 API 后进入混合模式。

## 3. 发布架构

```text
push 到 main
  -> GitHub Actions
  -> npm ci + 静态检查 + 单元测试 + Vite 构建
  -> 生成 SPA 404 fallback
  -> 上传 Pages artifact
  -> GitHub Pages HTTPS 站点
```

仓库继续保留一个前端工程，不提交 `dist/`。发布配置放在 `.github/workflows/deploy-pages.yml`，使用 GitHub 官方 Pages Actions。工作流支持 `push` 到 `main` 和手动触发；同一时间只保留最新部署。

## 4. 子路径与路由

GitHub Pages 项目站点运行在 `/deang-sour-tea-platform/`，而本地开发运行在 `/`。Vite 通过 `VITE_BASE_PATH` 接收部署基路径，本地未设置时默认 `/`；Vue Router 使用 `import.meta.env.BASE_URL` 创建 History 路由。

工作流在构建后将 `dist/index.html` 复制为 `dist/404.html`。访问者直接打开或刷新 `/shop`、`/culture/:slug`、`/account` 等子路由时，GitHub Pages 使用同一应用入口加载，再由 Vue Router 解析当前地址。现有 URL 不改为带 `#` 的 Hash 路由。

## 5. 静态资源

Vite 能自动改写 Vue 模板中的静态图片，但种子数据、API 数据和订单快照中的 `/images/...` 字符串不会自动改写。新增一个纯函数统一解析展示资源地址：

- `/images/foo.webp` 在本地仍解析为 `/images/foo.webp`。
- Pages 构建解析为 `/deang-sour-tea-platform/images/foo.webp`。
- `https:`、`data:` 和 `blob:` 地址保持不变。
- 已包含基路径的地址不得重复添加前缀。

数据层继续保存规范化路径，页面和组件在渲染图片时统一调用解析函数，避免把部署平台路径写进业务数据。

## 6. 数据模式与错误处理

线上工作流设置明确的静态演示构建标记。应用在该模式下跳过 API 探测，立即启用 `DemoRepository`，不产生 Mixed Content、跨域或 `localhost` 请求错误。本地未设置该标记时，继续执行现有 API 检测和演示降级逻辑。

Pages 部署失败时不得发布不完整产物。依赖安装、Lint、类型检查、单元测试或生产构建任一步失败，部署任务立即停止；上一个成功版本继续在线。

## 7. 自动化验证

新增测试覆盖：

1. 资源解析函数在根路径、Pages 子路径和外部 URL 下的行为。
2. 静态演示模式不调用 API 检测，本地模式保持原行为。
3. Router 使用构建基路径，受保护路由和跳转逻辑不回归。
4. Pages 构建产物的入口资源包含项目基路径，`404.html` 与 `index.html` 同步生成。
5. 构建产物不残留会请求域名根目录的运行时 `/images/...` 路径。

发布完成后执行线上冒烟测试：首页、文化页、商城和登录页返回成功；关键图片可加载；直接访问并刷新子路由仍显示应用；普通用户、商家和管理员演示账号可以登录。

## 8. 交付与成功标准

交付物包括 Pages 工作流、部署基路径适配、静态演示模式、测试、README 在线预览说明和公开 URL。成功标准如下：

- GitHub Actions 发布任务成功。
- 公开 URL 在未登录浏览器中可访问。
- 桌面端和移动端关键页面无白屏、资源 404 或布局阻断。
- 子路由直接访问和刷新可用。
- 三角色演示流程不依赖公网后端。
- 后续合并到 `main` 的已验证前端修改自动重新发布。
