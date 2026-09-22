import RAPIER from "@dimforge/rapier3d-compat"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { buildD10, buildDieShape, type DieFace, type DieKind, type DieShape } from "./dieTypes"

/** Half the floor's side length - the tray spans roughly [-FLOOR_HALF, FLOOR_HALF] in X and Z. */
const FLOOR_HALF = 3.2
const WALL_HEIGHT = 2.4
const WALL_THICKNESS = 0.3
/** More than this and the tray gets too crowded to read (design.md - Risks/Trade-offs). */
export const MAX_DICE = 16

const SETTLE_LINEAR_EPS = 0.05
const SETTLE_ANGULAR_EPS = 0.05
/** Consecutive slow physics steps (at a 60Hz fixed step, ~0.5s) before a die counts as settled - debounced so a momentary near-stop mid-tumble doesn't count (design.md). */
const SETTLE_STEPS = 30
/** A roll that hasn't finished by this long gets its stragglers snapped to a face and force-settled (the `dice-roller` spec's "a stuck die still resolves"). */
const ROLL_TIMEOUT_MS = 6000

export interface TrayItem {
  trayId: string
  kind: DieKind
}

export interface DiceSceneHandle {
  /** Adds a die of `kind` at rest; returns false (and adds nothing) if the tray is already at MAX_DICE or physics isn't ready yet. */
  summon(kind: DieKind): boolean
  remove(trayId: string): void
  clear(): void
  /** Throws every die currently in the tray as one event; does nothing if the tray is empty or a roll is already in progress. */
  roll(): void
}

interface DiceSceneProps {
  onReady?: () => void
  onTrayChange?: (items: TrayItem[]) => void
  onRollStateChange?: (rolling: boolean) => void
  onSettled?: (values: Record<string, number>, total: number) => void
}

