# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2026-05-23

### Added

#### Themes
- **Academic Paper theme** ([`themes/academic-paper.css`](themes/academic-paper.css)) — 严格遵循 GB/T 7713 国标规范的学术论文主题，含三线表、宋体/黑体排版、多级标题、图题/表题规范
- **Swiss Design theme** ([`themes/swiss-design.css`](themes/swiss-design.css)) 🇨🇭 — 瑞士国际主义平面设计风格：黑白红三色体系、几何无衬线字体、网格化排版、黑底白字表头
- **Pixso Design theme** ([`themes/pixso-design.css`](themes/pixso-design.css)) — Pixso 设计规范主题
- **Forest Ink theme** ([`themes/forest-ink.css`](themes/forest-ink.css)) — 森林墨水风格主题
- **Standardized template** ([`themes/template.css`](themes/template.css)) — 遵循 v3.0 范式的参考实现模板，变量化 + 模块化 + 打印保真

#### Theme Development Framework
- **Theme paradigm document** ([`docs/theme-paradigm.md`](docs/theme-paradigm.md)) — 完整的 CSS 主题开发规范 (v3.2)：
  - 设计原则：变量驱动、模块化、语义命名、AI Agent 可推导
  - 设计规范：30+ 条可验证规则 (MUST / MUST NOT / SHOULD)，含 WCAG 对比度公式
  - 打印保真规范：变量重声明、必覆盖元素清单 (12 类)、Chromium 打印约束
  - px 单位统一规范 (9.x)：禁止 pt/rem 混用，确保 PDF 导出字号一致

#### Platform Support
- **Android 平台**：Capacitor 6 集成，原生 APK 构建，文件选择器、移动端适配样式 ([`mobile.css`](src/renderer/mobile.css))
- **iOS 平台**：Capacitor 6 集成，原生 IPA 构建
- **双平台桥接**：运行时自动检测 Electron / Capacitor API (`capacitor-api.ts`)

#### Documentation & Demo
- **学术论文演示文档** ([`docs/academic-demo.md`](docs/academic-demo.md)) — 万华生态研究报告，含 8 组 Mermaid 图表
- **PDF 字体补偿指南** ([`docs/PDF_FONT_COMPENSATION.md`](docs/PDF_FONT_COMPENSATION.md)) — Electron 打印字号缩放问题与补偿方案
- **行内 SVG 指南** ([`docs/demo.html`](docs/demo.html)) — Markdown 嵌入 SVG 的最佳实践演示
- **通用演示文档** ([`docs/demo.md`](docs/demo.md)) — 全功能特性演示

### Changed

#### Theme System Architecture
- **模块化重构**：主题系统拆分为 `foundation.css` + `base/` 内置主题 + `components/mermaid/` Mermaid 变量映射 + 用户主题目录
- **Mermaid 变量体系**：20 个核心 CSS 变量 (`--mermaid-*`)，自动映射到 22 种图表类型 SVG 选择器
- **学术论文主题重构**：Section 14 硬编码色值全部重构为 `var()` 变量引用；所有 `pt` 单位替换为 `px` 偶数整数

#### Editor Core
- 移除调试用开发者工具自动打开代码
- 优化学术论文主题样式

### Fixed
- 修复 Mermaid 文字偏移、变量名不匹配及双重边框问题 (elegant + academic-paper)
- 修复 TypeScript 类型错误 15 处 (capacitor-api, editor, math-plugin, mermaid-plugin, main/index)
- 修复模板 CSS 与 Swiss Design CSS 打印保真：`@media print` 补全所有屏幕属性镜像（字号、行高、字体、边框、间距、字距等）
- 插件导入修复与包版本更新

### Changed (since beta)

| Beta | Date | Key Changes |
|------|------|-------------|
| `1.5.1-beta.1` | 2026-05-22 | Android/iOS 平台、移动端样式、应用图标自动生成 |
| `1.5.1-beta.2` | 2026-05-22 | TS 类型修复、Mermaid 主题重构、学术/Swiss/Pixso 主题、范式文档 |

---

## [1.5.1-beta.2] - 2026-05-22

### Fixed

#### TypeScript Type Errors
- Fixed 15 TypeScript type errors across the codebase:
  - `capacitor-api.ts`: Fixed `string | null` type assignment error
  - `editor.ts`: Fixed `remarkPluginsCtx` type mismatch and `rootEl` null check
  - `math-plugin.ts`: Fixed `$NodeSchema` type compatibility with `$view` function
  - `mermaid-plugin.ts`: Fixed Mermaid theme type and `$NodeSchema` type issues
  - `main.ts`: Added Vite client types reference for `import.meta.glob`
  - `main/index.ts`: Removed invalid `createServer` import from `fs` and `marginType` from `PrintToPDFOptions`

#### TypeScript Project Configuration
- Added `"composite": true` to all TypeScript project configurations for proper project references:
  - `tsconfig.main.json`
  - `tsconfig.preload.json`
  - `tsconfig.renderer.json`

### Changed

