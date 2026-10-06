// 验收脚本的工作目录：**每个脚本固定一个路径，跑完自己擦掉**。
//
// 以前每次运行都新开 `colamd-verify-xxx-<时间戳>`，连跑几轮下来 Caches 里躺了十几个
// profile、两百多兆（2026-10-06 用户问「真的有必要开这么多 profile 吗」）。用户是在
// 自己机器上干活的，测试不该在任何地方留下残渣：同一个脚本复用同一个目录，开跑前先擦
// 干净（上一次被强杀留下的也在这一步清掉），退出时再擦一次。
//
// profile 不能所有脚本共用一份：localStorage 里存着主题、列宽这些偏好，串起来会让
// 「换个脚本跑就换了初始状态」的假红。所以是每个脚本一份，而不是全仓一份。
import { mkdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const ROOT = join(homedir(), 'Library', 'Caches', 'colamd-verify')

function wipe(path) {
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 120 })
    // 连根目录也一起收掉：跑完一轮，Caches 里一点痕迹都不该留下
    if (path !== ROOT) rmSync(ROOT, { recursive: false, force: true })
  } catch {
    // 删不掉不致命：下次开跑第一步还是擦它
  }
}

export function verifyWorkdir(name) {
  const dir = join(ROOT, name)
  // 只擦自己名下这一格，别碰 Caches 里别人的东西
  if (!dir.startsWith(`${ROOT}/`)) throw new Error(`工作目录必须落在 ${ROOT} 下：${dir}`)
  wipe(dir)
  mkdirSync(dir, { recursive: true })
  process.on('exit', () => wipe(dir))
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      wipe(dir)
      process.exit(1)
    })
  }
  return { dir, udd: join(dir, 'udd') }
}
