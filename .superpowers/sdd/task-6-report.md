# Task 6 交付报告：酸茶互动旅程与配方海报

## 实现结果

- `/journey` 已由占位路由替换为懒加载页面，完成“源起、自然、技艺”三步有限流程。
- 每步使用原生 radio 与 fieldset/legend 语义；未选择时下一步禁用，返回保留已选项，重新开始清空步骤、选择、结果与保存状态。
- `buildRecipe(choices)` 严格要求 `origin`、`nature`、`craft` 三个唯一步骤及 `PURE`、`FRESH`、`WARM` 有效 trait；输入顺序不影响结果。
- 配方规则为多数胜出；三方各一票时按公开优先级 `PURE > FRESH > WARM` 取“本真原味”。三种结果分别为“本真原味”“山野清新”“温润花香”。
- 完成第三步立即生成页面内配方海报，包含配方名、结构化原料、描述、创建日期、可选登录用户显示名、`TEA-` 配方码与项目原创视觉准确 alt。
- 配方文案明确标记为互动风味推荐，不包含医疗功效，也不提供伪下载按钮。
- 游客可完整完成流程，但保存时只跳转 `/login?redirect=/journey`，不写海报存储；同一 SPA 会话返回后保留当前结果。
- 登录用户保存到独立版本化 key `deang-sour-tea:journey-posters:v1`，数据按 `userId` 分区，只持久化 `JourneyPoster` 必要字段，不存角色或完整用户对象。
- 同一轮保存幂等并返回同一 poster/code；重新开始后再次完成会生成新 poster/code。store 提供当前用户范围内的 `listPosters()` 与 `loadPoster(id)`，供后续个人中心复用。
- 存储读取执行运行时结构校验；JSON、版本、用户分区或海报结构损坏时安全恢复为空，并可由下一次合法保存覆盖。

## TDD 证据

### RED

首次运行 `npm test -- src/tests/journey`：退出码 1。两个测试文件均失败；`JourneyPage.vue` 与 `stores/journey.ts` 尚不存在，Vite 无法解析对应 import。失败原因与 Task 6 预期一致。

### GREEN

- `npm test -- src/tests/journey`：2 个测试文件、20 个测试通过。
- `npm test`：12 个测试文件、112 个测试通过。
- `npm run lint`：通过，零 warning。
- `npm run typecheck`：通过。
- `npm run build`：通过，`JourneyPage` 生成独立懒加载 JS/CSS chunk。
- `git diff --check`：通过。

测试覆盖三种配方、多数规则、三方平局、乱序、重复/缺失/未知步骤、非法 trait、下一步禁用、选择前进后返回、三步完成、结构化原料与配方码、重新开始、游客不落盘与登录跳转、同一 SPA 会话保留、登录保存、重复保存幂等、重新开始后新建、不同用户隔离及损坏存储恢复。

## 视觉验收

- `1440×900`：页面横向溢出为 0；三项单选点击区约 88px 高；下一步与保存按钮约 44.5px 高；结果海报宽 980px，图片、原料、日期与配方码完整可见。
- `390×844`：页面横向溢出为 0，无文字裁切；三项单选点击区 88px 高；操作按钮 46px 高；结果海报为 343px 单列，两个操作按钮均为 343×46px。
- 浏览器完整走通三步并生成 `TEA-` 配方码；结果图 alt 为“双手将茶叶压入敞口竹筒，旁有捆扎好的竹筒，项目原创视觉”。
- 页面未使用渐变、装饰球、负字距或随 viewport 缩放的字号；海报圆角为 8px，其他文字控件圆角不超过 6px。
- 浏览器控制台无 error 或 warning。

## 改动文件

- `frontend/src/pages/journey/JourneyPage.vue`
- `frontend/src/components/journey/JourneyStep.vue`
- `frontend/src/components/journey/RecipePoster.vue`
- `frontend/src/stores/journey.ts`
- `frontend/src/styles/journey.css`
- `frontend/src/tests/journey/JourneyPage.spec.ts`
- `frontend/src/tests/journey/recipe.spec.ts`
- `frontend/src/router/index.ts`
- `.superpowers/sdd/task-6-report.md`

## 残余风险

- 旅程未保存结果只保留在当前 Pinia/SPA 内存中，满足登录回跳要求；刷新页面会清空草稿。这避免游客数据落盘，但不是跨刷新草稿恢复方案。
- 配方码由当前前端业务 ID 工具生成，适合演示预约关联；生产环境若要求全局唯一、防猜测或服务端核验，应由后端签发并建立唯一索引。
- 生产构建主包约 1.08 MB，Vite 仍报告超过 500 kB；Task 6 页面已独立懒加载，Element Plus 等全局依赖拆分属于跨任务构建优化。

## 提交

- 提交信息：`Add interactive sour tea journey`
