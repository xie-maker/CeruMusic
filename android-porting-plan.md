# CeruMusic 安卓端移植方案（优化版）

## 背景

CeruMusic（澜音）是基于 Electron + Vue 3 + TypeScript 的桌面音乐播放器。目标：用 Capacitor 将其封装为安卓 App，实现电脑端和手机端互通。

**核心发现：**
- 项目 60-65% 渲染进程代码是纯 Vue/Web，音频引擎完全基于 Web Audio API，天然兼容安卓 WebView
- 主要工作在于抽象 35-40% 的 Electron 耦合代码（约 46 个文件）
- 音乐 SDK 的 HTTP 层用 axios，可通过 CapacitorHttp 原生桥接绕过 CORS

---

## 技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| Capacitor | 8.3.4 | Web → 安卓封装层 |
| @capacitor/core | 8.3.4 | 核心 + 内置 CapacitorHttp（CORS 绕过） |
| @capacitor/android | 8.3.4 | 安卓平台 |
| @capacitor-community/sqlite | 8.1.0 | 本地歌单数据库 |
| @capgo/capacitor-media-session | 8.0.24 | 安卓媒体通知/锁屏控制/蓝牙 AVRCP |
| capacitor-music-controls-plugin | 6.1.0 | 音乐播放通知控制 |
| @capacitor/filesystem | - | 文件读写 |
| @capacitor/clipboard | - | 剪贴板 |
| @capacitor/file-picker | - | 文件选择器 |
| @capacitor/app | - | 深层链接/返回键/生命周期 |
| @capacitor/status-bar | - | 状态栏主题 |
| @capacitor/share | - | 原生分享 |
| @capacitor/local-notifications | - | 本地通知 |

---

## 架构设计

### 平台服务抽象层

```
src/common/platform/
  types.ts              -- PlatformService 接口（源自 src/preload/index.d.ts 的 CustomAPI）
  detect.ts             -- 运行时平台检测（electron / capacitor / web）
  index.ts              -- 单例访问器：getPlatformService()

src/common/platform/electron/
  ElectronPlatform.ts   -- 委托给 window.api.*（桌面端行为不变）

src/common/platform/capacitor/
  CapacitorPlatform.ts  -- 委托给 Capacitor 原生插件和浏览器 API

src/common/platform/stub/
  StubPlatform.ts       -- 不支持功能的空实现（返回默认值或抛出友好错误）
```

渲染进程代码从 `window.api.xxx()` 改为 `getPlatformService().xxx()`，桌面端行为不变，安卓端走 Capacitor。

### 关键设计决策

#### 1. HTTP 层：CapacitorHttp 内置 CORS 绕过

