## Context

See proposal.md - Why. This design documents decisions already embodied in
`backend/src/Mundus.Core/Rng.cs`, `backend/src/Mundus.Core/World.cs`, and
`backend/src/Mundus.Api/Controllers/WorldsController.cs`; it is not
proposing new implementation work. The underlying rationale (why
xmur3+mulberry32, why named child streams, why a `specVersion` field) was
already recorded when this was first scaffolded and carries forward
unchanged - see `openspec/changes/archive/2026-09-15-establish-project-architecture/design.md`.

## Goals / Non-Goals

**Goals:**
- Make the existing `world-generation` behavior a spec of record so
  future changes to it (or new capabilities built on it, like map or
  region generation) are proposed as deltas.

**Non-Goals:**
- Any new technical decision. Map/region/universe generation design is
  out of scope for this change.

## Decisions

No new decisions - this change transcribes existing, already-implemented
and already-tested behavior into `specs/world-generation/spec.md`.

## Risks / Trade-offs

None beyond what the original architecture design already recorded
(reordering `Biome`/`WorldSize` enum values or child-stream derivation
order breaks existing seeds - now captured as a normative requirement in
the spec itself, not just a design note).
