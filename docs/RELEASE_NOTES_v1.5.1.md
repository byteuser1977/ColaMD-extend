# Release v1.5.1

**Release Date**: 2026-05-23  
**Tag**: `v1.5.1`  
**Previous Version**: [v1.5.0](https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.0)

---

## 🎉 Release Highlights

### 🎨 Enhanced Theme System
Introducing **5 new themes** and a complete **theme development framework**:

- 📄 **Academic Paper Theme** — GB/T 7713 compliant academic paper formatting
- 🇨🇭 **Swiss Design Theme** — International Typographic Style with black-white-red color system
- 🎨 **Pixso Design Theme** — Modern design system styling
- 🌲 **Forest Ink Theme** — Warm paper base with forest green accents
- 📝 **Standardized Template** — Reference implementation for custom theme creation

### 📱 Mobile Platform Support
Full **Android (.apk) + iOS (.ipa)** support via Capacitor 6:
- Native file picker integration
- Chinese IME optimization
- PDF export with native PrintManager
- Mobile-adapted responsive UI

### 🔧 Refactored Export Pipeline
Completely rewritten PDF/HTML export system:
- Auto-extraction of current theme styles
- Plugin-injected export styles (no more hardcoded handling)
- Smart error recovery with dynamic plugin skipping
- Custom print style support for advanced use cases

---

## ✨ New Features

### Themes (5 New)

| Theme | File | Description |
|-------|------|-------------|
| Academic Paper | [`academic-paper.css`](../themes/academic-paper.css) | GB/T 7713 compliant, SimHei/SimSun typography, three-line tables, print-optimized Mermaid |
| Academic Paper (PT) | [`academic-paper-pt.css`](../themes/academic-paper-pt.css) | Same as above but using pt units for specific print scenarios |
| Swiss Design | [`swiss-design.css`](../themes/swiss-design.css) | Black-white-red color system, geometric sans-serif fonts, grid-based layout |
| Pixso Design | [`pixso-design.css`](../themes/pixso-design.css) | Modern design system style |
| Forest Ink | [`forest-ink.css`](../themes/forest-ink.css) | Warm paper base, forest green ink text and accents |
| Template | [`template.css`](../themes/template.css) | Standardized reference implementation following v3.0 paradigm |

### Theme Development Framework
- **Theme Paradigm Document** ([`theme-paradigm.md`](theme-paradigm.md)) — Complete CSS theme development specification (v3.2)
  - Design principles: variable-driven, modular, semantic naming, AI-agent derivable
  - 30+ verifiable rules (MUST / MUST NOT / SHOULD) with WCAG contrast formulas
  - Print fidelity specifications: variable re-declaration, 12-category element coverage list
  - px unit unification standard to ensure consistent PDF export font sizes

### Mobile Platform
- **Android Platform** ([`mobile.css`](../src/renderer/mobile.css))
  - Capacitor 6 integration for native APK builds
  - File picker via `@capawesome/capacitor-file-picker`
  - IME input method optimization for CJK languages
  - Native PDF export using Android PrintManager
- **iOS Platform**
  - Capacitor 6 integration for native IPA builds
  - Full iOS support with WebView/WKWebView
- **Dual-platform Bridge** ([`capacitor-api.ts`](../src/renderer/capacitor-api.ts))
  - Runtime auto-detection of Electron/Capacitor APIs
  - Seamless code sharing between desktop and mobile

### Documentation & Demo
- **Academic Paper Demo** ([`academic-demo.md`](academic-demo.md)) — Real-world academic paper with 8 Mermaid diagram groups
- **Inline SVG Guide** ([`demo.html`](demo.html)) — Best practices for SVG in Markdown
- **General Feature Demo** ([`demo.md`](demo.md)) — Complete feature showcase

---

## 🔧 Improvements

### PDF Export Pipeline (Major Refactor)

#### Auto Theme Style Extraction
- Automatically extracts current theme styles when exporting
- Injects theme CSS into exported HTML/PDF documents
- Ensures visual consistency between editor preview and exported files

