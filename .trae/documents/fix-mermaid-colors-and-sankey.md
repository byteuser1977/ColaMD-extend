# Mermaid 配色修复 & Sankey 语法修复计划

## 根因分析

| 问题 | 根因 |
|------|------|
| 2.4 状态图配色未跟随 | `getMermaidTheme()` 对自定义主题返回 `'default'`，Mermaid 使用自带的蓝色调色板，`themeVariables` 中的自定义颜色被部分覆盖 |
| 2.7 饼图配色未跟随 | 同上，`'default'` 主题的 cScale 颜色优先级高于 `themeVariables` 中传入的自定义 cScale |
| 2.12 四象限图配色未跟随 | 同上，`'default'` 主题对 quadrant chart 使用自带的颜色方案 |
| 2.13 XY Chart 字偏高 | CSS 中 `.titleText` 和 `.label text` 等选择器统一设置了 `translateY(-3px)`，对 XY Chart 的轴标签和标题来说偏移过大 |
| 2.15 Sankey 渲染报错 | Mermaid sankey-beta 解析器不支持 CSV 风格的双引号字段格式（`"ColaMD","Math Plugin",35`），解析时把引号当作转义文本导致语法错误 |

## 修复方案

### 1. `mermaid-plugin.ts` — 将自定义主题的 Mermaid theme 从 `'default'` 改为 `'base'`

**文件**: `src/renderer/editor/plugins/mermaid-plugin.ts`
**函数**: `getMermaidTheme()`

**改动**: 当检测到 `theme-custom` 且非 dark 模式时，返回 `'base'` 而非 `'default'`。

**原因**: 
- `'default'` 主题自带 Mermaid 官方的蓝绿色调色板，会在渲染时覆盖 `themeVariables` 中的自定义颜色
- `'base'` 主题完全由 `themeVariables` 控制颜色，不引入 Mermaid 自带的颜色方案
- `'base'` 主题的 SVG 输出使用 CSS 变量（如 `var(--primary-color)`），我们的 `mermaid-plugin-custom.css` 中 `!important` 规则会正确覆盖

### 2. `mermaid-plugin-custom.css` — 调整 XY Chart 文本垂直偏移

**文件**: `src/renderer/editor/plugins/mermaid-plugin-custom.css`

**改动**: 将全局的 `translateY(-3px)` 缩减为更温和的偏移量，并对 XY Chart 的轴标签单独设置偏移：
- `.titleText` 的 `translateY` 从 `-3px` 减为 `-1px`（标题不需要大幅偏移）
- `.xychart .axis text` 设为 `translateY(0)`（轴标签不应偏移）

### 3. `demo.md` — 修复 2.15 Sankey 语法

**文件**: `demo.md`

**改动**: 将 sankey-beta 数据从双引号 CSV 格式改为无引号格式：
- `"Math Plugin"` → `Math-Plugin`（空格替换为连字符）
- `"Mermaid Plugin"` → `Mermaid-Plugin`
- 移除所有双引号包裹

**原因**: 当前 Mermaid 版本的 sankey-beta 解析器不支持带引号的 CSV 字段。

## 影响范围

- 仅影响使用 `theme-custom` 类的自定义主题的 Mermaid 渲染
- 内置主题（dark、elegant、newsprint、default）不受影响
- 其他 Mermaid 图表类型（时序图、流程图、甘特图等）的配色也会因为 `theme: 'base'` 而更准确地反映自定义主题变量