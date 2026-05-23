# ColaMD Themes

Download any `.css` file and place it in `~/.colamd/themes/`, or use **Theme > Import Theme** in ColaMD to import directly.

## Available Themes

| Theme | Description |
|-------|-------------|
| [elegant.css](elegant.css) | Warm serif theme with terracotta accents and dark code blocks |
| [guizang.css](guizang.css) | 古雅沉稳的归藏风格，赭石强调色、松烟墨代码块、宣纸底色 |
| [forest-ink.css](forest-ink.css) | 森林墨主题，宣纸暖白底、松烟墨绿文字、森林绿强调色（灵感来自 wanhua-ppt Forest Ink 设计规范） |
| [academic-paper.css](academic-paper.css) | 📄 **学术论文主题（增强版）** — 符合 GB/T 7713 中文学术论文排版规范，黑体（SimHei）标题 + 宋体（SimSun）正文及首行缩进，三线表格式（顶线 + 表头底线 + 底线），10.5pt 字号，打印优化的 Mermaid 图表（直角容器、灰度配色），脚注与参考文献样式，Typora 兼容选择器。完整示例见 [`docs/academic-demo.md`](../docs/academic-demo.md) |
| [pixso-design.css](pixso-design.css) | 🎨 Pixso 设计主题，现代设计系统风格 |

## Creating Your Own Theme

ColaMD custom themes are plain CSS files. You can style the editor by targeting CSS custom properties or writing direct selectors.

When a custom theme is imported, ColaMD adds the `theme-custom` class to `<body>`. Use `body.theme-custom` selectors to ensure your styles override the defaults.

### CSS Variables

Define variables on `body.theme-custom` to override the base theme:

```css
body.theme-custom {
  --bg-color: #ffffff;
  --text-color: #24292f;
  --text-muted: #656d76;
  --border-color: #d0d7de;
  --link-color: #0969da;
  --code-bg: rgba(0,0,0,0.05);
  --code-block-bg: #f6f8fa;
  --code-block-text: #24292f;
  --blockquote-border: #d0d7de;
  --blockquote-bg: transparent;
  --table-header-bg: #f6f8fa;
  --selection-bg: rgba(0,0,0,0.1);
}
```

### Direct Selectors

For more control, target elements directly using `body.theme-custom` prefix:

```css
body.theme-custom #editor .ProseMirror { font-family: Georgia, serif; }
body.theme-custom #editor .ProseMirror strong { color: #c44b2b; }
body.theme-custom #editor .ProseMirror pre { background: #2c2c2c; color: #e0dcd7; }
```

### Extended Features Styling

ColaMD supports advanced content like **Mermaid diagrams** and **Math formulas**. A well-designed theme should include styles for these elements to ensure visual consistency.

#### Mermaid Diagrams

ColaMD's Mermaid plugin reads CSS variables from `body.theme-custom` to configure diagram rendering. Define `--mermaid-*` variables alongside your base theme variables for full Mermaid integration:

```css
body.theme-custom {
    /* Base theme variables */
    --bg-color: #f5f0e8;
    --text-color: #2b2520;
    --border-color: #d4cfc6;

    /* ── Mermaid Font ── */
    --mermaid-font-family: "LXGW WenKai", Georgia, serif;
    --mermaid-font-size: 12px;          /* Controls Mermaid fontSize (default: 12) */

    /* ── Mermaid Rendering Variables (read by the plugin JS) ── */
    --mermaid-background: #f0ebe3;
    --mermaid-primary-color: #ede8df;
    --mermaid-primary-border-color: #b0a89f;
    --mermaid-primary-text-color: #2b2520;
    --mermaid-secondary-color: #e8e0d4;
    --mermaid-secondary-border-color: #c4bbb0;
    --mermaid-line-color: #8a7b6a;
    --mermaid-text-color: #2b2520;
    --mermaid-main-bkg: #ede8df;
    --mermaid-second-bkg: #e8e0d4;
    --mermaid-label-background: #f0ebe3;
    --mermaid-label-text-color: #2b2520;
    --mermaid-node-bkg: #ede8df;
    --mermaid-node-border: #b0a89f;
    --mermaid-cluster-bkg: #e8e0d4;
    --mermaid-cluster-border: #b0a89f;
    --mermaid-edge-label-background: #f0ebe3;
    --mermaid-arrowhead-color: #8a7b6a;
    --mermaid-person-border: #b0a89f;
    --mermaid-person-bkg: #ede8df;

    /* ── Mermaid Color Scale (cScale0–cScale11) ── */
    --mermaid-cscale0: #8b6b4a;
    --mermaid-cscale1: #5a8a7a;
    --mermaid-cscale2: #b8963a;
    /* ... up to --mermaid-cscale11 */

    /* ── Mermaid C4 Diagram Colors ── */
    --mermaid-c4-person-bg: #8b4513;
    --mermaid-c4-person-border: #6b350f;
    --mermaid-c4-system-bg: #5a8a7a;
    --mermaid-c4-system-border: #4a7a6b;
    --mermaid-c4-container-bg: #6b5a4a;
    --mermaid-c4-container-border: #5a4a3a;
    --mermaid-c4-component-bg: #4a7a6b;
    --mermaid-c4-component-border: #3a6a5b;
    /* ... and their external_ variants */

    /* ── Dark Mode ── */
    /* Set to "true" for dark custom themes */
    /* --mermaid-dark-mode: true; */
}
```