**这是最重要的发现。** Capacitor 8 内置 `CapacitorHttp`，启用后自动将 `fetch()` 和 `XMLHttpRequest` 路由到原生 HTTP 库，绕过浏览器 CORS 限制。

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  plugins: {
    CapacitorHttp: { enabled: true }  // 关键：启用原生 HTTP
  }
}
```

**影响：** 音乐 SDK 的 HTTP 请求可以直接在浏览器端运行，不需要重写为原生插件。只需将 axios 调用改为 `fetch()`（CapacitorHttp 会自动 patch）。

#### 2. 音乐 SDK：浏览器端运行

原方案认为需要将 `src/main/services/musicSdk/` 移植到原生代码。实际上：

- 音乐 SDK 的核心逻辑是纯 HTTP + JSON 解析，无 Node.js 内置依赖
- `request.js` 用了 `zlib.deflateRaw`、`Buffer`、`hpagent`，但这些在浏览器端有替代方案
- 启用 CapacitorHttp 后，`fetch()` 自动走原生 HTTP，CORS 问题解决

**方案：** 创建 `src/renderer/src/services/musicSdk/browser.ts`，复用现有的音乐源模块（`src/main/utils/musicSdk/` 中的 wy/tx/kg/kw/mg），但将 HTTP 调用从 `httpFetch`（axios）改为 `fetch`。

#### 3. 插件沙箱：SES + Web Worker（替代 WebView）

原方案用无头 WebView 运行插件 JS，过于复杂。更好的方案：

- 使用 [SES (Secure EcmaScript)](https://github.com/endojs/endo/tree/master/packages/ses) 的 `lockdown()` + `Compartment` 在 Web Worker 中创建隔离沙箱
- 提供与 `pluginWorker.ts` 相同的 `cerumusic` API（`request` → `fetch`，`crypto` → Web Crypto，`buffer` → `Uint8Array`）
- 比 WebView 轻量得多，且与桌面端的 `vm.createContext()` 语义接近

**注意：** 如果 SES 方案遇到兼容性问题，降级方案是使用 iframe sandbox + `postMessage` 通信。

#### 4. 后台音频：前台服务 + MediaSession

安卓会积极杀死后台进程。必须实现：

- **前台服务（Foreground Service）：** 自定义 Capacitor 插件 `CeruAudioService`，声明 `foregroundServiceType="mediaPlayback"`
- **MediaSession：** 使用 `@capgo/capacitor-media-session` 提供锁屏控制、蓝牙 AVRCP、系统媒体 UI
- **音频焦点：** 处理 `AudioManager.requestAudioFocus()`，在来电/导航时自动暂停
- **Android 14+ 要求：** 必须在 AndroidManifest 中声明 `foregroundServiceType`

---

## 实施阶段

### 阶段 0：准备与基础设施（1-2 天）

1. **解决 GitHub 推送** — 用 `git filter-repo` 清理大文件，推送到 `xie-maker/CeruMusic`
2. **创建平台抽象层** — `src/common/platform/` 目录结构
   - `types.ts`：从 `src/preload/index.d.ts` 提取 `CustomAPI` 接口
   - `detect.ts`：运行时检测 `window.api`（Electron）/ `window.Capacitor`（Capacitor）
   - `index.ts`：单例访问器
3. **创建 `ElectronPlatform.ts`** — 纯委托给 `window.api.*`，桌面端零改动
4. **创建 `StubPlatform.ts`** — 不支持功能的友好降级
5. **验证 Electron 构建不受影响** — `yarn dev` 启动测试

**关键文件：**
- `src/preload/index.d.ts`（接口蓝图，262 行）
- `src/preload/index.ts`（Electron 实现参考）

### 阶段 1：渲染进程迁移到 PlatformService（3-5 天）

将约 46 个文件中的 `window.api.*` / `window.electron.*` 替换为 `getPlatformService().*`。

**迁移模式（统一）：**
```typescript
// 之前：
const result = await window.api.music.requestSdk('search', { source: 'wy', keyword: 'xxx' })
// 之后：
import { getPlatformService } from '@common/platform'
const platform = getPlatformService()
const result = await platform.music.requestSdk('search', { source: 'wy', keyword: 'xxx' })
```

**按依赖关系排序：**
1. 核心 store：`Settings.ts`、`GlobalPlayStatus.ts`、`download.ts`、`ControlAudio.ts`
2. 音频工具：`playlistManager.ts`、`audioHelpers.ts`、`globalControls.ts`、`globaPlayList.ts`
3. API 层：`songList.ts`、`share.ts`、`listenTogether.ts`
4. 视图：`views/music/*.vue`、`views/settings/*.vue`
5. 组件：`Play/*.vue`、`Settings/*.vue`、`Provider.vue`、`TitleBarControls.vue`
6. 根组件：`App.vue`、`main.ts`

**事件监听器迁移模式：**
```typescript
// 之前：
const unsub = window.api.download.onTaskProgress((data) => { ... })
// 之后（保持相同的取消订阅模式）：
const unsub = platform.download.onTaskProgress((data) => { ... })
```

### 阶段 2：Capacitor 引导（1-2 天）

```bash
yarn add @capacitor/core @capacitor/cli @capacitor/android
npx cap init "澜音" com.cerumusic.app --web-dir out/renderer
npx cap add android
```

**capacitor.config.ts：**
```typescript
import { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'com.cerumusic.app',
  appName: '澜音',
  webDir: 'out/renderer',
  plugins: {
    CapacitorHttp: { enabled: true }  // 关键：启用原生 HTTP 绕过 CORS
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#1a1a2e'
  }
}
export default config
```

**AndroidManifest.xml 权限：**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

**构建脚本（package.json）：**
```json
{
  "build:android": "yarn build && npx cap sync android",
  "cap:open": "npx cap open android"
}
```

### 阶段 3：高优先级功能实现（5-7 天）

#### 3.1 音乐 SDK 浏览器化（最关键）

**文件：** `src/main/services/musicSdk/service.ts`、`src/main/utils/request.js`

**步骤：**
1. 创建 `src/renderer/src/services/musicSdk/browserRequest.ts` — 浏览器版 HTTP 层
   - 用 `fetch()` 替代 axios（CapacitorHttp 启用后自动走原生 HTTP）
   - 用 `TextDecoder`/`Uint8Array` 替代 `Buffer`
   - 去掉 `zlib.deflateRaw`（浏览器端不需要）和 `hpagent`（安卓不需要代理）
   - 保持 `httpFetch(url, options)` 的返回格式：`{ statusCode, headers, body }`

2. 创建 `src/renderer/src/services/musicSdk/browser.ts` — 浏览器版 SDK 入口
   - 复用现有的音乐源模块（`src/main/utils/musicSdk/` 中的 wy/tx/kg/kw/mg）
   - 将它们的 `import httpFetch from '../../request'` 改为指向 browserRequest
   - 保持 `main(source)` 的 dispatch 模式不变

3. 在 `CapacitorPlatform.ts` 中实现 `music.requestSdk`：
   ```typescript
   music: {
     requestSdk: async (method, args) => {
       const { source, ...params } = args
       const sdk = browserMain(source)
       return sdk[method](params)
     }
   }
   ```

**注意：** 音乐源模块在 `src/main/utils/musicSdk/` 目录下，它们是纯 JS 文件，只依赖 HTTP 请求。需要将它们复制到 `src/renderer/src/services/musicSdk/sources/` 并修改 import 路径。

#### 3.2 歌单/SQLite

**使用：** `@capacitor-community/sqlite` v8.1.0

**步骤：**
1. 安装插件：`yarn add @capacitor-community/sqlite jeep-sqlite`
2. 在 `index.html` 中添加 `<jeep-sqlite></jeep-sqlite>` 组件
3. 创建 `CapacitorSongListService`，移植 `src/main/events/songList.ts` 中的 SQL 操作
4. SQL 方言与 `better-sqlite3` 兼容，逐个 handler 移植

#### 3.3 本地音乐

**创建自定义插件 `CeruMediaStorePlugin`：**
- 使用 Android `MediaStore.Audio.Media` API 查询本地音乐
- 返回格式与桌面端 `localMusic.scan` 一致：`{ title, artist, album, duration, path, coverUrl }`
- 封面通过 `MediaStore.Albums` 获取
- 比桌面端的 `node-taglib-sharp` + 手动目录扫描简单得多

#### 3.4 下载管理器

**创建自定义插件 `CeruDownloadPlugin`：**
- 使用 Android `DownloadManager` 或自定义前台服务
- 通过 Capacitor `notifyListeners` 发送进度事件
- 支持暂停/恢复/取消

#### 3.5 文件系统

**使用：** `@capacitor/filesystem`
- 配置文件：`Directory.Data`（应用私有存储）
- 下载目录：`Directory.Documents` 或 `Directory.External`
- 缓存目录：`Directory.Cache`

### 阶段 4：中优先级功能（3-5 天）

#### 4.1 插件系统（SES Web Worker 沙箱）

**创建 `CeruPluginHostService`：**

```typescript
// src/renderer/src/services/plugin/pluginWorker.ts
// 浏览器版插件沙箱，使用 Web Worker + SES

// Worker 内部：
import 'ses'  // npm install ses
lockdown()    // 冻结所有内置对象原型

// 注入 cerumusic API（与 pluginWorker.ts 对齐）
const cerumusic = {
  env: 'browser',
  version: '1.0.4',
  utils: {
    buffer: { from: (data, enc) => new Uint8Array(...), bufToString: ... },
    crypto: { aesEncrypt: ..., md5: ..., randomBytes: ..., rsaEncrypt: ... }
  },
  request: async (url, options) => {
    const resp = await fetch(url, options)  // CapacitorHttp 自动走原生
    return { body: await resp.text(), statusCode: resp.status, headers: Object.fromEntries(resp.headers) }
  }
}

const compartment = new Compartment({
  cerumusic,
  console: { log: ..., warn: ..., error: ... },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Buffer: undefined,  // 用 Uint8Array 替代
  JSON, Math, Date, URL, URLSearchParams, TextEncoder, TextDecoder, Promise
  // require 不注入 = undefined = 阻止
})

const pluginExports = compartment.evaluate(pluginCode)
```

#### 4.2 媒体通知与后台播放

**使用：** `@capgo/capacitor-media-session` + 自定义前台服务

```typescript
// CapacitorPlatform.ts 中
mediaSession: {
  async setMetadata(title, artist, album, artworkUrl) {
    await MediaSession.setMetadata({
      title, artist, album,
      artwork: [{ src: artworkUrl }]
    })
  },
  async setPlaybackState(state) {
    await MediaSession.setPlaybackState({ playbackState: state })
  },
  onPlay: () => { /* ... */ },
  onPause: () => { /* ... */ },
  onNextTrack: () => { /* ... */ },
  onPrevTrack: () => { /* ... */ }
}
```

**前台服务（自定义 Capacitor 插件）：**
- Kotlin 实现，声明 `foregroundServiceType="mediaPlayback"`
- 播放时启动前台服务（显示通知）
- 暂停后延迟停止前台服务
- 处理音频焦点变化

#### 4.3 其他中优先级

| 功能 | 方案 |
|------|------|
| 剪贴板 | `@capacitor/clipboard` |
| 文件选择器 | `@capacitor/file-picker` |
| 深层链接 | `@capacitor/app` 的 `appUrlOpen` + AndroidManifest intent-filter |
| AI 服务 | 浏览器端 fetch SSE 流替代 IPC 事件 |
| 一起听 | Socket.IO 在浏览器端原生支持，无需改动 |

### 阶段 5：UI 适配（2-3 天）

#### 5.1 响应式布局

```typescript
// src/renderer/src/composables/useIsMobile.ts
export function useIsMobile() {
  const isMobile = ref(window.innerWidth < 768)
  window.addEventListener('resize', () => { isMobile.value = window.innerWidth < 768 })
  return { isMobile }
}
```

#### 5.2 导航改造

- 桌面端：侧边栏 + 自定义标题栏（保持不变）
- 移动端：底部标签栏（首页/搜索/歌单/设置）
- 通过 `useIsMobile()` 条件渲染

#### 5.3 移动端隐藏/替代

| 组件 | 移动端处理 |
|------|-----------|
| `TitleBarControls.vue` | 隐藏（安卓有系统导航） |
| `DesktopLyric*.vue` | 隐藏（不支持悬浮窗） |
| `HotkeySettings.vue` | 隐藏（无全局热键） |
| `HomeLayout.vue` | 移动端变体（底部导航） |

#### 5.4 安卓适配

- 返回键：`@capacitor/app` 的 `backButton` 事件
- 状态栏：`@capacitor/status-bar` 配合主题色
- 屏幕方向：`@capacitor/screen-orientation` 锁定竖屏
- 安全区域：CSS `env(safe-area-inset-*)` 处理刘海/圆角

### 阶段 6：测试与发布（2-3 天）

1. 各音乐源（wy/tx/kg/kw/mg）搜索、播放、歌词测试
2. 歌单创建/编辑/同步测试
3. 插件安装/执行测试
4. 后台播放 + 蓝牙控制测试
5. 深层链接测试（`cerumusic://` scheme）
6. 一起听双端互通测试
7. 安卓 14/15 兼容性测试
8. 电量优化测试

