# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

---

## [1.5.1] - 2026-05-18

### Added

#### Capacitor 6 — Mobile Platform Support (Cross-Platform Extension)
- **Capacitor 6 integration** for building native Android (.apk) and iOS (.ipa) apps
- **Platform bridge layer** ([`capacitor-api.ts`](src/renderer/capacitor-api.ts)): Full replacement of Electron IPC with Capacitor native plugins
  - Filesystem plugin for file read/write on mobile devices
  - Share plugin for content sharing and export
  - App plugin for lifecycle management and deep linking
  - Status bar plugin for mobile UI integration
  - Haptics plugin for tactile feedback support
- **Auto-detection runtime**: `window.electronAPI || createCapacitorAPI()` — seamless switching between desktop (Electron) and mobile (Capacitor) environments
- **Mobile responsive UI** ([`mobile.css`](src/renderer/mobile.css)):
  - Touch-optimized interactions with `-webkit-tap-highlight-color: transparent`
  - Safe area insets support (`env(safe-area-inset-*)`) for notched devices
  - Responsive breakpoints: 768px (tablet), 480px (phone)
  - Optimized font sizes, padding, and scroll behavior for mobile screens
  - Context menu adaptation for touch interfaces

#### Android Platform Configuration
- Android project initialized at [`android/`](android/) with Gradle build system
- **File association**: Registered `.md` / `.markdown` file handlers in `AndroidManifest.xml`
- **Storage permissions**: `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `MANAGE_EXTERNAL_STORAGE`
- **Network security config**: Cleartext traffic allowed for local development
- **Soft input mode**: `adjustResize` for proper keyboard handling in editor
- **5 Capacitor plugins auto-detected**: @capacitor/app, filesystem, haptics, share, status-bar

#### iOS Platform Configuration
- Xcode project initialized at [`ios/`](ios/) with CocoaPods dependency management
- Requires Xcode + CocoaPods for full build (pod install)
- Web assets synced to `ios/App/App/public/`

#### Build Scripts & Workflow
- New npm scripts for Capacitor development workflow:

| Script | Purpose |
|--------|---------|
| `npm run cap:sync` | Sync web assets to native platforms |
| `npm run cap:open:android` | Open in Android Studio |
| `npm run cap:open:ios` | Open in Xcode |
| `npm run cap:run:android` | Build → Sync → Run on Android device/emulator |
| `npm run cap:run:ios` | Build → Sync → Run on iOS simulator |
| `npm run cap:build:android` | Build debug APK |
| `npm run cap:build:ios` | Build iOS project |

#### Dual-Platform Architecture
```
┌─────────────────────────────────────┐
│         src/renderer/main.ts         │
│   api = electronAPI || capacitorAPI  │ ← Auto-detect platform
├──────────────┬──────────────────────┤
│  Electron    │     Capacitor 6      │
│  (Desktop)   │     (Mobile)          │
│              │                      │
│ IPC comm     │ Filesystem Plugin    │
│ dialog       │ Share Plugin         │
│ shell.open   │ App Plugin           │
│ fs module    │ localStorage storage │
└──────────────┴──────────────────────┘
```

### Changed
- Updated [`editor.ts`](src/renderer/editor/editor.ts): Added fallback `window.capacitorAPI?.openExternal()` for link handling on mobile
- Updated [`env.d.ts`](src/renderer/env.d.ts): Extended type declarations to include `window.capacitorAPI`
- Package version bumped to **1.5.1**

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @capacitor/core | ^6.2.1 | Capacitor core runtime |
| @capacitor/cli | ^6.2.1 | Capacitor CLI tools |
| @capacitor/android | ^6.2.1 | Android native bridge |
| @capacitor/ios | ^6.2.1 | iOS native bridge |
| @capacitor/filesystem | ^6.0.4 | Mobile file I/O |
| @capacitor/share | ^6.0.4 | Native sharing |
| @capacitor/app | ^6.0.3 | App lifecycle |
| @capacitor/haptics | ^6.0.3 | Tactile feedback |
| @capacitor/status-bar | ^6.0.3 | Status bar control |

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
