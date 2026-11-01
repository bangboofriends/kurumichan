<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import Hls from 'hls.js'
import {
  musicResources,
  videoResources,
  parseLrc,
  loadMusicMetadata,
  loadVideoTitle,
  fileNameOf,
  resolveVideoUrl,
  disposeM3u8Cache,
  type LrcLine,
  type MusicMetadata,
} from '@/utils/ce404res'

/* ==================== 视图切换 ==================== */

type View = 'home' | 'music' | 'video'

const currentView = ref<View>('home')
const transitionName = ref('view-up')
const isAnimating = ref(false)

function goTo(view: 'music' | 'video') {
  if (isAnimating.value) return
  isAnimating.value = true
  transitionName.value = 'view-up'
  currentView.value = view
}

function goHome() {
  if (isAnimating.value) return
  isAnimating.value = true
  transitionName.value = 'view-down'
  currentView.value = 'home'
}

function onViewAfterEnter() {
  isAnimating.value = false
  if (currentView.value === 'video') {
    initVideoPlayer()
  }
}

function fmt(s: number) {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const v = Math.floor(s)
  return `${Math.floor(v / 60)}:${(v % 60).toString().padStart(2, '0')}`
}

/* ==================== 音乐 ==================== */

const audioEl = ref<HTMLAudioElement | null>(null)
const musicIndex = ref(0)
const currentMusic = computed(() => musicResources[musicIndex.value])

const musicMeta = ref<MusicMetadata | null>(null)
const musicMetaCache = ref<Record<string, MusicMetadata>>({})
const lrcLines = ref<LrcLine[]>([])
const musicTime = ref(0)
const musicDuration = ref(0)
const musicPlaying = ref(false)

const musicProgress = computed(() =>
    musicDuration.value > 0 ? (musicTime.value / musicDuration.value) * 100 : 0,
)

const LINE_H = 44
const VIEW_H = 220

const activeLrcIndex = computed(() => {
  let idx = 0
  for (let i = 0; i < lrcLines.value.length; i++) {
    if (musicTime.value >= lrcLines.value[i].time) idx = i
    else break
  }
  return idx
})

const lrcOffset = computed(() =>
    lrcLines.value.length
        ? VIEW_H / 2 - LINE_H / 2 - activeLrcIndex.value * LINE_H
        : 0,
)

async function refreshMusic() {
  const item = currentMusic.value
  musicTime.value = 0
  musicDuration.value = 0
  musicPlaying.value = false

  lrcLines.value = item.lrc ? parseLrc(item.lrc) : []

  try {
    const meta = await loadMusicMetadata(item)
    if (currentMusic.value.uri !== item.uri) return
    if (musicMeta.value?.coverUrl) URL.revokeObjectURL(musicMeta.value.coverUrl)
    musicMeta.value = meta
    musicMetaCache.value[item.uri] = meta
  } catch {
    musicMeta.value = {
      title: fileNameOf(item.uri),
      artist: '未知艺术家',
      album: '',
      duration: 0,
      coverUrl: null,
    }
  }
}

watch(currentMusic, () => {
  refreshMusic()
})

function switchMusic(step: number) {
  const total = musicResources.length
  if (!total) return
  musicIndex.value = (musicIndex.value + step + total) % total
}

function toggleMusic() {
  const el = audioEl.value
  if (!el) return
  if (el.paused) el.play().catch(() => {})
  else el.pause()
}

function onMusicLoaded() {
  const el = audioEl.value
  if (!el) return
  musicDuration.value = Number.isFinite(el.duration) ? el.duration : 0
  el.volume = musicVolume.value
}

function onMusicTime() {
  const el = audioEl.value
  if (el) musicTime.value = el.currentTime
}

async function onMusicEnded() {
  switchMusic(1)
  await nextTick()
  audioEl.value?.play().catch(() => {})
}

function seekMusic(e: PointerEvent) {
  const el = audioEl.value
  if (!el || !musicDuration.value) return
  const track = e.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  el.currentTime = ratio * musicDuration.value
  musicTime.value = el.currentTime
}

