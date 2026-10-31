<template>
  <div class="eraser-panel" :class="`side-${side}`">
    <div class="panel-header">
      <span class="panel-title">滑动清屏</span>
      <button class="close-btn" @click="close" aria-label="关闭">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="panel-body">
      <div class="slider-wrap" ref="sliderWrapRef">
        <div class="slider-track">
          <div class="slider-fill" :style="{ width: `${progress}%` }"></div>
          <div class="slider-hint" :class="{ complete: progress >= 99.5 }">
            {{ progress >= 99.5 ? '松开清屏' : '向右滑动清屏' }}
          </div>
        </div>
        <div
            class="slider-thumb"
            :style="{ left: `calc(${progress}% - 14px)` }"
            @pointerdown="onThumbDown"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>

      <p class="hint-text">滑到最右端并松手，清空当前页面全部内容</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onBeforeUnmount } from 'vue';
import { usePenStore, PANEL_STORE_KEY, DEFAULT_STORE_ID } from '@/store';

const props = defineProps<{
  side: 'left' | 'right' | 'center';
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const progress = ref(0);
const sliderWrapRef = ref<HTMLElement | null>(null);

let dragging = false;
let startX = 0;
let startProgress = 0;

function onThumbDown(e: PointerEvent) {
  e.preventDefault();
  dragging = true;
  startX = e.clientX;
  startProgress = progress.value;

  const thumb = e.currentTarget as HTMLElement;
  try { thumb.setPointerCapture(e.pointerId); } catch { /* ignore */ }

  thumb.addEventListener('pointermove', onThumbMove);
  thumb.addEventListener('pointerup', onThumbUp);
  thumb.addEventListener('pointercancel', onThumbUp);
}

function onThumbMove(e: PointerEvent) {
  if (!dragging || !sliderWrapRef.value) return;
  const rect = sliderWrapRef.value.getBoundingClientRect();
  const usable = rect.width - 28;
  if (usable <= 0) return;

  const dx = e.clientX - startX;
  const next = Math.max(0, Math.min(100, startProgress + (dx / usable) * 100));
  progress.value = next;
}

function onThumbUp(e: PointerEvent) {
  const thumb = e.currentTarget as HTMLElement;
  thumb.removeEventListener('pointermove', onThumbMove);
  thumb.removeEventListener('pointerup', onThumbUp);
  thumb.removeEventListener('pointercancel', onThumbUp);

  dragging = false;

  if (progress.value >= 99.5) {
    window.dispatchEvent(new CustomEvent('nwb:clear-page'));
    progress.value = 0;
    close();
  } else {
    animateBack();
  }
}

function animateBack() {
  const from = progress.value;
  const duration = 220;
  const start = performance.now();

  function step(now: number) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    progress.value = from * (1 - eased);
    if (t < 1) requestAnimationFrame(step);
    else progress.value = 0;
  }
  requestAnimationFrame(step);
}

function close() {
  pen.panelKind = null;
}

onBeforeUnmount(() => {
  dragging = false;
});
</script>

<style scoped>
.eraser-panel {
  position: fixed;
  bottom: calc(max(16px, env(safe-area-inset-bottom, 16px)) + 68px);
  width: 340px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-radius: 20px;
  box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.12),
      0 0 0 0.5px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  z-index: 99;
  color: #1D1D1F;
  font-family: inherit;
}

.eraser-panel.side-left { left: 24px; }
.eraser-panel.side-right { right: 24px; }
.eraser-panel.side-center { left: 50%; transform: translateX(-50%); }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #1D1D1F;
}

.close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 50%;
  color: #6E6E73;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.panel-body {
  padding: 20px 16px;
}

.slider-wrap {
  position: relative;
  height: 32px;
  margin: 0 auto;
}

.slider-track {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  height: 6px;
  background: #E8E8ED;
  border-radius: 3px;
  overflow: hidden;
}

.slider-fill {
  height: 100%;
  background: linear-gradient(90deg, #34C759, #30D158);
  border-radius: 3px;
  transition: width 40ms linear;
}

.slider-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 500;
  color: #8E8E93;
  pointer-events: none;
  transition: color 160ms;
}

.slider-hint.complete { color: #FFFFFF; }

.slider-thumb {
  position: absolute;
  top: 50%;
  width: 28px;
  height: 28px;
  margin-top: -14px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 0.5px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34C759;
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: transform 80ms;
}

.slider-thumb:active { cursor: grabbing; transform: scale(1.08); }

.hint-text {
  margin: 16px 0 0;
  font-size: 12px;
  color: #8E8E93;
  text-align: center;
  line-height: 1.5;
}
</style>