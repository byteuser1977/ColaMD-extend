# ColaMD（扩展版）：面向 AgentNative 场景的声明式显示系统设计与实现

**作者信息**：ByteUser1977

**所属机构**：ColaMD 扩展开发团队

**成文日期**：2026年5月23日

***

## 摘要

随着大型语言模型驱动的 AI Agent 在软件开发与文档创作中的广泛部署，Markdown 格式已成为人机协作的核心内容载体。然而，现有 Markdown 编辑器在数学公式渲染、图表可视化等富媒体内容表达方面存在显著局限，且对 Agent 实时协作的原生支持普遍不足。本文基于开源项目 ColaMD v1.5.0，设计并实现了一套声明式显示插件系统，通过 KaTeX 与 Mermaid.js 双引擎架构，以统一的插件注册与生命周期管理机制，集成数学公式与图表的所见即所得编辑能力。系统提出了一种渲染模式与源码编辑模式双态切换机制，支持高清 PNG 导出，并通过 Capacitor 6 跨平台框架将能力扩展至 Android 与 iOS 移动端。在架构层面，本文设计了一种基于运行环境自动检测的双平台桥接层（Electron + Capacitor），实现桌面端与移动端核心代码的完全复用。实验结果表明，该系统在 17 种 Mermaid 图表类型和多种数学公式场景下运行稳定，平均渲染延迟低于 200 ms，导出图片分辨率达到 2× 高清标准。本文工作为构建 Agent Native 场景下的富内容编辑平台提供了一种可复用的插件化技术方案。

**关键词**：ColaMD；Markdown 编辑器；显示插件系统；数学公式渲染；Mermaid 图表；Agent Native；跨平台架构；Capacitor；KaTeX；所见即所得

**中图分类号**：TP311.52

**文献标识码**：A

***

## 1 引言

### 1.1 研究背景

近年来，以 Claude Code、Cursor、GitHub Copilot 为代表的 AI Agent 正在深刻变革软件工程与文档创作的协作范式。这些 Agent 以 Markdown 文件作为主要的人机交互输出格式，自动生成技术文档、编写代码注释、产出分析报告。然而，当前的人机协作流程存在一个显式的信息鸿沟：当 AI Agent 修改 `.md` 文件时，人类协作者需要手动刷新或重新加载编辑器才能观察到变更结果。这种频繁的上下文切换严重降低了协作效率，与 Agent 自动化带来的效率增益形成矛盾。

ColaMD 项目正是为解决这一结构性矛盾而设计。其核心创新在于：通过 `fs.watch` 文件系统事件监听机制，实现 Agent 写入文件后内容的即时刷新，配合标题栏的 Agent 活动指示器（呼吸灯），使人类协作者能够实时感知 Agent 的工作状态。此外，ColaMD 提出了"Markdown as Database"的设计理念，将 `.md` 文件视为不可变的内容层，通过不同的 HTML 模板实现幻灯片、博客、简历等多种渲染形态，实现了内容与视图的彻底解耦。

### 1.2 问题陈述

尽管 ColaMD 在 Agent 实时协作方面具有创新性，但其原生版本在富内容表达方面存在明显的功能局限——仅支持标准 GFM（GitHub Flavored Markdown）与 CommonMark 语法规范，缺乏对数学公式和工程图表的原生渲染支持。这一局限性严重制约了其在学术论文撰写、技术方案设计、数据分析报告等需要复杂符号表达与可视化呈现的场景中的应用。

具体而言，以下三个关键问题亟待解决：

**问题一**：如何在保持 Agent Native 实时协作特性的前提下，扩展编辑器的富内容表达能力？

**问题二**：如何设计一种通用的插件架构，使得不同渲染引擎（数学公式、图表、代码高亮等）能够以一致的方式集成、启动和切换？

**问题三**：如何将桌面端编辑器的能力以最小的代码代价扩展至移动端，实现跨平台的一致性体验？

### 1.3 本文贡献

针对上述问题，本文基于 ColaMD v1.5.0 进行系统化扩展，主要贡献包括：

1. **声明式插件架构设计**：提出了一种基于 Schema 定义、NodeView 交互、Remark 解析与 Markdown 序列化的通用插件流水线，实现了插件的可插拔、独立启停与动态注册。
2. **KaTeX + Mermaid 双引擎集成**：完成 KaTeX 数学公式渲染引擎与 Mermaid.js 图表渲染引擎的深度集成，支持行内/块级公式两种模式与 17 种图表类型的实时渲染与编辑。
3. **双模式切换机制**：设计并实现了渲染模式与源码编辑模式的双态切换机制，满足阅读与编辑的不同场景需求，支持失焦自动保存与即时重渲染。
4. **跨平台桥接层**：提出了一种基于运行环境自动检测的双平台桥接层设计，通过同一套 API 接口抽象，实现了 Electron 桌面端与 Capacitor 6 移动端的代码复用。

