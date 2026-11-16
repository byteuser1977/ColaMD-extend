# ColaMD Extend v2.7.13-rc.1 版本说明

本文件记录 `2.7.13-rc.1` 的代码改动、验证结果与发布注意事项。这是一个维护版，没有新功能：集中修掉 v2.7.12 之后发现的两处回归（验收脚本在 Windows 上跑不起来、Word 导出丢失 `noProof`），收掉一批安卓导出与主题配色问题（PDF 只有一页、公式导出成源码、HTML 丢主题色、雅致/熊红图表浅色叠浅色、打印带上缩放控件），并把 `npm audit` 的 17 个漏洞清到 0。幻灯片版式系统在下一个 rc（`2.7.13-rc.2`）交付，见 `docs/release-2.7.13-rc.2.md`。

## 代码改动

### 1. verify:docx 的三个 Windows 兼容问题（P0）

**问题**：`npm run verify:docx` 在 Windows 上必然失败，连锁挡住三步。

**根因与修复**（`scripts/verify-docx.mjs`）：

| 步骤 | 根因 | 修复 |
|------|------|------|
| 定位仓库根 | `new URL('..', import.meta.url).pathname` 在 Windows 是 `/D:/...`，做不成 cwd | 改用 `fileURLToPath`（仓库约定见 `scripts/verify-workdir.mjs` 的注释） |
| 起打包进程 | `execFileSync('npx', ...)`：Windows 上没有 npx 这个可执行文件（只有 npx.cmd），不带 shell 的 spawn 一律 ENOENT | 改用 esbuild 的 JS API `build()`，与 `verify-markdown.mjs` 同一模式，跨平台 |
| 解包产物 | `unzip` 是 macOS/Linux 自带命令，Windows 没有 | 复制一份 `.zip` 后用 PowerShell `Expand-Archive` 兜底 |

### 2. verify:links 的工作目录回归（P0）

**问题**：`npm run verify:links` 在本机报 `Failed to write to output file: ... Access is denied`。

**根因**：脚本用 `os.tmpdir()` 建工作目录。本机 TEMP 指向 `z:\swap\temp`，node 进程能写（探针探测不到问题），但 esbuild 子进程的 outfile 写入被安全软件拒绝（EACCES）。这个问题在合并 v2.7.12 时被冲掉过一次，此次修复时确认 `node_modules/.cache` 是 esbuild 在各平台都能写的唯一位置（`verify-markdown.mjs` 的产物一直落在这里），于是把 `verify:links` 与 `verify:docx` 的工作目录统一落进 `node_modules/.cache`。

### 3. Word 导出补回 noProof（回归修复）

**问题**：`npm run verify:docx` 修通后暴露 2 条断言失败：代码 run 的 `<w:noProof/>` 计数为 0。

**根因**：主题化重写（合并 v2.7.10/11 时进入）把代码块渲染从 `codeRuns()` 换成了 `codeParagraph()`，行内代码也走了新的主题路径，#202 修复加上的 `noProof: true`（关掉 Word 拼写检查红波浪线）在两条路径上都丢了。docx 库 9.7.1 运行时支持该属性（`OnOffElement("w:noProof", ...)`），只是没人传。

**修复**（`src/main/docx-export.ts`）：

- `codeParagraph()` 的文本 run 补回 `noProof: true`
- 行内代码 run 补回 `noProof: true`
- 删除死代码：`codeRuns()` 及只被它使用的 `CODE_FONT`、`CODE_SIZE`（平台等宽字体选择已由 `fontName()` 承担）

### 4. verify:docx 断言修正

`quoteBreaks = 1` 的假设来自旧引用实现（两个段落用 `<w:br/>` 拼接）。引用块现在各自成段，不产生 br，期望值改为 `codeLines - 1`。这不是放松判据：`<w:br/>` 计数、noProof 计数等其余断言全部保留且仍然全绿。

### 5. 依赖安全清零

`npm audit` 17 → 0：

