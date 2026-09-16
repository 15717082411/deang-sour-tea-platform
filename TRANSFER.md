# 项目迁移与启动说明

本文件适用于德昂族酸茶平台跨电脑传输。请先完整解压 ZIP，不要直接在压缩软件中打开或运行文件。Windows 建议解压到较短的路径，例如 `D:\projects\deang-sour-tea-platform`。

## 包内内容

- `frontend/`：Vue 3 前端源码、图片、依赖锁文件及测试。
- `frontend/dist/`：传输包额外附带的前端静态演示构建；Git 仓库本身不跟踪此目录。
- `backend/`：Java 后端源码、Maven 配置、测试与数据库脚本。
- `docs/`：阿里云部署手册、演示清单及设计文档。
- 根目录中的 PRD、技术方案 Word 文件与文档生成脚本。
- `PACKAGE-INFO.txt`：打包时间、源码提交号及产物说明。

包内不携带 `.git`、`node_modules`、Maven 缓存、私钥、本地环境配置或旧的后端编译产物。首次安装依赖需要网络；没有 Git 历史不影响构建和运行，但解压目录不能直接执行 Git 提交或推送。

## 最快预览前端

在另一台电脑安装 Node.js 22 LTS，然后在解压目录打开终端。Windows PowerShell、macOS 终端均可依次执行：

```bash
cd frontend
node -v
npm ci
npx vite preview --host 127.0.0.1 --port 4173
```

打开终端实际显示的 URL，通常是 `http://127.0.0.1:4173`。不要双击 `index.html`；Vue 路由和资源需要 HTTP 服务。保持终端运行，结束预览按 Control+C。Windows PowerShell 如果提示 `npm.ps1` 被执行策略阻止，改用 `npm.cmd` 和 `npx.cmd`，无需关闭系统安全策略。

附带的 `dist` 使用站点根路径和静态演示模式构建，不连接后端。预览过程不需要 MySQL、Maven 或 Java。若通过 Git 克隆、没有 `dist`，请改用下一节的开发启动方式。

## 修改与运行源码

安装好前端依赖后，在 `frontend` 目录执行：

```bash
npm run dev
```

打开终端输出的地址，通常是 `http://localhost:5173`。这会直接运行源码，而不是附带的静态构建。默认会尝试检测本机 Java 内容接口，接口不可用时使用本地演示数据。

可在同一目录执行以下质量检查：

```bash
npm run lint
npm test
npm run build
```

开发服务、静态预览、不同端口及不同域名属于不同的浏览器存储来源，演示记录不会自动跨来源迁移。

## 可选启动 Java 后端

安装 JDK 17 与 Maven 3.9 系列，确认 `mvn -v` 输出中的 Java 版本为 17。另开终端，在解压后的项目根目录执行：

```bash
java -version
mvn -v
cd backend
mvn -B clean package
mvn spring-boot:run
```

只有打包成功才继续启动。默认使用 `demo` profile，不需要数据库。内容接口为 `http://localhost:8080/api/contents`；前端要读取它，请使用上一节的源码开发模式，附带的静态演示构建不会自动切换到后端。

本包只包含后端源码，未附带预编译 JAR，不表示后端已在你的新电脑上完成构建或验收。不要把 IDEA 安装成功等同于命令行 JDK、Maven 已配置完成。

## 演示账号与数据

三个演示账号的密码均为 `Demo123!`：

- 普通用户：`user_demo`
- 商家：`merchant_demo`
- 管理员：`admin_demo`

账户、购物车、订单、模拟支付退款及大部分管理操作使用当前浏览器的 localStorage。另一台电脑可以重新演示流程，但不会自动收到原电脑浏览器中的注册信息或订单。清除站点数据会重置本地演示记录。

混合模式目前仅让科普内容使用 Java API。不要把此压缩包理解为已接通数据库的完整电商系统，不使用真实个人信息或真实付款数据。

## 继续部署到阿里云

按 `docs/aliyun-deployment-guide.md` 或同目录的 Word 部署手册操作。本包的 `frontend/dist` 只用于静态演示；需要 Java 内容接口时，必须按照部署手册用同源 `/api` 配置重新构建。

手册中的 Mac 路径是原电脑路径。在新电脑上请进入实际解压目录，不要原样复制该绝对路径。ZIP 不含 `.git`，手册中仅用于记录版本的 `git rev-parse HEAD` 应改为读取 `PACKAGE-INFO.txt` 中的源码提交号；不要因为无法运行 Git 命令而更换应用版本。

静态预览服务仅绑定新电脑的回环地址，不代表已经部署到阿里云，也不用于生产环境公网托管。