/* ==================== 音乐音量 ==================== */

const musicVolume = ref(1)
const musicMuted = ref(false)

function onMusicVolume(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  musicVolume.value = v
  const el = audioEl.value
  if (!el) return
  el.volume = v
  if (v > 0 && el.muted) {
    el.muted = false
    musicMuted.value = false
  }
}

function toggleMusicMute() {
  const el = audioEl.value
  if (!el) return
  el.muted = !el.muted
  musicMuted.value = el.muted
}

const musicVolumeIcon = computed(() => {
  if (musicMuted.value || musicVolume.value === 0) return 'i-mingcute-volume-mute-line'
  return 'i-mingcute-volume-line'
})

/* ==================== 视频 ==================== */

const videoEl = ref<HTMLVideoElement | null>(null)
const videoIndex = ref(0)
const currentVideo = computed(() => videoResources[videoIndex.value])

const videoTitle = ref('')
const videoTitleCache = ref<Record<string, string>>({})
const videoWidth = ref(0)
const videoHeight = ref(0)
const videoTime = ref(0)
const videoDuration = ref(0)
const videoPlaying = ref(false)
const videoMuted = ref(false)

const videoProgress = computed(() =>
    videoDuration.value > 0 ? (videoTime.value / videoDuration.value) * 100 : 0,
)

let hls: Hls | null = null
let initializedVideoUri = ''

function destroyVideoPlayer() {
  initializedVideoUri = ''
  if (hls) {
    hls.destroy()
    hls = null
  }
  const el = videoEl.value
  if (el) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
}

function initVideoPlayer() {
  const video = videoEl.value
  if (!video) {
    console.warn('[video] videoEl 尚未挂载，跳过初始化')
    return
  }

  const rawUri = currentVideo.value.uri
  if (!rawUri) return
  if (initializedVideoUri === rawUri) return

  destroyVideoPlayer()
  initializedVideoUri = rawUri

  const isM3u8 = rawUri.includes('.m3u8')

  if (!isM3u8) {
    video.src = rawUri
    video.volume = videoVolume.value
    video.muted = videoMuted.value
    return
  }

  const playable = resolveVideoUrl(rawUri)

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = playable
    video.volume = videoVolume.value
    video.muted = videoMuted.value
    return
  }

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true })
    hls.loadSource(playable)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.volume = videoVolume.value
      video.muted = videoMuted.value
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls?.startLoad()
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls?.recoverMediaError()
          break
        default:
          destroyVideoPlayer()
          break
      }
    })
    return
  }

  console.warn('当前浏览器不支持 m3u8 播放')
}

async function refreshVideo() {
  const item = currentVideo.value
  videoTime.value = 0
  videoDuration.value = 0
  videoWidth.value = 0
  videoHeight.value = 0
  videoPlaying.value = false
  videoMuted.value = false
  videoTitle.value = fileNameOf(item.uri)

  try {
    const title = await loadVideoTitle(item.uri)
    if (currentVideo.value.uri === item.uri) {
      videoTitle.value = title
      videoTitleCache.value[item.uri] = title
    }
  } catch {
    /* 保持文件名作为标题 */
  }

  await nextTick()
  initVideoPlayer()
}

watch(currentVideo, () => {
  refreshVideo()
})

function switchVideo(step: number) {
  const total = videoResources.length
  if (!total) return
  videoIndex.value = (videoIndex.value + step + total) % total
}

function toggleVideo() {
  const el = videoEl.value
  if (!el) return
  if (el.paused) el.play().catch(() => {})
  else el.pause()
}

function onVideoLoaded() {
  const el = videoEl.value
  if (!el) return
  videoDuration.value = Number.isFinite(el.duration) ? el.duration : 0
  videoWidth.value = el.videoWidth
  videoHeight.value = el.videoHeight
}

function onVideoTime() {
  const el = videoEl.value
  if (el) videoTime.value = el.currentTime
}

