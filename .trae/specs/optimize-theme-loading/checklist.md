# Checklist

- [x] themes 目录已从 `src/renderer/themes/` 迁移到 `src/renderer/editor/plugins/themes/`
- [x] main.ts 中 `./themes/theme-manager` import 路径已更新为 `./editor/plugins/themes/theme-manager`
- [x] main.ts 中 `./themes/base.css` import 路径已更新为 `./editor/plugins/themes/base.css`
- [x] `parseTemplateDirective()` 可正确解析 `/* @template: light */` 注释
- [x] `setCachedCustomTheme()` 在导入自定义主题时正确缓存 CSS 内容和模版引用
- [x] `customThemeCache` 维护已导入的自定义主题数据
- [x] `applyTheme('custom:name')` 从缓存恢复 CSS 并正确应用（含模版变量层叠）
- [x] 自定义 → 预制 → 自定义 切换后样式完全恢复，无残留污染
- [x] 应用重启后通过 `setCachedCustomTheme` + `applyTheme` 恢复已保存的自定义主题
- [x] mermaid-plugin-custom.css 已移除与 variables.css 重复的基础选择器（从432行精简至46行）
- [x] mermaid-plugin-custom.css 变量命名与 `--mermaid-node-stroke` 等 foundation.css 体系对齐
- [x] mermaid-plugin.ts 中 `getCustomMermaidThemeVariables()` 变量名对齐（8处）
- [x] mermaid-plugin.ts 中 `getCustomMermaidC4Config()` 变量名对齐（20处）
- [x] mermaid-plugin.ts 中 custom 的 dark mode 从 `--mermaid-dark-mode` CSS 变量读取
- [x] 导入引用模版的自定义主题，模版 class 与 theme-custom class 同时生效
- [x] 导入不引用模版的自定义主题，行为与当前一致（向后兼容）
- [x] 所有内建主题无需修改，功能不变
- [x] TypeScript 编译无本次修改引入的新错误