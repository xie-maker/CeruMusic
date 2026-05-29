/**
 * 浏览器版音乐 SDK 入口
 *
 * 替代主进程的 service.ts，使用浏览器兼容的模块。
 */

// 导入音乐源模块
import wy from './sources/wy'
import tx from './sources/tx'
import kg from './sources/kg'
import kw from './sources/kw'
import mg from './sources/mg'
import bd from './sources/bd'
import git from './sources/git'

// 音乐源映射
const musicSdk: Record<string, any> = {
  wy,
  tx,
  kg,
  kw,
  mg,
  bd,
  git
}

// 聚合搜索顺序
const AGGREGATE_ORDER = ['wy', 'kg', 'tx', 'kw', 'mg', 'git']

/**
 * 交错合并多个数组
 */
function interleave(arrays: any[][]): any[] {
  const result: any[] = []
  const maxLen = Math.max(...arrays.map(a => a.length))
  for (let i = 0; i < maxLen; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        result.push(arr[i])
      }
    }
  }
  return result
}

/**
 * Promise.allSettled 包装
 */
async function settle(promises: Promise<any>[]): Promise<any[]> {
  return Promise.allSettled(promises).then(results =>
    results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value)
  )
}

/**
 * 聚合搜索
 */
async function aggregateSearch(keyword: string, page: number, limit: number) {
  const promises = AGGREGATE_ORDER.map(source => {
    const sdk = musicSdk[source]
    if (!sdk?.musicSearch?.search) return Promise.resolve([])
    return sdk.musicSearch.search(keyword, page, limit).catch(() => [])
  })

  const results = await settle(promises)
  const lists = results.map(r => r?.list || [])
  return interleave(lists)
}

/**
 * 聚合提示搜索
 */
async function aggregateTipSearch(keyword: string) {
  const promises = AGGREGATE_ORDER.map(source => {
    const sdk = musicSdk[source]
    if (!sdk?.tipSearch?.search) return Promise.resolve([])
    return sdk.tipSearch.search(keyword).catch(() => [])
  })

  const results = await settle(promises)
  const all = results.flat()
  // 按 name 去重
  const seen = new Set()
  return all.filter(item => {
    if (seen.has(item.name)) return false
    seen.add(item.name)
    return true
  })
}

/**
 * 主入口函数，返回指定音乐源的 API
 */
export function browserMain(source: string = 'wy') {
  if (source === 'all') {
    return {
      search: aggregateSearch,
      tipSearch: aggregateTipSearch
    }
  }

  const sdk = musicSdk[source]
  if (!sdk) {
    console.warn(`[browserMain] 未知的音乐源: ${source}`)
    return {}
  }

  return sdk
}

/**
 * 获取所有可用的音乐源
 */
export function getAvailableSources(): string[] {
  return Object.keys(musicSdk)
}

/**
 * 跨源精确匹配歌曲
 */
export async function findMusic(songInfo: any): Promise<any> {
  const { name, singer, albumName, interval } = songInfo
  const keyword = `${name} ${singer}`

  const results = await aggregateSearch(keyword, 1, 30)

  // 按匹配度排序
  return results.sort((a: any, b: any) => {
    let scoreA = 0
    let scoreB = 0

    // 歌名匹配
    if (a.name === name) scoreA += 10
    if (b.name === name) scoreB += 10

    // 歌手匹配
    if (a.singer === singer) scoreA += 5
    if (b.singer === singer) scoreB += 5

    // 专辑匹配
    if (a.albumName === albumName) scoreA += 3
    if (b.albumName === albumName) scoreB += 3

    // 时长匹配
    if (interval) {
      const diffA = Math.abs(parseInt(a.interval || '0') - parseInt(interval))
      const diffB = Math.abs(parseInt(b.interval || '0') - parseInt(interval))
      if (diffA < 5) scoreA += 2
      if (diffB < 5) scoreB += 2
    }

    return scoreB - scoreA
  })[0] || null
}
