// 主题契约的唯一数据源。
//
// `themes/contract.json` 随 npm 包发布，下游主题工具链直接读它；库导出也只从这份
// 数据里取活变量清单，避免 TypeScript 与 JSON 各存一份、发版后互相漂移。
import contractData from '../../themes/contract.json'

export interface ThemeContract {
  contractVersion: string
  liveVariables: string[]
  deadVariables: string[]
  deadSelectors: string[]
  editorHooks: string[]
  peleVariables: string[]
  constraints: {
    rootOnly: boolean
    ptUnitsForbidden: boolean
    verticalPaddingForbiddenOn: string[]
  }
}

export const THEME_CONTRACT = contractData as ThemeContract
export const CONTRACT_VERSION = THEME_CONTRACT.contractVersion
