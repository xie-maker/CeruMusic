/**
 * PlatformService 接口 — 跨平台统一 API 契约
 *
 * 源自 src/preload/index.d.ts 的 CustomAPI 接口。
 * 桌面端（Electron）和移动端（Capacitor）各自实现此接口。
 */

import type {
  HotkeyAction,
  HotkeyConfig,
  HotkeyConfigPayload,
  HotkeyStatus
} from '../types/hotkeys'

// 音乐 SDK 方法参数类型（泛型，不依赖具体实现）
export interface MusicSdkMethodParams {
  [key: string]: any
}

export interface MusicSdkRequestOptions {
  source: any
  [key: string]: any
}

// 下载任务事件回调类型
export type TaskEventCallback = (task: any) => void
export type TaskDeletedCallback = (taskId: string) => void
export type TasksResetCallback = (tasks: any[]) => void

// 取消订阅函数
export type Unsubscribe = () => void

/**
 * 跨平台服务接口
 * 所有方法签名与 Electron 的 CustomAPI 对齐
 */
export interface PlatformService {
  // === 窗口控制（桌面端完整实现，移动端空实现） ===
  minimize: () => void
  maximize: () => void
  close: () => void
  setMiniMode: (isMini: boolean) => void
  show: () => void
  toggleFullscreen: () => void
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void) => Unsubscribe
  onMusicCtrl: (callback: (event: Event, args: any) => void) => Unsubscribe

  // === 音乐 SDK ===
  music: {
    requestSdk: <T extends string>(
      method: T,
      args: MusicSdkRequestOptions
    ) => Promise<any>
    invoke: (channel: string, ...args: any[]) => Promise<any>
  }

  // === 音乐缓存 ===
  musicCache: {
    getInfo: () => Promise<any>
    clear: () => Promise<void>
    getSize: () => Promise<string>
  }

  // === 下载管理 ===
  download: {
    getTasks: () => Promise<any[]>
    pauseTask: (taskId: string) => Promise<void>
    resumeTask: (taskId: string) => Promise<void>
    pauseAllTasks: () => Promise<void>
    resumeAllTasks: () => Promise<void>
    cancelTask: (taskId: string) => Promise<void>
    deleteTask: (taskId: string, deleteFile?: boolean) => Promise<void>
    retryTask: (taskId: string) => Promise<void>
    setMaxConcurrent: (max: number) => Promise<void>
    getMaxConcurrent: () => Promise<number>
    clearTasks: (type: 'queue' | 'completed' | 'failed' | 'all') => Promise<void>
    validateFiles: () => Promise<any[]>
    openFileLocation: (filePath: string) => Promise<void>
    onTaskAdded: (callback: TaskEventCallback) => Unsubscribe
    onTaskProgress: (callback: TaskEventCallback) => Unsubscribe
    onTaskStatusChanged: (callback: TaskEventCallback) => Unsubscribe
    onTaskCompleted: (callback: TaskEventCallback) => Unsubscribe
    onTaskError: (callback: TaskEventCallback) => Unsubscribe
    onTaskDeleted: (callback: TaskDeletedCallback) => Unsubscribe
    onTasksReset: (callback: TasksResetCallback) => Unsubscribe
  }

  // === 歌单管理 ===
  songList: {
    create: (name: string, description?: string, source?: string, meta?: Record<string, any>) => Promise<any>
    getAll: () => Promise<any>
    getById: (hashId: string) => Promise<any>
    delete: (hashId: string) => Promise<any>
    batchDelete: (hashIds: string[]) => Promise<any>
    edit: (hashId: string, updates: any) => Promise<any>
    updateCover: (hashId: string, coverImgUrl: string) => Promise<any>
    search: (keyword: string, source?: string) => Promise<any>
    getStatistics: () => Promise<any>
    exists: (hashId: string) => Promise<any>
    addSongs: (hashId: string, songs: any[]) => Promise<any>
    removeSong: (hashId: string, songmid: string | number) => Promise<any>
    removeSongs: (hashId: string, songmids: (string | number)[]) => Promise<any>
    clearSongs: (hashId: string) => Promise<any>
    getSongs: (hashId: string) => Promise<any>
    getSongCount: (hashId: string) => Promise<any>
    hasSong: (hashId: string, songmid: string | number) => Promise<any>
    getSong: (hashId: string, songmid: string | number) => Promise<any>
    searchSongs: (hashId: string, keyword: string) => Promise<any>
    getSongStatistics: (hashId: string) => Promise<any>
    validateIntegrity: (hashId: string) => Promise<any>
    repairData: (hashId: string) => Promise<any>
    forceSave: (hashId: string) => Promise<any>
    reorderSongs: (hashId: string, songmids: (string | number)[]) => Promise<any>
    moveSong: (hashId: string, songmid: string | number, toIndex: number) => Promise<any>
    getFavoritesId: () => Promise<any>
    setFavoritesId: (favoritesId: string) => Promise<any>
  }

  // === AI ===
  ai: {
    ask: (prompt: string) => Promise<any>
    askStream: (prompt: string, streamId: string) => Promise<any>
    onStreamChunk: (callback: (data: { streamId: string; chunk: string }) => void) => void
    onStreamEnd: (callback: (data: { streamId: string }) => void) => void
    onStreamError: (callback: (data: { streamId: string; error: string }) => void) => void
    removeStreamListeners: () => void
  }

  // === 窗口关闭事件 ===
  windowClose: {
    onRequest: (callback: () => void) => Unsubscribe
  }

  // === 设置同步 ===
  settings: {
    syncCloseToTray: (value: boolean) => void
    getCloseToTray: () => Promise<boolean>
  }

  // === 插件管理 ===
  plugins: {
    selectAndAddPlugin: (type: 'lx' | 'cr') => Promise<any>
    downloadAndAddPlugin: (url: string, type: 'lx' | 'cr', targetPluginId?: string) => Promise<any>
    uninstallPlugin: (pluginId: string) => Promise<any>
    addPlugin: (pluginCode: string, pluginName: string, targetPluginId?: string) => Promise<any>
    getPluginType: (pluginId: string) => Promise<any>
    getConfigSchema: (pluginId: string) => Promise<any>
    getConfig: (pluginId: string) => Promise<any>
    saveConfig: (pluginId: string, config: Record<string, any>) => Promise<any>
    testConnection: (pluginId: string) => Promise<any>
    getPlaylists: (pluginId: string) => Promise<any>
    getPlaylistSongs: (pluginId: string, playlistId: string) => Promise<any>
    importToLocal: (pluginId: string, playlistId: string, playlistName?: string) => Promise<any>
    getServiceLyric: (pluginId: string, songInfo: any) => Promise<any>
    onDeepLinkAdd: (callback: (payload: { url: string; type: 'lx' | 'cr'; targetPluginId?: string }) => void) => Unsubscribe
    getPluginById: (id: string) => Promise<any>
    loadAllPlugins: () => Promise<any>
    getPluginLog: (pluginId: string) => Promise<any>
  }

  // === Ping ===
  ping: (callback: (...args: any[]) => void) => void
  pingService: {
    start: () => void
    stop: () => void
  }

  // === 目录设置 ===
  directorySettings: {
    getDirectories: () => Promise<{ cacheDir: string; downloadDir: string }>
    selectCacheDir: () => Promise<{ success: boolean; path?: string; message?: string }>
    selectDownloadDir: () => Promise<{ success: boolean; path?: string; message?: string }>
    saveDirectories: (directories: { cacheDir: string; downloadDir: string }) => Promise<{ success: boolean; message: string }>
    resetDirectories: () => Promise<{ success: boolean; directories?: { cacheDir: string; downloadDir: string }; message?: string }>
    openDirectory: (dirPath: string) => Promise<{ success: boolean; message?: string }>
    getDirectorySize: (dirPath: string) => Promise<{ size: number; formatted: string }>
  }

  // === 用户配置 ===
  getUserConfig: () => Promise<any>

  // === 快捷键 ===
  hotkeys: {
    get: () => Promise<{ success: boolean; data?: HotkeyConfig; status?: HotkeyStatus; error?: string; errors?: string[] }>
    set: (payload: HotkeyConfigPayload) => Promise<{ success: boolean; data?: HotkeyConfig; status?: HotkeyStatus; error?: string; errors?: string[] }>
  }

  // === 插件通知 ===
  pluginNotice: {
    onPluginNotice: (listener: (...args: any[]) => void) => Unsubscribe
    onPluginThrottle: (listener: (data: { pluginId: string; reason: string; duration?: number }) => void) => Unsubscribe
    onPluginDisabled: (listener: (data: { pluginId: string; reason: string }) => void) => Unsubscribe
  }

  // === 本地音乐 ===
  localMusic: {
    selectDirs: () => Promise<string[]>
    scan: (dirs: string[]) => Promise<any[]>
    writeTags: (filePath: string, songInfo: any, tagWriteOptions: any) => Promise<{ success: boolean; message?: string }>
    getLyric: (songmid: string) => Promise<string>
    onScanProgress: (callback: (processed: number, total: number) => void) => void
    onScanFinished: (callback: (resList: any[]) => void) => void
    removeScanProgress: () => void
    removeScanFinished: () => void
    [key: string]: any
  }

  // === 分享 ===
  share: {
    getPluginCodeAndMd5: (pluginId: string) => Promise<{ code: string; md5: string; type: 'cr' | 'lx' } | { error: string }>
    onShareOpen: (callback: (payload: { id: string }) => void) => Unsubscribe
    onPlaylistShareOpen: (callback: (payload: { id: string }) => void) => Unsubscribe
    getPending: () => Promise<string[]>
    getPendingPlaylistShares: () => Promise<string[]>
  }

  // === 一起听 ===
  listenTogether: {
    onShareOpen: (callback: (payload: { code: string }) => void) => Unsubscribe
    getPendingCodes: () => Promise<string[]>
  }

  // === 剪贴板 ===
  clipboard: {
    readText: () => Promise<string>
  }

  // === 系统音频捕获（桌面端专属） ===
  systemAudio: {
    prepareCapture: () => Promise<boolean>
    getDefaultScreenSourceId: () => Promise<string>
    getAllScreenSourceIds: () => Promise<string[]>
  }

  // === 自动更新（桌面端专属） ===
  autoUpdater: any
}
