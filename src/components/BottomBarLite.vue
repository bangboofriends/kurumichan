<template>
  <div class="bottom-bar">
    <!-- 左侧栏：菜单 / 笔 / 橡皮 / 最小化 -->
    <div class="side side-left">
      <SideToolbar :store-id="resolvedStoreId" side="left"/>
    </div>

    <!-- 中间：翻页 + OCR + 关闭 -->
    <div class="side side-center">
      <PageBar :store-id="resolvedStoreId"/>
      <button :disabled="ocrBusy" aria-label="OCR" class="ocr-btn" @click="onOcr">
        <span class="i-mingcute-ocr-line ocr-icon"/>
        <span class="label">{{ ocrBusy ? '识别中…' : 'OCR' }}</span>
      </button>
      <CloseButton @close="onClose"/>
    </div>

    <!-- 右侧栏：菜单 / 笔 / 橡皮 / 最小化 -->
    <div class="side side-right">
      <SideToolbar :store-id="resolvedStoreId" side="right"/>
    </div>
  </div>

  <!-- 面板 -->
  <Transition name="panel">
    <PenPanel
        v-if="pen.panelKind === 'pen'"
        :side="pen.panelSide"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <EraserPanel
        v-if="pen.panelKind === 'eraser'"
        :side="pen.panelSide"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <MenuPanel
        v-if="pen.panelKind === 'menu'"
        :side="pen.panelSide"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <AboutPanel
        v-if="pen.panelKind === 'about'"
        :store-id="resolvedStoreId"
    />
  </Transition>
  <Transition name="panel">
    <SettingsPanel
        v-if="pen.panelKind === 'settings'"
        :store-id="resolvedStoreId"
    />
  </Transition>

  <PageDrawer :store-id="resolvedStoreId"/>
</template>

<script lang="ts" setup>
import {inject, ref} from 'vue';
import {DEFAULT_STORE_ID, NWB_INSTANCE_KEY, PANEL_STORE_KEY, usePenStore, useSettingsStore} from '@/store';
import {recognizeWhiteboardText, recognizeWhiteboardTextBackend} from '@/nWb/ocr';
import SideToolbar from '@/components/SideToolBar.vue';
import CloseButton from '@/components/CloseButton.vue';
import PageBar from '@/components/PageBar.vue';
import PenPanel from '@/components/PenPanel.vue';
import EraserPanel from '@/components/EraserPanel.vue';
import MenuPanel from '@/components/MenuPanel.vue';
import AboutPanel from '@/components/AboutPanel.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import PageDrawer from '@/components/PageDrawer.vue';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

function onClose() {
  window.dispatchEvent(new CustomEvent('nwb:command', {detail: {type: 'close'}}));
}

/* ==================== OCR ==================== */

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);
const settingsStore = useSettingsStore();

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
  }
}
</script>

<style scoped>
.bottom-bar {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom, 20px));
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 28px;
  pointer-events: none;
  z-index: 100;
  gap: 12px;
}

.side {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.side-left {
  justify-content: flex-start;
}

.side-center {
  justify-content: center;
}

/* OCR 按钮 */
.ocr-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 22px;
  border: none;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
  0 0 0 0.5px rgba(0, 0, 0, 0.04);
  transition: background-color 160ms, transform 80ms;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  font-family: inherit;
}

.ocr-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.95);
}

.ocr-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.ocr-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ocr-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.side-right {
  justify-content: flex-end;
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 220ms cubic-bezier(0.4, 0, 0.2, 1),
  transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}
</style>