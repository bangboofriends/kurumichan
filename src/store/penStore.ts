import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { ToolType, nWbSpPenOptions, SerializedPage } from '@/nWb';

/** 每个 id 一个独立的 store 实例 */
function createPenStore(id: string) {
    return defineStore(`pen-${id}`, () => {
        // 画笔 UI 配置
        const color = ref('#1a1a1a');
        const thick = ref(3);
        const tool  = ref<ToolType>('pen');
        const spPen = shallowRef<nWbSpPenOptions | null>(null);

        // 视图 / 页面
        const pageIndex = ref(1);
        const pageCount = ref(1);
        const scale     = ref(1);
        const hasSelection = ref(false);

        // ★ 画板内容快照（用于跨路由保留，见 useNwb 的 persist 选项）
        const snapshot = shallowRef<SerializedPage[] | null>(null);

        return {
            color, thick, tool, spPen,
            pageIndex, pageCount, scale, hasSelection,
            snapshot,
        };
    });
}

type PenStoreHook = ReturnType<typeof createPenStore>;
const cache = new Map<string, PenStoreHook>();

/**
 * 按 id 获取 store 实例。
 * 相同 id 会拿到同一个 store；不同 id 完全隔离。
 */
export function usePenStore(id = 'default') {
    let useStore = cache.get(id);
    if (!useStore) {
        useStore = createPenStore(id);
        cache.set(id, useStore);
    }
    return useStore();
}

/** 可选：某个 id 不再使用时手动释放，避免长期累积 */
export function releasePenStore(id: string): void {
    cache.delete(id);
    // ⚠️ 注意：Pinia 内部还会持有该 store 的状态，直到整个 pinia 实例销毁。
    // 一般场景不需要调这个。
}