---

## 安卓端跳过/延后的功能

| 功能 | 状态 | 原因 |
|------|------|------|
| 桌面歌词悬浮窗 | 跳过 | 需要 SYSTEM_ALERT_WINDOW，UX 差异大 |
| DLNA 投射 | 延后 | 可后续通过 MediaRouter 实现 |
| 系统音频捕获 | 跳过 | 安卓不支持 |
| 任务栏控制 | 跳过 | Windows 专属 |
| 全局热键 | 跳过 | 移动端不适用 |
| 自动更新 | 跳过 | Play Store 处理 |
| 最小化到托盘 | 跳过 | 安卓生命周期不同 |
| 系统字体选择 | 延后 | 安卓限制较多 |

**完全兼容的功能：** 音频播放、MediaSession 控制、主题系统、搜索、歌单、收藏、一起听、AI 助手、歌曲分享

---

## 需要自定义的 Capacitor 插件（Kotlin）

| 插件 | 功能 | 复杂度 |
|------|------|--------|
| `CeruAudioService` | 前台服务 + 音频焦点 + MediaSession 集成 | 中 |
| `CeruMediaStorePlugin` | 本地音乐扫描（MediaStore API） | 低 |
| `CeruDownloadPlugin` | 后台下载管理 | 中 |
| `CeruPluginHostPlugin` | 仅在 SES 方案失败时需要（WebView 沙箱降级） | 高 |

