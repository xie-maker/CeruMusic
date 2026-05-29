/**
 * Capacitor 平台实现 — 安卓端
 *
 * TODO: 阶段 3 逐步实现各功能
 */

import type { PlatformService } from '../types'

const noop = () => {}
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

  // === 音乐 SDK ===
  music = {
    requestSdk: async (method: string, args: any) => {
      try {
        // 动态导入浏览器版 SDK（延迟加载，减少初始包大小）
        const { browserMain } = await import('@renderer/services/musicSdk/browser')
        const { source, ...params } = args ?? {}
        const sdk = browserMain(source || 'wy')

        if (!sdk || typeof sdk[method] !== 'function') {
          console.warn(`[CapacitorPlatform] SDK 方法不存在: ${source}/${method}`)
          return null
        }

        return await sdk[method](params)
      } catch (error) {
        console.error('[CapacitorPlatform] music.requestSdk 失败:', error)
        return null
      }
    },
    invoke: async (_channel: string, ..._args: any[]) => {
      todo('IPC 调用')
      return null
    },
    on: (_channel: string, _callback: (...args: any[]) => void) => {
      todo('IPC 事件监听')
      return () => {}
    },
    removeAllListeners: (_channel: string) => {
      todo('IPC 移除监听器')
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

  // === 歌单管理 ===
  songList = {
    create: async (name: string, description?: string, source?: string, meta?: Record<string, any>) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return songListService.createPlaylist(name, description, source as any, meta)
    },
    getAll: async () => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.getAllPlaylists() }
    },
    getById: async (hashId: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.getPlaylistById(hashId) }
    },
    delete: async (hashId: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      await songListService.deletePlaylist(hashId)
      return { success: true }
    },
    batchDelete: async (hashIds: string[]) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.batchDeletePlaylists(hashIds) }
    },
    edit: async (hashId: string, updates: any) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      await songListService.updatePlaylist(hashId, updates)
      return { success: true }
    },
    updateCover: async (hashId: string, coverImgUrl: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      await songListService.updateCover(hashId, coverImgUrl)
      return { success: true }
    },
    search: async (keyword: string, source?: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.searchPlaylists(keyword, source) }
    },
    getStatistics: async () => ({ success: true, data: {} }),
    exists: async (hashId: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.exists(hashId) }
    },
    addSongs: async (hashId: string, songs: any[]) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      await songListService.addSongs(hashId, songs)
      return { success: true }
    },
    removeSong: async (hashId: string, songmid: string | number) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.removeSong(hashId, songmid) }
    },
    removeSongs: async (hashId: string, songmids: (string | number)[]) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.removeSongs(hashId, songmids) }
    },
    clearSongs: async (hashId: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      await songListService.clearSongs(hashId)
      return { success: true }
    },
    getSongs: async (hashId: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.getSongs(hashId) }
    },
    getSongCount: async (hashId: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.getSongCount(hashId) }
    },
    hasSong: async (hashId: string, songmid: string | number) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.hasSong(hashId, songmid) }
    },
    getSong: async (hashId: string, songmid: string | number) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      const songs = await songListService.getSongs(hashId)
      const song = songs.find(s => String(s.songmid) === String(songmid))
      return { success: true, data: song || null }
    },
    searchSongs: async (hashId: string, keyword: string) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      const songs = await songListService.getSongs(hashId)
      const filtered = songs.filter(s =>
        (s.name && s.name.includes(keyword)) ||
        (s.singer && s.singer.includes(keyword))
      )
      return { success: true, data: filtered }
    },
    getSongStatistics: async () => ({ success: true, data: {} }),
    validateIntegrity: async () => ({ success: true, data: { isValid: true } }),
    repairData: async () => ({ success: true, data: {} }),
    forceSave: async () => ({ success: true }),
    reorderSongs: async (hashId: string, songmids: (string | number)[]) => {
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      return { success: true, data: await songListService.reorderSongs(hashId, songmids) }
    },
    moveSong: async (hashId: string, songmid: string | number, toIndex: number) => {
      // 移动歌曲需要重新排序
      const { songListService } = await import('@renderer/services/sqlite/CapacitorSongListService')
      const songs = await songListService.getSongs(hashId)
      const songmids = songs.map(s => s.songmid)
      const fromIndex = songmids.findIndex(id => String(id) === String(songmid))
      if (fromIndex === -1) return { success: false }
      songmids.splice(fromIndex, 1)
      songmids.splice(toIndex, 0, songmid)
      await songListService.reorderSongs(hashId, songmids)
      return { success: true, data: true }
    },
    getFavoritesId: async () => {
      try {
        const stored = localStorage.getItem('favoritesHashId')
        return { success: true, data: stored || null }
      } catch {
        return { success: true, data: null }
      }
    },
    setFavoritesId: async (favoritesId: string) => {
      try {
        localStorage.setItem('favoritesHashId', favoritesId)
        return { success: true }
      } catch {
        return { success: false }
      }
    }
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

  // === 插件管理 ===
  plugins = {
    selectAndAddPlugin: async (type: 'lx' | 'cr') => {
      // 浏览器环境：通过 URL 添加插件
      const url = prompt(`请输入${type === 'lx' ? '洛雪' : '澜音'}插件 URL:`)
      if (!url) return { canceled: true }

      try {
        const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
        const info = await browserPluginService.loadPlugin({ url }, type)
        return { success: true, data: info }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
    downloadAndAddPlugin: async (url: string, type: 'lx' | 'cr', targetPluginId?: string) => {
      try {
        const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
        const info = await browserPluginService.loadPlugin({ url }, type)
        return { success: true, data: info }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
    uninstallPlugin: async (pluginId: string) => {
      try {
        const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
        browserPluginService.unloadPlugin(pluginId)
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
    addPlugin: async (pluginCode: string, pluginName: string, targetPluginId?: string) => {
      try {
        const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
        const info = await browserPluginService.loadPlugin({ code: pluginCode, name: pluginName }, 'cr')
        return { success: true, data: info }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
    getPluginType: async (pluginId: string) => {
      const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
      const info = browserPluginService.getPluginInfo(pluginId)
      return info?.type || null
    },
    getConfigSchema: async () => null,
    getConfig: async () => null,
    saveConfig: async () => {},
    testConnection: async () => ({ success: false }),
    getPlaylists: async () => [],
    getPlaylistSongs: async () => [],
    importToLocal: async () => null,
    getServiceLyric: async () => null,
    onDeepLinkAdd: noopUnsubscribe as any,
    getPluginById: async (id: string) => {
      const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
      return browserPluginService.getPluginInfo(id)
    },
    loadAllPlugins: async () => {
      const { browserPluginService } = await import('@renderer/services/plugin/BrowserPluginService')
      return browserPluginService.getLoadedPlugins()
    },
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
    onPluginNotice: (listener: (...args: any[]) => void) => {
      let unsub: (() => void) | null = null
      import('@renderer/services/plugin/BrowserPluginService').then(({ browserPluginService }) => {
        unsub = browserPluginService.onPluginNotice(listener)
      })
      return () => { unsub?.() }
    },
    onPluginThrottle: (listener: (data: { pluginId: string; reason: string; duration?: number }) => void) => {
      let unsub: (() => void) | null = null
      import('@renderer/services/plugin/BrowserPluginService').then(({ browserPluginService }) => {
        unsub = browserPluginService.onPluginThrottle(listener)
      })
      return () => { unsub?.() }
    },
    onPluginDisabled: (listener: (data: { pluginId: string; reason: string }) => void) => {
      let unsub: (() => void) | null = null
      import('@renderer/services/plugin/BrowserPluginService').then(({ browserPluginService }) => {
        unsub = browserPluginService.onPluginDisabled(listener)
      })
      return () => { unsub?.() }
    }
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
    removeScanFinished: noop,
    getUrlById: async () => { todo('本地音乐 URL'); return '' },
    getDirs: async () => [],
    setDirs: async () => {},
    getList: async () => [],
    batchMatch: async () => { todo('批量匹配') },
    getCoverBase64: async () => '',
    onBatchMatchProgress: noop,
    onBatchMatchFinished: noop,
    removeBatchMatchListeners: noop,
    clearIndex: async () => {}
  }

  // === 文件操作 ===
  file = {
    readFile: async () => { todo('文件读取'); return new Uint8Array() }
  }

  // === Windows 任务栏缩略图工具栏（安卓不适用） ===
  thumbar = undefined

  // === 窗口标题/进度条（安卓不适用） ===
  app = undefined

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
    readText: async () => {
      try {
        const { Clipboard } = await import('@capacitor/clipboard')
        const result = await Clipboard.read()
        return result.value || ''
      } catch {
        return ''
      }
    }
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
