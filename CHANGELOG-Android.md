# 澜音安卓端移植 - 更新日志

## 项目信息

- **GitHub 仓库：** https://github.com/xie-maker/CeruMusic
- **原始项目：** timeshiftsauce/CeruMusic
- **技术方案：** Capacitor 8 + Vue 3 平台服务抽象层

---

## 2026-05-29 — 阶段 0：准备工作

### 完成内容

#### 1. GitHub 仓库创建与代码推送
- 创建仓库 `xie-maker/CeruMusic`
- 精简仓库体积：移除大文件（字体 7.4MB、视频 4.3MB、docs 目录）
- 推送初始代码

#### 2. 平台服务抽象层（`src/common/platform/`）
- **`types.ts`** — `PlatformService` 接口定义，源自 `src/preload/index.d.ts` 的 `CustomAPI`，包含全部 15 个 API 命名空间（音乐SDK/歌单/下载/插件/AI/剪贴板等）
- **`detect.ts`** — 运行时平台检测，自动识别 Electron / Capacitor / Web 环境
- **`index.ts`** — 单例访问器 `getPlatformService()`，渲染进程统一调用入口

#### 3. 平台实现
- **`electron/ElectronPlatform.ts`** — 桌面端实现，纯透传 `window.api.*`，零行为变更
- **`capacitor/CapacitorPlatform.ts`** — 安卓端骨架，待阶段 3 填充具体功能
- **`stub/StubPlatform.ts`** — 不支持功能的友好降级（返回空数据或提示信息）

#### 4. 构建验证
- `electron-vite build` 构建成功，平台抽象层不影响现有桌面端功能

### 技术决策
- 选择 Capacitor 8.3.4（最新版，Android 14+ 支持）
- 发现 CapacitorHttp 内置 CORS 绕过，音乐 SDK 可在浏览器端运行
- 插件沙箱方案：SES + Web Worker（替代原计划的 WebView 方案）

---

## 后续计划

| 阶段 | 内容 | 预计工期 |
|------|------|----------|
| 阶段 1 | 渲染进程迁移到 PlatformService（46 个文件） | 3-5 天 |
| 阶段 2 | Capacitor 引导（安装 + 配置 + 安卓项目） | 1-2 天 |
| 阶段 3 | 高优先级功能（音乐SDK/SQLite/本地音乐/下载） | 5-7 天 |
| 阶段 4 | 中优先级功能（插件系统/媒体通知/AI） | 3-5 天 |
| 阶段 5 | UI 适配（响应式/底部导航/触摸手势） | 2-3 天 |
| 阶段 6 | 测试与发布 | 2-3 天 |

详细方案见：[澜音安卓端移植方案.md](澜音安卓端移植方案.md)
