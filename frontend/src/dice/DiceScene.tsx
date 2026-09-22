import RAPIER from "@dimforge/rapier3d-compat"
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { buildDecals, getMarbleTile } from "./decals"
import { buildD10, buildDieShape, EDGE_FACE_THRESHOLD, type DieFace, type DieKind, type DieShape, type DieVertex } from "./dieTypes"
import { nextColorFor } from "./palette"

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
/** A throw that hasn't finished by this long gets its stragglers snapped to a face and force-settled (the `dice-roller` spec's "a stuck die still resolves"). */
const THROW_TIMEOUT_MS = 6000
/** A press that moves further than this before release is a drag (orbiting the camera), not a click-to-throw. */
const CLICK_SLOP_PX = 5
/** Magnitude jump (m/s^2) between consecutive motion readings that counts as a shake. */
const SHAKE_THRESHOLD = 18
const SHAKE_COOLDOWN_MS = 1500

export interface TrayItem {
  trayId: string
  kind: DieKind
  color: string
  /** True while this die (or, for a d100, either half) is airborne from a throw - not throwable again, and blocks summon/remove/clear until every throw in flight settles. */
  airborne: boolean
}

export interface DiceSceneHandle {
  /** Adds a die of `kind` at rest; returns false (and adds nothing) if the tray is already at MAX_DICE, something is still airborne, or physics isn't ready yet. */
  summon(kind: DieKind): boolean
  remove(trayId: string): void
  clear(): void
  /** Throws every die currently in the tray as one event; does nothing if the tray is empty or anything is already airborne. */
  roll(): void
  /** Throws just this trayId's die(s); does nothing if it's already airborne. */
  throwOne(trayId: string): void
  setColor(trayId: string, color: string): void
  /** Requests iOS's motion-permission prompt (must be called from a user gesture) and attaches shake detection if granted; resolves true if shake detection is (now) active. On a platform that never needed permission, shake detection is already active and this just resolves true. */
  enableShakeDetection(): Promise<boolean>
}

interface DiceSceneProps {
  /** `needsMotionPermission` is true only on a platform (iOS) that requires a user gesture before shake detection can be enabled - DicePage shows an "Enable shake to roll" control only then. */
  onReady?: (needsMotionPermission: boolean) => void
  onTrayChange?: (items: TrayItem[]) => void
  /** Fired once a whole throw event (the whole tray, or a single die) has settled, with every trayId it involved. */
  onThrowSettled?: (values: Record<string, number>, total: number) => void
}

