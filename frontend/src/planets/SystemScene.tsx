import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { components } from "@/api/schema"
import { createSurfaceCanvas } from "./planetTexture"

export type SystemDto = components["schemas"]["PlanetarySystem"]

const DEG = Math.PI / 180
const TAU = Math.PI * 2

function seededRandom(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** How brightly each kind of central body lights its planets. */
const LIGHT_INTENSITY: Record<components["schemas"]["CentralBodyKind"], number> = {
  RedDwarf: 3,
  Orange: 3.5,
  Yellow: 3.5,
  BlueGiant: 6,
  WhiteDwarf: 2.5,
  Pulsar: 1.5,
  BlackHole: 1.6,
}

function glowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext("2d")!
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, "rgba(255,255,255,1)")
  gradient.addColorStop(0.25, "rgba(255,255,255,0.35)")
  gradient.addColorStop(1, "rgba(255,255,255,0)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
    for (const material of materials) {
      const map = (material as THREE.MeshStandardMaterial).map
      map?.dispose()
      material.dispose()
    }
  })
}

/** Position on an orbit, in the orbit's own plane, at elapsed time `t` seconds. */
function orbitAngle(orbit: { phaseDegrees: number | string; periodSeconds: number | string }, t: number): number {
  return Number(orbit.phaseDegrees) * DEG + (t / Number(orbit.periodSeconds)) * TAU
}

/**
 * Draws a whole system: the central group circling its common center, each
 * planet on its own (occasionally inclined) orbit, the belt, and a label per
 * planet. A body's position is a pure function of elapsed time, so everyone
 * starts from the same deterministic positions. Clicking a planet reports
 * its slot index.
 */