/** One physical rigid body + its mesh - a plain die is one of these; a d100 tray entry is two, sharing a `trayId`. */
interface PhysicalDie {
  trayId: string
  shape: DieShape
  mesh: THREE.Mesh
  body: RAPIER.RigidBody
  collider: RAPIER.Collider
  slowSteps: number
  settled: boolean
  /** For a d100 pair: which half this is, so results can be combined the right way round. */
  tens?: boolean
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Arranges up to MAX_DICE spawn points across the floor with enough spacing that fresh dice don't spawn overlapping. */
function spawnPoint(index: number): { x: number; z: number } {
  const columns = 4
  const spacing = (FLOOR_HALF * 2 * 0.7) / columns
  const col = index % columns
  const row = Math.floor(index / columns)
  const jitter = () => randomRange(-spacing * 0.15, spacing * 0.15)
  return {
    x: (col - (columns - 1) / 2) * spacing + jitter(),
    z: (row - 1.5) * spacing + jitter(),
  }
}

/** The eligible face whose current world-space normal points most nearly straight up - the settle-read rule from design.md. */
function bestFace(faces: DieFace[], rotation: THREE.Quaternion): { face: DieFace; dot: number } {
  let best = faces[0]
  let bestDot = -Infinity
  const world = new THREE.Vector3()
  for (const face of faces) {
    world.copy(face.normal).applyQuaternion(rotation)
    if (world.y > bestDot) {
      bestDot = world.y
      best = face
    }
  }
  return { face: best, dot: bestDot }
}

/** Draws the dice tray: an enclosed floor and walls, a physics world matching it, and every summoned die - see the `dice-roller` spec. */
export const DiceScene = forwardRef<DiceSceneHandle, DiceSceneProps>(function DiceScene({ onReady, onTrayChange, onRollStateChange, onSettled }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const diceRef = useRef<PhysicalDie[]>([])
  const worldRef = useRef<RAPIER.World | null>(null)
  const rollingRef = useRef(false)
  const rollStartedAtRef = useRef(0)
  const shapeCacheRef = useRef<Map<string, DieShape>>(new Map())

  // A physical die doesn't carry its own summon-time kind name (a d100's two halves are both just "d10" shapes), so summon() stashes it here, keyed by trayId, purely to report it back out via onTrayChange.
  const kindByTrayIdRef = useRef<Map<string, DieKind>>(new Map())

  function reportTray() {
    const seen = new Set<string>()
    const items: TrayItem[] = []
    for (const die of diceRef.current) {
      if (seen.has(die.trayId)) continue
      seen.add(die.trayId)
      items.push({ trayId: die.trayId, kind: kindByTrayIdRef.current.get(die.trayId) ?? "d6" })
    }
    onTrayChange?.(items)
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let frame = 0
    let renderer: THREE.WebGLRenderer
    let observer: ResizeObserver

    void RAPIER.init().then(() => {
      if (cancelled || !container) return

      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
      worldRef.current = world

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.domElement.className = "absolute inset-0 size-full"
      container.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      scene.background = new THREE.Color("#1b1f27")
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.set(0, 7.5, 6.5)

      scene.add(new THREE.AmbientLight("#ffffff", 0.55))
      const key = new THREE.DirectionalLight("#ffffff", 1.6)
      key.position.set(4, 8, 4)
      scene.add(key)
      const fill = new THREE.DirectionalLight("#8fb4ff", 0.4)
      fill.position.set(-5, 4, -3)
      scene.add(fill)

      const feltMaterial = new THREE.MeshStandardMaterial({ color: "#0f4d3a", roughness: 0.95 })
      const wallMaterial = new THREE.MeshStandardMaterial({ color: "#3b2a1d", roughness: 0.9 })

      const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_HALF * 2, 0.3, FLOOR_HALF * 2), feltMaterial)
      floorMesh.position.y = -0.15
      scene.add(floorMesh)
      const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.15, 0))
      world.createCollider(RAPIER.ColliderDesc.cuboid(FLOOR_HALF, 0.15, FLOOR_HALF).setFriction(0.7).setRestitution(0.25), floorBody)

      const wallSpecs = [
        { x: 0, z: -FLOOR_HALF, w: FLOOR_HALF * 2, d: WALL_THICKNESS },
        { x: 0, z: FLOOR_HALF, w: FLOOR_HALF * 2, d: WALL_THICKNESS },
        { x: -FLOOR_HALF, z: 0, w: WALL_THICKNESS, d: FLOOR_HALF * 2 },
        { x: FLOOR_HALF, z: 0, w: WALL_THICKNESS, d: FLOOR_HALF * 2 },
      ]
      for (const wall of wallSpecs) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, WALL_HEIGHT, wall.d), wallMaterial)
        mesh.position.set(wall.x, WALL_HEIGHT / 2 - 0.15, wall.z)
        scene.add(mesh)
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(wall.x, WALL_HEIGHT / 2 - 0.15, wall.z))
        world.createCollider(RAPIER.ColliderDesc.cuboid(wall.w / 2, WALL_HEIGHT / 2, wall.d / 2).setFriction(0.5).setRestitution(0.35), body)
      }

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.enablePan = false
      controls.minDistance = 4
      controls.maxDistance = 14
      controls.maxPolarAngle = Math.PI * 0.48 // stay above the floor
      controls.target.set(0, 0, 0)

      const resize = () => {
        const { clientWidth, clientHeight } = container
        if (clientWidth === 0 || clientHeight === 0) return
        renderer.setSize(clientWidth, clientHeight, false)
        camera.aspect = clientWidth / clientHeight
        camera.updateProjectionMatrix()
      }
      resize()
      observer = new ResizeObserver(resize)
      observer.observe(container)

      /** Every non-d100 shape, cached so summoning several of the same kind reuses one geometry. The d100 pair's two halves (`tens: true/false`) are cached separately from a standalone `d10` (`tens` left out), even though "false" and "standalone" happen to build the same shape - simplest to keep them as distinct cache entries than to special-case the sharing. */
      function shapeFor(kind: Exclude<DieKind, "d100">, tens?: boolean): DieShape {
        const key = tens === undefined ? kind : `d10:${tens}`
        let shape = shapeCacheRef.current.get(key)
        if (!shape) {
          shape = tens === undefined ? buildDieShape(kind) : buildD10(tens)
          shapeCacheRef.current.set(key, shape)
        }
        return shape
      }

      function addPhysicalDie(trayId: string, shape: DieShape, tens: boolean | undefined, index: number) {
        const spawn = spawnPoint(index)
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(shape.positions, 3))
        geometry.computeVertexNormals()
        const material = new THREE.MeshStandardMaterial({ color: shape.color, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        const restHeight = shape.radius * 1.02
        // A random facing on spawn - still a proper unit quaternion (a raw angle in the y slot
        // is not one, and Rapier's Rust side traps rather than tolerating a non-unit rotation).
        const heading = Math.random() * Math.PI * 2
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(spawn.x, restHeight, spawn.z)
            .setRotation({ x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) }),
        )
        const hull = RAPIER.ColliderDesc.convexHull(shape.positions)
        const colliderDesc = (hull ?? RAPIER.ColliderDesc.ball(shape.radius)).setFriction(0.6).setRestitution(0.35).setDensity(1.2)
        const collider = world.createCollider(colliderDesc, body)

        diceRef.current.push({ trayId, shape, mesh, body, collider, slowSteps: 0, settled: false, tens })
      }

      function disposePhysicalDie(die: PhysicalDie) {
        die.mesh.geometry.dispose()
        ;(die.mesh.material as THREE.Material).dispose()
        die.mesh.removeFromParent()
        world.removeRigidBody(die.body)
      }

      const handle: DiceSceneHandle = {
        summon(kind) {
          if (rollingRef.current) return false
          const currentTrayIds = new Set(diceRef.current.map((d) => d.trayId))
          if (currentTrayIds.size >= MAX_DICE) return false
          const trayId = crypto.randomUUID()
          kindByTrayIdRef.current.set(trayId, kind)
          const index = currentTrayIds.size
          if (kind === "d100") {
            addPhysicalDie(trayId, shapeFor("d10", true), true, index)
            addPhysicalDie(trayId, shapeFor("d10", false), false, index)
          } else {
            addPhysicalDie(trayId, shapeFor(kind), undefined, index)
          }
          reportTray()
          return true
        },
        remove(trayId) {
          if (rollingRef.current) return
          const [keep, drop] = [diceRef.current.filter((d) => d.trayId !== trayId), diceRef.current.filter((d) => d.trayId === trayId)]
          for (const die of drop) disposePhysicalDie(die)
          diceRef.current = keep
          kindByTrayIdRef.current.delete(trayId)
          reportTray()
        },
        clear() {
          if (rollingRef.current) return
          for (const die of diceRef.current) disposePhysicalDie(die)
          diceRef.current = []
          kindByTrayIdRef.current.clear()
          reportTray()
        },
        roll() {
          if (rollingRef.current || diceRef.current.length === 0) return
          rollingRef.current = true
          rollStartedAtRef.current = performance.now()
          onRollStateChange?.(true)
          for (const die of diceRef.current) {
            die.settled = false
            die.slowSteps = 0
            die.body.wakeUp()
            die.body.setLinvel({ x: randomRange(-2.5, 2.5), y: randomRange(3.5, 6), z: randomRange(-2.5, 2.5) }, true)
            die.body.setAngvel({ x: randomRange(-18, 18), y: randomRange(-18, 18), z: randomRange(-18, 18) }, true)
          }
        },
      }
      exposeHandle(handle)

      function finishRoll() {
        rollingRef.current = false
        onRollStateChange?.(false)
        const perTray = new Map<string, { units?: number; tens?: number; plain?: number }>()
        for (const die of diceRef.current) {
          const rotation = new THREE.Quaternion(die.body.rotation().x, die.body.rotation().y, die.body.rotation().z, die.body.rotation().w)
          const { face } = bestFace(die.shape.faces, rotation)
          const entry = perTray.get(die.trayId) ?? {}
          if (die.tens === true) entry.tens = face.value
          else if (die.tens === false) entry.units = face.value
          else entry.plain = face.value
          perTray.set(die.trayId, entry)
        }
        const values: Record<string, number> = {}
        let total = 0
        for (const [trayId, entry] of perTray) {
          let value: number
          if (entry.plain !== undefined) {
            value = entry.plain
          } else {
            // Standard percentile convention: 00 + 0 reads as 100, not 0.
            const combined = (entry.tens ?? 0) + (entry.units ?? 0)
            value = combined === 0 ? 100 : combined
          }
          values[trayId] = value
          total += value
        }
        onSettled?.(values, total)
      }

      function forceSettle(die: PhysicalDie) {
        const r = die.body.rotation()
        const rotation = new THREE.Quaternion(r.x, r.y, r.z, r.w)
        const { face } = bestFace(die.shape.faces, rotation)
        // Rotate so `face`'s normal points exactly up, keeping the die's current heading otherwise.
        const target = new THREE.Quaternion().setFromUnitVectors(face.normal.clone().applyQuaternion(rotation).normalize(), new THREE.Vector3(0, 1, 0))
        const snapped = target.multiply(rotation)
        die.body.setRotation({ x: snapped.x, y: snapped.y, z: snapped.z, w: snapped.w }, true)
        die.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        die.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        die.settled = true
      }

      const animate = () => {
        world.step()
        for (const die of diceRef.current) {
          const t = die.body.translation()
          const r = die.body.rotation()
          die.mesh.position.set(t.x, t.y, t.z)
          die.mesh.quaternion.set(r.x, r.y, r.z, r.w)

          if (rollingRef.current && !die.settled) {
            const lin = die.body.linvel()
            const ang = die.body.angvel()
            const slow = Math.hypot(lin.x, lin.y, lin.z) < SETTLE_LINEAR_EPS && Math.hypot(ang.x, ang.y, ang.z) < SETTLE_ANGULAR_EPS
            die.slowSteps = slow ? die.slowSteps + 1 : 0
            if (die.slowSteps >= SETTLE_STEPS) die.settled = true
          }
        }

        if (rollingRef.current) {
          if (diceRef.current.every((d) => d.settled)) {
            finishRoll()
          } else if (performance.now() - rollStartedAtRef.current > ROLL_TIMEOUT_MS) {
            for (const die of diceRef.current) if (!die.settled) forceSettle(die)
            finishRoll()
          }
        }

        controls.update()
        renderer.render(scene, camera)
        frame = requestAnimationFrame(animate)
      }
      animate()

      onReady?.()

      cleanupRef.current = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        controls.dispose()
        for (const die of diceRef.current) {
          die.mesh.geometry.dispose()
          ;(die.mesh.material as THREE.Material).dispose()
        }
        diceRef.current = []
        // Rapier's WASM-backed World owns every body/collider created from it
        // (dice, floor, walls) - freeing it releases all of them at once,
        // rather than removing each individually.
        world.free()
        worldRef.current = null
        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      cancelled = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cleanupRef = useRef<(() => void) | null>(null)
  const handleRef = useRef<DiceSceneHandle | null>(null)
  function exposeHandle(handle: DiceSceneHandle) {
    handleRef.current = handle
  }
  useImperativeHandle(ref, () => ({
    summon: (kind) => handleRef.current?.summon(kind) ?? false,
    remove: (trayId) => handleRef.current?.remove(trayId),
    clear: () => handleRef.current?.clear(),
    roll: () => handleRef.current?.roll(),
  }))

  return <div ref={containerRef} className="absolute inset-0 touch-none" />
})
