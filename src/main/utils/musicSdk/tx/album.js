import { httpFetch } from '../../request'
import { filterMusicInfoItem } from './singer'

const createMusicuFetch = async (data, retryNum = 0) => {
  if (retryNum > 2) throw new Error('try max num')
  let result
  try {
    result = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      body: {
        comm: {
          cv: 4747474,
          ct: 24,
          format: 'json',
          inCharset: 'utf-8',
          outCharset: 'utf-8',
          uin: 0
        },
        ...data
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)'
      }
    }).promise
  } catch {
    return createMusicuFetch(data, ++retryNum)
  }
  if (result.statusCode !== 200 || result.body.code != 0) return createMusicuFetch(data, ++retryNum)
  return result.body
}

export default {
  async getAlbumDetail(id, page = 1, limit = 50) {
    const begin = Math.max(0, page - 1) * limit
    const body = await createMusicuFetch({
      req: {
        module: 'music.musichallAlbum.AlbumSongList',
        method: 'GetAlbumSongList',
        param: {
          albumMid: id,
          begin,
          num: limit,
          order: 2
        }
      }
    })

    if (body.req.code != 0) throw new Error('get album detail failed.')
    const data = body.req.data || {}
    const list = (data.songList || []).map((item) => filterMusicInfoItem(item.songInfo || item))
    const album = data.album || data.albumInfo || {}

    return {
      source: 'tx',
      list,
      page,
      limit,
      total: data.totalNum || data.total || list.length,
      info: {
        name: album.name || album.albumName || '',
        img:
          album.mid || id
            ? `https://y.gtimg.cn/music/photo_new/T002R500x500M000${album.mid || id}.jpg`
            : '',
        desc: album.desc || '',
        author: album.singerName || ''
      }
    }
  }
}
