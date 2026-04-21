import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gameApi } from '../api'
import { useGameSocket } from '../hooks/useGameSocket'
import useAuthStore from '../store/authStore'

// ═══════════════════════════════════════════════════════════════════════════
//  SETTINGS  (mirrors settings.py exactly)
// ═══════════════════════════════════════════════════════════════════════════
const W = 1600, H = 900
const HALF_W = W >> 1, HALF_H = H >> 1
const FOV = Math.PI / 3
const HALF_FOV = FOV / 2
const NUM_RAYS = W >> 1          // 800
const HALF_NUM_RAYS = NUM_RAYS >> 1
const DELTA_ANGLE = FOV / NUM_RAYS
const MAX_DEPTH = 20
const SCREEN_DIST = HALF_W / Math.tan(HALF_FOV)
const SCALE = W / NUM_RAYS       // 2 px per ray column
const TEXTURE_SIZE = 256
const HALF_TEXTURE_SIZE = TEXTURE_SIZE >> 1
const PLAYER_SPEED = 0.004
const PLAYER_ROT_SPEED = 0.002
const PLAYER_SIZE_SCALE = 60
const PLAYER_MAX_HEALTH = 100
const MOUSE_SENSITIVITY = 0.0003
const MOUSE_MAX_REL = 40
const FLOOR_COLOR = 'rgb(30,30,30)'
const NPC_GLOBAL_TRIGGER_INTERVAL = 40

// ═══════════════════════════════════════════════════════════════════════════
//  MAP  (mirrors map.py mini_map exactly)
// ═══════════════════════════════════════════════════════════════════════════
const MINI_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,3,3,3,3,0,0,0,2,2,2,0,0,1],
  [1,0,0,0,0,0,4,0,0,0,0,0,2,0,0,1],
  [1,0,0,0,0,0,4,0,0,0,0,0,2,0,0,1],
  [1,0,0,3,3,3,3,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,4,0,0,0,4,0,0,0,0,0,0,1],
  [1,1,1,3,1,3,1,1,1,3,0,0,3,1,1,1],
  [1,1,1,1,1,1,1,1,1,3,0,0,3,1,1,1],
  [1,1,1,1,1,1,1,1,1,3,0,0,3,1,1,1],
  [1,1,3,1,1,1,1,1,1,3,0,0,3,1,1,1],
  [1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,3,4,0,4,3,0,1],
  [1,0,0,5,0,0,0,0,0,0,3,0,3,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,4,0,0,0,0,0,0,4,0,0,4,0,0,0,1],
  [1,1,3,3,0,0,3,3,1,3,3,1,3,1,1,1],
  [1,1,1,3,0,0,3,1,1,1,1,1,1,1,1,1],
  [1,3,3,4,0,0,4,3,3,3,3,3,3,3,3,1],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,5,0,0,0,5,0,0,0,5,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
]
const MAP_ROWS = MINI_MAP.length
const MAP_COLS = MINI_MAP[0].length

const WORLD_MAP = {}
MINI_MAP.forEach((row, y) => row.forEach((v, x) => { if (v) WORLD_MAP[`${x},${y}`] = v }))

// ═══════════════════════════════════════════════════════════════════════════
//  ASSET LOADER
// ═══════════════════════════════════════════════════════════════════════════
function loadImg(src) {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => { console.warn('Failed to load:', src); res(null) }
    img.src = src
  })
}

function toCanvas(img, w = TEXTURE_SIZE, h = TEXTURE_SIZE) {
  if (!img) return null
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d').drawImage(img, 0, 0, w, h)
  return c
}

