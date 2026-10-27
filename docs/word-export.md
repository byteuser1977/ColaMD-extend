# Word 导出实现方案

本文说明「导出 Word…」菜单项背后整条链路的结构，以及每个结构决定背后的原因。实现分布在五个文件里，读代码前先读这篇，能少走一遍弯路。

## 一句话

**Word 导出是一条「先把一切翻译成 Markdown + 图片字典，再逐节点映射成 OOXML」的流水线。**

Word 没有 CSS，也看不懂 Markdown。所以整条链路分两段：

```
渲染进程（预处理）                     主进程（生成）
┌──────────────────────────┐    ┌─────────────────────────────┐
│ 1. readDocxStyle()       │    │ unified+remark 解析 Markdown │
│    读主题令牌              │    │        ↓                    │
│ 2. HTML 块 → 截图          │    │ 逐节点映射成 docx 对象        │
│ 3. 公式 → 截图            │ ──→ │  （Paragraph/Table/ImageRun）│
│ 4. Mermaid 图 → 截图      │IPC │        ↓                    │
│ 5. 远程图片留给主进程下载   │    │ Packer.toBuffer() → .docx   │
└──────────────────────────┘    └─────────────────────────────┘
```

关键不变式：**进主进程的永远是一份纯 Markdown 文本 + 一个「文件名 → PNG data URL」字典 + 可选的尺寸表**。主进程不碰 DOM，渲染层不做 OOXML。

## 文件分布

| 文件 | 职责 |
|---|---|
| `src/renderer/editor/docx-style.ts` | 从当前主题的计算样式读出颜色/字体/字号，打包成 `DocxStyle` |
| `src/renderer/editor/html-export.ts` | 找出 HTML 块，消毒后送截图，把原文替换成 `![HTML](colamd-html-N.png)` |
| `src/renderer/editor/math-export.ts` | 找出 `$…$` / `$$…$$`，KaTeX 渲染后送截图，替换成 `![公式](colamd-math-…-N.png)` |
| `src/renderer/editor/mermaid-export.ts` | `markdownForWord()`：Pele 围栏画成 PNG，替换成 `![示意图](colamd-diagram-N.png)` |
| `src/main/docx-export.ts` | Markdown → docx 的全部映射规则 |
| `src/main/math-export.ts` | 截图窗口（相机），同时服务公式与 HTML 块 |
| `src/main/index.ts` | `export-docx` IPC：存盘对话框、组装参数、写文件 |

## 渲染端预处理：三段替换，顺序有讲究

`src/renderer/main.ts` 里 `onMenuExportDOCX` 的顺序是固定的：

