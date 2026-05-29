<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PlayCircleIcon, AddIcon, HeartIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import { storeToRefs } from 'pinia'
import SongVirtualList from '@renderer/components/Music/SongVirtualList.vue'
import CollectToPlaylistDialog from '@renderer/components/Music/CollectToPlaylistDialog.vue'
import songListAPI from '@renderer/api/songList'
import { downloadSingleSong } from '@renderer/utils/audio/download'
import { LocalUserDetailStore } from '@renderer/store/LocalUserDetail'
import { useSettingsStore } from '@renderer/store/Settings'
import songCover from '@assets/images/song.jpg'
import type { SongList } from '@common/types/songList'
import { getPlatformService } from '@common/platform'

interface MusicItem {
  id?: number | string
  singer: string
  name: string
  albumName: string
  albumId: number | string
  source: string
  interval: string
  songmid: number | string
  img: string
  lrc: null | string
  types: any[]
  _types: Record<string, any>
  typeUrl: Record<string, any>
}

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const filenameTemplate = ref(settings.value.filenameTemplate)
const localUserStore = LocalUserDetailStore()

const artistInfo = ref({
  id: '',
  name: '',
  avatar: '',
  desc: '',
  source: '',
  musicCount: 0,
  albumCount: 0
})
const songs = ref<any[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const actionLoading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 50
const totalItems = ref(0)
const currentSong = ref<any | null>(null)
const isPlaying = ref(false)
const collectDialogVisible = ref(false)

const artistId = computed(() => String(route.query.id || ''))
const artistName = computed(() => String(route.query.name || ''))
const artistSource = computed(() =>
  String(route.query.source || localUserStore.userSource.source || 'wy')
)

const displayTitle = computed(() => artistInfo.value.name || artistName.value || '歌手主页')
const displayAvatar = computed(() => artistInfo.value.avatar || String(route.query.avatar || ''))
const hasSongs = computed(() => songs.value.length > 0)

const normalize = (text: string) => text.replace(/\s/g, '').toLowerCase()
const artistMatchedSongs = (list: MusicItem[]) => {
  if (artistId.value) return list
  const target = normalize(artistName.value)
  const filtered = list.filter((song) => normalize(song.singer || '').includes(target))
  return filtered.length ? filtered : list
}

const normalizeArtistSongs = (list: MusicItem[], page: number, limit: number) =>
  artistMatchedSongs(list).map((song: any, index: number) => ({
    ...song,
    id: song.id || song.songmid || `${page}-${limit}-${index}`
  }))

const dedupeSongs = (list: any[]) => {
  const seen = new Set<string>()
  return list.filter((song) => {
    const key = [
      song.source || artistSource.value,
      song.songmid || song.songId || song.hash || '',
      song.name || '',
      song.singer || '',
      song.albumId || song.albumName || ''
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const requestArtistSongs = (page: number, limit: number) =>
  getPlatformService().music.requestSdk('getArtistSongs', {
    source: artistSource.value,
    id: artistId.value,
    keyword: artistName.value,
    page,
    limit
  })

const fetchArtistInfo = async () => {
  artistInfo.value = {
    id: artistId.value,
    name: artistName.value,
    avatar: String(route.query.avatar || ''),
    desc: '',
    source: artistSource.value,
    musicCount: 0,
    albumCount: 0
  }

  if (!artistId.value) return
  try {
    const res = await getPlatformService().music.requestSdk('getArtistInfo', {
      source: artistSource.value,
      id: artistId.value
    })
    if (!res) return
    artistInfo.value = {
      id: String(res.id || artistId.value),
      name: res.info?.name || artistName.value,
      avatar: res.info?.avatar || String(route.query.avatar || ''),
      desc: res.info?.desc || '',
      source: res.source || artistSource.value,
      musicCount: res.count?.music || 0,
      albumCount: res.count?.album || 0
    }
  } catch (e) {
    console.warn('获取歌手信息失败，使用搜索结果兜底:', e)
  }
}

const fetchArtistSongs = async (reset = false) => {
  if (loading.value || loadingMore.value || !artistName.value) return
  if (reset) {
    currentPage.value = 1
    songs.value = []
    hasMore.value = true
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res = await requestArtistSongs(currentPage.value, pageSize)
    const list = normalizeArtistSongs(
      Array.isArray(res?.list) ? res.list : [],
      currentPage.value,
      pageSize
    )
    const offset = songs.value.length
    songs.value = reset ? list : [...songs.value, ...list]
    totalItems.value = res?.total || songs.value.length
    hasMore.value = list.length >= pageSize && songs.value.length < totalItems.value
    currentPage.value += 1
    setPic(offset)
  } catch (e) {
    console.error('获取歌手歌曲失败:', e)
    MessagePlugin.error('获取歌手歌曲失败')
    hasMore.value = false
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const getAllArtistSongs = async () => {
  const batchSize = 100
  const maxPages = 60
  const collected: any[] = []
  let page = 1
  let total = 0
  let rawCount = 0

  while (page <= maxPages) {
    const res = await requestArtistSongs(page, batchSize)
    const rawList = Array.isArray(res?.list) ? res.list : []
    total = Number(res?.total) || total || artistInfo.value.musicCount || totalItems.value || 0
    rawCount += rawList.length
    collected.push(...normalizeArtistSongs(rawList, page, batchSize))

    if (rawList.length < batchSize) break
    if (total && rawCount >= total) break
    page += 1
  }

  const fullList = dedupeSongs(collected)
  return fullList.length ? fullList : songs.value
}

async function setPic(offset: number) {
  for (let i = offset; i < songs.value.length; i++) {
    if (songs.value[i].img) continue
    const source = songs.value[i].source || artistSource.value
    try {
      const url = await getPlatformService().music.requestSdk('getPic', {
        source,
        songInfo: toRaw(songs.value[i])
      })
      songs.value[i].img = typeof url === 'object' ? '' : url
    } catch {
      songs.value[i].img = ''
    }
  }
}

const replacePlaylist = (playlistSongs: MusicItem[]) => {
  if (!playlistSongs.length) {
    MessagePlugin.warning('暂无可播放歌曲')
    return
  }
  if (!(window as any).musicEmitter) {
    MessagePlugin.error('播放器未初始化')
    return
  }
  ;(window as any).musicEmitter.emit(
    'replacePlaylist',
    playlistSongs.map((song) => toRaw(song))
  )
  MessagePlugin.success(`已开始播放 ${displayTitle.value} 的歌曲`)
}

const playAll = async () => {
  if (!songs.value.length || actionLoading.value) return
  actionLoading.value = true
  try {
    replacePlaylist(await getAllArtistSongs())
  } catch (e: any) {
    MessagePlugin.error(e?.message || '获取全部歌曲失败')
  } finally {
    actionLoading.value = false
  }
}

const addAllToQueue = async () => {
  if (!songs.value.length) {
    MessagePlugin.warning('暂无可添加歌曲')
    return
  }
  if (actionLoading.value) return
  if (!(window as any).musicEmitter) {
    MessagePlugin.error('播放器未初始化')
    return
  }
  actionLoading.value = true
  try {
    const allSongs = await getAllArtistSongs()
    allSongs.forEach((song) => {
      ;(window as any).musicEmitter.emit('addToPlaylistEnd', toRaw(song))
    })
    MessagePlugin.success(`已添加 ${allSongs.length} 首歌曲到播放列表`)
  } catch (e: any) {
    MessagePlugin.error(e?.message || '加入播放列表失败')
  } finally {
    actionLoading.value = false
  }
}

const routerToAlbums = () => {
  router.push({
    name: 'artist-albums',
    query: {
      id: artistId.value,
      name: displayTitle.value,
      source: artistSource.value,
      avatar: displayAvatar.value
    }
  })
}

const openCollectDialog = () => {
  if (!songs.value.length) {
    MessagePlugin.warning('暂无可收藏歌曲')
    return
  }
  collectDialogVisible.value = true
}

const collectArtistSongs = async (playlist: SongList) => {
  if (actionLoading.value) return
  actionLoading.value = true
  try {
    const allSongs = await getAllArtistSongs()
    const result = await songListAPI.addSongs(
      playlist.id,
      allSongs.map((song) => toRaw(song) as any)
    )
    if (!result.success) {
      MessagePlugin.error(result.error || '收藏失败')
      return
    }
    const added = (result.data as any)?.added ?? allSongs.length
    const skipped = (result.data as any)?.skipped ?? 0
    collectDialogVisible.value = false
    MessagePlugin.success(
      `已收藏 ${added} 首歌曲到「${playlist.name}」${skipped ? `，跳过 ${skipped} 首重复` : ''}`
    )
  } catch (e: any) {
    MessagePlugin.error(e?.message || '收藏失败')
  } finally {
    actionLoading.value = false
  }
}

const handlePlay = (song: MusicItem) => {
  currentSong.value = song
  isPlaying.value = true
  if ((window as any).musicEmitter) {
    ;(window as any).musicEmitter.emit('addToPlaylistAndPlay', toRaw(song))
  }
}

const handlePause = () => {
  isPlaying.value = false
  if ((window as any).musicEmitter) {
    ;(window as any).musicEmitter.emit('pause')
  }
}

const handleAddToPlaylist = (song: MusicItem) => {
  if ((window as any).musicEmitter) {
    ;(window as any).musicEmitter.emit('addToPlaylistEnd', toRaw(song))
  }
}

const handleDownload = (song: any) => {
  const d = new Date()
  song.template = filenameTemplate.value
  song.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  downloadSingleSong(song)
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value) {
    fetchArtistSongs(false)
  }
}

const loadArtistPage = async () => {
  await fetchArtistInfo()
  await fetchArtistSongs(true)
}

onMounted(loadArtistPage)
watch(
  () => route.fullPath,
  () => loadArtistPage()
)
</script>

<template>
  <div class="artist-page">
    <div class="artist-header">
      <div class="artist-cover">
        <img v-if="displayAvatar" :src="displayAvatar" :alt="displayTitle" />
        <img v-else :src="songCover" :alt="displayTitle" />
      </div>
      <div class="artist-meta">
        <div class="artist-source">{{ artistSource }}</div>
        <h2>{{ displayTitle }}</h2>
        <p v-if="artistInfo.desc" class="artist-desc">{{ artistInfo.desc }}</p>
        <div class="artist-stats">
          <span>{{ totalItems || artistInfo.musicCount || songs.length }} 首歌曲</span>
          <span v-if="artistInfo.albumCount">{{ artistInfo.albumCount }} 张专辑</span>
        </div>
        <div class="artist-actions">
          <t-button
            theme="primary"
            :disabled="!hasSongs || actionLoading"
            :loading="actionLoading"
            @click="playAll"
          >
            <template #icon><PlayCircleIcon /></template>
            播放全部
          </t-button>
          <t-button
            theme="default"
            :disabled="!hasSongs || actionLoading"
            :loading="actionLoading"
            @click="openCollectDialog"
          >
            <template #icon><HeartIcon /></template>
            收藏歌曲
          </t-button>
          <t-button
            theme="default"
            :disabled="!hasSongs || actionLoading"
            :loading="actionLoading"
            @click="addAllToQueue"
          >
            <template #icon><AddIcon /></template>
            加入播放列表
          </t-button>
          <t-button class="album-entry" theme="default" @click="routerToAlbums">专辑</t-button>
        </div>
      </div>
    </div>

    <CollectToPlaylistDialog
      v-model:visible="collectDialogVisible"
      :busy="actionLoading"
      @confirm="collectArtistSongs"
    />

    <div class="artist-song-list">
      <SongVirtualList
        v-if="hasSongs"
        :songs="songs"
        :current-song="currentSong"
        :is-playing="isPlaying"
        :show-index="true"
        :show-album="true"
        :show-duration="true"
        @play="handlePlay"
        @pause="handlePause"
        @download="handleDownload"
        @add-to-playlist="handleAddToPlaylist"
        @scroll="handleScroll"
      />
      <div v-else class="empty-state">
        <div v-if="loading" class="loading-spinner"></div>
        <template v-else>
          <h3>暂无歌曲</h3>
          <p>这个音源暂时没有返回该歌手的歌曲</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.artist-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.artist-header {
  flex-shrink: 0;
  display: flex;
  gap: 20px;
  align-items: flex-end;
  padding: 18px;
  border-radius: 8px;
  background: var(--search-content-bg);
  box-shadow: var(--search-content-shadow);
}

.artist-cover {
  width: 148px;
  height: 148px;
  flex: 0 0 148px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--td-bg-color-component);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.artist-meta {
  min-width: 0;
  flex: 1;

  .artist-source {
    display: inline-flex;
    align-items: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 6px;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    background: var(--td-bg-color-component);
    margin-bottom: 8px;
  }

  h2 {
    margin: 0;
    font-size: 28px;
    line-height: 1.25;
    color: var(--search-title-color);
  }
}

.artist-desc {
  margin: 8px 0 0;
  max-width: 760px;
  color: var(--td-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.artist-stats {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
}

.artist-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;

  .album-entry {
    margin-left: auto;
    min-width: 112px;
  }
}

.artist-song-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border-radius: 8px;
  background: var(--search-content-bg);
  box-shadow: var(--search-content-shadow);
}

.empty-state {
  height: 100%;
  min-height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--td-text-color-secondary);

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 500;
  }

  p {
    margin: 0;
    font-size: 12px;
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--search-loading-border);
  border-top: 4px solid var(--search-loading-spinner);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .artist-page {
    padding: 15px;
  }

  .artist-header {
    align-items: center;
  }

  .artist-actions .album-entry {
    margin-left: 0;
  }

  .artist-cover {
    width: 96px;
    height: 96px;
    flex-basis: 96px;
  }

  .artist-meta h2 {
    font-size: 22px;
  }
}
</style>
