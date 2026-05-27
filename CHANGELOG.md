# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Internationalization (i18n) System
- **Complete i18n architecture** ([`src/renderer/i18n/index.ts`](src/renderer/i18n/index.ts), [`src/main/i18n.ts`](src/main/i18n.ts)):
  - Added multi-language support for English (`en`) and Simplified Chinese (`zh-CN`)
  - Auto-detect system language at startup (Electron `app.getLocale()` / browser `navigator.language`)
  - Language preference persistence via `localStorage`
  - Dynamic locale switching with real-time UI updates

#### Desktop Menu Internationalization
- **Electron menu i18n** ([`src/main/index.ts`](src/main/index.ts)):
  - All menu items now use `i18n.t()` for dynamic translation (File, Edit, View, Theme, Help menus)
  - Fixed `role`-based menu items to show localized labels by explicitly adding `label` property
  - Supported menus: File, Edit (Undo/Redo/Cut/Copy/Paste/SelectAll), View (Zoom/Fullscreen), Theme, Help
  - Custom theme names remain unchanged (no internationalization)
  - IPC channel `set-locale` added for runtime menu language synchronization from renderer process

#### Mobile Menu Internationalization
- **Capacitor mobile menu i18n** ([`src/renderer/main.ts`](src/renderer/main.ts), [`src/renderer/index.html`](src/renderer/index.html)):
  - Complete sidebar menu localization with `updateMobileMenuI18n()` function
  - Added Language selector section with one-click switching between English and Chinese
  - Toast messages localized (Saved, Save failed, etc.)
  - Theme list and plugin list dynamically updated on language change
  - Language change listener triggers full UI refresh without page reload

#### IPC Bridge for Locale Sync
- **Cross-process locale synchronization** ([`src/preload/index.ts`](src/preload/index.ts)):
  - Exposed `setLocale()` API in ElectronAPI interface
  - Main process handler rebuilds menu when locale changes
  - Capacitor bridge includes compatible `setLocale()` method for mobile platform

### Changed

#### PDF Export & Plugin System
- **Refactored PDF export pipeline** ([`src/renderer/main.ts`](src/renderer/main.ts), [`src/main/index.ts`](src/main/index.ts)):
  - Support for custom print styles with simplified base print CSS
  - Refactored `buildExportHTML` function to auto-extract current theme styles
  - Added auto-injection of custom theme print styles
  - Streamlined export HTML template, removed hardcoded plugin styles in favor of plugin-injected styles

#### Plugin Style Management
- **Unified plugin style management** ([`src/renderer/editor/plugins/index.ts`](src/renderer/editor/plugins/index.ts), [`src/renderer/editor/plugins/math-plugin.ts`](src/renderer/editor/plugins/math-plugin.ts), [`src/renderer/editor/plugins/mermaid-plugin.ts`](src/renderer/editor/plugins/mermaid-plugin.ts)):
  - Added unified configuration fields (clipboard styles, export styles) for Math and Mermaid plugins
  - Replaced hardcoded style handling logic with dynamic retrieval from plugin configuration
  - Optimized error recovery logic to dynamically skip failing plugins instead of hard-excluding math plugin

#### Theme System
- **Fixed custom theme export issues** ([`src/renderer/editor/plugins/themes/theme-manager.ts`](src/renderer/editor/plugins/themes/theme-manager.ts)):
  - Fixed custom theme print CSS extraction logic to avoid Chromium CSSOM serialization issues
- **Rendering output optimization** ([`src/renderer/editor/editor.ts`](src/renderer/editor/editor.ts), [`src/renderer/main.ts`](src/renderer/main.ts)):
  - Wrapped `getLiveHTML` return content in a div with id "write"
  - Only render base element styles when not using custom themes

#### Mobile Platform
- **Fixed mobile media query** ([`src/renderer/mobile.css`](src/renderer/mobile.css)):
  - Fixed missing screen type in media queries

