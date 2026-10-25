#!/usr/bin/env node
// 主题契约校验：`themes/contract.json` 必须与当前版本的源码保持同步。
//
// 这份契约是给下游主题工具链读的（ColaMD-themes 的 validateThemeCss 直接消费），
// 所以它不能靠人工对源码维护。这里逐项核对：
//   - contractVersion 与 package.json 一致；
//   - editorHooks 覆盖 CSS 里全部 cm-md-* 钩子，另加运行时状态钩子；
//   - peleVariables 与 editor-preview.css 的声明一致；
//   - 活变量真的被 var() 消费，死变量真的没人用；
//   - 独立主题文件只定义活变量或死变量；
//   - 死选择器不出现在独立主题文件里。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes', 'contract.json'), 'utf8'))
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8')
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function uniqueSorted(values) {
  return [...new Set(values)].sort()
}

const editorPreview = read('src/renderer/themes/editor-preview.css')
const livePreview = read('src/renderer/editor/live-preview.ts')
const cssHooks = uniqueSorted([...editorPreview.matchAll(/cm-md-[a-zA-Z0-9-]+/g)].map((m) => m[0]))
const contractHooks = uniqueSorted(contract.editorHooks)
const runtimeHooks = contractHooks.filter((hook) => !cssHooks.includes(hook))

assert.equal(contract.contractVersion, pkg.version, 'contractVersion 必须等于 package.json 的 version')
assert.equal(contractHooks.length, 49, 'editorHooks 必须是 49 个')
assert.deepEqual(
  contractHooks.filter((hook) => cssHooks.includes(hook)),
  cssHooks,
  'editorHooks 必须包含 editor-preview.css 里的全部 cm-md-* 钩子'
)
assert.deepEqual(runtimeHooks, ['cm-md-mermaid-ready'], '除 CSS 钩子外只允许登记运行时状态钩子 cm-md-mermaid-ready')
assert.ok(livePreview.includes('cm-md-mermaid-ready'), '运行时钩子 cm-md-mermaid-ready 必须真实存在于 live-preview.ts')

const peleVariables = uniqueSorted(
  [...editorPreview.matchAll(/--pele-[a-z-]+:/g)].map((match) => match[0].slice(0, -1))
)
assert.deepEqual(uniqueSorted(contract.peleVariables), peleVariables, 'peleVariables 必须与 editor-preview.css 的声明一致')

const sourceText = walk(path.join(ROOT, 'src'))
  .filter((file) => file.endsWith('.ts') || file.endsWith('.css'))
  .map((file) => fs.readFileSync(file, 'utf8'))
  .join('\n')

const peleSet = new Set(contract.peleVariables)
for (const name of contract.liveVariables) {
  assert.ok(name.startsWith('--'), `活变量必须带 -- 前缀：${name}`)
  if (peleSet.has(name)) continue
  assert.ok(sourceText.includes(`var(${name}`), `活变量没有被任何样式消费：${name}`)
}

const liveSet = new Set(contract.liveVariables)
const deadSet = new Set(contract.deadVariables)
const themeFiles = fs.readdirSync(path.join(ROOT, 'themes')).filter((file) => file.endsWith('.css'))
const themeText = themeFiles.map((file) => {
  return { file, text: fs.readFileSync(path.join(ROOT, 'themes', file), 'utf8') }
})

for (const name of contract.deadVariables) {
  assert.ok(name.startsWith('--'), `死变量必须带 -- 前缀：${name}`)
  assert.ok(!sourceText.includes(`var(${name}`), `死变量仍被源码消费：${name}`)
  for (const theme of themeText) {
    assert.ok(!theme.text.includes(`var(${name}`), `死变量仍被 ${theme.file} 消费：${name}`)
  }
}

for (const theme of themeText) {
  const defined = uniqueSorted([...theme.text.matchAll(/--[a-z0-9-]+:/g)].map((match) => match[0].slice(0, -1)))
  for (const name of defined) {
    assert.ok(
      liveSet.has(name) || deadSet.has(name),
      `${theme.file} 定义了契约之外的变量：${name}`
    )
  }
}

const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
for (const theme of themeText) {
  const css = withoutComments(theme.text)
  for (const selector of contract.deadSelectors) {
    const present = selector === 'body.theme-*'
      ? /body\.theme-/.test(css)
      : css.includes(selector)
    assert.ok(!present, `${theme.file} 使用了死选择器：${selector}`)
  }
}

console.log(
  `主题契约通过：${contract.contractVersion}，${contract.liveVariables.length} 个活变量，` +
  `${contractHooks.length} 个编辑器钩子（${cssHooks.length} CSS + ${runtimeHooks.length} 运行时），` +
  `${contract.peleVariables.length} 个 Pele 变量。`
)