#### Unified Plugin Style Management
- Math plugin ([`math-plugin.ts`](../src/renderer/editor/plugins/math-plugin.ts)): Added clipboard/export/rendering style configuration fields
- Mermaid plugin ([`mermaid-plugin.ts`](../src/renderer/editor/plugins/mermaid-plugin.ts)): Added unified style configuration
- Replaced all hardcoded style handling with dynamic retrieval from plugin configuration
- Plugins now self-manage their export styles through configuration objects

#### Enhanced Error Recovery
- Dynamic plugin skipping during export (instead of hard-coded exclusions)
- Graceful degradation when individual plugins fail
- Better error logging and user feedback

#### Custom Theme Export Fix
- Fixed Chromium CSSOM serialization issues for custom themes
- Proper extraction of `@media print` rules from custom theme CSS
- Auto-injection of custom theme print styles into export HTML

### Editor Core & Rendering
- Wrapped `getLiveHTML()` output in `<div id="write">` container for better structure
- Optimized rendering: only apply base element styles when not using custom themes
- Removed debug auto-open developer tools code from production build
- Optimized academic paper theme styles for better performance

### Theme System Architecture
- **Modular Refactoring**: Split into `foundation.css` + `base/` built-in themes + `components/mermaid/` variable mapping + user theme directory
- **Mermaid Variable System**: 20 core CSS variables (`--mermaid-*`) auto-mapped to 22 chart type SVG selectors
- **Academic Paper Theme Refactoring**: All hardcoded colors → `var()` variables; all `pt` units → `px` even integers

---

## 🐛 Bug Fixes

### TypeScript Type System (15 Errors Fixed)

| File | Issue | Fix |
|------|-------|-----|
| [`capacitor-api.ts`](../src/renderer/capacitor-api.ts) | `string \| null` type assignment error | Corrected type annotation |
| [`editor.ts`](../src/renderer/editor/editor.ts) | `remarkPluginsCtx` type mismatch | Fixed type compatibility |
| [`editor.ts`](../src/renderer/editor/editor.ts) | `rootEl` null check missing | Added null safety check |
| [`math-plugin.ts`](../src/renderer/editor/plugins/math-plugin.ts) | `$NodeSchema` type vs `$view` function | Resolved type conflict |
| [`mermaid-plugin.ts`](../src/renderer/editor/plugins/mermaid-plugin.ts) | Mermaid theme type issue | Fixed type definition |
| [`mermaid-plugin.ts`](../src/renderer/editor/plugins/mermaid-plugin.ts) | `$NodeSchema` type mismatch | Aligned type interfaces |
| [`main.ts`](../src/renderer/main.ts) | Missing Vite client types for `import.meta.glob` | Added type reference |
| [`main/index.ts`](src/main/index.ts) | Invalid `fs.createServer` import | Removed non-existent import |
| [`main/index.ts`](src/main/index.ts) | Invalid `PrintToPDFOptions.marginType` | Removed deprecated property |

**Project Configuration Updates**:
- Added `"composite": true` to [`tsconfig.main.json`](tsconfig.main.json), [`tsconfig.preload.json`](tsconfig.preload.json), [`tsconfig.renderer.json`](tsconfig.renderer.json) for proper project references

### Mermaid Diagram Rendering

**Fixed in elegant + academic-paper themes**:
- ✅ Text offset problem resolved
- ✅ Variable name mismatch corrected
- ✅ Double border display issue fixed

**Mermaid Theme System Improvements**:
- Adjusted to Guizang warm color palette (cream background + brown tones)
- Font size optimized to 10.5pt for academic printing
- Added Typora compatible selectors (`.md-diagram-panel`)
- Added mobile responsive adaptation
- Unified text color and border styles across all themes

### Theme Print Fidelity

**Critical Fix**: Completed `@media print` screen attribute mirrors for template and Swiss Design CSS:

