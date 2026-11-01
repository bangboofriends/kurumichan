<template>
  <div class="settings-panel">
    <div class="panel-header">
      <span class="panel-title">设置</span>
      <button aria-label="关闭" class="close-btn" @click="close">
        <span class="i-mingcute-close-line" style="font-size: 16px"/>
      </button>
    </div>
    <div class="panel-body">
      <label class="row">
        <span class="label">手掌面积阈值</span>
        <input
            v-model.number="pen.palmAreaSize" class="slider" max="3000" min="200"
            step="100"
            type="range"
        />
        <span class="value">{{ pen.palmAreaSize }}</span>
      </label>

      <label class="row">
        <span class="label">橡皮擦大小</span>
        <input
            v-model.number="pen.eraserSize" class="slider" max="80" min="10"
            step="2"
            type="range"
        />
        <span class="value">{{ pen.eraserSize }}</span>
      </label>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {inject} from 'vue';
import {DEFAULT_STORE_ID, PANEL_STORE_KEY, usePenStore} from '@/store';

defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

function close() {
  pen.panelKind = null;
}
</script>

<style scoped>
.settings-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(400px, 88vw);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: saturate(180%) blur(24px);
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  border-radius: 22px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18),
  0 0 0 0.5px rgba(0, 0, 0, 0.06);
  z-index: 99;
  color: #1D1D1F;
  font-family: inherit;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
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
}

.panel-body {
  padding: 20px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.label {
  font-size: 14px;
  color: #1D1D1F;
  min-width: 108px;
}

.slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #E8E8ED;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FFFFFF;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 0 0 0.5px rgba(0, 0, 0, 0.06);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FFFFFF;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 0 0 0.5px rgba(0, 0, 0, 0.06);
}

.value {
  min-width: 40px;
  text-align: right;
  font-size: 13px;
  color: #6E6E73;
  font-variant-numeric: tabular-nums;
}
</style>