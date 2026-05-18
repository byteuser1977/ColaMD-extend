# ColaMD (Extended)

**Markdown as Database. The Agent Native Editor and Rich Content Rendering Platform.**

Extended from [marswaveai/ColaMD](https://github.com/marswaveai/colamd) v1.5.0 with a new **Renderer Plugin System** that supports WYSIWYG editing and rendering of math equations, Mermaid diagrams, and more. Markdown is no longer just plain text — it becomes a true content database.

Real-time collaboration between humans and AI agents — see your agent's changes as they happen. Turn any Markdown file into a slide deck, blog post, resume, or product page.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/marswaveai/colamd.svg)](https://github.com/marswaveai/colamd/releases)

**This Extended Edition**: [git@github.com:byteuser1977/ColaMD-extend.git](https://github.com/byteuser1977/ColaMD-extend)

[Features](#features) | [Renderer Plugins](#renderer-plugin-system) | [Plug Menu](#plug-menu--plugin-render-control) | [Quick Start](#quick-start) | [Themes](#theme-system) | [Architecture](#technical-architecture) | [中文](README_CN.md)

---

## Why ColaMD?

AI agents are rewriting how we work. They edit files, generate docs, and produce reports — all in Markdown.

But how do you **watch** an agent work? You close the file. You reopen it. You wait.

**ColaMD changes this.** Open a `.md` file in ColaMD, let your agent edit it, and watch the content update in real time — like pair programming with an AI. No refresh, no reload, no friction.

This is what **Agent Native** means: built from the ground up for a world where humans and agents collaborate on the same files.

---

## What's Different from the Original

This repository extends **[marswaveai/ColaMD](https://github.com/marswaveai/colamd)** v1.5.0 with the following key differences:

| Aspect | Original ColaMD | This Extended Edition |
|--------|-----------------|----------------------|
| Content rendering | Plain Markdown text (GFM + Commonmark) only | **Markdown + Math Equations + Mermaid Diagrams** |
| Plugin system | None | **Declarative plugin architecture, independently toggleable, dynamically registered** |
| Math support | ❌ | ✅ KaTeX inline/block equations, live editing, PNG export |
| Diagram support | ❌ | ✅ Mermaid full-type diagrams (17+ types), multi-theme adaptation, PNG export |
| Dual-mode toggle | N/A | ✅ Each plugin supports **Rendered / Source Edit mode** one-click toggle |

> All original features are fully preserved: Agent real-time sync, activity indicator, WYSIWYG editor, slide system, themes & export, etc.

### Demo Document

This project includes a comprehensive demo document [`demo.md`](demo.md) that covers:

- **Math Equations**: 7 inline equations + 6 block equations (including systems of equations, matrices, physics formulas)
- **Mermaid Diagrams**: All 17 diagram types (flowchart, sequence, class, state, ER, Gantt, pie, journey, git graph, mindmap, timeline, quadrant, XY chart, C4 context, Sankey, block, complex clustered)
- **Mixed Content**: Formulas and diagrams rendered together in the same document

Open `demo.md` to fully test the plugin rendering, mode switching, source editing, and PNG export capabilities of the extended ColaMD.

---

## Features

### 🔗 Agent Native (Inherited from Original)

- **Live Agent Sync** — When an AI agent (Claude Code, Cursor, Copilot, etc.) modifies your `.md` file, ColaMD detects changes via `fs.watch` and refreshes instantly. No manual reload needed. This is the core feature.
- **Agent Activity Indicator** — A breathing dot in the titlebar tells you the agent's status: orange pulse while writing, green flash when done.
- **Cmd+Click Links** — Click any link in the editor to open it directly in your browser.

### ✏️ Editor Core (Inherited from Original)

- **True WYSIWYG** — Type Markdown, see rich text rendered instantly. No split-pane preview needed.
- **Smart Line Breaks** — Single newlines render as `<br>`, matching how AI agents write Markdown.
- **Rich Text Copy** — Copy content and paste into WeChat, email, or any rich text editor with formatting fully preserved.
- **Minimal by Design** — No toolbar, no sidebar, no distractions. Just you and your content.

### 📊 Slides — Markdown as Database (Inherited from Original)

HTML is hard to edit. Markdown is easy.

ColaMD introduces a new idea: **Markdown as Database**. Your `.md` file is the content layer. HTML templates are the view layer. Change content by editing Markdown — never touch HTML.

One Markdown file, many possible renderings: slides, blog, resume, product page... Future templates can consume the same file in completely different ways.

#### How to Use

- **File → New Slides (`⌘⇧N`)** — Creates a `slides.md` tutorial template and opens it in the editor
- **File → Open as Slides (`⌘⇧P`)** — Spins up a local server and opens your current `.md` file as a slide deck in the browser
- **File → Export Slides...** — Export a shareable version (single-file HTML or folder with video resources)

#### Slide Format

```markdown
---
kicker: YOUR BRAND
chip: Event Name · 2026
page: YOUR NAME
---

<!-- type: cover -->
# Title
Subtitle here

---

<!-- type: statement -->
## Key Message
One powerful sentence.
```

Supported layouts: `cover` · `statement` · `section` · `video` · `thankyou`

Optional: background image (`bg: cover.png`), video embed (`src: demo.mp4`), inline image preview (`preview: screenshot.png`).

No image? The cover falls back to a clean orange-on-white design — it just works.

### 📤 Export Capabilities

- **PDF / HTML export**
- **Slide export** — Single HTML file (images Base64-inlined) or folder format (with video resources)
- **Equation / Diagram PNG export** — Right-click to export as high-definition PNG images (2x scaling)

### 🎨 Themes & Cross-Platform (Inherited from Original)

- **4 built-in themes** + [downloadable themes](themes/) + custom CSS import
- **Cross-platform** — macOS (.dmg), Windows (.exe), Linux (.AppImage / .deb)

---

## Renderer Plugin System

> ⭐ This is the core incremental feature of this extended edition. Plugins use a declarative registration architecture — each plugin is independently encapsulated and can be individually enabled or disabled.

### Architecture Overview

```
src/renderer/editor/plugins/
├── index.ts                    # Plugin manager (register/query/toggle)
├── math-plugin.ts              # 📐 Math equation renderer plugin
├── mermaid-plugin.ts           # 🔀 Mermaid diagram renderer plugin
├── mermaid-plugin.css          # Mermaid base styles
├── mermaid-plugin-dark.css     # Mermaid dark theme
├── mermaid-plugin-elegant.css  # Mermaid elegant theme
└── mermaid-plugin-newsprint.css # Mermaid newsprint theme
```

Every plugin follows a unified design pattern:

```
Schema Definition → NodeView Interaction → Remark Parsing → Markdown Serialization → PNG Export → Rendered/Source Dual Mode
```

---

### 📐 Math Plugin — Equation Rendering

**Source**: [math-plugin.ts](src/renderer/editor/plugins/math-plugin.ts) | **Dependencies**: [KaTeX](https://katex.org/) + remark-math

| Property | Description |
|-----------|-------------|
| Plugin ID | `math` |
| Default Enabled | ✅ Yes |
| Context Menu | Save Equation as PNG |
| Associated Nodes | `math_inline`, `math_block` |

#### Supported Syntax

```markdown
Inline equation: mass-energy equivalence $E = mc^2$ embedded within a paragraph.

Block equation (centered display):
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

#### Feature Details

- **Inline equations (`$...$`)** — Uses `<span class="math-inline">` container, KaTeX rendered (`displayMode: false`), supports rendered / raw dual-mode toggle
- **Block equations (`$$...$$`)** — Uses `<div class="math-block">` container, KaTeX rendered (`displayMode: true`, centered display), raw mode uses `<textarea>` with auto-adjusting row count
- **Live editing** — Edit LaTeX source code directly in raw mode; auto-save and re-render on blur
- **Graceful fallback** — KaTeX rendering failures degrade elegantly to plain text display without blocking the editing workflow
- **PNG export** — Canvas + SVG foreignObject technology, 2x scaled high-definition output, white background, 16px padding

---

### 🔀 Mermaid Plugin — Diagram Rendering

**Source**: [mermaid-plugin.ts](src/renderer/editor/plugins/mermaid-plugin.ts) | **Dependencies**: [Mermaid.js](https://mermaid.js.org/)

| Property | Description |
|-----------|-------------|
| Plugin ID | `mermaid` |
| Default Enabled | ✅ Yes |
| Context Menu | Save Diagram as PNG |
| Associated Nodes | `mermaid_block` |

#### Supported Diagram Types (17+)

```markdown
```mermaid
graph TD
    A[Markdown] --> B[ColaMD]
    B --> C[Math Plugin]
    B --> D[Mermaid Plugin]
    C --> E[Rich Content]
    D --> E
```
```

| Category | Supported Diagrams |
|----------|-------------------|
| Flowchart | `graph` (TD/LR/RL/BT), `flowchart` |
| Sequence Diagram | `sequenceDiagram` |
| Class Diagram | `classDiagram` |
| State Diagram | `stateDiagram-v2` |
| ER Diagram | `erDiagram` |
| User Journey | `journey` |
| Pie Chart | `pie` |
| Gantt Chart | `gantt` |
| Git Graph | `gitGraph` |
| Mind Map | `mindmap` |
| Timeline | `timeline` |
| Quadrant Chart | `quadrantChart` |
| XY/Line/Bar Chart | `xyChart` |
| C4 Architecture | `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` |
| Sankey Diagram | `sankey-beta` |
| Block Diagram | `block-beta` |
| Architecture Diagram | `architecture-beta` |

#### Feature Details

- **Input shortcut rule** — Typing `\`\`\`mermaid` followed by Enter auto-converts to a mermaid_block node, no manual action needed
- **Dual-mode toggle** — One-click switch between rendered preview and source editing; raw mode uses `<textarea>` for direct Mermaid code editing
- **Async-safe rendering** — Render counter prevents race conditions, ensuring displayed results always match the latest code
- **Multi-theme deep adaptation** — Each built-in theme has a corresponding Mermaid color scheme (see theme adaptation table below)
- **C4 architecture-specific colors** — Independent semantic color configurations for persons/systems/containers/components
- **Auto node height adjustment** — Container height auto-adjusts after rendering (+6px padding) to prevent content overflow
- **PNG export** — SVG normalization → Image → Canvas → PNG, 2x high-definition output, white background

#### Mermaid Theme Adaptation

| UI Theme | Mermaid Theme Style | Font | Highlights |
|----------|---------------------|------|------------|
| **Light** | Default | System default | Clean & bright |
| **Dark** | GitHub Dark | System default | `#0d1117` background, `#8b949e` border/text |
| **Elegant** | Custom warm palette | LXGW WenKai | `#e8e2db` background, warm brown cScale |
| **Newsprint** | Print style | PT Serif | Serif font, newsprint texture |
| **Forest Ink** (custom) | Forest green palette | Noto Serif SC | `#f5f1e8` paper base, `#3d6b4a` forest green accent, ink-green lines |

---

## How It Works

```
┌─────────────┐     writes     ┌──────────────┐
│  AI Agent   │ ──────────────▶│  .md file    │
│ (Claude,    │                │              │
│  Cursor...) │                └──────┬───────┘
└─────────────┘                       │
                              fs.watch detects change
                                      │
                              ┌───────▼───────┐
                              │    ColaMD     │
                              │  auto-refresh │
                              │   ✨ live!    │
                              │               │
                              │  ┌───────────┐ │
                              │  │ Plugin     │ │
                              │  │ ├─ Math    │ │
                              │  │ └─ Mermaid │ │
                              │  └───────────┘ │
                              └───────────────┘
```

1. Open any `.md` file in ColaMD
2. Let your AI agent edit that file
3. Watch the content update in real time — including instant rendering of math equations and Mermaid diagrams
4. The indicator dot pulses orange while the agent writes

No configuration needed. It just works out of the box.

---

## Plug Menu — Plugin Render Control

ColaMD provides a **Plug** menu in the top menu bar to control renderer plugin behavior. Each registered plugin (e.g., Math, Mermaid) can be independently managed through this menu.

### Menu Structure

```
Plug
├── Math
│   ├── Rendered      # Rendered mode: display rich text effects of equations/diagrams
│   └── Raw           # Source mode: display raw Markdown code, editable directly
└── Mermaid
    ├── Rendered      # Rendered mode: display SVG visualization of diagrams
    └── Raw           # Source mode: display Mermaid code, editable directly
```

### Rendered Mode

- Plugin content is presented as rich text
- **Math**: Beautiful math equations rendered by KaTeX, inline equations embedded in paragraphs, block equations centered
- **Mermaid**: SVG vector diagrams, supporting visualization of 17+ diagram types
- Right-click to export as PNG images

### Source Mode (Raw)

- Plugin content is presented as raw Markdown source
- Uses `<textarea>` to display and edit code directly
- **Live editing**: Edit LaTeX equations or Mermaid diagram code directly in the text box
- **Auto-save**: Modifications are automatically saved on blur, instantly switching back to rendered mode to display updated results
- Text box height auto-adjusts based on content line count to avoid scrollbars

### Usage Example

1. Enter a Mermaid code block:
   ````markdown
   ```mermaid
   graph TD
       A[Start] --> B[Process]
       B --> C[End]
   ```
   ````
2. Click **Plug → Mermaid → Rendered** to view the diagram
3. Click **Plug → Mermaid → Raw** to switch to source mode, edit nodes and connections directly
4. Click elsewhere in the editor to blur, auto-save and re-render

### Design Intent

- **WYSIWYG and source free switching**: Meet different scenario needs — view rendered effects when reading, edit source code when writing
- **Zero-friction editing**: No need to memorize special shortcuts, one-click menu toggle, auto-save on blur
- **Fully decoupled plugins**: Each plugin is independently controlled without mutual interference; newly added plugins automatically appear in the menu

---

## Quick Start

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Install & Run

```bash
# Clone this extended edition repository
git clone https://github.com/byteuser1977/ColaMD-extend.git
cd ColaMD-extend

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Build & Package

```bash
# Build
npm run build

# Package for current platform
npm run dist

# Package for specific platform
npm run dist:mac      # macOS (.dmg)
npm run dist:win      # Windows (.exe)
npm run dist:linux    # Linux (.AppImage / .deb)
```

### Download Pre-built Binaries

> Check this extended edition's [GitHub Releases](https://github.com/byteuser1977/ColaMD-extend/releases) for the latest builds. Original releases are available at [marswaveai/colamd](https://github.com/marswaveai/colamd/releases).

| Platform | Format |
|----------|--------|
| macOS | `.dmg` |
| Windows | `.exe` |
| Linux | `.AppImage` / `.deb` |

---

## Theme System

ColaMD includes **4 built-in themes**, and all renderer plugins automatically adapt to the active theme:

| Theme | Identifier | Style Description |
|-------|-----------|-------------------|
| **Light** | `theme-light` | Light theme, clean & bright |
| **Dark** | `theme-dark` | Dark theme, GitHub Dark style |
| **Elegant** | `theme-elegant` | Elegant theme, warm serif style (**default theme**) |
| **Newsprint** | `theme-newsprint` | Newsprint style |

Downloadable external themes (located in [`themes/`](themes/) directory):

| Theme File | Style Description |
|------------|-------------------|
| [elegant.css](themes/elegant.css) | Warm serif with terracotta accents, LXGW WenKai font |
| [guizang.css](themes/guizang.css) | Ancient Guizang style, ochre accents, ink-black code blocks |
| [forest-ink.css](themes/forest-ink.css) | 🌲 Forest Ink, warm paper base + forest green ink text + forest green accent |

Custom theme support: Place CSS files in `~/.colamd/themes/` directory, then import via **Theme > Import Theme**. Imported themes persist across sessions.

---

## Technical Architecture

```
┌─────────────────────────────────────────────┐
│                  Electron Shell               │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Main     │  │ Preload   │  │ Renderer  │  │
│  │ Process  │──│ IPC Bridge│──│ Process   │  │
│  └──────────┘  └───────────┘  └─────┬─────┘  │
│                                    │         │
│                         ┌──────────▼────────┐ │
│                         │    Milkdown Editor │ │
│                         │  (ProseMirror)      │ │
│                         │  ┌──────────────┐  │ │
│                         │  │ Plugin System │  │ │
│                         │  │ ├─ 📐 Math    │  │ │
│                         │  │ └─ 🔀 Mermaid │  │ │
│                         │  └──────────────┘  │ │
│                         └───────────────────┘ │
└─────────────────────────────────────────────┘
```

### Tech Stack

| Technology | Purpose | Version | Documentation |
|------------|---------|---------|---------------|
| [Electron](https://www.electronjs.org/) | Cross-platform desktop framework | ^34.0.0 | [📖 Docs](https://www.electronjs.org/docs/latest/) |
| [Milkdown](https://milkdown.dev/) | WYSIWYG Markdown editor core (ProseMirror-based) | ^7.19.2 | [📖 Docs](https://milkdown.dev/docs) |
| [ProseMirror](https://prosemirror.net/) | Underlying rich text editing engine | — | [📖 Docs](https://prosemirror.net/docs/) |
| [KaTeX](https://katex.org/) | Math equation rendering engine | ^0.16.46 | [📖 Docs](https://katex.org/docs/) |
| [Mermaid.js](https://mermaid.js.org/) | Diagram rendering library | ^11.15.0 | [📖 Docs](https://mermaid.js.org/intro/) |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development language | ^5.7.0 | [📖 Docs](https://www.typescriptlang.org/docs/) |
| [electron-vite](https://electron-vite.org/) | Electron build toolchain | ^3.0.0 | [📖 Docs](https://electron-vite.org/guide/) |
| [Vite](https://vitejs.dev/) | Underlying build engine | ^6.0.0 | [📖 Docs](https://vitejs.dev/guide/) |

> 💡 **Dev Tip**: The official documentation of each library is the best reference for developing new plugins and custom features. In particular, the [KaTeX supported syntax](https://katex.org/docs/supported.html) and [Mermaid diagram syntax](https://mermaid.js.org/intro/syntax-reference.html) are essential for extending plugin capabilities.

### Project Structure

```
src/
├── main/
│   └── index.ts              # Main process: window management, file I/O, menus, file watching
├── preload/
│   └── index.ts              # Secure IPC bridge layer
└── renderer/
    ├── index.html            # Entry HTML
    ├── main.ts               # Renderer process entry, connects editor and IPC
    ├── editor/
    │   ├── editor.ts         # Editor orchestration core (plugin integration)
    │   ├── html-view.ts      # HTML inline node view
    │   └── plugins/          # ★ Renderer plugin system
    │       ├── index.ts      # Plugin manager (register/query/toggle)
    │       ├── math-plugin.ts
    │       ├── mermaid-plugin.ts
    │       └── *.css         # Plugin styles (with multi-theme adaptation)
    └── themes/
        ├── base.css          # Base styles
        └── theme-manager.ts  # Theme switching manager
```

### Design Philosophy

The entire project has only **5 runtime dependencies** + **6 dev dependencies**, strictly following the principle of **"If not necessary, do not add entity"**:

- No toolbar (users use shortcuts and Markdown syntax)
- No sidebar or status bar
- No file management, cloud sync, or collaborative editing
- Pursue extreme simplicity — each plugin has a single clear responsibility, fully decoupled and independently toggleable

---

## Acknowledgments & Copyright

### Original Project

This project is an extended development based on **[marswaveai/ColaMD](https://github.com/marswaveai/colamd)** v1.5.0.

**Original Author**: [marswave.ai](https://marswave.ai) (hello@marswave.ai)

The original ColaMD is an excellent Agent Native Markdown editor. Its design philosophy of "if not necessary, do not add entity" has profoundly influenced the development philosophy of this project. This extended edition preserves all original features while adding a renderer plugin system to support richer Markdown content expression.

### Third-Party Open Source Libraries

This project depends on the following excellent open source projects:

| Project | License | Purpose |
|---------|---------|---------|
| [Electron](https://github.com/electron/electron) | MIT | Cross-platform desktop framework |
| [Milkdown](https://github.com/Milkdown/milkdown) | MIT | WYSIWYG Markdown editor core |
| [ProseMirror](https://github.com/ProseMirror/prosemirror) | MIT | Underlying rich text editing engine |
| [KaTeX](https://github.com/KaTeX/KaTeX) | MIT | Math equation rendering |
| [Mermaid.js](https://github.com/mermaid-js/mermaid) | MIT | Diagram rendering |
| [Vite](https://github.com/vitejs/vite) | MIT | Build tool |
| [TypeScript](https://github.com/microsoft/TypeScript) | Apache-2.0 | Development language |

We thank the authors and maintainers of the above projects for their outstanding contributions to the open source community.

### Open Source License

Copyright (c) 2026 [marswave.ai](https://marswave.ai) (Original) | [byteuser1977](https://github.com/byteuser1977) (Extended Edition)

Released under the [MIT License](LICENSE) — free and open source forever.

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Community & Support

### Related Links

| Link | Description |
|------|-------------|
| [GitHub Repository (Extended)](https://github.com/byteuser1977/ColaMD-extend) | This extended edition |
| [GitHub Repository (Original)](https://github.com/marswaveai/colamd) | Original project address |
| [GitHub Releases (Extended)](https://github.com/byteuser1977/ColaMD-extend/releases) | Download latest extended version |
| [GitHub Releases (Original)](https://github.com/marswaveai/colamd/releases) | Download original version |
| [Issues (Extended)](https://github.com/byteuser1977/ColaMD-extend/issues) | Bug reports & suggestions for this edition |
| [Issues (Original)](https://github.com/marswaveai/colamd/issues) | Bug reports for original project |
| [marswave.ai](https://marswave.ai) | Official website |

### Contributing

You are welcome to participate in the following ways:

- **Submit Issues** — Please report bugs or share new feature ideas via GitHub Issues
- **Pull Request** — Code improvements are welcome, especially new renderer plugins
- **Theme Contributions** — Create beautiful CSS themes and share them with the community

### Roadmap

ColaMD will evolve alongside the agent ecosystem:

- ~~v1.1~~ — ✅ Live file reload, file associations, drag & drop, theme system
- ~~v1.2~~ — ✅ New icon
- ~~v1.3~~ — ✅ Agent activity indicator, Cmd+click links, rich text copy, smart line breaks, PDF/HTML export, theme persistence
- ~~v1.4~~ — ✅ Slides: Markdown as Database, HTML template rendering
- ~~v1.5~~ — ✅ Export Slides: single-file HTML with inlined images
- **Current Version** — 🆕 Renderer Plugin System: Math equation rendering + Mermaid diagram rendering
- **Future Plans** — More renderer plugins (syntax highlighting, enhanced flowcharts, etc.), bidirectional sync, multi-file watching

---

*Extended from [marswaveai/ColaMD](https://github.com/marswaveai/colamd), built for the agent-native future.*
