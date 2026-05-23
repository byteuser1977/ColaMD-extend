# ColaMD 学术论文主题 - PDF 导出字号补偿说明

## 📋 问题背景

### 现象
- **编辑界面**（屏幕显示）：字体大小正常 ✅
- **PDF 导出**：字体偏小约 38% ❌

### 根本原因
Electron 的 `webContents.printToPDF()` 方法存在内部缩放机制：
- CSS 定义：`16px`
- PDF 实际输出：`9.8pt`（约 `0.6125` 倍）
- 缩放比例：`1px → 0.6125pt`

---

## 🎯 解决方案

### 核心思路
**只在 `@media print` 中使用补偿值，不影响屏幕显示！**

```css
/* 屏幕显示（正常） */
p { font-size: 16px; }

/* PDF 导出（补偿后） */
@media print {
    p { font-size: 20px !important; }  /* 20px × 0.6125 ≈ 12.25pt */
}
```

### 补偿计算公式
```
CSS 补偿值 = 目标 pt 值 ÷ 0.6125
结果取偶数（符合开发规范）
```

---

## 📊 字号对照表

| 元素 | 中文名 | 目标 (pt) | 屏幕 (px) | PDF补偿 (px) | 实际输出 (pt) |
|------|--------|-----------|-----------|--------------|---------------|
| **h1** | 三号 | 16pt | 22px | **26px** | ≈15.9pt ✅ |
| **h2** | 四号 | 14pt | 18px | **22px** | ≈13.5pt ✅ |
| **h3/h4** | 小四号 | 12pt | 16px | **20px** | ≈12.2pt ✅ |
| **h5/h6** | 五号 | 10.5pt | 14px | **18px** | ≈11.0pt ✅ |
| **正文 p** | 小四号 | 12pt | 16px | **20px** | ≈12.2pt ✅ |
| **blockquote** | 五号 | 10.5pt | 14px | **18px** | ≈11.0pt ✅ |
| **pre/code** | 五号 | 10.5pt | 14px | **18px** | ≈11.0pt ✅ |
| **table** | 五号 | 10.5pt | 14px | **18px** | ≈11.0pt ✅ |
| **figcaption** | 五号 | 10.5pt | 14px | **18px** | ≈11.0pt ✅ |
| **mermaid** | 小五号 | 9pt | 12px | - | 需特殊处理 |
| **footnotes** | 小五号 | 9pt | 12px | **14px** | ≈8.6pt ✅ |

---

## 🔧 技术实现细节

### 文件位置
`/themes/academic-paper.css` 的 `@media print { ... }` 块（约第 1240-1407 行）

### 关键代码示例

#### 1️⃣ 标题字号（第 1280-1285 行）
```css
/* 强制标题字号（PDF导出专用补偿值，屏幕显示不受影响） */
h1 { font-size: 26px !important; }   /* 三号：22px × 1.63 ≈ 16pt */
h2 { font-size: 22px !important; }   /* 四号：18px × 1.63 ≈ 13.5pt */
h3 { font-size: 20px !important; }   /* 小四号：16px × 1.63 ≈ 12.25pt */
h4 { font-size: 20px !important; }   /* 小四号：同上 */
h5 { font-size: 18px !important; }   /* 五号：14px × 1.63 ≈ 11pt */
h6 { font-size: 18px !important; }   /* 五号：同上 */
```

#### 2️⃣ 正文字号（第 1291 行）
```css
p {
    font-family: "SimSun", ... serif !important;
    color: var(--gray-9) !important;
    font-size: 20px !important;  /* 小四号：16px × 1.63 ≈ 12.25pt */
}
```

#### 3️⃣ 基础字号（第 1252 行）
```css
html, body {
    background: var(--gray-0) !important;
    color: var(--gray-9) !important;
    font-size: 20px !important;  /* 基础字号补偿 */
}
```

---

## ✅ 验证方法

### 方法一：使用 Python 脚本检查
```bash
python3 check_pdf_fonts.py academic-demo.pdf
```

### 方法二：手动验证
1. 在 ColaMD 中打开 Markdown 文件
2. 确认**屏幕显示正常**
3. 导出 PDF
4. 用 Adobe Acrobat 或其他工具检查实际字号

### 预期效果
- ✅ 编辑界面：所有文字大小与之前完全一致
- ✅ PDF 输出：正文约 **12.25pt**（小四号），标题符合 GB/T 7713 规范
- ✅ 无需重新构建应用（纯 CSS 修改）

---

## ⚠️ 注意事项

1. **不要修改非 @media print 的样式**
   - 只在 `@media print {}` 内使用补偿值
   - 保持屏幕显示的原始 px 值不变

2. **Mermaid 图表的特殊处理**
   - Mermaid 使用 CSS 变量 `--mermaid-font-size`
   - 当前设置为 `12px`（屏幕）
   - 如需调整 PDF 中的 Mermaid 字体，需要额外处理

3. **跨平台兼容性**
   - 补偿值基于当前环境实测（macOS + Electron）
   - Windows/Linux 可能略有差异（±0.5pt）
   - 可通过修改 `calculate_font_compensation.py` 中的 `ACTUAL_RATIO` 微调

4. **开发规范**
   - 所有 px 值必须使用**偶数整数**
   - 补偿值已按此规范取整

---

## 🛠️ 维护指南

### 如果需要微调字号
1. 打开 `/Volumes/DATA/data/develop/git/ColaMD-extend/calculate_font_compensation.py`
2. 修改 `ACTUAL_RATIO` 常量（当前值：`0.6125`）
3. 运行脚本获取新的补偿值
4. 更新 `@media print` 中的对应行

### 示例：如果实测比例变为 0.65
```python
# calculate_font_compensation.py 第 11 行
ACTUAL_RATIO = 0.65  # 从 0.6125 改为 0.65
```
运行后得到新的推荐值，再更新 CSS。

---

## 📚 相关文件

| 文件路径 | 说明 |
|---------|------|
| `themes/academic-paper.css` | 主样式文件（包含 @media print 补偿） |
| `src/main/index.ts` | Electron 主进程（printToPDF 配置） |
| `check_pdf_fonts.py` | PDF 字号检查脚本 |
| `calculate_font_compensation.py` | 补偿值计算工具 |
| `docs/theme-paradigm.md` | 开发范式文档 |

---

## 🎉 总结

通过在 `@media print` 中使用 **1.63x 补偿倍率**，完美解决了：
- ✅ 编辑界面保持正常显示
- ✅ PDF 导出符合 GB/T 7713 规范
- ✅ 无需修改应用代码
- ✅ 符合开发规范（偶数 px）

**最后更新时间**：2026-05-23
