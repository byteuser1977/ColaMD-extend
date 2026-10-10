# 扩展主题：Mermaid 图表配色契约

导入主题是一份纯 CSS 文件。但图表不是 CSS 画出来的——mermaid 在隐藏 iframe
沙箱里渲染，你的选择器管不到它。主题想把配色带进图表，唯一的通道是下面这组
CSS 变量：渲染那一刻由 mermaid-bridge 从 `document.body` 的计算样式读出，
传进沙箱并进 mermaid 的 `themeVariables`（mermaid 主题同时切到 `base`）。

## 变量一览

| CSS 变量 | mermaid themeVariables | 画的是什么 |
| --- | --- | --- |
| `--mermaid-primary-color` | `primaryColor` | 节点填充 |
| `--mermaid-primary-text` | `primaryTextColor` | 节点文字 |
| `--mermaid-primary-border` | `primaryBorderColor` | 节点描边 |
| `--mermaid-line-color` | `lineColor` | 连线与箭头 |
| `--mermaid-text-color` | `textColor` | 其余文字（标签、循环等） |
| `--mermaid-secondary-color` | `secondaryColor` | 次级节点填充 |
| `--mermaid-tertiary-color` | `tertiaryColor` | 三级节点填充 |
| `--mermaid-cluster-bg` | `clusterBkg` | subgraph 底色 |
| `--mermaid-cluster-border` | `clusterBorder` | subgraph 描边 |

## 规则

- **声明在 `:root` 上。** 读取用的是 body 的计算样式，`:root` 能继承到；
  写在别的选择器里读不到，等于没写。
- **任一变量有值，整组接管。** mermaid 随即切到 `base` 主题，没声明的槽位落
  `base` 的默认色，很容易和你的配色打架——**九个变量建议一次写齐**。
- **一个都没声明，走老路。** 按代码块背景（`--code-block-bg`）的明暗选内置
  default/dark 调色板。内置主题不定义这些变量，行为不变。
- **配色贴着代码块背景调。** 图表画在代码块背景上，不是页面背景上：
  深色代码块就配深色图表底、浅色连线（本目录各主题的 Mermaid 段落注释就是范例，
  抄一段改色值即可）。
- **调色板在渲染那一刻读取。** 切主题后图表会自动原地重画，不需要刷新。
- **生效范围是屏幕渲染**（编辑器与沿用屏幕画面的导出）。单图导出（图表另存
  PNG/SVG）画在固定白底上，用内置 default 调色板，不读主题变量。

颜色值用任何 CSS 认的写法（hex、rgb 均可）。
