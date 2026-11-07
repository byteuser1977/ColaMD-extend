# ColaMD Extend v2.7.10-rc.1 版本说明

本文件记录 `2.7.10-rc.1` 的代码改动、验证结果与发布注意事项。版本从 `2.7.9` 上升一个小版本；基座仍是上游 v2.7.7。本版没有新功能，全部是导出链路上的三处修复：Word 导出行内公式折行、Word 导出 Mermaid 配色跟随主题、PDF 导出不再带上图表的缩放控件。

## 代码改动

### 1. Word 导出行内公式不再折行（P0）

导出 Word 后，「勾股定理：$a^2 + b^2 = c^2$」这类行内公式在图片里断成两行（`a² + b² =` / `c²`）。

根因在截图窗口（`src/main/math-export.ts` 的 `renderShots`）：每截完一条就把窗口缩到该条内容的宽度，下一条公式在窄窗口里测量时，`inline-block` 的 stage 被窗口宽度压住，稍宽的行内公式在 KaTeX 内部折行——截出来的 PNG 本身就是两行，Word 里看到的「换行」是图片内容折了，不是 Word 排版问题。

修复：每条内容测量前先把窗口撑回 `MEASURE_WIDTH = 2000`，量出自然尺寸后再缩到实际大小截图。HTML 块（固定宽度）与公式的测量路径共用同一处，行为不变；宽于 2000px 的内容仍会折行，但那类内容在 Word 里也会被缩到页宽，属于可接受边界。

### 2. Word 导出的 Mermaid 配色跟随主题

此前 `markdownForWord()` 无条件用内置浅色调色板（`PRINT_PALETTE`）画图，即使用户选的是雅致、新闻纸这类浅色主题，导出的图也是默认 Light 主题的颜色，与界面渲染不一致。

新规则（与 `readDocxStyle()` 正文颜色的规则同一条）：**浅色主题跟随主题，深色主题整体回落浅色**（Word 是白纸）。

- `src/renderer/editor/mermaid-export.ts` 新增 `diagramPrintPalette()`：从 `readDocxStyle()` 已经算好的主题令牌（`--code-block-bg` / `--code-block-text` / `--link-color`），照 `themes/editor-preview.css` 的 `.cm-md-mermaid` 同一套混合公式（18% / 28% / 45% 三档）推出 Pele 八色；混合在 JS 里实现（`mixSrgb`），等价于 `color-mix(in srgb, …)`。
- `src/renderer/editor/mermaid-bridge.ts`：`renderMermaid()` 接受外部调色板（`options.palette`），原硬编码 `PRINT_PALETTE` 降级为未传时的兜底。
- `src/renderer/main.ts`：导出 Word 时把 `diagramPrintPalette(style)` 传进去。
- 深色主题经由令牌回落自然落到浅色板，不需要额外做一次明暗判断。注意一个预期变化：深色主题下导出的图底色从纯白变为浅灰（F6F8FA，与浅色主题一致）。

公式截图在浅色主题下颜色本来就跟随主题文本色（`style.text`），KaTeX 字形固定用自带数学字体，无需改动。

### 3. PDF 导出不再带上 Mermaid 的缩放控件

图表放不下阅读列宽时，pele 会在图右上角挂一排缩放控件（`.pele-zoom`）。四条导出路的处理：

| 导出 | 控件去向 |
|------|---------|
| Word | 重新画图，不经过屏幕 DOM，天生没有控件 |
| 图片 / HTML | 序列化前由 `withDiagramZoomPaused` 临时藏掉 |
| PDF | 打印的是当前窗口本身，打印时 Chromium 不执行脚本，控件来不及收起，**会叠在图上** |

修复：`src/renderer/print-layout.ts` 的纸面规则新增 `body.paper .pele-zoom { display: none !important; }`。`body.paper` 是文档 PDF 与幻灯片 PDF 两条打印路共用的状态（`__colamdPrintExport.enter()` → `enterPaperLayout()`），`!important` 压过 pele 写在元素上的内联样式；导出结束纸面规则移除，屏幕上的缩放控件照常可用。图片/HTML 导出的摊平阶段也会带上这条规则，属于无害的双保险。

### 4. 文档

- `docs/word-export.md`：「为什么深色主题回落浅色板」一节补充 Mermaid 调色板的新推导方式。
- `docs/packaging.md`：Extend 功能改动记录引用路径加上本文件。

## 版本同步

- `package.json` / `package-lock.json` / `themes/contract.json` 统一为 `2.7.10-rc.1`
- `resources/demo/changelog.md` 新增 v2.7.10-rc.1 条目
- `README.md` / `README_CN.md`：v2.6.0 条目里「Mermaid 按浅色画」的描述更新为新规则

## 涉及文件

修改：

- `src/main/math-export.ts`：测量前撑宽窗口（`MEASURE_WIDTH`）
- `src/renderer/editor/mermaid-export.ts`：`diagramPrintPalette()` + 调色板透传
- `src/renderer/editor/mermaid-bridge.ts`：`renderMermaid` 接受 `palette`
- `src/renderer/main.ts`：Word 导出传入按主题推导的调色板
- `src/renderer/print-layout.ts`：纸面规则隐藏 `.pele-zoom`
- `docs/word-export.md`、`docs/packaging.md`
- `package.json` / `package-lock.json` / `themes/contract.json`：版本号
- `resources/demo/changelog.md`、`README.md`、`README_CN.md`

## 验证

已通过：

- `npm run build`（electron-vite，无类型错误、无编译错误），三处改动均确认进入 `dist/` 产物

已知限制：

- 三处修复均未在真实 Electron 环境跑端到端导出验收；建议本地分别导出 Word（含行内公式 + Mermaid）、PDF（图放不下的文档）各一份确认效果
- 行内公式宽于 2000px 时仍会在截图里折行（见第 1 节边界说明）
