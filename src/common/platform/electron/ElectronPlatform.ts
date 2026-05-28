/**
 * Electron 平台实现 — 委托给 window.api（preload 注入）
 *
 * 这是一个纯透传层，不改变任何现有行为。
 */

import type { PlatformService } from '../types'

export class ElectronPlatform implements PlatformService {
  private get api() {
    return (window as any).api
  }

  // === 窗口控制 ===
  minimize = () => this.api.minimize()
  maximize = () => this.api.maximize()
  close = () => this.api.close()
  setMiniMode = (isMini: boolean) => this.api.setMiniMode(isMini)
  show = () => this.api.show()
  toggleFullscreen = () => this.api.toggleFullscreen()
  onFullscreenChanged = (cb: (isFullscreen: boolean) => void) => this.api.onFullscreenChanged(cb)
  onMusicCtrl = (cb: (event: Event, args: any) => void) => this.api.onMusicCtrl(cb)

  // === 音乐 SDK ===
  music = {
    requestSdk: <T extends string>(method: T, args: any) => this.api.music.requestSdk(method, args),
    invoke: (channel: string, ...args: any[]) => this.api.music.invoke(channel, ...args)
  }

  // === 音乐缓存 ===
  musicCache = {
    getInfo: () => this.api.musicCache.getInfo(),
    clear: () => this.api.musicCache.clear(),
    getSize: () => this.api.musicCache.getSize()
  }

  // === 下载管理 ===
  download = {
    getTasks: () => this.api.download.getTasks(),
    pauseTask: (taskId: string) => this.api.download.pauseTask(taskId),
    resumeTask: (taskId: string) => this.api.download.resumeTask(taskId),
    pauseAllTasks: () => this.api.download.pauseAllTasks(),
    resumeAllTasks: () => this.api.download.resumeAllTasks(),
    cancelTask: (taskId: string) => this.api.download.cancelTask(taskId),
    deleteTask: (taskId: string, deleteFile?: boolean) => this.api.download.deleteTask(taskId, deleteFile),
    retryTask: (taskId: string) => this.api.download.retryTask(taskId),
    setMaxConcurrent: (max: number) => this.api.download.setMaxConcurrent(max),
    getMaxConcurrent: () => this.api.download.getMaxConcurrent(),
    clearTasks: (type: 'queue' | 'completed' | 'failed' | 'all') => this.api.download.clearTasks(type),
    validateFiles: () => this.api.download.validateFiles(),
    openFileLocation: (filePath: string) => this.api.download.openFileLocation(filePath),
    onTaskAdded: (cb: any) => this.api.download.onTaskAdded(cb),
    onTaskProgress: (cb: any) => this.api.download.onTaskProgress(cb),
    onTaskStatusChanged: (cb: any) => this.api.download.onTaskStatusChanged(cb),
    onTaskCompleted: (cb: any) => this.api.download.onTaskCompleted(cb),
    onTaskError: (cb: any) => this.api.download.onTaskError(cb),
    onTaskDeleted: (cb: any) => this.api.download.onTaskDeleted(cb),
    onTasksReset: (cb: any) => this.api.download.onTasksReset(cb)
  }

