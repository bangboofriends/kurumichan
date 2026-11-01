// src/utils/ce404res.ts

import { parseBlob } from 'music-metadata'

/* ==================== 音频自动扫描 ==================== */

const assetUrlMap = import.meta.glob(
    [
        '@/assets/404ce/**/*.mp3',
        '@/assets/404ce/**/*.mp4',
        '@/assets/404ce/**/*.ogg',
        '@/assets/404ce/**/*.wav',
        '@/assets/404ce/**/*.webm',
    ],
    { eager: true, query: '?url', import: 'default' },
) as Record<string, string>

const lrcTextMap = import.meta.glob(
    '@/assets/404ce/**/*.lrc',
    { eager: true, query: '?raw', import: 'default' },
) as Record<string, string>

/* ==================== 手写资源列表 ==================== */

const rawMusicList = [
    { uri: '@/assets/404ce/01.mp3', lrc: '@/assets/404ce/01.lrc' },
    { uri: '@/assets/404ce/02.mp3', lrc: '@/assets/404ce/02.lrc' },
    { uri: '@/assets/404ce/03.mp3', lrc: '@/assets/404ce/03.lrc' },
    { uri: '@/assets/404ce/04.mp3', lrc: '@/assets/404ce/04.lrc' },
    { uri: '@/assets/404ce/05.mp3', lrc: '@/assets/404ce/05.lrc' },
]

// 视频全部放在 public/404ce/video/ 下，直接用根绝对路径
const rawVideoList = [
    { uri: '/404ce/video/0/0.m3u8' },
    { uri: '/404ce/video/1/1.m3u8' },
    { uri: '/404ce/video/2/2.m3u8' },
    { uri: '/404ce/video/3/3.m3u8' },
    { uri: '/404ce/video/4/4.m3u8' },
]

/* ==================== 类型 ==================== */

export interface MusicResource {
    uri: string
    lrc: string
}

export interface VideoResource {
    uri: string
}

export interface LrcLine {
    time: number
    text: string
}

export interface MusicMetadata {
    title: string
    artist: string
    album: string
    duration: number
    coverUrl: string | null
}

/* ==================== 导出数组 ==================== */

function toGlobKey(p: string): string {
    return p.startsWith('@/') ? p.replace(/^@\//, '/src/') : p
}

export const musicResources: MusicResource[] = rawMusicList.map((item) => ({
    uri: assetUrlMap[toGlobKey(item.uri)] ?? '',
    lrc: lrcTextMap[toGlobKey(item.lrc)] ?? '',
}))

// 视频直接透传，public 路径无需查表
export const videoResources: VideoResource[] = rawVideoList

/* ==================== m3u8 处理 ==================== */

/**
 * public 下的 m3u8 内部相对路径由 hls.js 按 m3u8 自身 URL 解析，
 * 不需要任何重写，直接返回原 uri。
 */
export function resolveVideoUrl(uri: string): string {
    return uri
}

/** 兼容旧调用，无需释放任何东西 */
export function disposeM3u8Cache(): void {
    /* no-op */
}

/* ==================== LRC 解析 ==================== */

export function parseLrc(raw: string): LrcLine[] {
    const lines: LrcLine[] = []
    const tag = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g

    for (const row of raw.split(/\r?\n/)) {
        const text = row.replace(tag, '').trim()
        if (!text) continue

        tag.lastIndex = 0
        let m: RegExpExecArray | null
        while ((m = tag.exec(row))) {
            const min = Number(m[1])
            const sec = Number(m[2])
            const ms = m[3] ? Number(m[3].padEnd(3, '0')) : 0
            lines.push({ time: min * 60 + sec + ms / 1000, text })
        }
    }

    return lines.sort((a, b) => a.time - b.time)
}

/* ==================== 元数据 ==================== */

export async function loadMusicMetadata(item: MusicResource): Promise<MusicMetadata> {
    const res = await fetch(item.uri)
    const blob = await res.blob()
    const meta = await parseBlob(blob, { duration: true })

    let coverUrl: string | null = null
    const pic = meta.common.picture?.[0]
    if (pic) {
        const bytes = new Uint8Array(pic.data)
        coverUrl = URL.createObjectURL(new Blob([bytes], { type: pic.format }))
    }

    return {
        title: meta.common.title?.trim() || fileNameOf(item.uri),
        artist: meta.common.artist?.trim() || '未知艺术家',
        album: meta.common.album?.trim() || '',
        duration: meta.format.duration ?? 0,
        coverUrl,
    }
}

const MAX_PARSE_BYTES = 30 * 1024 * 1024

export async function loadVideoTitle(uri: string): Promise<string> {
    const fallback = fileNameOf(uri)
    if (uri.includes('.m3u8')) return fallback

    try {
        const res = await fetch(uri)
        const blob = await res.blob()
        if (blob.size > MAX_PARSE_BYTES) return fallback
        const meta = await parseBlob(blob)
        return meta.common.title?.trim() || fallback
    } catch {
        return fallback
    }
}

export function fileNameOf(uri: string): string {
    const name = decodeURIComponent(uri.split('/').pop() ?? '')
    return name.replace(/\.[^.]+$/, '') || '未命名'
}