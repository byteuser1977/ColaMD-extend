# Tasks

- [x] Task 1: 迁移 themes 目录到 editor/plugins 下
  - [x] 将 `src/renderer/themes/` 完整移动到 `src/renderer/editor/plugins/themes/`
  - [x] 更新 `src/renderer/main.ts` 中的 import 路径：`./themes/theme-manager` → `./editor/plugins/themes/theme-manager`
  - [x] 更新 `src/renderer/main.ts` 中的 CSS import：`./themes/base.css` → `./editor/plugins/themes/base.css`

- [x] Task 2: 重构 theme-manager.ts — 模版引用 + CSS 缓存 + Bug 修复
  - [x] 新增 `parseTemplateDirective(css: string): string | null` 函数，解析 `/* @template: <name> */`
  - [x] 新增自定义 CSS 缓存（`customThemeCache: Map<string, { css: string; template: string | null }>`）
  - [x] 导出 `setCachedCustomTheme(name, css)` 用于导入时缓存
  - [x] 导出 `getCachedCustomTheme(name)` 用于查询已缓存的主题
  - [x] 修改 `applyTheme(name, customCSS?)`：当 `name` 以 `custom:` 开头时从缓存恢复 CSS，并根据模版引用叠加模版 class

- [x] Task 3: 优化 mermaid-plugin-custom.css — 精简与 variables.css 去重
  - [x] 移除与 `themes/components/mermaid/variables.css` 重复的基础选择器（节点/连线/标签/聚类等）
  - [x] 保留 custom 主题特有的差异化样式（person-man 强制白色、文字偏移等）
  - [x] 文件从 432 行精简至 46 行

- [x] Task 4: 优化 mermaid-plugin.ts — custom 主题变量读取对齐
  - [x] 更新 `getCustomMermaidThemeVariables()` 中的变量名（8处对齐）
  - [x] 更新 `getCustomMermaidC4Config()` 中的变量名（20处对齐）
  - [x] `getMermaidTheme()` 中 custom 的 dark mode 判断已从 `--mermaid-dark-mode` CSS 变量读取（无需修改，已正确实现）

- [x] Task 5: 更新 main.ts — import 路径 + 调用来适配新 API
  - [x] 导入 `setCachedCustomTheme` 函数
  - [x] 修改 `onMenuImportTheme` 回调：先 `setCachedCustomTheme` 再 `applyTheme`
  - [x] 修改移动端菜单 `import-theme` 回调，同上
  - [x] 修改应用重启恢复逻辑：先 `setCachedCustomTheme` 再 `applyTheme`

- [x] Task 6: 验证
  - [x] TypeScript renderer 编译无本次修改引入的新错误
  - [x] 14 项 checklist 全部通过

# Task Dependencies
- Task 2 依赖 Task 1（迁移后路径才正确）
- Task 3 依赖 Task 1（CSS 文件引用 themes 目录）
- Task 4 可与 Task 3 并行
- Task 5 依赖 Task 1 和 Task 2
- Task 6 依赖 Task 1-5 全部完成