  // === 歌单管理 ===
  songList = {
    create: (name: string, description?: string, source?: string, meta?: Record<string, any>) =>
      this.api.songList.create(name, description, source, meta),
    getAll: () => this.api.songList.getAll(),
    getById: (hashId: string) => this.api.songList.getById(hashId),
    delete: (hashId: string) => this.api.songList.delete(hashId),
    batchDelete: (hashIds: string[]) => this.api.songList.batchDelete(hashIds),
    edit: (hashId: string, updates: any) => this.api.songList.edit(hashId, updates),
    updateCover: (hashId: string, coverImgUrl: string) => this.api.songList.updateCover(hashId, coverImgUrl),
    search: (keyword: string, source?: string) => this.api.songList.search(keyword, source),
    getStatistics: () => this.api.songList.getStatistics(),
    exists: (hashId: string) => this.api.songList.exists(hashId),
    addSongs: (hashId: string, songs: any[]) => this.api.songList.addSongs(hashId, songs),
    removeSong: (hashId: string, songmid: string | number) => this.api.songList.removeSong(hashId, songmid),
    removeSongs: (hashId: string, songmids: (string | number)[]) => this.api.songList.removeSongs(hashId, songmids),
    clearSongs: (hashId: string) => this.api.songList.clearSongs(hashId),
    getSongs: (hashId: string) => this.api.songList.getSongs(hashId),
    getSongCount: (hashId: string) => this.api.songList.getSongCount(hashId),
    hasSong: (hashId: string, songmid: string | number) => this.api.songList.hasSong(hashId, songmid),
    getSong: (hashId: string, songmid: string | number) => this.api.songList.getSong(hashId, songmid),
    searchSongs: (hashId: string, keyword: string) => this.api.songList.searchSongs(hashId, keyword),
    getSongStatistics: (hashId: string) => this.api.songList.getSongStatistics(hashId),
    validateIntegrity: (hashId: string) => this.api.songList.validateIntegrity(hashId),
    repairData: (hashId: string) => this.api.songList.repairData(hashId),
    forceSave: (hashId: string) => this.api.songList.forceSave(hashId),
    reorderSongs: (hashId: string, songmids: (string | number)[]) => this.api.songList.reorderSongs(hashId, songmids),
    moveSong: (hashId: string, songmid: string | number, toIndex: number) => this.api.songList.moveSong(hashId, songmid, toIndex),
    getFavoritesId: () => this.api.songList.getFavoritesId(),
    setFavoritesId: (favoritesId: string) => this.api.songList.setFavoritesId(favoritesId)
  }

  // === AI ===
  ai = {
    ask: (prompt: string) => this.api.ai.ask(prompt),
    askStream: (prompt: string, streamId: string) => this.api.ai.askStream(prompt, streamId),
    onStreamChunk: (cb: (data: { streamId: string; chunk: string }) => void) => this.api.ai.onStreamChunk(cb),
    onStreamEnd: (cb: (data: { streamId: string }) => void) => this.api.ai.onStreamEnd(cb),
    onStreamError: (cb: (data: { streamId: string; error: string }) => void) => this.api.ai.onStreamError(cb),
    removeStreamListeners: () => this.api.ai.removeStreamListeners()
  }

  // === 窗口关闭 ===
  windowClose = {
    onRequest: (cb: () => void) => this.api.windowClose.onRequest(cb)
  }

  // === 设置同步 ===
  settings = {
    syncCloseToTray: (value: boolean) => this.api.settings.syncCloseToTray(value),
    getCloseToTray: () => this.api.settings.getCloseToTray()
  }

  // === 插件管理 ===
  plugins = {
    selectAndAddPlugin: (type: 'lx' | 'cr') => this.api.plugins.selectAndAddPlugin(type),
    downloadAndAddPlugin: (url: string, type: 'lx' | 'cr', targetPluginId?: string) =>
      this.api.plugins.downloadAndAddPlugin(url, type, targetPluginId),
    uninstallPlugin: (pluginId: string) => this.api.plugins.uninstallPlugin(pluginId),
    addPlugin: (pluginCode: string, pluginName: string, targetPluginId?: string) =>
      this.api.plugins.addPlugin(pluginCode, pluginName, targetPluginId),
    getPluginType: (pluginId: string) => this.api.plugins.getPluginType(pluginId),
    getConfigSchema: (pluginId: string) => this.api.plugins.getConfigSchema(pluginId),
    getConfig: (pluginId: string) => this.api.plugins.getConfig(pluginId),
    saveConfig: (pluginId: string, config: Record<string, any>) => this.api.plugins.saveConfig(pluginId, config),
    testConnection: (pluginId: string) => this.api.plugins.testConnection(pluginId),
    getPlaylists: (pluginId: string) => this.api.plugins.getPlaylists(pluginId),
    getPlaylistSongs: (pluginId: string, playlistId: string) => this.api.plugins.getPlaylistSongs(pluginId, playlistId),
    importToLocal: (pluginId: string, playlistId: string, playlistName?: string) =>
      this.api.plugins.importToLocal(pluginId, playlistId, playlistName),
    getServiceLyric: (pluginId: string, songInfo: any) => this.api.plugins.getServiceLyric(pluginId, songInfo),
    onDeepLinkAdd: (cb: (payload: { url: string; type: 'lx' | 'cr'; targetPluginId?: string }) => void) =>
      this.api.plugins.onDeepLinkAdd(cb),
    getPluginById: (id: string) => this.api.plugins.getPluginById(id),
    loadAllPlugins: () => this.api.plugins.loadAllPlugins(),
    getPluginLog: (pluginId: string) => this.api.plugins.getPluginLog(pluginId)
  }

