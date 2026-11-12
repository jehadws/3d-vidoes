# Decision Log

| ID | Decision | Status |
|---|---|---|
| ADR-0001 | Hybrid 2.5D direction (illustrated 2D in layered 3D space); toolchain open | **Superseded** by ADR-0002. Docs preserved in [`archive/2.5d/`](archive/2.5d/). |
| ADR-0002 | Stylized 3D, quality-first. Blender-based, asset-driven production engine. | **Accepted** |

## ADR-0002 — Pivot to stylized 3D

**Decision:** d3-video is a stylized **3D** animated-story production system built on Blender (Python API), Cycles (final) / Eevee (preview), FFmpeg, and a Node.js orchestration layer.

**What changes:** the medium (2.5D → 3D), the toolchain (open → Blender + Node + FFmpeg), and the 2.5D art/quality docs (archived).

**What carries over from ADR-0001:**
- Originality is mandatory: original character, silhouettes, palettes, props, environments. References guide broad principles only.
- Quality over throughput; judged at delivery size, never from documentation or placeholders.
- Character-led storytelling, one clear beat per shot.
- The rejected SVG board remains rejected.

**Rule kept from ADR-0001, adapted:** do not build the full production engine before the visual direction is proven. Phases 1–3 (art direction, 3D foundation, pilot) come before Phase 4 automation. The scaffold in this repo is deliberately thin: schemas, validation, and cache-keyed job planning only.

**Consequences:** Phase 1 (art direction) is **reopened** for 3D. The provisional character and palette from the 2.5D docs are not approved.
