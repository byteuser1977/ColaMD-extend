# ColaMD Extend v2.7.8-rc.2 版本说明

本文件记录 `2.7.8-rc.2` 尚未提交的代码改动、验证结果与发布注意事项。基座仍是上游 v2.7.7；rc.1 的 Android 移植、源码高亮、主题工具链已在 rc.1 中完成，rc.2 主要是 Word 导出完整功能链 + 图片导出一致性对齐。

## 代码改动

### 1. Word 导出（P0，新增）

菜单里「导出 Word...」第一次有了能跑的实现。整条链路：

- 渲染端先把主题令牌（颜色、字体、字号、行高）打包成 `DocxStyle`，公式与 HTML 块用同一个隐藏截图窗口先变成 PNG data URL，远程图片主进程里下载后也统一是 PNG。
- 主进程 `src/main/docx-export.ts` 用 `unified + remark` 解析 Markdown，再用 `docx` 库生成 OOXML。
- 主题令牌通过一条完整的通道传进去：`renderer/docx-style.ts`（从计算样式读取）→ `preload/index.ts` → `main/index.ts` → `docx-export.ts` 的 `normalizeStyle`。没有主题参数时走浅色默认值（`DEFAULT_STYLE`），旧调用与离线脚本不受影响。

**覆盖的元素类型：**

| 元素 | 方式 | 备注 |
|------|------|------|
| 正文/标题 | `Paragraph` + `HeadingLevel` | 字号比例 `HEADING_SCALE = [1.9, 1.55, 1.3, 1.12, 1, 1]`，与 HTML 导出一致 |
| 无序/有序列表 | `LevelFormat.BULLET/DECIMAL` | 每个列表一个 `instance`，保证编号各自重新开始；不同有序起点各一套 decimal level |
| 任务勾选 | 直接用字形 `☑` / `☐` | 不参与编号 |
| 行内代码 | 等宽字体 + 主题底色 | `--inline-code-bg` |
| 代码块 | 等宽字体 + 主题底色 + `<w:br/>` | 每一行单独一个 run，行间显式换行（否则 Word 会把两行粘成一行） |
| 引用 | 左边框 + 缩进 + 次要文字色 | 引用内的段落、列表、代码块各自成段 |
| 表格 | 100% 宽度 + 主题色边框 | 表头行重复 + 主题底色；单元格内对齐由 Markdown 的 `:---: :--- ---:` 控制 |
| 图片 | `ImageRun` + `nativeImage.toPNG()` | 本地路径、data URL、远程 URL 三种来源；块级图片一律居中 |
| 公式/HTML 块 | 先截成 PNG 再嵌 `ImageRun` | 由 `math-export.ts` / `html-export.ts` 渲染端发起，共用隐藏窗口相机 |
| 脚注 | `FootnoteReferenceRun` + `footnotes` 字段 | 按正文首次引用顺序编号，定义里的表格会被跳过（Word 脚注容器只接受段落） |
| 高亮 `==text==` | `TextRun` + `shading.fill` | 主题色底纹 |
| 链接 | `ExternalHyperlink` + 主题链接色 | 带下划线 |
| 删除线 | `strike: true` |  |
| YAML frontmatter | 整块剥掉 | 见 `frontmatterEnd()` 规则 |
| 页脚 | `Footer` + `PageNumber.CURRENT / TOTAL_PAGES` | 居中 |

**新增/修改文件：**

- `src/main/docx-export.ts`（新增，~500 行）
- `src/main/math-export.ts`（新增）：公式 + HTML 块截图，复用 `image-export` 的 BrowserWindow 模式
- `src/renderer/editor/docx-style.ts`（新增）：从 DOM 计算样式提取主题令牌
- `src/renderer/editor/math-export.ts`（新增）：渲染端发起公式/HTML 截图
- `src/renderer/editor/html-export.ts`（新增）
- `src/main/index.ts`：新增 `export-docx`、`render-math-images`、`render-html-images` 三个 IPC 处理函数
- `src/preload/index.ts`：新增对应 preload 接口
- `src/renderer/main.ts`：`exportCurrentDOCX` 把主题令牌与截图请求一起送出去，导出后恢复用户原来的编辑模式
- `src/renderer/capacitor-api.ts`：移动端 stub，返回 false

### 2. 图片排版修复（rc.2 回归）

`imageParagraph` 原本只给 `colamd-math-block-` / `colamd-html-` 前缀的截图图片居中，普通 `![]()` 块级图片都是左对齐。现在所有块级图片统一 `AlignmentType.CENTER`，并补前后留白 `emTwips(bodySize, 1.2)`。

### 3. 行间距主题联动（rc.2 回归）

此前多处 spacing 硬编码，主题 `lineHeight` 变化时脱节。现在全部跟随主题：

