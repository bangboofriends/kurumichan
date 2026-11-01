import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { ToolType, nWbSpPenOptions, SerializedPage } from '@/nWb';

export type PanelKind =
    | 'pen' | 'eraser' | 'menu' | 'about' | 'settings' | null;

export type PanelSide = 'left' | 'right' | 'center';

export const DEFAULT_STORE_ID = 'default';
export const PANEL_STORE_KEY = 'nwb:storeId';
export const NWB_INSTANCE_KEY = 'nwb:instance';

function createPenStore(id: string) {
    return defineStore(`pen-${id}`, () => {
        // === 画笔 ===
        const color = ref('#1C1C1E');
        const thick = ref(4);
        const tool = ref<ToolType>('pen');
        const spPen = shallowRef<nWbSpPenOptions | null>(null);

        // === 橡皮擦 ===
        const eraserSize = ref(30);
        const eraserImage = ref<string | null>(null);
        const palmAreaSize = ref(500);

        // === 页面 / 视图 ===
        const pageIndex = ref(1);
        const pageCount = ref(1);
        const scale = ref(1);
        const hasSelection = ref(false);
        const canUndo = ref(false);
        const canRedo = ref(false);
        const viewW = ref(1);
        const viewH = ref(1);

        // === 面板 / 抽屉 ===
        const panelKind = ref<PanelKind>(null);
        const panelSide = ref<PanelSide>('center');
        const drawerOpen = ref(false);
        const customColors = ref<string[]>([]);

        // === 跨路由快照 ===
        const snapshot = shallowRef<SerializedPage[] | null>(null);

        return {
            color, thick, tool, spPen,
            eraserSize, eraserImage, palmAreaSize,
            pageIndex, pageCount, scale, hasSelection,
            canUndo, canRedo,
            viewW, viewH,
            panelKind, panelSide, drawerOpen, customColors,
            snapshot,
        };
    });
}

type PenStoreHook = ReturnType<typeof createPenStore>;
const cache = new Map<string, PenStoreHook>();

export function usePenStore(id: string = DEFAULT_STORE_ID) {
    let useStore = cache.get(id);
    if (!useStore) {
        useStore = createPenStore(id);
        cache.set(id, useStore);
    }
    return useStore();
}

export function releasePenStore(id: string): void {
    cache.delete(id);
}