---

## 关键文件清单

| 文件 | 用途 |
|------|------|
| `src/preload/index.d.ts` | CustomAPI 接口定义（PlatformService 蓝图） |
| `src/preload/index.ts` | Electron 实现参考 |
| `src/main/services/musicSdk/service.ts` | 音乐 SDK dispatch 逻辑 |
| `src/main/services/musicSdk/index.ts` | SDK IPC 入口 |
| `src/main/utils/request.js` | HTTP 层（axios，需浏览器化） |
| `src/main/utils/musicSdk/*.js` | 各音乐源模块（wy/tx/kg/kw/mg） |
| `src/main/services/plugin/manager/pluginWorker.ts` | 插件沙箱参考 |
| `src/main/events/songList.ts` | 歌单 SQL 操作参考 |
| `electron.vite.config.ts` | 构建配置 |
| `src/renderer/src/main.ts` | Vue 入口（需平台感知） |
| `src/renderer/src/components/layout/Provider.vue` | 全局初始化 |

---

## 风险与缓解

| 风险 | 概率 | 缓解 |
|------|------|------|
| 音乐源模块浏览器化复杂度 | 中 | CapacitorHttp 绕过 CORS，只需替换 HTTP 函数引用 |
| 插件沙箱 SES 兼容性 | 中 | 降级方案：iframe sandbox + postMessage |
| 安卓后台被杀 | 高 | 前台服务 + MediaSession 通知保活 + WakeLock |
| TDesign 移动端适配 | 低 | TDesign 有响应式支持，必要时用 Naive UI 补充 |
| Capacitor 插件版本兼容 | 低 | 锁定 Capacitor 8.x，使用官方/高星社区插件 |

---

## 验证清单

- [ ] `yarn dev` 桌面端正常启动，所有功能不受影响
- [ ] `yarn build:android` 安卓端构建成功
- [ ] 安卓模拟器/真机启动，显示欢迎页
- [ ] 音乐搜索（至少一个源）正常工作
- [ ] 音乐播放正常（在线 + 本地）
- [ ] 歌单 CRUD 正常
- [ ] 后台播放不中断
- [ ] 锁屏/通知栏控制正常
- [ ] 深层链接 `cerumusic://` 正常
- [ ] 一起听双端互通