| 段落类型 | 改前（硬编码） | 改后（主题联动） | 默认值（bodySize=16, lineHeight=1.75） |
|----------|---------------|-----------------|--------------------------------------|
| 正文默认 after | 180 | `emTwips(bodySize, 0.75)` | 180 |
| 正文默认 before | 无 | `after × 0.33` | 60 |
| 标题 line | 324 | `paragraphLine × 1.35/1.75` | 324 |
| 脚注 line | 336 | `paragraphLine × 1.4/1.75` | 336 |
| 代码块 line | 384 | `paragraphLine × 0.9`（≥240） | 378 |
| 代码块 before/after | 180 | `emTwips(bodySize, 1.0)` | 240 |
| 列表项 after | 60 | `emTwips(bodySize, 0.5)` | 120 |
| 引用 after | 120 | `emTwips(bodySize, 0.5)` | 120 |

正文新增 `before: after × 0.33`，段间不再是「前紧后松」的不均匀。标题/脚注的行距保留了原来相对正文的比例（标题 line 约为正文的 77%、脚注约为 80%），只是不再跟主题 `lineHeight` 脱节。

### 4. 图片导出与上游 2.7.7 一致性核对

`src/main/image-export.ts` 与 upstream `v2.7.7` 做了逐文件 diff。唯一差异是 `exportHTML` 模板里的 CSS 选择器：

```
- #titlebar, #file-panel, #source-editor, #update-banner { display: none !important; }
+ #titlebar, #file-panel, #update-banner { display: none !important; }
```

`#source-editor` 是 upstream 里旧源码模式用的 textarea，extend 版架构改成源码模式跟渲染模式共用一个 CodeMirror 后，这个 DOM 元素已经不存在。删除这个选择器是正确同步，不是 bug。

其余整条链路（隐藏 BrowserWindow 创建参数、`resizeAndSettle` + `requestAnimationFrame` 等待、`capturePage` + `withTimeout` 超时保护、DPR 换算判据、单张 `captureWholeDocument` / 分页 `captureReadingPage` 回退）与 upstream 2.7.7 逐字一致。`math-export.ts` 新增的公式/HTML 截图模块复用了同一套 BrowserWindow 创建参数（`show: false` + `sandbox: true` + `backgroundThrottling: false`）与 capturePage 模式，没有另造一套。

### 5. 版本同步

- `package.json` / `package-lock.json` / `themes/contract.json` 统一为 `2.7.8-rc.2`
- `docs/packaging.md` 引用路径更新到 `release-2.7.8-rc.2.md`

## 涉及文件

新增：

- `src/main/docx-export.ts`
- `src/main/math-export.ts`
- `src/renderer/editor/docx-style.ts`
- `src/renderer/editor/math-export.ts`
- `src/renderer/editor/html-export.ts`
- `docs/release-2.7.8-rc.2.md`

修改：

- `src/main/index.ts`：新增 `export-docx` / `render-math-images` / `render-html-images` IPC
- `src/preload/index.ts`：新增 `exportDOCX` / `renderMathImages` / `renderHtmlImages` 接口
- `src/renderer/main.ts`：`exportCurrentDOCX` 送主题令牌 + 截图请求
- `src/renderer/capacitor-api.ts`：移动端 Word 导出 stub
- `package.json` / `package-lock.json` / `themes/contract.json`：版本号
- `docs/packaging.md`：引用路径

## 验证

已通过：

- `npm run build`（electron-vite，无类型错误、无编译错误）
- `git diff --check`
- 图片导出主链路逐文件 diff 与 upstream `v2.7.7` 一致

已知限制：

- Word 导出来自 screenshot 的图片（公式、HTML 块）在真实 Electron 渲染窗口中验证过；远程图片下载、`docx` 库生成的 OOXML 文档在 Word / WPS 中的视觉效果待用户实际导出验收
- `verify:image-export`、`verify:features` 等 Electron 真机验收脚本因本机 TRAE 沙箱限制无法跑通，编译后的 Electron 可执行版本用户已确认正常启动；建议在本地或 CI 环境补验图片导出的长文分页/接缝正确性
- 标题行里 YAML frontmatter 标记（---）如果紧邻 Markdown 分隔线，会被 frontmatter 识别逻辑整块剥掉，这两个语法本就不该共存，不算 bug

## 不包含

rc.2 不包含 Word 导出的以下增强（列入 backlog）：

- 列表多段（段落 + 代码块 + 嵌套列表）在同一个列表项里完整还原，现在只取第一个段落
- 表格内跨页重复表头的视觉确认（`tableHeader: true` 已设，但 Word / WPS 实测效果未验）
- `verify:docx-export` 真机验收脚本（类似 `verify:image-export` 那条色带编码思路）