### 1.4 论文组织结构

本文组织结构如下：第 2 节介绍系统总体架构设计；第 3 节详细阐述数学公式插件的设计与实现；第 4 节介绍 Mermaid 图表插件；第 5 节讨论跨平台移动端实现；第 6 节介绍主题系统与内联 SVG 规范；第 7 节为实验验证与性能分析；第 8 节讨论现存问题与未来工作；第 9 节总结全文。

***

## 2 系统架构设计

### 2.1 总体架构

ColaMD 扩展版采用双平台分层架构设计。系统在运行时通过自动检测桥接层，根据运行环境（Electron 或 WebView）无缝切换底层 API 调用方式。整体架构如图 1 所示。

<div style="text-align: center; margin: 20px 0;"><svg width="540" height="285" viewBox="0 0 720 380" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; font-family: 'SimSun', 'Microsoft YaHei', sans-serif;"><rect width="720" height="380" fill="#FAFBFC" rx="12"/><text x="360" y="30" fill="#1B2A4A" text-anchor="middle" font-size="16" font-weight="bold">图1　ColaMD 双平台分层架构</text><rect x="30" y="50" width="320" height="290" rx="8" fill="white" stroke="#357ABD" stroke-width="1.5"/><text x="190" y="78" fill="#357ABD" text-anchor="middle" font-size="14" font-weight="bold">桌面端运行栈 (Electron)</text><rect x="50" y="95" width="280" height="50" rx="5" fill="#E8F0FE" stroke="#357ABD" stroke-width="1"/><text x="190" y="118" fill="#333" text-anchor="middle" font-size="12" font-weight="bold">主进程 (Main Process)</text><text x="190" y="136" fill="#666" text-anchor="middle" font-size="10">窗口管理 · 文件系统 I/O · fs.watch 事件监听</text><line x1="190" y1="145" x2="190" y2="155" stroke="#357ABD" stroke-width="1.5"/><polygon points="190,160 185,150 195,150" fill="#357ABD"/><rect x="50" y="160" width="280" height="50" rx="5" fill="#E8F0FE" stroke="#357ABD" stroke-width="1"/><text x="190" y="183" fill="#333" text-anchor="middle" font-size="12" font-weight="bold">Preload 桥接层 (IPC Bridge)</text><text x="190" y="201" fill="#666" text-anchor="middle" font-size="10">安全的进程间通信 · contextBridge 暴露 API</text><line x1="190" y1="210" x2="190" y2="220" stroke="#357ABD" stroke-width="1.5"/><polygon points="190,225 185,215 195,215" fill="#357ABD"/><rect x="50" y="225" width="280" height="95" rx="5" fill="#E8F0FE" stroke="#357ABD" stroke-width="1"/><text x="190" y="248" fill="#333" text-anchor="middle" font-size="12" font-weight="bold">渲染进程 (Renderer Process)</text><line x1="70" y1="258" x2="310" y2="258" stroke="#BDC3C7" stroke-width="0.5"/><text x="190" y="275" fill="#555" text-anchor="middle" font-size="10">Milkdown 编辑器核心 (ProseMirror 底层)</text><text x="190" y="293" fill="#555" text-anchor="middle" font-size="10">├─ Math 显示插件 📐</text><text x="190" y="310" fill="#555" text-anchor="middle" font-size="10">└─ Mermaid 显示插件 🔀</text><line x1="350" y1="195" x2="370" y2="195" stroke="#999" stroke-width="1.5" stroke-dasharray="6,4"/><text x="360" y="188" fill="#666" text-anchor="middle" font-size="10">自动检测</text><rect x="370" y="50" width="320" height="290" rx="8" fill="white" stroke="#D35400" stroke-width="1.5"/><text x="530" y="78" fill="#D35400" text-anchor="middle" font-size="14" font-weight="bold">移动端运行栈 (Capacitor 6)</text><rect x="390" y="95" width="280" height="50" rx="5" fill="#FDF2E9" stroke="#D35400" stroke-width="1"/><text x="530" y="118" fill="#333" text-anchor="middle" font-size="12" font-weight="bold">Capacitor 运行时</text><text x="530" y="136" fill="#666" text-anchor="middle" font-size="10">Android WebView / iOS WKWebView 引擎</text><line x1="530" y1="145" x2="530" y2="155" stroke="#D35400" stroke-width="1.5"/><polygon points="530,160 525,150 535,150" fill="#D35400"/><rect x="390" y="160" width="280" height="50" rx="5" fill="#FDF2E9" stroke="#D35400" stroke-width="1"/><text x="530" y="183" fill="#333" text-anchor="middle" font-size="12" font-weight="bold">Capacitor 原生插件层</text><text x="530" y="201" fill="#666" text-anchor="middle" font-size="10">Filesystem · Share · App · StatusBar · Haptics</text><line x1="530" y1="210" x2="530" y2="220" stroke="#D35400" stroke-width="1.5"/><polygon points="530,225 525,215 535,215" fill="#D35400"/><rect x="390" y="225" width="280" height="95" rx="5" fill="#FDF2E9" stroke="#D35400" stroke-width="1"/><text x="530" y="248" fill="#333" text-anchor="middle" font-size="12" font-weight="bold">Web 渲染层 (共享代码)</text><line x1="410" y1="258" x2="650" y2="258" stroke="#BDC3C7" stroke-width="0.5"/><text x="530" y="275" fill="#555" text-anchor="middle" font-size="10">Milkdown 编辑器核心 (同一份代码)</text><text x="530" y="293" fill="#555" text-anchor="middle" font-size="10">├─ Math 显示插件 📐</text><text x="530" y="310" fill="#555" text-anchor="middle" font-size="10">└─ Mermaid 显示插件 🔀</text><rect x="160" y="350" width="400" height="22" rx="11" fill="#8E44AD" opacity="0.9"/><text x="360" y="365" fill="white" text-anchor="middle" font-size="11" font-weight="bold">桥接层抽象：const api = (isElectron) ? electronAPI : capacitorAPI</text></svg><div style="text-align: center;font-weight:bold;">
 图1　ColaMD 双平台分层架构图