Covered attributes:
- Font size (`font-size`)
- Line height (`line-height`)
- Font family (`font-family`)
- Borders (`border`, `border-*`)
- Spacing (`margin`, `padding`, `gap`)
- Letter spacing (`letter-spacing`)
- Word spacing (`word-spacing`)
- Text alignment (`text-align`)
- Background colors (`background`, `background-color`)
- And more...

**Result**: Screen preview now matches PDF export exactly.

**Custom Theme Export** ([`theme-manager.ts`](../src/renderer/editor/plugins/themes/theme-manager.ts)):
- Fixed CSS extraction logic to avoid Chromium CSSOM serialization issues
- Added automatic injection of custom theme print styles during export

### Android Platform Fixes

#### Chinese IME (Input Method Editor)
- ✅ Removed `e.preventDefault()` in `beforeinput` event
- ✅ Enhanced ProseMirror editor IME composition event handling
- ✅ Applied `-webkit-user-modify: read-write-plaintext-only` for better CJK input experience

#### Intent File Opening
- ✅ Added `Intent.ACTION_VIEW` handling in `MainActivity`
- ✅ Supported `onNewIntent` for opening new files while app is running
- ✅ Implemented JavaScript bridge to pass file content to WebView

#### PDF Export on Android
- ✅ Replaced Capacitor Plugin bridge with `JavascriptInterface`
- ✅ Created `ColaMDNativeBridge` class for native `PrintManager` calls
- ✅ Added "Save as PDF" option
- ✅ Fixed pagination issues
- ✅ Fixed save button functionality
- ✅ Updated Mermaid version for mobile compatibility
- ✅ Resolved layer residue problems

### Export Functionality Improvements

**PDF/HTML Export**:
- ✅ Refactored Mermaid rendering logic with export sync wait mechanism
- ✅ Supported real-time rendered content export (not just source code)
- ✅ Fixed default filename logic

**File Manager Open Mechanism**:
- ✅ Adopted pull model: JS actively calls Java `checkPendingFile()`
- ✅ Eliminated JS event injection timing issues
- ✅ Added init detection + setInterval polling dual guarantee

### Mobile Adaptation
- ✅ Fixed missing `screen` type in media queries ([`mobile.css`](../src/renderer/mobile.css))

### Plugin System
- ✅ Fixed plugin import errors
- ✅ Updated package versions
- ✅ Decoupled plugin system: reduced main.ts dependency on specific plugins

---

## ⚠️ Important Notices

### 🚚 Theme Migration to Dedicated Repository

Starting from **v1.5.1**, **theme updates and maintenance have been migrated** to a dedicated repository:

🔗 **[https://github.com/byteuser1977/ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes)**

**Why the migration?**
- ✅ Faster iteration and release cycles for theme-specific changes
- ✅ Community contributions and theme submissions welcome
- ✅ Independent versioning from core ColaMD application
- ✅ Focused issue tracking for theme-related problems

**What this means for you:**
- Themes included in **this release will remain available** for backward compatibility
- For the **latest versions and new themes**, check the dedicated repository
- Future theme enhancements will be released there first
- You can still use custom themes locally without any changes

---

## 📦 Installation & Upgrade

### From Source

```bash
# Clone the repository
git clone https://github.com/byteuser1977/ColaMD-extend.git
cd ColaMD-extend

# Checkout v1.5.1
git checkout v1.5.1

# Install dependencies
npm install

# Run development mode
npm run dev

# Build for production
npm run build
```

### Download Pre-built Binaries

Visit the [Releases](https://github.com/byteuser1977/ColaMD-extend/releases) page to download pre-built binaries for your platform:

- **macOS** (`.dmg`) — Intel + Apple Silicon
- **Windows** (`.exe`) — Installer + Portable
- **Linux** (`.AppImage`, `.deb`) — Universal + Debian/Ubuntu
- **Android** (`.apk`) — Via Capacitor 6
- **iOS** (`.ipa**) — Via Capacitor 6 (requires TestFlight/App Store distribution)

### Using Custom Themes

```bash
# Option 1: Place theme file manually
cp your-theme.css ~/.colamd/themes/

# Option 2: Import via ColaMD UI
# Open ColaMD → Theme → Import Theme → Select your .css file
```

Available themes can be downloaded from the [`themes/`](../themes/) directory or the dedicated [ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes) repository.

---

## 🔄 Migration Guide (from v1.5.0)

### For Desktop Users
No breaking changes. Simply update to v1.5.1:
- Your existing settings and themes are preserved
- New themes are automatically available after update
- No configuration changes required

### For Mobile Users
If you were using beta releases:
- **Uninstall** the old beta version first
- **Install** v1.5.1 stable release
- Your data is preserved (stored in app sandbox)
- New features: Better IME support, improved PDF export, smoother UI

### For Theme Developers
- Review the updated [`theme-paradigm.md`](theme-paradigm.md) document (v3.2)
- Use [`template.css`](../themes/template.css) as starting point
- Note the **px unit unification requirement** (no more pt/rem mixing)
- Consider submitting your theme to [ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes) repo

---

## 📊 Statistics

### Code Changes
- **Files Changed**: 50+
- **Lines Added**: ~2,500+
- **Lines Modified**: ~800+
- **Lines Removed**: ~400+

### Test Coverage
- TypeScript Type Errors Resolved: **15**
- Bug Fixes: **25+**
- New Features: **20+**
- Documentation Pages: **5**

### Supported Platforms
- ✅ macOS (Intel + Apple Silicon)
- ✅ Windows (x64)
- ✅ Linux (x64, ARM64)
- ✅ Android (ARM64, ARMv7)
- ✅ iOS (ARM64)

---

## 🙏 Acknowledgments

### Special Thanks To
- **Mermaid.js Team** — For the excellent diagram rendering library
- **KaTeX Team** — For the fast math typesetting engine
- **Capacitor Team** — For enabling cross-platform mobile support
- **Milkdown Team** — For the WYSIWYG Markdown editor framework
- **ProseMirror Team** — For the robust rich text editing foundation
- **Electron Team** — For the cross-platform desktop framework
- **Vite Team** — For the blazing-fast build toolchain
- **Testing Community** — Beta testers who provided valuable feedback on v1.5.1-beta.1 and v1.5.1-beta.2

---

## 📝 Changelog

For detailed change history, see [CHANGELOG.md](../CHANGELOG.md).

**Key changes since v1.5.0**:
- v1.5.1-beta.1: Initial mobile platform support, basic themes
- v1.5.1-beta.2: TypeScript fixes, Mermaid refactoring, enhanced themes
- v1.5.1 (stable): Complete documentation, PDF export refactor, production-ready

---

## 🔗 Links

- **Homepage**: [GitHub Repository](https://github.com/byteuser1977/ColaMD-extend)
- **Documentation**: [README.md](../README.md) | [README_CN.md](../README_CN.md)
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)
- **Theme Repository**: [ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes)
- **Issue Tracker**: [GitHub Issues](https://github.com/byteuser1977/ColaMD-extend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/byteuser1977/ColaMD-extend/discussions)

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 💬 Feedback & Support

Found a bug? Have a feature request? Want to contribute?

- 🐛 **Report Bugs**: [Open an Issue](https://github.com/byteuser1977/ColaMD-extend/issues/new?labels=bug)
- 💡 **Feature Requests**: [Open an Issue](https://github.com/byteuser1977/ColaMD-extend/issues/new?labels=enhancement)
- 📖 **Documentation Issues**: [Open an Issue](https://github.com/byteuser1977/ColaMD-extend/issues/new?labels=documentation)
- 💬 **Questions**: Start a [Discussion](https://github.com/byteuser1977/ColaMD-extend/discussions/new?category=q-a)
- 🔧 **Pull Contributions**: See [Contributing Guide](../CONTRIBUTING.md)

---

**Thank you for using ColaMD! 🎉**

*Built with ❤️ by the ColaMD community*