function seekVideo(e: PointerEvent) {
  const el = videoEl.value
  if (!el || !videoDuration.value) return
  const track = e.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  el.currentTime = ratio * videoDuration.value
  videoTime.value = el.currentTime
}

function toggleVideoMute() {
  const el = videoEl.value
  if (!el) return
  el.muted = !el.muted
  videoMuted.value = el.muted
}

function toggleFullscreen() {
  const el = videoEl.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

/* ==================== 视频音量 ==================== */

const videoVolume = ref(1)

function onVideoVolume(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  videoVolume.value = v
  const el = videoEl.value
  if (!el) return
  el.volume = v
  if (v > 0 && el.muted) {
    el.muted = false
    videoMuted.value = false
  }
}

const videoVolumeIcon = computed(() => {
  if (videoMuted.value || videoVolume.value === 0) return 'i-mingcute-volume-mute-line'
  return 'i-mingcute-volume-line'
})

/* ==================== 列表 ==================== */

const musicListOpen = ref(false)
const videoListOpen = ref(false)

function closeLists() {
  musicListOpen.value = false
  videoListOpen.value = false
}

function musicTitleOf(index: number): string {
  const item = musicResources[index]
  return musicMetaCache.value[item.uri]?.title || fileNameOf(item.uri)
}

function musicDurationOf(index: number): string {
  const item = musicResources[index]
  const d = musicMetaCache.value[item.uri]?.duration || 0
  return d > 0 ? fmt(d) : '--:--'
}

async function openMusicList() {
  musicListOpen.value = true
  for (const item of musicResources) {
    if (musicMetaCache.value[item.uri]) continue
    try {
      const meta = await loadMusicMetadata(item)
      musicMetaCache.value[item.uri] = meta
    } catch {
      /* 忽略单个失败 */
    }
  }
}

function selectMusic(index: number) {
  musicListOpen.value = false
  if (index === musicIndex.value) {
    audioEl.value?.play().catch(() => {})
    return
  }
  musicIndex.value = index
}

function videoTitleOf(index: number): string {
  const item = videoResources[index]
  return videoTitleCache.value[item.uri] || fileNameOf(item.uri)
}

async function openVideoList() {
  videoListOpen.value = true
  for (const item of videoResources) {
    if (videoTitleCache.value[item.uri]) continue
    try {
      const title = await loadVideoTitle(item.uri)
      videoTitleCache.value[item.uri] = title
    } catch {
      /* 忽略 */
    }
  }
}

function selectVideo(index: number) {
  videoListOpen.value = false
  if (index === videoIndex.value) {
    videoEl.value?.play().catch(() => {})
    return
  }
  videoIndex.value = index
}

/* ==================== 生命周期 ==================== */

watch(currentView, async (v) => {
  if (v === 'music') {
    refreshMusic()
  } else {
    musicPlaying.value = false
    audioEl.value?.pause()
  }

  if (v === 'video') {
    await refreshVideo()
  } else {
    videoPlaying.value = false
    destroyVideoPlayer()
  }

  closeLists()
})

onBeforeUnmount(() => {
  if (musicMeta.value?.coverUrl) URL.revokeObjectURL(musicMeta.value.coverUrl)
  audioEl.value?.pause()
  destroyVideoPlayer()
  disposeM3u8Cache()
})
</script>

<template>
  <div class="app">
    <Transition :name="transitionName" mode="out-in" @after-enter="onViewAfterEnter">
      <div :key="currentView" class="view">
        <!-- ============ 404 首页 ============ -->
        <div v-if="currentView === 'home'" class="home">
          <div class="hero">
            <img class="emoji" src="@/assets/emoji404.jpg" alt="你在期待什么？" width="100" height="100" />
            <p class="title">快看，这里怎么什么都没有啊</p>
            <p class="subtitle">不过，你可以：</p>
          </div>

          <div class="actions">
            <button class="action-btn" aria-label="给我来首歌" @click="goTo('music')">
              <span class="icon i-mingcute-music-line" />
              <span class="label">给我来首歌</span>
            </button>
            <button class="action-btn" aria-label="看个小视频" @click="goTo('video')">
              <span class="icon i-mingcute-video-line" />
              <span class="label">看个小视频</span>
            </button>
          </div>
        </div>

        <!-- ============ 音乐 ============ -->
        <div v-else-if="currentView === 'music'" class="sub-view">
          <button class="back-btn" @click="goHome">
            <span class="back-icon i-mingcute-arrow-left-line" />
            <span>返回</span>
          </button>

          <audio
              ref="audioEl"
              :src="currentMusic.uri"
              preload="metadata"
              @loadedmetadata="onMusicLoaded"
              @timeupdate="onMusicTime"
              @play="musicPlaying = true"
              @pause="musicPlaying = false"
              @ended="onMusicEnded"
          />

          <div class="music-stage">
            <header class="music-header">
              <div class="music-cover">
                <img v-if="musicMeta?.coverUrl" :src="musicMeta.coverUrl" alt="专辑封面" />
                <span v-else class="cover-fallback i-mingcute-music-2-line" />
              </div>
              <h2 class="music-title">{{ musicMeta?.title || '加载中…' }}</h2>
              <p class="music-artist">
                {{ musicMeta?.artist }}
                <template v-if="musicMeta?.album"> · {{ musicMeta.album }}</template>
              </p>
            </header>

            <div class="lrc-viewport">
              <div class="lrc-list" :style="{ transform: `translateY(${lrcOffset}px)` }">
                <p
                    v-for="(line, i) in lrcLines"
                    :key="i"
                    class="lrc-line"
                    :class="{ active: i === activeLrcIndex }"
                >
                  {{ line.text }}
                </p>
                <p v-if="!lrcLines.length" class="lrc-line active">暂无歌词</p>
              </div>
            </div>

            <div class="music-bar">
              <div class="bar-top">
                <div class="bar-track" @pointerdown="seekMusic">
                  <div class="bar-fill" :style="{ width: musicProgress + '%' }">
                    <span class="bar-dot" />
                  </div>
                </div>
                <div class="volume-group music-volume-group">
                  <button
                      class="vol-btn"
                      :aria-label="musicMuted ? '取消静音' : '静音'"
                      @click="toggleMusicMute"
                  >
                    <span :class="musicVolumeIcon" />
                  </button>
                  <input
                      class="volume-slider music-volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      :value="musicVolume"
                      :style="{
                      background: `linear-gradient(to right, #34C759 ${musicVolume * 100}%, #E8E8ED ${musicVolume * 100}%)`,
                    }"
                      @input="onMusicVolume"
                  />
                </div>
              </div>
              <div class="bar-times">
                <span>{{ fmt(musicTime) }}</span>
                <span>{{ fmt(musicDuration || musicMeta?.duration || 0) }}</span>
              </div>
            </div>

            <div class="music-controls">
              <button class="ctrl-btn" aria-label="上一首" @click="switchMusic(-1)">
                <span class="i-mingcute-skip-previous-fill" />
              </button>
              <button class="ctrl-btn play" :aria-label="musicPlaying ? '暂停' : '播放'" @click="toggleMusic">
                <span :class="musicPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill'" />
              </button>
              <button class="ctrl-btn" aria-label="下一首" @click="switchMusic(1)">
                <span class="i-mingcute-skip-forward-fill" />
              </button>
              <button class="ctrl-btn" aria-label="播放列表" @click="openMusicList">
                <span class="i-mingcute-list-check-fill" />
              </button>
            </div>
          </div>
        </div>

        <!-- ============ 视频 ============ -->
        <div v-else class="sub-view">
          <button class="back-btn" @click="goHome">
            <span class="back-icon i-mingcute-arrow-left-line" />
            <span>返回</span>
          </button>

          <div class="video-stage">
            <header class="video-header">
              <div class="video-heading">
                <h2 class="video-title">{{ videoTitle }}</h2>
                <div class="heading-actions">
                  <button class="next-video-btn" aria-label="下一个视频" @click="switchVideo(1)">
                    <span class="i-mingcute-skip-forward-fill" />
                  </button>
                  <button class="next-video-btn" aria-label="视频列表" @click="openVideoList">
                    <span class="i-mingcute-list-check-line" />
                  </button>
                </div>
              </div>
              <p class="video-meta">
                <template v-if="videoWidth && videoHeight">{{ videoWidth }}×{{ videoHeight }} · </template>
                {{ fmt(videoDuration) }}
              </p>
            </header>

            <div class="video-player">
              <video
                  ref="videoEl"
                  preload="metadata"
                  playsinline
                  @loadedmetadata="onVideoLoaded"
                  @timeupdate="onVideoTime"
                  @play="videoPlaying = true"
                  @pause="videoPlaying = false"
                  @ended="switchVideo(1)"
              />

              <button v-show="!videoPlaying" class="big-play" aria-label="播放" @click="toggleVideo">
                <span class="i-mingcute-play-fill" />
              </button>

              <div class="video-controls">
                <button class="vc-btn" :aria-label="videoPlaying ? '暂停' : '播放'" @click="toggleVideo">
                  <span :class="videoPlaying ? 'i-mingcute-pause-fill' : 'i-mingcute-play-fill'" />
                </button>
                <span class="vc-time">{{ fmt(videoTime) }}</span>
                <div class="vc-track" @pointerdown="seekVideo">
                  <div class="vc-fill" :style="{ width: videoProgress + '%' }" />
                </div>
                <span class="vc-time">{{ fmt(videoDuration) }}</span>

                <div class="volume-group video-volume-group">
                  <button
                      class="vc-btn"
                      :aria-label="videoMuted ? '取消静音' : '静音'"
                      @click="toggleVideoMute"
                  >
                    <span :class="videoVolumeIcon" />
                  </button>
                  <input
                      class="volume-slider video-volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      :value="videoVolume"
                      :style="{
                      background: `linear-gradient(to right, #FFFFFF ${videoVolume * 100}%, rgba(255,255,255,0.35) ${videoVolume * 100}%)`,
                    }"
                      @input="onVideoVolume"
                  />
                </div>

                <button class="vc-btn" aria-label="全屏" @click="toggleFullscreen">
                  <span class="i-mingcute-fullscreen-line" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============ 音乐列表 ============ -->
    <Transition name="list-fade">
      <div v-if="musicListOpen" class="list-mask" @click="closeLists">
        <div class="list-panel" @click.stop>
          <div class="list-header">
            <span>播放列表</span>
            <button class="list-close" aria-label="关闭" @click="musicListOpen = false">
              <span class="i-mingcute-close-line" />
            </button>
          </div>
          <div class="list-body">
            <button
                v-for="(_item, i) in musicResources"
                :key="i"
                class="list-item"
                :class="{ active: i === musicIndex }"
                @click="selectMusic(i)"
            >
              <span class="list-index">{{ i + 1 }}</span>
              <span class="list-title">{{ musicTitleOf(i) }}</span>
              <span class="list-duration">{{ musicDurationOf(i) }}</span>
              <span v-if="i === musicIndex" class="list-playing i-mingcute-volume-line" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ============ 视频列表 ============ -->
    <Transition name="list-fade">
      <div v-if="videoListOpen" class="list-mask" @click="closeLists">
        <div class="list-panel" @click.stop>
          <div class="list-header">
            <span>视频列表</span>
            <button class="list-close" aria-label="关闭" @click="videoListOpen = false">
              <span class="i-mingcute-close-line" />
            </button>
          </div>
          <div class="list-body">
            <button
                v-for="(_item, i) in videoResources"
                :key="i"
                class="list-item"
                :class="{ active: i === videoIndex }"
                @click="selectVideo(i)"
            >
              <span class="list-index">{{ i + 1 }}</span>
              <span class="list-title">{{ videoTitleOf(i) }}</span>
              <span v-if="i === videoIndex" class="list-playing i-mingcute-volume-line" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* ---------- 框架 ---------- */
