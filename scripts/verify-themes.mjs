#!/usr/bin/env node
// 主题验收：`themes/*.css` 里的每一条规则都必须**命中真实的 DOM 元素**，并且真的改变
// 至少一个属性。内置主题的 `body.theme-*` 规则也在检查范围内。
//
// 为什么需要它：换编辑器内核的时候，Milkdown/ProseMirror 的 DOM 没了，根目录 `themes/`
// 里 10 套主题还留着一堆 `#editor .ProseMirror strong { … }`，选择器永远匹配不到东西，
// 于是「下载了主题，加粗和标题的颜色却没变」。这类失效不会报错、不会崩溃，肉眼也只在
// 换主题的瞬间才看得出来，所以它必须有断言：没人用的选择器 = 红。
//
// 判据与进程内探针在 theme-verify-core.mjs 里，独立 CLI 也复用同一份。
//
// 用法: npm run verify:themes（先 npm run build）
// 窗口放在屏幕外，不占用屏幕。
import { join } from 'node:path'

import { assertBuildFresh } from './build-freshness.mjs'
import { APP_ROOT, ELECTRON_BIN, stopVerifyApp, verifyWorkdir } from './verify-workdir.mjs'
import { readThemeDirectory, runThemeHitCheck } from './theme-verify-core.mjs'

const APP = APP_ROOT
assertBuildFresh()
const { dir, udd } = verifyWorkdir('themes')
const THEMES = join(APP, 'themes')

async function main() {
  const themes = readThemeDirectory(THEMES)
  const failures = await runThemeHitCheck({
    appRoot: APP,
    electronBin: ELECTRON_BIN,
    themes,
    includeBuiltin: true,
    workDir: dir,
    userDataDir: udd,
    onCleanup: () => stopVerifyApp(udd)
  })

  console.log(failures === 0 ? '\n主题验收通过 ✓' : `\n主题验收失败：${failures} 项`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
