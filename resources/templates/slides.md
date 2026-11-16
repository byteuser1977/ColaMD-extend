<!-- 这是一份 Markdown PPT 模板。放映：视图 → 放映幻灯片（⌘⇧P）。

     写法约定：
     - deck 块只在文档最上面写一次，配置 logo、品牌名、报告名、日期。
     - 每页一个 slide 块：第一行是版式，后面是 kicker（标题上方小字）、
       label（顶栏左侧短标签）、chapter（顶栏右侧章节文案）。
     - 一页只有一个页标题，写在 slide 块下面。封面用 #，章节页和
       内容页用 ##，两种写法在幻灯片里同样大。
     - 标题后的第一段自动当导语；想省掉导语就紧接列表。
     - 卡片类版式（kpi / steps / matrix）的列表一项只写一行。
     - 不写 slide 块的页自动走文章版式；Mermaid / SVG / 图片页用 figure。
     - 自定义主题：在 ~/.colamd/themes/*.css 里写
       body.theme-custom { --slide-title-font: ...;
                           --slide-cover-title-size: 5.4em;
                           --slide-chrome-opacity: .5; }
       即可定义 PPT 的标题气质、字号与 chrome 声音；也可以直接用
       body.presenting .cm-md-page-title { ... } 覆写单条规则。 -->

<!-- deck
brand: 你的品牌
title: 报告标题
meta: 2026.11 · 汇报版
-->

<!-- 需要 logo 时，在上面的 deck 块里加一行：
     logo: ./assets/logo.png
     相对路径按这份 Markdown 所在的目录解析。 -->

<!-- slide: cover
kicker: 公司深度调研
label: 报告标题
chapter: 开场
-->

# 一句话说清这份报告

## 副标题写在这里，压淡显示

标题后的第一段就是导语。用两三句话说清结论，不要在这里放论据。

---

<!-- slide: section
kicker: Act I
label: 报告标题
chapter: Act I · 章节名
-->

## 第一章 · 章节名

一句短说明，剩下的交给留白。

---

<!-- slide: agenda
kicker: Agenda
label: 今日议程
chapter: Act I · 章节名
-->

## 今日议程

1. **第一章** 章节说明
2. **第二章** 章节说明
3. **第三章** 章节说明

---

<!-- slide: kpi
kicker: Executive Summary
label: 核心数据速览
chapter: Act I · 数据
-->

## 核心数据速览

决策者一分钟能读完的版本。

- **491 万m³** 板材年产能
- **14** 产业集群
- **120 亿元** 资产规模
- **3.87 亿套** 存量住宅

---

<!-- slide: steps
kicker: Process
label: 推进路径
chapter: Act II · 方法
-->

## 三步推进

每一步只写一个动作。

- **一** 先写页头块，定版式与章节
- **二** 写页标题与导语，再放正文
- **三** 放映检查换行，导出 PDF

---

<!-- slide: two-col
kicker: Comparison
label: 方案对比
chapter: Act II · 对比
-->

## 左边放论点

左边写判断，右边写证据。两栏的宽度由放映画面决定。

## 右边放论据

- 一条证据
- 另一条证据

---

<!-- slide: quote
kicker: Key Takeaway
label: 核心判断
chapter: 收束
-->

> 版式是内容的礼服：合身的时候没人注意到它，不合身的时候人人都在议论它。

匿名设计师

---

<!-- slide: closing
kicker: Closing
label: 收束
chapter: 收束
-->

## 接下来做什么

- 挑一份自己的文档
- 给每页挑一种版式
- 放映一遍，导出一份