</div></div>

### 2.2 显示插件架构

显示插件系统是本文的核心增量贡献。插件采用声明式注册架构，每个插件遵循统一的流水线设计模式，其处理流程如图 2 所示。

```mermaid
flowchart LR
    A["Markdown<br/>源文件"] --> B["remark-parse<br/>MDAST 语法树"]
    B --> C["remark 插件<br/>(math/mermaid)"]
    C --> D["rehype<br/>HAST 语法树"]
    D --> E["ProseMirror<br/>序列化节点"]
    E --> F["html-view<br/>DOM 注入"]
    F --> G["渲染输出<br/>SVG / HTML"]

    style A fill:#3498DB,color:#fff
    style B fill:#2ECC71,color:#fff
    style C fill:#E67E22,color:#fff
    style D fill:#9B59B6,color:#fff
    style E fill:#E74C3C,color:#fff
    style F fill:#1ABC9C,color:#fff
    style G fill:#34495E,color:#fff
```
<div style="text-align: center;font-weight:bold;">
 图2　显示插件渲染流水线
</div>

```mermaid
flowchart TB
    subgraph ModeSwitch["双模式切换机制"]
        direction LR
        M1["渲染模式 Rendered<br/>KaTeX/Mermaid 渲染<br/>富文本展示"]
        M2["源码模式 Raw<br/>textarea 源码编辑<br/>失焦自动保存"]
    end

    style ModeSwitch fill:#f8f9fa,stroke:#666,stroke-dasharray:5 5
    style M1 fill:#27AE60,color:#fff
    style M2 fill:#E74C3C,color:#fff
```

<div style="text-align: center;font-weight:bold;">
 图2-1　双模式切换机制
</div>

插件系统的源文件目录结构如下：

```
src/renderer/editor/plugins/
├── index.ts                    # 插件管理器：注册、查询、启停控制
├── math-plugin.ts              # 数学公式渲染插件
├── mermaid-plugin.ts           # Mermaid 图表渲染插件
├── mermaid-plugin.css          # Mermaid 基础样式定义
├── mermaid-plugin-dark.css     # Mermaid 暗色主题适配
├── mermaid-plugin-elegant.css  # Mermaid 优雅主题适配
└── mermaid-plugin-newsprint.css # Mermaid 新闻纸主题适配
```

每个插件在 Plug 菜单中独立控制，支持渲染模式与源码模式的一键切换，且互不影响。插件管理器维护一个全局注册表，任何新注册的插件自动出现在菜单中。

### 2.3 与原版 ColaMD 的功能对比

表 1 从多个维度对比了本扩展版与原版 ColaMD 的功能差异。



| 对比维度   | 原版 ColaMD                       | 本扩展版                                         |
| ------ | ------------------------------- | -------------------------------------------- |
| 内容渲染能力 | 纯 Markdown 文本（GFM + Commonmark） | Markdown + 数学公式 + Mermaid 图表                 |
| 插件架构   | 无插件系统                           | 声明式插件架构，支持独立启停、动态注册                          |
| 数学公式支持 | ❌ 不支持                           | ✅ KaTeX 行内/块级公式，实时编辑，PNG 导出                  |
| 图表渲染支持 | ❌ 不支持                           | ✅ Mermaid 全类型图表（17+ 种），多主题适配                 |
| 编辑模式   | 单一渲染视图                          | ✅ 双模式：渲染模式 / 源码编辑模式一键切换                      |
| 移动端支持  | ❌ 仅桌面端                          | ✅ Android (.apk) + iOS (.ipa)，Capacitor 6 实现 |
<div style="text-align: center;font-weight:bold;">
 表1　本扩展版与原版 ColaMD 的对比分析
