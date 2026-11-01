/**
 * .krmc 格式 —— 人生几十年总会有风雨来陪，潇潇洒洒赴会今不醉不归
 *
 * 容器：ZIP
 * 结构：
 *   mimetype        // 首文件、不压缩，固定 "application/x-krmc"
 *   manifest.json   // 元数据 + 资源清单 + 二进制清单
 *   document.json   // 全部页面 & 笔迹
 *   thumbnail.webp  // 首屏缩略图（可选）
 *   assets/<hash>.<ext>   // 图片 / 背景图 / 图样（sha256 去重）
 *   strokes/<id>.bin      // 笔画点位二进制（可选）
 *
 * 特性：
 *  - points 扁平化 + 点量化（1/64 精度），体积再降 30%+
 *  - 大量笔迹场景自动切换到二进制存储，规避 JSON 爆炸
 *  - 资源按内容 sha256 去重，跨页复用只存一份
 *  - 所有远程图片在保存时自动下载并内联，不再有外链依赖
 *  - 两段式解压（先 mimetype + manifest 校验，再全量），ZIP 炸弹防护
 *  - 版本迁移入口
 */

import {strFromU8, strToU8, type Unzipped, unzipSync, zipSync,} from 'fflate';
import type {SerializedPage, SerializedStroke} from '.';

// ============================================================
// 常量
// ============================================================

export const KRMC_MIME = 'application/x-krmc';
export const KRMC_FORMAT = 'krmc' as const;
export const KRMC_VERSION = 1;

/** 点量化倍率：坐标 × 64 → 整数 */
const QUANTIZE_SCALE = 64;

/** 资源 hash 长度（sha256 前 20 位 hex） */
const HASH_LEN = 20;

/** 安全上限 */
const LIMITS = {
    maxCompressedSize: 200 * 1024 * 1024,      // 200 MB
    maxDecompressedSize: 500 * 1024 * 1024,    // 500 MB
    maxPageCount: 500,
    maxAssetCount: 5000,
    maxAssetTotalSize: 150 * 1024 * 1024,      // 150 MB
    maxStrokeBinCount: 20000,
    maxStrokeBinTotalSize: 200 * 1024 * 1024,  // 200 MB
};

/** 二进制化 auto 模式阈值 */
const DEFAULT_BINARY_THRESHOLD = 500;

/** 远程下载默认超时 */
const DEFAULT_REMOTE_TIMEOUT = 10_000;

// ============================================================
// 类型
// ============================================================

export interface KrmcAsset {
    hash: string;
    mime: string;
    /** ZIP 内路径，如 `assets/9f3ab...png` */
    file: string;
    /** 解压后字节数（用于校验 + ZIP 炸弹防护） */
    size: number;
}

export interface KrmcStrokeBin {
    /** ZIP 内路径，如 `strokes/s_1.bin` */
    file: string;
    /** 值的数量（`points.length` 的一半） */
    valueCount: number;
    /** 数据类型 */
    type: 'int32' | 'float32';
    /** 是否已量化（加载时是否要除以 QUANTIZE_SCALE） */
    quantized: boolean;
}

export interface KrmcManifest {
    format: typeof KRMC_FORMAT;
    version: number;
    title?: string;
    appVersion?: string;
    createdAt: string;
    updatedAt: string;
    pageCount: number;
    assets: KrmcAsset[];
    /** 使用二进制存储的笔画清单 */
    strokeBins: KrmcStrokeBin[];
    /** 是否使用量化（用于加载时决定是否统一除以 QUANTIZE_SCALE） */
    quantize: boolean;
    /** 量化倍率（未来可能变化，显式存储） */
    quantizeScale: number;
    /** 扩展字段 */
    extensions?: Record<string, unknown>;
}

