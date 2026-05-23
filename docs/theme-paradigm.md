# ColaMD CSS 主题定义范式 v3.0

**适用范围**：ColaMD `themes/*.css` 用户主题文件的编写与 AI 辅助生成  
**最后更新**：2026-05-23  
**关联文件**：`themes/template.css`（范式配套模板）

---

## 1. 设计目标

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **变量化** | 颜色、字体、字号、间距一律通过 CSS 自定义属性定义。选择器规则中禁止出现裸色值（`#xxx`）、裸字号（`12pt`）、裸字体名 |
| **模块化** | 主题文件只定义变量 + 极小量选择器微调。Mermaid 图表、编辑器排版由内置系统 (`base.css` / `variables.css`) 自动承继 |
| **语义化** | 变量名描述用途而非外观。`--color-link` 而非 `--color-blue`；`--font-heading` 而非 `--font-sans` |
| **可推导** | 完整主题可由 5 个种子色 + 3 组字体栈自动推导，AI Agent 修改主题只需改动 SECTION 1 |
| **打印保真** | `@media print` 输出必须与屏幕显示保持视觉一致。打印样式是屏幕样式的**镜像增强版**（同值 + `!important` + `print-color-adjust`），而非独立设计 |

### 1.2 与现有体系的关系

```
┌─────────────────────────────────────────────────┐
│  themes/template.css        用户主题 (本范式)     │
│  定义变量值 + 微调选择器                         │
├─────────────────────────────────────────────────┤
│  src/.../base.css           编辑器排版层          │
│  消费 --bg-color, --text-color 等变量            │
├─────────────────────────────────────────────────┤
│  src/.../mermaid/variables.css  Mermaid 映射层   │
│  消费 --mermaid-* 变量，自动映射到 22 种图表      │
├─────────────────────────────────────────────────┤
│  src/.../mermaid-plugin-custom.css  文本偏移基线  │
│  提供 --mermaid-label-offset-y 等定位变量         │
├─────────────────────────────────────────────────┤
│  src/.../foundation.css     全局 Reset + 默认值   │
└─────────────────────────────────────────────────┘
```

**关键约束**：主题文件通过 `body.theme-custom` 选择器接入系统。内置 `variables.css` 已预置所有 Mermaid SVG 选择器映射，主题**只需定义变量值**，**无需**重复写 SVG 选择器。

---

## 2. 设计规范 (Design Specification)

本节定义可被 AI Agent 程序化验证的强制性设计约束。每条规则包含唯一 ID、约束级别（MUST / MUST NOT / SHOULD / SHOULD NOT）、验证方法和设计理由。

### 2.1 色彩空间规范

#### 2.1.1 对比度约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **CR-01** | MUST | 正文色 (`--seed-ink`) 与页面底色 (`--seed-surface`) 对比度 ≥ 7:1（WCAG AAA） | `relativeLuminance(ink, surface) ≥ 7.0` |
| **CR-02** | MUST | 次要文字 (`--seed-ink-muted`) 与页面底色对比度 ≥ 4.5:1（WCAG AA） | `relativeLuminance(muted, surface) ≥ 4.5` |
| **CR-03** | MUST | 弱化文字 (`--seed-ink-dim`) 与页面底色对比度 ≥ 3:1（WCAG AA large） | `relativeLuminance(dim, surface) ≥ 3.0` |
| **CR-04** | MUST | 点缀色 (`--seed-accent`) 与页面底色对比度 ≥ 4.5:1（用于链接/强调文字时） | `relativeLuminance(accent, surface) ≥ 4.5` |
| **CR-05** | SHOULD | 内联代码背景 (`--seed-panel`) 与页面底色区分度 ≥ 1.5:1 | `relativeLuminance(panel, surface) ≥ 1.5` 或 `≤ 0.67` |
| **CR-06** | MUST NOT | 禁止正文色与页面底色对比度 < 4.5:1 | `relativeLuminance(ink, surface) ≥ 4.5` |

**WCAG 相对亮度计算公式**：

```
relativeLuminance(hex) = 0.2126 * R + 0.7152 * G + 0.0722 * B
  其中 R/G/B = linearize(channel / 255)
  linearize(c) = c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4

contrastRatio(L1, L2) = (max(L1,L2) + 0.05) / (min(L1,L2) + 0.05)
```

#### 2.1.2 色相协调规则

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **HR-01** | SHOULD | 浅色主题中，点缀色优先选用暖色（红/橙/棕）或冷色（蓝/靛/绿），避免中性灰作为点缀色 | 检查 `--seed-accent` 的 HSL 饱和度 S ≥ 0.30 |
| **HR-02** | SHOULD | 深色主题中，点缀色亮度适当提高（HSL 的 L ≥ 0.50），避免深色背景上点缀色不可见 | 检查 accent-L 值 |
| **HR-03** | MUST NOT | 禁止同时使用 ≥ 3 个不同色相的饱和色作为功能色。点缀色应只有 1 个色相族 | 检查色板中饱和度 > 0.3 的色相数量 ≤ 2 |

