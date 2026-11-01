<template>
  <div
      ref="barEl"
      :class="[`side-${barLayout.side}`, { floating: barLayout.floating }]"
      :style="barLayout.floating ? { left: `${barLayout.x}px`, top: `${barLayout.y}px` } : undefined"
      class="wb-bar"
  >
    <!-- 移动手柄（ToolMovable）：竖线，按住拖动整个工具栏，双击复位 -->
    <div
        v-if="settingsStore.settings.ToolMovable"
        class="drag-handle"
        title="按住拖动工具栏，双击复位"
        @dblclick="resetBarPos"
        @pointerdown="onHandleDown"
    />
    <!-- 最左：菜单 / 最小化 -->
    <div class="group group-left">
      <div class="bar-group">
        <button
            :class="{ active: isMenuOpen }"
            aria-label="菜单"
            class="bar-btn"
            @click="onMenu"
        >
          <span class="i-mingcute-menu-line icon"/>
          <span class="label">菜单</span>
        </button>
        <button
            aria-label="最小化"
            class="bar-btn"
            @click="onMinimize"
        >
          <span class="i-mingcute-down-line icon"/>
          <span class="label">最小化</span>
        </button>
        <button
            aria-label="展台"
            class="bar-btn"
            @click="onVisualizer"
        >
          <span class="i-mingcute-camera-line icon"/>
          <span class="label">展台</span>
        </button>
      </div>
    </div>

    <!-- 正中：选择工具 / 笔 / 橡皮 / 更多工具 -->
    <div class="group group-center">
      <div class="bar-group">
        <button
            :class="{ active: isSelectActive }"
            aria-label="选择工具"
            class="bar-btn"
            @click="onSelect"
        >
          <span class="i-mingcute-cursor-line icon"/>
          <span class="label">选择工具</span>
        </button>
        <button
            :class="{ active: isPenActive }"
            aria-label="笔"
            class="bar-btn"
            @click="onPen"
        >
          <span class="i-mingcute-pen-line icon"/>
          <span class="label">笔</span>
        </button>
        <button
            :class="{ active: isEraserActive }"
            aria-label="橡皮"
            class="bar-btn"
            @click="onEraser"
        >
          <span class="i-mingcute-eraser-line icon"/>
          <span class="label">橡皮</span>
        </button>
        <div class="bar-divider"/>
        <button
            :disabled="!pen.canUndo"
            aria-label="撤销"
            class="bar-btn"
            @click="onUndo"
        >
          <span class="i-mingcute-back-line icon"/>
          <span class="label">撤销</span>
        </button>
        <button
            :disabled="!pen.canRedo"
            aria-label="重做"
            class="bar-btn"
            @click="onRedo"
        >
          <span class="i-mingcute-forward-line icon"/>
          <span class="label">重做</span>
        </button>
        <div class="bar-divider"/>
        <button
            :class="{ active: isMoreOpen }"
            aria-label="更多工具"
            class="bar-btn"
            @click="onMore"
        >
          <span class="i-mingcute-more-2-line icon"/>
          <span class="label">更多工具</span>
        </button>
      </div>
    </div>

    <!-- 最右：页面控制 -->
    <div class="group group-right">
      <div class="bar-group">
        <button
            :disabled="pen.pageIndex <= 1"
            aria-label="上一页"
            class="bar-btn"
            @click="onPrev"
        >
          <span class="i-mingcute-arrow-left-line icon"/>
          <span class="label">上一页</span>
        </button>
        <button
            :class="{ active: pen.drawerOpen }"
            aria-label="页面"
            class="bar-btn page-info"
            @click="toggleDrawer"
        >
          <span class="pages">
            <span class="num">{{ pen.pageIndex }}</span>
            <span class="sep">/</span>
            <span class="num total">{{ pen.pageCount }}</span>
          </span>
          <span class="label">页面</span>
        </button>
        <button
            v-if="isLastPage"
            aria-label="新建页"
            class="bar-btn add"
            @click="onAdd"
        >
          <span class="i-mingcute-add-line icon"/>
          <span class="label">新建页</span>
        </button>
        <button
            v-else
            aria-label="下一页"
            class="bar-btn"
            @click="onNext"
        >
          <span class="i-mingcute-arrow-right-line icon"/>
          <span class="label">下一页</span>
        </button>
      </div>
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
    <MorePanel
        v-if="pen.panelKind === 'more'"
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
import {computed, inject, onBeforeUnmount, ref} from 'vue';
import {DEFAULT_STORE_ID, NWB_INSTANCE_KEY, PANEL_STORE_KEY, usePenStore, useSettingsStore,} from '@/store';
import PenPanel from '@/components/PenPanel.vue';
import EraserPanel from '@/components/EraserPanel.vue';
import MenuPanel from '@/components/MenuPanel.vue';
import MorePanel from '@/components/MorePanel.vue';
import AboutPanel from '@/components/AboutPanel.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import PageDrawer from '@/components/PageDrawer.vue';

