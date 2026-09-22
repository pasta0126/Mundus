import * as THREE from "three"

/** Every die shape the tray can summon. `d100` is not built here - it is two `d10` bodies (see DicePage.tsx), one printed 00/10/.../90, one 0-9. */
export type DieKind = "d2" | "d3" | "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100"

/** A resting face eligible to be "the" face a settled die is read from - its outward direction in the die's own local space, and the value it's printed with. */
export interface DieFace {
  normal: THREE.Vector3
  value: number
}

/** A die's shape and its face-value map - the single source of truth both the visual mesh and the physics collider (see diceScene.ts) are built from. */
export interface DieShape {
  /** Every vertex position, flattened (x,y,z,x,y,z,...) - feeds both the rendered geometry and the physics convex-hull collider, so the two can never drift apart. */
  positions: Float32Array
  /** Only the faces a settled die can be read from (excludes a d3's triangular ends, a d2's rim). */
  faces: DieFace[]
  /** Roughly half the die's largest dimension - used to space dice apart when summoning and to size the tray to fit them. */
  radius: number
  color: string
}

function pushTriangle(positions: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

/**
 * Groups a triangle soup's faces by their (deduplicated) outward normal -
 * exactly right for a convex polyhedron with planar faces, where every
 * triangle belonging to the same true face shares one normal.
 */
function faceNormalsFromTriangles(positions: Float32Array): THREE.Vector3[] {
  const normals: THREE.Vector3[] = []
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let i = 0; i < positions.length; i += 9) {
    a.set(positions[i], positions[i + 1], positions[i + 2])
    b.set(positions[i + 3], positions[i + 4], positions[i + 5])
    c.set(positions[i + 6], positions[i + 7], positions[i + 8])
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
    if (!normals.some((existing) => existing.distanceTo(n) < 1e-3)) normals.push(n)
  }
  return normals
}

/**
 * Assigns 1..n to a set of face directions so that antipodal faces sum to
 * n+1 - the standard-dice property the `dice-roller` spec calls out for a
 * d6 ("opposite faces of a d6 sum to 7"), applied generically to every
 * even-faced die here. Every one of these shapes has full point symmetry
 * (each face has an exact antipodal partner), so this always pairs up
 * cleanly.
 */
function assignAntipodalValues(normals: THREE.Vector3[]): DieFace[] {
  const used = new Array(normals.length).fill(false)
  const out: DieFace[] = new Array(normals.length)
  let low = 1
  let high = normals.length
  for (let i = 0; i < normals.length; i++) {
    if (used[i]) continue
    used[i] = true
    out[i] = { normal: normals[i], value: low++ }
    let partner = -1
    let bestDot = 1
    for (let j = 0; j < normals.length; j++) {
      if (used[j]) continue
      const dot = normals[i].dot(normals[j])
      if (dot < bestDot) {
        bestDot = dot
        partner = j
      }
    }
    if (partner >= 0 && bestDot < -0.9) {
      used[partner] = true
      out[partner] = { normal: normals[partner], value: high-- }
    }
  }
  return out
}

/** Builds a Platonic solid's shape entirely from its vertices: face normals and their fair antipodal-sum values are read straight off the triangles, so the numbering can never disagree with the rendered geometry. */
function platonicShape(geometry: THREE.BufferGeometry, radius: number, color: string): DieShape {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  const positions = (nonIndexed.attributes.position.array as Float32Array).slice()
  const faces = assignAntipodalValues(faceNormalsFromTriangles(positions))
  return { positions, faces, radius, color }
}

export function buildD4(): DieShape {
  return platonicShape(new THREE.TetrahedronGeometry(0.62), 0.62, "#c0392b")
}
export function buildD6(): DieShape {
  return platonicShape(new THREE.BoxGeometry(0.7, 0.7, 0.7), 0.61, "#2c3e50")
}
export function buildD8(): DieShape {
  return platonicShape(new THREE.OctahedronGeometry(0.55), 0.55, "#16a085")
}
export function buildD12(): DieShape {
  return platonicShape(new THREE.DodecahedronGeometry(0.5), 0.5, "#8e44ad")
}
export function buildD20(): DieShape {
  return platonicShape(new THREE.IcosahedronGeometry(0.5), 0.5, "#2980b9")
}

/**
 * A pentagonal trapezohedron - the standard d10 shape: two apexes, and two
 * pentagon rings staggered 36° apart between them, giving 10 kite faces.
 * Point-symmetric (every vertex has an exact antipode), so it gets the
 * same fair antipodal-sum numbering as the Platonic solids, reused via
 * `tens`: false for a units die (0-9), true for the tens half of a d100
 * pair (00, 10, ..., 90).
 */