#### 2.1.3 饱和度与明度约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **SL-01** | MUST | 页面底色 (`--seed-surface`) 饱和度 ≤ 0.05（近白或近黑，不偏色） | 检查 HSL S 值 |
| **SL-02** | MUST NOT | 禁止大面积色块（代码区 `--seed-panel`、引用块 `--seed-panel-alt`）饱和度 > 0.10 | 检查 HSL S ≤ 0.10 |
| **SL-03** | SHOULD | 表面色三层 (`surface → panel → panel-alt`) 保持同色相（H 偏差 ≤ 5°），仅明度递减 | 检查 HSL H 差值 ≤ 5° |
| **SL-04** | MUST | 浅色主题：`L(surface) > L(panel) > L(panel-alt)`；深色主题反之 | 检查 L 单调性 |

#### 2.1.4 点缀色面积约束

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **AR-01** | SHOULD | 点缀色覆盖面积 ≤ 页面可视面积的 10%（用于链接、Mermaid 节点边框、表头底线、引用块竖线等） |
| **AR-02** | MUST NOT | 禁止将点缀色用作大面积背景色（页面底色、代码块背景、表格全局背景） |

#### 2.1.5 中性灰轴约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **NT-01** | MUST | `--seed-ink` / `--seed-ink-muted` / `--seed-ink-dim` 必须位于同一色相轴（HSL H 偏差 ≤ 3°），仅明度变化 | 检查 H 差值 |
| **NT-02** | MUST | `--seed-border` 与 `--seed-panel` 明度差 ≥ 0.08，确保边框可见 | `abs(L(border) - L(panel)) ≥ 0.08` |
| **NT-03** | SHOULD | `--seed-border` 只能使用中性灰（HSL S ≤ 0.05），禁止使用有色边框 | 检查 S ≤ 0.05 |

### 2.2 字体搭配规范

#### 2.2.1 字体数量与分类

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **FP-01** | MUST | 主题使用的字体家族总数 ≤ 4（正文 1、标题 1、等宽 1、Mermaid 1） |
| **FP-02** | SHOULD | `--font-heading` 与 `--font-body` 须有分类对比：一个无衬线、一个衬线；或同分类但字重/字宽显著不同 |
| **FP-03** | MUST | `--font-code` 必须是等宽字体（monospace），禁止将比例字体用于代码 |
| **FP-04** | SHOULD | `--font-mermaid` 应引用 `var(--font-heading)`，保持图表与文档标题字体一致 |

#### 2.2.2 字体分类搭配矩阵

| 正文字体分类 | 推荐标题字体分类 | 搭配效果 |
|-------------|----------------|---------|
| Sans-serif | Sans-serif（更粗字重） | 现代、Swiss、技术文档 |
| Serif | Sans-serif | 经典学术、优雅对比 |
| Serif | Serif（更粗字重） | 传统印刷、书籍风格 |
| Sans-serif | Serif | 少见，通常反直觉 |

**禁止搭配**：正文与标题使用同一字体的相同字重（无任何区分度）。

#### 2.2.3 字号倍率约束

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **FS-01** | MUST | `--font-scale-h1` ≥ 1.75（主标题至少为正文的 1.75 倍） | 检查倍率值 |
| **FS-02** | MUST | 标题倍率严格递减：`h1 > h2 > h3 > h4 > h5 > h6` | 检查单调性 |
| **FS-03** | SHOULD | 正文字号 `--font-size-root` ∈ [14px, 18px] | 检查范围 |
| **FS-04** | SHOULD | Mermaid 字号 `--font-size-mermaid` ∈ [11px, 14px] | 检查范围 |
| **FS-05** | SHOULD | 标题行高 `--line-height-heading` ∈ [1.15, 1.4]，小于正文行高 | `heading < body` |

#### 2.2.4 字体栈构造规则

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **FS-06** | MUST | 每个字体栈必须以通用字体族（`serif` / `sans-serif` / `monospace`）结尾 |
| **FS-07** | MUST | 字体栈中至少包含 1 个中文字体（覆盖 CJK 字符）和 1 个西文字体 |
| **FS-08** | SHOULD | 字体栈中同一字体族的不同字重变体（如 "Inter" 和 "Inter Display"）只保留 1 个 |

### 2.3 表面/背景层次规范

#### 2.3.1 明度阶梯约束

页面视觉层次依赖三层表面的明度差异。

| Rule ID | 级别 | 规则 | 浅色主题 | 深色主题 |
|---------|------|------|---------|---------|
| **SH-01** | MUST | 相邻表面层明度差 ≥ 0.04 | `L(surface) - L(panel) ≥ 0.04` | `L(panel) - L(surface) ≥ 0.04` |
| **SH-02** | MUST | 代码块底色 (`--code-block-bg` 或 `--seed-panel-alt`) 与页面底色明度差 ≥ 0.06，确保代码区域肉眼可辨 | `abs(L(block) - L(surface)) ≥ 0.06` |
| **SH-03** | SHOULD | 三层表面 `surface → panel → panel-alt` 的明度差均匀（相邻层差值偏差 ≤ 50%） | `ratio(d1,d2) ≤ 1.5` |

