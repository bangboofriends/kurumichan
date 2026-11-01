<template>
  <div :class="`side-${side}`" class="more-panel">
    <div class="panel-body">
      <button class="row danger" @click="onClear">
        <span class="i-mingcute-broom-line" style="font-size: 20px"/>
        <span>清屏</span>
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {inject} from 'vue';
import {DEFAULT_STORE_ID, PANEL_STORE_KEY, usePenStore,} from '@/store';

const props = defineProps<{
  side: 'left' | 'right' | 'center';
  storeId?: string;
}>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

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
</style>
