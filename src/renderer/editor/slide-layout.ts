// 幻灯片版式的行装饰：一个独立的 CM6 扩展。
//
// 它与 live-preview 的 collectPages 平行存在，不打不相扰：CM6 的行装饰可以叠加，
// 同一行上 `cm-md-page-N`（上游打的）和 `cm-md-slide-<版式>`（这里打的）各归各的
// field。这样上游合并永远不会撞到这里，这里的分页语义靠 scanSlideDirectives 与
// collectPages 保持同步。
//
// 为什么可以常驻（不跟随源码模式的 livePreviewCompartment 收起）：这些类的样式
// 全部以 `body.presenting` / `body.slides-printing` 前缀写在 themes/slides.css 里，
// 渲染与源码模式下没有规则命中，视觉零影响。收起反而要订阅模式切换，多一处接线。
//
// 装饰必须住在 StateField 里、用 `provide` 暴露，不能用 EditorView.decorations.compute()：
// 这是 live-preview 头注释里用一次真实崩溃换来的规矩（跨行替换只允许来自 field）。
// 这里虽只用行装饰，照做不吃亏。

import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import { RangeSetBuilder, StateField, type EditorState, type Extension } from '@codemirror/state'
import { scanSlideDirectives, publishSlideDirectives, publishDeckChrome } from './slide-directives'
import { decorationsRefreshEffect } from './live-preview'

export const SLIDE_CLASS_PREFIX = 'cm-md-slide-'
export const DIRECTIVE_CLASS = 'cm-md-slide-directive'

/** 版式名进类名前的清洗：白名单之外的字一概不认，类名注入就走不进来。 */
function layoutClass(name: string): string | null {
  return /^[a-z][a-z0-9-]*$/.test(name) ? `${SLIDE_CLASS_PREFIX}${name}` : null
}

function buildDecorations(state: EditorState): DecorationSet {
  const scan = scanSlideDirectives(state)
  // 快照给放映/导出层读：field 重算的时机就是指令变化的时机。
  publishSlideDirectives(scan.directives)
  publishDeckChrome(scan.deck, scan.linesByPage.size)

  const builder = new RangeSetBuilder<Decoration>()
  type Pending = { from: number; cls: string }
  const pending: Pending[] = []

  for (const [page, dirs] of scan.directives) {
    if (!dirs.layout) continue
    const cls = layoutClass(dirs.layout)
    if (!cls) continue
    const lines = scan.linesByPage.get(page)
    if (!lines) continue
    for (const n of lines) pending.push({ from: state.doc.line(n).from, cls })
  }
  for (const n of scan.directiveLines) {
    pending.push({ from: state.doc.line(n).from, cls: DIRECTIVE_CLASS })
  }
  // RangeSetBuilder 只吃升序：两种来源合在一起排一遍。
  pending.sort((a, b) => a.from - b.from)
  for (const item of pending) {
    builder.add(item.from, item.from, Decoration.line({ class: item.cls }))
  }
  return builder.finish()
}

export const slideLayoutField = StateField.define<DecorationSet>({
  create: (state) => buildDecorations(state),
  update: (_value, tr) => {
    // 重算的两个时机：文档变了，或者语法树往前解析了一截（长文档后部的指令
    // 刚被解析出来）。选区变化不影响指令，不必跟着 live-preview 全套重算。
    if (!tr.docChanged && !tr.effects.some((effect) => effect.is(decorationsRefreshEffect))) {
      return _value
    }
    return buildDecorations(tr.state)
  },
  provide: (field) => EditorView.decorations.from(field),
})

/** 装进编辑器的入口；core.ts 的 extensions 数组里加这一条。 */
export const slideLayout: Extension = [slideLayoutField]