export interface KrmcStroke {
    id: string;
    mode: 'pen' | 'spPen' | 'image';
    width: number;
    /** 内联点位（二进制化时为空） */
    points?: number[];
    /** 二进制点位引用 */
    pointsBin?: number;
    color?: string;
    tailLen?: number;
    pattern?: string;
    patternWorldSize?: number;
    img?: string;
    imgW?: number;
    imgH?: number;
}

export interface KrmcPage {
    id: string;
    bgcolor: string;
    cam: { scale: number; tx: number; ty: number };
    bgimg?: string;
    strokes: KrmcStroke[];
}

export interface KrmcDocument {
    format: typeof KRMC_FORMAT;
    version: number;
    pages: KrmcPage[];
}

export interface KrmcSaveOptions {
    title?: string;
    appVersion?: string;
    /** 压缩级别 0~9，默认 6 */
    compressionLevel?: number;
    /** 缩略图 dataURL（推荐 webp），写入 thumbnail.webp */
    thumbnail?: string;
    /** 是否量化坐标，默认 true */
    quantize?: boolean;
    /** 笔画二进制化策略，默认 'auto' */
    strokeBinary?: 'auto' | 'always' | 'never';
    /** 'auto' 模式的笔画数阈值，默认 500 */
    binaryThreshold?: number;
    /** 是否下载远程图片并内联，默认 true */
    inlineRemote?: boolean;
    /** 远程图片下载超时（ms），默认 10000 */
    remoteTimeout?: number;
    /**
     * 严格模式：远程下载失败时是否抛错。
     * false（默认）：降级保留原 URL，warn。
     * true：抛错，终止保存。
     */
    strictRemote?: boolean;
}

export interface KrmcLoadOptions {
    /** 是否校验每个资源的内容 sha256，默认 false（慢） */
    verifyHash?: boolean;
}

export interface KrmcLoadResult {
    pages: SerializedPage[];
    manifest: KrmcManifest;
}

// ============================================================
// 工具：data URL / 字节 / base64
// ============================================================

interface ParsedAsset {
    mime: string;
    bytes: Uint8Array;
}

function dataUrlToBytes(src: string): ParsedAsset | null {
    const m = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(src);
    if (!m) return null;
    try {
        const [, mime, isB64, data] = m;
        const bytes = isB64
            ? Uint8Array.from(atob(data), c => c.charCodeAt(0))
            : new TextEncoder().encode(decodeURIComponent(data));
        return {mime, bytes};
    } catch {
        return null;
    }
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
    const CHUNK = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        const chunk = bytes.subarray(i, i + CHUNK);
        binary += String.fromCharCode(...chunk);
    }
    return `data:${mime};base64,${btoa(binary)}`;
}

function extFromMime(mime: string): string {
    const map: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'image/bmp': 'bmp',
    };
    return map[mime] ?? 'bin';
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
    if (globalThis.crypto?.subtle) {
        // TypeScript 5.7+ 里 Uint8Array<ArrayBufferLike> 不是 BufferSource
        // 切片成独立 ArrayBuffer 再传，同时保证不依赖底层 buffer 偏移
        const ab = bytes.buffer.slice(
            bytes.byteOffset,
            bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer;
        const buf = await crypto.subtle.digest('SHA-256', ab);
        return Array.from(new Uint8Array(buf))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    // 兜底：非加密哈希（仅去重用途）
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < bytes.length; i++) {
        h1 = (h1 ^ bytes[i]) * 0x01000193;
        h2 = (h2 + bytes[i]) * 0x01000193;
    }
    return ((h1 >>> 0).toString(16).padStart(8, '0')
        + (h2 >>> 0).toString(16).padStart(8, '0')).repeat(4).slice(0, 64);
}

// ============================================================
// 工具：Int32/Float32 与字节互转（显式小端）
// ============================================================

function int32ArrayToBytes(arr: Int32Array): Uint8Array {
    const bytes = new Uint8Array(arr.length * 4);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < arr.length; i++) view.setInt32(i * 4, arr[i], true);
    return bytes;
}

