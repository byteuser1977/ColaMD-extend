# ColaMD Extend v2.7.12 版本说明

本文件记录 `2.7.12` 的代码改动、验证结果与发布注意事项。版本号与上游 v2.7.12 同名：上游的列表边界修复与大文档复制修复随 main 合并进入本版（见 `resources/demo/changelog.md` 对应条目），Extend 分支在此之上修好了 Android 端两件事：菜单「打开文件」载入失败，以及手机端多标签的体验问题。

## 代码改动

### 1. Android 菜单「打开文件」改走原生读取链路（P0）

**问题**：Android 上从菜单点「打开文件」，选完文件后内容不显示，看起来像没反应；从系统文件管理器点开 `.md` 反而是好的。

**根因**：两条路各走各的。

| 入口 | 读取方式 | 结果 |
|------|----------|------|
| 文件管理器点开 | `MainActivity.readContentFromUri` 原生读 `content://` URI | 可用 |
| 菜单「打开文件」 | `@capawesome/capacitor-file-picker` 返回的 `blob` / `path` | 不可靠 |

FilePicker 在 Android WebView 里 `blob` 可能为空，`path` 未必是 Cache 相对路径；读失败又被 `catch` 静默吞掉，用户只看到「没反应」。

**修复**：把菜单打开接到同一条原生链路。

- `android/app/src/main/java/cn/bytechain/colamd/MainActivity.java`
  - 新增 `openFilePicker()` 桥方法，发 `ACTION_GET_CONTENT`（`type = */*`，不按 MIME 过滤，文件管理器里 `.md` 常被报成 `application/octet-stream`）。
  - 新增 `onActivityResult`，用 `REQUEST_OPEN_FILE = 1001` 认领选择结果。
  - 抽出 `readAndDeliver(uri)`：Intent 打开与菜单打开现在共用同一套读取、序列化与投递代码。读失败经 `deliverReadFailure` 推给 JS 并写 logcat，不再静默。
- `src/renderer/capacitor-api.ts`
  - `openFile` 改为调用 `ColaMDNative.openFilePicker()` 并返回 `null`；内容仍经 `__colamdIntentFile` → `emitFileOpened` → `onFileOpened` 送达。
  - 删除 FilePicker 的类型定义与懒加载分支。

### 2. Android 改为单文档形态

**问题**：手机端标签栏在竖屏、横屏下都不顺手。竖屏换行后顶栏布局容易错乱，横屏则和菜单按钮、字数统计挤在同一行 36px 里，触控目标偏小。

**修复**：Android 不显示标签栏，一次只编辑一个文档，打开另一篇直接替换当前内容，靠「打开文件」与文件列表导航。

- `src/renderer/main.ts`
  - `renderTabBar()` 在 Android 提前返回，并保持 `#tab-bar` 隐藏。
  - 删除 `openAndroidFileTab()`；`onFileOpened` 去掉 Android 分支，回到「打开即替换当前文档」。
- `src/renderer/themes/base.css`
  - Android 下隐藏 `#tab-bar` 与 `.tab-new-btn`（连同此前已隐藏的 `#file-panel`、`#panel-resizer`）。
  - 删除胶囊标签样式与竖屏换行媒体查询，顶栏回到干净的一行。

### 3. 类型检查配置

`tsconfig.renderer.json` 的 `rootDir` 从 `src/renderer` 改为 `src`，修复 `capacitor-api.ts` 跨目录引用 `src/preload/index` 触发的 TS6059。该问题在合并前就存在，不是本版引入。

### 4. 版本与说明文件

- `package.json` / `package-lock.json` / `themes/contract.json` 统一为 `2.7.12`
- `resources/demo/changelog.md` 的 v2.7.12 条目补充 Android 两项修复（该段落即 GitHub Release 正文来源）
- `README.md` / `README_CN.md` 的 v2.7.12 条目补充 Android 两项修复

## 版本同步

- `package.json` / `package-lock.json` / `themes/contract.json`：`2.7.12`
- `resources/demo/changelog.md`：v2.7.12 段落标题与正文
- `README.md` / `README_CN.md`：v2.7.12 条目

Android 的 `versionName` 由 `android/app/build.gradle` 从 `package.json` 读取，已跟随为 `2.7.12`（`versionCode` = 20712）。

## 涉及文件

修改：

- `android/app/src/main/java/cn/bytechain/colamd/MainActivity.java`
- `src/renderer/capacitor-api.ts`
- `src/renderer/main.ts`
- `src/renderer/themes/base.css`
- `tsconfig.renderer.json`
- `package.json` / `package-lock.json` / `themes/contract.json`
- `resources/demo/changelog.md`、`README.md`、`README_CN.md`

新增：

- `docs/release-2.7.12.md`

## 验证

已通过：

- `npx tsc -p tsconfig.renderer.json --noEmit`（含修复后的 `rootDir`）
- `npx tsc -p tsconfig.preload.json --noEmit`
- `npm run build`（electron-vite，三端产物正常）
- `npm run check:theme-colors`（12 个内置与独立主题全部通过）
- `npm run verify:markdown`（93 条全部 SAME，0 条 DIFF）
- `npm run verify:theme-contract`（2.7.12，27 个活变量，50 个编辑器钩子，9 个 Pele 变量）
- `npm run cap:build:android`（Gradle `BUILD SUCCESSFUL`，产出 `android/app/build/outputs/apk/debug/app-debug.apk`）

待补：

- Android 真机验收：菜单「打开文件」能载入内容、竖屏与横屏顶栏布局正常、单文档切换不丢内容

## 已知限制

- `@capawesome/capacitor-file-picker` 依赖仍留在 `package.json` 与 `android/app/capacitor.build.gradle` 的注册里，但代码已不再调用。清理需要重跑 `npx cap sync android`，会重生成 android 工程文件，风险不小，本版不动它。
- 本版只打了 debug APK，release APK 未产出。

## 发布注意

- 本地已有 `v2.7.12` tag，指向 `7c22490`（上游 `release: v2.7.12` 提交），远端没有该 tag。发版前必须把 tag 移到本版提交，否则 CI 会按上游那次提交构建，extend 的改动不在包里。
- tag 推送触发 `.github/workflows/release.yml` 三平台构建；Release 正文从 `resources/demo/changelog.md` 提取以 `## v2.7.12` 开头的段落（awk 前缀匹配），compare 起点取下一节的版本号 `v2.7.11`。当前段落写法与提取规则兼容。
- 发布桌面安装包只跑 `npm run build`，不要先跑 `build:lib`（`electron-builder.yml` 的 `files` 是 `dist/**/*`，会把库产物一起装进 asar）。
