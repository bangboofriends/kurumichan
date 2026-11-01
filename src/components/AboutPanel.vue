<template>
  <div class="about-panel">
    <div class="panel-header">
      <span class="panel-title">关于</span>
      <button aria-label="关闭" class="close-btn" @click="close">
        <span class="i-mingcute-close-line" style="font-size: 16px"/>
      </button>
    </div>
    <div class="panel-body">
      <div class="logo">
        <span class="i-mingcute-pen-line" style="font-size: 40px; color: #34C759"/>
      </div>
      <h1 class="name">KurumiChan</h1>
      <p class="version">Version 1.0.0</p>
      <p class="desc">
        老实做白板，很枯燥吧？<br>
        支持手掌擦除、矢量选区、高清导出。
      </p>
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
.about-panel {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(360px, 86vw);
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
  padding: 24px 20px 28px;
  text-align: center;
}

.logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(52, 199, 89, 0.1);
  border-radius: 20px;
}

.name {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 600;
}

.version {
  margin: 0 0 16px;
  font-size: 12px;
  color: #8E8E93;
  font-variant-numeric: tabular-nums;
}

.desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #6E6E73;
}
</style>