| 依赖 | 变化 | 修复的漏洞 |
|------|------|------------|
| electron | 44.9.0 → 44.11.3 | 4 个 high（指针锁定权限归错帧、GPU 帧几何、eMudhra 证书），随产物分发 |
| katex | 0.16.47 → 0.19.1 | 原型污染绕过信任限制；项目用 `renderToString` 且 `trust: false`，breaking 面不涉及 |
| @capacitor/cli | 6.x → 8.6.2 | tar 的 12 条 critical/high（硬链接路径穿越等）；CLI 8 与 android 运行时 6.2.2 兼容（`cap doctor` 通过，插件照常识别） |
| vite / fast-uri / source-map-js / undici / brace-expansion | `npm audit fix` 升级 | 各自的 DoS / 绕过类 advisory，全部 dev-only |
| @electron/universal | overrides 强制 ^3.0.6 | 其依赖的 minimatch 链（仅 macOS universal 打包用到） |
| app-builder-lib 的 minimatch | overrides 强制 ^11.0.8 | globparts DoS；作用域限定在 app-builder-lib，不动全局 minimatch，避免波及 glob 等其他使用者 |

无破坏的 6 项先由 `npm audit fix` 处理，katex 与 @capacitor/cli 两项 breaking 单独升级验证。

### 6. Android 导出 PDF 只有一页（P0）

**问题**：安卓端导出 PDF，长文档只得到第一页 A4（academic-demo 实测）。

**根因**：`enterPrintLayout()` 把移动端 UI 收起、解除固定高度后，用一个固定 3 秒的定时器恢复布局。用户在系统打印对话框里点「保存为 PDF」时，打印框架还会按纸张尺寸重排一次；定时恢复常常赶在这次重排之前，恢复后的固定高度把可打印内容截断成视口那一页。

**修复**：

- `MainActivity.java`：打印显式设置 A4 介质、300dpi、彩色模式（空 `PrintAttributes` 在部分 ROM 上分页行为不确定）；`pm.print()` 返回的 `PrintJob` 交给 `notifyPrintFinished()` 轮询（250ms，3 分钟兜底），结束/失败/取消后通过 `__colamdNativeResult('printDocument', {ok})` 回调 JS。
- `capacitor-api.ts`：`exportPDF` 不再睡固定时长，改为先 `setCleanExport(true)` → `renderWholeDocument()` 让整篇文档（含视口外行）完成排版 → 调原生打印 → 等回调（`PRINT_FALLBACK_TIMEOUT_MS = 180_000`）→ `finally` 里恢复布局并 `setCleanExport(false)`。
- `exportImage` 同步复用新的 `enterPrintLayout()`，保持两条导出链路一致。

### 7. 导出文件里残留 `$$…$$` 源码（P0）

**问题**：导出的 HTML / PDF / Word 里，块级公式显示为 `$$…$$` 原文，表格显示为 Markdown 表格文本，图表显示为围栏源码。

**根因**：`isBlockActive()` 依据光标位置决定块是渲染态还是编辑态。导出快照沿用同一个 `EditorState`，光标恰好停在块里时，块按源码交出。移动端 PDF 更严重：`exportPDF` 完全没有进入 clean export 状态。

**修复**（`live-preview.ts` / `capacitor-api.ts`）：

- `isBlockActive()` 在 `exportingCleanly(state)` 为真时直接返回 `false`，导出期间所有块按渲染结果交出。
- 移动端 `exportPDF` 补上 `setCleanExport(true)`，与桌面导出走同一状态。

### 8. 导出 HTML 丢失主题配色（P0）

**问题**：雅致主题导出 HTML 后，加粗、行内代码、表头、分隔线、行高全部回到默认值（用户提供的 `academic-demo-1794651441686.html` 实测）。

**根因**：应用内的配色差量写在 `.cm-md-*` 装饰类上；导出的 HTML 只有 `strong` / `code` / `th` / `hr` 这些语义标签，那些选择器一条都匹配不上，`document.css` 只能用默认值。

**修复**：

