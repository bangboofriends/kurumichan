import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'
import {
    cpSync,
    createReadStream,
    existsSync,
    mkdirSync,
    readdirSync,
    rmSync,
    statSync,
} from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const host = process.env.TAURI_DEV_HOST
const ROOT = dirname(fileURLToPath(import.meta.url))

/* ==================== 7z 查找 ==================== */

function find7z(): string | null {
    const systemCandidates = [
        'C:\\Program Files\\7-Zip\\7z.exe',
        'C:\\Program Files (x86)\\7-Zip\\7z.exe',
        '7z',
        '7za',
    ]

    for (const p of systemCandidates) {
        try {
            const r = spawnSync(p, ['i'], { stdio: 'ignore' })
            if (r.status === 0) return p
        } catch {
            /* ignore */
        }
    }

    const projectSevenZip = join(ROOT, '7z', '7z.exe')
    if (existsSync(projectSevenZip)) {
        try {
            const r = spawnSync(projectSevenZip, ['i'], { stdio: 'ignore' })
            if (r.status === 0) {
                console.log(`[ensure-video] 使用项目内 7z: ${projectSevenZip}`)
                return projectSevenZip
            }
        } catch {
            /* ignore */
        }
    }

    return null
}

/* ==================== 启动时确保视频资源存在 ==================== */

function ensureVideoAssets(): Plugin {
    return {
        name: 'ensure-404ce-video',
        buildStart() {
            if (process.env.SKIP_VIDEO_SETUP === '1') {
                console.log('[ensure-video] SKIP_VIDEO_SETUP=1，跳过检查')
                return
            }

            const videoDir = join(ROOT, 'public/404ce/video')
            const sentinel = join(videoDir, '0', '0.m3u8')

            if (existsSync(sentinel)) {
                console.log('[ensure-video] public/404ce/video 已存在，跳过解压')
                return
            }

            const archive = join(ROOT, 'goodthings/404ce.7z.001')
            if (!existsSync(archive)) {
                console.warn(`[ensure-video] 找不到压缩包: ${archive}，跳过`)
                return
            }

            const sevenZip = find7z()
            if (!sevenZip) {
                console.warn(
                    '[ensure-video] 未找到 7z，请安装 7-Zip、把 7z 加入 PATH，' +
                    '或在项目根目录放置 7z/7z.exe，跳过',
                )
                return
            }

            console.log(`[ensure-video] 使用 7z: ${sevenZip}`)
            console.log('[ensure-video] public/404ce/video 缺失，开始解压 404ce.7z.001 …')

            const tempDir = join(tmpdir(), `kurumichan-404ce-${Date.now()}`)
            mkdirSync(tempDir, { recursive: true })

            try {
                execFileSync(sevenZip, ['x', archive, `-o${tempDir}`, '-y'], {
                    stdio: ['ignore', 'ignore', 'inherit'],
                })

                let videoSrc: string | null = null
                if (existsSync(join(tempDir, 'video'))) {
                    videoSrc = join(tempDir, 'video')
                } else if (existsSync(join(tempDir, '404ce', 'video'))) {
                    videoSrc = join(tempDir, '404ce', 'video')
                } else {
                    const entries = readdirSync(tempDir)
                    if (entries.includes('0') && entries.includes('1')) {
                        videoSrc = tempDir
                    }
                }

                if (!videoSrc) {
                    console.error('[ensure-video] 解压后找不到 video 目录，请手动检查压缩包结构')
                    return
                }

                mkdirSync(join(ROOT, 'public/404ce'), { recursive: true })
                if (existsSync(videoDir)) {
                    rmSync(videoDir, { recursive: true, force: true })
                }
                cpSync(videoSrc, videoDir, { recursive: true })
                console.log('[ensure-video] 解压完成')

                if (!existsSync(sentinel)) {
                    console.error(
                        `[ensure-video] 解压后仍找不到 ${sentinel}，请检查压缩包内是否包含 0/0.m3u8`,
                    )
                }
            } catch (err) {
                console.error('[ensure-video] 解压失败:', err)
            } finally {
                rmSync(tempDir, { recursive: true, force: true })
            }
        },
    }
}

/* ==================== /404ce/ 静态资源中间件 ==================== */

const MIME_MAP: Record<string, string> = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.m2ts': 'video/mp2t',
    '.ts': 'video/mp2t',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.lrc': 'text/plain; charset=utf-8',
}

function serve404ceStatic(): Plugin {
    return {
        name: 'serve-404ce-static',
        configureServer(server) {
            const mw: any = (req: any, res: any, next: any) => {
                const rawUrl = req.url ?? ''
                const url = rawUrl.split('?')[0]
                if (!url.startsWith('/404ce/')) return next()

                const rel = decodeURIComponent(url.slice(1))
                const publicRoot = join(ROOT, 'public')
                const filePath = normalize(join(publicRoot, rel))

                if (!filePath.startsWith(publicRoot)) return next()

                if (!existsSync(filePath)) {
                    console.warn(`[serve-404ce] 文件不存在: ${filePath}`)
                    return next()
                }

                const stat = statSync(filePath)
                if (!stat.isFile()) return next()

                const mime = MIME_MAP[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
                res.setHeader('Content-Type', mime)
                res.setHeader('Content-Length', stat.size)
                res.setHeader('Accept-Ranges', 'bytes')
                res.setHeader('Cache-Control', 'no-cache')

                const range = req.headers.range
                if (range) {
                    const m = /^bytes=(\d*)-(\d*)$/.exec(range)
                    if (m) {
                        const start = m[1] ? parseInt(m[1], 10) : 0
                        const end = m[2] ? parseInt(m[2], 10) : stat.size - 1
                        if (start <= end && end < stat.size) {
                            res.statusCode = 206
                            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
                            res.setHeader('Content-Length', end - start + 1)
                            createReadStream(filePath, { start, end }).pipe(res)
                            return
                        }
                    }
                }

                res.statusCode = 200
                createReadStream(filePath).pipe(res)
            }

            // 插到中间件栈最前面，抢在 SPA fallback 之前
            server.middlewares.stack.unshift({ route: '', handle: mw })
        },
    }
}

// https://vite.dev/config/
export default defineConfig(() => ({
    plugins: [
        ensureVideoAssets(),
        serve404ceStatic(),
        vue(),
        UnoCSS(),
    ],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
        dedupe: ['vue'],
    },

    build: {
        assetsInlineLimit: 0,
        chunkSizeWarningLimit: 600,
        rolldownOptions: {
            output: {
                entryFileNames: 'assets/kurumichan[hash].js',
                chunkFileNames: 'assets/kurumichan[hash].js',
                assetFileNames: 'assets/kurumichan[hash][extname]',
                codeSplitting: {
                    groups: [
                        {
                            name: 'vendor-hls',
                            test: /node_modules[\\/]hls\.js/,
                            priority: 20,
                        },
                        {
                            name: 'vendor-metadata',
                            test: /node_modules[\\/]music-metadata/,
                            priority: 20,
                        },
                        {
                            name: 'vendor',
                            test: /node_modules/,
                            priority: 10,
                            minSize: 20000,
                        },
                    ],
                },
            },
        },
    },

    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: 'ws',
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            ignored: ['**/src-tauri/**'],
        },
    },
}))