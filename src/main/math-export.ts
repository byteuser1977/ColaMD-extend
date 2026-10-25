// 导出截图：与 image-export 同一条路子——隐藏窗口当相机，capturePage 取图。
//
// 为什么不用 drawImage/foreignObject 直接在前台画：KaTeX 的排版依赖它自己的
// 字体与 CSS，把 HTML 塞进 SVG 图片会丢掉字体；而导出图片本来就需要一个能加载
// 整套样式的环境。这里复用同一个机制，把「整篇文档」换成公式或 HTML 块。

import { BrowserWindow } from 'electron'
import { mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export interface ShotItem {
  html: string
  /** 给 HTML 块用：固定内容宽度；公式不传，按内容自适应。 */
  width?: number
}

export interface MathFormula {
  html: string
  block: boolean
}

export interface HtmlShotItem {
  html: string
  width: number
}

export interface MathScreenshot {
  dataURL: string
  /** CSS 像素尺寸；docx 用它作为图片在 Word 里的宽高。 */
  width: number
  height: number
}

const CAPTURE_TIMEOUT_MS = 20000
const SETTLE_MS = 20000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} 超过 ${ms}ms 没有返回`)), ms)
    promise.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })
}

function pageHTML(styles: string, color: string, background: string): string {
  // 应用自己的样式（base.css 会给 body 设主题底色、高度 100%、overflow:hidden）
  // 必须放在前面，后面这组覆盖规则才是最终生效的那一层。
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src file: http: https: data:; img-src file: http: https: data:;">
  <style>
    ${styles}
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      overflow: visible !important;
      background: ${background} !important;
      color: ${color} !important;
    }
    #stage {
      display: inline-block;
      padding: 3px;
      color: ${color} !important;
      background: ${background} !important;
    }
    #stage .katex-display { margin: 0 !important; }
    #stage .colamd-document {
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      color: ${color} !important;
      background: ${background} !important;
    }
    #stage .colamd-document > :first-child { margin-top: 0 !important; }
    #stage .colamd-document > :last-child { margin-bottom: 0 !important; }
  </style>
</head>
<body><div id="stage"></div></body>
</html>`
}

/**
 * 把一段 HTML 逐个截成 PNG。
 *
 * 每条单独设一次窗口尺寸再截：公式和 HTML 块高矮差别很大，统一尺寸会在图里留下
 * 大片空白，插进 Word 后行高也会被撑开。截图失败的那一条返回 null，调用方保留
 * 原文，一次失败不该让整篇导出失败。
 */
export async function renderShots(
  items: ShotItem[],
  styles: string,
  color: string,
  background: string,
): Promise<Array<MathScreenshot | null>> {
  if (items.length === 0) return []

  const win = new BrowserWindow({
    show: false,
    width: 900,
    height: 200,
    backgroundColor: background,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // 隐藏窗口也要出帧，否则 capturePage 等不到画面。
      backgroundThrottling: false,
    },
  })

  let dir: string | undefined
  try {
    dir = await mkdtemp(join(tmpdir(), 'colamd-math-shot-'))
    const file = join(dir, 'shot.html')
    await writeFile(file, pageHTML(styles, color, background), 'utf8')
    await win.loadFile(file)
    win.webContents.beginFrameSubscription(() => {})

    await withTimeout(
      win.webContents.executeJavaScript('document.fonts.ready.then(() => true)'),
      SETTLE_MS,
      'fonts.ready',
    )

    const shots: Array<MathScreenshot | null> = []
    for (const item of items) {
      try {
        const fixedWidth = typeof item.width === 'number' && item.width > 0 ? Math.round(item.width) : null
        const display = fixedWidth ? 'block' : 'inline-block'
        const widthValue = fixedWidth ? `${fixedWidth}px` : 'auto'
        const measured = await withTimeout(
          win.webContents.executeJavaScript(`(async () => {
            const stage = document.getElementById('stage')
            stage.style.display = ${JSON.stringify(display)}
            stage.style.width = ${JSON.stringify(widthValue)}
            stage.innerHTML = ${JSON.stringify(item.html)}
            await document.fonts.ready
            await Promise.all(Array.from(document.images).map((image) => image.complete ? undefined : new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true })
              image.addEventListener('error', resolve, { once: true })
            })))
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
            const rect = stage.getBoundingClientRect()
            return {
              width: Math.ceil(rect.width),
              height: Math.ceil(rect.height),
              scrollWidth: stage.scrollWidth,
              scrollHeight: stage.scrollHeight
            }
          })()`),
          SETTLE_MS,
          'measure shot',
        )

        const measuredWidth = fixedWidth
          ? Math.max(fixedWidth, Number(measured?.scrollWidth) || 0)
          : Math.max(Number(measured?.width) || 0, Number(measured?.scrollWidth) || 0)
        const width = Math.max(1, measuredWidth)
        const height = Math.max(1, Number(measured?.height) || 0, Number(measured?.scrollHeight) || 0)
        win.setContentSize(width, height)
        await win.webContents.executeJavaScript(
          'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
        )
        const image = await withTimeout(
          win.webContents.capturePage({ x: 0, y: 0, width, height }),
          CAPTURE_TIMEOUT_MS,
          'capturePage',
        )
        if (image.isEmpty()) {
          shots.push(null)
          continue
        }
        shots.push({ dataURL: image.toDataURL(), width, height })
      } catch (error) {
        console.error('Screenshot failed', error)
        shots.push(null)
      }
    }
    return shots
  } catch (error) {
    console.error('Screenshot window failed', error)
    return items.map(() => null)
  } finally {
    if (!win.isDestroyed()) {
      win.webContents.endFrameSubscription()
      win.destroy()
    }
    if (dir) await rm(dir, { recursive: true, force: true })
  }
}

export async function renderMathImages(
  formulas: MathFormula[],
  styles: string,
  color: string,
  background: string,
): Promise<Array<MathScreenshot | null>> {
  return renderShots(formulas.map((formula) => ({ html: formula.html })), styles, color, background)
}

export async function renderHtmlImages(
  items: HtmlShotItem[],
  styles: string,
  color: string,
  background: string,
): Promise<Array<MathScreenshot | null>> {
  return renderShots(items.map((item) => ({ html: item.html, width: item.width })), styles, color, background)
}