const props = defineProps<{ storeId?: string }>();

const injectedId = inject<string | undefined>(PANEL_STORE_KEY, undefined);
const resolvedStoreId = props.storeId ?? injectedId ?? DEFAULT_STORE_ID;
const pen = usePenStore(resolvedStoreId);

const nwbRef = inject<{ value: any } | null>(NWB_INSTANCE_KEY, null);
const settingsStore = useSettingsStore();

/* ==================== 工具栏布局：底部横向 / 侧边竖向 / 自由拖动 ==================== */

const barEl = ref<HTMLElement | null>(null);

/**
 * 布局模式：
 * - floating：被拖动手柄移动过，使用自由坐标（横向/竖向保持 barSide 的形态）
 * - 否则按 barSide：bottom 横向底部；left/right 竖向贴边
 */
const barLayout = computed(() => {
  const pos = settingsStore.barPos;
  const side = settingsStore.barSide;
  if (pos) return {floating: true as const, side, x: pos.x, y: pos.y};
  return {floating: false as const, side, x: 0, y: 0};
});

/* ---- 拖动手柄（Pointer Events，兼容鼠标 / 触摸 / 手写笔） ---- */

let dragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

function onHandleDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const bar = barEl.value;
  if (!bar) return;

  // 停靠状态下 .wb-bar 是满宽容器，取各分组的并集矩形作为可视边界，避免首次拖动跳变
  let rect: DOMRect = bar.getBoundingClientRect();
  if (!settingsStore.barPos) {
    const groups = bar.querySelectorAll('.group');
    if (groups.length) {
      let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
      groups.forEach((g) => {
        const r = g.getBoundingClientRect();
        left = Math.min(left, r.left);
        top = Math.min(top, r.top);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      });
      rect = new DOMRect(left, top, right - left, bottom - top);
    }
  }

  dragging = true;
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;

  const target = e.currentTarget as HTMLElement;
  try {
    target.setPointerCapture(e.pointerId);
  } catch {
    /* 某些环境不支持捕获时忽略 */
  }
  window.addEventListener('pointermove', onHandleMove, true);
  window.addEventListener('pointerup', onHandleUp, true);
  window.addEventListener('pointercancel', onHandleUp, true);
}

function onHandleMove(e: PointerEvent) {
  if (!dragging) return;
  const bar = barEl.value;
  const w = bar?.offsetWidth ?? 0;
  const h = bar?.offsetHeight ?? 0;
  const x = Math.min(Math.max(e.clientX - dragOffsetX, 0), Math.max(window.innerWidth - w, 0));
  const y = Math.min(Math.max(e.clientY - dragOffsetY, 0), Math.max(window.innerHeight - h, 0));
  settingsStore.barPos = {x, y};
}

function onHandleUp() {
  if (!dragging) return;
  dragging = false;
  window.removeEventListener('pointermove', onHandleMove, true);
  window.removeEventListener('pointerup', onHandleUp, true);
  window.removeEventListener('pointercancel', onHandleUp, true);
}

/** 双击手柄复位到停靠位置 */
function resetBarPos() {
  settingsStore.barPos = null;
}

onBeforeUnmount(() => {
  onHandleUp();
});

/* ==================== 激活态 ==================== */

const isMenuOpen = computed(() =>
    pen.panelKind === 'menu' && pen.panelSide === 'left'
);

const isSelectActive = computed(() => pen.tool === 'select');

const isPenActive = computed(() =>
    pen.tool === 'pen' &&
    (pen.panelKind !== 'pen' || pen.panelSide === 'center')
);

const isEraserActive = computed(() =>
    pen.tool === 'eraser' &&
    (pen.panelKind !== 'eraser' || pen.panelSide === 'center')
);

const isMoreOpen = computed(() =>
    pen.panelKind === 'more' && pen.panelSide === 'center'
);

const isLastPage = computed(() => pen.pageIndex >= pen.pageCount);

/* ==================== 左侧 ==================== */

function onMenu() {
  if (pen.panelKind === 'menu' && pen.panelSide === 'left') {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'menu';
    pen.panelSide = 'left';
  }
}

function onMinimize() {
  window.dispatchEvent(new CustomEvent('nwb:command', {detail: {type: 'minimize'}}));
}

function onVisualizer() {
  window.dispatchEvent(new CustomEvent('nwb:command', {detail: {type: 'visualizer'}}));
}

/* ==================== 中间工具 ==================== */

function onSelect() {
  pen.tool = 'select';
  pen.panelKind = null;
}

function onPen() {
  if (pen.tool !== 'pen') {
    pen.tool = 'pen';
    pen.panelKind = null;
    return;
  }
  if (pen.panelKind === 'pen' && pen.panelSide === 'center') {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'pen';
    pen.panelSide = 'center';
  }
}

