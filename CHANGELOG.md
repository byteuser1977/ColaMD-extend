# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.5.0]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.0
[1.4.0]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.4.0
