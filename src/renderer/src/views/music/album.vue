<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
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
const localUserStore = LocalUserDetailStore()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const filenameTemplate = ref(settings.value.filenameTemplate)

const albumInfo = ref({
  id: '',
  name: '',
  cover: '',
  author: '',
  desc: '',
  source: '',
  total: 0
})
const songs = ref<any[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const actionLoading = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const pageSize = 50
const currentSong = ref<any | null>(null)
const isPlaying = ref(false)
const collectDialogVisible = ref(false)

const albumId = computed(() => String(route.query.id || ''))
const albumName = computed(() => String(route.query.name || ''))
const albumSource = computed(() =>
  String(route.query.source || localUserStore.userSource.source || 'wy')
)
const albumAuthor = computed(() => String(route.query.author || route.query.artistName || ''))
const displayTitle = computed(() => albumInfo.value.name || albumName.value || '专辑')
const displayCover = computed(() => albumInfo.value.cover || String(route.query.cover || ''))
const hasSongs = computed(() => songs.value.length > 0)

const normalize = (text: string) => text.replace(/\s/g, '').toLowerCase()
const matchedAlbumSongs = (list: MusicItem[]) => {
  if (albumId.value) return list
  const target = normalize(albumName.value)
  const filtered = list.filter((song) => normalize(song.albumName || '').includes(target))
  return filtered.length ? filtered : list
}

const fetchAlbumSongs = async (reset = false) => {
  if (loading.value || loadingMore.value || !albumName.value) return
  if (reset) {
    currentPage.value = 1
    songs.value = []
    hasMore.value = true
    loading.value = true
  } else {
    loadingMore.value = true
  }

  try {
    const res = await getPlatformService().music.requestSdk('getAlbumSongs', {
      source: albumSource.value,
      id: albumId.value,
      keyword: `${albumName.value} ${albumAuthor.value}`.trim(),
      page: currentPage.value,
      limit: pageSize
    })
    const list = matchedAlbumSongs(Array.isArray(res?.list) ? res.list : []).map(
      (song: any, index: number) => ({
        ...song,
        id: song.id || song.songmid || `${currentPage.value}-${index}`
      })
    )
    songs.value = reset ? list : [...songs.value, ...list]
    albumInfo.value = {
      id: albumId.value,
      name: res?.info?.name || albumName.value,
      cover: res?.info?.img || String(route.query.cover || ''),
      author: res?.info?.author || albumAuthor.value,
      desc: res?.info?.desc || '',
      source: res?.source || albumSource.value,
      total: res?.total || songs.value.length
    }
    hasMore.value = list.length >= pageSize && songs.value.length < albumInfo.value.total
    currentPage.value += 1
  } catch (e) {
    console.error('获取专辑歌曲失败:', e)
    MessagePlugin.error('获取专辑歌曲失败')
    hasMore.value = false
  } finally {
    loading.value = false
    loadingMore.value = false
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
  MessagePlugin.success(`已开始播放《${displayTitle.value}》`)
}

const openCollectDialog = () => {
  if (!songs.value.length) {
    MessagePlugin.warning('暂无可收藏歌曲')
    return
  }
  collectDialogVisible.value = true
}

const collectSongs = async (playlist: SongList) => {
  if (actionLoading.value) return
  actionLoading.value = true
  try {
    const result = await songListAPI.addSongs(
      playlist.id,
      songs.value.map((song) => toRaw(song) as any)
    )
    if (!result.success) {
      MessagePlugin.error(result.error || '收藏失败')
      return
    }
    const added = (result.data as any)?.added ?? songs.value.length
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

const addAllToQueue = () => {
  if (!songs.value.length) {
    MessagePlugin.warning('暂无可添加歌曲')
    return
  }
  if (!(window as any).musicEmitter) {
    MessagePlugin.error('播放器未初始化')
    return
  }
  songs.value.forEach((song) => {
    ;(window as any).musicEmitter.emit('addToPlaylistEnd', toRaw(song))
  })
  MessagePlugin.success(`已添加 ${songs.value.length} 首歌曲到播放列表`)
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
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 100 && hasMore.value) {
    fetchAlbumSongs(false)
  }
}

const loadPage = () => fetchAlbumSongs(true)

onMounted(loadPage)
watch(
  () => route.fullPath,
  () => loadPage()
)
</script>

<template>
  <div class="album-page">
    <div class="album-header">
      <div class="album-cover">
        <img :src="displayCover || songCover" :alt="displayTitle" />
      </div>
      <div class="album-meta">
        <div class="album-source">{{ albumSource }}</div>
        <h2>{{ displayTitle }}</h2>
        <p class="album-author">{{ albumInfo.author || albumAuthor }}</p>
        <p v-if="albumInfo.desc" class="album-desc">{{ albumInfo.desc }}</p>
        <div class="album-stats">{{ albumInfo.total || songs.length }} 首歌曲</div>
        <div class="album-actions">
          <t-button theme="primary" :disabled="!hasSongs" @click="replacePlaylist(songs)">
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
          <t-button theme="default" :disabled="!hasSongs" @click="addAllToQueue">
            <template #icon><AddIcon /></template>
            加入播放列表
          </t-button>
        </div>
      </div>
    </div>

    <CollectToPlaylistDialog
      v-model:visible="collectDialogVisible"
      :busy="actionLoading"
      @confirm="collectSongs"
    />

    <div class="album-song-list">
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
          <p>这个音源暂时没有返回该专辑的歌曲</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.album-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.album-header {
  flex-shrink: 0;
  display: flex;
  gap: 20px;
  align-items: flex-end;
  padding: 18px;
  border-radius: 8px;
  background: var(--search-content-bg);
  box-shadow: var(--search-content-shadow);
}

.album-cover {
  width: 148px;
  height: 148px;
  flex: 0 0 148px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--td-bg-color-component);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.album-meta {
  min-width: 0;
  flex: 1;

  .album-source {
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

.album-author,
.album-desc,
.album-stats {
  color: var(--td-text-color-secondary);
  font-size: 13px;
}

.album-author,
.album-desc {
  margin: 8px 0 0;
}

.album-desc {
  max-width: 760px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.album-stats {
  margin-top: 10px;
}

.album-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.album-song-list {
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
  .album-page {
    padding: 15px;
  }

  .album-cover {
    width: 96px;
    height: 96px;
    flex-basis: 96px;
  }

  .album-meta h2 {
    font-size: 22px;
  }
}
</style>
