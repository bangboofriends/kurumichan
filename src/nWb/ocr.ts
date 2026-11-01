/**
 * 白板 OCR 模块 —— 按需加载 PaddleOCR.js
 *
 * 特性：
 *   - 动态 import，不增加首屏体积
 *   - 单例缓存 OCR 实例，重复调用不重复初始化
 *   - 支持识别 Canvas / Image / Blob / ImageData
 *   - 返回结构化结果（文字 + 置信度 + 多边形坐标）
 *
 * 注意：首次调用 `recognize` 会下载 ONNX 模型（几 MB），需要网络。
 *      可通过 `modelBaseUrl` 把模型托管到自己的 CDN。
 */

let ocrInstance: PaddleOcrInstance | null = null;
let loadingPromise: Promise<PaddleOcrInstance> | null = null;

// ============================================================
// 类型定义（与 @paddleocr/paddleocr-js 对齐，避免 any 扩散）
// ============================================================

/** 识别到的文字行 */
export interface OcrItem {
    /** 四边形坐标，格式 [[x0,y0],[x1,y1],[x2,y2],[x3,y3]] */
    poly: number[][];
    /** 识别出的文字 */
    text: string;
    /** 置信度 0~1 */
    score: number;
}

/** 单张图片的识别结果 */
export interface OcrResult {
    /** 原图尺寸 */
    image: { width: number; height: number };
    /** 识别到的文字行 */
    items: OcrItem[];
    /** 耗时（毫秒） */
    metrics?: {
        detMs?: number;
        recMs?: number;
        totalMs?: number;
        detectedBoxes?: number;
        recognizedCount?: number;
    };
    /** 运行时后端信息（wasm / webgpu 等） */
    runtime?: any;
}

/** OCR 初始化选项 */
export interface OcrOptions {
    /** 语言，默认 'ch'（中英文混合） */
    lang?: string;
    /** 模型版本，默认 'PP-OCRv6'，可选 'PP-OCRv5' */
    ocrVersion?: 'PP-OCRv5' | 'PP-OCRv6';
    /** 是否使用 Web Worker 推理，默认 true（防止阻塞 UI） */
    worker?: boolean;
    /**
     * 自定义模型资源地址（例如自建 CDN）。
     * 不传则使用官方默认地址。
     */
    modelBaseUrl?: string;

    /** 其他透传给 PaddleOCR.create 的参数 */
    [key: string]: any;
}

/** PaddleOCR 实例的简化接口 */
interface PaddleOcrInstance {
    predict(
        image:
            | HTMLCanvasElement
            | HTMLImageElement
            | ImageData
            | Blob
            | ImageBitmap,
        params?: Record<string, any>,
    ): Promise<OcrResult[]>;

    dispose?(): void;
}

// ============================================================
// 按需加载 OCR 实例
// ============================================================

/**
 * 获取（或懒加载）OCR 实例。
 * 多次调用只会初始化一次，后续复用同一个实例。
 */
export async function getOcr(options?: OcrOptions): Promise<PaddleOcrInstance> {
    if (ocrInstance) return ocrInstance;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        // 动态导入，不打包进首屏
        const mod = await import('@paddleocr/paddleocr-js');
        const PaddleOCR = (mod as any).PaddleOCR ?? (mod as any).default?.PaddleOCR;
        if (!PaddleOCR) {
            throw new Error(
                'ocr: 无法加载 @paddleocr/paddleocr-js，请确认已安装该依赖',
            );
        }

        const createOptions: Record<string, any> = {
            lang: options?.lang ?? 'ch',
            ocrVersion: options?.ocrVersion ?? 'PP-OCRv6',
            worker: options?.worker ?? true,
            // Worker 模式下 onnxruntime-web 需要 wasm 文件地址。
            // 构建产物已将 wasm 输出到 dist/assets，直接指向本地路径，
            // 避免回退到 CDN（jsdelivr），保证主线程与 Worker 版本一致
            ortOptions: {wasmPaths: '/assets/'},
        };

        // 自定义模型地址（如果提供）
        if (options?.modelBaseUrl) {
            // 官方参数名可能是 textDetectionModelAsset / textRecognitionModelAsset
            // 这里透传 modelBaseUrl 给上层，由业务侧根据实际 API 映射
            createOptions.modelBaseUrl = options.modelBaseUrl;
        }

        // 合并其他透传参数
        for (const [k, v] of Object.entries(options ?? {})) {
            if (!['lang', 'ocrVersion', 'worker', 'modelBaseUrl'].includes(k)) {
                createOptions[k] = v;
            }
        }

        const instance = (await PaddleOCR.create(createOptions)) as PaddleOcrInstance;
        ocrInstance = instance;
        return instance;
    })();

    try {
        return await loadingPromise;
    } finally {
        loadingPromise = null;
    }
}

// ============================================================
// 识别 API
// ============================================================