.app {
  min-height: 100vh;
  color: #1D1D1F;
  font-family: inherit;
}

.view {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #FFFFFF;
}

/* ---------- 404 首页 ---------- */
.home {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 48px;
  padding: 24px;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.emoji {
  width: 100px;
  height: 100px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10),
  0 0 0 0.5px rgba(0, 0, 0, 0.05);
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: #8E8E93;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ---------- 无外框按钮 ---------- */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
  transform 80ms;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.action-btn:active {
  background: rgba(0, 0, 0, 0.08);
  transform: scale(0.98);
}

.action-btn:focus-visible {
  outline: 2px solid rgba(52, 199, 89, 0.6);
  outline-offset: 2px;
}

.action-btn .icon {
  font-size: 20px;
  color: #34C759;
}

/* ---------- 子页面通用 ---------- */
.sub-view {
  height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  padding: 72px 24px 40px;
  -webkit-overflow-scrolling: touch;
}

.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 14px 0 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.back-btn:active {
  background: rgba(0, 0, 0, 0.08);
}

.back-icon {
  font-size: 20px;
}

audio {
  display: none;
}

/* ---------- 音量通用 ---------- */
.volume-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.vol-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1D1D1F;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 160ms;
  -webkit-tap-highlight-color: transparent;
}

.vol-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.vol-btn:active {
  background: rgba(0, 0, 0, 0.08);
}

