import { onMounted, onUnmounted, shallowRef, watch, provide, type Ref } from 'vue';
import {
    nWb,
    type PageEffect,
    type TouchPointData,
    type SerializedPage,
    type ToolType,
} from '@/nWb';
import { usePenStore, NWB_INSTANCE_KEY } from '@/store';

export interface DrawEventData {
    strokeId: string;
    mode: 'pen' | 'spPen' | 'image';
    points: number;
}

export interface EraseEventData {
    point: { x: number; y: number };
    radius: number;
}

export interface UseNwbOptions {
    canvasRef: Ref<HTMLCanvasElement | null>;
    storeId: string;
    effect?: PageEffect;
    mode?: 'tpdetect';
    persist?: boolean;
    onDraw?: (data: DrawEventData) => void;
    onErase?: (data: EraseEventData) => void;
    onTouch?: (data: TouchPointData) => void;
    onPointerDown?: (e: PointerEvent) => void;
    onPointerUp?: (e: PointerEvent) => void;
}

export function useNwb(options: UseNwbOptions) {
    const {
        canvasRef, storeId, effect = 'none', mode, persist = false,
        onDraw, onErase, onTouch, onPointerDown, onPointerUp,
    } = options;
    const store = usePenStore(storeId);
    const nwb = shallowRef<nWb | null>(null);

    // 让后代组件（如 PageDrawer）能拿到 nWb 实例
    provide(NWB_INSTANCE_KEY, nwb);

    onMounted(async () => {
        if (!canvasRef.value) return;
        const inst = new nWb();

        // === nWb → store ===
        inst.onPageChange = (idx, total) => {
            store.pageIndex = idx;
            store.pageCount = total;
        };
        inst.onScaleChange = (s) => { store.scale = s; };
        inst.onSelectionChange = (has) => { store.hasSelection = has; };
        inst.onHistoryChange = (u, r) => {
            store.canUndo = u;
            store.canRedo = r;
        };
        inst.onViewResize = (w, h) => {
            store.viewW = w;
            store.viewH = h;
        };

        // === nWb 事件 → 组件回调 ===
        inst.addEventListener('onDraw', (d: DrawEventData) => onDraw?.(d));
        inst.addEventListener('onErase', (d: EraseEventData) => onErase?.(d));
        inst.addEventListener('onTouch', (d: TouchPointData) => onTouch?.(d));
        inst.addEventListener('onPointerDown', (e: PointerEvent) => onPointerDown?.(e));
        inst.addEventListener('onPointerUp', (e: PointerEvent) => onPointerUp?.(e));

        // === 初始化 ===
        await inst.init({
            canvas: canvasRef.value,
            changePageEffect: effect,
            mode,
        });

        // === 初始同步 ===
        inst.setPalmAreaSize(store.palmAreaSize);
        if (store.eraserImage) inst.setEraserImage(store.eraserImage);

        // === 恢复快照 ===
        if (persist && store.snapshot && store.snapshot.length) {
            await inst.importPages(store.snapshot);
            inst.resetHistory();
        }

        // === 应用工具 ===
        applyTool(inst, store);

        // === 同步初始状态 ===
        const size = inst.getViewSize();
        store.viewW = size.width;
        store.viewH = size.height;
        store.canUndo = inst.canUndo();
        store.canRedo = inst.canRedo();

        nwb.value = inst;
    });

    onUnmounted(() => {
        if (persist && nwb.value) {
            store.snapshot = nwb.value.exportPages();
        }
        nwb.value?.destroy();
        nwb.value = null;
    });

    // === store → nWb 同步 ===

    watch(
        () => [store.color, store.thick, nwb.value] as const,
        () => {
            if (store.tool === 'pen' && nwb.value) {
                nwb.value.setPen({ color: store.color, thick: store.thick });
            }
        },
    );

    watch(
        () => [store.tool, nwb.value] as const,
        () => applyTool(nwb.value, store),
    );

    watch(
        () => store.spPen,
        (v) => {
            if (v && store.tool === 'spPen') nwb.value?.setSpPen(v);
        },
    );

    watch(
        () => store.eraserSize,
        (size) => {
            if (store.tool === 'eraser') nwb.value?.setEraser(size);
        },
    );

    watch(
        () => store.eraserImage,
        (src) => { nwb.value?.setEraserImage(src); },
    );

    watch(
        () => store.palmAreaSize,
        (size) => { nwb.value?.setPalmAreaSize(size); },
    );

    // === actions ===
    const actions = {
        goNext: () => nwb.value?.goNext(),
        goPrev: () => nwb.value?.goPrev(),
        goTo: (n: number) => nwb.value?.goTo(n),
        newPage: (opts?: Parameters<nWb['newPage']>[0]) => nwb.value?.newPage(opts),
        exportPages: (): SerializedPage[] => nwb.value?.exportPages() ?? [],
        importPages: (p: SerializedPage[]) => nwb.value?.importPages(p),
        undo: () => nwb.value?.undo() ?? false,
        redo: () => nwb.value?.redo() ?? false,
        resetHistory: () => nwb.value?.resetHistory(),
        commitSelection: () => nwb.value?.commitSelection(),
        copySelection: () => nwb.value?.copySelection(),
        cancelSelection: () => nwb.value?.cancelSelection(),
        hasSelection: () => nwb.value?.hasSelection() ?? false,
        clearCurrentPage: () => nwb.value?.clearCurrentPage(),
        setEraserImage: (src: string | null) => { store.eraserImage = src; },
        setPalmAreaSize: (size: number) => { store.palmAreaSize = size; },
        getTouchPoints: () => nwb.value?.getTouchPoints() ?? [],
        isPalmErasing: () => nwb.value?.isPalmErasing() ?? false,
    };

    return { nwb, actions };
}

function applyTool(inst: nWb | null, store: ReturnType<typeof usePenStore>) {
    if (!inst) return;
    const tool = store.tool as ToolType;
    if (tool === 'pen') {
        inst.setPen({ color: store.color, thick: store.thick });
    } else if (tool === 'spPen') {
        if (store.spPen) inst.setSpPen(store.spPen);
    } else if (tool === 'eraser') {
        inst.setEraser(store.eraserSize);
    } else {
        inst.setTool(tool);
    }
}