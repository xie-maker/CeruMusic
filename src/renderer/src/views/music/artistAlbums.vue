<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import songCover from '@assets/images/song.jpg'
import { LocalUserDetailStore } from '@renderer/store/LocalUserDetail'

interface AlbumItem {
  id?: string | number
  mid?: string
  name: string
  author?: string
  img?: string
  desc?: string
  count?: number
  source: string
}

const route = useRoute()
const router = useRouter()
const localUserStore = LocalUserDetailStore()

const albums = ref<AlbumItem[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = 30
const total = ref(0)

const artistId = computed(() => String(route.query.id || ''))
const artistName = computed(() => String(route.query.name || ''))
const artistSource = computed(() =>
  String(route.query.source || localUserStore.userSource.source || 'wy')
)
const hasAlbums = computed(() => albums.value.length > 0)

const fetchAlbums = async (reset = false) => {
  if (loading.value || !artistName.value) return
  if (reset) {
    page.value = 1
    albums.value = []
  }

  loading.value = true
  try {
    const res = await window.api.music.requestSdk('getArtistAlbums', {
      source: artistSource.value,
      id: artistId.value,
      keyword: artistName.value,
      page: page.value,
      limit: pageSize
    })
    const list = (Array.isArray(res?.list) ? res.list : []).filter((album: any) => album?.name)
    albums.value = reset ? list : [...albums.value, ...list]
    total.value = res?.total || albums.value.length
    page.value += 1
  } catch (e) {
    console.error('获取歌手专辑失败:', e)
    MessagePlugin.error('获取歌手专辑失败')
  } finally {
    loading.value = false
  }
}

const routerToAlbum = (album: AlbumItem) => {
  router.push({
    name: 'album',
    query: {
      id: album.id || album.mid || '',
      name: album.name,
      source: album.source || artistSource.value,
      cover: album.img || '',
      author: album.author || artistName.value,
      artistName: artistName.value
    }
  })
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100
  if (nearBottom && !loading.value && albums.value.length < total.value) {
    fetchAlbums(false)
  }
}

const loadPage = () => fetchAlbums(true)

onMounted(loadPage)
watch(
  () => route.fullPath,
  () => loadPage()
)
</script>

<template>
  <div class="artist-albums-page">
    <div class="album-list-header">
      <div>
        <span class="source-badge">{{ artistSource }}</span>
        <h2>{{ artistName }} 的专辑</h2>
      </div>
      <span class="album-count">{{ total || albums.length }} 张</span>
    </div>

    <div class="album-grid-scroll" @scroll="handleScroll">
      <TransitionGroup v-if="hasAlbums" name="grid-fade" tag="div" class="album-grid">
        <div
          v-for="album in albums"
          :key="`${album.source}-${album.id || album.mid || album.name}`"
          class="album-card"
          @click="routerToAlbum(album)"
        >
          <div class="album-cover">
            <img :src="album.img || songCover" :alt="album.name" @error="album.img = songCover" />
          </div>
          <div class="album-info">
            <h4>{{ album.name }}</h4>
            <p>{{ album.author || artistName }}</p>
            <span v-if="album.count">{{ album.count }} 首</span>
          </div>
        </div>
      </TransitionGroup>

      <div v-else class="empty-state">
        <div v-if="loading" class="loading-spinner"></div>
        <template v-else>
          <h3>暂无专辑</h3>
          <p>这个音源暂时没有返回该歌手的专辑</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.artist-albums-page {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.album-list-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 18px;
  border-radius: 8px;
  background: var(--search-content-bg);
  box-shadow: var(--search-content-shadow);

  h2 {
    margin: 8px 0 0;
    font-size: 26px;
    color: var(--search-title-color);
  }
}

.source-badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary);
  background: var(--td-bg-color-component);
}

.album-count {
  font-size: 13px;
  color: var(--td-text-color-placeholder);
}

.album-grid-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px;
}

.album-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
}

.album-card {
  cursor: pointer;
  overflow: hidden;
  border-radius: 8px;
  background: var(--find-card-bg);
  box-shadow: var(--find-card-shadow);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--find-card-shadow-hover);
  }
}

.album-cover {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--td-bg-color-component);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.album-info {
  padding: 12px;

  h4 {
    margin: 0 0 6px;
    color: var(--find-text-primary);
    font-size: 14px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  p,
  span {
    display: block;
    margin: 0 0 4px;
    color: var(--find-text-muted);
    font-size: 12px;
  }
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

.grid-fade-enter-active,
.grid-fade-leave-active {
  transition: all 0.25s ease;
}

.grid-fade-enter-from,
.grid-fade-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
