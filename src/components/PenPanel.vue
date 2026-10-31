<template>
  <div class="pen-panel" :class="`side-${side}`">
    <div class="panel-header">
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'brush' }" @click="tab = 'brush'">画笔</button>
        <button class="tab" :class="{ active: tab === 'palette' }" @click="tab = 'palette'">全色板</button>
      </div>
      <button class="close-btn" @click="close" aria-label="关闭">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
             stroke-width="2.2" stroke-linecap="round">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div v-if="tab === 'brush'" class="panel-body brush-tab">
      <div class="size-col">
        <span class="label">粗细</span>
        <div class="size-slider-wrap">
          <input
              type="range"
              class="size-slider"
              :min="1"
              :max="40"
              step="1"
              :value="pen.thick"
              @input="onThickChange"
          />
          <div class="size-preview">
            <div class="size-dot" :style="previewDotStyle"></div>
          </div>
        </div>
        <span class="size-value">{{ pen.thick }}</span>
      </div>

      <div class="color-col">
        <span class="label">颜色</span>
        <div class="color-grid">
          <button
              v-for="c in PRESET_COLORS"
              :key="c"
              class="color-swatch"
              :class="{ active: pen.color === c, 'is-white': c.toLowerCase() === '#ffffff' }"
              :style="{ background: c }"
              @click="onColorChange(c)"
              :aria-label="`选择颜色 ${c}`"
          ></button>
        </div>
      </div>
    </div>

    <div v-else class="panel-body palette-tab">
      <div class="palette-center">
        <label class="custom-color-btn">
          <input type="color" :value="pen.color" @input="onCustomColor" />
          <span>打开全色板</span>
        </label>
        <p class="hint">拖动色轮选择任意颜色</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { usePenStore, PANEL_STORE_KEY, DEFAULT_STORE_ID } from '@/store';

const props = defineProps<{
  side: 'left' | 'right' | 'center';
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const tab = ref<'brush' | 'palette'>('brush');

const PRESET_COLORS = [
  '#1C1C1E', '#FFFFFF',
  '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#30D158', '#FF2D55',
  '#A2845E', '#8E8E93',
];

const previewDotStyle = computed(() => ({
  width: `${Math.min(pen.thick, 40)}px`,
  height: `${Math.min(pen.thick, 40)}px`,
  background: pen.color,
}));

function onThickChange(e: Event) {
  pen.thick = parseInt((e.target as HTMLInputElement).value, 10);
}

function onColorChange(c: string) {
  pen.color = c;
}

function onCustomColor(e: Event) {
  const c = (e.target as HTMLInputElement).value;
  pen.color = c;
  if (!pen.customColors.includes(c)) {
    pen.customColors = [c, ...pen.customColors].slice(0, 12);
  }
}

function close() {
  pen.panelKind = null;
}
</script>

<style scoped>
.pen-panel {
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

.pen-panel.side-left { left: 24px; }
.pen-panel.side-right { right: 24px; }
.pen-panel.side-center { left: 50%; transform: translateX(-50%); }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 0;
}

.tabs {
  display: flex;
  gap: 2px;
  background: rgba(0, 0, 0, 0.04);
  padding: 3px;
  border-radius: 10px;
}

.tab {
  padding: 6px 14px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  color: #6E6E73;
  cursor: pointer;
  transition: all 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}

.tab.active {
  background: #FFFFFF;
  color: #1D1D1F;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
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
  transition: background-color 160ms;
  -webkit-tap-highlight-color: transparent;
}

.close-btn:hover { background: rgba(0, 0, 0, 0.08); }

.panel-body { padding: 16px; }

.brush-tab { display: flex; gap: 20px; }

.size-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 0 0 110px;
}

.label {
  font-size: 11px;
  font-weight: 500;
  color: #8E8E93;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.size-slider-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.size-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #E8E8ED;
  outline: none;
  cursor: pointer;
}

.size-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 0 0 0.5px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.size-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FFFFFF;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 0 0 0.5px rgba(0, 0, 0, 0.06);
  cursor: pointer;
}

.size-preview {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
}

.size-dot {
  border-radius: 50%;
  transition: width 60ms, height 60ms, background-color 120ms;
}

.size-value {
  font-size: 13px;
  font-weight: 500;
  color: #1D1D1F;
  font-variant-numeric: tabular-nums;
}

.color-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-swatch {
  width: 100%;
  aspect-ratio: 1;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition: transform 120ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 120ms;
  -webkit-tap-highlight-color: transparent;
  box-shadow: inset 0 0 0 0.5px rgba(0, 0, 0, 0.08);
}

.color-swatch.is-white { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12); }
.color-swatch:hover { transform: scale(1.06); }
.color-swatch:active { transform: scale(0.96); }

.color-swatch.active {
  box-shadow: 0 0 0 2px #34C759, inset 0 0 0 2px #FFFFFF;
}

.palette-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px 20px;
}

.palette-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.custom-color-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  background: #34C759;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}

.custom-color-btn:hover { background: #2AB34D; }

.custom-color-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
  border: none;
}

.hint {
  font-size: 12px;
  color: #8E8E93;
  margin: 0;
}
</style>