### Removed
- Removed outdated PDF font compensation document ([`docs/PDF_FONT_COMPENSATION.md`](docs/PDF_FONT_COMPENSATION.md))

---

## [1.5.1] - 2026-05-23

### Added

#### Themes
- **Academic Paper theme** ([`themes/academic-paper.css`](themes/academic-paper.css)) — Academic paper theme strictly following GB/T 7713 national standard specifications, including three-line tables, SimHei/SimSun typography, multi-level headings, figure/table caption standards
- **Swiss Design theme** ([`themes/swiss-design.css`](themes/swiss-design.css)) 🇨🇭 — Swiss International Typographic Style: black-white-red color system, geometric sans-serif fonts, grid-based layout, white-on-black table headers
- **Pixso Design theme** ([`themes/pixso-design.css`](themes/pixso-design.css)) — Pixso design specification theme
- **Forest Ink theme** ([`themes/forest-ink.css`](themes/forest-ink.css)) — Forest ink style theme
- **Standardized template** ([`themes/template.css`](themes/template.css)) — Reference implementation template following v3.0 paradigm: variable-based + modular + print fidelity

#### Theme Development Framework
- **Theme paradigm document** ([`docs/theme-paradigm.md`](docs/theme-paradigm.md)) — Complete CSS theme development specification (v3.2):
  - Design principles: variable-driven, modular, semantic naming, AI-agent derivable
  - Design specifications: 30+ verifiable rules (MUST / MUST NOT / SHOULD) including WCAG contrast formula
  - Print fidelity specifications: variable re-declaration, required element coverage list (12 categories), Chromium print constraints
  - px unit unification standard (9.x): prohibits pt/rem mixing to ensure consistent PDF export font sizes

#### Platform Support
- **Android platform**: Capacitor 6 integration, native APK build, file picker, mobile-adapted styles ([`mobile.css`](src/renderer/mobile.css))
- **iOS platform**: Capacitor 6 integration, native IPA build
- **Dual-platform bridge**: Runtime auto-detection of Electron/Capacitor API (`capacitor-api.ts`)

#### Documentation & Demo
- **Academic paper demo document** ([`docs/academic-demo.md`](docs/academic-demo.md)) — Wanhua ecosystem research report with 8 Mermaid diagram groups
- **Inline SVG guide** ([`docs/demo.html`](docs/demo.html)) — Best practices demonstration for embedding SVG in Markdown
- **General demo document** ([`docs/demo.md`](docs/demo.md)) — Full feature showcase

### Changed

#### Theme System Architecture
- **Modular refactoring**: Theme system split into `foundation.css` + `base/` built-in themes + `components/mermaid/` Mermaid variable mapping + user theme directory
- **Mermaid variable system**: 20 core CSS variables (`--mermaid-*`) auto-mapped to 22 chart type SVG selectors
- **Academic paper theme refactoring**: Section 14 hardcoded color values all refactored to `var()` variable references; all `pt` units replaced with `px` even integers

#### PDF Export & Plugin System (Post-release)
- **Refactored PDF export pipeline** ([`src/renderer/main.ts`](src/renderer/main.ts), [`src/main/index.ts`](src/main/index.ts)):
  - Support for custom print styles with simplified base print CSS
  - Refactored `buildExportHTML` function to auto-extract current theme styles and inject into export HTML
  - Streamlined export HTML template, removed hardcoded plugin styles in favor of plugin-injected styles
- **Unified plugin style management** ([`src/renderer/editor/plugins/index.ts`](src/renderer/editor/plugins/index.ts), [`src/renderer/editor/plugins/math-plugin.ts`](src/renderer/editor/plugins/math-plugin.ts), [`src/renderer/editor/plugins/mermaid-plugin.ts`](src/renderer/editor/plugins/mermaid-plugin.ts)):
  - Added unified configuration fields (clipboard styles, export styles) for Math and Mermaid plugins
  - Replaced hardcoded style handling logic with dynamic retrieval from plugin configuration
  - Optimized error recovery logic to dynamically skip failing plugins instead of hard-excluding math plugin