- `editor-preview.css` 新增「导出文档的主题差量」一节：按 `body.theme-*` 定义 `--doc-strong-color`、`--doc-code-color`、`--doc-code-bg`、`--doc-heading-color`、`--doc-hr-color`、`--doc-line-height`、`--doc-h1-border`、`--doc-h2-border`、`--doc-th-border-bottom`、`--doc-table-side-border`、`--doc-h1-align` 等变量，覆盖 elegant / sepia / writer / bear / notion / solarized-dark / nord / gruvbox / dracula / dark / midnight。
- `document.css` 改为消费这些变量，默认值写在使用处的 fallback（不能在 `:root` 声明：自定义属性里的 `var()` 在声明处求值，会把亮色主题的值定死）；`pre code` 显式恢复 `color: inherit`，块级代码不走行内代码的差量色。
- 导出时会内联整份 CSS 和 `body` 的主题类，变量自然生效。

### 9. 雅致 / 熊红主题的图表浅色叠浅色（P1）

**问题**：elegant、bear 两套主题下，图表的部分文字与连线是浅色，落在浅色纸面上几乎看不见（`docs/demo.md` 的 17 类图表逐一看过）。

**根因**：`.cm-md-mermaid` 的 `--pele-*` 按「图画在代码块底色上」取值，用的是 `--code-block-bg` / `--code-block-text`。但 mermaid 围栏是 `Decoration.replace({ block: true })` 整块替换：源码行连同 `.cm-md-codeblock` 一起消失，实测祖先链是 `.cm-content > .cm-lineWrapping > .cm-md-mermaid`，SVG 画布也不画背景。这两套「浅色主题 + 深色代码块」的主题因此把 `#e0dcd7` 这类浅色线条画在了 `#f0edea` / `#ffffff` 的纸面上。

**修复**：

- `editor-preview.css`：`--pele-bg` / `--pele-fg` / `--pele-muted` / `--pele-line` / `--pele-surface` / `--pele-surface-alt` / `--pele-border` 全部改从页面取（`--bg-color` / `--text-color`，混合比例仍是 18% / 28% / 45%）。浅色主题得到深字浅底，深色主题得到浅字深底，与其他浅色主题一致；导出 HTML 与打印共用同一套变量。
- `mermaid-export.ts`：Word 是白纸、PNG 先铺白底，`diagramPrintPalette()` 新增 `isDarkHex()` 判断，代码块底色偏深时改用白底 + 正文色，不再照搬浅色的 `codeBlockText`；`PaletteSource` 增加 `text` 字段，默认调用点补 `text: '24292F'`。

### 10. 打印 / 图片导出带上图表缩放控件（P1）

**问题**：安卓导出 PDF 时，图放不下阅读列宽，右上角的放大/缩小/还原按钮跟着图一起进了文件。

**根因**：桌面走 `body.paper` 那套打印样式把 `.pele-zoom` 藏掉了，移动端打印没有这层布局；只改内联 `display` 也不稳，widget 在打印前可能被 CodeMirror 重建一次。

**修复**：

- `mermaid-bridge.ts` 抽出 `pauseDiagramZoom()`：重置已放大视口、记下缩放控件的 `display` 并隐藏，返回恢复函数；原 `withDiagramZoomPaused()` 改为调用它。
- `capacitor-api.ts` 的 `enterPrintLayout()` 注入 `.pele-zoom { display: none !important; }` 样式表（重建后仍然生效）并调用 `pauseDiagramZoom()`，恢复函数里一并撤掉。

## 版本同步

- `package.json` / `package-lock.json` / `themes/contract.json`：`2.7.13-rc.1`
- `resources/demo/changelog.md`：v2.7.13-rc.1 段落标题与正文（该段落即 GitHub Release 正文来源）
- `README.md` / `README_CN.md`：v2.7.13-rc.1 条目
- `docs/packaging.md`：当前版本引用（原停在 2.7.11）

Android 的 `versionName` 由 `android/app/build.gradle` 从 `package.json` 读取，已跟随为 `2.7.13-rc.1`（`versionCode` = 20713，取数字部分，rc 后缀无影响）。

## 涉及文件

修改：

