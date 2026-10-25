# ColaMD Extend v2.7.8-rc.1 版本说明

本文件记录 `2.7.8-rc.1` 当前尚未提交的代码改动、验证结果与发布注意事项。基座仍是上游 v2.7.7。

## 代码改动

### 1. 2.x 库渲染器（P0）

新增浏览器 ESM 库入口，供 ColaMD-themes 等外部导出工具链使用：

- `src/lib/index.ts`：`createColaMDEditor({ rootId, editable })`，返回 `applyTheme / setMarkdown / getMarkdown / ensureAllPluginsRendered / buildExportHTML / destroy`
- `src/lib/export-styles.ts`：导出 HTML 的样式整理
- `src/lib/contract.ts`：读取 `themes/contract.json`，作为活变量清单的唯一来源
- `vite.lib.config.ts`：独立库构建，产物固定为 `dist/lib/colamd-renderer.js` 与 `dist/lib/colamd.css`
- `tsconfig.lib.json`：库入口类型检查

构建采用 `inlineDynamicImports` 与 `assetsInlineLimit`，把 Pele 动态模块收进单文件、把 KaTeX 字体内联为 data URL，因此下游只需服务 JS 与 CSS 两个路径。

### 2. 导出变量契约（P1）

- 导出 HTML 的 `:root` 只输出 2.7.7 契约活变量：14 个主题色、4 个字体/列宽变量、9 个 `--pele-*`
- 活变量值从当前主题的计算样式读取；`--pele-*` 从 `.cm-md-mermaid` 读取；`body.style` 上的内联自定义属性一并带出
- 原样式表中 `:root` 与主题类里的自定义属性先被剥掉，避免外壳变量和死变量跟着产物走
- mermaid SVG 的 `var(--pele-*)` 在离线打开时仍能解析

### 3. 主题契约文件（P2）

新增 `themes/contract.json`，随 npm 包发布：

- `contractVersion`：`2.7.8-rc.1`
- `liveVariables`：27 个
- `deadVariables`：18 个，其中 `--table-border` 是源码核对后补充的（只定义、无消费）
- `deadSelectors`：`#write`、`.ProseMirror`、`body.theme-*`
- `editorHooks`：49 个，48 个来自 `editor-preview.css`，1 个运行时状态类 `cm-md-mermaid-ready`
- `peleVariables`：9 个
- `constraints`：`:root` only、禁用 `pt`、引用/代码块禁止纵向 padding

新增 `scripts/verify-theme-contract.mjs`，校验契约与源码是否漂移。

### 4. 独立主题验收 CLI（P3）

- `scripts/theme-verify-core.mjs`：把原 `verify-themes.mjs` 的夹具、探针与 CDP 逻辑抽成共用核心
- `scripts/verify-themes.mjs`：改为薄包装，仓库内行为不变
- `scripts/verify-themes-cli.mjs`：新的 `colamd-verify-themes` bin，接受 CSS 文件或目录，外部主题仓库可在 CI 中运行
- `package.json` 增加 `bin` 与发布文件清单

### 5. 导出翻译修复

`src/renderer/editor/clean-html.ts` 先识别块级 widget，再判断行类：

- mermaid 图与块公式不再被当成空代码块
- 导出的 HTML 从空 `<pre><code></code></pre>` 变为完整的图/公式
- 应用自身的 HTML 导出同步受益

### 6. 版本与发布配置

- `package.json` / `package-lock.json` / `themes/contract.json` 统一为 `2.7.8-rc.1`
- `package.json` 增加 `exports["./renderer"]`、`exports["./themes/contract.json"]`、`bin.colamd-verify-themes`
- `files` 收录 `dist/lib`、`themes/contract.json`、CLI 相关脚本
- 发布 npm 包：`npm run build && npm run build:lib`
- 发布桌面安装包：只跑 `npm run build`，避免 `dist/lib` 被 `electron-builder` 收进 asar

## 涉及文件

代码与配置：

- `src/lib/contract.ts`
- `src/lib/export-styles.ts`
- `src/lib/index.ts`
- `vite.lib.config.ts`
- `tsconfig.lib.json`
- `themes/contract.json`
- `scripts/verify-theme-contract.mjs`
- `scripts/theme-verify-core.mjs`
- `scripts/verify-themes-cli.mjs`
- `scripts/verify-themes.mjs`
- `scripts/verify-lib.mjs`
- `scripts/lib-window.cjs`
- `src/renderer/editor/clean-html.ts`
- `package.json` / `package-lock.json`

说明文件：

- `AGENT.md`、`PRINCIPLES.md`
- `README.md`、`README_CN.md`
- `docs/editor-architecture.md`、`docs/packaging.md`、`docs/theme-paradigm.md`
- `themes/README.md`、`themes/template.css`
- `resources/demo/changelog.md`

## 验证

已通过：

- `npx tsc -p tsconfig.lib.json --noEmit`
- `npx tsc -p tsconfig.web.json --noEmit`
- `npx tsc -p tsconfig.main.json --noEmit`
- `npx tsc -p tsconfig.preload.json --noEmit`
- `npm run build`
- `npm run build:lib`
- `npm run verify:theme-contract`
- `npm run verify:lib`（Chrome headless，11 项全部通过）
- `git diff --check`

已知限制：

- `npx tsc -p tsconfig.renderer.json --noEmit` 仍受移动端 `capacitor-api.ts` 导入 `src/preload` 的既有 `rootDir` 问题影响，不是本版引入
- `verify:themes` 与 `verify:themes:cli` 的 Electron 路径在本机受建窗崩溃（`0xC0000005`）限制，无法跑通；探针逻辑已用 Chrome + `dist/lib` 实测通过，需在可用环境补验 Electron 路径

## 不包含

本版不包含 P4（导入主题重名处理）、P5（`:root` 红线，现状已正确）、P6（字体/版本标识与 `--editor-font` 文档化）。
