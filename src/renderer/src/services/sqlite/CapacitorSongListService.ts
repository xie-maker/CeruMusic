/**
 * Capacitor SQLite 歌单服务
 *
 * 替代主进程的 PlaylistDatabase + ManageSongList，
 * 使用 @capacitor-community/sqlite 在安卓端存储歌单数据。
 */

import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite'
import type { SongList, Songs } from '@common/types/songList'

const DB_NAME = 'cerumusic'
const DEFAULT_COVER = 'default-cover'

// 数据库表结构
const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS playlists (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    description  TEXT DEFAULT '',
    coverImgUrl  TEXT DEFAULT '${DEFAULT_COVER}',
    source       TEXT NOT NULL,
    meta         TEXT DEFAULT '{}',
    createTime   TEXT NOT NULL,
    updateTime   TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS playlist_songs (
    playlist_id  TEXT NOT NULL,
    songmid      TEXT NOT NULL,
    position     INTEGER NOT NULL,
    data         TEXT NOT NULL,
    name         TEXT DEFAULT '',
    singer       TEXT DEFAULT '',
    albumName    TEXT DEFAULT '',
    img          TEXT DEFAULT '',
    PRIMARY KEY (playlist_id, songmid),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_playlist_songs_position
    ON playlist_songs(playlist_id, position);
  CREATE INDEX IF NOT EXISTS idx_playlist_songs_name
    ON playlist_songs(playlist_id, name);
`

export class CapacitorSongListService {
  private db: SQLiteDBConnection | null = null
  private initialized = false

  /**
   * 初始化数据库连接
   */
  async init(): Promise<void> {
    if (this.initialized) return

    try {
      // 检查 Web 平台是否可用（需要 jeep-sqlite 组件）
      const platform = CapacitorSQLite.getPlatform()
      if (platform.platform === 'web') {
        // Web 平台需要 jeep-sqlite 组件
        const jeepSqlite = document.querySelector('jeep-sqlite')
        if (!jeepSqlite) {
          const el = document.createElement('jeep-sqlite')
          document.body.appendChild(el)
          await customElements.whenDefined('jeep-sqlite')
          await (el as any).init()
        }
      }

      // 创建或打开数据库
      await CapacitorSQLite.createConnection({
        database: DB_NAME,
        encrypted: false,
        mode: 'no-encryption',
        version: 1
      })

      this.db = await CapacitorSQLite.retrieveConnection(DB_NAME, false)

      // 打开数据库
      await this.db.open()

      // 创建表
      await this.db.execute(CREATE_TABLES_SQL)

      this.initialized = true
      console.log('[CapacitorSongListService] 数据库初始化成功')
    } catch (error) {
      console.error('[CapacitorSongListService] 初始化失败:', error)
      throw error
    }
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInit(): Promise<void> {
    if (!this.initialized || !this.db) {
      await this.init()
    }
  }

  // ===== 歌单操作 =====

  /**
   * 创建新歌单
   */
  async createPlaylist(
    name: string,
    description: string = '',
    source: SongList['source'],
    meta?: Record<string, any>
  ): Promise<{ id: string }> {
    await this.ensureInit()

    const id = this.generateId(name)
    const now = new Date().toISOString()
    const playlist: SongList = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      coverImgUrl: DEFAULT_COVER,
      source,
      meta: meta || {},
      createTime: now,
      updateTime: now
    }

    await this.db!.run(
      `INSERT INTO playlists (id, name, description, coverImgUrl, source, meta, createTime, updateTime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [playlist.id, playlist.name, playlist.description, playlist.coverImgUrl,
       playlist.source, JSON.stringify(playlist.meta), playlist.createTime, playlist.updateTime]
    )

    return { id }
  }

  /**
   * 获取所有歌单
   */
  async getAllPlaylists(): Promise<SongList[]> {
    await this.ensureInit()

    const result = await this.db!.query('SELECT * FROM playlists ORDER BY createTime ASC')
    return (result.values || []).map(this.rowToSongList)
  }

  /**
   * 根据 ID 获取歌单
   */
  async getPlaylistById(hashId: string): Promise<SongList | null> {
    await this.ensureInit()

    const result = await this.db!.query('SELECT * FROM playlists WHERE id = ?', [hashId])
    if (!result.values || result.values.length === 0) return null
    return this.rowToSongList(result.values[0])
  }

  /**
   * 删除歌单
   */
  async deletePlaylist(hashId: string): Promise<void> {
    await this.ensureInit()

    // 外键级联删除会自动删除关联的歌曲
    await this.db!.run('DELETE FROM playlists WHERE id = ?', [hashId])
  }

  /**
   * 批量删除歌单
   */
  async batchDeletePlaylists(hashIds: string[]): Promise<{ deleted: number }> {
    await this.ensureInit()

    let deleted = 0
    for (const id of hashIds) {
      const result = await this.db!.run('DELETE FROM playlists WHERE id = ?', [id])
      if (result.changes && result.changes > 0) deleted++
    }
    return { deleted }
  }

  /**
   * 更新歌单信息
   */
  async updatePlaylist(hashId: string, updates: Partial<Omit<SongList, 'id' | 'createTime'>>): Promise<void> {
    await this.ensureInit()

    const now = new Date().toISOString()
    await this.db!.run(
      `UPDATE playlists SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        coverImgUrl = COALESCE(?, coverImgUrl),
        source = COALESCE(?, source),
        meta = COALESCE(?, meta),
        updateTime = ?
       WHERE id = ?`,
      [updates.name, updates.description, updates.coverImgUrl, updates.source,
       updates.meta ? JSON.stringify(updates.meta) : null, now, hashId]
    )
  }

  /**
   * 更新歌单封面
   */
  async updateCover(hashId: string, coverImgUrl: string): Promise<void> {
    await this.ensureInit()

    const now = new Date().toISOString()
    await this.db!.run(
      'UPDATE playlists SET coverImgUrl = ?, updateTime = ? WHERE id = ?',
      [coverImgUrl, now, hashId]
    )
  }

  /**
   * 检查歌单是否存在
   */
  async exists(hashId: string): Promise<boolean> {
    await this.ensureInit()

    const result = await this.db!.query('SELECT COUNT(*) as count FROM playlists WHERE id = ?', [hashId])
    return (result.values?.[0]?.count || 0) > 0
  }

  /**
   * 搜索歌单
   */
  async searchPlaylists(keyword: string, source?: string): Promise<SongList[]> {
    await this.ensureInit()

    let sql = 'SELECT * FROM playlists WHERE name LIKE ?'
    const params: any[] = [`%${keyword}%`]

    if (source) {
      sql += ' AND source = ?'
      params.push(source)
    }

    sql += ' ORDER BY updateTime DESC'

    const result = await this.db!.query(sql, params)
    return (result.values || []).map(this.rowToSongList)
  }

  // ===== 歌曲操作 =====

  /**
   * 添加歌曲到歌单
   */
  async addSongs(hashId: string, songs: Songs[]): Promise<void> {
    await this.ensureInit()

    // 获取当前最大位置
    const maxResult = await this.db!.query(
      'SELECT MAX(position) as maxPos FROM playlist_songs WHERE playlist_id = ?',
      [hashId]
    )
    let position = (maxResult.values?.[0]?.maxPos || 0) + 1

    for (const song of songs) {
      try {
        await this.db!.run(
          `INSERT OR REPLACE INTO playlist_songs (playlist_id, songmid, position, data, name, singer, albumName, img)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [hashId, String(song.songmid), position, JSON.stringify(song),
           String(song.name || ''), String(song.singer || ''),
           String(song.albumName || ''), String(song.img || '')]
        )
        position++
      } catch (error) {
        console.error('添加歌曲失败:', error)
      }
    }

    // 更新歌单的 updateTime
    await this.updatePlaylistTime(hashId)
  }

  /**
   * 从歌单移除歌曲
   */
  async removeSong(hashId: string, songmid: string | number): Promise<boolean> {
    await this.ensureInit()

    const result = await this.db!.run(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND songmid = ?',
      [hashId, String(songmid)]
    )

    if (result.changes && result.changes > 0) {
      await this.updatePlaylistTime(hashId)
      return true
    }
    return false
  }

  /**
   * 批量移除歌曲
   */
  async removeSongs(hashId: string, songmids: (string | number)[]): Promise<{ removed: number }> {
    await this.ensureInit()

    let removed = 0
    for (const songmid of songmids) {
      const result = await this.db!.run(
        'DELETE FROM playlist_songs WHERE playlist_id = ? AND songmid = ?',
        [hashId, String(songmid)]
      )
      if (result.changes && result.changes > 0) removed++
    }

    if (removed > 0) {
      await this.updatePlaylistTime(hashId)
    }
    return { removed }
  }

  /**
   * 清空歌单歌曲
   */
  async clearSongs(hashId: string): Promise<void> {
    await this.ensureInit()

    await this.db!.run('DELETE FROM playlist_songs WHERE playlist_id = ?', [hashId])
    await this.updatePlaylistTime(hashId)
  }

  /**
   * 获取歌单中的歌曲列表
   */
  async getSongs(hashId: string): Promise<Songs[]> {
    await this.ensureInit()

    const result = await this.db!.query(
      'SELECT data FROM playlist_songs WHERE playlist_id = ? ORDER BY position ASC',
      [hashId]
    )

    return (result.values || []).map(row => {
      try {
        return JSON.parse(row.data)
      } catch {
        return null
      }
    }).filter(Boolean)
  }

  /**
   * 获取歌单歌曲数量
   */
  async getSongCount(hashId: string): Promise<number> {
    await this.ensureInit()

    const result = await this.db!.query(
      'SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ?',
      [hashId]
    )
    return result.values?.[0]?.count || 0
  }

  /**
   * 检查歌曲是否在歌单中
   */
  async hasSong(hashId: string, songmid: string | number): Promise<boolean> {
    await this.ensureInit()

    const result = await this.db!.query(
      'SELECT COUNT(*) as count FROM playlist_songs WHERE playlist_id = ? AND songmid = ?',
      [hashId, String(songmid)]
    )
    return (result.values?.[0]?.count || 0) > 0
  }

  /**
   * 重新排序歌曲
   */
  async reorderSongs(hashId: string, songmids: (string | number)[]): Promise<{ updated: number }> {
    await this.ensureInit()

    let updated = 0
    for (let i = 0; i < songmids.length; i++) {
      const result = await this.db!.run(
        'UPDATE playlist_songs SET position = ? WHERE playlist_id = ? AND songmid = ?',
        [i + 1, hashId, String(songmids[i])]
      )
      if (result.changes && result.changes > 0) updated++
    }

    if (updated > 0) {
      await this.updatePlaylistTime(hashId)
    }
    return { updated }
  }

  // ===== 辅助方法 =====

  private generateId(name: string): string {
    const data = `${name}_${Date.now()}_${Math.random()}`
    // 简单的 MD5 替代（使用 SubtleCrypto 或简单哈希）
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为 32 位整数
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + Date.now().toString(16)
  }

  private rowToSongList(row: any): SongList {
    let meta: Record<string, any> = {}
    try {
      meta = row.meta ? JSON.parse(row.meta) : {}
    } catch {
      meta = {}
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      coverImgUrl: row.coverImgUrl || DEFAULT_COVER,
      source: row.source,
      meta,
      createTime: row.createTime,
      updateTime: row.updateTime
    }
  }

  private async updatePlaylistTime(hashId: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db!.run('UPDATE playlists SET updateTime = ? WHERE id = ?', [now, hashId])
  }
}

// 导出单例
export const songListService = new CapacitorSongListService()
