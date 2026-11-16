# ColaMD Extend v2.7.13-rc.2 版本说明

本文件记录 `2.7.13-rc.2` 的代码改动、验证结果与发布注意事项。本版一个新功能：**幻灯片版式系统**——放映（⌘⇧P）与导出的每一页可以声明版式，内置十种，页内还能写微调 CSS 与放映脚本；外加一个放映修复（长文档翻页凭空到顶，见「顺手修复」）。v2.7.13-rc.1 的维护内容（导出修复、验收脚本、依赖安全）见 `docs/release-2.7.13-rc.1.md`。

## 功能说明

### 指令语法

`---` 分页不变；每页的版式写在页首的 HTML 注释里：

```markdown
---
<!-- slide: cover -->

# 产品发布

---
<!-- slide: kpi -->
<!-- slide-css
  h1 { letter-spacing: 0.1em; }
-->

## 关键指标

- **3.2 亿** 用户规模

---
<!-- slide-js
  slide.setVar('progress', 42);
-->
```

- `<!-- slide: 名字 -->`：版式声明，**仅页首生效**（该页第一个非空行；页中间出现视为普通注释）。版式名 `[a-z][a-z0-9-]*`，未知版式名无害降级（无内置样式，可被自定义 CSS 接住）。
- `<!-- slide-css … -->`：页内 CSS，可多行，页内任意位置，多条按出现顺序拼接。
- `<!-- slide-js … -->`：页内脚本，放映进入该页时执行、离开即清理；导出 PDF 一律不执行。

### 全出血杂志式排版（2026-11-16 按用户反馈重画）

参考杂志风网页 PPT 与报告类 PPTX 重画，色彩仍只引主题活变量：内容铺满 16:9 纸面、只留 6vw 边距（放映 6vw、导出 64px），不再聚在中央窄栏；字体三件套——衬线（标题/大数字/金句）、无衬线（正文）、等宽（chrome/页码/标签），一级标题 2.4em、二级 1.6em、三级 1.25em，文档式的标题下划线一律去掉；细线代替色块（tag 边框、卡片描边、chrome 中缝线）；底色为主题底色 95% + 强调色 5% 的柔和调和。每页第一条线（`cm-md-page-start`）统一留出页顶安全区给 chrome；cover 改为杂志封面式左对齐、副标题压淡、强调色短杠。

### deck 公共元素（chrome）

在文档任意处（惯例顶部）写 deck 级指令，放映与导出的每页固定位置呈现：

```markdown
<!-- deck-logo: https://…/logo.png -->
<!-- deck-brand: ColaMD Extend -->
<!-- deck-title: 幻灯片版式系统 -->
<!-- deck-meta: 2026-11 · 内部分享 -->
```

- **顶部 chrome 条**（等宽小字 + 大字距）：左 = logo（没有则跳过）+ deck-title，中缝 1px 细线，右 = deck-meta
- **底部 foot**：左 = deck-brand（衬线小字），右 = 自动页码 `03 / 12`（仅放映；打印里 fixed 元素随 Chromium 复刻到每张纸，各页相同的 logo/标题/meta/品牌照印，页码与幽灵数字藏掉）
- **右下角幽灵页码**：超大衬线数字、透明度 5%，随翻页变化（仅放映）
- cover/section/closing 幕封页 chrome 自动淡出（`:has()` 实现）
- 一条 deck 指令都没写就整条不出现，页面保持纯净；文本一律 `textContent`、logo 走 `img.src` 属性赋值，无 innerHTML 注入面

### 内置版式（十种，角色分类参考 dsh-ppt）

| 版式名 | dsh-ppt 对应 | 效果 |
|---|---|---|
| `cover` | cover.hero | 主视觉封面：标题居中放大、副标题压淡、底部强调色条、进场淡入 |
| `section` | section.statement | 章节陈述：大留白居中，标题下强调色短线 |
| `agenda` | agenda.simple | 议程：列表大字排版，序号强调色加粗 |
| `kpi` | overview.kpi | 关键数字：列表项变 2-4 格卡片，`**数字**` 放大强调 |
| `timeline` | history.timeline | 时间轴：列表项加圆点与轴线 |
| `steps` | process.steps | 步骤条：列表项横排，步骤名包圆号 |
| `matrix` | product.matrix | 卡片矩阵：列表项变卡片网格 |
| `two-col` | comparison.two-column | 双栏：放映整页分两栏；导出退化两列并排 |
| `quote` | — | 引言：引用居中放大，指令行后紧跟的首个引用行加大引号 |
| `closing` | closing.summary | 收束：整体居中压淡，清单换 ▸ 前缀 |

