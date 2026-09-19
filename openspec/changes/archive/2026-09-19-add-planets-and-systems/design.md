## Context

See proposal.md - Why. Today `Mundus.Core` holds the deterministic engine
(`Rng` hashes any string seed with xmur3 and derives streams with `Child()`;
its call order is a frozen contract), controllers take `?seed=` as a query
parameter (for example `CompassController`), and generated shapes carry a
`SpecVersion` (`Map.CurrentSpecVersion`). The frontend is a single React
screen with a canvas and no router or 3D library. `nginx.conf` already falls
back to `index.html`, and there is no per-user state on the server.

## Goals / Non-Goals

**Goals:**
- Reuse `Rng` and the existing controller and versioning conventions.
- Keep the whole feature stateless: seeds in, deterministic JSON out.
- Share as much code as possible between the planet view and the system view.

**Non-Goals:**
- Any relationship to the 2D map engine (no shared biomes, no zoom into a
  planet's surface).
- Galaxies (only a future outbound link), saving systems, physical accuracy.

## Decisions

**Backend decides data, frontend paints the texture.** `Mundus.Core` returns
a small JSON description (type, palette, feature parameters, spin, moons,
orbits). The frontend draws the surface texture from the palette, a texture
seed, and the feature parameters. The description is byte-deterministic; the
texture is a soft, low-detail image, so a tiny float difference between GPUs
cannot change what a planet *is*. *Alternatives:* GPU-only generation with
only a seed (rejected: nothing to describe in the sheet, and it splits the
truth of a seed from the backend); backend-rendered PNG textures (rejected:
heavier payloads and server CPU for little gain).

**Reuse `Rng` for seeds.** The normalized text is fed to `new Rng(string)`.
Normalization (trim, collapse whitespace, invariant lower case, Unicode NFC)
happens first, in one place, so the same text never produces two seeds.
Sub-streams use `Child()`; new streams are only ever appended to keep old
seeds stable. xmur3 is only 32 bits, so two different names can, rarely,
collide; this is acceptable for a generator of this kind. (An earlier idea to
add SHA-256 was dropped because `Rng` already does the job.)

**A system is data.** A system is a central group plus an ordered list of
slots, each `{ planetSeed, planet, orbit }` (the full planet is embedded so the viewer needs no extra requests), plus an optional belt. A generated
system fills the list from its seed; a custom system takes the list from the
request. Both go through the same code and the same viewer. Slot orbits
depend only on (central seed, slot index), and planet seeds are
`<seed>/<n>`, so a custom system listing a generated system's seeds equals
it. A planet never depends on where it sits, so the same seed is the same
planet everywhere; the cost is that a lava world can land far from its star,
which is accepted.

**Motion is a pure function of time.** Each orbiting body carries radius,
period, initial phase, and inclination. The frontend computes
`position(t)` from those, starting `t` at 0 on load, so initial positions
are identical for everyone and no server-side clock is involved. Central
bodies (one or two) orbit the group's common center at small radii; planets orbit
that center rather than a single star. Inclinations are mostly zero or
small, with an occasional large tilt.

**One 3D stack for both views.** Add `three` with its orbit controls (drag to
rotate, wheel to zoom), used by the planet view and the system view alike.
The planet view adds a self-rotating sphere, cloud shell, ring and asteroid
meshes, and orbiting moons; the system view adds orbit lines, the central
group, planets, and the belt. Clicking a planet in the system view raycasts
to the planet and switches to the planet view, with a way back.

**HTTP shape follows existing conventions.** `GET /api/planets?seed=` and
`GET /api/systems?seed=` (plus optional `planets=` for a custom list and
`belt=` for the belt's slot index), each returning JSON that includes its
`SpecVersion`. Invalid seeds and over-limit lists return 400 without
generating anything.

**Routing without a big dependency.** The pages read their seed from the URL.
A small pathname switch, or a light router, chooses between the map,
`/planets`, and `/systems`; the choice is an implementation detail. The
custom system and its seeds live in the query string, so the URL is the
storage.

**Random names.** A small syllable-based generator produces a pronounceable
name used as the seed. It runs in the browser and only picks *which seed to
ask for*, so it does not touch determinism.

## Risks / Trade-offs

- [A future change to generation silently changes existing seeds] -> Separate
  `SpecVersion` for planets and for systems, bumped on any breaking change;
  the version is returned with every response.
- [xmur3 collisions between two different names] -> Accepted as very rare;
  no mitigation beyond the 32-bit space.
- [Three.js weight added to the bundle] -> Load the 3D code only for the new
  routes (lazy import) so the map page is not slowed.
- [Inclined orbits and binary stars make the system view busier] -> Keep sizes
  and speeds simple, draw orbit lines, and rely on the shared orbit controls.
- [Low-end devices with many moons, rings, and orbits] -> Bounded counts
  (at most 8 planets, 3 moons, 2 central bodies, 1 belt) and simple geometry.
- [Touch-first devices] -> Not optimized yet, consistent with the existing
  phone notice.

## Open Questions

- The exact numeric ranges (radii, periods, inclination odds, kinds' relative
  frequency) can be tuned during implementation without changing the specs,
  as long as the documented bounds hold.
