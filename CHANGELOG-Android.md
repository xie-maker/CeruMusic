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

## 2026-05-29 — 阶段 1：渲染进程迁移

### 完成内容

#### 1. 渲染进程文件迁移（40+ 个文件）
- 将所有 `window.api.*` / `window.electron.*` 调用迁移到 `getPlatformService().*`
- 迁移范围：store（4）、api（1）、utils（5）、views（14）、components（22）、services（3）
- 仅 DeskTopLyric.vue（桌面专属悬浮歌词）保留 window.electron

#### 2. PlatformService 接口补充
- 添加 `music.on` / `music.removeAllListeners`（IPC 事件监听）
- 添加 `localMusic` 缺失方法：`getUrlById`, `getDirs`, `setDirs`, `getList`, `batchMatch`, `getCoverBase64`, `onBatchMatchProgress`, `onBatchMatchFinished`, `removeBatchMatchListeners`, `clearIndex`
- 添加 `file.readFile`、`thumbar`、`app` 命名空间

#### 3. 问题修复
- 修复 Provider.vue 事件监听语义错误（`music.invoke('on', ...)` → `music.on(...)`）
- 修复 `music.request` 方法不存在（→ `music.requestSdk`）
- 修复 App.vue / Provider.vue 残留 window.api 引用

### 技术决策
- IPC 事件监听使用 `music.on(channel, callback)` 模式，返回取消订阅函数
- `thumbar` 和 `app` 设为可选属性（`?`），桌面端专属功能

---

## 2026-05-29 — 阶段 2：Capacitor 引导

### 完成内容

#### 1. Capacitor 依赖安装
- 安装 `@capacitor/core`、`@capacitor/cli`、`@capacitor/android` 8.3.4
- 使用 `--ignore-scripts` 绕过 phantomjs 安装问题

#### 2. Capacitor 配置
- 创建 `capacitor.config.ts`
- appId: `com.cerumusic.app`
- appName: `澜音`
- webDir: `out/renderer`
- 启用 CapacitorHttp（绕过 CORS）
- 配置 androidScheme: `https`

#### 3. Android 项目初始化
- 运行 `npx cap add android` 成功
- 生成 `android/` 目录，包含完整 Android 项目结构
- Web 资源已同步到 `android/app/src/main/assets/public/`

#### 4. 构建脚本
- 添加 `build:android` — 构建 Web + 同步到 Android
- 添加 `build:web` — 仅构建 Web（跳过类型检查）
- 添加 `cap:sync` — 同步 Web 资源
- 添加 `cap:open` — 打开 Android Studio

### 技术决策
- 启用 CapacitorHttp 内置 CORS 绕过，音乐 SDK HTTP 请求可在 WebView 中直接运行
- 使用 `https` scheme 确保与 Web API 兼容

---

## 2026-05-29 — 阶段 3：高优先级功能（部分完成）

### 完成内容

#### 1. 音乐 SDK 浏览器化
- **browserRequest.ts** — 浏览器版 HTTP 层，使用 fetch() 替代 axios，支持 CapacitorHttp 原生桥接
- **browserCrypto.ts** — 浏览器版加密工具，使用 crypto-js 替代 Node.js crypto
- **cryptoShim.ts** — Node.js crypto 兼容层，提供 createHash/createCipheriv/createDecipheriv 等 API
- **音乐源模块** — 复制 wy/tx/kg/kw/mg/bd/git 到渲染进程，修改 import 路径
- **browser.ts** — 浏览器版 SDK 入口，聚合搜索 + 跨源匹配

#### 2. SQLite 歌单数据库
- 安装 `@capacitor-community/sqlite` + `jeep-sqlite`
- **CapacitorSongListService.ts** — 完整歌单 CRUD 实现
  - playlists 表 + playlist_songs 表
  - 支持创建/删除/编辑/搜索歌单
  - 支持添加/移除/排序歌曲
- **CapacitorPlatform.songList** — 已接入 SQLite 服务

#### 3. CapacitorPlatform.music.requestSdk 实现
- 动态导入浏览器版 SDK
- 支持所有音乐源的 search/tipSearch/getMusicUrl/getLyric 等方法

### 待实现（需要原生 Android 开发）
- 本地音乐扫描 — 需要 CeruMediaStorePlugin（Android MediaStore API）
- 下载管理器 — 需要 CeruDownloadPlugin（Android DownloadManager）

### 技术决策
- 音乐 SDK 使用动态 import() 延迟加载，减少初始包大小
- SQLite 使用 localStorage 存储 favoritesHashId（简单键值对）
- 加密模块使用 crypto-js 库（兼容性好）

---

## 2026-05-29 — 阶段 4：中优先级功能

### 完成内容

#### 1. 插件系统浏览器化
- **BrowserPluginService.ts** — Web Worker 沙箱
  - 从 URL 或代码加载插件
  - 提供 cerumusic API（buffer、crypto、request）
  - 支持调用插件方法（search、getMusicUrl 等）
- **CapacitorPlatform.plugins** — 已接入浏览器插件服务

#### 2. 媒体通知集成
- **CapacitorMediaSessionService.ts** — 媒体会话管理
  - setMetadata / setPlaybackState / setPosition
  - 监听 play/pause/next/prev/stop/seekto 事件
- 安装 `@capgo/capacitor-media-session`

#### 3. 其他功能
- 剪贴板 — `@capacitor/clipboard`
- App 生命周期 — `@capacitor/app`
- 原生分享 — `@capacitor/share`

### Code Review 修复
- thumbar/app 改为 getter 延迟求值
- StubPlatform.music.on 返回 noop 而非抛异常
- pluginNotice 正确处理取消订阅（修复内存泄漏）
- music.requestSdk 添加 args 空值保护

### 技术决策
- 插件使用 Web Worker 沙箱（替代 Node.js worker_threads）
- 媒体通知使用 @capgo/capacitor-media-session（社区维护，功能完整）

---

## 2026-05-29 — 阶段 5：UI 适配

### 完成内容

#### 1. 响应式布局
- **useIsMobile.ts** — 检测移动端视图（< 768px）
- 支持 isMobile / isTablet / isDesktop 状态

#### 2. 移动端导航
- **BottomTabBar.vue** — 底部标签栏（首页/搜索/歌单/设置）
- **MobileLayout.vue** — 移动端布局容器（支持迷你播放器）

#### 3. 组件适配
- **HomeLayout.vue** — 条件渲染移动端/桌面端布局
- **TitleBarControls.vue** — 移动端隐藏（安卓有系统导航）

### 技术决策
- 移动端使用底部标签栏替代桌面端侧边栏
- 使用 CSS `env(safe-area-inset-*)` 处理刘海/圆角

---

## 后续计划

| 阶段 | 内容 | 预计工期 |
|------|------|----------|
| 阶段 3 剩余 | 本地音乐扫描 + 下载管理器（原生插件） | 2-3 天 |
| 阶段 6 | 测试与发布 | 2-3 天 |

详细方案见：[澜音安卓端移植方案.md](澜音安卓端移植方案.md)