- `scripts/verify-docx.mjs`、`scripts/verify-links.mjs`
- `src/main/docx-export.ts`
- 导出修复：`src/renderer/capacitor-api.ts`、`src/renderer/editor/live-preview.ts`、`src/renderer/editor/mermaid-bridge.ts`、`src/renderer/editor/mermaid-export.ts`、`src/renderer/themes/editor-preview.css`、`src/renderer/themes/document.css`
- 安卓打印：`android/app/src/main/java/cn/bytechain/colamd/MainActivity.java`
- 构建：`electron-builder.yml`（Electron 产物改从 npmmirror 镜像下载，规避 GitHub 下载超时）
- `package.json` / `package-lock.json` / `themes/contract.json`
- `resources/demo/changelog.md`、`README.md`、`README_CN.md`、`docs/packaging.md`

新增：

- `docs/release-2.7.13-rc.1.md`

## 验证

已通过：

- `npm run build`（electron-vite，三端产物正常）
- `npx tsc --noEmit -p tsconfig.renderer.json`（导出修复后渲染层类型检查）
- 导出 HTML 主题配色在浏览器里量过：雅致加粗 `#c44b2b`、行内代码背景 `#e8e4df`、表头 2px 橙色下边线、衬线 + 行高 1.9、页面底色 `#f0edea`
- 图表配色在真实编辑器里量过（`docs/demo.md`，17 类图表）：雅致 `#2c2c2c` 落在 `#f0edea`、熊红 `#262626` 落在 `#ffffff`、深色主题回归 `#e6edf3` 落在 `#0d1117`
- `npm run verify:docx`（10/10，含 noProof 断言）
- `node scripts/verify-links.mjs --unit`（37/37；完整版含 Electron 窗口，见已知限制）
- `npm run verify:markdown`、`npm run verify:theme-contract`（2.7.13-rc.1）、`npm run check:theme-colors`（12 主题）、`npm run verify:lib`（KaTeX 0.19 公式渲染确认不变）
- `npx cap doctor`（CLI 8.6.2 + android 6.2.2 兼容）
- `npx cap sync android`（6 个插件正常识别）
- `npm run cap:build:android`（`BUILD SUCCESSFUL`，43s）
- `npm audit`：0 vulnerabilities

待补：

- electron-builder 打包冒烟（`npx electron-builder --win --dir`）：三次尝试均失败于下载辅助二进制（winCodeSign 等）网络超时，GitHub 与 npmmirror 镜像都拉不动，属本机网络问题，与本次升级无关。已做 `require('electron-builder')` 加载冒烟兜底。下次正式出包（`dist:win`）时顺带验证，重点观察 minimatch override 是否影响打包文件收集。
- Electron UI 验收脚本（verify:features / verify:scroll-render / verify:themes）需在 Electron 可用的环境补验。
- Android 真机验收（沿用 v2.7.12 待办）：除基础功能外，本版需重点复验——多页 PDF、块公式与表格按渲染结果导出、HTML 主题配色、雅致/熊红图表配色、PDF 与图片里没有缩放控件。

## 已知限制

- `verify:links` 的完整版（含 Electron 窗口的运行时检查）本机跑不了，单元部分已全绿。
- 本机无法启动桌面应用（`node_modules/electron/dist` 缺失、5173 端口被系统占用），导出修复的桌面端人工验收未做；安卓侧的多页 PDF 与打印行为也只有静态检查与类型检查，真机复验待补。
- `docs/social/` 不为 rc 版本撰写社交文案，正式版（2.7.13）发布时再补。

## 发布注意

- 本版是 rc：tag `v2.7.13-rc.1` 是全新 tag，不存在移位问题；tag 推送触发 `.github/workflows/release.yml` 三平台构建，Release 正文从 `resources/demo/changelog.md` 提取以 `## v2.7.13-rc.1` 开头的段落，compare 起点取下一节版本号 `v2.7.12`，当前段落写法与提取规则兼容。
- 发布桌面安装包只跑 `npm run build`，不要先跑 `build:lib`（`electron-builder.yml` 的 `files` 是 `dist/**/*`，会把库产物一起装进 asar）。
- `electron-builder.yml` 新增 `electronDownload.mirror`（npmmirror），用于规避 GitHub 下载 Electron 产物超时；镜像缺版本时删掉该配置即可回退官方源。
- 转正时（2.7.13）：`package.json` / `package-lock.json` / `themes/contract.json` 去掉 `-rc.1` 后缀，changelog 段落标题同步改，中英文 README 条目合并。