function bytesToInt32Array(bytes: Uint8Array): Int32Array {
    const out = new Int32Array(bytes.length / 4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < out.length; i++) out[i] = view.getInt32(i * 4, true);
    return out;
}

function bytesToFloat32Array(bytes: Uint8Array): Float32Array {
    const out = new Float32Array(bytes.length / 4);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
    return out;
}

// ============================================================
// 工具：远程下载
// ============================================================

async function fetchRemoteAsDataUrl(
    url: string,
    timeout: number,
): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url, {
            signal: controller.signal,
            mode: 'cors',
            credentials: 'omit',
        });
        clearTimeout(timer);

        if (!res.ok) {
            console.warn(`krmc: 下载失败 ${url} (HTTP ${res.status})`);
            return null;
        }

        const blob = await res.blob();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const mime = blob.type || 'application/octet-stream';
        return bytesToDataUrl(bytes, mime);
    } catch (e) {
        console.warn(`krmc: 下载异常 ${url}`, e);
        return null;
    }
}

// ============================================================
// 序列化上下文
// ============================================================

interface SaveContext {
    assets: Map<string, ParsedAsset>;
    remoteCache: Map<string, string>;
    inlineRemote: boolean;
    remoteTimeout: number;
    strictRemote: boolean;
}

async function toAssetRef(
    src: string | undefined,
    ctx: SaveContext,
): Promise<string | undefined> {
    if (!src) return undefined;
    if (src.startsWith('asset:')) return src;   // 防御性：本身已是引用

    let parsed = dataUrlToBytes(src);

    if (!parsed) {
        // 不是 dataURL
        if (!/^https?:\/\//i.test(src)) {
            // 相对路径 / blob URL 等：原样保留
            return src;
        }
        if (!ctx.inlineRemote) {
            return src;
        }

        // 远程 URL：下载并缓存
        let dataUrl = ctx.remoteCache.get(src);
        if (!dataUrl) {
            dataUrl = (await fetchRemoteAsDataUrl(src, ctx.remoteTimeout)) ?? undefined;
            if (!dataUrl) {
                if (ctx.strictRemote) {
                    throw new Error(`krmc: 远程资源下载失败 ${src}`);
                }
                return src;   // 降级
            }
            ctx.remoteCache.set(src, dataUrl);
        }

        parsed = dataUrlToBytes(dataUrl);
        if (!parsed) {
            if (ctx.strictRemote) {
                throw new Error(`krmc: 远程资源解析失败 ${src}`);
            }
            return src;
        }
    }

    const hash = (await sha256Hex(parsed.bytes)).slice(0, HASH_LEN);
    if (!ctx.assets.has(hash)) ctx.assets.set(hash, parsed);
    return `asset:${hash}`;
}

// ============================================================
// 保存
// ============================================================

/**
 * 把 `nwb.exportPages()` 的结果打包成 `.krmc` Blob。
 *
 * @example
 * ```ts
 * const thumbnail = renderKrmcThumbnail(nwb, 0, 480, 360);
 * const blob = await saveKrmc(actions.exportPages(), {
 *   title: '会议白板',
 *   thumbnail,
 * });
 * ```
 */
