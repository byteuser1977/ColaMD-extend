# ColaMD Themes

Download any `.css` file and place it in `~/.colamd/themes/`, or use **Theme > Import Theme** in ColaMD to import directly.

## Available Themes

| Theme | Description |
|-------|-------------|
| [elegant.css](elegant.css) | Warm serif theme with terracotta accents and dark code blocks |

## Creating Your Own Theme

ColaMD custom themes are plain CSS files. You can style the editor by targeting CSS custom properties or writing direct selectors.

### CSS Variables

```css
body {
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

For more control, target elements directly:

```css
#editor .ProseMirror { font-family: Georgia, serif; }
#editor .ProseMirror strong { color: #c44b2b; }
#editor .ProseMirror pre { background: #2c2c2c; color: #e0dcd7; }
```

### Extended Features Styling

ColaMD supports advanced content like **Mermaid diagrams** and **Math formulas**. A well-designed theme should include styles for these elements to ensure visual consistency.

#### Mermaid Diagrams

Target `.md-diagram-panel.md-mermaid` to style diagram containers and SVG elements:

```css
/* Diagram container */
.md-diagram-panel.md-mermaid {
    background: #f7f5f2;
    border: 1px solid #d8d3ce;
    border-radius: 6px;
    padding: 20px;
}

/* Node shapes */
.md-diagram-panel.md-mermaid .node rect,
.md-diagram-panel.md-mermaid .node circle {
    fill: #eae6e1;
    stroke: #c44b2b;
}

/* Node labels */
.md-diagram-panel.md-mermaid .node .label {
    color: #2c2c2c;
}

/* Edges / connections */
.md-diagram-panel.md-mermaid .edgePath .path {
    stroke: #999;
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
| `.task0/1/2/3` | Gantt chart task bars |
| `.today` | Gantt chart "today" marker |

#### Math Formulas

Target math elements to ensure formulas match the theme color scheme:

```css
/* Block math */
.md-math-block,
.MathJax_Display {
    margin: 1.5em 0;
    text-align: center;
}

/* Inline math */
.md-inline-math,
.md-math-inline,
.MathJax {
    color: #2c2c2c;
}

/* MathJax SVG rendering */
.MathJax svg,
.MathJax_Display svg {
    fill: currentColor;
    stroke: currentColor;
}
```

### Tips

- Theme files should be self-contained (no external imports)
- Test that all variables are defined to avoid invisible text
- Name the file descriptively: `dark-ocean.css`, `solarized-light.css`, etc.
- When styling Mermaid diagrams, use `!important` cautiously as Mermaid's inline styles can be highly specific
- Math formulas may render as SVG or HTML depending on the engine; target both for best compatibility