#### 2.3.2 各语义表面最低对比度

| 语义角色 | 对应变量 | 与页面底色的最低对比度 |
|----------|---------|---------------------|
| 代码块背景 | `--code-block-bg` | 1.2:1（肉眼可辨即可，不宜过强） |
| 内联代码背景 | `--code-bg` | 1.15:1 |
| 引用块背景 | `--blockquote-bg` | 1.15:1 |
| 表头背景 | `--table-header-bg` | 1.5:1（需明显区分） |
| Mermaid 节点填充 | `--mermaid-node-fill` | 1.2:1 |
| Mermaid 聚类填充 | `--mermaid-cluster-fill` | 1.1:1（极浅即可） |

### 2.4 线条/边框规范

#### 2.4.1 边框色与底色关系

| Rule ID | 级别 | 规则 |
|---------|------|------|
| **BD-01** | MUST | 边框色 (`--seed-border`) 必须比其所在表面色暗：浅色主题 `L(border) < L(surface)`，深色主题反之 |
| **BD-02** | SHOULD | 强调边框 (`--seed-border-strong`) 比普通边框深 ≥ 0.15 明度差 |
| **BD-03** | SHOULD | Mermaid 节点描边 (`--mermaid-node-stroke`) 与节点填充 (`--mermaid-node-fill`) 对比度 ≥ 2:1 |

#### 2.4.2 边框宽度层级

| 用途 | 推荐宽度 | 说明 |
|------|---------|------|
| 分割线 (hr) | 1px | 最细，仅起分隔作用 |
| 表格内边框 (td) | 1px | 细线，不抢内容 |
| Mermaid 节点描边 | 1.5px | 略粗，确保图表清晰 |
| 引用块左侧竖线 | 4px | 最粗，视觉锚点 |
| 表头底线 | 2px | 区分表头与表体 |

### 2.5 语义色角色映射规范

#### 2.5.1 强制映射表 (Mandatory)

以下映射**必须**成立。变量值必须直接或间接来自种子色板。

| 语义变量 | 必须映射到 | 说明 |
|----------|-----------|------|
| `--bg-color` | `var(--seed-surface)` | 页面底色 = 最浅表面 |
| `--text-color` | `var(--seed-ink)` | 正文色 = 最深文字 |
| `--heading-color` | `var(--seed-ink)` | 标题色 = 正文色（统一） |
| `--link-color` | `var(--seed-accent)` | 链接色 = 点缀色 |
| `--accent-color` | `var(--seed-accent)` | 全局强调色 = 点缀色 |
| `--border-color` | `var(--seed-border)` | 边框色 = 中性灰 |
| `--code-bg` | `var(--seed-panel)` | 内联代码背景 = 中间表面 |
| `--code-block-bg` | `var(--seed-panel-alt)` | 代码块背景 = 最深表面 |
| `--blockquote-bg` | `var(--seed-panel)` | 引用块背景 = 中间表面 |
| `--blockquote-border` | `var(--seed-ink)` 或 `var(--seed-accent)` | 引用竖线 = 正文色或点缀色 |
| `--table-header-bg` | `var(--seed-panel)` 或 `var(--seed-ink)` | 表头 = 浅底或黑底白字 |
| `--selection-bg` | `accent color + alpha 0.10~0.20` | 选区 = 点缀色半透明 |

#### 2.5.2 禁止的映射 (Forbidden)

| Rule ID | 级别 | 禁止项 |
|---------|------|--------|
| **MP-01** | MUST NOT | `--text-color` 映射到 ⾮ `--seed-ink` 或 `--seed-ink-muted` 的其他来源 |
| **MP-02** | MUST NOT | `--bg-color` 映射到 ⾮ `--seed-surface` 的其他来源 |
| **MP-03** | MUST NOT | `--border-color` 映射到有彩色（非中性灰），HSL S > 0.05 |
| **MP-04** | MUST NOT | `--code-bg` 与 `--bg-color` 使用同一值（代码区不可见） |
| **MP-05** | MUST NOT | `--table-header-bg` 同时兼具浅底 + 浅字（表头必须可读） |

### 2.6 规则优先级与冲突解决

当多条规则冲突时，按以下优先级裁决：

```
1. MUST NOT  > 2. MUST  > 3. SHOULD NOT  > 4. SHOULD
```

- 任何 MUST NOT 规则被违反 → 主题**拒绝**（不合规）
- 任何 MUST 规则被违反 → 主题**拒绝**
- SHOULD NOT 被违反 → **警告**，需人工审核
- SHOULD 被违反 → **建议**，不阻止使用

示例：若某个点缀色满足 HR-01（SHOULD），但违反 CR-04（MUST），则主题被拒绝。

---

## 3. 变量体系

### 3.1 分层架构

```
SECTION 1  设计令牌 (Design Tokens)     ← 用户修改
SECTION 2  语义映射 (Semantic Mapping)   ← 自动推导
SECTION 3  Mermaid 图表变量              ← 被内置系统消费
SECTION 4  排版微调变量                  ← 可选覆盖
```

