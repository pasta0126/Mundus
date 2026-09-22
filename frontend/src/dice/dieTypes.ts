import * as THREE from "three"

/** Every die shape the tray can summon. `d100` is not built here - it is two `d10` bodies (see DicePage.tsx), one printed 00/10/.../90, one 0-9. */
export type DieKind = "d4" | "d6" | "d8" | "d10" | "d12" | "d20" | "d100"

/** A resting face eligible to be "the" face a settled die is read from. */
export interface DieFace {
  /** Outward direction in the die's own local space. */
  normal: THREE.Vector3
  /** A point on the die's surface at this face's centre, in local space - where a numeral/pip decal for this face is anchored (see decals.ts). */
  centroid: THREE.Vector3
  value: number
}

/** A die's shape and its face-value map - the single source of truth both the visual mesh and the physics collider (see DiceScene.tsx) are built from. */
export interface DieShape {
  /** Every vertex position, flattened (x,y,z,x,y,z,...) - feeds both the rendered geometry and the physics convex-hull collider, so the two can never drift apart. */
  positions: Float32Array
  /** Only the faces a settled die can be read from. */
  faces: DieFace[]
  /**
   * Set only for a die that can settle in a stable orientation touching
   * none of `faces` squarely - a d2 balanced on its rim. When set, and no
   * face's world-space normal comes within EDGE_FACE_THRESHOLD of
   * pointing straight up, the die reads as this value instead of a face's.
   */
  edgeValue?: number
  /**
   * When set, every triangle sharing one of these (normal, groupId) faces
   * gets that face's own normal written to all its vertices instead of a
   * smoothed vertex normal - flat shading, so a face built from more than
   * one triangle (a d10's kite) reads as one flat plane rather than two
   * visibly creased ones. Not needed for single-triangle-per-face shapes.
   */
  flatShadedFaceNormals?: Float32Array
  /** Roughly half the die's largest dimension - used to space dice apart when summoning and to size the tray to fit them. */
  radius: number
  /** The kind's default colour - actual dice get one from the rotating palette instead (see palette.ts); this is only a fallback. */
  color: string
}

/** A face's world-space normal must come at least this close to straight up (dot with +Y) to count as "resting on it" - below this, a shape with `edgeValue` reads as balanced on its edge instead. */
export const EDGE_FACE_THRESHOLD = 0.5

function pushTriangle(positions: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
}

interface RawFace {
  normal: THREE.Vector3
  centroid: THREE.Vector3
  samples: number
}

/**
 * Groups a triangle soup's faces by their (deduplicated) outward normal -
 * exactly right for a convex polyhedron with planar faces, where every
 * triangle belonging to the same true face shares one normal. Each face's
 * centroid is the running average of its triangles' own centroids.
 */
function facesFromTriangles(positions: Float32Array): RawFace[] {
  const faces: RawFace[] = []
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  for (let i = 0; i < positions.length; i += 9) {
    a.set(positions[i], positions[i + 1], positions[i + 2])
    b.set(positions[i + 3], positions[i + 4], positions[i + 5])
    c.set(positions[i + 6], positions[i + 7], positions[i + 8])
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
    const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3)
    const existing = faces.find((f) => f.normal.distanceTo(n) < 1e-3)
    if (existing) {
      existing.centroid.multiplyScalar(existing.samples).add(centroid)
      existing.samples += 1
      existing.centroid.divideScalar(existing.samples)
    } else {
      faces.push({ normal: n, centroid, samples: 1 })
    }
  }
  return faces
}

/**
 * Assigns 1..n to a set of faces so that antipodal faces sum to n+1 - the
 * standard-dice property the `dice-roller` spec calls out for a d6
 * ("opposite faces of a d6 sum to 7"), applied generically to every
 * even-faced die here. Every one of these shapes has full point symmetry
 * (each face has an exact antipodal partner), so this always pairs up
 * cleanly.
 */
function assignAntipodalValues(faces: RawFace[]): DieFace[] {
  const used = new Array(faces.length).fill(false)
  const out: DieFace[] = new Array(faces.length)
  let low = 1
  let high = faces.length
  for (let i = 0; i < faces.length; i++) {
    if (used[i]) continue
    used[i] = true
    out[i] = { normal: faces[i].normal, centroid: faces[i].centroid, value: low++ }
    let partner = -1
    let bestDot = 1
    for (let j = 0; j < faces.length; j++) {
      if (used[j]) continue
      const dot = faces[i].normal.dot(faces[j].normal)
      if (dot < bestDot) {
        bestDot = dot
        partner = j
      }
    }
    if (partner >= 0 && bestDot < -0.9) {
      used[partner] = true
      out[partner] = { normal: faces[partner].normal, centroid: faces[partner].centroid, value: high-- }
    }
  }
  return out
}

