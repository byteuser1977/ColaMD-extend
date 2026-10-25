// 库验收用的离屏窗口：加载传给它的 URL，不占用屏幕、不抢焦点。
//
// 与 scripts/offscreen-window.cjs 同一套做法：Chromium 的 --window-position 对
// Electron 的 BrowserWindow 不生效，所以建窗后在主进程里自己挪。
const { app, BrowserWindow } = require('electron')

const FAR_AWAY = -100000

app.on('browser-window-created', (_event, win) => {
  try {
    win.setOpacity(0)
    win.setPosition(FAR_AWAY, FAR_AWAY)
    win.setFocusable(false)
    win.blur()
    if (process.platform === 'darwin') app.hide()
  } catch {
    // 窗口已经关了，不关我们的事
  }
})

app.whenReady().then(() => {
  const url = process.argv[2]
  const win = new BrowserWindow({ show: true, width: 1200, height: 900, backgroundColor: '#ffffff' })
  void win.loadURL(url)
})

app.on('window-all-closed', () => app.quit())