#### Editor Core & Rendering
- Removed debug auto-open developer tools code
- Optimized academic paper theme styles
- **Rendering output optimization** ([`src/renderer/editor/editor.ts`](src/renderer/editor/editor.ts), [`src/renderer/main.ts`](src/renderer/main.ts)):
  - Wrapped `getLiveHTML` return content in a div with id "write"
  - Only render base element styles when not using custom themes

### Fixed

#### TypeScript Type System (beta.2)
- **Fixed 15 TypeScript type errors**:
  - [`capacitor-api.ts`](src/renderer/capacitor-api.ts): Fixed `string | null` type assignment error
  - [`editor.ts`](src/renderer/editor/editor.ts): Fixed `remarkPluginsCtx` type mismatch and `rootEl` null check
  - [`math-plugin.ts`](src/renderer/editor/plugins/math-plugin.ts): Fixed `$NodeSchema` type compatibility with `$view` function
  - [`mermaid-plugin.ts`](src/renderer/editor/plugins/mermaid-plugin.ts): Fixed Mermaid theme type and `$NodeSchema` type issues
  - [`main.ts`](src/renderer/main.ts): Added Vite client types reference for `import.meta.glob`
  - [`main/index.ts`](src/main/index.ts): Removed invalid `fs.createServer` import and `PrintToPDFOptions.marginType`
- **TypeScript project configuration update**: Added `"composite": true` to all project configurations for proper project references
  - [`tsconfig.main.json`](tsconfig.main.json)
  - [`tsconfig.preload.json`](tsconfig.preload.json)
  - [`tsconfig.renderer.json`](tsconfig.renderer.json)

#### Mermaid Diagram Rendering
- **Fixed text offset and border issues** (elegant + academic-paper themes):
  - Fixed Mermaid text offset problem
  - Fixed variable name mismatch issue
  - Fixed double border display issue
- **Mermaid theme system refactoring**:
  - Adjusted to Guizang warm color palette (cream background + brown tones)
  - Font size adjusted to 10.5pt for academic printing compatibility
  - Added Typora compatible selectors (`.md-diagram-panel`)
  - Added mobile responsive adaptation
  - Unified text color and border styles

#### Theme Print Fidelity
- **Fixed missing print style mirrors**: Completed `@media print` screen attribute mirrors for template CSS and Swiss Design CSS
  - Covered attributes include: font size, line height, font family, borders, spacing, letter spacing, etc.
  - Ensured consistency between screen preview and PDF export
- **Fixed custom theme export issues** ([`theme-manager.ts`](src/renderer/editor/plugins/themes/theme-manager.ts)):
  - Fixed custom theme print CSS extraction logic to avoid Chromium CSSOM serialization issues
  - Added auto-injection of custom theme print styles

#### Android Platform (beta.1)
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
  - Fixed pagination, save button, Mermaid version, and layer residue issues

#### Export Functionality Improvements
- **PDF/HTML export optimization**:
  - Refactored Mermaid rendering logic with export sync wait mechanism
  - Supported real-time rendered content export
  - Fixed default filename logic
- **File manager open mechanism**:
  - Adopted pull model: JS actively calls Java `checkPendingFile()` to query
  - Eliminated JS event injection timing issues
  - Added init detection + setInterval polling for dual guarantee

#### Mobile Adaptation
- **Fixed missing media query type** ([`mobile.css`](src/renderer/mobile.css)):
  - Fixed missing screen type in media queries

#### Plugin System
- **Plugin import fixes and package version updates**
- **Decoupled plugin system**: Reduced main.ts dependency on specific plugins

### Removed
- Removed outdated PDF font compensation document ([`docs/PDF_FONT_COMPENSATION.md`](docs/PDF_FONT_COMPENSATION.md))

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