.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 72px;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #FFFFFF;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #FFFFFF;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.volume-slider::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: transparent;
}

.video-volume-group .vc-btn {
  color: #FFFFFF;
}

.video-volume-group .vc-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* ---------- 音乐 ---------- */
.music-stage {
  margin: auto;
  width: min(440px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.music-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  width: 100%;
}

.music-cover {
  width: 112px;
  height: 112px;
  border-radius: 20px;
  overflow: hidden;
  background: linear-gradient(135deg, #34C759, #30D158);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px rgba(52, 199, 89, 0.25);
}

.music-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  font-size: 44px;
  color: #FFFFFF;
}

.music-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.music-artist {
  margin: 0;
  font-size: 13px;
  color: #8E8E93;
}

.lrc-viewport {
  width: 100%;
  height: 220px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent);
}

.lrc-list {
  transition: transform 420ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.lrc-line {
  height: 44px;
  line-height: 44px;
  margin: 0;
  text-align: center;
  font-size: 15px;
  color: #8E8E93;
  transition: color 320ms, font-size 320ms, font-weight 320ms;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lrc-line.active {
  color: #1D1D1F;
  font-size: 17px;
  font-weight: 600;
}

.music-bar {
  width: 100%;
}

.bar-top {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.bar-track {
  position: relative;
  flex: 1;
  height: 4px;
  background: #E8E8ED;
  border-radius: 2px;
  cursor: pointer;
}

.bar-track::before {
  content: '';
  position: absolute;
  inset: -10px 0;
}

.bar-fill {
  position: relative;
  height: 100%;
  background: #34C759;
  border-radius: 2px;
  transition: width 80ms linear;
}

.bar-dot {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #34C759;
  box-shadow: 0 1px 4px rgba(52, 199, 89, 0.4);
  opacity: 0;
  transition: opacity 160ms;
}

.bar-track:hover .bar-dot {
  opacity: 1;
}

.bar-times {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  color: #8E8E93;
  font-variant-numeric: tabular-nums;
}

.music-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ctrl-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #1D1D1F;
  font-size: 22px;
  cursor: pointer;
  transition: background-color 160ms;
  -webkit-tap-highlight-color: transparent;
}

.ctrl-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.ctrl-btn:active {
  background: rgba(0, 0, 0, 0.08);
}

.ctrl-btn.play {
  width: 56px;
  height: 56px;
  background: #34C759;
  color: #FFFFFF;
  font-size: 26px;
  box-shadow: 0 8px 20px rgba(52, 199, 89, 0.3);
}

.ctrl-btn.play:hover {
  background: #2AB34D;
}

/* ---------- 视频 ---------- */
.video-stage {
  margin: auto;
  width: min(720px, 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.video-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.video-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.video-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heading-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.next-video-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #1D1D1F;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 160ms;
  -webkit-tap-highlight-color: transparent;
}

.next-video-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.video-meta {
  margin: 0;
  font-size: 13px;
  color: #8E8E93;
  font-variant-numeric: tabular-nums;
}

.video-player {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 18px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
}

.video-player video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  background: #000;
}

.big-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: #1D1D1F;
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transition: transform 160ms, background-color 160ms;
  -webkit-tap-highlight-color: transparent;
}

.big-play:hover {
  transform: translate(-50%, -50%) scale(1.06);
  background: #FFFFFF;
}

.video-controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 16px 12px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), transparent);
  color: #FFFFFF;
}