### 3.2 设计令牌：种子色板

主题的视觉基调由 5 个种子色 + 各自深浅变体决定。

```
--seed-accent         点缀色（链接、强调、Mermaid 高亮）
  ├── --seed-accent-light   浅变体（用作背景）
  └── --seed-accent-dark    深变体（用作 hover / 文字）

--seed-surface        页面底色（最浅层）
--seed-panel          卡片/代码区底色（中间层）
--seed-panel-alt      表头/引用块底色（最深表面层）

--seed-ink            正文/标题色（最深文字）
--seed-ink-muted      次要文字色
--seed-ink-dim        弱化/禁用文字色

--seed-border         常规边框色
--seed-border-strong  强调边框色
```

**配色约束**：

| 主题类型 | 表面色关系 | 文字色关系 |
|----------|-----------|-----------|
| 浅色主题 | `surface` < `panel` < `panel-alt` (亮度递减) | `ink` > `muted` > `dim` (亮度递增) |
| 深色主题 | `surface` > `panel` > `panel-alt` (亮度递增) | `ink` < `muted` < `dim` (亮度递减) |
| 点缀色面积 | ≤ 页面 10%（链接 + 强调 + Mermaid 节点边框） | |

### 3.3 设计令牌：字体系统

```
--font-body      正文字体栈（衬线优先或无衬线）
--font-heading   标题字体栈（与正文形成对比）
--font-code      等宽字体栈（代码/公式）
--font-mermaid   Mermaid 图表字体（默认引用 --font-heading）
```

**字体栈构造规范**：
1. 西文字体在前（Windows / macOS / Linux 逐一覆盖）
2. 中文字体居中（Serif 或 Sans Serif 按主题风格选择）
3. 通用后备字体在末（`serif` / `sans-serif` / `monospace`）

### 3.4 语义映射规则

设计令牌通过变量引用自动映射到 ColaMD 内置系统消费的语义变量。

| 内置变量 | 映射来源 | 消费者 |
|----------|---------|--------|
| `--bg-color` | `--seed-surface` | `base.css` 页面背景 |
| `--text-color` | `--seed-ink` | `base.css` 正文颜色 |
| `--text-muted` | `--seed-ink-muted` | `base.css` 引用/次要文字 |
| `--heading-color` | `--seed-ink` | `base.css` 标题颜色 |
| `--border-color` | `--seed-border` | `base.css` 表格/分割线 |
| `--link-color` | `--seed-accent` | `base.css` 超链接 |
| `--code-bg` | `--seed-panel` | `base.css` 内联代码背景 |
| `--code-block-bg` | `--seed-panel-alt` | `base.css` 代码块背景 |
| `--blockquote-border` | `--seed-accent` | `base.css` 引用块左侧竖线 |
| `--table-header-bg` | `--seed-panel` | `base.css` 表头背景 |
| `--selection-bg` | `accent + 0.15 alpha` | `base.css` 选区高亮 |

**映射原则**：语义映射仅做变量引用（`var(--seed-*)`），不引入新色值。如需微调某个语义角色（如让 `--code-bg` 比 `--seed-panel` 略深），在映射处加 `color-mix()` 或微调 alpha 值。

### 3.5 Mermaid 20 核心变量

所有 Mermaid 变量由内置 `variables.css` 自动消费，覆盖 22 种图表类型。

| 变量 | 作用于 | 映射建议 |
|------|--------|---------|
| `--mermaid-background` | 图表容器背景 | `--seed-panel` |
| `--mermaid-border-color` | 图表容器边框 | `--seed-border` |
| `--mermaid-font-family` | 图表内所有文字 | `--font-mermaid` |
| `--mermaid-font-size` | 图表内所有文字大小 | 独立设置（通常 12-14px） |
| `--mermaid-node-fill` | 节点填充色 | `--seed-panel` |
| `--mermaid-node-stroke` | 节点描边色 | `--seed-accent` |
| `--mermaid-node-stroke-width` | 节点描边宽度 | `1.5px`（固定） |
| `--mermaid-node-text` | 节点内文字色 | `--seed-ink` |
| `--mermaid-edge-stroke` | 连线颜色 | `--seed-ink-muted` |
| `--mermaid-edge-stroke-width` | 连线宽度 | `1.5px`（固定） |
| `--mermaid-cluster-fill` | Subgraph 聚类填充 | `accent + 0.06 alpha` |
| `--mermaid-cluster-stroke` | Subgraph 聚类边框 | `--seed-accent` |
| `--mermaid-label-text` | 标签/节点内文本色 | `--seed-ink` |
| `--mermaid-edge-label-text` | 边标签文字色 | `--seed-ink-muted` |
| `--mermaid-edge-label-bg` | 边标签背景色 | `--seed-surface` |
| `--mermaid-title-text` | 图表标题色 | `--seed-ink` |
| `--mermaid-axis-text` | 坐标轴文字色 | `--seed-ink-muted` |
| `--mermaid-highlight` | 高亮/标记色 | `--seed-accent` |
| `--mermaid-person-stroke` | 人物节点描边 | `--seed-ink` |
| `--mermaid-label-offset-y` | 标签 Y 偏移 | `0px`（无特殊需求时） |