/** One physical rigid body + its mesh - a plain die is one of these; a d100 tray entry is two, sharing a `trayId`. */
interface PhysicalDie {
  trayId: string
  shape: DieShape
  mesh: THREE.Mesh
  body: RAPIER.RigidBody
  slowSteps: number
  settled: boolean
  /** Which throw this die is currently part of - null when it's at rest and throwable. */
  eventId: string | null
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

/** The eligible face whose current world-space normal points most nearly straight up, and how close it came - the settle-read rule from design.md. Below `EDGE_FACE_THRESHOLD` and a shape with an `edgeValue`, the caller should read that instead (see readValue). */
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

/** The eligible vertex whose current world-space direction points most nearly straight up - the d4's read rule (see dieTypes.ts's `DieShape.vertices`). */
function bestVertex(vertices: DieVertex[], rotation: THREE.Quaternion): { vertex: DieVertex; dot: number } {
  let best = vertices[0]
  let bestDot = -Infinity
  const world = new THREE.Vector3()
  for (const vertex of vertices) {
    world.copy(vertex.direction).applyQuaternion(rotation)
    if (world.y > bestDot) {
      bestDot = world.y
      best = vertex
    }
  }
  return { vertex: best, dot: bestDot }
}

/**
 * A settled die's value. A shape with `vertices` (the d4) is read from
 * whichever vertex points most nearly up - it has no face that can. Every
 * other shape reads its best face, unless it also has an `edgeValue` and no
 * face came close enough to pointing up - then it's balanced on its edge.
 */
function readValue(shape: DieShape, rotation: THREE.Quaternion): number {
  if (shape.vertices) return bestVertex(shape.vertices, rotation).vertex.value
  const { face, dot } = bestFace(shape.faces, rotation)
  if (shape.edgeValue !== undefined && dot < EDGE_FACE_THRESHOLD) return shape.edgeValue
  return face.value
}

/** Draws the dice tray: an enclosed floor and walls, a physics world matching it, and every summoned die - see the `dice-roller` spec. */
export const DiceScene = forwardRef<DiceSceneHandle, DiceSceneProps>(function DiceScene({ onReady, onTrayChange, onThrowSettled }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const diceRef = useRef<PhysicalDie[]>([])
  const shapeCacheRef = useRef<Map<string, DieShape>>(new Map())
  const eventStartedAtRef = useRef<Map<string, number>>(new Map())

  // The mount-time effect below (deps: []) runs its async setup only once, so
  // it would otherwise close over these callbacks' very first values forever
  // - stale, since DicePage passes new function instances every render.
  // Reading them through a ref updated on every render (same pattern as
  // PointsOfInterestLayer's viewRef) keeps every call using whatever the
  // latest render passed.
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const onTrayChangeRef = useRef(onTrayChange)
  onTrayChangeRef.current = onTrayChange
  const onThrowSettledRef = useRef(onThrowSettled)
  onThrowSettledRef.current = onThrowSettled

  // A physical die doesn't carry its own summon-time kind name or colour (a d100's two halves are both just "d10" shapes), so summon()/setColor() stash them here, keyed by trayId, purely to report them back out via onTrayChange.
  const kindByTrayIdRef = useRef<Map<string, DieKind>>(new Map())
  const colorByTrayIdRef = useRef<Map<string, string>>(new Map())

  function anyAirborne(): boolean {
    return diceRef.current.some((d) => d.eventId !== null)
  }

  function reportTray() {
    const seen = new Set<string>()
    const items: TrayItem[] = []
    for (const die of diceRef.current) {
      if (seen.has(die.trayId)) continue
      seen.add(die.trayId)
      items.push({
        trayId: die.trayId,
        kind: kindByTrayIdRef.current.get(die.trayId) ?? "d6",
        color: colorByTrayIdRef.current.get(die.trayId) ?? "#ffffff",
        airborne: die.eventId !== null,
      })
    }
    onTrayChangeRef.current?.(items)
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

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.domElement.className = "absolute inset-0 size-full touch-none"
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

      const marblePattern = new THREE.CanvasTexture(getMarbleTile())
      marblePattern.wrapS = THREE.RepeatWrapping
      marblePattern.wrapT = THREE.RepeatWrapping
      marblePattern.repeat.set(2, 2)

      function addPhysicalDie(trayId: string, kind: DieKind, shape: DieShape, tens: boolean | undefined, color: string, index: number) {
        const spawn = spawnPoint(index)
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(shape.positions, 3))
        if (shape.flatShadedFaceNormals) {
          geometry.setAttribute("normal", new THREE.BufferAttribute(shape.flatShadedFaceNormals, 3))
        } else {
          geometry.computeVertexNormals()
        }
        const material = new THREE.MeshStandardMaterial({ color, map: marblePattern, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide })
        const mesh = new THREE.Mesh(geometry, material)
        // Only a d100's two halves pass `tens` at all; a standalone die (tens undefined) uses the ordinary light shade like every other numeral die.
        const shade = tens === true ? "dark" : "light"
        for (const decal of buildDecals(tens === undefined ? kind : "d10", shape, shade)) mesh.add(decal)
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
        world.createCollider(colliderDesc, body)

        diceRef.current.push({ trayId, shape, mesh, body, slowSteps: 0, settled: false, eventId: null, tens })
      }

      function disposePhysicalDie(die: PhysicalDie) {
        die.mesh.geometry.dispose()
        ;(die.mesh.material as THREE.Material).dispose()
        for (const child of die.mesh.children) {
          if (child instanceof THREE.Mesh) (child.material as THREE.Material).dispose()
        }
        die.mesh.removeFromParent()
        world.removeRigidBody(die.body)
      }

      function throwDice(dice: PhysicalDie[]) {
        if (dice.length === 0) return
        const eventId = crypto.randomUUID()
        eventStartedAtRef.current.set(eventId, performance.now())
        for (const die of dice) {
          die.eventId = eventId
          die.settled = false
          die.slowSteps = 0
          die.body.wakeUp()
          die.body.setLinvel({ x: randomRange(-2.5, 2.5), y: randomRange(3.5, 6), z: randomRange(-2.5, 2.5) }, true)
          die.body.setAngvel({ x: randomRange(-18, 18), y: randomRange(-18, 18), z: randomRange(-18, 18) }, true)
        }
        reportTray()
      }

      const handle: DiceSceneHandle = {
        summon(kind) {
          if (anyAirborne()) return false
          const currentTrayIds = new Set(diceRef.current.map((d) => d.trayId))
          if (currentTrayIds.size >= MAX_DICE) return false
          const trayId = crypto.randomUUID()
          const usedColors = [...colorByTrayIdRef.current.entries()].filter(([id]) => kindByTrayIdRef.current.get(id) === kind).map(([, c]) => c)
          const color = nextColorFor(usedColors)
          kindByTrayIdRef.current.set(trayId, kind)
          colorByTrayIdRef.current.set(trayId, color)
          const index = currentTrayIds.size
          if (kind === "d100") {
            addPhysicalDie(trayId, kind, shapeFor("d10", true), true, color, index)
            addPhysicalDie(trayId, kind, shapeFor("d10", false), false, color, index)
          } else {
            addPhysicalDie(trayId, kind, shapeFor(kind), undefined, color, index)
          }
          reportTray()
          return true
        },
        remove(trayId) {
          if (anyAirborne()) return
          const [keep, drop] = [diceRef.current.filter((d) => d.trayId !== trayId), diceRef.current.filter((d) => d.trayId === trayId)]
          for (const die of drop) disposePhysicalDie(die)
          diceRef.current = keep
          kindByTrayIdRef.current.delete(trayId)
          colorByTrayIdRef.current.delete(trayId)
          reportTray()
        },
        clear() {
          if (anyAirborne()) return
          for (const die of diceRef.current) disposePhysicalDie(die)
          diceRef.current = []
          kindByTrayIdRef.current.clear()
          colorByTrayIdRef.current.clear()
          reportTray()
        },
        roll() {
          if (anyAirborne() || diceRef.current.length === 0) return
          throwDice([...diceRef.current])
        },
        throwOne(trayId) {
          const dice = diceRef.current.filter((d) => d.trayId === trayId)
          if (dice.length === 0 || dice.some((d) => d.eventId !== null)) return
          throwDice(dice)
        },
        setColor(trayId, color) {
          colorByTrayIdRef.current.set(trayId, color)
          for (const die of diceRef.current) {
            if (die.trayId === trayId) (die.mesh.material as THREE.MeshStandardMaterial).color.set(color)
          }
          reportTray()
        },
        async enableShakeDetection() {
          return enableShake()
        },
      }
      exposeHandle(handle)

      function finalizeEvent(eventId: string) {
        const dice = diceRef.current.filter((d) => d.eventId === eventId)
        eventStartedAtRef.current.delete(eventId)
        const perTray = new Map<string, { units?: number; tens?: number; plain?: number }>()
        for (const die of dice) {
          const r = die.body.rotation()
          const value = readValue(die.shape, new THREE.Quaternion(r.x, r.y, r.z, r.w))
          const entry = perTray.get(die.trayId) ?? {}
          if (die.tens === true) entry.tens = value
          else if (die.tens === false) entry.units = value
          else entry.plain = value
          perTray.set(die.trayId, entry)
          die.eventId = null
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
        onThrowSettledRef.current?.(values, total)
        reportTray()
      }

      function forceSettle(die: PhysicalDie) {
        const r = die.body.rotation()
        const rotation = new THREE.Quaternion(r.x, r.y, r.z, r.w)
        // A d4 (`vertices` set) has no face that can point straight up while
        // resting stably - only its top vertex does - so snap that instead.
        const localDirection = die.shape.vertices ? bestVertex(die.shape.vertices, rotation).vertex.direction : bestFace(die.shape.faces, rotation).face.normal
        // Rotate so that direction points exactly up, keeping the die's current heading otherwise.
        const target = new THREE.Quaternion().setFromUnitVectors(localDirection.clone().applyQuaternion(rotation).normalize(), new THREE.Vector3(0, 1, 0))
        const snapped = target.multiply(rotation)
        die.body.setRotation({ x: snapped.x, y: snapped.y, z: snapped.z, w: snapped.w }, true)
        die.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        die.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        die.settled = true
      }

      // -- Click/tap a die to throw it on its own -------------------------------
      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      let pressedAt: { x: number; y: number } | null = null
      function onPointerDown(event: PointerEvent) {
        pressedAt = { x: event.clientX, y: event.clientY }
      }
      function onPointerUp(event: PointerEvent) {
        const start = pressedAt
        pressedAt = null
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return
        const rect = renderer.domElement.getBoundingClientRect()
        pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(diceRef.current.map((d) => d.mesh), false)[0]
        if (!hit) return
        const die = diceRef.current.find((d) => d.mesh === hit.object)
        if (die) handle.throwOne(die.trayId)
      }
      renderer.domElement.addEventListener("pointerdown", onPointerDown)
      renderer.domElement.addEventListener("pointerup", onPointerUp)

      // -- Shake to roll ---------------------------------------------------------
      let shakeAttached = false
      let lastMagnitude: number | null = null
      let lastShakeAt = 0
      function onDeviceMotion(event: DeviceMotionEvent) {
        const acc = event.acceleration?.x != null ? event.acceleration : event.accelerationIncludingGravity
        if (!acc || acc.x == null || acc.y == null || acc.z == null) return
        const magnitude = Math.hypot(acc.x, acc.y, acc.z)
        if (lastMagnitude !== null) {
          const now = performance.now()
          if (Math.abs(magnitude - lastMagnitude) > SHAKE_THRESHOLD && now - lastShakeAt > SHAKE_COOLDOWN_MS) {
            lastShakeAt = now
            handle.roll()
          }
        }
        lastMagnitude = magnitude
      }
      function attachShake() {
        if (shakeAttached) return
        shakeAttached = true
        window.addEventListener("devicemotion", onDeviceMotion)
      }
      interface MotionPermissionApi {
        requestPermission: () => Promise<"granted" | "denied">
      }
      const motionCtor = window.DeviceMotionEvent as unknown as Partial<MotionPermissionApi> | undefined
      const needsMotionPermission = typeof motionCtor?.requestPermission === "function"
      async function enableShake(): Promise<boolean> {
        if (shakeAttached) return true
        if (needsMotionPermission) {
          try {
            const result = await (motionCtor as MotionPermissionApi).requestPermission()
            if (result !== "granted") return false
          } catch {
            return false
          }
        }
        attachShake()
        return true
      }
      if (!needsMotionPermission && typeof window.DeviceMotionEvent !== "undefined") {
        attachShake()
      }

      const animate = () => {
        world.step()
        const settledEventIds = new Set<string>()
        for (const die of diceRef.current) {
          const t = die.body.translation()
          const r = die.body.rotation()
          die.mesh.position.set(t.x, t.y, t.z)
          die.mesh.quaternion.set(r.x, r.y, r.z, r.w)

          if (die.eventId && !die.settled) {
            const lin = die.body.linvel()
            const ang = die.body.angvel()
            const slow = Math.hypot(lin.x, lin.y, lin.z) < SETTLE_LINEAR_EPS && Math.hypot(ang.x, ang.y, ang.z) < SETTLE_ANGULAR_EPS
            die.slowSteps = slow ? die.slowSteps + 1 : 0
            if (die.slowSteps >= SETTLE_STEPS) die.settled = true
          }
        }

        const activeEventIds = new Set(diceRef.current.filter((d) => d.eventId).map((d) => d.eventId as string))
        const now = performance.now()
        for (const eventId of activeEventIds) {
          const eventDice = diceRef.current.filter((d) => d.eventId === eventId)
          const timedOut = now - (eventStartedAtRef.current.get(eventId) ?? now) > THROW_TIMEOUT_MS
          if (timedOut) {
            for (const die of eventDice) if (!die.settled) forceSettle(die)
          }
          if (eventDice.every((d) => d.settled)) settledEventIds.add(eventId)
        }
        for (const eventId of settledEventIds) finalizeEvent(eventId)

        controls.update()
        renderer.render(scene, camera)
        frame = requestAnimationFrame(animate)
      }
      animate()

      onReadyRef.current?.(needsMotionPermission)

      cleanupRef.current = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        controls.dispose()
        renderer.domElement.removeEventListener("pointerdown", onPointerDown)
        renderer.domElement.removeEventListener("pointerup", onPointerUp)
        window.removeEventListener("devicemotion", onDeviceMotion)
        for (const die of diceRef.current) {
          die.mesh.geometry.dispose()
          ;(die.mesh.material as THREE.Material).dispose()
        }
        diceRef.current = []
        // Rapier's WASM-backed World owns every body/collider created from it
        // (dice, floor, walls) - freeing it releases all of them at once,
        // rather than removing each individually.
        world.free()
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
    throwOne: (trayId) => handleRef.current?.throwOne(trayId),
    setColor: (trayId, color) => handleRef.current?.setColor(trayId, color),
    enableShakeDetection: () => handleRef.current?.enableShakeDetection() ?? Promise.resolve(false),
  }))

  return <div ref={containerRef} className="absolute inset-0 touch-none" />
})
