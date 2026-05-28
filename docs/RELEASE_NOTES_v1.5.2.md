# Release v1.5.2

**Release Date**: 2026-05-28
**Tag**: `v1.5.2`
**Previous Version**: [v1.5.1](https://github.com/byteuser1977/ColaMD-extend/releases/tag/v1.5.1)

---

## 🎉 Release Highlights

### 🌐 Complete Internationalization (i18n) System
Introducing **full multi-language support** with automatic detection and dynamic switching:

- **English & Chinese (Simplified)** — Built-in language packs with auto-detection
- **Desktop Menu Localization** — All Electron menus fully localized
- **Mobile Menu Localization** — Complete Capacitor sidebar with language switcher
- **Dynamic Switching** — Change language anytime without restart; UI updates instantly
- **Cross-process Sync** — IPC bridge ensures menu and UI stay in sync

### 🔧 Enhanced PDF Export Pipeline
Continued improvements from beta testing:

- **Auto Theme Style Extraction** — Automatically extracts and injects current theme styles
- **Custom Print Style Support** — Advanced CSS injection for specialized export needs
- **Unified Plugin Style Management** — Math & Mermaid plugins self-manage export styles
- **Smart Error Recovery** — Dynamic plugin skipping during export failures

### 🎨 Rendering Optimizations
- **Optimized HTML Structure** — Better compatibility with external tools
- **Conditional Base Styles** — Improved performance when using custom themes
- **Fixed Custom Theme Export** — Resolved Chromium CSSOM serialization issues

### 📱 Mobile Platform Fixes
- **Fixed Media Query** — Corrected responsive behavior on mobile devices

---

## ✨ New Features

### Internationalization (i18n) System

#### Core Architecture
- **Multi-language Engine** ([`src/renderer/i18n/index.ts`](src/renderer/i18n/index.ts))
  - English (`en`) and Simplified Chinese (`zh-CN`) support
  - Auto-detect system locale at startup
  - `localStorage` persistence for user preference
  - Dynamic locale switching with real-time UI refresh

#### Desktop Integration
- **Electron Menu Localization** ([`src/main/index.ts`](src/main/index.ts))
  - All menus: File, Edit, View, Theme, Help
  - Sub-menus: Undo/Redo/Cut/Copy/Paste/SelectAll, Zoom/Fullscreen
  - IPC channel `set-locale` for renderer → main process sync
  - Custom theme names preserved (no forced translation)

#### Mobile Integration
- **Capacitor Sidebar Localization** ([`src/renderer/main.ts`](src/renderer/main.ts), [`src/renderer/index.html`](src/renderer/index.html))
  - Complete sidebar menu with `updateMobileMenuI18n()` function
  - Language selector with one-click switching
  - Toast messages: Saved, Save failed, etc.
  - Theme/plugin lists auto-update on language change

#### Cross-Process Bridge
- **IPC Synchronization** ([`src/preload/index.ts`](src/preload/index.ts))
  - Exposed `setLocale()` in ElectronAPI interface
  - Main process rebuilds menus on locale change
  - Capacitor-compatible `setLocale()` for mobile

#### Supported Languages

| Code | Language | Auto-detection |
|------|----------|----------------|
| `en` | English | Default |
| `zh-CN` | Simplified Chinese | System locale contains `zh` |

---

## 🔧 Improvements

### PDF Export Pipeline (Continued from v1.5.1)

#### Auto Theme Style Extraction
- Automatically extracts current theme styles when exporting
- Injects theme CSS into exported HTML/PDF documents
- Ensures visual consistency between editor preview and exported files

#### Unified Plugin Style Management
- **Math Plugin** ([`math-plugin.ts`](../src/renderer/editor/plugins/math-plugin.ts)):
  - Added clipboard/export/rendering style configuration fields
  - Self-manages export styles through configuration object
- **Mermaid Plugin** ([`mermaid-plugin.ts`](../src/renderer/editor/plugins/mermaid-plugin.ts)):
  - Added unified style configuration fields
  - Dynamic retrieval from plugin configuration
  - No more hardcoded style handling

#### Enhanced Error Recovery
- Dynamic plugin skipping during export (instead of hard-coded exclusions)
- Graceful degradation when individual plugins fail
- Better error logging and user feedback

### Editor Core & Rendering
- Wrapped `getLiveHTML()` output in `<div id="write">` container for better structure
- Optimized rendering: only apply base element styles when not using custom themes
- Fixed custom theme print CSS extraction to avoid Chromium CSSOM serialization issues

### Mobile Platform
- ✅ Fixed missing `screen` type in media queries ([`mobile.css`](../src/renderer/mobile.css))

---

## 🗑️ Removed

- Removed outdated PDF font compensation document ([`docs/PDF_FONT_COMPENSATION.md`](docs/PDF_FONT_COMPENSATION.md))

---

## ⚠️ Important Notices

### 🚀 VSCode ColaView Extension
New companion VSCode extension available for seamless integration:

🔗 **[vscode_colaview](https://github.com/byteuser1977/vscode_colaview)**

**What is vscode_colaview?**
- VSCode extension to view and edit ColaMD-rendered Markdown files
- Real-time preview of math equations and Mermaid diagrams
- Seamless integration with your existing VSCode workflow
- Perfect complement to the ColaMD desktop application

**Why use it?**
- Preview ColaMD content without leaving VSCode
- Maintain consistency between ColaMD desktop and code editor
- Enhanced productivity for developers working with Markdown + rich content

### 📬 Contact & Support

Need help? Want to contribute? Have feedback?

📱 **Feishu (Lark) Contact**: Scan the QR code below to add the project maintainer:

![Feishu QR Code](https://raw.githubusercontent.com/byteuser1977/ColaMD-extend/main/docs/feishu-contact.png)

**Contact**: 比特大人 (Byte Chain)

---

## 📦 Installation & Upgrade

### From Source

```bash
# Clone the repository
git clone https://github.com/byteuser1977/ColaMD-extend.git
cd ColaMD-extend

# Checkout v1.5.2
git checkout v1.5.2

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

## 🔄 Migration Guide (from v1.5.1)

### For Desktop Users
No breaking changes. Simply update to v1.5.2:
- Your existing settings and themes are preserved
- New i18n features are automatically available after update
- Language auto-detects based on system locale; can be changed manually
- No configuration changes required

### For Mobile Users
If you were using v1.5.1:
- **Direct update** recommended (no need to uninstall)
- New features: Full i18n support, improved export pipeline, bug fixes
- Your data is preserved (stored in app sandbox)

### For Theme Developers
- Review the updated [`theme-paradigm.md`](theme-paradigm.md) document (v3.2)
- Use [`template.css`](../themes/template.css) as starting point
- Note the **px unit unification requirement** (no more pt/rem mixing)
- Consider submitting your theme to [ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes) repo

---

## 📊 Statistics

### Code Changes
- **Files Changed**: 30+
- **Lines Added**: ~1,800+
- **Lines Modified**: ~600+

### New Features
- Internationalization system: **Complete i18n architecture**
- Supported languages: **2** (English, Chinese Simplified)
- Localized components: **Desktop menus, Mobile sidebar, Toast messages**

### Test Coverage
- Bug Fixes: **10+**
- Platform Fixes: **Mobile media query**
- Documentation: **Updated**

### Supported Platforms
- ✅ macOS (Intel + Apple Silicon)
- ✅ Windows (x64)
- ✅ Linux (x64, ARM64)
- ✅ Android (ARM64, ARMv7)
- ✅ iOS (ARM64)

---

## 🙏 Acknowledgments

### Special Thanks To
- **Internationalization Community** — For i18n best practices and patterns
- **Mermaid.js Team** — For the excellent diagram rendering library
- **KaTeX Team** — For the fast math typesetting engine
- **Capacitor Team** — For enabling cross-platform mobile support
- **Milkdown Team** — For the WYSIWYG Markdown editor framework
- **ProseMirror Team** — For the robust rich text editing foundation
- **Electron Team** — For the cross-platform desktop framework
- **Vite Team** — For the blazing-fast build toolchain
- **Testing Community** — Beta testers who provided valuable feedback on v1.5.2-beta.0

---

## 📝 Changelog

For detailed change history, see [CHANGELOG.md](../CHANGELOG.md).

**Key changes since v1.5.1**:
- v1.5.2-beta.0: Initial i18n implementation, PDF export refactor, mobile fixes
- v1.5.2 (stable): Complete internationalization, production-ready, documentation updated

---

## 🔗 Links

- **Homepage**: [GitHub Repository](https://github.com/byteuser1977/ColaMD-extend)
- **Documentation**: [README.md](../README.md) | [README_CN.md](../README_CN.md)
- **Changelog**: [CHANGELOG.md](../CHANGELOG.md)
- **Theme Repository**: [ColaMD-themes](https://github.com/byteuser1977/ColaMD-themes)
- **VSCode Extension**: [vscode_colaview](https://github.com/byteuser1977/vscode_colaview) 🆕
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
- 📱 **Feishu Contact**: Scan QR code above to connect with the maintainer

---

**Thank you for using ColaMD! 🎉**

*Built with ❤️ by the ColaMD community*
