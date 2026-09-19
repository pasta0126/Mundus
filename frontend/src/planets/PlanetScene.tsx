import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { createCloudCanvas, createRingCanvas, createSurfaceCanvas, type PlanetDto } from "./planetTexture"

const DEG = Math.PI / 180

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

const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`

const ATMOSPHERE_FRAGMENT = `
  uniform vec3 color;
  uniform float density;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
    gl_FragColor = vec4(color, rim * density * 1.3);
  }
`

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

/**
 * Draws one planet: a textured sphere that turns on its axis, an optional
 * cloud shell, atmosphere glow, rings, asteroid field, and slowly orbiting
 * moons. Everything is drawn from the planet's description; the planet is
 * shown at unit radius and everything else is in planet radii.
 */
export function PlanetScene({ planet }: { planet: PlanetDto }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.className = "absolute inset-0 size-full"
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#05070d")

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400)

    // Stars, seeded so a remount does not shuffle them.
    const rand = seededRandom(Number(planet.textureSeed) + 1)
    const starPositions = new Float32Array(1500 * 3)
    for (let i = 0; i < 1500; i++) {
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      const r = 120
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.cos(phi)
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#ffffff", size: 0.35, sizeAttenuation: true }))
    scene.add(stars)

    scene.add(new THREE.AmbientLight("#ffffff", 0.28))
    const sun = new THREE.DirectionalLight("#ffffff", 2.6)
    sun.position.set(5, 2, 3)
    scene.add(sun)

    // Tilt group: the planet's axis. Rings, asteroids and moons share its
    // equatorial plane; only the planet and its clouds spin inside it.
    const tilt = new THREE.Group()
    tilt.rotation.z = Number(planet.axialTiltDegrees) * DEG
    scene.add(tilt)

    const spin = new THREE.Group()
    tilt.add(spin)

    const surfaceTexture = new THREE.CanvasTexture(createSurfaceCanvas(planet))
    surfaceTexture.colorSpace = THREE.SRGBColorSpace
    surfaceTexture.anisotropy = 4
    const surface = new THREE.MeshStandardMaterial({ map: surfaceTexture, roughness: 1, metalness: 0 })
    if (planet.type === "Lava") {
      surface.emissiveMap = surfaceTexture
      surface.emissive = new THREE.Color("#ff5a1f")
      surface.emissiveIntensity = 0.25
    }
    spin.add(new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), surface))

    let clouds: THREE.Mesh | undefined
    const cloudLayer = planet.atmosphere?.clouds
    if (cloudLayer) {
      const cloudTexture = new THREE.CanvasTexture(createCloudCanvas(planet, Number(cloudLayer.coverage)))
      cloudTexture.colorSpace = THREE.SRGBColorSpace
      clouds = new THREE.Mesh(
        new THREE.SphereGeometry(1.018, 96, 64),
        new THREE.MeshStandardMaterial({ map: cloudTexture, transparent: true, depthWrite: false, roughness: 1 }),
      )
      spin.add(clouds)
    }

    if (planet.atmosphere) {
      tilt.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.07, 64, 48),
          new THREE.ShaderMaterial({
            vertexShader: ATMOSPHERE_VERTEX,
            fragmentShader: ATMOSPHERE_FRAGMENT,
            uniforms: {
              color: { value: new THREE.Color(planet.atmosphere.color) },
              density: { value: Number(planet.atmosphere.density) },
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        ),
      )
    }

    let extent = 1.3

    if (planet.rings) {
      const inner = Number(planet.rings.inner)
      const outer = Number(planet.rings.outer)
      const geometry = new THREE.RingGeometry(inner, outer, 128, 1)
      // RingGeometry's UVs are planar; remap u to the radial position so the
      // strip texture runs from the inner to the outer edge.
      const pos = geometry.attributes.position
      const uv = geometry.attributes.uv
      for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - inner) / (outer - inner), 0.5)
      }
      const ringTexture = new THREE.CanvasTexture(createRingCanvas(planet.rings.color, Number(planet.textureSeed)))
      ringTexture.colorSpace = THREE.SRGBColorSpace
      const ring = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ map: ringTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
      )
      ring.rotation.x = Math.PI / 2
      tilt.add(ring)
      extent = Math.max(extent, outer)
    }

    let asteroids: THREE.InstancedMesh | undefined
    if (planet.asteroidField) {
      const field = planet.asteroidField
      const inner = Number(field.inner)
      const outer = Number(field.outer)
      const count = Number(field.count)
      asteroids = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.03, 0),
        new THREE.MeshStandardMaterial({ color: field.color, roughness: 1, flatShading: true }),
        count,
      )
      const fieldRand = seededRandom(Number(planet.textureSeed) + 2)
      const dummy = new THREE.Object3D()
      for (let i = 0; i < count; i++) {
        const angle = fieldRand() * Math.PI * 2
        const radius = inner + fieldRand() * (outer - inner)
        dummy.position.set(Math.cos(angle) * radius, (fieldRand() - 0.5) * 0.12, Math.sin(angle) * radius)
        dummy.rotation.set(fieldRand() * 6, fieldRand() * 6, fieldRand() * 6)
        dummy.scale.setScalar(0.5 + fieldRand() * 1.4)
        dummy.updateMatrix()
        asteroids.setMatrixAt(i, dummy.matrix)
      }
      tilt.add(asteroids)
      extent = Math.max(extent, outer)
    }

    const moons = planet.moons.map((moon) => {
      const size = Number(moon.size)
      const radius = Number(moon.orbit.radius)
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 32, 24),
        new THREE.MeshStandardMaterial({ color: moon.palette[0], roughness: 1 }),
      )
      // The orbit plane is tilted from the equator by its inclination.
      const plane = new THREE.Group()
      plane.rotation.x = Number(moon.orbit.inclinationDegrees) * DEG
      plane.add(mesh)
      tilt.add(plane)
      extent = Math.max(extent, radius + size)
      return {
        mesh,
        radius,
        period: Number(moon.orbit.periodSeconds),
        phase: Number(moon.orbit.phaseDegrees) * DEG,
      }
    })

    const distance = extent * 2.5 + 0.5
    camera.position.set(0, distance * 0.18, distance)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 1.6
    controls.maxDistance = distance * 3

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

    const rotationPeriod = Number(planet.rotationPeriodSeconds)
    const start = performance.now()
    let frame = 0
    const animate = () => {
      const t = (performance.now() - start) / 1000
      spin.rotation.y = (t / rotationPeriod) * Math.PI * 2
      if (clouds) clouds.rotation.y = t * 0.012
      if (asteroids) asteroids.rotation.y = t * 0.02
      for (const moon of moons) {
        const angle = moon.phase + (t / moon.period) * Math.PI * 2
        moon.mesh.position.set(Math.cos(angle) * moon.radius, 0, Math.sin(angle) * moon.radius)
      }
      controls.update()
      renderer.render(scene, camera)
      frame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [planet])

  return <div ref={containerRef} className="absolute inset-0 touch-none" />
}