.vc-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #FFFFFF;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 160ms;
  -webkit-tap-highlight-color: transparent;
}

.vc-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.vc-time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
  white-space: nowrap;
}

.vc-track {
  position: relative;
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  cursor: pointer;
}

.vc-track::before {
  content: '';
  position: absolute;
  inset: -10px 0;
}

.vc-fill {
  height: 100%;
  background: #FFFFFF;
  border-radius: 2px;
  transition: width 80ms linear;
}

/* ---------- 列表浮层 ---------- */
.list-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.list-panel {
  width: min(400px, 100%);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2),
  0 0 0 0.5px rgba(0, 0, 0, 0.06);
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px 14px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.list-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
  color: #6E6E73;
  font-size: 16px;
  cursor: pointer;
}

.list-close:hover {
  background: rgba(0, 0, 0, 0.08);
}

.list-body {
  overflow-y: auto;
  padding: 8px;
  -webkit-overflow-scrolling: touch;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #1D1D1F;
  font-size: 14px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms;
  -webkit-tap-highlight-color: transparent;
}

.list-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.list-item.active {
  background: rgba(52, 199, 89, 0.1);
  color: #34C759;
}

.list-index {
  width: 20px;
  text-align: center;
  color: #8E8E93;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.list-item.active .list-index {
  color: #34C759;
}

