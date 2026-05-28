<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import songListAPI from '@renderer/api/songList'
import type { SongList } from '@common/types/songList'

const props = withDefaults(
  defineProps<{
    visible: boolean
    busy?: boolean
  }>(),
  {
    busy: false
  }
)

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  confirm: [playlist: SongList]
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const playlists = ref<SongList[]>([])
const selectedPlaylistId = ref('')
const newPlaylistName = ref('')
const loading = ref(false)
const creating = ref(false)

const localPlaylists = computed(() => playlists.value.filter((playlist) => playlist.source === 'local'))
const selectedPlaylist = computed(
  () => localPlaylists.value.find((playlist) => playlist.id === selectedPlaylistId.value) || null
)

const loadPlaylists = async () => {
  loading.value = true
  try {
    const res = await songListAPI.getAll()
    if (!res.success) throw new Error(res.error || '获取歌单失败')
    playlists.value = res.data || []
    if (!selectedPlaylistId.value && localPlaylists.value.length) {
      selectedPlaylistId.value = localPlaylists.value[0].id
    }
    if (selectedPlaylistId.value && !selectedPlaylist.value) {
      selectedPlaylistId.value = localPlaylists.value[0]?.id || ''
    }
  } catch (e: any) {
    MessagePlugin.error(e?.message || '获取歌单失败')
  } finally {
    loading.value = false
  }
}

const createPlaylist = async () => {
  const name = newPlaylistName.value.trim()
  if (!name) {
    MessagePlugin.warning('请输入歌单名称')
    return
  }
  creating.value = true
  try {
    const res = await songListAPI.create(name, '', 'local')
    if (!res.success || !res.data?.id) throw new Error(res.error || '创建歌单失败')
    newPlaylistName.value = ''
    await loadPlaylists()
    selectedPlaylistId.value = res.data.id
    MessagePlugin.success('歌单已创建')
  } catch (e: any) {
    MessagePlugin.error(e?.message || '创建歌单失败')
  } finally {
    creating.value = false
  }
}

const confirm = () => {
  if (!selectedPlaylist.value) {
    MessagePlugin.warning('请选择歌单')
    return
  }
  emit('confirm', selectedPlaylist.value)
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) loadPlaylists()
  }
)
</script>

<template>
  <t-dialog
    v-model:visible="dialogVisible"
    :cancel-btn="{ content: '取消' }"
    :confirm-btn="{
      content: '收藏到这里',
      theme: 'primary',
      loading: busy,
      disabled: !selectedPlaylistId || loading
    }"
    header="选择收藏歌单"
    placement="center"
    width="460px"
    @confirm="confirm"
  >
    <div class="collect-playlist-dialog">
      <t-select
        v-model="selectedPlaylistId"
        :disabled="busy"
        :loading="loading"
        clearable
        filterable
        placeholder="选择一个本地歌单"
      >
        <t-option
          v-for="playlist in localPlaylists"
          :key="playlist.id"
          :label="playlist.name"
          :value="playlist.id"
        />
      </t-select>

      <div class="create-row">
        <t-input
          v-model="newPlaylistName"
          :disabled="busy || creating"
          clearable
          placeholder="新建歌单名称"
          @keyup.enter="createPlaylist"
        />
        <t-button :loading="creating" :disabled="busy" theme="default" @click="createPlaylist">
          新建
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>

<style scoped lang="scss">
.collect-playlist-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.create-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
}
</style>
