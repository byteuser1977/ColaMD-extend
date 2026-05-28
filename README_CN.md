# ColaMD（扩展版）

**Markdown as Database。Agent Native 的编辑器与富内容渲染平台。**

基于 [marswaveai/ColaMD](https://github.com/marswaveai/colamd) 扩展，新增**显示插件系统**，支持数学公式、Mermaid 图表等丰富内容的所见即所得编辑与渲染。让 Markdown 不再只是纯文本，而成为真正的内容数据库。

人类与 AI Agent 的实时协作 — Agent 的每一次修改，你都能即时看到。把任意 Markdown 文件渲染成幻灯片、博客、简历或产品页。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/marswaveai/colamd.svg)](https://github.com/marswaveai/colamd/releases)
[![Version: 1.5.2](https://img.shields.io/badge/Version-1.5.2-blue.svg)](https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.2)

**本扩展版仓库**: [git@github.com:byteuser1977/ColaMD-extend.git](https://github.com/byteuser1977/ColaMD-extend)

## 🎉 v1.5.2 正式版发布亮点（2026-05-28）

### 🌐 完整的国际化（i18n）系统
- **多语言支持** — 内置英文和简体中文，根据系统语言自动检测
- **桌面端菜单本地化** — 所有 Electron 菜单（文件、编辑、视图、主题、帮助）以选定语言显示
- **移动端菜单本地化** — 完整的侧边栏菜单，带语言切换器，可随时切换
- **动态切换** — 随时更改语言，无需重启；界面即时更新
- **偏好持久化** — 语言选择保存至 `localStorage`，跨会话记住

### 🔧 改进优化

#### 📄 增强 PDF 导出流程
- **自动主题样式提取** — 自动提取并注入当前主题样式到导出文档中
- **自定义打印样式支持** — 支持传入自定义打印 CSS，简化基础打印样式
- **重构导出 HTML** — 优化 `buildExportHTML` 函数，移除硬编码插件样式，改用插件注入方式
- **干净输出** — A4 标准分页（15mm 边距），背景色保留，无 UI 元素

#### 🔌 统一插件样式管理
- **动态配置** — Math 和 Mermaid 插件支持统一配置字段（剪贴板样式、导出样式）
- **动态样式检索** — 替换硬编码样式处理逻辑，改为从插件配置动态获取
- **智能错误恢复** — 导出时动态跳过失败插件，替代硬编码排除逻辑

#### 🎨 渲染与主题优化
- **优化 HTML 结构** — 将 `getLiveHTML` 返回内容包装在 id 为 "write" 的 div 中，提升兼容性
- **条件基础样式渲染** — 仅在使用非自定义主题时渲染基础元素样式
- **修复自定义主题导出** — 解决 Chromium CSSOM 序列化问题，完善自定义主题打印 CSS 提取

#### 📱 移动端平台修复
- **修复媒体查询** — 修正移动端媒体查询缺失的 screen 类型，改善响应式表现

### 🗑️ 移除内容
- 移除过时的 PDF 字体补偿文档 ([`docs/PDF_FONT_COMPENSATION.md`](docs/PDF_FONT_COMPENSATION.md))

> 💡 **说明**：本版本包含完整的国际化支持和导出流程改进。主题更新继续在 [ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes) 仓库进行。

---

## 🚀 VSCode ColaView 扩展

使用我们的配套扩展，将 ColaMD 无缝集成到你的 VSCode 工作流中：

### [vscode_colaview](https://github.com/byteuser1977/vscode_colaview) 🆕

**用于查看和编辑 ColaMD 渲染 Markdown 文件的 VSCode 扩展**

| 功能 | 说明 |
|------|------|
| **实时预览** | 在 VSCode 中直接预览数学公式和 Mermaid 图表的渲染效果 |
| **无缝集成** | 无需离开代码编辑器即可处理 ColaMD 内容 |
| **一致性** | 保持 ColaMD 桌面端与 VSCode 之间的视觉一致性 |
| **生产力提升** | 为处理 Markdown + 富内容的开发者增强工作流程 |

**为什么使用 vscode_colaview？**
- 在代码旁边预览 ColaMD 渲染的内容
- 无需在多个应用之间切换
- 非常适合文档密集型项目
- 支持与 ColaMD 桌面端相同的数学公式和 Mermaid 图表渲染

🔗 **安装**: [vscode_colaview GitHub 地址](https://github.com/byteuser1977/vscode_colaview)
📦 **VSCode 应用市场**: 在 VSCode 扩展中搜索 "colaview"

---

[功能特性](#功能特性) | [显示插件](#显示插件系统) | [Plug 菜单](#plug-菜单--插件渲染控制) | [快速开始](#快速开始) | [移动端构建](#移动端构建--capacitor-6) | [主题系统](#主题系统) | [技术架构](#技术架构) | [English](README.md)

***

## &#x20;ColaMD 是什么？

AI Agent 正在改变我们的工作方式。它们编辑文件、生成文档、产出报告 — 全是 Markdown。

但你怎么**看到** Agent 的工作？关掉文件？再打开？等着？

**ColaMD 改变了这一切。** 用 ColaMD 打开 `.md` 文件，让 Agent 去编辑它，内容会实时更新 — 就像和 AI 结对编程。不需要刷新，不需要重新加载，零摩擦。

这就是 **Agent Native** 的含义：从底层为人类和 Agent 协作而生。

***

## 与原版的区别

本仓库基于 **[marswaveai/ColaMD](https://github.com/marswaveai/colamd)** v1.5.0 进行扩展，核心差异在于：

| 维度    | 原版 ColaMD                       | 本扩展版                                |
| ----- | ------------------------------- | ----------------------------------- |
| 内容渲染  | 纯 Markdown 文本（GFM + Commonmark） | **Markdown + 数学公式 + Mermaid 图表**    |
| 插件系统  | 无                               | **声明式插件架构，可独立启停、动态注册**              |
| 公式支持  | ❌                               | ✅ KaTeX 行内/块级公式，实时编辑，PNG 导出         |
| 图表支持  | ❌                               | ✅ Mermaid 全类型图表（17+ 种），多主题适配，PNG 导出 |
| 双模式切换 | N/A                             | ✅ 每个插件均支持 **渲染模式 / 源码编辑模式** 一键切换    |
| 移动端平台 | ❌ 仅桌面端                        | ✅ **Android (.apk) + iOS (.ipa)** 通过 Capacitor 6 实现  |

> 原版所有功能完整保留：Agent 实时同步、活动指示器、所见即所得编辑器、幻灯片系统、主题与导出等。

### 演示文档

本项目包含多份演示文档，全面展示插件能力：

#### 通用演示 — [`demo.md`](docs/demo.md)

一份综合性演示文档，涵盖：

- **Math 公式**：7 个行内公式 + 6 个块级公式（含方程组、矩阵、物理公式等）
- **Mermaid 图表**：17 种图表类型全部覆盖（流程图、时序图、类图、状态图、ER 图、甘特图、饼图、用户旅程图、Git 图、思维导图、时间线、四象限图、XY 图表、C4 架构图、Sankey 图、Block 图、复杂聚群图）
- **混合内容**：公式与图表在同一文档中协同渲染

在 ColaMD 中打开 [`demo.md`](docs/demo.md) 即可全面测试插件渲染、模式切换、源码编辑和 PNG 导出功能：

```bash
# 方式一：命令行启动时直接打开
npm run dev docs/demo.md

# 方式二：在 ColaMD 中使用菜单打开
# File → Open... → 选择 docs/demo.md

# 方式三：在 ColaMD 编辑器中 Cmd+点击 demo.md 链接
# 直接在浏览器中查看源码：https://github.com/byteuser1977/ColaMD-extend/blob/main/docs/demo.md
```

#### 学术论文演示 — [`academic-demo.md`](docs/academic-demo.md) 🆕

一份真实的学术论文示例，展示增强版**学术论文主题**（`academic-paper.css`）的完整效果：

- **完整学术结构**：摘要、关键词、中图分类号、文献标识码、引言、方法论、表格、参考文献
- **符合 GB/T 7713 规范**：遵循中文学术论文排版标准，正确的字体搭配（黑体标题 + 宋体正文）
- **三线表格式**：学术标准表格样式（顶线 + 表头底线 + 底线，无竖线）
- **Mermaid 图表**：复杂的组织架构图，采用打印优化的自定义配色方案
- **混合内容**：数学公式、Mermaid 图表、表格、引用在同一文档中协同展示

在 ColaMD 中打开 [`academic-demo.md`](docs/academic-demo.md) 并启用**学术论文主题**，即可看到完整效果。本演示文档展示了：
- 专业学术排版（黑体标题、宋体正文、首行缩进）
- 打印优化的 Mermaid 图表渲染
- 学术场景下的代码块和引用块样式
- 脚注与参考文献区域格式化

***

## 功能特性

### 🔗 Agent Native（继承自原版）

- **实时 Agent 同步** — 当 AI Agent（Claude Code、Cursor、Copilot 等）修改 `.md` 文件时，ColaMD 通过 `fs.watch` 检测变更并即时刷新，无需手动重载。这是核心功能。
- **Agent 活动指示器** — 标题栏的呼吸灯告诉你 Agent 的状态：橙色脉冲表示正在写入，绿色闪现表示写入完成。
- **Cmd+点击链接** — 点击编辑器中的链接直接在浏览器打开。

### ✏️ 编辑器核心（继承自原版）

- **真正的所见即所得** — 输入 Markdown，直接看到富文本效果，无需分屏预览。
- **智能换行** — 单个换行符直接渲染为 `<br>`，匹配 AI Agent 写 Markdown 的习惯。
- **富文本复制** — 复制内容后可直接粘贴到微信、邮件等富文本编辑器中，格式完整保留。
- **极简设计** — 没有工具栏，没有侧边栏，没有干扰。只有你和你的内容。

### 📊 幻灯片系统 — Markdown as Database（继承自原版）

HTML 难改。Markdown 好改。

ColaMD 提出一个新理念：**Markdown as Database**。`.md` 文件是内容层，HTML 模板是视图层。改内容只改 Markdown，完全不碰 HTML。

一份 Markdown，多种渲染形态：幻灯片、博客、简历、产品页……未来各种模板都可以消费同一份文件。

#### 使用方式

- **File → New Slides（⌘⇧N）** — 创建 `slides.md` 教程模板，在编辑器里直接编辑内容
- **File → Open as Slides（⌘⇧P）** — 启动本地服务，在浏览器打开当前 `.md` 文件的幻灯片
- **File → Export Slides...** — 导出可分享版本（单文件 HTML 或含视频的文件夹）

#### Slide 格式

```markdown
---
kicker: YOUR BRAND
chip: 活动名称 · 2026
page: YOUR NAME
---

<!-- type: cover -->
# 标题
副标题

---

<!-- type: statement -->
## 核心观点
一句有力量的话。
```

支持版式：`cover` · `statement` · `section` · `video` · `thankyou`

可选：背景图（`bg: cover.png`）、视频嵌入（`src: demo.mp4`）、图片预览（`preview: screenshot.png`）。

### 📤 导出能力

ColaMD 提供多种导出方式，满足不同场景需求（v1.5.1 增强）：

#### PDF / HTML 导出（v1.5.1 重构）
- **自动主题样式提取** — 自动提取并注入当前主题样式到导出文档中
- **自定义打印样式支持** — 支持传入自定义打印 CSS 以满足高级需求
- **插件注入样式** — 数学和 Mermaid 插件动态注入导出样式（不再使用硬编码样式处理）
- **智能错误恢复** — 导出时动态跳过出错插件，替代硬编码排除逻辑
- **A4 分页输出** — 15mm 边距规范分页，背景色保留，无 UI 元素的干净输出
- **HTML 导出** — 独立 HTML 文件，内嵌样式，KaTeX CDN 渲染数学公式，Mermaid SVG 内联图表，零依赖分享

#### 导出为 HTML

**菜单路径**：File → Export HTML...

将当前编辑器内容导出为**独立 HTML 文件**，特性包括：

- **主题完整保留** — 导出文件包含当前主题的所有 CSS 变量（背景色、文字色、代码块配色、引用样式等），打开即可还原编辑器中的视觉效果
- **公式渲染保留** — KaTeX 渲染的数学公式以 HTML+CSS 形式完整保留，通过 CDN 引入 KaTeX 样式表
- **Mermaid 图表内联** — 渲染后的 SVG 图表直接嵌入 HTML，无需额外依赖，离线可查看
- **排版优化** — 正文最大宽度 780px 居中排版，行高 1.75，代码块圆角样式，表格边框等细节完整
- **零依赖分享** — 生成的 HTML 文件可直接用浏览器打开，无需安装任何软件

**使用方法**：

1. 在 ColaMD 中打开 `.md` 文件
2. 点击菜单 **File → Export HTML...**
3. 选择保存路径，即可生成 `.html` 文件

> 💡 移动端（Android/iOS）导出 HTML 后会自动调用系统分享面板，可直接发送到微信、邮件等应用。

#### 导出为 PDF

**菜单路径**：File → Export PDF...

将当前编辑器内容导出为 **A4 尺寸 PDF 文件**，特性包括：

- **所见即所得** — 导出内容与编辑器中看到的完全一致，包括数学公式和 Mermaid 图表
- **A4 分页** — 使用 `@page { margin: 15mm; size: A4 }` 规范分页，适合打印
- **背景色保留** — 通过 `printBackground: true` 确保深色主题导出时背景色不丢失
- **智能隐藏** — 导出时自动隐藏加载占位符和错误提示，确保输出干净

**使用方法**：

1. 在 ColaMD 中打开 `.md` 文件
2. 点击菜单 **File → Export PDF...**
3. 选择保存路径，即可生成 `.pdf` 文件

> 💡 移动端（Android）导出 PDF 时会调用系统打印对话框，可选择"保存为 PDF"生成文件。

#### 幻灯片导出

- **File → Export Slides...** — 导出可分享版本（单文件 HTML 或含视频的文件夹）

#### 公式 / 图表 PNG 导出

- **右键菜单** — 右键点击公式或图表，选择"Save as PNG"一键导出为高清 PNG 图片（2x 缩放）

### 🌐 国际化（i18n）

- **多语言支持** — 内置英文和简体中文，根据系统语言自动检测
- **桌面端菜单本地化** — 所有 Electron 菜单（文件、编辑、视图、主题、帮助）以选定语言显示
- **移动端菜单本地化** — 完整的侧边栏菜单，带语言切换器，可随时切换
- **动态切换** — 随时更改语言，无需重启；界面即时更新
- **偏好持久化** — 语言选择保存至 `localStorage`，跨会话记住
- **自定义主题名称不变** — 用户导入的主题名称保持原样（不强制翻译）
- **IPC 同步** — 渲染进程可通知主进程在语言变更时重建菜单

#### 支持的语言

| 代码 | 语言 | 自动检测 |
|------|------|---------|
| `en` | English | 默认 |
| `zh-CN` | 简体中文 | 系统语言包含 `zh` 时自动启用 |

#### 技术架构

```
src/
├── main/
│   └── i18n.ts              # 主进程国际化模块（Electron 菜单专用）
└── renderer/
    └── i18n/                # 渲染进程国际化模块
        ├── index.ts         # 核心 i18n 引擎
        └── locales/
            ├── en.ts        # 英文资源
            └── zh-CN.ts     # 中文资源
```

### 🎨 主题与跨平台（继承自原版）

- **4 个内置主题** + [可下载主题](themes/) + 自定义 CSS 导入
- **跨平台** — macOS（.dmg）、Windows（.exe）、Linux（.AppImage / .deb）

***

## 显示插件系统

> ⭐ 这是本扩展版的核心增量特性。插件采用声明式注册架构，每个插件独立封装，可单独启用或禁用。

### 架构概览

```
src/renderer/editor/plugins/
├── index.ts                    # 插件管理器（注册/查询/切换）
├── math-plugin.ts              # 📐 数学公式渲染插件
├── mermaid-plugin.ts           # 🔀 Mermaid 图表渲染插件
├── mermaid-plugin.css          # Mermaid 基础样式
├── mermaid-plugin-dark.css     # Mermaid 暗色主题
├── mermaid-plugin-elegant.css  # Mermaid 优雅主题
└── mermaid-plugin-newsprint.css # Mermaid 新闻纸主题
```

每个插件遵循统一的设计模式：

```
Schema 定义 → NodeView 交互 → Remark 解析 → Markdown 序列化 → PNG 导出 → 渲染/源码双模式
```

***

### 📐 Math Plugin — 数学公式渲染

**源码**: [math-plugin.ts](src/renderer/editor/plugins/math-plugin.ts) | **依赖**: [KaTeX](https://katex.org/) + remark-math

| 属性    | 说明                            |
| ----- | ----------------------------- |
| 插件 ID | `math`                        |
| 默认启用  | ✅ 是                           |
| 右键菜单  | Save Equation as PNG（保存公式为图片） |
| 关联节点  | `math_inline`, `math_block`   |

#### 支持的语法

```markdown
行内公式：质能方程 $E = mc^2$ 嵌入在段落中。

块级公式（居中显示）：
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

#### 功能详情

- **行内公式 (`$...$`)** — 使用 `<span class="math-inline">` 容器，KaTeX 渲染（`displayMode: false`），支持 rendered / raw 双模式切换
- **块级公式 (`$$...$$`)** — 使用 `<div class="math-block">` 容器，KaTeX 渲染（`displayMode: true`，居中显示），raw 模式下使用 `<textarea>` 自动调整行数
- **实时编辑** — raw 模式下可直接编辑 LaTeX 源码，失焦自动保存并重新渲染
- **容错处理** — KaTeX 渲染失败时优雅降级为纯文本显示，不会阻断编辑流程
- **PNG 导出** — Canvas + SVG foreignObject 技术，2x 缩放高清输出，白色背景，16px 内边距

***

### 🔀 Mermaid Plugin — 图表渲染

**源码**: [mermaid-plugin.ts](src/renderer/editor/plugins/mermaid-plugin.ts) | **依赖**: [Mermaid.js](https://mermaid.js.org/)

| 属性    | 说明                           |
| ----- | ---------------------------- |
| 插件 ID | `mermaid`                    |
| 默认启用  | ✅ 是                          |
| 右键菜单  | Save Diagram as PNG（保存图表为图片） |
| 关联节点  | `mermaid_block`              |

#### 支持的图表类型（17+ 种）

````markdown
```mermaid
graph TD
    A[Markdown] --> B[ColaMD]
    B --> C[Math Plugin]
    B --> D[Mermaid Plugin]
    C --> E[Rich Content]
    D --> E
````

| 类别 | 支持的图表 |
|------|-----------|
| 流程图 | `graph` (TD/LR/RL/BT), `flowchart` |
| 时序图 | `sequenceDiagram` |
| 类图 | `classDiagram` |
| 状态图 | `stateDiagram-v2` |
| ER 图 | `erDiagram` |
| 用户旅程图 | `journey` |
| 饼图 | `pie` |
| 甘特图 | `gantt` |
| Git 图 | `gitGraph` |
| 思维导图 | `mindmap` |
| 时间线 | `timeline` |
| 四象限图 | `quadrantChart` |
| XY/折线/柱状图 | `xyChart` |
| C4 架构图 | `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` |
| Sankey 图 | `sankey-beta` |
| Block 图 | `block-beta` |
| 架构图 | `architecture-beta` |

#### 功能详情

- **输入快捷规则** — 输入 `\`\`\`mermaid` 后回车，自动转换为 mermaid_block 节点，无需手动操作
- **双模式切换** — 渲染预览 / 源码编辑一键切换，raw 模式下使用 `<textarea>` 直接编辑 Mermaid 代码
- **异步安全渲染** — 使用渲染计数器防止并发竞态问题，确保显示结果与最新代码一致
- **多主题深度适配** — 每个内置主题均有对应的 Mermaid 配色方案（见下方主题适配表）
- **C4 架构专用配色** — 为人物/系统/容器/组件提供独立的语义化颜色配置
- **节点高度自适应** — 渲染后自动调整容器高度（+6px padding），避免内容溢出
- **PNG 导出** — SVG 规范化 → Image → Canvas → PNG，2x 高清输出，白色背景

#### Mermaid 主题适配

| UI 主题 | Mermaid 主题风格 | 字体 | 特色 |
|--------|-----------------|------|------|
| **Light** | Default | 系统默认 | 干净明亮 |
| **Dark** | GitHub Dark | 系统默认 | `#0d1117` 背景, `#8b949e` 边框文字 |
| **Elegant** | 自定义暖色系 | 霞鹜文楷 | `#e8e2db` 背景, 暖棕色调 cScale |
| **Newsprint** | 印刷风格 | PT Serif | 衬线字体, 新闻纸质感 |
| **Forest Ink** (自定义) | 森林墨绿系 | Noto Serif SC | `#f5f1e8` 宣纸底, `#3d6b4a` 森林绿强调, 墨绿连线 |

---

## 工作原理

```

┌─────────────┐     写入      ┌──────────────┐
│  AI Agent   │ ──────────────▶│  .md 文件    │
│ (Claude,    │                │              │
│  Cursor...) │                └──────┬───────┘
└─────────────┘                       │
fs.watch 检测变化
│
┌───────▼───────┐
│    ColaMD     │
│   自动刷新    │
│   ✨ 实时！   │
│               │
│  ┌───────────┐ │
│  │ Plugin     │ │
│  │ ├─ Math    │ │
│  │ └─ Mermaid │ │
│  └───────────┘ │
└───────────────┘

```

1. 用 ColaMD 打开任意 `.md` 文件
2. 让 AI Agent 编辑这个文件
3. 看着内容实时更新 — 包括数学公式和 Mermaid 图表的即时渲染
4. 标题栏的指示器会在 Agent 写入时亮起橙色脉冲

不需要任何配置，开箱即用。

---

## Plug 菜单 — 插件渲染控制

ColaMD 在顶部菜单栏提供 **Plug** 菜单，用于控制显示插件的渲染行为。每个已注册的插件（如 Math、Mermaid）均可在菜单中独立管理。

### 菜单结构

```
Plug
├── Math
│   ├── Rendered      # 渲染模式：显示公式/图表的富文本效果
│   └── Raw           # 源码模式：显示原始 Markdown 代码，支持直接编辑
└── Mermaid
    ├── Rendered      # 渲染模式：显示图表的 SVG 可视化效果
    └── Raw           # 源码模式：显示 Mermaid 代码，支持直接编辑
````

### 渲染模式（Rendered）

- 插件内容以富文本形式呈现
- **Math**：KaTeX 渲染的精美数学公式，行内公式嵌入段落，块级公式居中显示
- **Mermaid**：SVG 矢量图表，支持 17+ 种图表类型的可视化渲染
- 支持右键导出为 PNG 图片

### 源码模式（Raw）

- 插件内容以原始 Markdown 源码形式呈现
- 使用 `<textarea>` 文本框直接展示和编辑代码
- **实时修改**：在文本框中直接编辑 LaTeX 公式或 Mermaid 图表代码
- **自动保存**：失焦（blur）后自动保存修改内容，并即时切换回渲染模式显示更新后的效果
- 文本框高度根据内容行数自动调整，避免滚动条

### 使用示例

1. 输入一段 Mermaid 代码：

   ````markdown
   ```mermaid
   graph TD
       A[开始] --> B[处理]
       B --> C[结束]
   ```
   ````

2. 点击 **Plug → Mermaid → Rendered** 查看图表渲染效果
3. 点击 **Plug → Mermaid → Raw** 切换到源码模式，直接修改节点和连线
4. 点击编辑器其他区域失焦，自动保存并重新渲染

### 设计意图

- **所见即所得与源码自由切换**：满足不同场景需求 — 阅读时看渲染效果，编辑时直接改源码
- **零摩擦编辑**：无需记忆特殊快捷键，菜单一键切换，失焦自动保存
- **插件完全解耦**：每个插件独立控制，互不影响，未来新增插件自动出现在菜单中

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 安装与运行

```bash
# 克隆本扩展版仓库
git clone https://github.com/byteuser1977/ColaMD-extend.git
cd ColaMD-extend

# 安装依赖
npm install

# 开发模式启动
npm run dev
```

### 构建打包

```bash
# 构建
npm run build

# 打包当前平台
npm run dist

# 打包指定平台
npm run dist:mac      # macOS (.dmg)
npm run dist:win      # Windows (.exe)
npm run dist:linux    # Linux (.AppImage / .deb)
```

### 下载预编译版本

> 查看本扩展版 [GitHub Releases](https://github.com/byteuser1977/ColaMD-extend/releases) 获取最新构建版本。原版 Releases 请访问 [marswaveai/colamd](https://github.com/marswaveai/colamd/releases)。

| 平台 | 格式 |
|------|------|
| macOS | `.dmg` |
| Windows | `.exe` |
| Linux | `.AppImage` / `.deb` |
| Android | `.apk`（通过 Capacitor 构建） |
| iOS | `.ipa`（通过 Capacitor 构建，需 Xcode） |

---

## 移动端构建 — Capacitor 6

> 从 v1.5.1 起，ColaMD 支持通过 **[Capacitor 6](https://capacitorjs.com/)** 构建原生移动应用 — Ionic 出品的跨平台运行时。驱动 Electron 桌面端的同一套代码，现在也能运行在 Android 和 iOS 设备上。

### 架构：双平台桥接层

ColaMD 采用 **自动检测桥接层**，在运行时无缝切换 Electron（桌面端）和 Capacitor（移动端）API：

```
┌─────────────────────────────────────┐
│         src/renderer/main.ts         │
│   api = electronAPI || capacitorAPI  │ ← 自动检测运行环境
├──────────────┬──────────────────────┤
│  Electron    │     Capacitor 6      │
│  (桌面端)     │     (移动端)          │
│              │                      │
│ IPC 通信      │ Filesystem Plugin    │
│ dialog       │ Share Plugin         │
│ shell.open   │ App Plugin           │
│ fs 模块      │ localStorage 存储    │
└──────────────┴──────────────────────┘
```

**核心文件**：
- [`capacitor-api.ts`](src/renderer/capacitor-api.ts) — 完整的 Capacitor 桥接层，实现与 `electronAPI` 相同的 API 接口
- [`capacitor.config.ts`](capacitor.config.ts) — Capacitor 配置文件（appId、webDir、插件设置）
- [`mobile.css`](src/renderer/mobile.css) — 触控优化的响应式样式
- [`MainActivity.java`](android/app/src/main/java/cn/bytechain/colamd/MainActivity.java) — Android WebView 中文输入法支持

### 移动端技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| **运行时** | Capacitor 6.x | 跨平台原生桥接 |
| **WebView 引擎** | Android WebView / iOS WKWebView | 渲染 Web 内容 |
| **文件访问** | `@capacitor/filesystem` | 读写本地文件 |
| **文件选择器** | `@capawesome/capacitor-file-picker` | 原生文件选择对话框 |
| **分享** | `@capacitor/share` | 系统分享面板集成 |
| **应用生命周期** | `@capacitor/app` | 处理应用事件（暂停、恢复） |
| **状态栏** | `@capacitor/status-bar` | 状态栏样式控制 |
| **触觉反馈** | `@capacitor/haptics` | 触觉反馈 |

### 移动端构建环境要求

| 平台 | 环境要求 |
|------|----------|
| **Android** | Android Studio + SDK (API 34+) + **Java 21** (`brew install openjdk@21`) |
| **iOS** | Xcode 15+ + CocoaPods + macOS |

### 快速开始 — Android

```bash
# 1. 安装依赖（包含 Capacitor 相关包）
npm install

# 2. 构建前端 Web 资源
npm run build

# 3. 同步到 Android 平台
npx cap sync android

# 4. 用 Android Studio 打开项目
npx cap open android

# 5. 或直接构建 APK
npm run cap:build:android
# 输出路径：android/app/build/outputs/apk/debug/app-debug.apk
```

### 快速开始 — iOS

```bash
# 1. 同步到 iOS 平台
npx cap sync ios

# 2. 用 Xcode 打开项目
npx cap open ios

# 3. 在 Xcode 中构建（⌘R）或使用：
npm run cap:build:ios
```

### 构建命令

| 命令 | 说明 | 输出 |
|------|------|------|
| `npm run cap:sync` | 同步 Web 资源到所有原生平台 | 更新 `android/` 和 `ios/` |
| `npm run cap:open:android` | 用 Android Studio 打开 Android 项目 | — |
| `npm run cap:open:ios` | 用 Xcode 打开 iOS 项目 | — |
| `npm run cap:run:android` | 构建 → 同步 → 在设备/模拟器上运行 | 设备上的实时应用 |
| `npm run cap:run:ios` | 构建 → 同步 → 在模拟器上运行 | 模拟器中的实时应用 |
| `npm run cap:build:android` | 构建 **Debug APK** | `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run cap:build:android:release` | 构建 **Release APK**（已签名） | `android/app/build/outputs/apk/release/app-release.apk` |
| `npm run cap:build:ios` | 准备 iOS 项目供 Xcode 构建 | — |

### Release 构建 — Android

生产环境发布版本构建，项目已包含签名配置：

```bash
# 构建已签名的 Release APK
npm run cap:build:android:release

# 输出位置
android/app/build/outputs/apk/release/app-release.apk
```

Release 签名密钥位于 `android/app/release.keystore`，签名凭据存储在 `build.gradle` 中。

### Release 构建 — iOS

1. 在 Xcode 中打开项目：
   ```bash
   npx cap open ios
   ```

2. 在 Xcode 中：
   - 选择 **Product → Archive**
   - 归档完成后，点击 **Distribute App**
   - 选择分发方式（App Store Connect、Ad Hoc 等）

3. 提交到 App Store：
   - 在 Xcode 中配置签名证书
   - 通过 Xcode 或 Transporter 上传到 App Store Connect

### 中文输入法支持（Android）

ColaMD 针对 Android WebView 上的中文/日文/韩文输入法进行了特殊处理：

**实现方式**（[`MainActivity.java`](android/app/src/main/java/cn/bytechain/colamd/MainActivity.java)）：
- WebView 焦点优化，确保 IME 正确连接
- 获得焦点时自动弹出软键盘
- 启用触控模式的焦点能力

**已知限制**：
- ProseMirror/Milkdown 在 Android WebView 上存在已知的 IME 组合输入问题
- 部分输入法可能需要点击编辑区域才能激活
- 如果输入无响应，尝试点击其他区域后再回到编辑器

### 文件选择器集成

移动端使用 `@capawesome/capacitor-file-picker` 实现原生文件选择：

```typescript
// 内部使用示例
const result = await FilePicker.pickFiles({
  types: ['text/markdown', 'text/plain'],
  multiple: false,
  readData: true,
})
```

**支持的文件类型**：`.md`、`.markdown`、`.txt`、`.css`（主题文件）

### 移动端功能支持情况

| 功能 | 状态 | 说明 |
|------|------|------|
| Markdown 编辑 ✏️ | ✅ 完整支持 | Milkdown 编辑器在 WebView 中正常运行 |
| 数学公式渲染 (KaTeX) 📐 | ✅ 完整支持 | 与桌面端一致 |
| Mermaid 图表渲染 🔀 | ✅ 完整支持 | SVG 在 WebView 中正常渲染 |
| 插件系统 | ✅ 完整支持 | 通过 UI 切换，状态存储于 localStorage |
| 主题系统 | ✅ 完整支持 | 所有主题在移动端均可正常工作 |
| 文件打开/保存 | ✅ 支持 | 通过 FilePicker 插件使用原生文件选择器 |
| 中文/日文/韩文输入 | ⚠️ 部分支持 | 已实现 IME 支持，可能存在边缘情况 |
| 导出 HTML/PDF | ⚠️ 部分支持 | HTML 导出正常；PDF 使用 `window.print()` |
| Agent 文件监听 | ⚠️ 轮询模式 | 使用 2 秒间隔轮询替代 `fs.watch` |
| 幻灯片预览 | ⚠️ 受限 | 桌面端打开新浏览器窗口；移动端基础可用 |
| 外部链接 | ✅ 支持 | 通过 `_system` target 在系统浏览器中打开 |

### 响应式设计

移动端 CSS ([`mobile.css`](src/renderer/mobile.css)) 提供：

- **触控优化**：禁用点击高亮、正确的 touch-action 行为
- **安全区域适配**：自动为刘海屏设备添加内边距（iPhone X+、现代 Android）
- **响应式断点**：
  - ≤768px：平板布局调整
  - ≤480px：手机布局，更小的字号
- **编辑器适配**：固定定位编辑器填充标题栏下方视口
- **滚动行为**：`-webkit-overflow-scrolling: touch` 实现流畅滚动
- **右键菜单**：触控友好的更大点击区域（12px 内边距、15px 字号）

### 移动端问题排查

**中文输入无法使用**：
- 点击编辑区域确保获得焦点
- 尝试切换到其他应用再切回来
- 检查软键盘是否可见

**文件选择器无法打开**：
- 确保已授予存储权限
- Android 11+ 上，检查存储权限是否设为"始终允许"

**应用启动崩溃**：
- 运行 `npx cap sync android` 确保使用最新的 Web 资源
- 在 Android Studio 中查看 logcat 错误日志
- 确认 Java 21 配置正确

**构建失败**：
```bash
# 清理并重新构建
cd android
./gradlew clean
cd ..
npm run cap:build:android
```

---

## 主题系统

ColaMD 内置 **4 个主题**，所有显示插件均会跟随主题自动适配：

| 主题 | 标识 | 风格说明 |
|------|------|---------|
| **Light** | `theme-light` | 浅色主题，干净明亮 |
| **Dark** | `theme-dark` | 暗色主题，GitHub Dark 风格 |
| **Elegant** | `theme-elegant` | 优雅主题，暖色衬线体风格（默认主题） |
| **Newsprint** | `theme-newsprint` | 新闻印刷风格 |

可下载的外置主题（位于 [`themes/`](themes/) 目录）：

| 主题文件 | 风格说明 |
|----------|----------|
| [elegant.css](themes/elegant.css) | 典雅暖调，朱砂红强调色、霞鹜文楷衬线体 |
| [guizang.css](themes/guizang.css) | 归藏古风，赭石强调色、松烟墨代码块 |
| [forest-ink.css](themes/forest-ink.css) | 🌲 森林墨，宣纸暖白底 + 松烟墨绿文字 + 森林绿强调色 |
| [academic-paper.css](themes/academic-paper.css) | 📄 **学术论文** — 符合 GB/T 7713 规范，黑体标题 + 宋体正文，三线表格式，打印优化的 Mermaid 图表（10.5pt 字号）。完整示例见 [`academic-demo.md`](docs/academic-demo.md) |
| [academic-paper-pt.css](themes/academic-paper-pt.css) | 📄 **学术论文（PT 单位版）** — 与 academic-paper.css 相同的 GB/T 7713 规范设计，但使用 pt 单位以适配特定打印场景需求 |
| [pixso-design.css](themes/pixso-design.css) | 🎨 Pixso 设计，现代设计系统风格 |
| [swiss-design.css](themes/swiss-design.css) | 🇨🇭 **瑞士国际主义平面设计风格** — 纯粹的黑白红三色体系，几何无衬线字体（Helvetica/Inter），网格化排版与大量留白，形式服从功能。完整的 Mermaid 图表集成（单色调 + 强调红） |
| [template.css](themes/template.css) | 📝 **标准化模板** — 遵循 v3.0 范式的参考实现，包含完整的设计令牌、编辑器样式、代码块、引用块、表格、Mermaid 变量和打印样式。可作为创建自定义主题的起点 |

> ⚠️ **主题迁移说明**
>
> 从 v1.5.1 开始，**主题更新和维护已迁移至专用仓库**：
>
> 🔗 **[https://github.com/byteuser1977/ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes)**
>
> 未来的主题增强、错误修复和新主题提交将在 ColaMD-themes 仓库中进行。这样做的好处包括：
> - 更快的主题特定变更迭代和发布周期
> - 社区贡献和主题提交
> - 与核心 ColaMD 应用独立的版本控制
> - 专注的主题问题追踪
>
> 本版本中包含的主题将保持可用以确保向后兼容性，但我们建议查看专用仓库以获取最新版本和新主题。

自定义主题支持：将 CSS 文件放入 `~/.colamd/themes/` 目录，通过 **Theme > Import Theme** 导入。导入的主题会持久化保存，重启后仍然可用。

### 主题开发

对于希望创建自定义主题的开发者，请参考：

- **主题范式文档**：[`docs/theme-paradigm.md`](docs/theme-paradigm.md) — 完整的 CSS 主题开发规范 (v3.2)
  - 设计原则：变量驱动、模块化、语义命名、AI Agent 可推导
  - 30+ 条可验证规则（MUST / MUST NOT / SHOULD），包含 WCAG 对比度公式
  - 打印保真要求：变量重声明、必覆盖元素清单（12 类）
  - px 单位统一规范：禁止 pt/rem 混用以确保 PDF 导出字号一致
- **主题模板**：[`themes/template.css`](themes/template.css) — 复制此文件作为自定义主题的起点
- **Mermaid 变量参考**：参见 [`themes/README.md`](themes/README.md) 获取完整的 Mermaid CSS 变量文档

---

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ColaMD — 双平台架构                        │
│                                                              │
│  ┌──────────────────────┐   ┌────────────────────────────┐  │
│  │    桌面端 (Electron)  │   │     移动端 (Capacitor 6)    │  │
│  │                       │   │                            │  │
│  │  ┌─────────┐ ┌──────┐ │   │  ┌──────────────────────┐  │  │
│  │  │主进程   │ │Preload│ │   │  │  Capacitor 运行时    │  │  │
│  │  │        │ │Bridge │ │   │  │ (WebView / WKWebView) │  │  │
│  │  └────┬────┘ └──┬───┘ │   │  └──────────┬───────────┘  │  │
│  │       │  IPC   │     │   │             │ 原生插件       │  │
│  │       └────┬────┘     │   │             ├─ Filesystem    │  │
│  │            ▼          │   │             ├─ Share         │  │
│  │  ┌─────────────────┐  │   │             ├─ App           │  │
│  │  │   渲染进程       │  │   │             ├─ StatusBar     │  │
│  │  │                │◄─┼───┼─────────────┤               │  │
│  │  └────────┬────────┘  │   │            └─ Haptics       │  │
│  │           ▼           │   └──────────────┬───────────────┘  │
│  │  ┌──────────────────┐ │                  │                  │
│  │  │  Milkdown 编辑器 │◄┘                  │                  │
│  │  │  (ProseMirror)   │                    │                  │
│  │  │  ┌────────────┐  │                    │                  │
│  │  │  │插件系统    │  │                    │                  │
│  │  │  │├─ 📐 Math  │  │                    │                  │
│  │  │  │└─ 🔀Mermaid│  │                    │                  │
│  │  │  └────────────┘  │                    │                  │
│  │  └──────────────────┘                    │                  │
│  └──────────────────────┘                    │                  │
│                   ┌──────────────────────────┘                  │
│                   ▼                                             │
│          自动检测：                                              │
│          api = electronAPI || capacitorAPI                      │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

| 技术 | 用途 | 版本 | 官方文档 |
|------|------|------|----------|
| [Electron](https://www.electronjs.org/) | 跨平台桌面应用框架 | ^34.0.0 | [📖 文档](https://www.electronjs.org/docs/latest/) |
| [Capacitor](https://capacitorjs.com/) | 跨平台移动端运行时（Android/iOS） | ^6.2.1 | [📖 文档](https://capacitorjs.com/docs/) |
| [Milkdown](https://milkdown.dev/) | WYSIWYG Markdown 编辑器内核（基于 ProseMirror） | ^7.19.2 | [📖 文档](https://milkdown.dev/docs) |
| [ProseMirror](https://prosemirror.net/) | 底层富文本编辑引擎 | — | [📖 文档](https://prosemirror.net/docs/) |
| [KaTeX](https://katex.org/) | 数学公式渲染引擎 | ^0.16.46 | [📖 文档](https://katex.org/docs/) |
| [Mermaid.js](https://mermaid.js.org/) | 图表渲染库 | ^11.15.0 | [📖 文档](https://mermaid.js.org/intro/) |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全的开发语言 | ^5.7.0 | [📖 文档](https://www.typescriptlang.org/docs/) |
| [electron-vite](https://electron-vite.org/) | Electron 构建工具链 | ^3.0.0 | [📖 文档](https://electron-vite.org/guide/) |
| [Vite](https://vitejs.dev/) | 底层构建引擎 | ^6.0.0 | [📖 文档](https://vitejs.dev/guide/) |

> 💡 **开发提示**：各库的官方文档是开发新插件和自定义功能的最佳参考。特别是 [KaTeX 支持的语法](https://katex.org/docs/supported.html)、[Mermaid 图表语法](https://mermaid.js.org/intro/syntax-reference.html) 和 [Capacitor 插件 API](https://capacitorjs.com/docs/apis) 对跨平台扩展功能至关重要。

### 项目结构

```
src/
├── main/
│   └── index.ts              # 主进程：窗口管理、文件 I/O、菜单、文件监听
├── preload/
│   └── index.ts              # 安全 IPC 桥接层（Electron）
└── renderer/
 ├── index.html            # 入口 HTML
 ├── main.ts               # 渲染进程入口，自动检测 Electron 或 Capacitor
 ├── capacitor-api.ts      # ★ Capacitor 桥接层（移动端替代 Electron API）
 ├── mobile.css            # ★ 触控优化的响应式样式
 ├── editor/
 │   ├── editor.ts         # 编辑器编排核心（插件集成）
 │   └── plugins/          # ★ 显示插件系统
 │   ├── html-view.ts      # HTML 内联节点视图
 │   └── plugins/          # ★ 显示插件系统
 │       ├── index.ts      # 插件管理器（注册/查询/启停）
 │       ├── math-plugin.ts
 │       ├── mermaid-plugin.ts
 │       └── *.css         # 插件样式（含多主题适配）
 └── themes/
     ├── base.css          # 基础样式
     └── theme-manager.ts  # 主题切换管理器
```

### 设计哲学

整个项目仅 **5 个运行时依赖** + **6 个开发依赖**，严格遵循「如非必要，勿增实体」的原则：

- 不要工具栏（用户会用快捷键和 Markdown 语法）
- 不要侧边栏、状态栏
- 不做文件管理、云同步、协作编辑
- 追求极致简单，每个插件职责单一清晰，完全解耦可独立启停

---

## 内联 SVG 规范指南

> ⚠️ **重要提示**：ColaMD 使用 remark/rehype 解析 Markdown，其中**空行会被当作段落分隔符**。为了让内联 SVG 正确渲染，整个 HTML 块（包括 `<div>`、`<svg>`、`<p>` 标签）**必须写在一行内，不能有任何换行符**。

### 为什么必须使用单行格式？

ColaMD 的解析流程：

```
Markdown 源文件
    ↓
remark-parse (Markdown → MDAST)
    ↓
remark 插件处理
    ↓
空行检测：遇到空行 → 创建新的 paragraph 节点
    ↓
rehype (MDAST → HAST)
    ↓
ProseMirror 序列化
    ↓ 每个 paragraph → 独立的 htmlSchema.node
    ↓
html-view.ts 注入到 DOM
    ↓
最终输出：<span class="milkdown-html-inline">单个块</span>
```

**多行格式的后果**：

```html
<!-- 如果 SVG 分成多行（有空行） -->

Markdown:
<div>
<svg>
  <defs>...</defs>

  <rect/>

  <circle/>
</svg>
</div>

导出 HTML:
<p><span>...<svg><defs>...</defs></svg></span></p>  ← 块1
<p><span>  <rect/></span></p>                        ← 块2（独立！）
<p><span>  <circle/></span></p>                      ← 块3（独立！）

结果：❌ SVG 被拆成碎片，无法正确渲染
```

**单行格式的效果**：

```html
<!-- 整个内容在一行（无空行） -->

Markdown:
<div><svg><defs>...</defs><rect/><circle/></svg><p>图注</p></div>

导出 HTML:
<p><span>
  <div><svg>完整内容</svg><p>图注</p></div>
</span></p>

结果：✅ 完整的 SVG 正确渲染
```

### SVG 规范要求

| # | 规则 | 重要级 | 说明 |
|---|------|--------|------|
| 1 | 🔴 **单行压缩** | **必须** | 整个 `<div>` 块不能有换行 |
| 2 | ✅ **标签闭包** | 必须 | 所有标签正确闭合或自闭合 |
| 3 | ✅ **命名空间** | 必须 | 包含 `xmlns="http://www.w3.org/2000/svg"` |
| 4 | ✅ **尺寸匹配** | 必须 | `width`/`height` 与 `viewBox` 一致 |
| 5 | ✅ **双引号** | 推荐 | 所有属性值使用双引号 |
| 6 | ✅ **ASCII字符** | 推荐 | 避免特殊符号，用 `-` 代替 `→` |

### 示例：复杂内联 SVG

```html
<div style="text-align: center; margin: 20px 0;"><svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto; background: #f5f5f5; border-radius: 12px;"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1"/><stop offset="100%" style="stop-color:#357ABD;stop-opacity:1"/></linearGradient><linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#7ED321;stop-opacity:1"/><stop offset="100%" style="stop-color:#5DB80D;stop-opacity:1"/></linearGradient></defs><rect width="600" height="400" fill="#f5f5f5" rx="12"/><rect x="40" y="40" width="520" height="60" rx="8" fill="url(#grad1)"/><text x="300" y="78" fill="white" text-anchor="middle" font-size="22" font-weight="bold">内联 SVG 示例</text><circle cx="150" cy="180" r="50" fill="url(#grad1)"/><text x="150" y="188" fill="white" text-anchor="middle" font-size="16" font-weight="bold">节点 A</text><rect x="250" y="130" width="100" height="100" rx="10" fill="url(#grad2)"/><text x="300" y="185" fill="white" text-anchor="middle" font-size="16" font-weight="bold">节点 B</text><polygon points="450,130 500,180 450,230 400,180" fill="#E74C3C"/><text x="450" y="188" fill="white" text-anchor="middle" font-size="14" font-weight="bold">节点 C</text><line x1="200" y1="180" x2="250" y2="180" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/><line x1="350" y1="180" x2="400" y2="180" stroke="#666" stroke-width="2" stroke-dasharray="5,5"/><rect x="100" y="280" width="400" height="80" rx="8" fill="white" stroke="#ddd" stroke-width="1"/><text x="300" y="310" fill="#333" text-anchor="middle" font-size="14" font-weight="bold">三级火箭模型</text><text x="300" y="335" fill="#666" text-anchor="middle" font-size="12">材料 - 制造 - 平台</text></svg><p style="font-size: 10pt; color: #666; margin-top: 12px;">图：复杂内联 SVG 示例（单行压缩格式）</p></div>
```

### 对比：内联 vs 外联 SVG

| 特性 | 内联 SVG | 外联 SVG |
|------|---------|---------|
| **适用场景** | 演示、学习、简单图标 | 生产环境、复杂图形 |
| **代码位置** | Markdown 文件内 | 独立 `.svg` 文件 |
| **格式要求** | 🔴 **必须单行压缩** | 无特殊要求 |
| **可维护性** | ⚠️ 困难（长行难读） | ✅ 优秀（独立文件） |
| **复杂度上限** | 受限于单行长度 | 无限制 |
| **浏览器缓存** | ❌ 无法缓存 | ✅ 自动缓存 |

### 最佳实践

#### 适合使用内联 SVG 的场景：
- ✅ 演示和学习目的
- ✅ 简单图标（< 10 个元素）
- ✅ 需要单文件交付
- ✅ 快速原型开发

#### 适合使用外联 SVG 的场景：
- ✅ 生产环境文档
- ✅ 复杂图形（> 20 个元素）
- ✅ 需要频繁编辑和维护
- ✅ 团队协作项目

### 维护技巧

1. **编辑时使用临时换行**
   ```html
   <!-- 开发阶段：可读格式 -->
   <svg ...>
     <rect .../>
     <circle .../>
   </svg>

   <!-- 保存前：压缩为一行 -->
   <svg ...><rect .../><circle .../></svg>
   ```

2. **使用代码编辑器的"合并行"功能**
   - VS Code: `Ctrl+J` (Windows) / `Cmd+J` (Mac)
   - WebStorm: `Ctrl+Shift+J`

3. **版本控制友好**
   - Git diff 会显示整行变更
   - 可考虑使用 `.gitattributes` 处理长行

---

## 致谢与版权

### 原版项目

本项目基于 **[marswaveai/ColaMD](https://github.com/marswaveai/colamt)** v1.5.0 进行扩展开发。

**原版作者**: [marswave.ai](https://marswave.ai) （hello@marswave.ai）

原版 ColaMD 是一个优秀的 Agent Native Markdown 编辑器，其「如非必要，勿增实体」的设计哲学深刻影响了本项目的开发理念。本扩展版在保留原版全部功能的基础上，增加了显示插件系统以支持更丰富的 Markdown 内容表达。

### 第三方开源库

本项目的运行依赖于以下优秀的开源项目：

| 项目 | 许可证 | 用途 |
|------|--------|------|
| [Electron](https://github.com/electron/electron) | MIT | 跨平台桌面框架 |
| [Milkdown](https://github.com/Milkdown/milkdown) | MIT | WYSIWYG Markdown 编辑器内核 |
| [ProseMirror](https://github.com/ProseMirror/prosemirror) | MIT | 底层富文本编辑引擎 |
| [KaTeX](https://github.com/KaTeX/KaTeX) | MIT | 数学公式渲染 |
| [Mermaid.js](https://github.com/mermaid-js/mermaid) | MIT | 图表渲染 |
| [Vite](https://github.com/vitejs/vite) | MIT | 构建工具 |
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | 开发语言 |

感谢以上项目的作者和维护者为开源社区做出的卓越贡献。

### 开源协议

Copyright (c) 2026 [marswave.ai](https://marswave.ai)

基于 [MIT License](LICENSE) 发布 — 永久免费开源。

> 本软件按"原样"提供，不提供任何形式的明示或暗示的担保，包括但不限于对适销性、特定用途适用性和非侵权性的担保。在任何情况下，作者或版权持有者均不对因软件或软件使用或其他交易而产生的、由软件引起的或与之相关的任何索赔、损害或其他责任负责。

---

## 社区与支持

### 相关链接

| 链接 | 说明 |
|------|------|
| [GitHub 仓库](https://github.com/marswaveai/colamd) | 原版项目地址 |
| [GitHub Releases](https://github.com/marswaveai/colamd/releases) | 下载最新版本 |
| [Issues](https://github.com/marswaveai/colamd/issues) | 问题反馈与建议 |
| [marswave.ai](https://marswave.ai) | 官方网站 |

### 参与贡献

欢迎通过以下方式参与：

- **提交 Issue** — 发现 Bug 或有新功能想法时，请在 GitHub Issues 中反馈
- **Pull Request** — 欢迎提交代码改进，尤其是新的显示插件
- **主题贡献** — 制作精美的 CSS 主题并分享到社区

### 路线图

ColaMD 将随 Agent 生态一起演进：

- ~~v1.1~~ — ✅ 实时文件热更新、文件关联、拖拽打开、主题系统
- ~~v1.2~~ — ✅ 新图标
- ~~v1.3~~ — ✅ Agent 活动指示器、Cmd+点击链接、富文本复制、智能换行、PDF/HTML 导出、主题持久化
- ~~v1.4~~ — ✅ 幻灯片：Markdown as Database，HTML 模板渲染
- ~~v1.5~~ — ✅ 导出 Slides：单文件 HTML + 图片内联
- **当前版本** — 🆕 显示插件系统：Math 公式渲染 + Mermaid 图表渲染
- **未来规划** — 更多显示插件（代码高亮、流程图增强等）、双向同步、多文件监听

---

## 📬 联系与支持

需要帮助？想要贡献？有反馈？

### 📱 飞书联系方式

扫描下方二维码，添加项目维护者：

![飞书二维码](docs/feishu-contact.jpg)

**联系人**: 比特 (byteuser

### 📧 其他联系方式

| 方式 | 链接 |
|------|------|
| 🐛 **报告 Bug** | [提交 Issue](https://github.com/byteuser1977/ColaMD-extend/issues/new?labels=bug) |
| 💡 **功能建议** | [提交 Issue](https://github.com/byteuser1977/ColaMD-extend/issues/new?labels=enhancement) |
| 💬 **讨论交流** | [GitHub Discussions](https://github.com/byteuser1977/ColaMD-extend/discussions/new?category=q-a) |
| 📧 **邮箱** | byteuser@qq.com |

---

*由 [marswaveai/ColaMD](https://github.com/marswaveai/colamd) 扩展而来，为 Agent Native 的未来而造。*