---

## 4. 模块化规则

### 4.1 继承而非重写

内置系统已处理的样式，主题文件**禁止**重写其选择器。

| 内置文件 | 已处理内容 | 主题禁止 |
|----------|-----------|---------|
| `variables.css` | 所有 `body.theme-custom .mermaid-preview svg .*` 选择器 | 写 Mermaid SVG 选择器 |
| `base.css` | `#editor .ProseMirror` 下的 h1-h6/p/code/pre/table/blockquote/ul/ol/hr/img | 重写已被变量覆盖的排版规则 |
| `mermaid-plugin-custom.css` | `.label text`, `.nodeLabel`, `.edgeLabel` 的 `transform/display/position` | 在主题层做定位覆盖（参照 guizang 模式） |

### 4.2 允许的微调选择器

以下选择器**允许**在主题中定义（内置系统未覆盖或不满足个性化需求）：

| 允许的选择器 | 用途 | 约束 |
|-------------|------|------|
| `body.theme-custom h1-h6` | 标题字号/字体（base.css 使用 em 倍率，可覆盖为 pt） | 值必须引用 `var(--font-*)` |
| `body.theme-custom strong` | 加粗文字颜色 | 引用 `var(--accent-color)` |
| `body.theme-custom code` | 内联代码字体/背景 | 引用 `var(--font-code)`, `var(--code-bg)` |
| `body.theme-custom pre` | 代码块字体/背景 | 引用变量 |
| `body.theme-custom blockquote` | 引用块背景色（base.css 未设背景） | 引用 `var(--blockquote-bg)` |
| `body.theme-custom table th` | 表头强调（双底线等） | 值引用变量 |
| `body.theme-custom .mermaid-block + p` | 图表标题居中 | 字体/字号引用变量 |
| `@media print` | 打印样式 | 用于固定打印色值 |

### 4.3 度量指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 主题文件总行数 | ≤ 300 行 | 含注释和空行 |
| 裸色值数量 | 0 | 所有颜色通过 `var(--*)` 引用 |
| 裸字号数量 | 0 | 所有字号通过 `var(--font-*)` 引用 |
| Mermaid SVG 选择器 | 0 | 由内置 `variables.css` 处理 |
| 用户需修改的变量数 | ≤ 20 | 集中在 SECTION 1 |

---

## 5. 文件结构规范

### 5.1 必须的 SECTION

```
SECTION 1  设计令牌 — 变量定义块（用户编辑区）
  ├── 1.1 种子色板
  ├── 1.2 字体系统
  ├── 1.3 字号倍率
  └── 1.4 圆角/间距/宽度

SECTION 2  语义映射 — 令牌 → 内置变量的自动映射
  ├── 2.1 编辑区表面色
  ├── 2.2 编辑区文字色
  ├── 2.3 链接/强调
  ├── 2.4 边框/分割线
  ├── 2.5 内联代码
  ├── 2.6 代码块
  ├── 2.7 引用块
  ├── 2.8 表格
  └── 2.9 滚动条

SECTION 3  Mermaid 图表变量
  ├── 3.1 容器
  ├── 3.2 字体
  ├── 3.3 节点
  ├── 3.4 连线
  ├── 3.5 聚类
  ├── 3.6 标签
  ├── 3.7 标题/坐标轴
  ├── 3.8 人物节点
  └── 3.9 偏移

SECTION 4  排版微调变量

SECTION 5  选择器级微调

SECTION 6  @media print
```

### 5.2 选择器规则

| 规则 | 说明 |
|------|------|
| 根选择器 | 变量定义在 `body.theme-custom { }` 内 |
| 选择器前缀 | 排版选择器使用 `body.theme-custom <element>` 限定作用域 |
| `!important` | 仅在 `@media print` 中使用。屏幕样式靠选择器优先级解决 |
| 层叠顺序 | 变量定义块在前，选择器规则块在后 |

### 5.3 注释规范

```css
/* ── X.X 功能描述（中文）── */
/* 用于 xxx 场景的 xxx 变量 */
--variable-name: value;

/* ═══════════════════  分隔大节  ═══════════════════ */
```

---

## 6. 打印保真规范 (Print Fidelity)

### 6.1 核心约束

ColaMD 通过 Electron `printToPDF()` 生成 PDF，底层为 Chromium 打印引擎。Chromium 打印默认**剥离所有背景色和自定义颜色**。因此 `@media print` 必须主动恢复每个被剥离的样式。

**铁律**：`@media print` 是屏幕样式的**镜像增强版**——相同的变量值 + `!important` + `print-color-adjust: exact`。禁止在 print 中创造不同的设计。

### 6.2 必须覆盖的元素清单

以下元素在打印时会被 Chromium 剥离样式，**每个都必须**在 `@media print` 中显式声明：

