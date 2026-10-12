// The slot machine's 3D scene: a low-poly cabinet with one six-faced drum per
// reel and a lever, in the style of the dice and planet pages (flat shading,
// orbit controls). No physics: the engine has already decided the result, so a
// drum just turns, brakes at its scheduled time and lands on its symbol's face.

import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { ICON_MARKUP } from "./iconMarkup.ts"
import type { ReelCount, Theme } from "./themes.ts"

const FACES = 6
const FACE_STEP = (Math.PI * 2) / FACES
/** Atlas cell: the face's width along the drum's axis x its circumferential length. */
const CELL_AXIAL = 256
const CELL_ROUND = 192

const REEL_WIDTH = 1.1
/** Side of the hexagonal prism's face, so a face is REEL_RADIUS long round the drum. */
const REEL_RADIUS = 0.85
const REEL_APOTHEM = REEL_RADIUS * Math.cos(Math.PI / FACES)
const REEL_PITCH = 1.3

const SPIN_SPEED = 16 // rad/s
const FIRST_BRAKE_MS = 450
const BRAKE_STAGGER_MS = 260
const LEVER_DOWN_MS = 140
const MACHINE_HALF_HEIGHT = 1.9
const LEVER_UP_MS = 380
const LEVER_REST = -0.25
const LEVER_PULLED = 0.95

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface MachineHandle {
  /** Rebuilds the machine for a theme and reel count, showing `shown` (or the theme's first symbols). */
  configure(theme: Theme, reels: ReelCount, shown: string[] | null): void
  /** Turns the drums and lands each on its symbol; `onSettled` fires once every drum has stopped. */
  spin(symbols: string[], onSettled: () => void): void
  /** Puts every drum on its symbol at once, cancelling any spin in flight. */
  snap(symbols: string[]): void
  /** Screen space (px) covered by the page's overlaid controls: the machine is centred in what's left. */
  setInsets(insets: Insets): void
  dispose(): void
}

interface Drum {
  group: THREE.Group
  angle: number
  mode: "idle" | "spin" | "brake"
  target: number
  brakeAt: number
  from: number
  to: number
  brakeStart: number
  brakeMs: number
}

/** The angle that brings face `index` to the front of the drum. */
function faceAngle(index: number): number {
  return (index + 0.5) * FACE_STEP
}

