## 1. Verify existing implementation against the spec

- [x] 1.1 Run `dotnet test` in `backend/` and verify all `RngTests` and `WorldGeneratorTests` pass, confirming the determinism, sub-stream, and bounds scenarios in `specs/world-generation/spec.md` already hold
- [x] 1.2 Re-read `Rng.cs`, `World.cs`, and `WorldsController.cs` side by side with `specs/world-generation/spec.md` and verify every requirement's scenarios match actual behavior (no code changes expected; note any mismatch found)
- [x] 1.3 Manually verify `GET /api/Worlds/{seed}` against the running API (local or `https://mundus.northernarchive.com`) for the HTTP scenarios: same seed twice returns the same body, size/biome render as strings

## 2. Close out

- [x] 2.1 Run `openspec validate add-world-generation-spec --strict` and verify it passes
- [x] 2.2 Archive the change with `openspec archive add-world-generation-spec` and verify `openspec/specs/world-generation/spec.md` is created from it
