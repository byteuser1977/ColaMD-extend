#!/usr/bin/env node
/**
 * Android 构建调度：npm run build → cap sync android → gradlew assemble[Debug|Release]。
 * 跨平台：Windows 用 gradlew.bat，其余用 ./gradlew。JDK 由环境变量 JAVA_HOME 提供，
 * 不写死任何机器的路径（1.5.2 的脚本写死了 macOS Homebrew，Windows 上跑不了）。
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const mode = process.argv[2] === 'release' ? 'Release' : 'Debug'

function run(cmd, args, opts = {}) {
  // 不用 shell：node 自身路径常带空格（D:\Program Files\...），经 shell 会被截断；
  // gradlew.bat 的调用单独传 shell（路径无空格）
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run(process.execPath, ['node_modules/electron-vite/bin/electron-vite.js', 'build'])
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'])

const gradleDir = join(root, 'android')
const isWin = process.platform === 'win32'
const gradlew = isWin ? join(gradleDir, 'gradlew.bat') : join(gradleDir, 'gradlew')
if (!existsSync(gradleDir)) {
  console.error('android/ 工程不存在——先确认仓库里有 android/ 目录')
  process.exit(1)
}
if (!process.env.JAVA_HOME) {
  console.error('未设置 JAVA_HOME，gradle 需要 JDK 17+（推荐 21）')
  process.exit(1)
}
run(gradlew, [`assemble${mode}`], { cwd: gradleDir, shell: true })

const apk = join(gradleDir, 'app', 'build', 'outputs', 'apk', mode.toLowerCase(), `app-${mode.toLowerCase()}.apk`)
console.log(`\nAPK: ${existsSync(apk) ? apk : '(查看 gradle 输出确认产物路径)'}`)
