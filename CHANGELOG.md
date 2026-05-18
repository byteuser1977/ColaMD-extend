# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.5.1]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.1
[1.5.0]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.0
[1.4.0]: https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.4.0
