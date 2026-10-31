<script setup lang="ts">
import {ref} from 'vue';
import {usePenStore} from '@/store/penStore';
import {useNwb} from '@/composables/useNwb';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const pen = usePenStore('ttt1');                       // ★
const {actions} = useNwb({
  canvasRef,
  storeId: 'ttt1',                                     // ★
  effect: 'slide',
  persist: false,   // 用 KeepAlive 的话不用开
  mode: "tpdetect",
});

async function addPage() {
  await actions.newPage({bgcolor: '#ffffff'});
  actions.goTo(pen.pageCount);   // 跳到新页
}

function exportAll() {
  const pages = actions.exportPages();
  // 交给业务层序列化：JSON / 二进制
  const json = JSON.stringify(pages);
  const blob = new Blob([json], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'whiteboard.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importAll() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const text = await file.text();
    await actions.importPages(JSON.parse(text));
  };
  input.click();
}
</script>

<template>
  <canvas ref="canvasRef" class="board"/>

  <div class="toolbar">
    <!-- 工具切换 -->
    <button :class="{ active: pen.tool === 'pen' }" @click="pen.tool = 'pen'">笔</button>
    <button :class="{ active: pen.tool === 'spPen' }" @click="pen.tool = 'spPen'">图样</button>
    <button :class="{ active: pen.tool === 'eraser' }" @click="pen.tool = 'eraser'">橡皮</button>
    <button :class="{ active: pen.tool === 'select' }" @click="pen.tool = 'select'">选择</button>

    <span class="divider"/>

    <!-- 颜色/粗细 -->
    <input type="color" v-model="pen.color" :disabled="pen.tool !== 'pen'"/>
    <input type="range" min="1" max="20" v-model.number="pen.thick" :disabled="pen.tool !== 'pen'"/>
    <span>{{ pen.thick }}px</span>

    <span class="divider"/>

    <!-- 翻页 -->
    <button :disabled="pen.pageIndex <= 1" @click="actions.goPrev">上一页</button>
    <span>{{ pen.pageIndex }} / {{ pen.pageCount }}</span>
    <button :disabled="pen.pageIndex >= pen.pageCount" @click="actions.goNext">下一页</button>

    <span class="divider"/>

    <button @click="addPage">新建页</button>
    <button @click="exportAll">导出</button>
    <button @click="importAll">导入</button>

    <!-- 只读信息 -->
    <span class="scale">×{{ pen.scale.toFixed(2) }}</span>
    <span v-if="pen.hasSelection" class="tip">已选中</span>
  </div>
</template>

<style scoped>
.board {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

.toolbar {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .7);
  color: #fff;
  font: 13px/1.2 system-ui, sans-serif;
  backdrop-filter: blur(8px);
  user-select: none;
}

.toolbar button {
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, .3);
  border-radius: 6px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
}

.toolbar button.active {
  background: rgba(59, 130, 246, .9);
  border-color: transparent;
}

.toolbar button:disabled {
  opacity: .35;
  cursor: not-allowed;
}

.toolbar input[type="range"] {
  width: 100px;
}

.divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, .25);
}

.scale, .tip {
  opacity: .8;
  font-size: 12px;
}
</style>