  // === Ping ===
  ping = (cb: (...args: any[]) => void) => this.api.ping(cb)
  pingService = {
    start: () => this.api.pingService.start(),
    stop: () => this.api.pingService.stop()
  }

  // === 目录设置 ===
  directorySettings = {
    getDirectories: () => this.api.directorySettings.getDirectories(),
    selectCacheDir: () => this.api.directorySettings.selectCacheDir(),
    selectDownloadDir: () => this.api.directorySettings.selectDownloadDir(),
    saveDirectories: (dirs: { cacheDir: string; downloadDir: string }) => this.api.directorySettings.saveDirectories(dirs),
    resetDirectories: () => this.api.directorySettings.resetDirectories(),
    openDirectory: (dirPath: string) => this.api.directorySettings.openDirectory(dirPath),
    getDirectorySize: (dirPath: string) => this.api.directorySettings.getDirectorySize(dirPath)
  }

  // === 用户配置 ===
  getUserConfig = () => this.api.getUserConfig()

  // === 快捷键 ===
  hotkeys = {
    get: () => this.api.hotkeys.get(),
    set: (payload: any) => this.api.hotkeys.set(payload)
  }

  // === 插件通知 ===
  pluginNotice = {
    onPluginNotice: (listener: (...args: any[]) => void) => this.api.pluginNotice.onPluginNotice(listener),
    onPluginThrottle: (listener: (data: { pluginId: string; reason: string; duration?: number }) => void) =>
      this.api.pluginNotice.onPluginThrottle(listener),
    onPluginDisabled: (listener: (data: { pluginId: string; reason: string }) => void) =>
      this.api.pluginNotice.onPluginDisabled(listener)
  }

  // === 本地音乐 ===
  localMusic = {
    selectDirs: () => this.api.localMusic.selectDirs(),
    scan: (dirs: string[]) => this.api.localMusic.scan(dirs),
    writeTags: (filePath: string, songInfo: any, tagWriteOptions: any) =>
      this.api.localMusic.writeTags(filePath, songInfo, tagWriteOptions),
    getLyric: (songmid: string) => this.api.localMusic.getLyric(songmid),
    onScanProgress: (cb: (processed: number, total: number) => void) => this.api.localMusic.onScanProgress(cb),
    onScanFinished: (cb: (resList: any[]) => void) => this.api.localMusic.onScanFinished(cb),
    removeScanProgress: () => this.api.localMusic.removeScanProgress(),
    removeScanFinished: () => this.api.localMusic.removeScanFinished()
  }

  // === 分享 ===
  share = {
    getPluginCodeAndMd5: (pluginId: string) => this.api.share.getPluginCodeAndMd5(pluginId),
    onShareOpen: (cb: (payload: { id: string }) => void) => this.api.share.onShareOpen(cb),
    onPlaylistShareOpen: (cb: (payload: { id: string }) => void) => this.api.share.onPlaylistShareOpen(cb),
    getPending: () => this.api.share.getPending(),
    getPendingPlaylistShares: () => this.api.share.getPendingPlaylistShares()
  }

  // === 一起听 ===
  listenTogether = {
    onShareOpen: (cb: (payload: { code: string }) => void) => this.api.listenTogether.onShareOpen(cb),
    getPendingCodes: () => this.api.listenTogether.getPendingCodes()
  }

  // === 剪贴板 ===
  clipboard = {
    readText: () => this.api.clipboard.readText()
  }

  // === 系统音频捕获 ===
  systemAudio = {
    prepareCapture: () => this.api.systemAudio.prepareCapture(),
    getDefaultScreenSourceId: () => this.api.systemAudio.getDefaultScreenSourceId(),
    getAllScreenSourceIds: () => this.api.systemAudio.getAllScreenSourceIds()
  }

  // === 自动更新 ===
  autoUpdater = this.api.autoUpdater
}
