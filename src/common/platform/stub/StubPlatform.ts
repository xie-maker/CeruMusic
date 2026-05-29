/**
 * Stub 平台实现 — 不支持功能的友好降级
 *
 * 用于 Web 环境或未实现的平台。
 * 不支持的方法返回空数据或抛出友好错误。
 */

import type { PlatformService } from '../types'

const noop = () => {}
const noopUnsubscribe = () => () => {}

function unsupported(feature: string): never {
  throw new Error(`当前平台不支持此功能：${feature}`)
}

export class StubPlatform implements PlatformService {
  // === 窗口控制（移动端/Web 不适用） ===
  minimize = noop
  maximize = noop
  close = noop
  setMiniMode = noop
  show = noop
  toggleFullscreen = noop
  onFullscreenChanged = noopUnsubscribe as any
  onMusicCtrl = noopUnsubscribe as any

  // === 音乐 SDK ===
  music = {
    requestSdk: async (_method: string, _args: any) => unsupported('音乐 SDK'),
    invoke: async (_channel: string, ..._args: any[]) => unsupported('IPC 调用'),
    on: (_channel: string, _callback: (...args: any[]) => void) => {
      return () => {} // 返回 noop 取消订阅函数
    },
    removeAllListeners: (_channel: string) => {
      // noop
    }
  }

  // === 音乐缓存 ===
  musicCache = {
    getInfo: async () => ({}),
    clear: async () => {},
    getSize: async () => '0 B'
  }

  // === 下载管理 ===
  download = {
    getTasks: async () => [],
    pauseTask: async () => {},
    resumeTask: async () => {},
    pauseAllTasks: async () => {},
    resumeAllTasks: async () => {},
    cancelTask: async () => {},
    deleteTask: async () => {},
    retryTask: async () => {},
    setMaxConcurrent: async () => {},
    getMaxConcurrent: async () => 3,
    clearTasks: async () => {},
    validateFiles: async () => [],
    openFileLocation: async () => unsupported('打开文件位置'),
    onTaskAdded: noopUnsubscribe as any,
    onTaskProgress: noopUnsubscribe as any,
    onTaskStatusChanged: noopUnsubscribe as any,
    onTaskCompleted: noopUnsubscribe as any,
    onTaskError: noopUnsubscribe as any,
    onTaskDeleted: noopUnsubscribe as any,
    onTasksReset: noopUnsubscribe as any
  }

  // === 歌单管理 ===
  songList = {
    create: async () => unsupported('歌单管理'),
    getAll: async () => [],
    getById: async () => null,
    delete: async () => {},
    batchDelete: async () => {},
    edit: async () => {},
    updateCover: async () => {},
    search: async () => [],
    getStatistics: async () => ({}),
    exists: async () => false,
    addSongs: async () => {},
    removeSong: async () => {},
    removeSongs: async () => {},
    clearSongs: async () => {},
    getSongs: async () => [],
    getSongCount: async () => 0,
    hasSong: async () => false,
    getSong: async () => null,
    searchSongs: async () => [],
    getSongStatistics: async () => ({}),
    validateIntegrity: async () => ({}),
    repairData: async () => ({}),
    forceSave: async () => {},
    reorderSongs: async () => {},
    moveSong: async () => {},
    getFavoritesId: async () => null,
    setFavoritesId: async () => {}
  }

  // === AI ===
  ai = {
    ask: async () => unsupported('AI 功能'),
    askStream: async () => unsupported('AI 功能'),
    onStreamChunk: noop,
    onStreamEnd: noop,
    onStreamError: noop,
    removeStreamListeners: noop
  }

  // === 窗口关闭 ===
  windowClose = {
    onRequest: noopUnsubscribe as any
  }

  // === 设置同步 ===
  settings = {
    syncCloseToTray: noop,
    getCloseToTray: async () => false
  }