export async function saveKrmc(
    pages: SerializedPage[],
    options: KrmcSaveOptions = {},
): Promise<Blob> {
    const {
        title = 'untitled',
        appVersion,
        compressionLevel = 6,
        thumbnail,
        quantize = true,
        strokeBinary = 'auto',
        binaryThreshold = DEFAULT_BINARY_THRESHOLD,
        inlineRemote = true,
        remoteTimeout = DEFAULT_REMOTE_TIMEOUT,
        strictRemote = false,
    } = options;

    // ---- 统计总笔画数，决定二进制化 ----
    let totalStrokes = 0;
    for (const p of pages) totalStrokes += p.strokes.length;

    const useBinary =
        strokeBinary === 'always' ||
        (strokeBinary === 'auto' && totalStrokes >= binaryThreshold);

    const ctx: SaveContext = {
        assets: new Map(),
        remoteCache: new Map(),
        inlineRemote,
        remoteTimeout,
        strictRemote,
    };

    // ---- 序列化每页 ----
    const krmcPages: KrmcPage[] = [];
    const strokeBins: KrmcStrokeBin[] = [];
    const strokeBinFiles: Map<string, Uint8Array> = new Map();

    for (const p of pages) {
        const strokes: KrmcStroke[] = [];

        for (const s of p.strokes) {
            const base: KrmcStroke = {
                id: s.id,
                mode: s.mode,
                width: s.width,
            };

            if (s.mode === 'pen') {
                base.color = s.color;
                if (s.tailLen !== undefined) base.tailLen = s.tailLen;
            } else if (s.mode === 'spPen') {
                base.pattern = await toAssetRef(s.patternSrc, ctx);
                base.patternWorldSize = s.patternWorldSize;
            } else if (s.mode === 'image') {
                base.img = await toAssetRef(s.imgSrc, ctx);
                base.imgW = s.imgW;
                base.imgH = s.imgH;
            }

            // ---- 点位：二进制 or 内联 ----
            if (useBinary) {
                const binIndex = strokeBins.length;
                const flat = new Int32Array(s.points.length * 2);
                for (let i = 0; i < s.points.length; i++) {
                    const [x, y] = s.points[i];
                    flat[i * 2] = quantize ? Math.round(x * QUANTIZE_SCALE) : Math.round(x);
                    flat[i * 2 + 1] = quantize ? Math.round(y * QUANTIZE_SCALE) : Math.round(y);
                }
                const path = `strokes/${sanitizeFilename(s.id)}.bin`;
                strokeBinFiles.set(path, int32ArrayToBytes(flat));
                strokeBins.push({
                    file: path,
                    valueCount: flat.length,
                    type: 'int32',
                    quantized: quantize,
                });
                base.pointsBin = binIndex;
            } else {
                const arr: number[] = new Array(s.points.length * 2);
                for (let i = 0; i < s.points.length; i++) {
                    const [x, y] = s.points[i];
                    arr[i * 2] = quantize ? Math.round(x * QUANTIZE_SCALE) : x;
                    arr[i * 2 + 1] = quantize ? Math.round(y * QUANTIZE_SCALE) : y;
                }
                base.points = arr;
            }

            strokes.push(base);
        }

        const out: KrmcPage = {
            id: p.id,
            bgcolor: p.bgcolor,
            cam: {...p.cam},
            strokes,
        };
        const bg = await toAssetRef(p.bgimgSrc, ctx);
        if (bg) out.bgimg = bg;

        krmcPages.push(out);
    }

    // ---- 资源清单 ----
    const assetList: KrmcAsset[] = [];
    for (const [hash, a] of ctx.assets) {
        assetList.push({
            hash,
            mime: a.mime,
            file: `assets/${hash}.${extFromMime(a.mime)}`,
            size: a.bytes.length,
        });
    }

    // ---- 时间戳 ----
    const now = new Date().toISOString();

    const manifest: KrmcManifest = {
        format: KRMC_FORMAT,
        version: KRMC_VERSION,
        title,
        appVersion,
        createdAt: now,
        updatedAt: now,
        pageCount: krmcPages.length,
        assets: assetList,
        strokeBins,
        quantize,
        quantizeScale: QUANTIZE_SCALE,
    };

    const doc: KrmcDocument = {
        format: KRMC_FORMAT,
        version: KRMC_VERSION,
        pages: krmcPages,
    };

    // ---- 打包 ----
    type FileEntry = [Uint8Array, { level: number }];
    const files: Record<string, FileEntry | Uint8Array> = {};

    // mimetype：固定第一个、不压缩
    files['mimetype'] = [strToU8(KRMC_MIME), {level: 0}];
    files['manifest.json'] = [strToU8(JSON.stringify(manifest)), {level: compressionLevel}];
    files['document.json'] = [strToU8(JSON.stringify(doc)), {level: compressionLevel}];

    // 缩略图
    if (thumbnail) {
        const parsed = dataUrlToBytes(thumbnail);
        if (parsed) {
            const ext = parsed.mime.includes('webp') ? 'webp'
                : parsed.mime.includes('png') ? 'png'
                    : 'jpg';
            files[`thumbnail.${ext}`] = [parsed.bytes, {level: compressionLevel}];
        }
    }

    // 资源
    for (const a of assetList) {
        files[a.file] = [ctx.assets.get(a.hash)!.bytes, {level: compressionLevel}];
    }

    // 二进制笔画
    for (const [path, bytes] of strokeBinFiles) {
        files[path] = [bytes, {level: compressionLevel}];
    }

    const zip = zipSync(files as any, {level: compressionLevel as any});
    return new Blob([zip], {type: KRMC_MIME});
}

