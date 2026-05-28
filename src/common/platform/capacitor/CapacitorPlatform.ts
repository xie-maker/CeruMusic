/**
 * Capacitor 平台实现 — 安卓端
 *
 * TODO: 阶段 3 逐步实现各功能
 */

import type { PlatformService } from '../types'

const noop = () => {}
const noopAsync = async () => ({})
const noopUnsubscribe = () => () => {}

function todo(feature: string) {
  console.warn(`[CapacitorPlatform] 尚未实现：${feature}`)
}

export class CapacitorPlatform implements PlatformService {
  // === 窗口控制（安卓不适用） ===
  minimize = noop
  maximize = noop
  close = noop
  setMiniMode = noop
  show = noop
  toggleFullscreen = noop
  onFullscreenChanged = noopUnsubscribe as any
  onMusicCtrl = noopUnsubscribe as any

  // === 音乐 SDK（TODO: 阶段 3 实现浏览器端 SDK） ===
  music = {
    requestSdk: async (method: string, args: any) => {
      todo('音乐 SDK')
      return null
    },
    invoke: async (channel: string, ...args: any[]) => {
      todo('IPC 调用')
      return null
    }
  }

  // === 音乐缓存 ===
  musicCache = {
    getInfo: async () => ({}),
    clear: async () => {},
    getSize: async () => '0 B'
  }

  // === 下载管理（TODO: 阶段 3 实现 CeruDownloadPlugin） ===
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
    openFileLocation: async () => {},
    onTaskAdded: noopUnsubscribe as any,
    onTaskProgress: noopUnsubscribe as any,
    onTaskStatusChanged: noopUnsubscribe as any,
    onTaskCompleted: noopUnsubscribe as any,
    onTaskError: noopUnsubscribe as any,
    onTaskDeleted: noopUnsubscribe as any,
    onTasksReset: noopUnsubscribe as any
  }

  // === 歌单管理（TODO: 阶段 3 实现 SQLite） ===
  songList = {
    create: async () => { todo('歌单管理'); return null },
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

  // === AI（TODO: 阶段 4 实现 SSE 流） ===
  ai = {
    ask: async () => { todo('AI'); return null },
    askStream: async () => { todo('AI'); return null },
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

  // === 插件管理（TODO: 阶段 4 实现 WebView 沙箱） ===
  plugins = {
    selectAndAddPlugin: async () => { todo('插件管理'); return null },
    downloadAndAddPlugin: async () => { todo('插件管理'); return null },
    uninstallPlugin: async () => { todo('插件管理'); return null },
    addPlugin: async () => { todo('插件管理'); return null },
    getPluginType: async () => null,
    getConfigSchema: async () => null,
    getConfig: async () => null,
    saveConfig: async () => {},
    testConnection: async () => ({ success: false }),
    getPlaylists: async () => [],
    getPlaylistSongs: async () => [],
    importToLocal: async () => null,
    getServiceLyric: async () => null,
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
    selectCacheDir: async () => ({ success: false }),
    selectDownloadDir: async () => ({ success: false }),
    saveDirectories: async () => ({ success: true, message: '' }),
    resetDirectories: async () => ({ success: true }),
    openDirectory: async () => ({ success: false }),
    getDirectorySize: async () => ({ size: 0, formatted: '0 B' })
  }

  // === 用户配置 ===
  getUserConfig = async () => ({})

  // === 快捷键（安卓不适用） ===
  hotkeys = {
    get: async () => ({ success: false, error: '安卓端不支持快捷键' }),
    set: async () => ({ success: false, error: '安卓端不支持快捷键' })
  }

  // === 插件通知 ===
  pluginNotice = {
    onPluginNotice: noopUnsubscribe as any,
    onPluginThrottle: noopUnsubscribe as any,
    onPluginDisabled: noopUnsubscribe as any
  }

  // === 本地音乐（TODO: 阶段 3 实现 CeruMediaStorePlugin） ===
  localMusic = {
    selectDirs: async () => [],
    scan: async () => [],
    writeTags: async () => ({ success: false, message: '安卓端暂不支持写入标签' }),
    getLyric: async () => '',
    onScanProgress: noop,
    onScanFinished: noop,
    removeScanProgress: noop,
    removeScanFinished: noop
  }

  // === 分享 ===
  share = {
    getPluginCodeAndMd5: async () => ({ error: '安卓端暂不支持' }),
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

  // === 系统音频捕获（安卓不支持） ===
  systemAudio = {
    prepareCapture: async () => false,
    getDefaultScreenSourceId: async () => '',
    getAllScreenSourceIds: async () => []
  }

  // === 自动更新（Play Store 处理） ===
  autoUpdater = null
}
