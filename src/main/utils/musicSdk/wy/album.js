import { eapiRequest } from './utils/index'
import { formatPlayTime, sizeFormate } from '../../index'
import { formatSingerName } from '../utils'

const getDurationSeconds = (item) => {
  const duration = Number(item.duration ?? item.dt ?? 0)
  if (!duration) return 0
  return duration > 10000 ? duration / 1000 : duration
}

const filterSongList = (raw, albumInfo = {}) => {
  const list = []
  raw.forEach((item) => {
    if (!item.id) return

    const types = []
    const _types = {}
    let size
    ;(item.privilege?.chargeInfoList || []).forEach((i) => {
      switch (i.rate) {
        case 128000:
          size = item.lMusic ? sizeFormate(item.lMusic.size) : null
          types.push({ type: '128k', size })
          _types['128k'] = { size }
          break
        case 320000:
          size = item.hMusic ? sizeFormate(item.hMusic.size) : null
          types.push({ type: '320k', size })
          _types['320k'] = { size }
          break
        case 999000:
          size = item.sqMusic ? sizeFormate(item.sqMusic.size) : null
          types.push({ type: 'flac', size })
          _types.flac = { size }
          break
        case 1999000:
          size = item.hrMusic ? sizeFormate(item.hrMusic.size) : null
          types.push({ type: 'flac24bit', size })
          _types.flac24bit = { size }
          break
      }
    })

    const album = item.album || item.al || albumInfo
    const artists = item.artists || item.ar || albumInfo.artists || []

    list.push({
      singer: formatSingerName(artists),
      name: item.name,
      albumName: album?.name || '',
      albumId: album?.id || '',
      songmid: item.id,
      source: 'wy',
      interval: formatPlayTime(getDurationSeconds(item)),
      img: album?.picUrl || albumInfo?.picUrl || null,
      lrc: null,
      otherSource: null,
      types,
      _types,
      typeUrl: {}
    })
  })
  return list
}

export default {
  async getAlbumDetail(id, page = 1, limit = 50) {
    const { body } = await eapiRequest(`/api/v1/album/${id}`, { id }).promise
    if (!body?.songs || body.code != 200) throw new Error('get album detail failed.')

    const album = body.album || {}
    const allSongs = filterSongList(body.songs, album)
    const start = Math.max(0, page - 1) * limit
    const list = allSongs.slice(start, start + limit)

    return {
      list,
      page,
      limit,
      total: allSongs.length,
      source: 'wy',
      info: {
        name: album.name || '',
        img: album.picUrl || '',
        desc: album.description || album.briefDesc || '',
        author: formatSingerName(album.artists || [])
      }
    }
  }
}