| 元素 | 必须声明 | 原因 |
|------|---------|------|
| `html, body` | `background`, `color`, `font-family` | 根元素背景/文字被清除 |
| `h1-h6` | `color`（尤其是有色标题如 Swiss Red h1） | 非纯黑标题色被清除 |
| `code` | `background`, `color` | 内联代码背景被清除 |
| `pre` | `background`, `color`, `border-left`（如有） | 代码块背景/装饰被清除 |
| `blockquote` | `background`, `border-left` | 引用块背景被清除 |
| `table th` | `background`, `color`, `border` | 表头底色被清除 |
| `table td` | `border` | 表格线可能断裂 |
| `a` | `color`, `border-bottom`（如有） | 链接色被清除 |
| `.mermaid-block` | `background`, `border` | 图表容器被清除 |
| `.mermaid-preview svg *` | `print-color-adjust: exact` | SVG 颜色全部被剥离 |
| `.mermaid-block + p` | `color`, `text-align` | 图题样式丢失 |
| `strong` | `color`（如使用非默认色） | 强调色被清除 |

### 6.3 打印变量声明块

`@media print` 开头必须先重新声明关键变量。Chromium 打印可能丢失 `body.theme-custom` 中定义的 CSS 自定义属性，因此在 print 作用域内重新注入：

```css
@media print {
  body.theme-custom {
    /* 将 SECTION 1 的种子色重新声明到 print 作用域 */
    --seed-accent: #e30613;
    --seed-surface: #ffffff;
    --seed-ink: #0d0d0d;
    --seed-panel: #f4f4f4;
    --seed-panel-alt: #eaeaea;
    /* ... 以及所有在 print 选择器中引用的变量 */
  }
  
  /* 之后的选择器引用 var(--seed-*) 确保值一致 */
}
```

### 6.4 打印选择器编写规则

1. **先变量，后选择器**：先重声明变量块，再写选择器规则
2. **`!important` 全部**：print 中每个属性都用 `!important`，因为打印引擎的默认样式表优先级极高
3. **`print-color-adjust: exact` 精确覆盖**：每个有背景色的元素独立声明（不能依赖继承）
4. **值与屏幕一致**：print 选择器的值引用 `var(--seed-*)`，保证与屏幕端一致
5. **禁止在 print 中引入新色值**：即使是 `#ffffff` 也应引用变量（如 `var(--seed-surface)`）

### 6.5 完整打印模板

```css
@media print {
  @page { margin: 20mm; }

  /* —— 变量重声明（确保 Chromium 打印不丢失） —— */
  body.theme-custom {
    --seed-accent:       <同 SECTION 1>;
    --seed-accent-dark:  <同 SECTION 1>;
    --seed-surface:      <同 SECTION 1>;
    --seed-ink:          <同 SECTION 1>;
    --seed-ink-muted:    <同 SECTION 1>;
    --seed-panel:        <同 SECTION 1>;
    --seed-panel-alt:    <同 SECTION 1>;
    --seed-border:       <同 SECTION 1>;
  }

  /* —— 根元素 —— */
  html, body, body.theme-custom {
    background: var(--seed-surface) !important;
    color: var(--seed-ink) !important;
    font-family: var(--font-body) !important;
  }

  /* —— 标题（尤其是有色标题必须恢复） —— */
  body.theme-custom h1 {
    color: var(--seed-accent) !important;  /* 保留页面中的有色标题 */
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* —— 内联代码 —— */
  body.theme-custom code {
    background: var(--seed-panel) !important;
    color: var(--seed-accent-dark) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* —— 代码块 —— */
  body.theme-custom pre {
    background: var(--seed-panel-alt) !important;
    color: var(--seed-ink) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body.theme-custom pre code {
    background: transparent !important;
    color: inherit !important;
  }

  /* —— 引用块 —— */
  body.theme-custom blockquote {
    background: var(--seed-panel) !important;
    border-left-color: var(--seed-ink) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* —— 表格表头（有色底必须恢复） —— */
  body.theme-custom table th {
    background: var(--seed-ink) !important;
    color: var(--seed-surface) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body.theme-custom table td {
    border-color: var(--seed-border) !important;
  }

  /* —— 链接 —— */
  body.theme-custom a {
    color: var(--seed-ink) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* —— 强调文字 —— */
  body.theme-custom strong {
    color: var(--seed-accent-dark) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* —— Mermaid 图表容器 —— */
  body.theme-custom .mermaid-block {
    background: var(--seed-surface) !important;
    border-color: var(--seed-border) !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body.theme-custom .mermaid-preview svg * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* —— 图表标题 —— */
  body.theme-custom .mermaid-block + p {
    color: var(--seed-ink-muted) !important;
    text-align: center !important;
  }
}
```

### 6.6 打印验证清单

主题开发完成后，逐项确认 PDF 导出效果：