function onEraser() {
  if (pen.tool !== 'eraser') {
    pen.tool = 'eraser';
    pen.panelKind = null;
    return;
  }
  if (pen.panelKind === 'eraser' && pen.panelSide === 'center') {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'eraser';
    pen.panelSide = 'center';
  }
}

function onMore() {
  if (pen.panelKind === 'more' && pen.panelSide === 'center') {
    pen.panelKind = null;
  } else {
    pen.panelKind = 'more';
    pen.panelSide = 'center';
  }
}

function onUndo() {
  nwbRef?.value?.undo();
}

function onRedo() {
  nwbRef?.value?.redo();
}

/* ==================== 页面控制 ==================== */

function onPrev() {
  nwbRef?.value?.goPrev();
}

function onNext() {
  nwbRef?.value?.goNext();
}

async function onAdd() {
  const inst = nwbRef?.value;
  if (!inst) return;
  await inst.newPage({bgcolor: settingsStore.settings.boardDefaultBgColor});
  inst.goTo(inst.getPageCount());
}

function toggleDrawer() {
  pen.drawerOpen = !pen.drawerOpen;
}
</script>

<style scoped>
.wb-bar {
  position: fixed;
  bottom: max(20px, env(safe-area-inset-bottom, 20px));
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-end;
  padding: 0 28px;
  pointer-events: none;
  z-index: 100;
  gap: 12px;
}

.group {
  display: flex;
  align-items: center;
}

.group-left {
  flex: 1;
  justify-content: flex-start;
}

.group-center {
  justify-content: center;
}

.group-right {
  flex: 1;
  justify-content: flex-end;
}

.bar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-radius: 22px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08),
  0 0 0 0.5px rgba(0, 0, 0, 0.04);
  pointer-events: auto;
}

.bar-btn {
  min-width: 56px;
  height: 56px;
  padding: 0 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #1D1D1F;
  cursor: pointer;
  transition: background-color 160ms cubic-bezier(0.4, 0, 0.2, 1),
  color 160ms cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  font-family: inherit;
}

.bar-btn .icon {
  font-size: 20px;
  line-height: 1;
}

.bar-btn .label {
  font-size: 11px;
  line-height: 1.2;
  font-weight: 500;
  white-space: nowrap;
}

.bar-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
}

.bar-btn:active:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

.bar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.bar-btn.active {
  background: #34C759;
  color: #FFFFFF;
}

.bar-btn.active:hover {
  background: #2AB34D;
}

.bar-btn.add {
  color: #34C759;
}

.bar-btn.add:hover {
  background: rgba(52, 199, 89, 0.1);
}

.bar-divider {
  width: 1px;
  height: 28px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 2px;
}

/* ==================== 侧边竖向模式（barSide = left/right） ==================== */

.wb-bar.side-left,
.wb-bar.side-right {
  top: 50%;
  bottom: auto;
  transform: translateY(-50%);
  flex-direction: column;
  align-items: center;
  padding: 28px 0;
}

.wb-bar.side-left {
  left: 0;
  right: auto;
}

.wb-bar.side-right {
  right: 0;
  left: auto;
}

.wb-bar.side-left .group,
.wb-bar.side-right .group {
  flex-direction: column;
}

.wb-bar.side-left .bar-group,
.wb-bar.side-right .bar-group {
  flex-direction: column;
}

.wb-bar.side-left .bar-divider,
.wb-bar.side-right .bar-divider {
  width: 28px;
  height: 1px;
  margin: 2px 0;
}

/* ==================== 自由拖动（floating） ==================== */

.wb-bar.floating {
  right: auto;
  bottom: auto;
  transform: none;
  padding: 0;
}

/* ==================== 拖动手柄（一条竖线） ==================== */

.drag-handle {
  pointer-events: auto;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 5px;
  cursor: grab;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
}

.drag-handle::before {
  content: '';
  display: block;
  width: 3px;
  height: 36px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.18);
  transition: background-color 140ms;
}

.drag-handle:hover::before {
  background: rgba(0, 0, 0, 0.3);
}

.drag-handle:active {
  cursor: grabbing;
}

/* 竖向模式下手柄变为横线，位于栏顶部 */
.wb-bar.side-left .drag-handle,
.wb-bar.side-right .drag-handle {
  padding: 4px 12px;
}

.wb-bar.side-left .drag-handle::before,
.wb-bar.side-right .drag-handle::before {
  width: 36px;
  height: 3px;
}

/* 页码按钮上半部分 */
.page-info .pages {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.page-info .num {
  min-width: 14px;
  text-align: center;
}

.page-info .num.total {
  color: #8E8E93;
}

.page-info .sep {
  color: #C7C7CC;
  font-weight: 400;
}

.page-info.active .num.total,
.page-info.active .sep {
  color: rgba(255, 255, 255, 0.8);
}

/* 面板过渡，与 BottomBarLite 一致 */
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
