<template>
  <div :class="`side-${side}`" class="more-panel">
    <div class="panel-body">
      <button :disabled="ocrBusy" class="row" @click="onOcr">
        <span class="i-mingcute-ocr-line" style="font-size: 20px"/>
        <span>{{ ocrBusy ? '识别中…' : 'OCR识别' }}</span>
      </button>
      <div class="divider"/>
      <button class="row danger" @click="onClear">
        <span class="i-mingcute-broom-line" style="font-size: 20px"/>
        <span>清屏</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {inject, ref} from 'vue';
import {DEFAULT_STORE_ID, NWB_INSTANCE_KEY, PANEL_STORE_KEY, usePenStore, useSettingsStore,} from '@/store';
import {recognizeWhiteboardText, recognizeWhiteboardTextBackend} from '@/nWb/ocr';

const props = defineProps<{
  side: 'left' | 'right' | 'center';
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);
const settingsStore = useSettingsStore();

/** OCR 识别中，避免重复触发 */
const ocrBusy = ref(false);

/**
 * OCR 识别：按设置里的 ocrMode 分发。
 * fe = 前端 PaddleOCR；be = Tauri 后端（预留，当前会提示尚未接入）
 */
async function onOcr() {
  const inst = nwbRef?.value;
  if (!inst || ocrBusy.value) return;
  ocrBusy.value = true;
  try {
    const text = settingsStore.settings.ocrMode === 'fe'
        ? await recognizeWhiteboardText(inst)
        : await recognizeWhiteboardTextBackend(inst);
    if (text.trim()) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* 剪贴板不可用时忽略 */
      }
      alert(`识别结果（已复制到剪贴板）：\n\n${text}`);
    } else {
      alert('未识别到文字');
    }
  } catch (e) {
    alert((e as Error).message);
  } finally {
    ocrBusy.value = false;
    pen.panelKind = null;
  }
}

function onClear() {
  window.dispatchEvent(new CustomEvent('nwb:clear-page'));
  pen.panelKind = null;
}
</script>

<style scoped>
.more-panel {
  position: fixed;
  bottom: calc(max(20px, env(safe-area-inset-bottom, 20px)) + 84px);
  width: 220px;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
  0 0 0 0.5px rgba(0, 0, 0, 0.06);
  overflow: visible;
  z-index: 99;
  color: #1D1D1F;
  font-family: inherit;
}

.more-panel.side-left {
  left: 28px;
}

.more-panel.side-right {
  right: 28px;
}

.more-panel.side-center {
  left: 50%;
  transform: translateX(-50%);
}

.panel-body {
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: none;
  background: transparent;
  border-radius: 12px;
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
  text-align: left;
}

.row:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.row:active:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.row:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.row.danger {
  color: #FF3B30;
}

.row.danger:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.08);
}

.divider {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.08);
  margin: 6px 8px;
}
</style>