export function SystemScene({ system, onSelectPlanet }: { system: SystemDto; onSelectPlanet: (slotIndex: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelectPlanet)
  useEffect(() => {
    onSelectRef.current = onSelectPlanet
  }, [onSelectPlanet])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.className = "absolute inset-0 size-full"
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#05070d")
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)

    const rand = seededRandom(system.seed.length * 7919 + system.slots.length)
    const starPositions = new Float32Array(1800 * 3)
    for (let i = 0; i < 1800; i++) {
      const theta = rand() * TAU
      const phi = Math.acos(2 * rand() - 1)
      starPositions[i * 3] = 400 * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = 400 * Math.cos(phi)
      starPositions[i * 3 + 2] = 400 * Math.sin(phi) * Math.sin(theta)
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#ffffff", size: 1, sizeAttenuation: true })))

    scene.add(new THREE.AmbientLight("#ffffff", 0.18))

    const glow = glowTexture()

    // Central group: emissive bodies, each with a light and a soft glow.
    const central = system.central.map((body) => {
      const size = Number(body.size)
      const holder = new THREE.Group()
      const isHole = body.kind === "BlackHole"
      holder.add(new THREE.Mesh(new THREE.SphereGeometry(size, 32, 24), new THREE.MeshBasicMaterial({ color: body.color })))
      if (isHole) {
        const disc = new THREE.Mesh(
          new THREE.RingGeometry(size * 1.4, size * 2.8, 64),
          new THREE.MeshBasicMaterial({ color: "#ff9a3d", side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
        )
        disc.rotation.x = Math.PI / 2 - 0.25
        holder.add(disc)
        // The hot disc, not the hole itself, is what lights the planets.
        holder.add(new THREE.PointLight("#ff9a3d", LIGHT_INTENSITY[body.kind], 0, 0))
      } else {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glow, color: body.color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
        )
        sprite.scale.setScalar(size * (body.kind === "Pulsar" ? 9 : 6))
        holder.add(sprite)
        holder.add(new THREE.PointLight(body.color, LIGHT_INTENSITY[body.kind], 0, 0))
      }
      scene.add(holder)
      return { holder, orbit: body.orbit }
    })

    // Planets: each on a pivot tilted by its orbit's inclination.
    const hitMeshes: THREE.Mesh[] = []
    const labels: { el: HTMLDivElement; anchor: THREE.Object3D; radius: number }[] = []
    const planets = system.slots.map((slot) => {
      const planet = slot.planet
      const radius = Math.min(0.9, 0.16 + 0.06 * Number(planet.radius))
      const orbitRadius = Number(slot.orbit.radius)

      const pivot = new THREE.Group()
      pivot.rotation.x = Number(slot.orbit.inclinationDegrees) * DEG
      scene.add(pivot)

      const points: THREE.Vector3[] = []
      for (let i = 0; i < 160; i++) {
        const a = (i / 160) * TAU
        points.push(new THREE.Vector3(Math.cos(a) * orbitRadius, 0, Math.sin(a) * orbitRadius))
      }
      pivot.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.16 }),
        ),
      )

      const texture = new THREE.CanvasTexture(createSurfaceCanvas(planet, 256))
      texture.colorSpace = THREE.SRGBColorSpace
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 24),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }),
      )
      body.rotation.z = Number(planet.axialTiltDegrees) * DEG
      const holder = new THREE.Group()
      holder.add(body)

      if (planet.rings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(radius * Number(planet.rings.inner), radius * Number(planet.rings.outer), 48),
          new THREE.MeshBasicMaterial({ color: planet.rings.color, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false }),
        )
        ring.rotation.x = Math.PI / 2
        holder.add(ring)
      }

      // A generous invisible sphere so small planets are easy to click.
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(radius * 1.8, 0.45), 12, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      )
      hit.userData.slotIndex = Number(slot.index)
      holder.add(hit)
      hitMeshes.push(hit)
      pivot.add(holder)

      const el = document.createElement("div")
      el.className = "pointer-events-none absolute top-0 left-0 text-[10px] whitespace-nowrap text-white/75"
      el.textContent = planet.name
      container.appendChild(el)
      labels.push({ el, anchor: holder, radius })

      return { holder, body, orbit: slot.orbit, orbitRadius, spin: Number(planet.rotationPeriodSeconds) }
    })

    // Asteroid belt: a flat ring of small rocks in the reference plane.
    let belt: THREE.InstancedMesh | undefined
    const beltData = system.belt
    if (beltData) {
      const radius = Number(beltData.orbit.radius)
      const width = Number(beltData.width)
      const count = Number(beltData.count)
      belt = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.05, 0),
        new THREE.MeshStandardMaterial({ color: beltData.color, roughness: 1, flatShading: true }),
        count,
      )
      const beltRand = seededRandom(system.seed.length * 104729 + count)
      const dummy = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        const angle = beltRand() * TAU
        const r = radius + (beltRand() - 0.5) * width
        dummy.position.set(Math.cos(angle) * r, (beltRand() - 0.5) * 0.25, Math.sin(angle) * r)
        dummy.rotation.set(beltRand() * 6, beltRand() * 6, beltRand() * 6)
        dummy.scale.setScalar(0.5 + beltRand() * 1.6)
        dummy.updateMatrix()
        belt.setMatrixAt(i, dummy.matrix)
      }
      scene.add(belt)
    }

    const outer = Math.max(...system.slots.map((s) => Number(s.orbit.radius)))
    const distance = outer * 1.7 + 6
    camera.position.set(0, distance * 0.5, distance * 0.85)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.minDistance = 3
    controls.maxDistance = distance * 4

    const resize = () => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0 || clientHeight === 0) return
      renderer.setSize(clientWidth, clientHeight, false)
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    // A click that did not drag selects the planet under the pointer.
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downAt: { x: number; y: number } | null = null

    const pick = (event: PointerEvent): number | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(hitMeshes, false)[0]
      return hit ? (hit.object.userData.slotIndex as number) : null
    }
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => {
      if (!downAt) return
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y)
      downAt = null
      if (moved > 5) return
      const index = pick(e)
      if (index !== null) onSelectRef.current(index)
    }
    const onMove = (e: PointerEvent) => {
      renderer.domElement.style.cursor = pick(e) !== null ? "pointer" : ""
    }
    renderer.domElement.addEventListener("pointerdown", onDown)
    renderer.domElement.addEventListener("pointerup", onUp)
    renderer.domElement.addEventListener("pointermove", onMove)

    const world = new THREE.Vector3()
    const start = performance.now()
    let frame = 0
    const animate = () => {
      const t = (performance.now() - start) / 1000

      for (const c of central) {
        if (c.orbit) {
          const a = orbitAngle(c.orbit, t)
          const r = Number(c.orbit.radius)
          c.holder.position.set(Math.cos(a) * r, 0, Math.sin(a) * r)
        }
      }
      for (const p of planets) {
        const a = orbitAngle(p.orbit, t)
        p.holder.position.set(Math.cos(a) * p.orbitRadius, 0, Math.sin(a) * p.orbitRadius)
        p.body.rotation.y = (t / p.spin) * TAU
      }
      if (belt && beltData) belt.rotation.y = (t / Number(beltData.orbit.periodSeconds)) * TAU

      controls.update()
      renderer.render(scene, camera)

      // Project each planet's position to place its label just below it.
      const w = container.clientWidth
      const h = container.clientHeight
      for (const label of labels) {
        label.anchor.getWorldPosition(world)
        world.y -= label.radius * 1.4
        world.project(camera)
        const visible = world.z < 1
        label.el.style.display = visible ? "" : "none"
        label.el.style.transform = `translate(${((world.x + 1) / 2) * w + 8}px, ${((1 - world.y) / 2) * h}px)`
      }

      frame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener("pointerdown", onDown)
      renderer.domElement.removeEventListener("pointerup", onUp)
      renderer.domElement.removeEventListener("pointermove", onMove)
      controls.dispose()
      for (const label of labels) label.el.remove()
      glow.dispose()
      disposeObject(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [system])

  return <div ref={containerRef} className="absolute inset-0 touch-none overflow-hidden" />
}