.list-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-duration {
  font-size: 12px;
  color: #8E8E93;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.list-playing {
  font-size: 16px;
  color: #34C759;
  flex-shrink: 0;
}

.list-fade-enter-active,
.list-fade-leave-active {
  transition: opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.list-fade-enter-active .list-panel,
.list-fade-leave-active .list-panel {
  transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
}

.list-fade-enter-from .list-panel,
.list-fade-leave-to .list-panel {
  transform: translateY(12px) scale(0.98);
}

/* ---------- 视图切换动画 ---------- */
.view-up-leave-active {
  transition: transform 360ms cubic-bezier(0.4, 0, 0.2, 1),
  opacity 360ms cubic-bezier(0.4, 0, 0.2, 1);
}
.view-up-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
.view-up-enter-active {
  transition: transform 360ms cubic-bezier(0.4, 0, 0.2, 1),
  opacity 360ms cubic-bezier(0.4, 0, 0.2, 1);
}
.view-up-enter-from {
  transform: translateY(40px);
  opacity: 0;
}

.view-down-leave-active {
  transition: transform 360ms cubic-bezier(0.4, 0, 0.2, 1),
  opacity 360ms cubic-bezier(0.4, 0, 0.2, 1);
}
.view-down-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
.view-down-enter-active {
  transition: transform 360ms cubic-bezier(0.4, 0, 0.2, 1),
  opacity 360ms cubic-bezier(0.4, 0, 0.2, 1);
}
.view-down-enter-from {
  transform: translateY(-40px);
  opacity: 0;
}

@media (max-width: 640px) {
  .volume-slider {
    width: 48px;
  }
}

@media (max-width: 480px) {
  .title {
    font-size: 19px;
  }
  .action-btn {
    padding: 0 14px;
  }
  .video-volume-slider {
    display: none;
  }
}
</style>