##### Font Size & Text Offset

Mermaid diagrams in custom themes have two font/offset control layers:

**1. JS Rendering Layer** — `--mermaid-font-size` controls the `fontSize` parameter passed to `mermaid.initialize()`. This affects how Mermaid calculates node sizes and text layout during SVG generation. Default is `12` (px). Smaller values produce more compact diagrams.

**2. CSS Override Layer** — The plugin's `mermaid-plugin-custom.css` applies `!important` overrides on the rendered SVG to enforce the theme's font family, font size, and text vertical offset. These CSS variables are used:

| CSS Variable | CSS Property | Default | Description |
|---|---|---|---|
| `--mermaid-font-size` | `font-size` | `12px` | Font size for all SVG text, spans, and foreignObject content |
| `--mermaid-font-family` | `font-family` | system sans-serif | Font family for all SVG text and labels |
| `--mermaid-text-color` | `fill` / `color` | `--text-color` | Text color for all diagram labels |

**3. Text Vertical Offset** — Chinese fonts and serif fonts often render text lower than expected inside Mermaid nodes. The plugin compensates with two CSS mechanisms:

```css
/* Text elements are shifted up via transform */
body.theme-custom .mermaid-preview svg .label text,
body.theme-custom .mermaid-preview svg .nodeLabel text {
    transform: translateY(-5px) !important;
}

/* foreignObject containers are shifted up via relative positioning */
body.theme-custom .mermaid-preview svg .nodeLabel,
body.theme-custom .mermaid-preview svg .edgeLabel {
    position: relative !important;
    top: -5px !important;
}
```

**4. Node Height Padding** — The plugin's `adjustNodeHeights()` function expands node rectangles and foreignObject containers after rendering. For custom themes, the padding is `12px` (vs `6px` for built-in themes) to accommodate CJK characters that need more vertical space.

##### Tuning Guide

If text in Mermaid diagrams appears clipped or misaligned:

| Problem | Solution |
|---|---|
| Text too large / nodes too small | Decrease `--mermaid-font-size` (e.g. `11px` or `10px`) |
| Text too small / hard to read | Increase `--mermaid-font-size` (e.g. `13px` or `14px`) |
| Text sits too low in nodes | Increase the `translateY` and `top` offset in your CSS overrides (e.g. `-6px` or `-7px`) |
| Text sits too high in nodes | Decrease the offset (e.g. `-3px` or `-4px`) |
| Node rectangles clip text | The 12px auto-padding should handle this; if still clipped, the `adjustNodeHeights` PAD value in `mermaid-plugin.ts` can be increased |
| Font doesn't match the theme | Set `--mermaid-font-family` to match your editor font |

##### Complete Mermaid CSS Variable Reference