示例文档 `resources/demo/slides-demo.md` 每种版式一页，在文件面板点开即可放映。

### 架构：孤岛模块，最小化上游冲突面

实现刻意做成独立模块，避免对上游工程的合并影响：

- **独立 CM6 扩展打类**（`editor/slide-layout.ts` + `editor/slide-directives.ts`）：自己扫描语法树（HorizontalRule 分页 + CommentBlock/HTMLBlock 指令注释），与 live-preview 的 collectPages 平行、同行类叠加（CM6 行装饰可叠加），`live-preview.ts` **零改动**。
- **放映/导出宿主独立**（`slides-enhance.ts`）：进出场观察 body 的 presenting / slides-printing 类；翻页观察 `#slideshow-rules` 的样式文本（放映层每翻一页重写隐藏规则，页码就在里面），`slideshow.ts` 的版式相关接线**零改动**（另有放映翻页 bug 修复，见「顺手修复」）。若上游重构掉某个观察点，表现是版式安静失效（编辑一切正常），补回即可。
- **上游挂载点**：`editor/core.ts` 扩展注册 +1、`main.ts` 副作用导入 +1、`index.html` CSP 补 `frame-src blob:`（沙箱 iframe 必需）；另有 `slides-export.ts` 的纸面排版基线（全出血、字号、底色——本就是导出路径的版式实现，2026-11-16 重画时一并调整）。
- 版式色只引主题契约活变量（`--pele-accent`、`--text-*`、`--border-color`），换主题即换整套版式的皮；`.cm-md-slide-*` 类名与页面 Markdown 结构（标题/列表/引用）是公开契约，自定义主题与用户 CSS 可覆盖任何细节、可新增自有版式。

### 安全模型

- 页内 CSS 经属性白名单清洗（`scopeSlideCSS`：拒 `position: absolute/fixed`、`z-index`、伪协议 URL；`@media`/`@keyframes` 递归；括号不配平整段丢弃），选择器前缀锁定到当前页。
- 页面脚本跑在 `sandbox="allow-scripts"` 的 blob iframe 里（无 allow-same-origin，opaque origin，拿不到父文档与 localStorage）——「不碰编辑器」是结构保证。翻页重载 iframe 即全量清理（定时器/监听器/闭包一次清零）；脚本只能经 postMessage 桥调 `slide.setClass` / `slide.setVar` / `slide.setTimeout` / `slide.requestAnimationFrame`，落点记录在案、离场回滚。
- 用 blob URL 而非 srcdoc：渲染进程 CSP 是 `default-src 'self'`，srcdoc 继承父 CSP 会被拦；blob URL 只需 CSP 放行 `frame-src blob:`，应用自身的 script-src 依然不许内联。

### 顺手修复：放映走到中段就「凭空到顶」

**问题**：放映较长文档（如 12 页的 `slides-demo.md`）时，翻到第 4 页（「第一幕 · 数据的讲法」）之后点下一页毫无反应，无报错、不退出。

**根因**（`slideshow.ts` 的既有 bug，非版式系统引入，被页数够多的 demo 首次踩中）：CodeMirror 只为视口附近 ±1000px 的行建 DOM，`startSlideshow` 数页码时直接读 DOM——打开文档停在顶部时，后面的页根本不在 DOM 里，`pages` 数组只有前几页；`show()` 把索引钳在数组末尾，放映就停在「已绘制部分的最后一页」。导出路径 2026-09-26 修过同一个病（`slides-export.ts` 先 `await renderWholeDocument()` 再 `deckPages()`），放映路径漏掉了。

**修复**（`slideshow.ts` + `main.ts`）：`startSlideshow` 改 `async`，数页码前 `await renderWholeDocument()` 强制整篇渲染；整篇渲染保持到散场（`stopSlideshow` 里 `restoreViewport()` 还原）——跳远页（End/Home）时那些行也得在 DOM 里。加了 `starting` 闸挡住渲染等待期间快捷键自动重复的重入。`main.ts` 调用处补 `await`。

