<template>
  <button
      ref="btnRef"
      class="close-btn"
      :class="{
      arming: state === 'arming',
      holding: state === 'holding',
    }"
      :style="{ '--progress': `${holdProgress * 360}deg` }"
      @click="onClick"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      :aria-label="state === 'idle' ? '关闭' : '按住关闭'"
  >
    <span v-if="state !== 'holding'" class="i-mingcute-close-line close-icon" />
    <span class="label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';

const emit = defineEmits<{ (e: 'close'): void }>();

const HOLD_DURATION = 3000;
const ARM_DURATION = 3000;

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
    } catch {
      /* ignore */
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

  emit('close');
}

onBeforeUnmount(() => {
  clearArmTimer();
  clearHoldRaf();
});
</script>

<style scoped>
.close-btn {
  --progress: 0deg;

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
  isolation: isolate;
}

.close-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(
      #ff3b30 var(--progress),
      rgba(255, 59, 48, 0.12) 0
  );
  -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 160ms cubic-bezier(0.4, 0, 0.2, 1);
}

.close-btn.holding::before {
  opacity: 1;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.95);
}

.close-btn:active {
  transform: scale(0.97);
}

.close-btn.arming {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.08);
}

.close-btn.holding {
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.12);
}

.close-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.label {
  white-space: nowrap;
}
</style>