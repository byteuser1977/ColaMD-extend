# 优化外部主题载入设定 Spec

## Why
当前外部导入主题存在两个问题：
1. **复杂度高**：用户需要编写完整的 CSS 文件（包含大量选择器和变量定义），没有模版继承机制
2. **Bug**：自定义主题 → 预制主题 → 自定义主题 的切换过程中，自定义 CSS 样式丢失，导致预制主题的样式残留污染

项目已有完整的 CSS 变量抽象体系（`themes/foundation.css` + `themes/base/*.css` + `themes/components/mermaid/*.css`），外部主题应能通过引用基础模版 + 少量变量覆写的方式完成定义，大幅降低配置代码量。

## What Changes
- 将 `src/renderer/themes/` 目录迁移到 `src/renderer/editor/plugins/themes/` 下
- `theme-manager.ts`：新增模版引用机制，支持解析 `/* @template: light */` 指令；新增自定义 CSS 持久化缓存，修复切回自定义主题时样式丢失的 Bug
- `mermaid-plugin-custom.css`：精简优化，利用 CSS 变量体系减少冗余选择器
- `mermaid-plugin.ts`：优化 custom 主题路径的变量读取逻辑，适配模版引用机制
- `main.ts`：更新 import 路径；修复 `applyThemeChange` 不传 customCSS 的 Bug

## Impact
- Affected specs: 主题系统
- Affected code:
  - `src/renderer/themes/` → `src/renderer/editor/plugins/themes/` （目录迁移）
  - `src/renderer/themes/theme-manager.ts` → 新增模版引用 + CSS 缓存
  - `src/renderer/editor/plugins/mermaid-plugin-custom.css` （精简）
  - `src/renderer/editor/plugins/mermaid-plugin.ts` （优化 custom 主题路径）
  - `src/renderer/main.ts` （import 路径 + Bug 修复）

## ADDED Requirements

### Requirement: 外部主题模版引用机制
The system SHALL 支持外部导入的 CSS 文件通过 `/* @template: <name> */` 注释声明所引用的基础模版。 
对于没有标注引用的以 light 模版作为引入基础。

支持的模版名称：`light`、`dark`、`elegant`、`newsprint`。

当外部主题声明了模版引用，系统应先加载模版的 CSS 变量（来自 `themes/base/<name>.css` 和 `themes/components/mermaid/<name>.css`），再将导入的 CSS 作为覆写层叠加。导入的 CSS 只需定义与模版有差异的变量。

对现有已经定义的复杂定义的主题模版要做到向下兼容。

#### Scenario: 引用 light 模版
- **WHEN** 用户导入以下 CSS：
  ```css
  /* @template: light */
  :root {
    --color-link: #ff6600;
    --color-accent: #ff6600;
    --mermaid-node-stroke: #ff6600;
    --mermaid-highlight: #ff6600;
  }
  ```
- **THEN** 系统先加载 `themes/base/light.css` 的变量，再叠加以上覆写
- **THEN** 主样式使用 light 模版的字体/颜色/间距，仅链接色和强调色被覆写
- **THEN** Mermaid 图表使用 light 模版的 mermaid 变量作为基础，节点边框色被覆写为 `#ff6600`

#### Scenario: 不声明模版引用
- **WHEN** 用户导入的 CSS 不包含 `/* @template: */` 注释
- **THEN** 行为与当前一致：仅注入自定义 CSS，其他变量使用 `:root` / `foundation.css` 默认值

### Requirement: 自定义主题 CSS 持久化缓存
The system SHALL 在 `theme-manager.ts` 中缓存最后导入的自定义 CSS 内容和模版引用信息，确保任何时候切换回自定义主题都能正确恢复样式。

#### Scenario: 自定义 → 预制 → 自定义 切换
- **WHEN** 用户先导入自定义主题，再切换到 dark 主题，再切换回自定义主题
- **THEN** 自定义主题的 CSS 样式完全恢复，不残留 dark 主题的样式
- **THEN** Mermaid 图表以自定义主题配色正确渲染

#### Scenario: 应用重启后恢复
- **WHEN** 应用重启后加载保存的自定义主题（localStorage 中存有 `custom:<name>`）
- **THEN** 系统通过 API 重新加载该主题的 CSS 文件并恢复样式
- **THEN** 模版引用信息随主题一起持久化恢复

### Requirement: themes 目录迁移到 editor/plugins 下
The system SHALL 将 `src/renderer/themes/` 目录整体迁移到 `src/renderer/editor/plugins/themes/`，所有相关 import 路径同步更新。

#### Scenario: main.ts 引用路径
- **WHEN** main.ts 导入 theme-manager 和 base.css
- **THEN** import 路径从 `./themes/theme-manager` 更新为 `./editor/plugins/themes/theme-manager`
- **THEN** CSS import 路径从 `./themes/base.css` 更新为 `./editor/plugins/themes/base.css`

## MODIFIED Requirements

### Requirement: mermaid-plugin-custom.css 精简
**Before**: 包含大量与 `themes/components/mermaid/variables.css` 功能重叠的选择器（节点样式、连线样式、标签样式等），使用旧的变量命名（`--mermaid-node-border` 而非 `--mermaid-node-stroke`）。
**After**: 
- 移除与 `variables.css` 重复的通用选择器（节点/连线/标签/聚类等基础样式）
- 仅保留 `custom` 主题特有的差异化样式（如 `person-man` 强制白色文字、`foreignObject` span 颜色等）
- 变量命名与 `foundation.css` 中的 `--mermaid-*` 体系对齐

### Requirement: mermaid-plugin.ts custom 主题变量读取优化
**Before**: `getCustomMermaidThemeVariables()` 和 `getCustomMermaidC4Config()` 使用旧的变量命名（`--mermaid-node-border`、`--mermaid-line-color` 等），fallback 链混乱。
**After**: 
- 变量名与 `foundation.css` 的 `--mermaid-*` 命名体系对齐
- fallback 逻辑清晰，优先读 `--mermaid-*` 专用变量，fallback 到通用 CSS 变量
- `getMermaidTheme()` 中 custom 主题的 dark mode 判断从 `--mermaid-dark-mode` CSS 变量读取

### Requirement: theme-manager.ts applyTheme 函数
**Before**: `applyTheme(name, customCSS?)` 仅注入传入的 `customCSS`，不维护缓存；切回自定义主题时无 CSS 可注入。
**After**:
- 内部缓存自定义 CSS 内容和模版引用
- `applyTheme` 在检测到 `custom:` 前缀时自动应用缓存（含模版变量层叠）
- 导出 `setCachedCustomTheme(name, css)` 供外部在导入时调用
- 导出 `getCachedCustomTheme(name)` 支持查询已缓存的主题

## REMOVED Requirements
无。所有现有功能保持不变，仅做增强和修复。