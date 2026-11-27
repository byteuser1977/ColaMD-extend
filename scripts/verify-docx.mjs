#!/usr/bin/env node
// Word 导出的验收：把产物解包，量 XML 结构。
//
// 为什么需要它：#202 报的三个毛病（字体写死 Menlo 导致 Windows 上代码块变符号乱码、
// 多行代码没有真换行、代码段落继承两端对齐把键值顶到两边）都是 **Windows 才能看见** 的，
// 在 mac 上导出一次看起来完全正常。所以判据只能落到 document.xml 上：
// 字体槽位里有平台等宽字体和中文回退、每行代码之间有一个 <w:br/>、代码段落显式左对齐。
//
// 用法: npm run verify:docx
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

// Windows 上 pathname 是 `/D:/...`，做不成 cwd 和路径，fileURLToPath 跨平台
const APP = fileURLToPath(new URL('..', import.meta.url))
// 工作目录放 node_modules/.cache：本机系统 TEMP 对 esbuild 子进程不可写（EACCES），
// verify-markdown 的产物一直落在这里且跨平台可用，保持同一约定。
const WORK = join(APP, 'node_modules', '.cache', 'colamd-verify', 'docx')
rmSync(WORK, { recursive: true, force: true })
mkdirSync(WORK, { recursive: true })

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`✓ ${name}`)
  } else {
    failed += 1
    console.log(`✗ ${name} ${detail}`)
  }
}