| Variable | Mermaid themeVariable | Fallback | Description |
|---|---|---|---|
| `--mermaid-background` | `background` | `--bg-color` | Diagram background |
| `--mermaid-primary-color` | `primaryColor` | `--code-block-bg` | Primary node fill |
| `--mermaid-primary-border-color` | `primaryBorderColor` | `--border-color` | Primary node border |
| `--mermaid-primary-text-color` | `primaryTextColor` | `--text-color` | Primary text color |
| `--mermaid-secondary-color` | `secondaryColor` | `--code-bg` | Secondary node fill |
| `--mermaid-secondary-border-color` | `secondaryBorderColor` | `--border-color` | Secondary node border |
| `--mermaid-line-color` | `lineColor` | `--border-color` | Connection line color |
| `--mermaid-text-color` | `textColor` | `--text-color` | Default text color |
| `--mermaid-main-bkg` | `mainBkg` | `--code-block-bg` | Main background |
| `--mermaid-second-bkg` | `secondBkg` | `--code-bg` | Secondary background |
| `--mermaid-label-background` | `labelBackground` | `--code-block-bg` | Label background |
| `--mermaid-label-text-color` | `labelTextColor` | `--text-color` | Label text color |
| `--mermaid-node-bkg` | `nodeBkg` | `--code-block-bg` | Node fill |
| `--mermaid-node-border` | `nodeBorder` | `--border-color` | Node border |
| `--mermaid-cluster-bkg` | `clusterBkg` | `--code-bg` | Cluster fill |
| `--mermaid-cluster-border` | `clusterBorder` | `--border-color` | Cluster border |
| `--mermaid-edge-label-background` | `edgeLabelBackground` | `--code-block-bg` | Edge label background |
| `--mermaid-arrowhead-color` | `arrowheadColor` | `--mermaid-line-color` | Arrowhead fill |
| `--mermaid-person-border` | `personBorder` | `--border-color` | C4 person border |
| `--mermaid-person-bkg` | `personBkg` | `--code-block-bg` | C4 person fill |
| `--mermaid-font-family` | `fontFamily` | system sans-serif | All diagram text font |
| `--mermaid-font-size` | `fontSize` (JS) | `12` | All diagram text size |
| `--mermaid-dark-mode` | `darkMode` | `false` | Set `"true"` for dark themes |
| `--mermaid-cscale0` – `--mermaid-cscale11` | `cScale0` – `cScale11` | default palette | Color scale for pie/mindmap/etc |
| `--mermaid-c4-person-bg` | `person_bg_color` | `#2d5f8a` | C4 person background |
| `--mermaid-c4-person-border` | `person_border_color` | `#4a7aaa` | C4 person border |
| `--mermaid-c4-ext-person-bg` | `external_person_bg_color` | `#4a5568` | External person background |
| `--mermaid-c4-ext-person-border` | `external_person_border_color` | `#6b7a8a` | External person border |
| `--mermaid-c4-system-bg` | `system_bg_color` | `#3d7a5a` | System background |
| `--mermaid-c4-system-border` | `system_border_color` | `#5a9a7a` | System border |
| `--mermaid-c4-ext-system-bg` | `external_system_bg_color` | `#6b4a7a` | External system background |
| `--mermaid-c4-ext-system-border` | `external_system_border_color` | `#8a6a9a` | External system border |
| `--mermaid-c4-container-bg` | `container_bg_color` | `#8a6b3c` | Container background |
| `--mermaid-c4-container-border` | `container_border_color` | `#aa8a5c` | Container border |
| `--mermaid-c4-ext-container-bg` | `external_container_bg_color` | `#5a5a6a` | External container background |
| `--mermaid-c4-ext-container-border` | `external_container_border_color` | `#7a7a8a` | External container border |
| `--mermaid-c4-component-bg` | `component_bg_color` | `#3c7a6b` | Component background |
| `--mermaid-c4-component-border` | `component_border_color` | `#5c9a8b` | Component border |
| `--mermaid-c4-ext-component-bg` | `external_component_bg_color` | `#6a6a6a` | External component background |
| `--mermaid-c4-ext-component-border` | `external_component_border_color` | `#8a8a8a` | External component border |

For additional CSS overrides on rendered SVG elements, target `.mermaid-preview svg` under `body.theme-custom`:

```css
body.theme-custom .mermaid-preview svg .node rect,
body.theme-custom .mermaid-preview svg .node circle {
    stroke: #b0a89f;
}

body.theme-custom .mermaid-preview svg .edgePath .path {
    stroke: #8a7b6a;
}

body.theme-custom .mermaid-preview svg text {
    fill: #2b2520;
    font-family: "LXGW WenKai", Georgia, serif;
}
```

Common Mermaid selectors to override:

| Selector | Description |
|----------|-------------|
| `.node rect/circle/ellipse/polygon` | Node shape fill and stroke |
| `.node .label` | Node text color and font |
| `.edgePath .path` | Connection line color |
| `.edgeLabel` | Edge label styling |
| `.cluster rect` | Group/cluster background |
| `.actor` | Sequence diagram actor box |
| `.messageLine0/1` | Sequence diagram message lines |
| `.classBox` | Class diagram class box |
| `.statediagram-state` | State diagram state node |
| `.pieCircle` / `.slice` | Pie chart slices |
| `.mindmap-node` | Mind map node |
| `.quadrant` | Quadrant chart |
| `.xychart` | XY chart |
| `.sankey` | Sankey diagram |
| `.block` | Block diagram |
| `.er .entityBox` | ER diagram entity |
| `.task0/1/2/3` | Gantt chart task bars |
| `.today` | Gantt chart "today" marker |

#### Math Formulas

Target math elements under `body.theme-custom` to ensure formulas match the theme color scheme. You can also define a `--katex-color` variable:

```css
body.theme-custom {
    --katex-color: #3d3530;
}

body.theme-custom .math-inline,
body.theme-custom .math-block {
    color: #2b2520;
}

body.theme-custom .katex {
    color: #3d3530;
}

body.theme-custom .katex .mord,
body.theme-custom .katex .mbin,
body.theme-custom .katex .mrel,
body.theme-custom .katex .mopen,
body.theme-custom .katex .mclose,
body.theme-custom .katex .mpunct,
body.theme-custom .katex .minner {
    color: #3d3530;
}
```

### Tips

- Theme files should be self-contained (no external imports)
- Test that all variables are defined to avoid invisible text
- Name the file descriptively: `dark-ocean.css`, `solarized-light.css`, etc.
- When styling Mermaid diagrams, use `!important` cautiously as Mermaid's inline styles can be highly specific
- Math formulas may render as SVG or HTML depending on the engine; target both for best compatibility
