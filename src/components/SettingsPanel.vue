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
            v-model.number="s.handSizeValve" class="slider" max="3000" min="200"
            step="100"
            type="range"
        />
        <span class="value">{{ s.handSizeValve }}</span>
      </label>

      <label class="row">
        <span class="label">橡皮擦大小</span>
        <input
            v-model.number="s.eraserSize" class="slider" max="80" min="10"
            step="2"
            type="range"
        />
        <span class="value">{{ s.eraserSize }}</span>
      </label>

      <label class="row">
        <span class="label">画笔默认粗细</span>
        <input
            v-model.number="s.penToolDefaultSize" class="slider" max="40" min="1"
            step="1"
            type="range"
        />
        <span class="value">{{ s.penToolDefaultSize }}</span>
      </label>

      <label class="row">
        <span class="label">画板默认背景色</span>
        <input v-model="s.boardDefaultBgColor" class="color-input" type="color"/>
        <span class="value">{{ s.boardDefaultBgColor }}</span>
      </label>

      <label class="row">
        <span class="label">画笔默认颜色</span>
        <input v-model="s.penToolDefaultColor" class="color-input" type="color"/>
        <span class="value">{{ s.penToolDefaultColor }}</span>
      </label>

      <div class="row column">
        <span class="label">图样笔内置图样 (JSON)</span>
        <textarea
            v-model="patternsText"
            class="patterns-input"
            rows="2"
            spellcheck="false"
            @blur="onPatternsBlur"
        />
      </div>

      <label class="row">
        <span class="label">工具栏跟随书写侧</span>
        <input v-model="s.enableToolTipMoveWithWrite" class="switch" type="checkbox"/>
      </label>

      <label class="row">
        <span class="label">工具栏可拖动</span>
        <input v-model="s.ToolMovable" class="switch" type="checkbox"/>
      </label>

      <div class="row">
        <span class="label">OCR 方式</span>
        <div class="seg">
          <button
              :class="{ active: s.ocrMode === 'fe' }"
              class="seg-btn"
              @click="s.ocrMode = 'fe'"
          >前端
          </button>
          <button
              :class="{ active: s.ocrMode === 'be' }"
              class="seg-btn"
              @click="s.ocrMode = 'be'"
          >后端
          </button>
        </div>
      </div>

      <button :disabled="loading" class="load-btn" @click="onLoad">
        {{ loading ? '读取中…' : '从 settings.json 读取配置' }}
      </button>
      <span v-if="loadMsg" class="load-msg">{{ loadMsg }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {inject, ref} from 'vue';
import {DEFAULT_STORE_ID, PANEL_STORE_KEY, usePenStore, useSettingsStore} from '@/store';

defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const settingsStore = useSettingsStore();
/** 直接绑定 store 里的设置对象（pinia setup store 自动解包 ref） */
const s = settingsStore.settings;

/** 图样笔图样的文本编辑（失焦时解析，非法 JSON 则还原） */
const patternsText = ref(JSON.stringify(s.spPenToolBuiltinPatterns, null, 2));

function onPatternsBlur() {
  try {
    s.spPenToolBuiltinPatterns = JSON.parse(patternsText.value || '{}');
  } catch {
    alert('图样 JSON 格式不正确，已还原');
    patternsText.value = JSON.stringify(s.spPenToolBuiltinPatterns, null, 2);
  }
}

const loading = ref(false);
const loadMsg = ref('');

/** 从本地 settings.json 重新读取配置 */
async function onLoad() {
  if (loading.value) return;
  loading.value = true;
  loadMsg.value = '';
  try {
    const ok = await settingsStore.loadFromDisk();
    loadMsg.value = ok
        ? `已读取：${settingsStore.loadedFrom}`
        : '未找到 settings.json，使用默认配置';
    if (ok) {
      patternsText.value = JSON.stringify(s.spPenToolBuiltinPatterns, null, 2);
    }
  } finally {
    loading.value = false;
  }
}

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
  max-height: 70vh;
  overflow-y: auto;
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

.row.column {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
}

.color-input {
  flex: 1;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
}

.patterns-input {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 8px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: #1D1D1F;
  background: rgba(0, 0, 0, 0.02);
  outline: none;
}

.patterns-input:focus {
  border-color: #34C759;
}

.switch {
  margin-left: auto;
  width: 20px;
  height: 20px;
  accent-color: #34C759;
  cursor: pointer;
}

.seg {
  margin-left: auto;
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  padding: 3px;
  gap: 2px;
}

.seg-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #6E6E73;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 140ms, color 140ms;
}

.seg-btn.active {
  background: #FFFFFF;
  color: #1D1D1F;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.load-btn {
  width: 100%;
  margin-top: 12px;
  height: 40px;
  border: none;
  border-radius: 12px;
  background: #34C759;
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background-color 140ms;
}

.load-btn:hover:not(:disabled) {
  background: #2AB34D;
}

.load-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.load-msg {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #8E8E93;
  text-align: center;
}
</style>