  // === 插件管理 ===
  plugins = {
    selectAndAddPlugin: async () => unsupported('插件管理'),
    downloadAndAddPlugin: async () => unsupported('插件管理'),
    uninstallPlugin: async () => unsupported('插件管理'),
    addPlugin: async () => unsupported('插件管理'),
    getPluginType: async () => unsupported('插件管理'),
    getConfigSchema: async () => unsupported('插件管理'),
    getConfig: async () => unsupported('插件管理'),
    saveConfig: async () => unsupported('插件管理'),
    testConnection: async () => unsupported('插件管理'),
    getPlaylists: async () => unsupported('插件管理'),
    getPlaylistSongs: async () => unsupported('插件管理'),
    importToLocal: async () => unsupported('插件管理'),
    getServiceLyric: async () => unsupported('插件管理'),
    onDeepLinkAdd: noopUnsubscribe as any,
    getPluginById: async () => null,
    loadAllPlugins: async () => [],
    getPluginLog: async () => ''
  }

  // === Ping ===
  ping = noop
  pingService = { start: noop, stop: noop }

  // === 目录设置 ===
  directorySettings = {
    getDirectories: async () => ({ cacheDir: '', downloadDir: '' }),
    selectCacheDir: async () => ({ success: false, message: '当前平台不支持' }),
    selectDownloadDir: async () => ({ success: false, message: '当前平台不支持' }),
    saveDirectories: async () => ({ success: false, message: '当前平台不支持' }),
    resetDirectories: async () => ({ success: false, message: '当前平台不支持' }),
    openDirectory: async () => ({ success: false, message: '当前平台不支持' }),
    getDirectorySize: async () => ({ size: 0, formatted: '0 B' })
  }

  // === 用户配置 ===
  getUserConfig = async () => ({})

  // === 快捷键 ===
  hotkeys = {
    get: async () => ({ success: false, error: '当前平台不支持快捷键' }),
    set: async () => ({ success: false, error: '当前平台不支持快捷键' })
  }

  // === 插件通知 ===
  pluginNotice = {
    onPluginNotice: noopUnsubscribe as any,
    onPluginThrottle: noopUnsubscribe as any,
    onPluginDisabled: noopUnsubscribe as any
  }

  // === 本地音乐 ===
  localMusic = {
    selectDirs: async () => unsupported('本地音乐'),
    scan: async () => [],
    writeTags: async () => ({ success: false, message: '当前平台不支持' }),
    getLyric: async () => '',
    onScanProgress: noop,
    onScanFinished: noop,
    removeScanProgress: noop,
    removeScanFinished: noop,
    getUrlById: async () => unsupported('本地音乐 URL'),
    getDirs: async () => [],
    setDirs: async () => {},
    getList: async () => [],
    batchMatch: async () => unsupported('批量匹配'),
    getCoverBase64: async () => '',
    onBatchMatchProgress: noop,
    onBatchMatchFinished: noop,
    removeBatchMatchListeners: noop,
    clearIndex: async () => {}
  }

  // === 文件操作 ===
  file = {
    readFile: async () => unsupported('文件读取')
  }

  // === Windows 任务栏缩略图工具栏 ===
  thumbar = undefined

  // === 窗口标题/进度条 ===
  app = undefined

  // === 分享 ===
  share = {
    getPluginCodeAndMd5: async () => ({ error: '当前平台不支持' }),
    onShareOpen: noopUnsubscribe as any,
    onPlaylistShareOpen: noopUnsubscribe as any,
    getPending: async () => [],
    getPendingPlaylistShares: async () => []
  }

  // === 一起听 ===
  listenTogether = {
    onShareOpen: noopUnsubscribe as any,
    getPendingCodes: async () => []
  }

  // === 剪贴板 ===
  clipboard = {
    readText: async () => ''
  }

  // === 系统音频捕获 ===
  systemAudio = {
    prepareCapture: async () => false,
    getDefaultScreenSourceId: async () => '',
    getAllScreenSourceIds: async () => []
  }

  // === 自动更新 ===
  autoUpdater = null
}