```ts
const style = readDocxStyle()
const html = await markdownWithHtmlImages(getContent(), `#${style.text}`)
const math = await markdownWithMathImages(html.content, isChinese(), `#${style.text}`)
const payload = await markdownForWord(math.content, isChinese())
await api.exportDOCX({ content, images, imageSizes, style })
```

**HTML 块必须先于公式替换。** 每一段替换都会改变文本偏移量；公式扫描用 Markdown 解析器现解析替换后的文本（不是复用编辑器的旧语法树），所以上一层替换后语法树必须重新建。反过来先换公式，HTML 块里的 `$…$` 会被误当成公式。扫描用 CodeMirror 的 markdown parser（`markdownLanguage.parser.parse`），不引入第二套解析器。

**Mermaid 最后。** 它只认围栏文本，前两步都不会碰它。

**替换从后往前做。** 三处实现（`html-export.ts`、`math-export.ts`、`mermaid-export.ts`）都是先收集 `[{from, to, name}]`，再按 `from` 降序逐段切片拼接。从前往后换，后面所有偏移量都会失效。

**一段坏内容只损失它自己。** KaTeX 渲染抛错的公式直接跳过（保留原文）；截图失败返回 null（保留原文）；消毒后为空的 HTML 块（例如只有 `<script>`）不送截图。任何一步失败都不该让整篇导出失败——这与 Mermaid 的降级规则一致。

### 偏移量陷阱：嵌套

HTML 块扫描有一步去重：父块已经包含子块时只截一次。CodeMirror 的 `iterate` 会同时进入嵌套节点，不去重就会同一段 HTML 出两张图。

## 主题令牌通道

### 为什么深色主题回落浅色板

Word 是白纸。深色主题的浅色字搬到 Word 上会看不见，所以 `readDocxStyle()` 用背景亮度判据（`luminance(--bg-color) < 0.5`）整体回落到 `LIGHT` 调色板，而不是逐色转换。这与 Mermaid 导出挑浅色配色是同一条规则。

### 颜色怎么读

CSS 变量的原始值可能是 `oklch(...)`、`rgb(...`、带透明度的任意写法，docx 只认 6 位十六进制。`painted()` 用一根 1×1 的 canvas 把颜色**按浏览器的方式合成到白纸上**再读回 RGB——透明色会被合成出真实观感，无效值靠哨兵色（`#010203`）识别后返回 null 走 fallback。这个函数是整条通道里唯一做颜色空间转换的地方。

### 字体怎么读

主题可以直接在 `#editor .cm-content` 上写字体（雅致就是），所以不能只读 `--font-body`。`editorFontStack()` 往 `#editor` 里临时插一根带 `.cm-content` 类名的隐形探针，读 computed `fontFamily` 再移除。源码模式下 `.cm-content` 会被等宽规则接管，所以读之前临时摘掉 body 的 `source-mode` 类，同一帧内还原，不会真的画出来。

### 字号与行高是约定值，不是读取值

`bodySize: 16`、`lineHeight: 1.75` 硬编码在 `readDocxStyle()` 里，与导出 HTML 的 `.colamd-document` 保持一致。理由：主题 CSS 里正文字号可能写在多层选择器上，读计算值容易拿到缩放后的值；而 Word 导出要求与 HTML/PDF 导出观感一致，约定值更可控。

### 主进程侧的归一化

`docx-export.ts` 的 `normalizeStyle()` 对每个字段做类型与范围校验（`hexColor` / `numberValue`），任何字段不合法都回落 `DEFAULT_STYLE`（浅色）。这是通道的最后一道防线：主进程拿到的 payload 可能来自旧版渲染层或离线脚本，缺失字段不能让导出崩掉。

## 截图窗口（相机）

公式与 HTML 块走同一个函数 `renderShots()`（`src/main/math-export.ts`）。

**为什么不能用 canvas/foreignObject 在前台直接画**：KaTeX 的排版依赖它自己的字体与 CSS，塞进 SVG 会丢字体。所以需要一个真的能加载整套样式的环境——复用 2.7.7 导出图片那套「隐藏窗口当相机」模式：

```
show:false + sandbox:true + backgroundThrottling:false 的 BrowserWindow
  → 写临时 HTML（应用全部样式表 + 覆盖规则）→ loadFile
  → 逐条：塞内容 → 等字体/图片/两帧 rAF → 量尺寸 → setContentSize → capturePage
```

三条细节决定成败：

1. **`backgroundThrottling: false` 必须开**。隐藏窗口默认不出帧，`capturePage` 会永远等不到画面。
2. **每条内容单独设窗口尺寸再截**。公式和 HTML 块高矮差别大，统一尺寸会在图里留大片空白，插进 Word 还会撑开行高。HTML 块固定 600px 宽（与阅读列宽一致），公式按内容自适应。
3. **CSS 里的相对 URL 要先转绝对**（`absolutize()`）。临时 HTML 在另一个目录，KaTeX 字体的相对地址会 404。

**样式的获取**：`wordExportStyles()` 遍历 `document.styleSheets` 把所有规则文本抄下来（跨域表读不到就跳过）。应用自己的 base.css 会给 body 设主题底色、`height:100%`、`overflow:hidden`，所以截图页里这组规则必须放在应用样式**前面**，后面那组覆盖规则才是最终生效层——顺序反了就是一片深底色截不出内容。

返回值是 `{ dataURL, width, height }`，CSS 像素尺寸直接作为图片在 Word 里的宽高（见下文 `imageSizes`）。

## 主进程映射规则（docx-export.ts）

解析用 `unified().use(remarkParse).use(remarkGfm)`。GFM 是必须的：表格对齐、任务勾选、删除线、脚注引用都来自它。解析前先剥 YAML frontmatter——判定规则与编辑器的 `frontmatterRange`（`math-scan.ts`）一致：开头 `---`、闭合 `---`/`...`、中间至少一行 `key:`。三者缺一就当普通分隔线处理。

### 元素映射速查

| Markdown | docx 结构 | 关键点 |
|---|---|---|
| 正文 | 默认样式 `Paragraph` | 行距 `paragraphLine = lineHeight × bodySize` 换算 twips（AT_LEAST），段后 `emTwips(bodySize, 0.75)` |
| 标题 h1–h6 | `HeadingLevel.HEADING_1…6` | 字号 `HEADING_SCALE = [1.9, 1.55, 1.3, 1.12, 1, 1]`，与 HTML 导出一致 |
| 有序/无序列表 | `numbering` 引用 | 见下节 |
| 任务项 | 普通段落 + `☑ `/`☐ ` 字形 | 不参与编号 |
| 代码块 | 一个 `Paragraph`，每行一个 run | 行间用 `<w:br/>`（见下节） |
| 行内代码 | `TextRun` + 等宽字体 + shading | |
| 引用 | 左边框 + `indent` + 次要文字色 | 内部逐块输出（见下节） |
| 表格 | `Table` 100% 宽 | 表头 `tableHeader: true`（跨页重复）+ 主题底色 |
| 图片 | `ImageRun` | 三种来源，见下节 |
| 脚注 | `FootnoteReferenceRun` + `footnotes` | 按正文首次引用顺序编号；定义里的表格被跳过（脚注容器只收段落） |
| `==高亮==` | `TextRun` + `shading.fill` | remark 不认识这个语法，在文本节点里用正则拆 |
| 链接 | `ExternalHyperlink` | |
| 删除线 | `strike: true` | GFM |
| 分隔线 | 只带下边框的空段落 | |
| 页脚 | `Footer` + `PageNumber.CURRENT/TOTAL_PAGES` | |

### 图片：三种来源，一个出口

`loadImage()` 按优先级找图：

1. `images` 字典里的 data URL（Mermaid/公式/HTML 截图都走这里）；
2. Markdown 里本来就是 `data:image/…` 的 URL；
3. 磁盘路径——相对路径基于文档所在目录解析（`imagePath()`），`file://` 先转路径。

远程图片（`https://`）在生成前由 `remoteImagesFor()` 统一下载（15 秒超时、20MB 上限），下载后转 PNG 塞进同一张字典。下载失败的图留下 `[alt]` 占位文字，不让整次导出失败。

**尺寸规则**（`imageSize()`）：截图类图片按 `imageSizes` 记录的 CSS 尺寸落版，超出纸面（600×420，HTML 块 600×800）等比缩小；普通图片按原始像素缩放到 560×420 内。没有这份尺寸表，公式截图会按 PNG 的物理像素（通常是 2 倍）落版，Word 里 giant 一片。

**块级图片一律居中**。独立成段的图片（包括截图替换出来的）统一 `AlignmentType.CENTER`，前后各留 1.2em。行内图片（段落里和文字混排的）不居中，作为 run 跟着文字走。

### 列表编号：为什么每个列表要一个 instance

Word 的编号是「编号定义 + 实例」两层。同一份 `ordered-1` 定义被两个列表共用时，第二个列表会接着第一个列表数。所以预扫描（`prepareLists()`）给每个列表发一个递增的 `instance`，保证编号各自重新开始。有序起点也参与：`prepareLists()` 顺手收集所有不同的 `start` 值，每个起点各生成一套 `ordered-{start}` 定义。

嵌套列表靠 `blockNodes()` 的递归深度 `listDepth` 选 level，缩进按 `360 + level × 360` twips。

### 代码块：`<w:br/>` 是硬要求

把整段代码塞进一个 `w:t` 时 Word **不按行渲染**（L2 实测 br 数量为 0，整块粘成一行）。所以每行单独一个 run，`break: index > 0 ? 1 : undefined` 显式换行；空行是 `text: ''` + break。底色、等宽字体、字号都来自主题，行距对齐编辑器 `pre code` 的 0.875em × 1.6。

### 引用块：为什么内部要逐块输出

早期实现把整块 `textContent` 塞进一个 run，两个引用段落会粘成一句（L2 实测）。现在 `blockquoteNodes()` 逐个子块输出：段落照常、列表项各自成段（带自己的缩进与序号）、代码块走 `codeParagraph(child, context, quote)`。注意属性展开顺序——代码块的 spacing/shading 写在 `...extra` **之后**，否则引用的样式会把代码块的底色行距盖掉。

### 行距与间距：全部跟主题与 CSS 联动

所有间距都从 `bodySize`（字号）或 `paragraphLine` 推导，没有一个独立于主题的硬编码数字。**行距的计量规则**：OOXML 里 `lineRule: AUTO` 是「单倍行距的倍数」，会把字体自身的度量（雅黑约 1.32em）再乘一遍，1.75 倍在 Word 里相当于编辑器 CSS 行高的 2.1 倍以上，导出明显偏松。所以行距一律用 `AT_LEAST` 绝对 twips（1px = 15），数值直接从 `themes/document.css` 换算；AT_LEAST 而非 EXACT 是为了行内图片等内容能撑开行高，不会被裁切。

| 位置 | 公式 | 默认值（16px / 1.75） |
|---|---|---|
| 正文行距 | `lineHeight × bodySize` px → twips，AT_LEAST | 420（28px） |
| 标题行距 | `emTwips(标题px, 1.35)`，AT_LEAST | h1 616 |
| 脚注行距 | `0.875em × 1.6`，AT_LEAST | 336 |
| 代码块行距 | `0.875em × 1.6`，AT_LEAST | 336 |
| 代码块上下 | `emTwips(bodySize, 1.0)` | 240 |
| 列表项段后 | `emTwips(bodySize, 0.3)`，显式 `before: 0` + 显式行距 | 72 |
| 引用段后 | `emTwips(bodySize, 0.5)` | 120 |
| 图片前后 | `emTwips(bodySize, 1.2)` | 288 |

列表项显式写 `before: 0` 与行距是有意的：OOXML 样式合并按属性逐个继承，只写 `after` 会让文档默认样式的段前 60 twips 与松行距泄漏到每个列表项上。CSS 侧的对应物是 `li { margin: 0.3em 0 }` 与继承的 1.75 行高。

调整任何一项时先想清楚它对应的 CSS 值是不是本来就该变——这些换算全部以编辑器渲染（HTML/PDF 导出同源）为基准，不是随手写的。

## IPC 与主进程收尾

`export-docx` handler（`src/main/index.ts`）只做四件事：校验 payload 类型、弹存盘对话框（文件名建议取自文档首行标题，`suggestFileName`）、动态 `import('./docx-export')` 生成 buffer、写盘后 `shell.showItemInFolder`。生成失败弹错误框，退出码 false。

移动端（Capacitor）没有这条链路，`capacitor-api.ts` 里的 `exportDOCX` stub 直接返回 false，菜单项在 Android 上不出现。

## 已知边界

- 列表项里只取第一个段落；段落后面的代码块、嵌套列表会被输出到列表外（`blockNodes` 递归时仍在列表缩进层，但不再有编号悬挂）。
- 脚注定义里的表格被静默跳过（Word 脚注容器只接受段落）。
- 行内 `<img>` 的 `style` 属性不生效，只有 src/alt 参与。
- `verify:docx-export` 真机验收脚本还没有——回归手段目前是 L2 阶段的 XML 结构断言，跑在 `npx tsc` 与人工 Word/WPS 打开确认之间。
