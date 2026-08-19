// Generates original pixel-art PNG icons for the Vantera PWA using only
// Node's built-in zlib (no image dependencies). Draws an isometric cube
// "V" mark on a flat grid, then nearest-neighbour upscales to each target
// size so every output stays crisp pixel art.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- Design: 32x32 logical grid, isometric cube "V" mark ----
const GRID = 32
const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const BG = hex('#0b0e1a')
const PANEL = hex('#161c36')
const LINE = hex('#2b3358')
const TOP = hex('#ff2f6e') // top face
const LEFT = hex('#c81f52') // left face (darker)
const RIGHT = hex('#7c1636') // right face (darkest)
const TEAL = hex('#35e6c4')

function makeGrid() {
  const g = Array.from({ length: GRID }, () => Array.from({ length: GRID }, () => BG))
  // soft vignette panel square with rounded corners
  const r = 5
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const cornerCut =
        (x < r && y < r && r - x + (r - y) > r) ||
        (x >= GRID - r && y < r && x - (GRID - 1 - r) + (r - y) > r) ||
        (x < r && y >= GRID - r && r - x + y - (GRID - 1 - r) > r) ||
        (x >= GRID - r && y >= GRID - r && x - (GRID - 1 - r) + (y - (GRID - 1 - r)) > r)
      if (!cornerCut) g[y][x] = PANEL
    }
  }
  return g
}

function setPx(g, x, y, color) {
  if (x >= 0 && x < GRID && y >= 0 && y < GRID) g[y][x] = color
}

function fillDiamond(g, cx, cy, halfW, halfH, color) {
  for (let y = -halfH; y <= halfH; y++) {
    for (let x = -halfW; x <= halfW; x++) {
      if (Math.abs(x) / halfW + Math.abs(y) / halfH <= 1) setPx(g, cx + x, cy + y, color)
    }
  }
}

function drawIsoCube(g) {
  const cx = 16
  const cyTop = 9
  const halfW = 10
  const halfH = 5
  // top rhombus (diamond)
  fillDiamond(g, cx, cyTop, halfW, halfH, TOP)
  // left face: parallelogram below-left of the diamond
  for (let y = 0; y < 11; y++) {
    for (let x = -halfW; x <= 0; x++) {
      const t = (x + halfW) / halfW // 0..1 left->center
      const yTop = cyTop + halfH * (1 - t)
      const yy = Math.round(yTop) + y
      if (t <= 1) setPx(g, cx + x, yy, LEFT)
    }
  }
  // right face: parallelogram below-right
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x <= halfW; x++) {
      const t = (halfW - x) / halfW // 1..0 center->right
      const yTop = cyTop + halfH * (1 - t)
      const yy = Math.round(yTop) + y
      setPx(g, cx + x, yy, RIGHT)
    }
  }
  // subtle top edge highlight
  for (let x = -halfW; x <= halfW; x++) {
    const t = Math.abs(x) / halfW
    const y = Math.round(cyTop - halfH * (1 - t) + halfH)
    setPx(g, cx + x, y, TEAL)
  }
  // status dot (online / active unit)
  fillDiamond(g, 25, 6, 2, 2, TEAL)
}

function drawGrid(g) {
  // faint isometric floor lines at bottom for "office" motif
  for (let x = 4; x < GRID - 4; x += 4) {
    setPx(g, x, 27, LINE)
    setPx(g, x + 1, 28, LINE)
  }
}

const grid = makeGrid()
drawGrid(grid)
drawIsoCube(grid)

function rasterize(size, opts = {}) {
  const { maskable = false } = opts
  const scale = size / GRID
  const pad = maskable ? Math.floor(size * 0.12) : 0 // safe zone for maskable icons
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let gx = Math.floor((x - pad) / ((size - pad * 2) / GRID))
      let gy = Math.floor((y - pad) / ((size - pad * 2) / GRID))
      gx = Math.min(GRID - 1, Math.max(0, gx))
      gy = Math.min(GRID - 1, Math.max(0, gy))
      const color = maskable && (x < pad || y < pad || x >= size - pad || y >= size - pad)
        ? BG
        : grid[gy][gx]
      const idx = (y * size + x) * 4
      buf[idx] = color[0]
      buf[idx + 1] = color[1]
      buf[idx + 2] = color[2]
      buf[idx + 3] = 255
    }
  }
  return buf
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
]

for (const t of targets) {
  const buf = rasterize(t.size)
  writeFileSync(join(outDir, t.name), encodePNG(t.size, t.size, buf))
  console.log('wrote', t.name)
}

// maskable icon needs extra safe padding
const maskBuf = rasterize(512, { maskable: true })
writeFileSync(join(outDir, 'icon-maskable-512.png'), encodePNG(512, 512, maskBuf))
console.log('wrote icon-maskable-512.png')