// 主进程模块 import 了 electron（nativeImage）。这个脚本在纯 node 里跑，给一个桩：
// 代码块那条路径根本不碰图片，桩只需要存在。
const stub = join(WORK, 'electron-stub.cjs')
writeFileSync(stub, 'module.exports = { nativeImage: { createFromDataURL: () => ({ isEmpty: () => true }), createFromPath: () => ({ isEmpty: () => true }) } }\n')
const bundle = join(WORK, 'docx-export.cjs')
// 用 esbuild 的 JS API 而不是 spawn npx：Windows 上没有 npx 这个可执行文件
// （只有 npx.cmd，不带 shell 的 spawn 找不到，一律 ENOENT），JS API 跨平台都能跑。
await build({
  entryPoints: [join(APP, 'src/main/docx-export.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  alias: { electron: stub },
  outfile: bundle,
  logLevel: 'error',
})

const CODE = ['{', '  "key": "值",', '', '  "nested": {', '    "a": 1', '  }', '}'].join('\n')
const fixture = [
  '# 导出验证',
  '',
  '正文里有 `行内代码` 和中文。',
  '',
  '```json',
  CODE,
  '```',
  '',
  '> 引用第一段',
  '>',
  '> 引用第二段',
  '',
].join('\n')

const require_ = createRequire(import.meta.url)
const { markdownToDocx } = require_(bundle)

// docx 本质是 zip。macOS/Linux 自带 unzip；Windows 没有，借 PowerShell 的
// Expand-Archive 兜底（它只认 .zip 后缀，复制一份再解）。
function readDocxDocumentXml(docxPath) {
  try {
    return execFileSync('unzip', ['-p', docxPath, 'word/document.xml']).toString('utf8')
  } catch {}
  if (process.platform === 'win32') {
    const zipCopy = join(WORK, 'out.zip')
    const outDir = join(WORK, 'unzipped')
    copyFileSync(docxPath, zipCopy)
    execFileSync('powershell.exe', ['-NoProfile', '-Command',
      `Expand-Archive -LiteralPath '${zipCopy}' -DestinationPath '${outDir}' -Force`])
    return readFileSync(join(outDir, 'word', 'document.xml'), 'utf8')
  }
  throw new Error('no unzip available')
}

const docxPath = join(WORK, 'out.docx')
writeFileSync(docxPath, await markdownToDocx({ content: fixture, sourcePath: null }))

let xml = ''
try {
  xml = readDocxDocumentXml(docxPath)
} catch {
  console.log('✗ 解不开 docx（缺 unzip？）')
  process.exitCode = 1
  rmSync(WORK, { recursive: true, force: true })
  process.exit()
}

// 1. 字体：代码不能写死 macOS 字体，四个槽位里要有平台等宽字体 + 中文回退
const fontSlots = [...xml.matchAll(/<w:rFonts ([^/>]*)\/>/g)].map((m) => m[1])
const codeSlots = fontSlots.filter((slot) => /(Menlo|Consolas|DejaVu Sans Mono)/.test(slot))
check('代码字体不是写死的 Menlo', codeSlots.length > 0 && codeSlots.every((slot) => /w:eastAsia="/.test(slot)),
  `代码 run 的字体槽位=${JSON.stringify(codeSlots.slice(0, 2))}`)
check('代码字体按平台选（macOS 是 Menlo）', codeSlots.every((slot) => process.platform !== 'darwin' || /w:ascii="Menlo"/.test(slot)))

// 2. 换行：每行代码之间要有一个 <w:br/>，不能只有一个塞着 \n 的 <w:t>
// 引用块现在是独立段落（不再用 br 拼接），所以期望值就是 codeLines - 1。
const breaks = (xml.match(/<w:br\/>/g) ?? []).length
const codeLines = CODE.split('\n').length
check('代码块每行之间是 <w:br/>，不是自动折行', breaks === codeLines - 1,
  `<w:br/> ${breaks} 个，期望 ${codeLines - 1}`)
check('代码里没有塞进 <w:t> 的换行符', !/<w:t[^>]*>[^<]*\n[^<]*<\/w:t>/.test(xml))

// 3. 对齐与拼写检查：代码段落显式左对齐，变量名不带红波浪线
check('代码段落显式左对齐', /w:jc w:val="left"/.test(xml))
check('代码 run 关掉拼写检查', (xml.match(/<w:noProof\/>/g) ?? []).length >= codeLines)
check('代码里的空格保留（xml:space）', /<w:t xml:space="preserve">\s{2}&quot;key&quot;/.test(xml))

// 4. 内容不丢
check('中文注释保留', xml.includes('值'))
check('引用两段都在，且没有挤成一段', xml.includes('引用第一段') && xml.includes('引用第二段'))
check('标题保留', xml.includes('导出验证'))

// 5. 列表项以表格或代码开头时，后面的段落不能被提到它们前面
const listFixture = [
  '- | 表头甲 | 表头乙 |',
  '  |---|---|',
  '  | 格一 | 格二 |',
  '',
  '  表格后的段落',
  '- ```',
  '  代码行',
  '  ```',
  '',
  '  代码后的段落',
  '- 普通项文字',
  '',
].join('\n')
const listPath = join(WORK, 'list.docx')
writeFileSync(listPath, await markdownToDocx({ content: listFixture, sourcePath: null }))
const listXml = readDocxDocumentXml(listPath)
const at = (text) => listXml.indexOf(text)
check('列表项里表格在后续段落之前', at('表头甲') >= 0 && at('表头甲') < at('表格后的段落'), `表格 ${at('表头甲')} 段落 ${at('表格后的段落')}`)
check('列表项里代码在后续段落之前', at('代码行') >= 0 && at('代码行') < at('代码后的段落'), `代码 ${at('代码行')} 段落 ${at('代码后的段落')}`)
// 本地导出器的列表符号走 Word 原生编号（w:numPr），不是字面 `• ` 文本：
// 以段落开头的项，段落文字必须落在带编号属性的列表段落里，而不是符号后面另起一段。
const paragraphItem = listXml.match(/<w:p\b(?:(?!<\/w:p>).)*普通项文字(?:(?!<\/w:p>).)*<\/w:p>/s)
check('以段落开头的项仍和符号同一行', !!paragraphItem && paragraphItem[0].includes('w:numPr'),
  paragraphItem ? '普通项文字所在段落带编号属性' : '没找到普通项文字所在段落')

mkdirSync(WORK, { recursive: true })
rmSync(WORK, { recursive: true, force: true })
console.log(`\n${passed} passed / ${failed} failed`)
if (failed > 0) process.exitCode = 1