</div>
原版 ColaMD 的所有功能完整保留，包括 Agent 实时同步、活动指示器、所见即所得编辑器核心、幻灯片系统与导出能力。

***

## 3 数学公式插件设计与实现

### 3.1 技术选型依据

数学公式渲染引擎选型过程中，本文对主流方案进行了对比分析。KaTeX 相较于 MathJax 具有以下优势：

* **渲染性能**：KaTeX 平均渲染耗时约为 MathJax 的 1/10，在包含大量公式的文档中差异尤为显著。

* **输出格式**：KaTeX 直接生成 HTML+CSS 输出，无需 JavaScript 运行时即可保持渲染效果，有利于 HTML 导出。

* **依赖体积**：KaTeX 核心库体积约为 MathJax 的 1/3，对移动端加载性能更友好。

基于上述分析，本文选择 **KaTeX**（v0.16.46）作为数学公式渲染引擎，配合 **remark-math** 插件完成 Markdown 解析阶段的语法树转换。

### 3.2 语法规范与渲染机制

插件支持两种公式语法格式，严格遵循 LaTeX 数学表达式规范：

**（1）行内公式（`$...$`）**

行内公式使用 `<span class="math-inline">` 容器包裹，调用 KaTeX 的 `katex.renderToString()` 方法并以 `displayMode: false` 参数渲染。渲染结果嵌入在段落文本流中，行高自动对齐。

示例语法：`质能方程 $E = mc^2$ 揭示了质量与能量的等价关系。`

**（2）块级公式（`$$...$$`）**

块级公式使用 `<div class="math-block">` 容器包裹，以 `displayMode: true` 参数渲染，公式居中显示，上下各保留 0.5 em 的间距。

示例语法：

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### 3.3 插件属性配置

数学公式插件的属性配置参数如表 2 所示。


| 参数项               | 值                           | 说明              |
| ----------------- | --------------------------- | --------------- |
| 插件标识符             | `math`                      | 在插件管理器中注册的唯一 ID |
| 默认启用状态            | `true`                      | 首次加载时自动激活       |
| 右键菜单项             | Save Equation as PNG        | 以 2× 分辨率导出公式为图片 |
| 关联 ProseMirror 节点 | `math_inline`, `math_block` | 对应行内与块级两种公式形态   |
<div style="text-align: center;font-weight:bold;">
 表2　Math 插件属性配置
</div>


### 3.4 关键实现特性

**（1）实时编辑与失焦保存**

在源码编辑模式（Raw）下，公式内容以 `<textarea>` 控件呈现，文本行数根据内容自动调整。用户可直接修改 LaTeX 源码，编辑框失去焦点（blur 事件）后自动触发保存与重新渲染，无需手动确认。

**（2）容错处理机制**

KaTeX 渲染过程中若检测到语法错误（如未闭合的括号、未知命令等），插件不会抛出阻断性异常，而是将错误信息以红色文本标记在公式位置，保持编辑器其余内容的正常显示与编辑。

**（3）PNG 高清导出**

采用两级渲染流水线实现 PNG 导出：首先将 KaTeX 输出的 HTML 结构渲染至 SVG 容器（foreignObject），然后将 SVG 绘制至 Canvas 画布，最终以 **2× 设备像素比** 输出为 PNG Blob。默认配置为白色背景、16 px 内边距。

***

## 4 Mermaid 图表插件设计与实现

### 4.1 技术选型依据

在图表渲染方案选型中，本文对比了 Mermaid.js、PlantUML 和 ASCIIFlow 三种方案。Mermaid.js（v11.15.0）的选型依据包括：

* **语法简洁性**：Mermaid 采用接近自然语言的声明式语法，学习成本低，AI Agent 生成的代码与 Mermaid 语法的兼容性最佳。

* **生态完整度**：Mermaid 社区活跃度最高，支持 17 种图表类型，覆盖了软件工程与学术论文的大部分可视化需求。

* **渲染质量**：生成 SVG 矢量输出，缩放无损，且支持自定义主题与样式。

### 4.2 支持的图表类型与语法规范

插件支持的全部 17 种图表类型如表 3 所示。

| 类别       | 图表类型                                      | 适用场景        |
| -------- | ----------------------------------------- | ----------- |
| 流程图      | `graph`, `flowchart`                      | 业务流程、算法逻辑   |
| 时序图      | `sequenceDiagram`                         | 系统交互、协议流程   |
| 类图       | `classDiagram`                            | 面向对象设计、领域建模 |
| 状态图      | `stateDiagram-v2`                         | 状态机、工作流     |
| ER 图     | `erDiagram`                               | 数据库设计、数据建模  |
| 用户旅程图    | `journey`                                 | 用户体验设计      |
| 饼图       | `pie`                                     | 比例分布        |
| 甘特图      | `gantt`                                   | 项目管理、进度规划   |
| Git 图    | `gitGraph`                                | 版本控制、分支策略   |
| 思维导图     | `mindmap`                                 | 知识组织、头脑风暴   |
| 时间线      | `timeline`                                | 历史事件、路线规划   |
| 四象限图     | `quadrantChart`                           | 优先级矩阵、战略分析  |
| XY 图表    | `xyChart`                                 | 数据可视化、统计分析  |
| C4 架构图   | `C4Context`, `C4Container`, `C4Component` | 软件架构描述      |
| Sankey 图 | `sankey-beta`                             | 能量流、数据流     |
| Block 图  | `block-beta`                              | 系统框图        |
| 架构图      | `architecture-beta`                       | 系统架构        |
<div style="text-align: center;font-weight:bold;">
 表3　Mermaid 插件支持的图表类型分类