/**
 * 识别图片中的文字。
 *
 * @param image 支持 Canvas / Image / Blob / ImageData / ImageBitmap
 * @param options OCR 配置 + predict 参数
 * @returns 第一张图的识别结果（如果传入多张图，请使用 `recognizeBatch`）
 *
 * @example
 * ```ts
 * const canvas = document.createElement('canvas');
 * // ... 把白板选区画到 canvas ...
 * const result = await recognize(canvas);
 * console.log(result.items.map(i => i.text).join('\n'));
 * ```
 */
export async function recognize(
    image:
        | HTMLCanvasElement
        | HTMLImageElement
        | ImageData
        | Blob
        | ImageBitmap,
    options?: OcrOptions & { params?: Record<string, any> },
): Promise<OcrResult> {
    const ocr = await getOcr(options);
    const results = await ocr.predict(image, options?.params);
    if (!results?.length) {
        throw new Error('ocr: 识别返回空结果');
    }
    return results[0];
}

/**
 * 批量识别多张图片。
 */
export async function recognizeBatch(
    images: Array<
        | HTMLCanvasElement
        | HTMLImageElement
        | ImageData
        | Blob
        | ImageBitmap
    >,
    options?: OcrOptions & { params?: Record<string, any> },
): Promise<OcrResult[]> {
    const ocr = await getOcr(options);
    return ocr.predict(images as any, options?.params);
}

/**
 * 只取纯文本（按行拼接）。
 */
export async function recognizeText(
    image:
        | HTMLCanvasElement
        | HTMLImageElement
        | ImageData
        | Blob
        | ImageBitmap,
    options?: OcrOptions & { params?: Record<string, any> },
): Promise<string> {
    const result = await recognize(image, options);
    return result.items.map((i) => i.text).join('\n');
}

// ============================================================
// 释放资源
// ============================================================

/**
 * 释放 OCR 实例（一般不需要调用，页面卸载时可选）。
 */
export function disposeOcr(): void {
    if (ocrInstance) {
        try {
            ocrInstance.dispose?.();
        } catch {
            /* ignore */
        }
        ocrInstance = null;
    }
    loadingPromise = null;
}

// ============================================================
// 白板集成
// ============================================================

/** dataURL → HTMLImageElement */
function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('ocr: 图片解码失败'));
        img.src = dataUrl;
    });
}

/** 从主画布裁剪选区图像（参照 nwbdoc 10.5，访问内核私有字段） */
function cropSelectionCanvas(nwb: any): HTMLCanvasElement | null {
    const sel = nwb.selection;
    const cam = nwb.cam;
    const mainCanvas: HTMLCanvasElement | undefined = nwb.canvas;
    if (!sel || !cam || !mainCanvas) return null;

    const dpr = window.devicePixelRatio || 1;
    const sx = sel.x * cam.scale + cam.tx;
    const sy = sel.y * cam.scale + cam.ty;
    const sw = sel.w * cam.scale;
    const sh = sel.h * cam.scale;
    if (sw <= 0 || sh <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * dpr));
    canvas.height = Math.max(1, Math.round(sh * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(
        mainCanvas,
        sx * dpr, sy * dpr, sw * dpr, sh * dpr,
        0, 0, canvas.width, canvas.height,
    );
    return canvas;
}

/**
 * 识别白板内容文字（PaddleOCR，前端本地推理）。
 *
 * 优先识别圈选区域；无选区时识别当前页的高清渲染图。
 * 首次调用会下载 ONNX 模型（几 MB）。
 */
export async function recognizeWhiteboardText(
    nwb: any,
    options?: OcrOptions & { params?: Record<string, any> },
): Promise<string> {
    if (!nwb) throw new Error('ocr: 白板实例不存在');

    // 优先识别圈选区域
    if (typeof nwb.hasSelection === 'function' && nwb.hasSelection()) {
        const cropped = cropSelectionCanvas(nwb);
        if (cropped) return recognizeText(cropped, options);
    }

    // 无选区：渲染当前页（getPageIndex 返回 1-based，renderHQImage 需要 0-based）
    const pageIndex =
        typeof nwb.getPageIndex === 'function' ? nwb.getPageIndex() - 1 : 0;
    const urls: string[] = nwb.renderHQImage(pageIndex, {scale: 2, format: 'png'});
    if (!urls?.length) throw new Error('ocr: 当前页无可识别内容');
    const img = await dataUrlToImage(urls[0]);
    return recognizeText(img, options);
}

/**
 * 识别白板内容文字（Tauri 后端，预留）。
 *
 * 等待后端接入。预期流程：
 *   renderHQImage → 图片字节 → invoke('ocr_recognize', { bytes })
 *   → Rust 侧调用本地 OCR 引擎（如 RapidOCR）→ 返回文本
 * 好处：无需前端下载 ONNX 模型，识别速度与内存占用更优。
 */
export async function recognizeWhiteboardTextBackend(_nwb: any): Promise<string> {
    // TODO(tauri-ocr): 后端 OCR 尚未接入，等待后续实现
    throw new Error('OCR 后端尚未接入，敬请期待');
}