- [ ] 页面背景色与屏幕一致（非灰色）
- [ ] h1 颜色与屏幕一致（尤其是有色标题如 Swiss Red）
- [ ] 内联代码背景色存在
- [ ] 代码块背景色存在，左侧装饰线（如有）可见
- [ ] 引用块背景色和左侧竖线存在
- [ ] 表格表头底色存在（黑底白字 / 浅灰底等）
- [ ] Mermaid SVG 颜色与屏幕一致
- [ ] 图表标题居中且字号正确
- [ ] 链接文字颜色不为默认蓝

---

## 7. AI Agent 编写指南

### 7.1 创建新主题

1. 复制 `themes/template.css` 为基础
2. 确定配色方向（浅色/深色/暖调/冷调/学术）
3. 填写 SECTION 1 的 5 个种子色 + 3 组字体栈
4. 微调 SECTION 5 的选择器（如需）
5. 保存，导入测试

### 7.2 修改现有主题

1. 只修改 SECTION 1 中的 `--seed-*` 和 `--font-*` 变量
2. 其他 SECTION 的映射变量自动跟随
3. 如某个语义角色需要独立微调，修改对应的 `--var: var(--seed-*)` 映射行

### 7.3 禁止操作

- 在 `body.theme-custom` 块外定义变量
- 在选择器中使用裸色值（`#xxxxxx`）
- 重复定义内置 `variables.css` 已有的 Mermaid SVG 选择器
- 使用 `!important`（`@media print` 除外）
- 为 mermaid 标签添加 `transform` / `display` / `position` / `top` / `left` 覆盖

---

## 9. 单位使用规范 (Unit Specification)

### 9.1 核心原则：统一使用 px 单位

**问题背景**：CSS 的 `pt` (point) 单位在不同渲染环境下的定义不一致：
- **CSS/屏幕渲染**：`1pt = 1/96 inch` (基于 96dpi)
- **PDF/PostScript**：`1pt = 1/72 inch` (基于 72dpi)
- **差异系数**：`72/96 = 0.75`，导致 PDF 导出时文字缩小约 **25%**

**解决方案**：所有主题文件必须统一使用 `px` (pixel) 单位。

#### Rule ID 级别规范

| Rule ID | 级别 | 规则 | 验证方法 |
|---------|------|------|---------|
| **UN-01** | MUST | 禁止使用 `pt` 单位定义字号、间距、边距等度量值 | 正则匹配：`\d+\.?\d*pt` 结果为空 |
| **UN-02** | MUST | 所有字号、间距、边距必须使用 `px` 单位 | 检查 `font-size`, `margin`, `padding`, `border-width` 等属性 |
| **UN-03** | SHOULD | px 值优先使用**偶数整数**（2, 4, 6, 8, ...） | 检查值为偶数 |
| **UN-04** | SHOULD NOT | 避免使用奇数 px 值（除非特殊需求如 1px 边框） | 奇数值数量 ≤ 总数量的 10% |

### 9.2 pt → px 转换规则

#### 转换公式

```python
def pt_to_px(pt_value):
    """将 pt 值转换为 px 并四舍五入到最近的偶数"""
    px_value = pt_value * (96 / 72)  # ≈ pt_value * 1.3333
    rounded = round(px_value)
    # 调整为偶数
    if rounded % 2 != 0:
        rounded += 1 if (rounded + 1 - px_value) < (rounded - 1 - px_value) else -1
    return rounded
```

#### 常用字号转换对照表

| 原始值 (pt) | 计算值 (px) | 四舍五入 | 最终值 (px) | 用途说明 |
|-------------|-------------|---------|-------------|----------|
| 9 | 12.00 | 12 | **12** | 小五号/Mermaid 图表字 |
| 10.5 | 14.00 | 14 | **14** | 五号/代码块/表格/图题 |
| 11 | 14.67 | 15 | **14** | h5 标题 |
| 12 | 16.00 | 16 | **16** | 小四号/正文/h3-h4 |
| 14 | 18.67 | 19 | **18** | 四号/h2 |
| 16 | 21.33 | 21 | **22** | 三号/h1 |
| 18 | 24.00 | 24 | **24** | 二号 |
| 20 | 26.67 | 27 | **26** | 大间距 |
| 24 | 32.00 | 32 | **32** | 超大间距 |

### 9.3 各元素的 px 值推荐标准

#### 字号系统

| 元素 | 推荐值 (px) | 对应中文字号 | 说明 |
|------|------------|-------------|------|
| html/body 基础 | **16** | 小四号 (12pt) | 全局根字号 |
| h1 一级标题 | **22** | 三号 (16pt) | 论文题目 |
| h2 二级标题 | **18** | 四号 (14pt) | 一级节 |
| h3/h4 三四级标题 | **16** | 小四号 (12pt) | 二级节/三级节 |
| h5 五级标题 | **14** | 五号 (10.5pt) | - |
| h6 六级标题 | **14** | 五号 (10.5pt) | - |
| p 正文段落 | **16** | 小四号 (12pt) | 主要文本 |
| blockquote 引用块 | **14** | 五号 (10.5pt) | 引用内容 |
| pre/code 代码块 | **14** | 五号 (10.5pt) | 代码字体 |
| table 表格文字 | **14** | 五号 (10.5pt) | 表格内容 |
| figcaption 图题 | **14** | 五号 (10.5pt) | 图片/图表标题 |
| .mermaid Mermaid | **12** | 小五号 (9pt) | 图表内文字 |
| .footnotes 脚注 | **12** | 小五号 (9pt) | 脚注/参考文献 |
| .references 参考文献 | **12** | 小五号 (9pt) | 参考文献条目 |