#### Mermaid Theme System Refactor
- **Restructured Mermaid styles to warm color palette**:
  - Changed Mermaid color scheme to Guizang warm tones (cream background + brown tones)
  - Adjusted font size to 10.5pt for academic printing compatibility
  - Added Typora compatible selectors (`.md-diagram-panel`)
  - Added mobile responsive adaptation
  - Unified text color and border styles

#### Theme System Architecture
- **New modular theme architecture**:
  - `src/renderer/editor/plugins/themes/` — New theme manager and base styles
  - `themes/base/` — Base theme CSS files (light, dark, elegant, newsprint)
  - `themes/components/mermaid/` — Mermaid-specific theme CSS files
  - `foundation.css` — Shared foundation styles
  - `variables.css` — CSS variables for Mermaid theming

### Added

#### New Themes
- **Academic Paper theme**: [`academic-paper.css`](themes/academic-paper.css)
  - Mermaid color scheme in Guizang warm tones (cream background + brown tones)
  - Font size optimized for academic printing (10.5pt)
  - Typora compatible selectors (`.md-diagram-panel`)
  - Mobile responsive adaptation
- **Pixso Design theme**: [`pixso-design.css`](themes/pixso-design.css)
- **Swiss Design theme**: [`swiss-design.css`](themes/swiss-design.css) 🇨🇭
  - Pure black-white-red color system inspired by Swiss International Typographic Style
  - Geometric sans-serif fonts (Helvetica / Inter), grid-based layout with generous whitespace
  - Form follows function design philosophy, minimal and restrained aesthetic
  - Complete Mermaid diagram integration with monochrome + accent red styling

#### Theme Development Framework
- **Theme paradigm document**: [`docs/theme-paradigm.md`](docs/theme-paradigm.md)
  - Comprehensive CSS theme development specification (v3.0)
  - Design principles: variable-based, modular, semantic naming, AI-agent derivable
  - Mandatory design constraints with validation methods (MUST / MUST NOT / SHOULD levels)
  - Color space specification: 5 seed colors + 3 font stacks auto-derivation system
  - Print fidelity requirements: `@media print` as screen style mirror enhancement

- **Standardized theme template**: [`themes/template.css`](themes/template.css)
  - Reference implementation following the v3.0 paradigm
  - All required sections: design tokens, editor styles, code blocks, blockquotes, tables, Mermaid variables, print styles
  - Ready-to-use template for creating new custom themes

#### Documentation Updates
- Updated [README.md](README.md) and [README_CN.md](README_CN.md) to include Swiss Design theme in the downloadable themes table
- Added comprehensive theme descriptions for all 7 external themes (elegant, guizang, forest-ink, academic-paper, pixso-design, swiss-design, template)

---

## [1.5.1-beta.1] - 2026-05-22

### Added

#### Android Platform Support
- **Full Android platform support**: Integrated Capacitor 6 for native Android app builds
- **File picker functionality**: Integrated `@capawesome/capacitor-file-picker` plugin for file selection on Android devices
- **Mobile responsive styles**: Added [`mobile.css`](src/renderer/mobile.css) for optimized mobile display and interaction
- **Auto-generated app icons**: Added [`generate-icons.js`](scripts/generate-icons.js) script to auto-generate Android/iOS icons at various sizes
  - Android mipmap icons (48px-192px)
  - Android adaptive icon foreground layer (108px-432px)
  - iOS AppIcon (1024x1024)

#### New Themes & Styles
- **Forest Ink slide theme**: Added forest ink color scheme slide template with full presentation logic and responsive layout
- **Academic Paper theme**: Added [`academic-paper.css`](src/renderer/styles/themes/academic-paper.css) theme
  - Mermaid color scheme in Guizang warm tones (cream background + brown tones)
  - Font size optimized for academic printing (10.5pt)
  - Typora compatible selectors (`.md-diagram-panel`)
  - Mobile responsive adaptation
- **Pixso Design theme**: Added [`pixso-design.css`](src/renderer/styles/themes/pixso-design.css) theme

### Fixed

#### Android Platform Fixes
- **Chinese IME (Input Method Editor) fix**:
  - Removed `e.preventDefault()` in `beforeinput` event to resolve CJK input method issues
  - Enhanced ProseMirror editor IME composition event handling
  - Used `-webkit-user-modify: read-write-plaintext-only` to improve input experience
- **Intent file open fix**:
  - Added `Intent.ACTION_VIEW` handling in `MainActivity`
  - Supported `onNewIntent` for opening new files when app is already running
  - Passed file content to WebView via JavaScript events
- **PDF export fix**:
  - Replaced Capacitor Plugin bridge with `JavascriptInterface`
  - Added `ColaMDNativeBridge` class to call Android native `PrintManager`
  - Added "Save as PDF" option
  - Fixed pagination, save button, mermaid version, and layer residue issues

#### Export Functionality Improvements
- **PDF/HTML export**:
  - Refactored Mermaid rendering logic with export sync wait mechanism
  - Supported real-time rendered content export
  - Fixed default filename logic