// ============================================================
// 加载
// ============================================================

/**
 * 解析 `.krmc` 文件。
 *
 * 两段式解压：
 *   1. 只解压 mimetype + manifest.json 做结构校验
 *   2. 全量解压
 */
export async function loadKrmc(
    input: Blob | ArrayBuffer | Uint8Array,
    options: KrmcLoadOptions = {},
): Promise<KrmcLoadResult> {
    const {verifyHash = false} = options;

    // ---- 统一字节 ----
    let bytes: Uint8Array;
    if (input instanceof Blob) {
        if (input.size > LIMITS.maxCompressedSize) {
            throw new Error(`krmc: 文件过大（${input.size} > ${LIMITS.maxCompressedSize}）`);
        }
        bytes = new Uint8Array(await input.arrayBuffer());
    } else if (input instanceof ArrayBuffer) {
        bytes = new Uint8Array(input);
    } else {
        bytes = input;
    }

    if (bytes.length > LIMITS.maxCompressedSize) {
        throw new Error(`krmc: 文件过大（${bytes.length} > ${LIMITS.maxCompressedSize}）`);
    }

    // ---- 第一段：只解压 mimetype + manifest ----
    let head: Unzipped;
    try {
        head = unzipSync(bytes, {
            filter: f => f.name === 'mimetype' || f.name === 'manifest.json',
        });
    } catch {
        throw new Error('krmc: 不是有效的 ZIP 文件');
    }

    if (!head['mimetype']) throw new Error('krmc: 缺少 mimetype');
    if (strFromU8(head['mimetype']) !== KRMC_MIME) {
        throw new Error(`krmc: mimetype 不匹配（期望 ${KRMC_MIME}）`);
    }
    if (!head['manifest.json']) throw new Error('krmc: 缺少 manifest.json');

    let manifest: KrmcManifest;
    try {
        manifest = JSON.parse(strFromU8(head['manifest.json']));
    } catch {
        throw new Error('krmc: manifest.json 解析失败');
    }

    if (manifest.format !== KRMC_FORMAT) {
        throw new Error(`krmc: format 不匹配（期望 ${KRMC_FORMAT}）`);
    }
    if (typeof manifest.version !== 'number' || manifest.version < 1) {
        throw new Error('krmc: manifest.version 无效');
    }
    if (manifest.pageCount > LIMITS.maxPageCount) {
        throw new Error(`krmc: 页面过多（${manifest.pageCount}）`);
    }
    if (manifest.assets.length > LIMITS.maxAssetCount) {
        throw new Error(`krmc: 资源过多（${manifest.assets.length}）`);
    }
    if (manifest.strokeBins.length > LIMITS.maxStrokeBinCount) {
        throw new Error(`krmc: 二进制笔画过多（${manifest.strokeBins.length}）`);
    }

    // 资源总大小 + 二进制总大小校验
    let assetTotalSize = 0;
    for (const a of manifest.assets) assetTotalSize += a.size ?? 0;
    if (assetTotalSize > LIMITS.maxAssetTotalSize) {
        throw new Error(`krmc: 资源总大小超限（${assetTotalSize}）`);
    }

    let binTotalSize = 0;
    for (const b of manifest.strokeBins) binTotalSize += b.valueCount * 4;
    if (binTotalSize > LIMITS.maxStrokeBinTotalSize) {
        throw new Error(`krmc: 二进制笔画总大小超限（${binTotalSize}）`);
    }

    // ---- 第二段：全量解压 ----
    let zip: Unzipped;
    try {
        zip = unzipSync(bytes);
    } catch {
        throw new Error('krmc: 解压失败');
    }

    let decompressedTotal = 0;
    for (const k in zip) decompressedTotal += zip[k].length;
    if (decompressedTotal > LIMITS.maxDecompressedSize) {
        throw new Error(`krmc: 解压后过大（${decompressedTotal}）`);
    }

    // ---- 版本迁移 ----
    let doc: KrmcDocument;
    try {
        doc = JSON.parse(strFromU8(zip['document.json']));
    } catch {
        throw new Error('krmc: document.json 解析失败');
    }
    doc = migrateDocument(doc);

    // ---- 资源 hash → dataURL ----
    const assetByHash = new Map<string, KrmcAsset>();
    for (const a of manifest.assets) assetByHash.set(a.hash, a);

    const srcCache = new Map<string, string>();

    async function resolveRef(ref?: string): Promise<string | undefined> {
        if (!ref) return undefined;
        if (!ref.startsWith('asset:')) return ref;
        const hash = ref.slice(6);
        if (srcCache.has(hash)) return srcCache.get(hash);

        const meta = assetByHash.get(hash);
        if (!meta) {
            console.warn(`krmc: 资源 ${hash} 缺失`);
            return undefined;
        }
        const data = zip[meta.file];
        if (!data) {
            console.warn(`krmc: 资源文件 ${meta.file} 缺失`);
            return undefined;
        }

        if (verifyHash) {
            const actual = (await sha256Hex(data)).slice(0, HASH_LEN);
            if (actual !== hash) {
                console.warn(`krmc: 资源 ${hash} 内容 hash 不匹配，跳过`);
                return undefined;
            }
        }

        const url = bytesToDataUrl(data, meta.mime);
        srcCache.set(hash, url);
        return url;
    }

    // ---- 二进制笔画预解码 ----
    const strokePointsCache = new Map<number, Float32Array | Int32Array>();
    const quantizeScale = manifest.quantizeScale || QUANTIZE_SCALE;

    function readPointsBin(binIndex: number): number[] | null {
        if (strokePointsCache.has(binIndex)) {
            const arr = strokePointsCache.get(binIndex)!;
            return Array.from(arr);
        }
        const meta = manifest.strokeBins[binIndex];
        if (!meta) return null;
        const data = zip[meta.file];
        if (!data) return null;

        let arr: Int32Array | Float32Array;
        if (meta.type === 'int32') {
            arr = bytesToInt32Array(data);
        } else {
            arr = bytesToFloat32Array(data);
        }
        strokePointsCache.set(binIndex, arr);
        return Array.from(arr);
    }

    // ---- 反序列化 ----
    const pages: SerializedPage[] = [];

    for (const p of doc.pages) {
        const strokes: SerializedStroke[] = [];

        for (const s of p.strokes) {
            // 取扁平数组
            let flat: number[] | null = null;
            let strokeQuantized = manifest.quantize;

            if (s.pointsBin !== undefined) {
                flat = readPointsBin(s.pointsBin);
                if (flat) {
                    const binMeta = manifest.strokeBins[s.pointsBin];
                    strokeQuantized = binMeta?.quantized ?? manifest.quantize;
                }
            } else if (s.points) {
                flat = s.points;
            }

            if (!flat) {
                console.warn(`krmc: 笔画 ${s.id} 无点位数据，跳过`);
                continue;
            }

            // 反量化 + 反扁平化
            const points: Array<[number, number]> = [];
            const div = strokeQuantized ? quantizeScale : 1;
            for (let i = 0; i + 1 < flat.length; i += 2) {
                points.push([flat[i] / div, flat[i + 1] / div]);
            }

            const out: SerializedStroke = {
                id: s.id,
                mode: s.mode,
                width: s.width,
                points,
            };

            if (s.mode === 'pen') {
                out.color = s.color ?? '#000000';
                if (s.tailLen !== undefined) out.tailLen = s.tailLen;
            } else if (s.mode === 'spPen') {
                out.patternSrc = await resolveRef(s.pattern);
                out.patternWorldSize = s.patternWorldSize;
            } else if (s.mode === 'image') {
                out.imgSrc = (await resolveRef(s.img)) ?? '';
                out.imgW = s.imgW ?? 0;
                out.imgH = s.imgH ?? 0;
            } else {
                console.warn(`krmc: 未知 mode "${(s as any).mode}"，跳过`);
                continue;
            }

            strokes.push(out);
        }

        const page: SerializedPage = {
            id: p.id,
            bgcolor: p.bgcolor,
            cam: {...p.cam},
            strokes,
        };
        const bg = await resolveRef(p.bgimg);
        if (bg) page.bgimgSrc = bg;

        pages.push(page);
    }

    return {pages, manifest};
}

