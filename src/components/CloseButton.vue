<template>
  <button
      ref="btnRef"
      :aria-label="state === 'idle' ? '关闭' : '按住关闭'"
      :class="{ arming: state === 'arming', holding: state === 'holding' }"
      class="close-btn"
      @click="onClick"
      @pointercancel="onPointerUp"
      @pointerdown="onPointerDown"
      @pointerleave="onPointerUp"
      @pointerup="onPointerUp"
  >
    <span v-if="state !== 'holding'" class="i-mingcute-close-line" style="font-size: 18px"/>
    <span class="label">{{ label }}</span>

    <svg
        v-if="state === 'holding'"
        class="progress-ring"
        preserveAspectRatio="none"
        viewBox="0 0 52 52"
    >
      <rect
          fill="none" height="50" rx="24" ry="24" stroke="rgba(255, 59, 48, 0.15)" stroke-width="2"
          width="50" x="1" y="1"
      />
      <rect
          :stroke-dasharray="PERIMETER" :stroke-dashoffset="dashOffset" fill="none" height="50" rx="24" ry="24"
          stroke="#FF3B30" stroke-linecap="round" stroke-width="2" width="50"
          x="1" y="1"
      />
    </svg>
  </button>
</template>

<script lang="ts" setup>
import {computed, onBeforeUnmount, ref} from 'vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const HOLD_DURATION = 5000;
const ARM_DURATION = 3000;
const PERIMETER = 50 * 4;

const state = ref<'idle' | 'arming' | 'holding'>('idle');
const holdProgress = ref(0);
const btnRef = ref<HTMLButtonElement | null>(null);

let armTimer: number | null = null;
let holdRafId: number | null = null;
let holdStartTime = 0;
let fired = false;

const label = computed(() => {
  if (state.value === 'idle') return '关闭';
  if (state.value === 'arming') return '按住关闭';
  return '松手取消';
});

const dashOffset = computed(() => PERIMETER * (1 - holdProgress.value));

function clearArmTimer() {
  if (armTimer !== null) {
    clearTimeout(armTimer);
    armTimer = null;
  }
}

function clearHoldRaf() {
  if (holdRafId !== null) {
    cancelAnimationFrame(holdRafId);
    holdRafId = null;
  }
}

function onClick() {
  if (fired) return;
  if (state.value === 'idle') {
    state.value = 'arming';
    clearArmTimer();
    armTimer = window.setTimeout(() => {
      if (state.value === 'arming') state.value = 'idle';
      armTimer = null;
    }, ARM_DURATION);
  }
}

function onPointerDown(e: PointerEvent) {
  if (fired) return;
  if (state.value !== 'arming') return;

  e.preventDefault();
  e.stopPropagation();
  clearArmTimer();

  state.value = 'holding';
  holdProgress.value = 0;
  holdStartTime = performance.now();

  const btn = btnRef.value;
  if (btn) {
    try {
      btn.setPointerCapture(e.pointerId);
    } catch { /* ignore */
    }
  }

  const tick = (now: number) => {
    if (fired) return;
    if (state.value !== 'holding') return;
    const elapsed = now - holdStartTime;
    holdProgress.value = Math.min(1, elapsed / HOLD_DURATION);
    if (holdProgress.value >= 1) {
      triggerClose();
    } else {
      holdRafId = requestAnimationFrame(tick);
    }
  };
  holdRafId = requestAnimationFrame(tick);
}

function onPointerUp() {
  if (fired) return;
  if (state.value !== 'holding') return;

  clearHoldRaf();
  holdProgress.value = 0;
  state.value = 'arming';

  clearArmTimer();
  armTimer = window.setTimeout(() => {
    if (state.value === 'arming') state.value = 'idle';
    armTimer = null;
  }, ARM_DURATION);
}

function triggerClose() {
  if (fired) return;
  fired = true;

  clearHoldRaf();
  clearArmTimer();
  state.value = 'idle';
  holdProgress.value = 0;

  // 通知父组件
  emit('close');
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
  gap: 8px;
  height: 52px;
  min-width: 108px;
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
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
  color 160ms,
  transform 80ms;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: none;
  font-family: inherit;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.95);
}

.close-btn:active {
  transform: scale(0.97);
}

.close-btn.arming {
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.08);
}

.close-btn.holding {
  color: #FF3B30;
  background: rgba(255, 59, 48, 0.12);
}

.label {
  white-space: nowrap;
}

.progress-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>