- **File manager open**:
  - Adopted pull model: JS actively calls Java `checkPendingFile()` to query
  - Eliminated JS event injection timing issues
  - Added init detection + setInterval polling for dual guarantee

### Changed

- **Mobile IME handling refactor**:
  - Simplified mobile CSS styles, removed outdated Android IME patches
  - Refactored Android file open event listener, using new `colamd-open-event` instead of old `intent-file-opened`
- **Close button style optimization**: Replaced rectangle rotation icon with standard cross line icon for more consistent visual effect
- **Theme style updates**:
  - `mermaid-plugin.css`: Minor adjustments
  - `forest-ink.css`: Updated forest ink theme

### Documentation

- Added [`demo.md`](docs/demo.md) and [`demo.pdf`](docs/demo.pdf) demo documents
- Updated README and README_CN.md with export documentation and new doc paths
- Added mobile support documentation with tech stack, build/release workflow, and troubleshooting
- Added Forest Ink theme documentation

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @capawesome/capacitor-file-picker | ^6.2.0 | Android file picker plugin |
| sharp | ^0.34.5 | Icon generation tool |

## [1.5.0] - 2026-05-18

### Added

#### Renderer Plugin System (Core Feature)
- Introduce declarative plugin architecture with independent registration, enable/disable toggle, and dynamic module management
- Unified plugin design pattern: Schema Definition → NodeView Interaction → Remark Parsing → Markdown Serialization → PNG Export → Rendered/Source Dual Mode
- **Plug** menu in menu bar for unified plugin render control

#### Math Plugin (KaTeX Integration)
- Add KaTeX rendering engine for LaTeX math equation support
- **Inline equations** (`$...$`): embedded within paragraphs, e.g., $E = mc^2$
- **Block equations** (`$$...$$`): centered display with support for complex expressions (equation systems, matrices, physics formulas)
- **Dual-mode toggle**: switch between rendered preview and source editing with one click
- Live editing: edit LaTeX source directly in raw mode; auto-save and re-render on blur
- Graceful fallback: degrade to plain text on KaTeX parse failure without blocking workflow

#### Mermaid Plugin (Diagram Rendering)
- Add Mermaid.js v11.15 for 17+ diagram type visualization:

| Category | Supported Diagrams |
|----------|-------------------|
| Flowchart | `graph` (TD/LR/RL/BT), `flowchart` |
| Sequence | `sequenceDiagram` |
| Class | `classDiagram` |
| State | `stateDiagram-v2` |
| ER | `erDiagram` |
| User Journey | `journey` |
| Pie | `pie` |
| Gantt | `gantt` |
| Git Graph | `gitGraph` |
| Mind Map | `mindmap` |
| Timeline | `timeline` |
| Quadrant Chart | `quadrantChart` |
| XY/Line/Bar Chart | `xyChart` |
| C4 Architecture | `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` |
| Sankey | `sankey-beta` |
| Block | `block-beta` |
| Architecture | `architecture-beta` |

- Input shortcut: typing `` ```mermaid `` + Enter auto-converts to mermaid_block node
- Async-safe rendering: render counter prevents race conditions
- Multi-theme deep adaptation: each built-in theme has corresponding Mermaid color scheme
- C4 architecture-specific semantic colors for persons/systems/containers/components
- Auto node height adjustment after rendering (+6px padding) to prevent content overflow

#### Theme Support
- **Guizang theme**: new Chinese-style dark theme with traditional aesthetics
- Custom Mermaid theme adaptation for Elegant, Newsprint, Dark, and Guizang themes:
  - Light → Default Mermaid theme (clean & bright)
  - Dark → GitHub Dark style (`#0d1117` background, `#8b949e` border/text)
  - Elegant → Custom warm palette (`#e8e2db` background, LXGW WenKai font)
  - Newsprint → Print style (PT Serif font, newsprint texture)

#### Slides Feature — Markdown as Database
- New concept: Markdown as content layer, HTML templates as view layer
- Supported layouts: `cover` · `statement` · `section` · `video` · `thankyou`
- Optional features: background image (`bg:`), video embed (`src:`), inline image preview (`preview:`)
- Export formats: single-file HTML (Base64-inlined images) or folder (with video resources)
- Tutorial template included at `resources/templates/slides/`

### Fixed
- Mermaid diagram color scheme issues in dark themes causing unreadable content
- Mermaid diagram container offset/miscalculation leading to content overflow
- Sankey diagram syntax parsing compatibility
- Slides templates not properly bundled into extraResources during build

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @milkdown/kit | ^7.19.2 | WYSIWYG editor core |
| katex | ^0.16.46 | Math equation rendering engine |
| mermaid | ^11.15.0 | Diagram rendering library |
| electron | ^34.0.0 | Cross-platform desktop framework |

## [1.4.0] - Previous Release

### Added
- Slides feature — Markdown as Database concept
- Slide export capabilities (HTML single-file and folder formats)

---

[1.5.1-beta.2]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.1-beta.2
[1.5.1-beta.1]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.1-beta.1
[1.5.1]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.1
[1.5.0]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.0
[1.4.0]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.4.0
