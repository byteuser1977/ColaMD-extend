<!-- deck-logo: data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%23c44b2b' stroke-width='4'/%3E%3C/svg%3E -->

<!-- deck-brand: ColaMD Extend -->

<!-- deck-title: 幻灯片版式系统 -->

<!-- deck-meta: 2026-11 · 内部演示 -->

# 幻灯片版式示例

一篇文档切完 `---` 之后，每一页可以声明一种版式：分隔线后第一行写 `<!-- slide: 版式名 -->`。这份示例每种版式一页，放映（⌘⇧P）看效果。

文件顶部那几行 `<!-- deck-*: … -->` 是 deck 级公共元素：logo、品牌名、标题、副标题，放映与导出时印在每页的固定位置，cover/section/closing 幕封页自动隐藏。

内置版式十种：cover（封面）、section（章节）、agenda（议程）、kpi（关键数字）、timeline（时间轴）、steps（步骤）、matrix（卡片矩阵）、two-col（双栏）、quote（引言）、closing（收束）。页内还可以写 `<!-- slide-css -->` 微调本页样式、`<!-- slide-js -->` 挂放映脚本（跑在沙箱里，离场即回收），示例见「页内样式微调」与「会动的章节条」两页。

---

<!-- slide: cover -->

# 幻灯片版式

## cover · 主视觉封面

标题放大，副标题压淡，标题下一段强调色短杠

---

<!-- slide: agenda -->

## 今日议程

1. **开胃** 封面与章节
2. **正餐** 数据版式四件套
3. **甜点** 双栏与引言
4. **打包** 收束与行动项

---

<!-- slide: section -->

## 第一幕 · 数据的讲法

数字自己会说话，版式只负责给它一个台子

---

<!-- slide: kpi -->

## 年度关键数字

- **3.2 亿** 用户规模
- **47%** 年增长率
- **12 项** 行业奖项
- **0 漏洞** 依赖安全

---

<!-- slide: timeline -->

## 三年历程

- **2024** 编辑器内核重写
- **2025** 导出全家桶补齐
- **2026** 版式系统登场

---

<!-- slide: steps -->

## 三步上手

- **一** 在页首写指令
- **二** 放映看效果
- **三** 导出成 PDF

---

<!-- slide: matrix -->

## 页内样式微调

- **slide-css** 样式只作用于本页
- **白名单** 拒绝绝对定位与伪协议
- **随主题** 变量照常生效

<!-- slide-css
.cm-md-slide-matrix.cm-md-li {
  background: color-mix(in srgb, var(--pele-accent) 7%, transparent);
  border-color: var(--pele-accent);
}
-->

---

<!-- slide: section -->

## 会动的章节条

脚本每 0.7 秒推进一步 CSS 变量，下面的横线就自己长满整页——`slide.setVar` 与 `slide.setClass` 是放映脚本影响页面的仅有的两个出口，脚本本体跑在沙箱 iframe 里，离场即回收。

<!-- slide-css
.cm-md-hr {
  display: block;
  width: calc(var(--slide-demo, 0) * 1%);
  height: 4px;
  font-size: 0;
  color: transparent;
  background: var(--pele-accent);
  margin: 2.5em 0 0;
  border: none;
  transition: width 1.1s ease;
}
-->

<!-- slide-js
[15, 40, 70, 100].forEach(function (w, i) {
  slide.setTimeout(function () { slide.setVar('slide-demo', String(w)); }, 700 * (i + 1));
});
-->

***

---

<!-- slide: two-col -->

## 双栏的用法

左边放论点，右边放论据；或者左右各摆一个方案做对比。栏宽由放映画面决定，导出时退化为两列并排。

## 再来一栏

Markdown 的标题、列表、图表在两栏里各自渲染，`---` 仍然是唯一的分页符。

---

<!-- slide: quote -->
> 版式是内容的礼服：合身的时候没人注意到它，不合身的时候人人都在议论它。

匿名设计师

---

<!-- slide: closing -->

## 回家作业

- 挑一份自己的文档
- 给每页挑一种版式
- 放映一遍，导出一份

---

这就是全部十种版式。自定义主题可以覆盖任何一页的任何细节——版式类名（`cm-md-slide-*`）与 Markdown 结构（标题、列表、引用）就是全部的约定。
