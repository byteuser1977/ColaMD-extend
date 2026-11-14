# ColaMD Extend v2.7.13-rc.1 版本说明

本文件记录 `2.7.13-rc.1` 的代码改动、验证结果与发布注意事项。这是一个维护版，没有新功能：集中修掉 v2.7.12 之后发现的两处回归（验收脚本在 Windows 上跑不起来、Word 导出丢失 `noProof`），并把 `npm audit` 的 17 个漏洞清到 0。

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
- `package.json` / `package-lock.json` / `themes/contract.json`
- `resources/demo/changelog.md`、`README.md`、`README_CN.md`、`docs/packaging.md`

新增：

- `docs/release-2.7.13-rc.1.md`

## 验证

已通过：

- `npm run build`（electron-vite，三端产物正常）
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
- Android 真机验收（沿用 v2.7.12 待办）。

## 已知限制

- `verify:links` 的完整版（含 Electron 窗口的运行时检查）本机跑不了，单元部分已全绿。
- `docs/social/` 不为 rc 版本撰写社交文案，正式版（2.7.13）发布时再补。

## 发布注意

- 本版是 rc：tag `v2.7.13-rc.1` 是全新 tag，不存在移位问题；tag 推送触发 `.github/workflows/release.yml` 三平台构建，Release 正文从 `resources/demo/changelog.md` 提取以 `## v2.7.13-rc.1` 开头的段落，compare 起点取下一节版本号 `v2.7.12`，当前段落写法与提取规则兼容。
- 发布桌面安装包只跑 `npm run build`，不要先跑 `build:lib`（`electron-builder.yml` 的 `files` 是 `dist/**/*`，会把库产物一起装进 asar）。
- 转正时（2.7.13）：`package.json` / `package-lock.json` / `themes/contract.json` 去掉 `-rc.1` 后缀，changelog 段落标题同步改，中英文 README 条目合并。