export function buildD10(tens: boolean): DieShape {
  const R = 0.5
  const ringHeight = 0.16
  const apexHeight = 0.5
  const upper: THREE.Vector3[] = []
  const lower: THREE.Vector3[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    upper.push(new THREE.Vector3(Math.cos(a) * R, ringHeight, Math.sin(a) * R))
    const b = a + Math.PI / 5
    lower.push(new THREE.Vector3(Math.cos(b) * R, -ringHeight, Math.sin(b) * R))
  }
  const top = new THREE.Vector3(0, apexHeight, 0)
  const bottom = new THREE.Vector3(0, -apexHeight, 0)

  const positions: number[] = []
  for (let i = 0; i < 5; i++) {
    const u0 = upper[i]
    const u1 = upper[(i + 1) % 5]
    const l0 = lower[i]
    pushTriangle(positions, top, u0, l0)
    pushTriangle(positions, top, l0, u1)
  }
  for (let i = 0; i < 5; i++) {
    const l0 = lower[i]
    const l1 = lower[(i + 1) % 5]
    const u1 = upper[(i + 1) % 5]
    pushTriangle(positions, bottom, l0, u1)
    pushTriangle(positions, bottom, u1, l1)
  }

  const flat = new Float32Array(positions)
  // Kite faces need not be perfectly planar, so a face's normal is read as
  // the direction from the centre through its 4 vertices' average, not
  // from any one triangle - robust regardless of the (slight) crease.
  const centres = [
    ...upper.map((u, i) => [top, u, lower[i], upper[(i + 1) % 5]]),
    ...lower.map((l, i) => [bottom, l, upper[(i + 1) % 5], lower[(i + 1) % 5]]),
  ].map((quad) => quad.reduce((acc, v) => acc.add(v), new THREE.Vector3()).multiplyScalar(0.25).normalize())
  const ranked = assignAntipodalValues(centres) // 1..10, opposite faces sum to 11
  const faces = ranked.map((f) => ({ normal: f.normal, value: tens ? (f.value - 1) * 10 : f.value - 1 }))
  return { positions: flat, faces, radius: apexHeight, color: tens ? "#d35400" : "#e67e22" }
}

/** A flattened, many-sided prism ("coin"): its round rim is never a resting face, so only the two flat faces (heads/tails) are eligible. */
export function buildD2(): DieShape {
  const radius = 0.55
  const halfHeight = 0.13
  const sides = 28
  const top: THREE.Vector3[] = []
  const bottom: THREE.Vector3[] = []
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2
    top.push(new THREE.Vector3(Math.cos(a) * radius, halfHeight, Math.sin(a) * radius))
    bottom.push(new THREE.Vector3(Math.cos(a) * radius, -halfHeight, Math.sin(a) * radius))
  }
  const topCentre = new THREE.Vector3(0, halfHeight, 0)
  const bottomCentre = new THREE.Vector3(0, -halfHeight, 0)
  const positions: number[] = []
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides
    pushTriangle(positions, topCentre, top[i], top[j]) // cap
    pushTriangle(positions, bottomCentre, bottom[j], bottom[i]) // cap
    pushTriangle(positions, top[i], bottom[i], bottom[j]) // rim
    pushTriangle(positions, top[i], bottom[j], top[j]) // rim
  }
  const faces: DieFace[] = [
    { normal: new THREE.Vector3(0, 1, 0), value: 1 },
    { normal: new THREE.Vector3(0, -1, 0), value: 2 },
  ]
  return { positions: new Float32Array(positions), faces, radius, color: "#f1c40f" }
}

/** A triangular prism: only its three rectangular sides are eligible resting faces - its two triangular ends are excluded, giving three fair outcomes. */
export function buildD3(): DieShape {
  const radius = 0.5
  const halfHeight = 0.55
  const angles = [90, 210, 330].map((deg) => (deg * Math.PI) / 180)
  const top = angles.map((a) => new THREE.Vector3(Math.cos(a) * radius, halfHeight, Math.sin(a) * radius))
  const bottom = angles.map((a) => new THREE.Vector3(Math.cos(a) * radius, -halfHeight, Math.sin(a) * radius))
  const positions: number[] = []
  const faces: DieFace[] = []
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3
    pushTriangle(positions, top[i], bottom[i], bottom[j])
    pushTriangle(positions, top[i], bottom[j], top[j])
    const mid = new THREE.Vector3().addVectors(top[i], top[j]).multiplyScalar(0.5)
    faces.push({ normal: new THREE.Vector3(mid.x, 0, mid.z).normalize(), value: i + 1 })
  }
  pushTriangle(positions, top[0], top[1], top[2]) // excluded end
  pushTriangle(positions, bottom[0], bottom[2], bottom[1]) // excluded end
  return { positions: new Float32Array(positions), faces, radius: halfHeight, color: "#27ae60" }
}

/** Builds the shape for every summonable kind except `d100`, which is two `d10` bodies (see DicePage.tsx). */
export function buildDieShape(kind: Exclude<DieKind, "d100">): DieShape {
  switch (kind) {
    case "d2":
      return buildD2()
    case "d3":
      return buildD3()
    case "d4":
      return buildD4()
    case "d6":
      return buildD6()
    case "d8":
      return buildD8()
    case "d10":
      return buildD10(false)
    case "d12":
      return buildD12()
    case "d20":
      return buildD20()
  }
}

export const DIE_KINDS: readonly DieKind[] = ["d2", "d3", "d4", "d6", "d8", "d10", "d12", "d20", "d100"]