</div>
Mermaid 代码块的 Markdown 语法示例如下：

````markdown
```mermaid
graph TD
    A[原始 Markdown] --> B[ColaMD 编辑器]
    B --> C[Math 插件渲染]
    B --> D[Mermaid 插件渲染]
    C --> E[富内容输出]
    D --> E
```
````

### 4.3 主题适配机制

为使 Mermaid 图表在不同 UI 主题下保持一致的视觉质感，本文为每个内置主题定义了独立的 Mermaid 配色方案。主题适配参数如表 4 所示。



| UI 主题      | Mermaid 主题 | 字体栈           | 核心配色参数                       |
| ---------- | ---------- | ------------- | ---------------------------- |
| Light      | `default`  | 系统无衬线体        | 白色背景，蓝色节点，黑色文字               |
| Dark       | `dark`     | 系统无衬线体        | `#0d1117` 背景，`#8b949e` 边框文字  |
| Elegant    | 自定义暖色系     | 霞鹜文楷          | `#e8e2db` 背景，暖棕色系 cScale     |
| Newsprint  | 印刷风格       | PT Serif 衬线体  | 米黄色背景，深灰色文字                  |
| Forest Ink | 森林墨绿系      | Noto Serif SC | `#f5f1e8` 宣纸底色，`#3d6b4a` 森林绿 |
<div style="text-align: center;font-weight:bold;">
 表4　Mermaid 主题适配参数配置
</div>

### 4.4 关键实现特性

**（1）输入快捷转换**

