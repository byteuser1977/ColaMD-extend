# ColaMD

## 产品定位

**Markdown as Database 的原生编辑器与模板渲染平台。**

### 解决的核心问题

HTML 难改——结构、样式、内容全混在一起，人改麻烦，Agent 改也要理解整个文件。

解法：把内容从 HTML 里剥离出来，放进 markdown。HTML 变成纯模板，markdown 变成数据库。改内容只改 markdown，完全不碰 HTML。

### 战略方向

- **内容层**：`.md` 文件，字段固定，人和 Agent 都能轻松编辑
- **模板层**：各种 HTML 模板（PPT、游戏化界面、博客、简历、产品落地页……）
- **ColaMD**：连接两者的工具，也是这个生态的入口

一份 markdown，多种渲染形态。未来第三方可以基于同一份 markdown 做自己的模板。

### 核心理念：Markdown as Database

Markdown 不只是文档，而是**结构化内容的数据源**。

- **Markdown = 数据**：用固定字段（frontmatter + 约定的 section 结构）承载内容，Agent 只需按字段改内容
- **HTML 模板 = 视图**：模板负责样式、动效、交互，不关心内容
- **解耦**：换模板就是换皮，换内容不影响模板
- **简单约定优先**：宁可让 markdown 字段固定一些，也不要让模板去猜语义

## 设计哲学

### 如非必要，勿增实体

这是 ColaMD 的第一原则。每增加一个 UI 元素、一个功能、一行代码，都要问：这是绝对必要的吗？默认答案是否。

- 不要工具栏（用户会用快捷键和 Markdown 语法）
- 不要侧边栏
- 不要状态栏
- 界面只有：标题栏（拖拽用）+ 编辑器
- 追求极致的简单，一个功能做到极致

### 核心功能优先级

1. **文件热更新**（核心卖点）— 外部 Agent 修改 .md 时自动刷新，实时看到 Agent 的工作
2. **所见即所得** — 输入 Markdown 即刻渲染为富文本
3. **主题系统** — CSS 主题，可导入自定义主题
4. **导出** — PDF、HTML

### 不做的事情

- 不做文件管理、文件树、工作区
- 不做知识库管理
- 不做云同步、协作编辑
- 不做笔记组织和标签系统
- 不加不必要的 UI 元素（工具栏、侧边栏等）

## 技术栈

- Electron（桌面跨平台）
- Milkdown（基于 ProseMirror 的 WYSIWYG Markdown 框架）
- TypeScript 严格模式
- electron-vite（构建）
- electron-builder（打包）

## 项目结构

```
src/
├── main/           # Electron 主进程
│   └── index.ts    # 窗口管理、文件 I/O、菜单、文件监听
├── preload/        # 安全 IPC 桥接
│   └── index.ts
└── renderer/       # 渲染进程
    ├── index.html
    ├── main.ts     # 入口，连接编辑器和 IPC
    ├── editor/     # Milkdown 编辑器核心
    ├── themes/     # CSS 主题 + 主题管理器
    └── env.d.ts
```

## 开发规范

- TypeScript 严格模式
- 编辑器核心与 UI 解耦
- 主题 CSS 与编辑器逻辑完全分离
- 代码简洁，不过度设计
- 每个新功能先问：这是必要的吗？

### 插件系统规范

插件与主程序通过 `RendererPlugin` 接口通信，遵循**弱耦合**原则：

**1. 插件注册**

插件通过 `registerPluginModule()` 自注册（副作用导入）：

```typescript
// ✅ 正确：副作用导入，仅触发 registerPluginModule
import './editor/plugins/math-plugin'
import './editor/plugins/mermaid-plugin'

// ✅ 兜底：glob 加载可能遗漏的插件
const _pluginRegistry = import.meta.glob('./editor/plugins/*-plugin.ts', { eager: true })

// ❌ 禁止：导入插件专用函数/类型
import { awaitAllMermaidRenders } from './editor/plugins/mermaid-plugin'
```

**2. 接口驱动**

`main.ts` 只通过 `RendererPlugin` 接口方法与插件交互，**禁止**直接导入插件专用函数或硬编码插件 ID：

```typescript
// ✅ 正确：遍历插件，调用通用接口
for (const p of getAllPlugins()) p.ensureRendered?.()

// ❌ 禁止：直接导入插件专用函数
import { awaitAllMermaidRenders } from './editor/plugins/mermaid-plugin'
await awaitAllMermaidRenders()

// ❌ 禁止：硬编码插件 ID 做特殊处理
getAllPlugins().filter(p => p.id === 'mermaid')
```

**3. 功能归属**

| 逻辑类型 | 归属 |
|----------|------|
| 插件注册、schema、视图、导出能力 | 插件文件 (`*-plugin.ts`) |
| 通用插件查询、切换、导出能力发现 | `plugins/index.ts` |
| 编辑器创建、markdown 读写 | `editor/editor.ts` |
| IPC 事件路由、UI 协调 | `main.ts` |

**4. 减少 main.ts 修改**

新增插件功能时，优先在插件文件和 `plugins/index.ts` 中实现。`main.ts` 仅在需要新的 IPC 事件路由或 UI 协调时才修改。

**5. `RendererPlugin` 接口约定**

- `ensureRendered?: () => Promise<void>` — 导出前等待渲染完成
- `onThemeChange?: (theme: string) => void` — 主题切换时重新配置
- `exportCapabilities?: ExportCapability[]` — 右键导出菜单
- `nodeTypes?: string[]` — 声明插件管理的 ProseMirror 节点类型