**架构说明**：这是上游放映层的真实 bug 修复，不属于版式功能的接线；下面的「三处三行」指版式功能的挂载点，不含本修复。合并上游时此修复应一并带回。

## 版本同步

- `package.json` / `package-lock.json` / `themes/contract.json`：`2.7.13-rc.2`
- `resources/demo/changelog.md`：新增 v2.7.13-rc.2 段落（该段落即 GitHub Release 正文来源），rc.1 段落恢复纯维护版描述
- `README.md` / `README_CN.md`：新增 v2.7.13-rc.2 条目，rc.1 条目恢复
- `docs/packaging.md`：当前版本引用更新

Android 的 `versionName` 由 `android/app/build.gradle` 从 `package.json` 读取，跟随为 `2.7.13-rc.2`（`versionCode` = 20713，取数字部分，rc 后缀无影响）。

## 涉及文件

新增：

- `src/renderer/editor/slide-directives.ts`（指令解析 + scopeSlideCSS 纯函数）
- `src/renderer/editor/slide-layout.ts`（独立 CM6 扩展，版式行装饰）
- `src/renderer/slides-enhance.ts`（放映页内 CSS / JS 沙箱宿主、导出 CSS 注入）
- `src/renderer/themes/slides.css`（十种内置版式）
- `resources/demo/slides-demo.md`（版式示例文稿）
- `docs/release-2.7.13-rc.2.md`（本文件）

修改：

- `src/renderer/editor/core.ts`（+1 行扩展注册）
- `src/renderer/main.ts`（+1 行副作用导入；`startSlideshow` 调用处补 `await`）
- `src/renderer/slideshow.ts`（放映修复：数页码前渲染整篇、散场还原、起手闸）
- `src/renderer/index.html`（CSP 补 `frame-src blob:`）
- `scripts/verify-features.mjs`（新增两条版式断言：版式类落行、指令不进正文）
- `package.json` / `package-lock.json` / `themes/contract.json`
- `resources/demo/changelog.md`、`README.md`、`README_CN.md`、`docs/packaging.md`

## 验证

已通过（本机）：

- 五份 `tsconfig` 类型检查全过
- `npm run build`（electron-vite，三端产物正常）
- `npm run verify:theme-contract`（`2.7.13-rc.2`，slides.css 只用活变量）
- `npm run verify:markdown`（93 SAME / 0 DIFF）
- `scanSlideDirectives` 与 `scopeSlideCSS` 纯函数断言（esbuild 打包后 Node 直跑）：页归属与 collectPages 语义一致、页中指令降级为普通注释、多行指令整块覆盖、CSS 白名单拒 position:fixed/z-index、@keyframes/@media 递归、括号不配平整段丢弃

待补（本机 Electron 创建窗口崩溃，已知环境限制）：

- Electron UI 验收脚本（verify:features 已含两条版式断言 / verify:scroll-render / verify:themes）在可用环境补验
- 人工过一遍 `resources/demo/slides-demo.md`：十种版式的放映效果、页内 CSS、JS 桥、导出 PDF（版式应保留、脚本不执行）
- two-col 的 `column-count` 在放映下与 CM6 gap 元素的相互作用需实机确认
- JS 沙箱在 Android WebView 的 CSP 兼容性（受限时静默降级为静态，不崩溃）

## 发布注意

- tag `v2.7.13-rc.2` 全新 tag，推送触发 `.github/workflows/release.yml` 三平台构建；Release 正文从 `resources/demo/changelog.md` 提取以 `## v2.7.13-rc.2` 开头的段落，compare 起点取上一版本 `v2.7.13-rc.1`，当前段落写法与提取规则兼容。
- rc.1 若已发过 tag/Release，rc.2 的 compare 起点是它；若 rc.1 未正式发版，按仓库惯例仍以 `v2.7.12` 为 compare 起点并在 Release 里注明包含 rc.1 修复。
- 发布桌面安装包只跑 `npm run build`，不要先跑 `build:lib`。
- 转正时（2.7.13）：`package.json` / `package-lock.json` / `themes/contract.json` 去掉 `-rc.2` 后缀，changelog 段落标题同步改，中英文 README 的 rc 条目合并。
