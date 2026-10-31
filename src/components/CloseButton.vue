<template>
  <button
      ref="btnRef"
      class="close-btn"
      :class="{ arming: state === 'arming', holding: state === 'holding' }"
      @click="onClick"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      :aria-label="state === 'idle' ? '关闭' : '按住关闭'"
  >
    <svg
        v-if="state !== 'holding'"
        class="icon"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
    >
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>

    <span class="label">{{ label }}</span>

    <svg
        v-if="state === 'holding'"
        class="progress-ring"
        viewBox="0 0 48 48"
        preserveAspectRatio="none"
    >
      <rect x="1" y="1" rx="22" ry="22" width="46" height="46"
            fill="none" stroke="rgba(255, 59, 48, 0.15)" stroke-width="2"/>
      <rect x="1" y="1" rx="22" ry="22" width="46" height="46"
            fill="none" stroke="#FF3B30" stroke-width="2" stroke-linecap="round"
            :stroke-dasharray="PERIMETER" :stroke-dashoffset="dashOffset"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';

const HOLD_DURATION = 3000;
const ARM_DURATION = 3000;
const PERIMETER = 46 * 4;

const state = ref<'idle' | 'arming' | 'holding'>('idle');
const holdProgress = ref(0);
const btnRef = ref<HTMLButtonElement | null>(null);

let armTimer: number | null = null;
let holdRafId: number | null = null;
let holdStartTime = 0;

const label = computed(() => {
  if (state.value === 'idle') return '关闭';
  if (state.value === 'arming') return '按住关闭';
  return '松手取消';
});

const dashOffset = computed(() => PERIMETER * (1 - holdProgress.value));

function clearArmTimer() {
  if (armTimer !== null) { clearTimeout(armTimer); armTimer = null; }
}
function clearHoldRaf() {
  if (holdRafId !== null) { cancelAnimationFrame(holdRafId); holdRafId = null; }
}

function onClick() {
  if (state.value === 'idle') {
    state.value = 'arming';
    clearArmTimer();
    armTimer = window.setTimeout(() => {
      state.value = 'idle';
      armTimer = null;
    }, ARM_DURATION);
  }
}

function onPointerDown(e: PointerEvent) {
  if (state.value !== 'arming') return;
  e.preventDefault();
  state.value = 'holding';
  holdProgress.value = 0;
  holdStartTime = performance.now();

  const btn = btnRef.value;
  if (btn) { try { btn.setPointerCapture(e.pointerId); } catch { /* ignore */ } }

  const tick = (now: number) => {
    if (state.value !== 'holding') return;
    const elapsed = now - holdStartTime;
    holdProgress.value = Math.min(1, elapsed / HOLD_DURATION);
    if (holdProgress.value >= 1) triggerClose();
    else holdRafId = requestAnimationFrame(tick);
  };
  holdRafId = requestAnimationFrame(tick);
}

function onPointerUp() {
  if (state.value !== 'holding') return;
  clearHoldRaf();
  holdProgress.value = 0;
  state.value = 'arming';

  clearArmTimer();
  armTimer = window.setTimeout(() => {
    state.value = 'idle';
    armTimer = null;
  }, ARM_DURATION);
}

function triggerClose() {
  clearHoldRaf();
  clearArmTimer();
  state.value = 'idle';
  holdProgress.value = 0;

  console.log('[nWb] 触发关闭流程（长按 5s）');
  // 后续接入 Tauri：
  // import { getCurrentWindow } from '@tauri-apps/api/window';
  // getCurrentWindow().close();
}

onBeforeUnmount(() => {
  clearArmTimer();
  clearHoldRaf();
});
</script>

<style scoped>
.close-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 44px;
  min-width: 88px;
  padding: 0 20px;
  border: none;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  color: #1D1D1F;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow:
      0 4px 16px rgba(0, 0, 0, 0.08),
      0 0 0 0.5px rgba(0, 0, 0, 0.04);
  transition:
      background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
      color 160ms,
      transform 80ms;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: none;
  font-family: inherit;
}

.close-btn:hover { background: rgba(255, 255, 255, 0.95); }
.close-btn:active { transform: scale(0.97); }

.close-btn.arming {
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.08);
}

.close-btn.holding {
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.12);
}

.icon { flex-shrink: 0; }
.label { white-space: nowrap; }

.progress-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>