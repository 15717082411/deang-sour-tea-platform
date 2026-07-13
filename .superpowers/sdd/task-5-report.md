# Task 5 交付报告：公共文化体验与视觉资产

## 实现结果

- 首页以全宽项目原创实景风格 WebP 为叙事 Hero，H1 为“德昂族酸茶”，文字直接覆盖图像，主行动为“开始酸茶之旅”，桌面与手机首屏均可见下一内容带。
- 完成文化索引、文化详情、制作技艺、传承故事、工艺时间轴和来源列表；五个公共路由使用懒加载。
- 文化索引与首页通过 `listContents()` 异步读取 `ContentArticle`，详情通过 `getContent()` 读取，并分别处理加载、失败、空列表和未找到状态。
- 来源数据集中写入 `seed.ts`，包含标题、发布机构、直接 URL 和支持内容；详情页真实呈现安全外链。
- 文化正文删除“45天发酵”的固定事实表达，并列说明50—70天、食用湿茶约2个月、饮用干茶更长三类公开记录。
- 演示数据升级为 v4，旧 v3 数据会重建，确保既有演示环境不继续使用旧文化正文和空来源。
- 六张图片均为项目原创视觉，不作为历史档案或真实人物身份材料。

## 改动文件

- `frontend/public/images/`：6 张原创 WebP。
- `frontend/src/components/culture/CraftTimeline.vue`
- `frontend/src/components/culture/SourceList.vue`
- `frontend/src/pages/public/HomePage.vue`
- `frontend/src/pages/public/CultureIndexPage.vue`
- `frontend/src/pages/public/CultureDetailPage.vue`
- `frontend/src/pages/public/CraftPage.vue`
- `frontend/src/pages/public/StoriesPage.vue`
- `frontend/src/styles/public.css`
- `frontend/src/data/seed.ts`
- `frontend/src/main.ts`
- `frontend/src/router/index.ts`
- `frontend/src/tests/public/HomePage.spec.ts`
- `frontend/src/tests/public/SourceList.spec.ts`
- `frontend/src/tests/public/SeedContent.spec.ts`
- `frontend/src/tests/data/demoRepository.spec.ts`

## TDD 证据

### RED

首次运行 `npm test -- src/tests/public`：退出码 1。3 个测试文件失败；seed 的来源、固定周期和 WebP 路径共 3 个断言失败，公共页面及 `SourceList` 因尚未创建而解析失败。

自审新增持久化回归后运行 `npm test -- src/tests/public/SeedContent.spec.ts`：退出码 1。旧 v3 数据被原样恢复，来源完整性断言失败。

### GREEN

- `npm test -- src/tests/public`：3 个测试文件、10 个测试通过。
- `npm test -- src/tests/public/SeedContent.spec.ts src/tests/data/demoRepository.spec.ts`：2 个测试文件、22 个测试通过。
- `npm test`：9 个测试文件、76 个测试通过。
- `npm run lint`：通过，零警告。
- `npm run typecheck`：通过。
- `npm run build`：通过；五个公共页面生成独立懒加载 chunk。
- `git diff --check`：通过。

## 视觉验收

- `1440×900` 首页：H1 与主行动可见；下一内容带顶部为 738px；横向溢出 0；无无效图片。
- `390×844` 首页：H1 与主行动可见；下一内容带顶部为 690px；横向溢出 0；移动导航可见。
- 文化详情：来源直链可见，`target="_blank"` 且 `rel="noopener noreferrer"`；三类时长口径均在正文中出现。
- 手机工艺页：5 个时间轴步骤，无步骤重叠、无横向溢出、无无效图片。
- 手机故事页：明确显示“项目原创视觉 · 手艺场景”和“不对应任何真实传承人或档案照片”。
- 浏览器控制台无 error 或 warning。

## 素材清单

| 文件 | 尺寸 | 字节数 |
| --- | --- | ---: |
| `artisan-story.webp` | 1536×1024 | 99,156 |
| `craft-fermentation.webp` | 1536×1024 | 189,214 |
| `craft-fire.webp` | 1536×1024 | 157,116 |
| `hero-sour-tea.webp` | 1672×941 | 189,922 |
| `product-gift.webp` | 1448×1086 | 148,568 |
| `product-tasting.webp` | 1448×1086 | 47,838 |

总计 831,814 字节（约 812.3 KiB）；单张均小于 500 KB，最长边不超过 1672px。

## 残余风险

- 生产构建主包约 1,073 KB，Vite 报告超过 500 KB；Task 5 公共页面已拆为独立懒加载 chunk，但 Element Plus 等全局依赖的按需加载属于跨任务性能优化。
- 项目原创视觉是说明性资产，不是历史档案；后续若替换为真实人物或机构资料，必须重新核验授权、身份和 alt 文案。
- 权威外链由发布机构维护，未来可能发生地址调整；内容事实仍保留发布机构与支持内容，便于后续巡检更新。

## 提交

提交信息：`Build Deang sour tea culture experience`