// ============================================================
// 缩略图辅助
// ============================================================

/**
 * 用 nWb 实例渲染某页缩略图并返回 dataURL。
 * 输出优先使用 webp（体积更小），不支持时自动降级为 png。
 *
 * @example
 * ```ts
 * const thumbnail = renderKrmcThumbnail(nwb, 0, 480, 360);
 * const blob = await saveKrmc(pages, { thumbnail });
 * ```
 */
export function renderKrmcThumbnail(
    nwb: { renderPageThumbnail: (i: number, c: HTMLCanvasElement, w: number, h: number) => void },
    pageIndex: number,
    width: number,
    height: number,
    quality = 0.85,
): string {
    const canvas = document.createElement('canvas');
    nwb.renderPageThumbnail(pageIndex, canvas, width, height);

    // 优先 webp
    let url = canvas.toDataURL('image/webp', quality);
    if (url.startsWith('data:image/webp')) return url;

    // 降级 png
    url = canvas.toDataURL('image/png');
    return url;
}

// ============================================================
// 版本迁移
// ============================================================

type Migration = (doc: KrmcDocument) => KrmcDocument;

/**
 * `MIGRATIONS[key]` 表示「从版本 key 升级到 key + 1」。
 */
const MIGRATIONS: Record<number, Migration> = {
    // 未来在此添加：
    // 1: (doc) => ({ ...doc, version: 2, pages: doc.pages.map(/* ... */) }),
};

function migrateDocument(doc: KrmcDocument): KrmcDocument {
    let cur = doc;

    if (cur.version > KRMC_VERSION) {
        throw new Error(
            `krmc: 文件版本过新（v${cur.version} > 当前支持 v${KRMC_VERSION}）`,
        );
    }

    while (cur.version < KRMC_VERSION) {
        const m = MIGRATIONS[cur.version];
        if (!m) {
            throw new Error(`krmc: 无法从 v${cur.version} 迁移到 v${cur.version + 1}`);
        }
        cur = m(cur);
    }

    return cur;
}

// ============================================================
// 内部工具
// ============================================================

function sanitizeFilename(id: string): string {
    // 只保留安全字符，避免 ZIP 内路径注入
    return id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'stroke';
}