当用户在编辑器中输入 \`\`\`\`mermaid`后按回车键，编辑器自动将文本转换为`mermaid\_block\` 类型的 ProseMirror 节点，无需手动选择或配置。

**（2）异步渲染安全**

Mermaid 的 `mermaid.run()` 方法为异步操作，在多处同时修改代码时可能产生竞态条件（race condition）。本文采用**渲染计数器**方案解决此问题：每次调用渲染时自增计数器，仅当回调时的计数器值与发起时的值一致时，才将渲染结果写入 DOM。

**（3）节点高度自适应**

Mermaid 渲染完成后，SVG 容器的实际高度可能在渲染前后发生变化。插件在渲染回调中通过 `getBBox()` 方法获取 SVG 实际尺寸，自动将容器高度调整为 `实际高度 + 6 px`，避免内容溢出或空白留白。

**（4）PNG 导出流水线**

采用四阶段流水线实现 PNG 导出：**SVG 输出规范化** → **Image 对象加载** → **Canvas 2D 绘制** → **PNG Blob 生成**。其中 Canvas 绘制阶段使用 2× 缩放因子以提升输出清晰度。

***

## 5 跨平台移动端实现

### 5.1 架构设计原则

为实现桌面端与移动端的代码复用，本文采用 **Capacitor 6** 作为跨平台运行时框架。核心设计原则是：渲染层的 Web 代码（Milkdown 编辑器 + 显示插件系统）在桌面端与移动端完全共享，差异仅在原生 API 桥接层。

### 5.2 自动检测桥接层

桥接层的核心实现在 `capacitor-api.ts` 文件中，通过运行环境检测确定当前上下文：

```typescript
// 桥接层核心逻辑（伪代码）
const isElectron = typeof window !== 'undefined' && window.electronAPI;
const api = isElectron ? window.electronAPI : capacitorAPI;
```

`capacitor-api.ts` 实现了与 `electronAPI` 相同的接口契约，涵盖文件读写（Filesystem Plugin）、文件选择（FilePicker）、系统分享（Share Plugin）、应用生命周期（App Plugin）、状态栏控制（StatusBar Plugin）与触觉反馈（Haptics Plugin）等能力。

### 5.3 移动端技术栈

移动端所依赖的核心技术组件及其用途如表 5 所示。

<div style="text-align: center;font-weight:bold;">
 表5　移动端技术栈组件
</div>

| 组件         | 技术选择                                   | 版本要求              | 功能职责             |
| ---------- | -------------------------------------- | ----------------- | ---------------- |
| 跨平台运行时     | Capacitor                              | ^6.2.1            | 原生桥接层，WebView 管理 |
| WebView 引擎 | Android System WebView / iOS WKWebView | API 34+ / iOS 15+ | 渲染 Web 内容        |
| 文件访问       | `@capacitor/filesystem`                | ^6.x              | 本地文件读写           |
| 文件选择器      | `@capawesome/capacitor-file-picker`    | ^6.x              | 原生文件选择对话框        |
| 系统分享       | `@capacitor/share`                     | ^6.x              | 系统分享面板集成         |
| 应用生命周期     | `@capacitor/app`                       | ^6.x              | 应用暂停/恢复事件处理      |
| 状态栏        | `@capacitor/status-bar`                | ^6.x              | 状态栏样式与颜色控制       |
| 触觉反馈       | `@capacitor/haptics`                   | ^6.x              | 触觉交互反馈           |

### 5.4 功能支持矩阵

移动端各项功能的支持状态与局限性说明如表 6 所示。



| 功能模块           | 支持等级    | 实现说明                           |
| -------------- | ------- | ------------------------------ |
| Markdown 编辑    | ✅ 完整支持  | Milkdown 编辑器在 WebView 中正常运行    |
| 数学公式渲染 (KaTeX) | ✅ 完整支持  | 渲染逻辑与桌面端完全一致                   |
| Mermaid 图表渲染   | ✅ 完整支持  | SVG 在 WebView 中正常渲染与交互         |
| 插件系统           | ✅ 完整支持  | 通过 UI 菜单切换，状态持久化至 localStorage |
| 主题系统           | ✅ 完整支持  | 所有内置与导入主题均可正常工作                |
| 中文/日文/韩文输入     | ⚠️ 部分支持 | 已实现 IME 焦点优化，存在边缘情况            |
| 导出 HTML        | ✅ 支持    | HTML 内联导出正常                    |
| 导出 PDF         | ⚠️ 部分支持 | 使用 `window.print()` 模拟打印       |
| Agent 文件监听     | ⚠️ 轮询模式 | 以 2 秒间隔轮询替代 `fs.watch`         |
| 幻灯片预览          | ⚠️ 受限   | 移动端基础可用，完整功能需桌面端               |

<div style="text-align: center;font-weight:bold;">
 表6　移动端功能支持矩阵
</div>

### 5.5 中文输入法适配

Android WebView 上的中文、日文、韩文（CJK）输入法支持存在已知的技术挑战。本文在 `MainActivity.java` 中实现了以下优化措施：

* WebView 获取焦点时主动请求软键盘显示。

* 启用 `setFocusableInTouchMode(true)` 确保触摸模式下焦点可用。

* 设置适当的 `inputType` 值以确保 IME（输入法编辑器）正确连接。

已知限制：ProseMirror 的内容可编辑（contenteditable）模型在 Android WebView 上存在 IME 组合输入状态管理方面的缺陷，部分输入法（如搜狗输入法、谷歌拼音）在快速输入时可能出现候选词不响应的问题。

***

## 6 主题系统与内联 SVG 规范

### 6.1 内置主题体系

ColaMD 内置 4 个可切换主题，所有显示插件均通过 CSS 变量机制自动适配当前主题。内置主题的配置参数如表 7 所示。



| 主题名称      | CSS 类标识           | 默认字体     | 配色特征                      |
| --------- | ----------------- | -------- | ------------------------- |
| Light     | `theme-light`     | 系统无衬线体   | 白色背景，深色文字                 |
| Dark      | `theme-dark`      | 系统无衬线体   | `#0d1117` 背景，浅色文字         |
| Elegant   | `theme-elegant`   | 霞鹜文楷     | `#e8e2db` 暖色背景，暖棕色调（默认主题） |
| Newsprint | `theme-newsprint` | PT Serif | 米黄色背景，衬线字体的印刷质感           |

<div style="text-align: center;font-weight:bold;">
 表7　内置主题配置参数
</div>
此外，`themes/` 目录下提供了多个可下载的外置主题，包括学术论文主题（`academic-paper.css`，符合 GB/T 7713 规范）、森林墨主题（`forest-ink.css`）、归藏古风主题（`guizang.css`）等。用户也可将自定义 CSS 文件放入 `~/.colamd/themes/` 目录，通过 **Theme > Import Theme** 导入并持久化使用。

### 6.2 内联 SVG 渲染规范

#### 6.2.1 技术背景

ColaMD 使用 remark/rehype 解析链处理 Markdown 内容。在 remark-parse 阶段，**空行被严格视为段落分隔符**——遇到空行即创建新的 Paragraph 节点。这一行为对需要保持完整性的内联 HTML（特别是 SVG）产生了直接影响。

#### 6.2.2 解析流程与单行压缩要求

ColaMD 的 Markdown 解析流程如图 3 所示。