#### 间距系统

| 元素 | 推荐值 (px) | 说明 |
|------|------------|------|
| margin-top (h1) | **32** | 一级标题段前 |
| margin-bottom (h1) | **24** | 一级标题段后 |
| margin-top (h2) | **26** | 二级标题段前 |
| margin-bottom (h2) | **14** | 二级标题段后 |
| margin-top (h3/h4) | **18** | 三四级标题段前 |
| margin-bottom (h3) | **10** | 三级标题段后 |
| margin-bottom (h4) | **8** | 四级标题段后 |
| margin (hr 分割线) | **32** | 分割线上下间距 |
| margin (blockquote) | **10** | 引用块上下间距 |
| margin (table) | **18** | 表格外边距 |
| margin (pre 代码块) | **16** | 代码块外边距 |
| margin (figure) | **16** | 图片外边距 |
| padding (th/td) | **8×10** | 表格单元格内边距 |
| border-width (三线表) | **2** | 表格顶线/底线/栏目线 |
| border-width (引用块左侧) | **3** | 引用块竖线宽度 |

### 9.4 特殊情况处理

#### 允许使用非 px 单位的场景

| 场景 | 允许的单位 | 示例 | 说明 |
|------|-----------|------|------|
| 页面尺寸 | `mm` | `max-width: 210mm` | A4 纸张规格 |
| 相对字号 | `em` | `font-size: 0.88em` | 内联代码相对正文缩小 |
| 百分比宽度 | `%` | `width: 100%` | 表格/容器宽度 |
| 无单位 | `0` | `margin: 0` | 零值无需单位 |
| 透明度/Alpha | 无单位 | `rgba(0,0,0,0.12)` | 颜色透明度 |
| 行高倍率 | 无单位 | `line-height: 1.5` | 相对行高 |

#### 必须保持为 1px 的场景

| 属性 | 值 | 说明 |
|------|-----|------|
| 细边框 | `1px solid` | 分割线、表格竖线（需最细效果） |
| 内联代码边框 | `border: none` 或 `1px` | 通常无边框或极细边框 |

### 9.5 迁移指南：从 pt 到 px

#### 自动化转换脚本

```bash
# 使用 sed 批量替换（示例）
sed -i 's/12pt/16px/g; s/10\.5pt/14px/g; s/9pt/12px/g' theme.css
```

#### 手动验证清单

- [ ] 运行 `grep -n "pt" theme.css` 确认无残留
- [ ] 在浏览器中预览确认视觉大小符合预期
- [ ] 导出 PDF 验证字号与屏幕显示一致
- [ ] 检查打印预览 (@media print) 是否同步更新

### 9.6 设计理由

采用 **px 偶数整数** 规范的理由：

1. **跨平台一致性**：px 在所有现代浏览器和 PDF 渲染引擎中的定义一致（1/96 inch）
2. **避免缩放损失**：消除 CSS→PDF 转换时的 25% 尺寸差异
3. **渲染优化**：偶数像素值在次像素渲染（sub-pixel rendering）中表现更优，避免模糊
4. **可维护性**：整数比小数更易读、易比较、易计算
5. **GB/T 7713 合规**：确保学术论文排版在屏幕和印刷品上的视觉效果一致

---

## 10. 现有主题对标

| 主题 | 行数 | 范式符合度 | 迁移建议 |
|------|------|-----------|---------|
| `guizang.css` | ~700 | 中（变量驱动，但选择器冗长） | 可精简至 ~200 行 |
| `elegant.css` | ~750 | 中 | 可精简至 ~200 行 |
| `forest-ink.css` | ~750 | 中 | 可精简至 ~200 行 |
| `pixso-design.css` | ~700 | 中 | 可精简至 ~200 行 |
| `academic-paper.css` | ~1300 | 低（大量 GB/T 7713 专用选择器） | 适当保留专用规则 |

---

## 11. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v3.3 | 2026-05-23 | 新增 Section 9「单位使用规范」：强制使用 px 单位、pt→px 转换公式、偶数整数推荐标准、迁移指南 |
| v3.2 | 2026-05-23 | 新增 Section 2「设计规范」：色彩空间、字体搭配、表面层次、线条边框的强制性约束（含 Rule ID、WCAG 对比度公式、色彩协调矩阵），支持 AI Agent 程序化验证 |
| v3.1 | 2026-05-23 | 新增「打印保真」原则与完整 `@media print` 规范（Section 6） |
| v3.0 | 2026-05-23 | 初始范式定义。提出种子色板 + 语义映射 + 内置继承的三层架构 |