function loadIcon(id: string, color: string): Promise<HTMLImageElement | null> {
  const markup = (ICON_MARKUP[id] ?? "").replaceAll("currentColor", color)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

/** One cell per symbol, side by side round the drum: the icon and its name, drawn quarter-turned so it reads upright on the drum's face. */
function drawAtlas(theme: Theme): { texture: THREE.CanvasTexture; ready: Promise<void> } {
  const canvas = document.createElement("canvas")
  canvas.width = CELL_ROUND * FACES
  canvas.height = CELL_AXIAL
  const ctx = canvas.getContext("2d")!
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  const drawCell = (index: number, icon: HTMLImageElement | null) => {
    const symbol = theme.symbols[index]
    ctx.save()
    ctx.translate(index * CELL_ROUND, 0)
    ctx.beginPath()
    ctx.rect(0, 0, CELL_ROUND, CELL_AXIAL)
    ctx.clip()
    // Upright frame: x runs right across the face (CELL_AXIAL wide), y down it (CELL_ROUND tall).
    ctx.translate(CELL_ROUND, 0)
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = "#fbf6ea"
    ctx.fillRect(0, 0, CELL_AXIAL, CELL_ROUND)
    ctx.strokeStyle = theme.accent
    ctx.lineWidth = 6
    ctx.strokeRect(8, 8, CELL_AXIAL - 16, CELL_ROUND - 16)
    if (icon) ctx.drawImage(icon, CELL_AXIAL / 2 - 62, 14, 124, 124)
    ctx.fillStyle = "#1f2430"
    ctx.font = "700 30px system-ui, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(symbol.name, CELL_AXIAL / 2, CELL_ROUND - 22)
    ctx.restore()
  }

  for (let i = 0; i < FACES; i++) drawCell(i, null)
  const ready = Promise.all(theme.symbols.map((s) => loadIcon(s.id, theme.accent))).then((icons) => {
    icons.forEach((icon, i) => drawCell(i, icon))
    texture.needsUpdate = true
  })
  return { texture, ready }
}

function marqueeTexture(text: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 1024
  canvas.height = 160
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#14171d"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = accent
  ctx.font = "700 84px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 4)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z)
  return mesh
}

export function createMachine(container: HTMLElement, onPull: () => void): MachineHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.domElement.style.display = "block"
  renderer.domElement.style.width = "100%"
  renderer.domElement.style.height = "100%"
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color("#1b1f27")
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  scene.add(new THREE.AmbientLight("#ffffff", 0.75))
  const key = new THREE.DirectionalLight("#ffffff", 1.5)
  key.position.set(3, 5, 7)
  scene.add(key)
  const fill = new THREE.DirectionalLight("#8fb4ff", 0.45)
  fill.position.set(-5, 2, 4)
  scene.add(fill)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableZoom = false
  // Only a small turn either way: the front of the drums always stays in view.
  controls.minAzimuthAngle = -0.5
  controls.maxAzimuthAngle = 0.5
  controls.minPolarAngle = Math.PI / 2 - 0.35
  controls.maxPolarAngle = Math.PI / 2 + 0.2
  controls.enableDamping = true

  let machine: THREE.Group | null = null
  let drums: Drum[] = []
  let lever: THREE.Group | null = null
  let leverHit: THREE.Object3D[] = []
  let leverStart = -Infinity
  let theme: Theme | null = null
  let halfWidth = 3
  const atlasCache = new Map<string, { texture: THREE.CanvasTexture; ready: Promise<void> }>()
  let settledCallback: (() => void) | null = null
  let disposed = false

  function disposeMachine() {
    if (!machine) return
    scene.remove(machine)
    machine.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          const map = (material as THREE.MeshStandardMaterial).map
          // Atlas textures are cached per theme; the marquee's is built per machine.
          if (map && ![...atlasCache.values()].some((a) => a.texture === map)) map.dispose()
          material.dispose()
        }
      }
    })
    machine = null
    drums = []
    lever = null
    leverHit = []
  }

  let insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
  function fitCamera() {
    const width = container.clientWidth || 1
    const height = container.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // The machine fills the space the overlaid controls leave free, and is centred in it.
    const usableW = Math.max(120, width - insets.left - insets.right)
    const usableH = Math.max(120, height - insets.top - insets.bottom)
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const needed = 1.08 * Math.max((halfWidth * height) / (tan * usableW), (MACHINE_HALF_HEIGHT * height) / (tan * usableH))
    const direction = camera.position.clone().sub(controls.target)
    if (direction.lengthSq() === 0) direction.set(0, 0.15, 1)
    direction.setLength(needed)
    camera.position.copy(controls.target).add(direction)
    const shiftX = (insets.left - insets.right) / 2
    const shiftY = (insets.top - insets.bottom) / 2
    camera.setViewOffset(width, height, -shiftX, -shiftY, width, height)
    camera.updateProjectionMatrix()
  }

  function build(next: Theme, reels: ReelCount, shown: string[] | null) {
    disposeMachine()
    theme = next
    let atlas = atlasCache.get(next.id)
    if (!atlas) {
      atlas = drawAtlas(next)
      atlasCache.set(next.id, atlas)
    }

    const bodyColor = new THREE.Color(next.accent).multiplyScalar(0.55)
    const trimColor = new THREE.Color(next.accent).multiplyScalar(0.8)
    const body = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75, flatShading: true })
    const trim = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.6, flatShading: true })
    const dark = new THREE.MeshStandardMaterial({ color: "#14171d", roughness: 0.9, flatShading: true })

    const group = new THREE.Group()
    const inner = reels * REEL_PITCH + 0.1
    const outer = inner + 0.6
    halfWidth = outer / 2 + 1.0 // room for the lever

    group.add(box(outer, 3.2, 0.2, dark, 0, 0, -0.9)) // back wall
    group.add(box(0.3, 3.2, 1.9, body, -(inner / 2 + 0.15), 0, 0)) // sides
    group.add(box(0.3, 3.2, 1.9, body, inner / 2 + 0.15, 0, 0))
    group.add(box(inner, 0.7, 1.9, trim, 0, -1.2, 0)) // base
    const header = new THREE.MeshStandardMaterial({ map: marqueeTexture(next.name, next.accent), roughness: 0.7 })
    const marquee = box(inner, 0.7, 1.9, body, 0, 1.2, 0)
    marquee.material = [body, body, body, body, header, body] // +z face carries the marquee
    group.add(marquee)
    group.add(box(inner, 0.3, 0.5, trim, 0, 0.7, 0.7)) // visors hide all but the front face
    group.add(box(inner, 0.3, 0.5, trim, 0, -0.7, 0.7))

    // A faint pale line, just enough to read where the result sits.
    const payline = new THREE.Mesh(
      new THREE.BoxGeometry(inner, 0.025, 0.01),
      new THREE.MeshBasicMaterial({ color: "#fff6dd", transparent: true, opacity: 0.3, depthWrite: false }),
    )
    payline.position.set(0, 0, REEL_APOTHEM + 0.03)
    group.add(payline)

    const capMaterial = new THREE.MeshStandardMaterial({ color: "#2a2f3a", roughness: 0.8, flatShading: true })
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: atlas.texture,
      emissive: new THREE.Color("#ffffff"),
      emissiveMap: atlas.texture,
      emissiveIntensity: 0.32,
      roughness: 0.55,
      flatShading: true,
    })
    const start = shown ?? next.symbols.slice(0, reels).map((s) => s.id)
    drums = []
    for (let i = 0; i < reels; i++) {
      const holder = new THREE.Group()
      holder.position.set((i - (reels - 1) / 2) * REEL_PITCH, 0, 0)
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(REEL_RADIUS, REEL_RADIUS, REEL_WIDTH, FACES, 1, false), [faceMaterial, capMaterial, capMaterial])
      drum.rotation.z = Math.PI / 2 // axis along x
      holder.add(drum)
      group.add(holder)
      const index = Math.max(0, next.symbols.findIndex((s) => s.id === start[i]))
      const angle = faceAngle(index)
      holder.rotation.x = angle
      drums.push({ group: holder, angle, mode: "idle", target: index, brakeAt: 0, from: 0, to: 0, brakeStart: 0, brakeMs: 1 })
    }

    // Lever: a rod pivoting at the cabinet's right side, a low-poly knob on top.
    lever = new THREE.Group()
    lever.position.set(outer / 2 + 0.55, -0.45, 0.25)
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6), new THREE.MeshStandardMaterial({ color: "#c9ccd3", metalness: 0.4, roughness: 0.4, flatShading: true }))
    rod.position.y = 0.75
    const knob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: "#e11d48", roughness: 0.4, flatShading: true }))
    knob.position.y = 1.55
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    hit.position.y = 1.4
    lever.add(rod, knob, hit)
    lever.rotation.x = LEVER_REST
    const mount = box(0.45, 0.5, 0.5, trim, outer / 2 + 0.4, -0.45, 0.25)
    group.add(mount, lever)
    leverHit = [rod, knob, hit]

    // A low-poly plinth to ground the cabinet on the dark backdrop.
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(outer * 0.95, outer * 1.05, 0.2, 6), new THREE.MeshStandardMaterial({ color: "#232833", roughness: 0.95, flatShading: true }))
    plinth.position.set(0, -1.7, 0)
    group.add(plinth)

    machine = group
    scene.add(group)
    fitCamera()
  }

  function leverAngle(now: number): number {
    const t = now - leverStart
    if (t < 0 || t > LEVER_DOWN_MS + LEVER_UP_MS) return LEVER_REST
    if (t < LEVER_DOWN_MS) return LEVER_REST + (LEVER_PULLED - LEVER_REST) * (t / LEVER_DOWN_MS)
    const u = (t - LEVER_DOWN_MS) / LEVER_UP_MS
    return LEVER_PULLED + (LEVER_REST - LEVER_PULLED) * (1 - (1 - u) * (1 - u))
  }

  let lastFrame = performance.now()
  let frame = 0
  function animate() {
    frame = requestAnimationFrame(animate)
    const now = performance.now()
    const dt = Math.min(0.05, (now - lastFrame) / 1000)
    lastFrame = now
    for (const drum of drums) {
      if (drum.mode === "spin") {
        drum.angle += SPIN_SPEED * dt
        if (now >= drum.brakeAt) {
          // Brake onto the target face: at least half a turn more, ending exactly on it.
          const base = faceAngle(drum.target)
          const to = base + Math.ceil((drum.angle + Math.PI - base) / (Math.PI * 2)) * Math.PI * 2
          drum.from = drum.angle
          drum.to = to
          drum.brakeStart = now
          // Ease-out quad starts at 2*D/T, so T = 2*D/speed continues the turn without a jolt.
          drum.brakeMs = ((2 * (to - drum.angle)) / SPIN_SPEED) * 1000
          drum.mode = "brake"
        }
      } else if (drum.mode === "brake") {
        const u = (now - drum.brakeStart) / drum.brakeMs
        if (u >= 1) {
          drum.angle = drum.to
          drum.mode = "idle"
        } else {
          drum.angle = drum.from + (drum.to - drum.from) * (1 - (1 - u) * (1 - u))
        }
      }
      drum.group.rotation.x = drum.angle
    }
    if (lever) lever.rotation.x = leverAngle(now)
    if (settledCallback && drums.length > 0 && drums.every((d) => d.mode === "idle")) {
      const done = settledCallback
      settledCallback = null
      done()
    }
    controls.update()
    renderer.render(scene, camera)
  }

  // A click or tap (not a drag) on the lever pulls it.
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downAt: { x: number; y: number; time: number } | null = null
  function overLever(event: PointerEvent): boolean {
    if (!lever) return false
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObjects(leverHit, false).length > 0
  }
  const onPointerDown = (event: PointerEvent) => {
    downAt = { x: event.clientX, y: event.clientY, time: performance.now() }
  }
  const onPointerUp = (event: PointerEvent) => {
    const start = downAt
    downAt = null
    if (!start) return
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (moved < 6 && performance.now() - start.time < 600 && overLever(event)) onPull()
  }
  const onPointerMove = (event: PointerEvent) => {
    renderer.domElement.style.cursor = overLever(event) ? "pointer" : "grab"
  }
  renderer.domElement.addEventListener("pointerdown", onPointerDown)
  renderer.domElement.addEventListener("pointerup", onPointerUp)
  renderer.domElement.addEventListener("pointermove", onPointerMove)

  const observer = new ResizeObserver(() => {
    if (!disposed) fitCamera()
  })
  observer.observe(container)
  camera.position.set(0, 0.5, 8)
  controls.target.set(0, 0.1, 0)
  animate()

  return {
    configure(nextTheme, reels, shown) {
      settledCallback = null
      build(nextTheme, reels, shown)
    },
    spin(symbols, onSettled) {
      if (!theme) return
      const now = performance.now()
      settledCallback = onSettled
      leverStart = now
      drums.forEach((drum, i) => {
        drum.target = Math.max(0, theme!.symbols.findIndex((s) => s.id === symbols[i]))
        drum.mode = "spin"
        drum.brakeAt = now + FIRST_BRAKE_MS + i * BRAKE_STAGGER_MS
      })
    },
    snap(symbols) {
      if (!theme) return
      settledCallback = null
      drums.forEach((drum, i) => {
        const index = Math.max(0, theme!.symbols.findIndex((s) => s.id === symbols[i]))
        drum.target = index
        drum.angle = faceAngle(index)
        drum.mode = "idle"
        drum.group.rotation.x = drum.angle
      })
    },
    setInsets(next) {
      insets = next
      if (!disposed) fitCamera()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      renderer.domElement.removeEventListener("pointerup", onPointerUp)
      renderer.domElement.removeEventListener("pointermove", onPointerMove)
      controls.dispose()
      disposeMachine()
      for (const atlas of atlasCache.values()) atlas.texture.dispose()
      atlasCache.clear()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
