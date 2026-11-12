# d3-video

A quality-first production system for original, **stylized 3D animated story videos**, built on Blender, Node.js, and FFmpeg.

> **Direction change:** the project moved from hybrid 2.5D to stylized 3D (see [ADR-0002](docs/DECISION-LOG.md)). The earlier 2.5D docs are preserved in [`docs/archive/2.5d`](docs/archive/2.5d/).

## Principles

- **Quality first**: character acting, cinematic composition, consistent environments, reusable assets.
- **Separate systems**: story, assets, animation, rendering, and editing evolve independently.
- **Assets are linked, shots are data**: stable asset IDs and versions; shots are JSON specs.
- **Incremental**: content-hash caching, so a change to one shot never forces a full rebuild.
- **Original**: no copying of other creators' characters, scenes, or assets.
- **Human approval** before final rendering.

## Status

| Phase | Status |
|---|---|
| 1. Art direction | **Open** (reopened for 3D): character bible and visual identity needed |
| 2. 3D foundation | Not started |
| 3. Pilot (30–60 s) | Not started |
| 4. Production engine | Scaffolded: `validate`, `jobs`, `blender/scripts/assemble_shot.py` (untested) |
| 5–6. QA system, full production | Not started |

## Agent skill

The repository includes [`generate-3d-video`](.agents/skills/generate-3d-video/SKILL.md), an agent workflow designed around a simple input contract:

- `script.md`
- `voiceover.wav` (or another supported audio format)

The skill directs an agent through audio analysis and script alignment, story direction, timed shot planning, reusable asset resolution, Blender scene production, preview/final rendering, visual QA, and final video assembly. See its [production pipeline](.agents/skills/generate-3d-video/workflows/production-pipeline.md).

**Current implementation boundary:** audio probing and phrase-level transcription are implemented through FFprobe + Whisper.cpp. Shot planning, Blender animation/rendering, visual QA automation, and final editing remain incomplete/scaffolded; the skill must report blocked stages rather than fabricate a finished render.

## Quick start

Requires Node.js ≥ 20. Audio analysis additionally requires FFprobe, Whisper.cpp `whisper-cli`, and a downloaded Whisper.cpp model. Blender is only needed for assembling/rendering shots.

```bash
npm install
npm test                       # schema, reference, and caching tests
npm run validate               # assets + project config + shots
npm run validate:strict        # pre-final-render gate: assets must be approved with real files
npm run jobs -- --quality preview   # which shots need rendering vs cached\nnpm run analyze-audio -- --project pilot-video --audio projects/pilot-video/audio/voiceover.wav --script projects/pilot-video/script/script.md --model models/ggml-base.en.bin
```

Assemble a single shot (needs Blender and real asset `.blend` files):

```bash
blender -b -P blender/scripts/assemble_shot.py -- \
  --shot projects/pilot-video/shots/shot_001.json \
  --project projects/pilot-video/project.json \
  --out projects/pilot-video/scenes/shot_001.blend
```

Audio analysis writes `projects/<name>/analysis/transcript.json` with media metadata, phrase timestamps, inter-phrase gaps, and a script/transcript token comparison. Set `WHISPER_MODEL` to use a default model path, or pass `--model` as shown. The original audio and script are not modified.\n\n## Docs

[Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Art Direction](docs/ART-DIRECTION.md) · [Character Bible](docs/CHARACTER-BIBLE.md) · [Asset Standards](docs/ASSET-STANDARDS.md) · [Shot Specification](docs/SHOT-SPECIFICATION.md) · [Quality Standards](docs/QUALITY-STANDARDS.md) · [Decision Log](docs/DECISION-LOG.md)

## Relationship to d2-video

`d2-video` stays separate and stable. We reuse its proven concepts (script processing, voiceover/timing, orchestration, visual QA workflow) and replace its 2D renderer, character system, and composition assets.