/** Builds a Platonic solid's shape entirely from its vertices: face normals, centroids and their fair antipodal-sum values are read straight off the triangles, so the numbering can never disagree with the rendered geometry. */
function platonicShape(geometry: THREE.BufferGeometry, radius: number, color: string): DieShape {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  const positions = (nonIndexed.attributes.position.array as Float32Array).slice()
  const faces = assignAntipodalValues(facesFromTriangles(positions))
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
  return platonicShape(new THREE.IcosahedronGeometry(0.62), 0.62, "#2980b9")
}

/**
 * A pentagonal trapezohedron - the standard d10 shape: two apexes, and two
 * pentagon rings staggered 36° apart between them, giving 10 kite faces.
 * Point-symmetric (every vertex has an exact antipode), so it gets the
 * same fair antipodal-sum numbering as the Platonic solids, reused via
 * `tens`: false for a units die (0-9), true for the tens half of a d100
 * pair (00, 10, ..., 90).
 *
 * Each kite is 2 triangles that aren't quite coplanar; `flatShadedFaceNormals`
 * carries one uniform normal per kite so it's shaded (and so reads
 * visually) as a single flat face regardless (see design.md).
 */
export function buildD10(tens: boolean): DieShape {
  const R = 0.5
  const ringHeight = 0.1
  const apexHeight = 0.62
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
  const flatNormals: number[] = []
  function pushFlatTri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3) {
    pushTriangle(positions, a, b, c)
    for (let k = 0; k < 3; k++) flatNormals.push(n.x, n.y, n.z)
  }

  const kiteCentres: THREE.Vector3[] = []
  for (let i = 0; i < 5; i++) {
    const u0 = upper[i]
    const u1 = upper[(i + 1) % 5]
    const l0 = lower[i]
    const centre = new THREE.Vector3().add(top).add(u0).add(l0).add(u1).multiplyScalar(0.25)
    const n = centre.clone().normalize()
    pushFlatTri(top, u0, l0, n)
    pushFlatTri(top, l0, u1, n)
    kiteCentres.push(centre)
  }
  for (let i = 0; i < 5; i++) {
    const l0 = lower[i]
    const l1 = lower[(i + 1) % 5]
    const u1 = upper[(i + 1) % 5]
    const centre = new THREE.Vector3().add(bottom).add(l0).add(u1).add(l1).multiplyScalar(0.25)
    const n = centre.clone().normalize()
    pushFlatTri(bottom, l0, u1, n)
    pushFlatTri(bottom, u1, l1, n)
    kiteCentres.push(centre)
  }

  const flat = new Float32Array(positions)
  const rawFaces: RawFace[] = kiteCentres.map((centre) => ({ normal: centre.clone().normalize(), centroid: centre, samples: 1 }))
  const ranked = assignAntipodalValues(rawFaces) // 1..10, opposite faces sum to 11
  const faces = ranked.map((f) => ({ normal: f.normal, centroid: f.centroid, value: tens ? (f.value - 1) * 10 : f.value - 1 }))
  return { positions: flat, faces, flatShadedFaceNormals: new Float32Array(flatNormals), radius: apexHeight, color: tens ? "#d35400" : "#e67e22" }
}

/** Builds the shape for every summonable kind except `d100`, which is two `d10` bodies (see DicePage.tsx). */
export function buildDieShape(kind: Exclude<DieKind, "d100">): DieShape {
  switch (kind) {
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

export const DIE_KINDS: readonly DieKind[] = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"]

/**
 * An orthonormal basis for `normal` as a local +Z axis, with +Y chosen from
 * world-up (or world-Z, if `normal` is nearly vertical) so a decal or
 * texture built from it reads right-side-up rather than at a random roll.
 */
export function orientationForNormal(normal: THREE.Vector3): THREE.Quaternion {
  const reference = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
  const zAxis = normal.clone().normalize()
  const xAxis = new THREE.Vector3().crossVectors(reference, zAxis).normalize()
  const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize()
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  return new THREE.Quaternion().setFromRotationMatrix(m)
}