async function loadAllAssets() {
  const BASE = '/doom'
  const paths = {
    t1:    `${BASE}/textures/1.png`,
    t2:    `${BASE}/textures/2.png`,
    t3:    `${BASE}/textures/3.png`,
    t4:    `${BASE}/textures/4.png`,
    t5:    `${BASE}/textures/5.png`,
    sky:   `${BASE}/textures/sky.png`,
    blood: `${BASE}/textures/blood_screen.png`,
    gameover: `${BASE}/textures/game_over.png`,
    win:   `${BASE}/textures/win.png`,
    sg0: `${BASE}/sprites/weapon/shotgun/0.png`,
    sg1: `${BASE}/sprites/weapon/shotgun/1.png`,
    sg2: `${BASE}/sprites/weapon/shotgun/2.png`,
    sg3: `${BASE}/sprites/weapon/shotgun/3.png`,
    sg4: `${BASE}/sprites/weapon/shotgun/4.png`,
    sg5: `${BASE}/sprites/weapon/shotgun/5.png`,
    // soldier
    solDefault:  `${BASE}/sprites/npc/soldier/0.png`,
    solIdle0:    `${BASE}/sprites/npc/soldier/idle/0.png`,
    solWalk0:    `${BASE}/sprites/npc/soldier/walk/0.png`,
    solWalk1:    `${BASE}/sprites/npc/soldier/walk/1.png`,
    solWalk2:    `${BASE}/sprites/npc/soldier/walk/2.png`,
    solWalk3:    `${BASE}/sprites/npc/soldier/walk/3.png`,
    solAtk0:     `${BASE}/sprites/npc/soldier/attack/0.png`,
    solAtk1:     `${BASE}/sprites/npc/soldier/attack/1.png`,
    solPain0:    `${BASE}/sprites/npc/soldier/pain/0.png`,
    solDth0:     `${BASE}/sprites/npc/soldier/death/POSSM0.png`,
    solDth1:     `${BASE}/sprites/npc/soldier/death/POSSN0.png`,
    solDth2:     `${BASE}/sprites/npc/soldier/death/POSSO0.png`,
    solDth3:     `${BASE}/sprites/npc/soldier/death/POSSP0.png`,
    solDth4:     `${BASE}/sprites/npc/soldier/death/POSSQ0.png`,
    solDth5:     `${BASE}/sprites/npc/soldier/death/POSSR0.png`,
    solDth6:     `${BASE}/sprites/npc/soldier/death/POSSS0.png`,
    solDth7:     `${BASE}/sprites/npc/soldier/death/POSST0.png`,
    solDth8:     `${BASE}/sprites/npc/soldier/death/POSSU0.png`,
    // caco_demon
    cacDefault:  `${BASE}/sprites/npc/caco_demon/0.png`,
    cacIdle0:    `${BASE}/sprites/npc/caco_demon/idle/0.png`,
    cacWalk0:    `${BASE}/sprites/npc/caco_demon/walk/0.png`,
    cacWalk1:    `${BASE}/sprites/npc/caco_demon/walk/1.png`,
    cacWalk2:    `${BASE}/sprites/npc/caco_demon/walk/2.png`,
    cacAtk0:     `${BASE}/sprites/npc/caco_demon/attack/0.png`,
    cacAtk1:     `${BASE}/sprites/npc/caco_demon/attack/1.png`,
    cacAtk2:     `${BASE}/sprites/npc/caco_demon/attack/2.png`,
    cacAtk3:     `${BASE}/sprites/npc/caco_demon/attack/3.png`,
    cacAtk4:     `${BASE}/sprites/npc/caco_demon/attack/4.png`,
    cacPain0:    `${BASE}/sprites/npc/caco_demon/pain/0.png`,
    cacPain1:    `${BASE}/sprites/npc/caco_demon/pain/1.png`,
    cacDth0:     `${BASE}/sprites/npc/caco_demon/death/0.png`,
    cacDth1:     `${BASE}/sprites/npc/caco_demon/death/1.png`,
    cacDth2:     `${BASE}/sprites/npc/caco_demon/death/2.png`,
    cacDth3:     `${BASE}/sprites/npc/caco_demon/death/3.png`,
    cacDth4:     `${BASE}/sprites/npc/caco_demon/death/4.png`,
    cacDth5:     `${BASE}/sprites/npc/caco_demon/death/5.png`,
    // cyber_demon
    cybDefault:  `${BASE}/sprites/npc/cyber_demon/0.png`,
    cybIdle0:    `${BASE}/sprites/npc/cyber_demon/idle/0.png`,
    cybWalk0:    `${BASE}/sprites/npc/cyber_demon/walk/0.png`,
    cybWalk1:    `${BASE}/sprites/npc/cyber_demon/walk/1.png`,
    cybWalk2:    `${BASE}/sprites/npc/cyber_demon/walk/3.png`,
    cybWalk3:    `${BASE}/sprites/npc/cyber_demon/walk/4.png`,
    cybAtk0:     `${BASE}/sprites/npc/cyber_demon/attack/0.png`,
    cybAtk1:     `${BASE}/sprites/npc/cyber_demon/attack/1.png`,
    cybPain0:    `${BASE}/sprites/npc/cyber_demon/pain/0.png`,
    cybPain1:    `${BASE}/sprites/npc/cyber_demon/pain/1.png`,
    cybDth0:     `${BASE}/sprites/npc/cyber_demon/death/0.png`,
    cybDth1:     `${BASE}/sprites/npc/cyber_demon/death/1.png`,
    cybDth2:     `${BASE}/sprites/npc/cyber_demon/death/2.png`,
    cybDth3:     `${BASE}/sprites/npc/cyber_demon/death/3.png`,
    cybDth4:     `${BASE}/sprites/npc/cyber_demon/death/4.png`,
    cybDth5:     `${BASE}/sprites/npc/cyber_demon/death/5.png`,
    cybDth6:     `${BASE}/sprites/npc/cyber_demon/death/6.png`,
    cybDth7:     `${BASE}/sprites/npc/cyber_demon/death/7.png`,
    cybDth8:     `${BASE}/sprites/npc/cyber_demon/death/8.png`,
  }

  const keys = Object.keys(paths)
  const imgs = await Promise.all(keys.map(k => loadImg(paths[k])))
  const m = {}
  keys.forEach((k, i) => { m[k] = imgs[i] })

  return {
    wallTextures: {
      1: toCanvas(m.t1), 2: toCanvas(m.t2), 3: toCanvas(m.t3),
      4: toCanvas(m.t4), 5: toCanvas(m.t5),
    },
    sky:      m.sky,
    blood:    toCanvas(m.blood, W, H),
    gameOver: toCanvas(m.gameover, W, H),
    win:      toCanvas(m.win, W, H),
    shotgun:  [m.sg0, m.sg1, m.sg2, m.sg3, m.sg4, m.sg5],
    npcSprites: {
      soldier: {
        default: m.solDefault,
        idle:    [m.solIdle0],
        walk:    [m.solWalk0, m.solWalk1, m.solWalk2, m.solWalk3],
        attack:  [m.solAtk0, m.solAtk1],
        pain:    [m.solPain0],
        death:   [m.solDefault, m.solDth0, m.solDth1, m.solDth2, m.solDth3, m.solDth4, m.solDth5, m.solDth6, m.solDth7, m.solDth8],
      },
      caco: {
        default: m.cacDefault,
        idle:    [m.cacIdle0],
        walk:    [m.cacWalk0, m.cacWalk1, m.cacWalk2],
        attack:  [m.cacAtk0, m.cacAtk1, m.cacAtk2, m.cacAtk3, m.cacAtk4],
        pain:    [m.cacPain0, m.cacPain1],
        death:   [m.cacDefault, m.cacDth0, m.cacDth1, m.cacDth2, m.cacDth3, m.cacDth4, m.cacDth5],
      },
      cyber: {
        default: m.cybDefault,
        idle:    [m.cybIdle0],
        walk:    [m.cybWalk0, m.cybWalk1, m.cybWalk2, m.cybWalk3],
        attack:  [m.cybAtk0, m.cybAtk1],
        pain:    [m.cybPain0, m.cybPain1],
        death:   [m.cybDefault, m.cybDth0, m.cybDth1, m.cybDth2, m.cybDth3, m.cybDth4, m.cybDth5, m.cybDth6, m.cybDth7, m.cybDth8],
      },
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PATHFINDING  (BFS — port of pathfinding.py)
// ═══════════════════════════════════════════════════════════════════════════
const WAYS = [[-1,0],[0,-1],[1,0],[0,1],[-1,-1],[1,-1],[1,1],[-1,1]]

function buildGraph() {
  const graph = {}
  MINI_MAP.forEach((row, y) => row.forEach((v, x) => {
    if (!v) {
      const key = `${x},${y}`
      graph[key] = WAYS
        .map(([dx, dy]) => [x + dx, y + dy])
        .filter(([nx, ny]) => !WORLD_MAP[`${nx},${ny}`])
        .map(([nx, ny]) => `${nx},${ny}`)
    }
  }))
  return graph
}
const GRAPH = buildGraph()

function bfsNextStep(startKey, goalKey, npcPositions) {
  if (startKey === goalKey) return goalKey
  const queue = [startKey]
  const visited = { [startKey]: null }
  while (queue.length) {
    const cur = queue.shift()
    if (cur === goalKey) break
    const neighbors = GRAPH[cur] || []
    for (const next of neighbors) {
      if (!(next in visited) && !npcPositions.has(next)) {
        visited[next] = cur
        queue.push(next)
      }
    }
  }
  if (!(goalKey in visited)) return startKey
  let step = goalKey
  while (visited[step] && visited[step] !== startKey) step = visited[step]
  return step
}

// ═══════════════════════════════════════════════════════════════════════════
//  NPC
// ═══════════════════════════════════════════════════════════════════════════
function makeNPC(type, x, y) {
  const cfgs = {
    soldier: { health: 100, speed: 0.03,  size: 20, attackDist: 4,   attackDmg: 10, accuracy: 0.15, scale: 0.6, shift: 0.38, spriteKey: 'soldier' },
    caco:    { health: 150, speed: 0.05,  size: 20, attackDist: 1.0, attackDmg: 25, accuracy: 0.35, scale: 0.7, shift: 0.27, spriteKey: 'caco'    },
    cyber:   { health: 350, speed: 0.055, size: 20, attackDist: 6,   attackDmg: 15, accuracy: 0.25, scale: 1.0, shift: 0.04, spriteKey: 'cyber'   },
  }
  return { type, x, y, ...cfgs[type], alive: true, pain: false,
    playerSearchTrigger: false, state: 'idle',
    frameIdx: 0, frameCounter: 0, animTrigger: false,
    screenX: 0, spriteHalfWidth: 0, dist: 0, normDist: 1, raycastValue: false }
}

function spawnNPCs() {
  const types = ['soldier', 'caco', 'cyber'], weights = [70, 20, 10]
  const restricted = new Set()
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) restricted.add(`${i},${j}`)
  const npcs = []; let attempts = 0
  while (npcs.length < 20 && attempts < 2000) {
    attempts++
    const x = Math.floor(Math.random() * MAP_COLS)
    const y = Math.floor(Math.random() * MAP_ROWS)
    const key = `${x},${y}`
    if (WORLD_MAP[key] || restricted.has(key)) continue
    const r = Math.random() * 100
    const type = r < weights[0] ? types[0] : r < weights[0] + weights[1] ? types[1] : types[2]
    npcs.push(makeNPC(type, x + 0.5, y + 0.5))
  }
  return npcs
}

// ═══════════════════════════════════════════════════════════════════════════
//  RAYCASTING  (port of raycasting.py — exact DDA algorithm)
// ═══════════════════════════════════════════════════════════════════════════
function rayCast(px, py, angle) {
  const results = []
  let rayAngle = angle - HALF_FOV + 0.0001
  for (let ray = 0; ray < NUM_RAYS; ray++) {
    const sinA = Math.sin(rayAngle), cosA = Math.cos(rayAngle)
    const xMap = Math.floor(px), yMap = Math.floor(py)
    let textureHor = 1, textureVert = 1

    // Horizontals
    let yHor, dy
    if (sinA > 0) { yHor = yMap + 1; dy = 1 } else { yHor = yMap - 1e-6; dy = -1 }
    let depthHor = (yHor - py) / sinA
    let xHor = px + depthHor * cosA
    const ddH = dy / sinA, dxH = ddH * cosA
    for (let i = 0; i < MAX_DEPTH; i++) {
      if (WORLD_MAP[`${Math.floor(xHor)},${Math.floor(yHor)}`]) { textureHor = WORLD_MAP[`${Math.floor(xHor)},${Math.floor(yHor)}`]; break }
      xHor += dxH; yHor += dy; depthHor += ddH
    }

    // Verticals
    let xVert, dxV
    if (cosA > 0) { xVert = xMap + 1; dxV = 1 } else { xVert = xMap - 1e-6; dxV = -1 }
    let depthVert = (xVert - px) / cosA
    let yVert = py + depthVert * sinA
    const ddV = dxV / cosA, dyV = ddV * sinA
    for (let i = 0; i < MAX_DEPTH; i++) {
      if (WORLD_MAP[`${Math.floor(xVert)},${Math.floor(yVert)}`]) { textureVert = WORLD_MAP[`${Math.floor(xVert)},${Math.floor(yVert)}`]; break }
      xVert += dxV; yVert += dyV; depthVert += ddV
    }

    let depth, texture, offset
    if (depthVert < depthHor) {
      depth = depthVert; texture = textureVert
      offset = cosA > 0 ? yVert % 1 : 1 - yVert % 1
    } else {
      depth = depthHor; texture = textureHor
      offset = sinA > 0 ? 1 - xHor % 1 : xHor % 1
    }

    depth *= Math.cos(angle - rayAngle)
    const projHeight = SCREEN_DIST / (depth + 0.0001)
    results.push({ depth, projHeight, texture, offset })
    rayAngle += DELTA_ANGLE
  }
  return results
}

function renderWalls(ctx, rayResults, wallTextures) {
  for (let ray = 0; ray < rayResults.length; ray++) {
    const { depth, projHeight, texture, offset } = rayResults[ray]
    const texCanvas = wallTextures[texture]
    if (!texCanvas) continue
    const screenX = ray * SCALE
    const texColX = Math.max(0, Math.floor(offset * (TEXTURE_SIZE - SCALE)))

    if (projHeight < H) {
      const wallY = Math.floor(HALF_H - projHeight / 2)
      ctx.drawImage(texCanvas, texColX, 0, SCALE, TEXTURE_SIZE, screenX, wallY, SCALE, projHeight)
    } else {
      const texH = TEXTURE_SIZE * H / projHeight
      const texY = Math.max(0, Math.floor(HALF_TEXTURE_SIZE - texH / 2))
      ctx.drawImage(texCanvas, texColX, texY, SCALE, Math.min(texH, TEXTURE_SIZE - texY), screenX, 0, SCALE, H)
    }

    // Distance shading
    const shade = Math.min(0.82, depth / MAX_DEPTH)
    ctx.fillStyle = `rgba(0,0,0,${shade.toFixed(3)})`
    const wallY2 = projHeight < H ? Math.floor(HALF_H - projHeight / 2) : 0
    const wallH2 = projHeight < H ? projHeight : H
    ctx.fillRect(screenX, wallY2, SCALE, wallH2)
  }
}

function buildZBuffer(rayResults) {
  const zBuffer = new Float32Array(W)
  for (let ray = 0; ray < rayResults.length; ray++) {
    const x = ray * SCALE
    for (let s = 0; s < SCALE; s++) {
      if (x + s < W) zBuffer[x + s] = rayResults[ray].depth
    }
  }
  return zBuffer
}

// ═══════════════════════════════════════════════════════════════════════════
//  NPC LINE-OF-SIGHT  (port of npc.py ray_cast_player_npc)
// ═══════════════════════════════════════════════════════════════════════════
function losCheck(px, py, npcX, npcY) {
  const dx = npcX - px, dy = npcY - py
  const dist = Math.hypot(dx, dy)
  if (dist > MAX_DEPTH) return false
  const step = 0.1, cosA = dx / dist, sinA = dy / dist
  let rx = px, ry = py
  const steps = Math.floor(dist / step)
  for (let i = 0; i < steps; i++) {
    rx += cosA * step; ry += sinA * step
    if (WORLD_MAP[`${Math.floor(rx)},${Math.floor(ry)}`]) return false
  }
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
//  SPRITE PROJECTION  (port of sprite_object.py)
// ═══════════════════════════════════════════════════════════════════════════
function getSpriteProjection(px, py, pAngle, spX, spY) {
  const dx = spX - px, dy = spY - py
  let delta = Math.atan2(dy, dx) - pAngle
  if ((dx > 0 && pAngle > Math.PI) || (dx < 0 && dy < 0)) delta += Math.PI * 2
  const deltaRays = delta / DELTA_ANGLE
  const screenX = (HALF_NUM_RAYS + deltaRays) * SCALE
  const dist = Math.hypot(dx, dy)
  const normDist = dist * Math.cos(delta)
  return { screenX, dist, normDist }
}

function getNPCImage(npc, npcSprites) {
  const sp = npcSprites[npc.spriteKey]
  if (!sp) return null
  let frames
  if (!npc.alive)              frames = sp.death
  else if (npc.pain)           frames = sp.pain
  else if (npc.state === 'attack') frames = sp.attack
  else if (npc.state === 'walk')   frames = sp.walk
  else                         frames = sp.idle
  if (!frames || !frames.length) return sp.default
  return frames[npc.frameIdx % frames.length] || sp.default
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function GameRoom() {
  const { code }  = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const canvasRef = useRef(null)
  const gsRef     = useRef(null)
  const animRef   = useRef(null)
  const assetsRef = useRef(null)

  const [session,       setSession]       = useState(null)
  const [players,       setPlayers]       = useState([])
  const [remotePlayers, setRemotePlayers] = useState({})
  const [gamePhase,     setGamePhase]     = useState('waiting')
  const [score,         setScore]         = useState(0)
  const [kills,         setKills]         = useState(0)
  const [health,        setHealth]        = useState(100)
  const [deaths,        setDeaths]        = useState(0)
  const [elapsed,       setElapsed]       = useState(0)
  const [events,        setEvents]        = useState([])
  const [wsStatus,      setWsStatus]      = useState('connecting')
  const [error,         setError]         = useState('')
  const [assetsLoaded,  setAssetsLoaded]  = useState(false)
  const [gameStartTime, setGameStartTime] = useState(null)

  const gamePhaseRef    = useRef('waiting')
  const remotePlayersRef = useRef({})
  useEffect(() => { gamePhaseRef.current = gamePhase }, [gamePhase])
  useEffect(() => { remotePlayersRef.current = remotePlayers }, [remotePlayers])

  const addEvent = useCallback((msg) => {
    setEvents(ev => [{ msg, id: Date.now() + Math.random() }, ...ev].slice(0, 6))
  }, [])

  // ── WebSocket ─────────────────────────────────────────────────────────
  const handleWsMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'PLAYER_JOINED':
        setPlayers(msg.payload?.players || [])
        addEvent(`⚡ ${msg.username} joined`)
        break
      case 'PLAYER_LEFT':
        setPlayers(msg.payload?.players || [])
        addEvent(`💨 ${msg.username} left`)
        break
      case 'STATE_UPDATE': {
        const states = {}
        ;(msg.payload?.players || []).forEach(p => {
          if (p.username !== user?.username) states[p.username] = p
        })
        setRemotePlayers(states)
        break
      }
      case 'GAME_START':
        setGamePhase('playing')
        gamePhaseRef.current = 'playing'
        setGameStartTime(Date.now())
        addEvent('🎮 GAME STARTED!')
        break
      case 'GAME_END':
        setGamePhase('ended')
        addEvent('🏁 GAME OVER!')
        break
      case 'GAME_EVENT': {
        const ev = msg.payload
        if (ev?.type === 'KILL' && ev.victim === user?.username) {
          setDeaths(d => d + 1)
          addEvent(`💀 Killed by ${msg.username}`)
          if (gsRef.current) { gsRef.current.health = PLAYER_MAX_HEALTH; setHealth(PLAYER_MAX_HEALTH) }
        }
        break
      }
    }
  }, [user, addEvent])

  const { send, sendPlayerState, sendGameEvent, status: socketStatus } =
    useGameSocket(code, handleWsMessage)
  useEffect(() => setWsStatus(socketStatus), [socketStatus])

  // ── Session ──────────────────────────────────────────────────────────
  useEffect(() => {
    gameApi.getSession(code)
      .then(r => {
        setSession(r.data)
        if (r.data.status === 'IN_PROGRESS') {
          setGamePhase('playing')
          gamePhaseRef.current = 'playing'
          setGameStartTime(Date.now())
        }
      })
      .catch(() => setError('Session not found'))
  }, [code])

  useEffect(() => {
    if (gamePhase !== 'playing') return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [gamePhase])

  // ── Load assets ──────────────────────────────────────────────────────
  useEffect(() => {
    loadAllAssets().then(assets => {
      assetsRef.current = assets
      setAssetsLoaded(true)
    })
  }, [])

  // ── Main game loop ───────────────────────────────────────────────────
  useEffect(() => {
    if (!assetsLoaded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const assets = assetsRef.current

    // ── Init state ──
    const gs = {
      x: 1.5, y: 5.0, angle: 0,
      health: PLAYER_MAX_HEALTH, score: 0, kills: 0,
      shot: false,
      weaponFrame: 0, weaponReloading: false, weaponFrameCounter: 0,
      skyOffset: 0, shotsFirerd: 0,
      gameState: 'title',
      npcs: spawnNPCs(),
      keys: {}, mouseRelAccum: 0,
      lastTime: performance.now(), stateThrottle: 0,
      globalTrigger: false, globalTimerPrev: 0,
      healthRecoveryPrev: 0,
      damageFlash: 0,
      overlayType: null,
      blinkPhase: 0,
      hudVisible: true,
      _fps: 0, _fpsAccum: 0, _fpsCount: 0, _fpsPrev: performance.now(),
    }
    gsRef.current = gs

    // ── Keyboard ──
    const onKeyDown = (e) => {
      gs.keys[e.code] = true
      if (e.code === 'Tab') { e.preventDefault(); gs.hudVisible = !gs.hudVisible; return }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if      (gs.gameState === 'play')   gs.gameState = 'paused'
        else if (gs.gameState === 'paused') gs.gameState = 'play'
      } else if (gs.gameState === 'title') {
        gs.gameState = 'play'
      }
    }
    const onKeyUp = (e) => { gs.keys[e.code] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    const onMouseMove = (e) => { gs.mouseRelAccum += e.movementX }
    const onMouseDown = (e) => {
      if (gs.gameState === 'title') { gs.gameState = 'play'; return }
      if (e.button === 0 && gs.gameState === 'play' && !gs.weaponReloading) {
        gs.shot = true; gs.weaponReloading = true
        gs.weaponFrame = 0; gs.weaponFrameCounter = 0; gs.shotsFirerd++
        handleShoot()
      }
    }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('click', () => canvas.requestPointerLock?.())

    // ── Shoot ──
    function handleShoot() {
      gs.npcs.forEach(npc => {
        if (!npc.alive) return
        const { screenX, normDist } = getSpriteProjection(gs.x, gs.y, gs.angle, npc.x, npc.y)
        if (normDist > MAX_DEPTH || normDist < 0.5) return
        const proj = SCREEN_DIST / normDist * npc.scale
        const halfW = proj * 0.5 * 0.5
        if (Math.abs(screenX - HALF_W) < halfW + 80) {
          npc.pain = true; npc.health -= 50; npc.frameIdx = 0
          if (npc.health <= 0) {
            npc.alive = false; npc.state = 'death'; npc.frameIdx = 0; npc.frameCounter = 0
            const newKills = gs.kills + 1, newScore = gs.score + 100
            gs.kills = newKills; gs.score = newScore
            setKills(newKills); setScore(newScore)
            addEvent(`☠ Demon down! +100pts`)
            sendGameEvent({ type: 'KILL', victim: null, score: newScore })
          }
        }
      })
      send({ type: 'SHOOT', payload: { x: gs.x, y: gs.y, angle: gs.angle } })
    }

    // ── Update player ──
    function updatePlayer(dt) {
      if (gs.gameState !== 'play') return
      const sinA = Math.sin(gs.angle), cosA = Math.cos(gs.angle)
      let dx = 0, dy = 0, nk = 0
      const spd = PLAYER_SPEED * dt
      if (gs.keys['KeyW'] || gs.keys['ArrowUp'])   { dx += cosA * spd; dy += sinA * spd; nk++ }
      if (gs.keys['KeyS'] || gs.keys['ArrowDown']) { dx -= cosA * spd; dy -= sinA * spd; nk++ }
      if (gs.keys['KeyA'])                          { dx += sinA * spd; dy -= cosA * spd; nk++ }
      if (gs.keys['KeyD'])                          { dx -= sinA * spd; dy += cosA * spd; nk++ }
      if (nk > 1) { const c = 1 / Math.SQRT2; dx *= c; dy *= c }
      const sc = PLAYER_SIZE_SCALE / dt
      if (!WORLD_MAP[`${Math.floor(gs.x + dx * sc)},${Math.floor(gs.y)}`]) gs.x += dx
      if (!WORLD_MAP[`${Math.floor(gs.x)},${Math.floor(gs.y + dy * sc)}`]) gs.y += dy
      if (gs.keys['ArrowLeft'])  gs.angle -= PLAYER_ROT_SPEED * dt
      if (gs.keys['ArrowRight']) gs.angle += PLAYER_ROT_SPEED * dt
      let rel = Math.max(-MOUSE_MAX_REL, Math.min(MOUSE_MAX_REL, gs.mouseRelAccum))
      gs.mouseRelAccum = 0
      gs.angle += rel * MOUSE_SENSITIVITY * dt
      gs.angle = ((gs.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      gs.skyOffset = (gs.skyOffset + 4.5 * rel * 0.01) % W

      if (gs.weaponReloading && gs.globalTrigger) {
        gs.weaponFrameCounter++
        gs.weaponFrame = gs.weaponFrameCounter % assets.shotgun.length
        gs.shot = false
        if (gs.weaponFrameCounter >= assets.shotgun.length) {
          gs.weaponReloading = false; gs.weaponFrameCounter = 0; gs.weaponFrame = 0
        }
      }

      const now = performance.now()
      if (now - gs.healthRecoveryPrev > 700 && gs.health < PLAYER_MAX_HEALTH) {
        gs.health = Math.min(PLAYER_MAX_HEALTH, gs.health + 1)
        gs.healthRecoveryPrev = now; setHealth(gs.health)
      }
      if (gs.damageFlash > 0) gs.damageFlash = Math.max(0, gs.damageFlash - dt * 0.003)
    }

    // ── Update NPCs ──
    function updateNPCs() {
      if (gs.gameState !== 'play') return
      const npcPositions = new Set(gs.npcs.filter(n => n.alive).map(n => `${Math.floor(n.x)},${Math.floor(n.y)}`))
      const playerKey = `${Math.floor(gs.x)},${Math.floor(gs.y)}`

      gs.npcs.forEach(npc => {
        if (gs.globalTrigger) npc.animTrigger = true

        if (!npc.alive) {
          if (npc.animTrigger) {
            const maxF = (assets.npcSprites[npc.spriteKey]?.death?.length || 5) - 1
            if (npc.frameCounter < maxF) { npc.frameCounter++; npc.frameIdx = npc.frameCounter }
          }
          npc.animTrigger = false; return
        }

        npc.raycastValue = losCheck(gs.x, gs.y, npc.x, npc.y)
        const npcKey = `${Math.floor(npc.x)},${Math.floor(npc.y)}`
        const dist = Math.hypot(npc.x - gs.x, npc.y - gs.y)

        if (npc.pain) {
          npc.state = 'pain'
          if (npc.animTrigger) {
            npc.frameIdx = (npc.frameIdx + 1) % (assets.npcSprites[npc.spriteKey]?.pain?.length || 1)
            if (npc.frameIdx === 0) npc.pain = false
          }
          npc.animTrigger = false; return
        }

        if (npc.raycastValue) npc.playerSearchTrigger = true

        if (npc.raycastValue && dist < npc.attackDist) {
          npc.state = 'attack'
          if (npc.animTrigger) {
            npc.frameIdx = (npc.frameIdx + 1) % (assets.npcSprites[npc.spriteKey]?.attack?.length || 2)
            if (Math.random() < npc.accuracy) {
              gs.health = Math.max(0, gs.health - npc.attackDmg)
              gs.damageFlash = 1.0; setHealth(gs.health)
              if (gs.health <= 0) {
                setDeaths(d => d + 1); addEvent('💀 You died! Respawning…')
                gs.health = PLAYER_MAX_HEALTH; gs.x = 1.5; gs.y = 5.0; setHealth(gs.health)
              }
            }
          }
        } else if (npc.playerSearchTrigger) {
          npc.state = 'walk'
          if (npc.animTrigger) npc.frameIdx = (npc.frameIdx + 1) % (assets.npcSprites[npc.spriteKey]?.walk?.length || 4)
          const nextKey = bfsNextStep(npcKey, playerKey, npcPositions)
          const [nx, ny] = nextKey.split(',').map(Number)
          const a = Math.atan2(ny + 0.5 - npc.y, nx + 0.5 - npc.x)
          const ndx = Math.cos(a) * npc.speed, ndy = Math.sin(a) * npc.speed
          if (!WORLD_MAP[`${Math.floor(npc.x + ndx * npc.size)},${Math.floor(npc.y)}`]) npc.x += ndx
          if (!WORLD_MAP[`${Math.floor(npc.x)},${Math.floor(npc.y + ndy * npc.size)}`]) npc.y += ndy
        } else {
          npc.state = 'idle'
          if (npc.animTrigger) npc.frameIdx = (npc.frameIdx + 1) % (assets.npcSprites[npc.spriteKey]?.idle?.length || 1)
        }

        npc.animTrigger = false
      })
    }

    // ── Draw background ──
    function drawBackground() {
      if (assets.sky) {
        const offset = gs.skyOffset % W
        ctx.drawImage(assets.sky, -offset, 0, W, HALF_H)
        ctx.drawImage(assets.sky, -offset + W, 0, W, HALF_H)
      } else {
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, W, HALF_H)
      }
      ctx.fillStyle = FLOOR_COLOR; ctx.fillRect(0, HALF_H, W, HALF_H)
    }

    // ── Draw sprites ──
    function drawSprites(zBuffer) {
      const list = []
      const rp = remotePlayersRef.current

      gs.npcs.forEach(npc => {
        const { screenX, dist, normDist } = getSpriteProjection(gs.x, gs.y, gs.angle, npc.x, npc.y)
        npc.screenX = screenX; npc.dist = dist; npc.normDist = normDist
        if (normDist > 0.5 && screenX > -300 && screenX < W + 300) {
          list.push({ npc, screenX, normDist })
        }
      })

      Object.values(rp).forEach(p => {
        const { screenX, normDist } = getSpriteProjection(gs.x, gs.y, gs.angle, p.x, p.y)
        list.push({ remote: true, color: '#00ccff', screenX, normDist })
      })

      list.sort((a, b) => b.normDist - a.normDist)

      list.forEach(sp => {
        const { normDist, screenX } = sp
        if (normDist <= 0.5) return
        const proj = SCREEN_DIST / normDist

        if (sp.remote) {
          const sprH = proj, sprW = proj * 0.4
          const dx = Math.floor(screenX - sprW / 2), dy = Math.floor(HALF_H - sprH / 2)
          ctx.fillStyle = sp.color
          for (let sx = Math.max(0, dx); sx < Math.min(W, dx + sprW); sx++) {
            if (zBuffer[sx] && zBuffer[sx] < normDist) continue
            ctx.fillRect(sx, dy, 1, sprH)
          }
          return
        }

        const { npc } = sp
        const img = getNPCImage(npc, assets.npcSprites)
        if (!img) return
        const iw = img.naturalWidth || img.width || 64
        const ih = img.naturalHeight || img.height || 64
        const sprH = proj * npc.scale
        const sprW = sprH * (iw / ih)
        npc.spriteHalfWidth = sprW / 2
        const drawX = screenX - sprW / 2
        const drawY = HALF_H - sprH / 2 + sprH * npc.shift

        const startCol = Math.max(0, Math.floor(drawX))
        const endCol   = Math.min(W - 1, Math.ceil(drawX + sprW))
        for (let sx = startCol; sx <= endCol; sx++) {
          if (zBuffer[sx] && zBuffer[sx] < normDist) continue
          const texX = ((sx - drawX) / sprW) * iw
          ctx.drawImage(img, Math.floor(texX), 0, 1, ih, sx, drawY, 1, sprH)
        }
      })
    }

    // ── Draw weapon ──
    function drawWeapon() {
      const img = assets.shotgun[gs.weaponFrame]
      if (!img) return
      const scale = 0.4
      const iw = (img.naturalWidth  || img.width  || 100) * scale
      const ih = (img.naturalHeight || img.height || 100) * scale
      ctx.drawImage(img, HALF_W - iw / 2, H - ih, iw, ih)
    }

    // ── Draw HUD ──
    function drawHUD() {
      if (!gs.hudVisible) {
        ctx.fillStyle = 'rgba(100,100,100,0.5)'; ctx.font = '14px Consolas,monospace'
        ctx.fillText('[TAB] show HUD', 10, 22); return
      }

      // Health bar
      const hp = Math.max(0, gs.health), pct = hp / PLAYER_MAX_HEALTH
      const bx = 16, by = H - 32, bw = 200, bh = 18
      ctx.fillStyle = 'rgba(20,20,20,0.7)'; ctx.fillRect(bx, by, bw, bh)
      ctx.fillStyle = pct > 0.5 ? '#50dc50' : pct > 0.25 ? '#dccc32' : '#dc3c3c'
      ctx.fillRect(bx, by, Math.max(0, bw * pct), bh)
      ctx.strokeStyle = '#505050'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh)
      ctx.fillStyle = '#fff'; ctx.font = '12px Consolas,monospace'
      ctx.fillText(`HP  ${hp}/${PLAYER_MAX_HEALTH}`, bx + 4, by + 13)
      ctx.fillStyle = gs.weaponReloading ? '#dccc32' : '#50dc50'
      ctx.fillText(gs.weaponReloading ? 'RELOADING' : 'READY', bx + bw + 10, by + 13)

      // Crosshair
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(HALF_W-12, HALF_H); ctx.lineTo(HALF_W-4, HALF_H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(HALF_W+4, HALF_H);  ctx.lineTo(HALF_W+12,HALF_H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(HALF_W, HALF_H-12); ctx.lineTo(HALF_W, HALF_H-4); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(HALF_W, HALF_H+4);  ctx.lineTo(HALF_W, HALF_H+12); ctx.stroke()
      ctx.beginPath(); ctx.arc(HALF_W, HALF_H, 2, 0, Math.PI*2); ctx.stroke()
      ctx.lineWidth = 1

      // Score
      ctx.fillStyle = '#ff6600'; ctx.font = 'bold 14px Consolas,monospace'
      ctx.fillText(`Score: ${gs.score}  Kills: ${gs.kills}`, W - 240, H - 18)

      // Debug panel
      const alive = gs.npcs.filter(n => n.alive).length
      const fps = gs._fps
      const pDeg = (gs.angle * 180 / Math.PI % 360).toFixed(1)
      const rows = [
        ['── ENGINE ──', null, '#787878'],
        ['FPS',    fps.toFixed(1), fps>=55?'#50dc50':fps>=30?'#dccc32':'#dc3c3c'],
        ['Rays',   NUM_RAYS,       '#50c8dc'],
        ['FOV',    `${(FOV*180/Math.PI).toFixed(0)}°`, '#50c8dc'],
        ['── PLAYER ──', null, '#787878'],
        ['Pos',    `(${gs.x.toFixed(2)}, ${gs.y.toFixed(2)})`, '#e0e0e0'],
        ['Angle',  `${pDeg}°`, '#e0e0e0'],
        ['Health', `${hp}/${PLAYER_MAX_HEALTH}`, pct>0.5?'#50dc50':pct>0.25?'#dccc32':'#dc3c3c'],
        ['Kills',  gs.kills, gs.kills?'#dc3c3c':'#e0e0e0'],
        ['── NPCs ──', null, '#787878'],
        ['Alive',  `${alive}/${gs.npcs.length}`, alive?'#dc3c3c':'#50dc50'],
        ['',       '',  null],
        ['TAB — hide HUD', '', '#787878'],
      ]
      const PW = 250, LH = 17, LPAD = 10
      const PH = rows.length * LH + 18
      ctx.fillStyle = 'rgba(10,10,10,0.65)'; ctx.fillRect(8, 8, PW, PH)
      ctx.strokeStyle = 'rgba(80,80,80,0.8)'; ctx.strokeRect(8, 8, PW, PH)
      let ry = 8 + 14; ctx.font = '12px Consolas,monospace'
      rows.forEach(([lbl, val, col]) => {
        if (val === null) {
          ctx.fillStyle = col || '#787878'; ctx.fillText(lbl, 8 + LPAD, ry)
        } else if (val !== '') {
          ctx.fillStyle = '#a0a0a0'; ctx.fillText(lbl + ':', 8 + LPAD, ry)
          ctx.fillStyle = col || '#e0e0e0'
          ctx.fillText(String(val), 8 + PW - LPAD - ctx.measureText(String(val)).width, ry)
        }
        ry += LH
      })

      // Minimap
      const T = 8, MP = 10
      const mmW = MAP_COLS * T, mmH = MAP_ROWS * T
      const mox = W - mmW - MP, moy = H - mmH - MP
      ctx.fillStyle = 'rgba(10,10,10,0.6)'; ctx.fillRect(mox, moy, mmW, mmH)
      MINI_MAP.forEach((row, my) => row.forEach((v, mx) => {
        if (v) {
          const shade = Math.min(255, 80 + v * 30)
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`
          ctx.fillRect(mox + mx * T, moy + my * T, T-1, T-1)
        }
      }))
      gs.npcs.forEach(npc => {
        ctx.fillStyle = npc.alive ? '#dc3c3c' : '#503030'
        ctx.fillRect(mox + npc.x * T - 2, moy + npc.y * T - 2, 4, 4)
      })
      ctx.fillStyle = '#50dc50'
      ctx.fillRect(mox + gs.x * T - 3, moy + gs.y * T - 3, 6, 6)
      ctx.strokeStyle = '#505050'; ctx.strokeRect(mox, moy, mmW, mmH)
    }

    // ── Title screen ──
    function drawTitleScreen() {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = 'rgb(100,20,20)'; ctx.fillRect(0, HALF_H-140, W, 3); ctx.fillRect(0, HALF_H+110, W, 3)
      let cy = HALF_H - 120
      ctx.textAlign = 'center'
      ctx.font = 'bold 80px Consolas,monospace'; ctx.fillStyle = '#dc3c3c'
      ctx.fillText('DOOM-STYLE 3D', HALF_W, cy + 72); cy += 88
      ctx.font = 'bold 56px Consolas,monospace'; ctx.fillStyle = '#c8c8c8'
      ctx.fillText('RAYCASTER', HALF_W, cy + 50); cy += 80
      const controls = [['WASD','Move'],['Mouse','Look / aim'],['LMB','Shoot'],['P / ESC','Pause'],['TAB','Toggle HUD']]
      ctx.font = '20px Consolas,monospace'
      controls.forEach(([k, d]) => {
        ctx.fillStyle = '#ffa028'; ctx.textAlign = 'right'; ctx.fillText(k, HALF_W, cy)
        ctx.fillStyle = '#e0e0e0'; ctx.textAlign = 'left';  ctx.fillText(d, HALF_W + 24, cy); cy += 28
      })
      cy += 20
      if (gs.blinkPhase % 1.2 < 0.75) {
        ctx.font = 'bold 30px Consolas,monospace'; ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'; ctx.fillText('PRESS ANY KEY TO PLAY', HALF_W, cy + 22)
      }
      ctx.font = '14px Consolas,monospace'; ctx.fillStyle = 'rgba(80,80,80,0.8)'
      ctx.textAlign = 'center'
      ctx.fillText('Naresh Kumar  ·  Nityam Choudhary  ·  Aryan Mishra', HALF_W, H - 14)
      ctx.textAlign = 'left'
    }

    // ── Pause screen ──
    function drawPauseScreen() {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H)
      const cw = 480, ch = 380, cx = HALF_W - cw/2, cyt = HALF_H - ch/2
      ctx.fillStyle = 'rgba(12,12,12,0.86)'; ctx.fillRect(cx, cyt, cw, ch)
      ctx.strokeStyle = 'rgb(120,40,40)'; ctx.lineWidth = 2; ctx.strokeRect(cx, cyt, cw, ch); ctx.lineWidth = 1
      ctx.font = 'bold 56px Consolas,monospace'; ctx.fillStyle = '#dccc32'; ctx.textAlign = 'center'
      ctx.fillText('PAUSED', HALF_W, cyt + 70)
      ctx.strokeStyle = '#505050'; ctx.beginPath(); ctx.moveTo(cx+20, cyt+82); ctx.lineTo(cx+cw-20, cyt+82); ctx.stroke()
      const alive = gs.npcs.filter(n => n.alive).length
      const stats = [
        ['Health', `${Math.max(0,gs.health)}/${PLAYER_MAX_HEALTH}`],
        ['Kills', gs.kills], ['Shots fired', gs.shotsFirerd],
        ['NPCs alive', `${alive}/${gs.npcs.length}`],
        ['Position', `(${gs.x.toFixed(1)}, ${gs.y.toFixed(1)})`],
      ]
      let sy = cyt + 100; ctx.font = '16px Consolas,monospace'
      stats.forEach(([l, v]) => {
        ctx.fillStyle = '#a0a0a0'; ctx.textAlign = 'left';  ctx.fillText(l+':', cx+60, sy)
        ctx.fillStyle = '#e0e0e0'; ctx.textAlign = 'right'; ctx.fillText(String(v), cx+cw-60, sy); sy += 26
      })
      sy += 10
      ctx.strokeStyle = '#3c3c3c'; ctx.beginPath(); ctx.moveTo(cx+20, sy); ctx.lineTo(cx+cw-20, sy); ctx.stroke(); sy += 16
      const hints = [['ESC or P','Resume game'],['TAB','Toggle HUD']]
      ctx.font = '15px Consolas,monospace'
      hints.forEach(([k, d]) => {
        ctx.fillStyle = '#ffa028'; ctx.textAlign = 'left';  ctx.fillText(k+':', cx+60, sy)
        ctx.fillStyle = '#e0e0e0'; ctx.textAlign = 'right'; ctx.fillText(d, cx+cw-60, sy); sy += 24
      })
      if (gs.blinkPhase % 1.2 < 0.75) {
        ctx.font = 'bold 24px Consolas,monospace'; ctx.fillStyle = '#50dc50'; ctx.textAlign = 'center'
        ctx.fillText('ESC  –  RESUME', HALF_W, cyt + ch - 20)
      }
      ctx.textAlign = 'left'
    }

    // ── Reset game ──
    function resetGame() {
      gs.npcs = spawnNPCs()
      gs.x = 1.5; gs.y = 5.0; gs.angle = 0
      gs.health = PLAYER_MAX_HEALTH; setHealth(PLAYER_MAX_HEALTH)
      gs.score = 0; gs.kills = 0; setScore(0); setKills(0)
      gs.overlayType = null
    }

    // ── Main loop ──
    const loop = (now) => {
      const dt = Math.min(now - gs.lastTime, 50)
      gs.lastTime = now

      // FPS
      gs._fpsAccum += dt; gs._fpsCount++
      if (now - gs._fpsPrev >= 500) {
        gs._fps = gs._fpsCount / (gs._fpsAccum / 1000)
        gs._fpsAccum = 0; gs._fpsCount = 0; gs._fpsPrev = now
      }

      // Global trigger
      gs.globalTrigger = false
      if (now - gs.globalTimerPrev >= NPC_GLOBAL_TRIGGER_INTERVAL) {
        gs.globalTrigger = true; gs.globalTimerPrev = now
      }
      gs.blinkPhase += dt / 1000

      // Game logic
      if (gs.gameState === 'play' && gamePhaseRef.current === 'playing') {
        updatePlayer(dt)
        updateNPCs()
        // Win check
        if (!gs.overlayType && gs.npcs.filter(n => n.alive).length === 0) {
          gs.overlayType = 'win'
          setTimeout(() => resetGame(), 2500)
        }
      } else if (gs.gameState === 'play' && gamePhaseRef.current !== 'playing') {
        // allow title/pause screens but no logic
      }

      // ── Render ──
      drawBackground()
      const rayResults = rayCast(gs.x, gs.y, gs.angle)
      renderWalls(ctx, rayResults, assets.wallTextures)
      const zBuffer = buildZBuffer(rayResults)
      drawSprites(zBuffer)

      // Damage flash
      if (gs.damageFlash > 0) {
        ctx.globalAlpha = Math.min(0.55, gs.damageFlash)
        if (assets.blood) ctx.drawImage(assets.blood, 0, 0, W, H)
        else { ctx.fillStyle = `rgba(200,0,0,${(gs.damageFlash*0.55).toFixed(3)})`; ctx.fillRect(0,0,W,H) }
        ctx.globalAlpha = 1
      }

      // Overlays
      if (gs.overlayType === 'win' && assets.win) {
        ctx.drawImage(assets.win, 0, 0, W, H)
      } else if (gs.overlayType === 'gameover' && assets.gameOver) {
        ctx.drawImage(assets.gameOver, 0, 0, W, H)
      } else if (gs.gameState === 'title') {
        drawTitleScreen()
      } else if (gs.gameState === 'paused') {
        drawPauseScreen()
      } else if (gs.gameState === 'play') {
        drawWeapon()
        drawHUD()
      }

      // WS state broadcast
      if (gs.gameState === 'play') {
        gs.stateThrottle += dt
        if (gs.stateThrottle >= 50) {
          gs.stateThrottle = 0
          sendPlayerState({ x: gs.x, y: gs.y, angle: gs.angle, health: gs.health, score: gs.score, kills: gs.kills, shooting: gs.weaponReloading, timestamp: Date.now() })
        }
      }

      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
    }
  }, [assetsLoaded, sendPlayerState, sendGameEvent, send, addEvent])

  // ── Session controls ─────────────────────────────────────────────────
  const startGame = async () => {
    try { await gameApi.startSession(code) }
    catch (e) { setError(e.response?.data?.message || 'Failed to start game') }
  }

  const endGame = async () => {
    const gs = gsRef.current
    const dur = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : elapsed
    try {
      await gameApi.submitResult({
        sessionCode: code,
        score: gs?.score ?? 0, kills: gs?.kills ?? 0, deaths,
        winner: false, durationSeconds: dur,
      })
    } catch (_) {}
    navigate('/dashboard')
  }

  const isCreator = session?.creatorUsername === user?.username
  const wsColor = { open: 'text-green-400', connecting: 'text-yellow-400', closed: 'text-red-400', error: 'text-red-400' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-doom-red glow-red">🎮 {session?.name || code}</h1>
          <p className="text-gray-500 text-xs">
            Room: <span className="text-doom-orange font-bold">{code}</span>
            &nbsp;·&nbsp;<span className={wsColor[wsStatus]}>● WS {wsStatus}</span>
            &nbsp;·&nbsp;⏱ {Math.floor(elapsed/60).toString().padStart(2,'0')}:{(elapsed%60).toString().padStart(2,'0')}
          </p>
        </div>
        <div className="flex gap-2">
          {isCreator && gamePhase === 'waiting' && (
            <button onClick={startGame} className="doom-btn">▶ Start Game</button>
          )}
          {gamePhase === 'playing' && (
            <button onClick={endGame} className="doom-btn-outline">⏹ End &amp; Save</button>
          )}
          {gamePhase === 'ended' && (
            <button onClick={endGame} className="doom-btn">Return to Lobby</button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm px-4 py-2 rounded">{error}</div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <canvas
              ref={canvasRef} width={W} height={H}
              className="rounded border border-doom-border w-full block"
              style={{ maxWidth: W, aspectRatio: `${W}/${H}` }}
            />

            {!assetsLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 rounded">
                <p className="text-doom-red text-xl font-bold glow-red animate-pulse mb-2">LOADING ASSETS…</p>
                <p className="text-gray-500 text-xs">Loading textures and sprites</p>
              </div>
            )}

            {assetsLoaded && gamePhase === 'waiting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded">
                <p className="text-doom-red text-2xl font-bold glow-red mb-4">WAITING FOR PLAYERS</p>
                <p className="text-gray-400 text-sm mb-2">{players.length} / {session?.maxPlayers || '?'} players connected</p>
                <p className="text-gray-600 text-xs">{isCreator ? 'Click "Start Game" when ready' : 'Waiting for host to start…'}</p>
                <p className="text-gray-600 text-xs mt-4">Click canvas · WASD · Mouse to look · LMB to shoot</p>
              </div>
            )}

            {gamePhase === 'ended' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded">
                <p className="text-doom-red text-3xl font-bold glow-red mb-4">GAME OVER</p>
                <p className="text-doom-orange text-xl">Final Score: {score}</p>
                <p className="text-gray-300 mt-2">Kills: {kills} · Deaths: {deaths}</p>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-xs mt-2 text-center">
            Click canvas to lock mouse · ESC / P = pause · WASD = move · Mouse = look · LMB = shoot · TAB = toggle HUD
          </p>
        </div>

        <div className="w-48 space-y-3 flex-shrink-0">
          <div className="doom-panel text-xs space-y-2">
            <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">Stats</p>
            <div className="flex justify-between">
              <span className="text-gray-400">Health</span>
              <span className={health > 60 ? 'text-green-400' : health > 30 ? 'text-yellow-400' : 'text-red-400'}>{health}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Score</span>
              <span className="text-doom-orange">{score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Kills</span>
              <span className="text-red-400">{kills}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Deaths</span>
              <span className="text-gray-300">{deaths}</span>
            </div>
          </div>

          <div className="doom-panel text-xs">
            <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">Players</p>
            {players.map(p => (
              <div key={p} className="flex items-center gap-2 py-1">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                <span className={p === user?.username ? 'text-doom-orange font-bold' : 'text-gray-300'}>{p}</span>
              </div>
            ))}
            {players.length === 0 && <p className="text-gray-600">Connecting...</p>}
          </div>

          <div className="doom-panel text-xs">
            <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">Events</p>
            <div className="space-y-1">
              {events.map(e => (
                <p key={e.id} className="text-gray-400 text-xs leading-relaxed">{e.msg}</p>
              ))}
              {events.length === 0 && <p className="text-gray-700">No events yet</p>}
            </div>
          </div>

          <div className="doom-panel text-xs">
            <p className="text-gray-500 uppercase tracking-widest text-xs mb-2">Controls</p>
            <div className="space-y-1 text-gray-500">
              <p>WASD — Move</p>
              <p>Mouse — Look</p>
              <p>LMB — Shoot</p>
              <p>P / ESC — Pause</p>
              <p>TAB — Toggle HUD</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