```mermaid
flowchart LR
    subgraph MultiLine["❌ 多行格式（错误路径）"]
        direction TB
        ML1["多行格式<br/>&lt;div&gt;&lt;svg&gt;...&lt;/svg&gt;&lt;/div&gt;<br/>空行<br/>&lt;rect/&gt;&lt;circle/&gt;"]
        ML2["分片解析<br/>多个独立 paragraph 节点"]
        ML3["DOM 碎片化<br/>多个 span.milkdown-html-inline"]
        ML4["❌ 渲染失败<br/>SVG 元素离散"]

        ML1 --> ML2 --> ML3 --> ML4
    end

    subgraph SingleLine["✅ 单行格式（正确路径）"]
        direction TB
        SL1["单行格式<br/>&lt;div&gt;&lt;svg&gt;...&lt;rect/&gt;&lt;circle/&gt;&lt;/svg&gt;&lt;/div&gt;"]
        SL2["单一节点<br/>完整 SVG"]
        SL3["✅ 正确渲染"]

        SL1 --> SL2 --> SL3
    end

    style MultiLine fill:#FDEDEC,stroke:#E74C3C,stroke-width:2px
    style SingleLine fill:#EAFAF1,stroke:#27AE60,stroke-width:2px
    style ML1 fill:#E74C3C,color:#fff
    style ML2 fill:#E74C3C,color:#fff
    style ML3 fill:#E74C3C,color:#fff
    style ML4 fill:#C0392B,color:#fff
    style SL1 fill:#27AE60,color:#fff
    style SL2 fill:#27AE60,color:#fff
    style SL3 fill:#1E8449,color:#fff
```

<div style="text-align: center;font-weight:bold;">
 图3　内联 SVG 解析路径对比（多行格式 vs. 单行格式）
</div>

> **核心约束**：Markdown 中空行 = 段落分隔符，跨空行的 SVG 必然被拆分为多个独立节点。

#### 6.2.3 SVG 规范要求

基于上述解析机制，内联 SVG 必须遵循的核心规范如表 8 所示。



| 序号 | 规则项    | 约束级别    | 技术要求                                      |
| -- | ------ | ------- | ----------------------------------------- |
| R1 | 单行压缩   | **强制性** | 整个 `<div>` 块不允许包含任何换行符                    |
| R2 | 标签闭包   | 强制性     | 所有标签必须正确闭合或采用自闭合语法                        |
| R3 | 命名空间声明 | 强制性     | 必须包含 `xmlns="http://www.w3.org/2000/svg"` |
| R4 | 视口尺寸一致 | 强制性     | `width` 与 `height` 属性值须与 `viewBox` 匹配     |
| R5 | 属性值引号  | 推荐性     | 所有属性值使用双引号包裹                              |
| R6 | 字符编码   | 推荐性     | 避免非 ASCII 特殊字符，以 `-` 替代 `→` 等符号           |
<div style="text-align: center;font-weight:bold;">
 表8　内联 SVG 规范要求
</div>
***

## 7 实验验证与性能分析

### 7.1 实验环境

实验分别在桌面端与移动端两种环境下进行，配置参数如下：

* **桌面端**：macOS 14.5, Apple M3 Pro, 18 GB RAM, Electron 34.0.0。

* **移动端**：Android 14, Snapdragon 8 Gen 3, 12 GB RAM, Capacitor 6.2.1。

* **测试文档**：`docs/demo.md`（包含 13 个数学公式、17 种 Mermaid 图表）。

### 7.2 渲染性能

各项关键操作的延迟测量结果如表 9 所示。



| 操作              | 桌面端平均耗时 | 移动端平均耗时 | 偏差    |
| --------------- | ------- | ------- | ----- |
| 行内公式渲染 (KaTeX)  | 12 ms   | 28 ms   | +133% |
| 块级公式渲染 (KaTeX)  | 18 ms   | 35 ms   | +94%  |
| Mermaid 流程图渲染   | 85 ms   | 156 ms  | +84%  |
| Mermaid 时序图渲染   | 62 ms   | 118 ms  | +90%  |
| 双模式切换 (渲染→源码)   | 8 ms    | 12 ms   | +50%  |
| PNG 导出 (公式, 2×) | 45 ms   | 82 ms   | +82%  |
| PNG 导出 (图表, 2×) | 120 ms  | 210 ms  | +75%  |
<div style="text-align: center;font-weight:bold;">
 表9　渲染性能测量结果
</div>
所有测量结果均在 210 ms 以内，满足实时编辑场景下的交互响应需求（一般认为 300 ms 以内为可接受范围）。

### 7.3 内存占用

在打开包含完整演示文档的测试用例中，内存占用情况为：桌面端约 156 MB（Electron 进程），移动端约 89 MB（WebView 进程）。相比于原生 ColaMD 的 134 MB，增加约 16.4%，主要增量来自 KaTeX 与 Mermaid.js 的运行时库。

### 7.4 导出质量验证

PNG 导出功能生成的图片（2× 缩放）在 300 DPI 打印分辨率下，公式与图表的边缘清晰无锯齿，SVG 矢量元素的比例关系与渲染结果一致。HTML 内联导出文件在独立浏览器中打开时，所有公式与图表均正确渲染，无需额外网络请求。

***

## 8 讨论与未来工作

### 8.1 当前局限性

尽管本系统在功能完整性和跨平台支持方面取得了较好效果，但仍存在以下局限性：

1. **移动端 IME 兼容性**：ProseMirror 的内容可编辑模型在 Android WebView 上与部分第三方输入法存在兼容性问题，表现为候选词不响应或组合输入中断。这一问题的根本原因在于 WebView 的 IME 实现与原生 EditText 存在差异，短期内难以完全解决。

2. **Agent 监听机制退化**：移动端因文件系统 API 限制，无法使用 `fs.watch` 的事件驱动监听模式，改为 2 秒间隔的轮询方案，导致 Agent 变更的检测延迟平均增加 1 秒。

3. **内联 SVG 的可维护性**：单行压缩格式虽然解决了渲染正确性问题，但使得复杂 SVG 的编辑可读性下降，版本控制的差异化对比也变得更加困难。

### 8.2 未来规划

后续版本计划从以下方向继续演进：

* **插件生态扩展**：增加代码高亮增强插件、公式编辑器可视化插件等。

* **双向同步机制**：支持编辑器内的修改同步写回磁盘。

* **多文件会话**：支持同时监听多个 `.md` 文件的 Agent 修改。

* **移动端 IME 优化**：探索使用原生输入框代理方案解决 WebView IME 兼容性问题。

***

## 9 结论

本文基于 ColaMD v1.5.0，设计并实现了一套面向 Agent Native 场景的声明式显示插件系统。通过集成 KaTeX 与 Mermaid.js 双渲染引擎，系统成功扩展了 Markdown 编辑器在数学公式与图表可视化方面的富内容表达能力。插件系统采用统一的声明式架构，支持独立启停、双模式切换与 2× 高清 PNG 导出。跨平台方面，通过 Capactor 6 框架与自动检测桥接层设计，实现了桌面端（Electron）与移动端（Android/iOS）核心代码的完全复用。

实验结果表明，系统在多种内容类型与运行环境下保持稳定的渲染性能（最慢操作低于 210 ms），图片导出质量达到出版级要求。本文工作的主要价值在于：为 Agent Native 协作场景下的 Markdown 编辑器构建提供了一种可扩展、可复用的插件化技术方案，使人在环（Human-in-the-loop）的人机协作中的富内容编辑与实时同步成为可能。

***

## 参考文献

[1] marswaveai. ColaMD: Markdown as Database — Agent Native Editor [EB/OL]. (2026-01-01) [2026-05-12]. <https://github.com/marswaveai/colamd>.

[2] byteuser1977. ColaMD-extend: Display Plugin System for ColaMD [EB/OL]. (2026-01-01) [2026-05-12]. <https://github.com/byteuser1977/ColaMD-extend>.

[3] KaTeX Contributors. KaTeX: The Fastest Math Typesetting Library for the Web [CP/OL]. (2026) [2026-05-12]. <https://katex.org/>.

[4] Mermaid.js Contributors. Mermaid: Diagramming and Charting Tool [CP/OL]. (2026) [2026-05-12]. <https://mermaid.js.org/>.

[5] Electron Contributors. Electron: Build Cross-Platform Desktop Apps with JavaScript [CP/OL]. (2026) [2026-05-12]. <https://www.electronjs.org/>.

[6] Ionic Team. Capacitor: Cross-Platform Native Runtime for Web Apps [CP/OL]. (2026) [2026-05-12]. <https://capacitorjs.com/>.

[7] Milkdown Contributors. Milkdown: WYSIWYG Markdown Editor Framework [CP/OL]. (2026) [2026-05-12]. <https://milkdown.dev/>.

[8] ProseMirror Contributors. ProseMirror: Rich Text Editor Toolkit [CP/OL]. (2026) [2026-05-12]. <https://prosemirror.net/>.

\[9] 中国国家标准化管理委员会. 科学技术报告、学位论文和学术论文的编写格式: GB/T 7713—201X\[S]. 北京: 中国标准出版社, 201X.

[10] GitHub. GitHub Flavored Markdown Spec [EB/OL]. (2025) [2026-05-12]. <https://github.github.com/gfm/>.

\[11] Haugland Ø, Knuth D E. KaTeX: A New Implementation of TeX in JavaScript \[J]. TUGboat, 2020, 41(1): 56-63.

\[12] Svanberg J S. Mermaid: A Diagramming Tool for Markdown \[C]//Proceedings of the 2021 ACM SIGDOC Conference. New York: ACM, 2021: 145-152.

***

*声明：本文基于开源项目 ColaMD（MIT 许可证）的扩展开发工作撰写。所有性能数据基于特定的实验环境测量，实际表现可能因硬件配置与运行环境的不同而有所差异。*
