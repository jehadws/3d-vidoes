# d3-video

A quality-first production system for original, **stylized 3D animated story videos**, built on Blender, Node.js, and FFmpeg.

> **Direction:** stylized 3D (see [Decision Log](docs/DECISION-LOG.md)). Earlier 2.5D material is preserved in [docs/archive/2.5d](docs/archive/2.5d/).

## User workflow

The user provides only:
1. The script.
2. The matching voiceover audio.

The `generate-3d-video` skill handles the complete production pipeline: local transcription and alignment, story direction, shot planning, reusable asset creation, Blender scene assembly, animation, preview/final rendering, sound design, editing, QA, and MP4 delivery.

No separate story-director API, hosted model provider, API key, or third-party generation service is required. Local tools such as Blender, FFmpeg/FFprobe, and Whisper.cpp are production dependencies.

## Principles

- Quality first: expressive character acting, cinematic composition, coherent environments, reusable assets.
- Story direction and production orchestration happen inside the agent skill.
- Assets are linked by stable IDs and versions; shots are structured data.
- Incremental rendering uses content hashes to avoid rebuilding unchanged shots.
- Original visual identity; references are high-level guidance, never templates to copy.
- Source script and voiceover remain unchanged.
- A passing plan or preview is not a finished video.

## Implementation status

| Capability | Status |
|---|---|
| Audio probing + local phrase transcription | Implemented (FFprobe + Whisper.cpp) |
| Script/transcript comparison + pause map | Implemented |
| Story-plan schema and local validation | Implemented |
| AI story direction inside the skill | Skill workflow; agent authors the plan directly |
| Asset registry + render cache planning | Implemented |
| Procedural rigged protagonist + pose actions | First vertical-slice implementation; Blender runtime validation pending |
| Procedural indoor/outdoor set dressing + lighting | First vertical-slice implementation; visual approval pending |
| Shot camera motion + per-shot Blender MP4 render | Implemented in the vertical-slice renderer; runtime validation pending |
| Voiceover mux + output stream/duration checks | Implemented in the local pilot orchestrator; runtime validation pending |
| Contact sheets, motion QA, human visual approval | Incomplete |
| Full 30–60 second pilot | Not yet produced and reviewed |
| End-to-end production of a 5–8 minute video | Not yet production-ready |

The current branch adds an executable first renderer, but the full workflow is not considered production-ready until Blender rendering is exercised on a real machine and the resulting motion is visually reviewed.

## Quick start

Requires Node.js 20+, Python 3.11+, Blender, FFmpeg, and FFprobe. Install dependencies and run the checks:

```bash
npm ci
npm test
npm run validate
python -m unittest tests/test_render_pilot.py
```

Provide the script and voiceover to the `generate-3d-video` skill. The skill derives the project name, uses configured project defaults, and runs the full workflow. No API setup is required.

### Local audio dependencies

Audio analysis uses FFprobe, Whisper.cpp `whisper-cli`, and a local Whisper.cpp model. Set `WHISPER_CLI`, `FFPROBE`, or `WHISPER_MODEL` only when the local executable/model is not on its default path. These are local tool configuration values, not external service credentials.

The transcript is written to `projects/<project>/analysis/transcript.json`; source audio and script are preserved.

### Story-plan validation

The agent writes `projects/<project>/story/shot-plan.json` and validates it with:

```bash
npm run validate:story -- --project <project>
```

The validator checks schema, narration coverage, timing, beat/shot relationships, overlaps, gaps, and registered asset/animation/expression references. The skill then converts approved story shots into renderer shot specs in `projects/<project>/shots/`.

### First Blender vertical slice

The current renderer creates a rigged stylized protagonist, pose-based walking/talking/reacting/pointing/idle actions, a procedural environment, a moving camera, lighting, and one H.264 MP4 per shot. The local orchestrator concatenates shots, muxes the original voiceover, and verifies the final media streams and duration.

```bash
npm run render:pilot -- --project <project> --audio path/to/voiceover.wav --quality preview
```

Use `--quality final` after the preview has been visually reviewed. Shot durations must cover the voiceover duration; the renderer refuses to silently stretch or cut narration. The current renderer is a first vertical slice, not a replacement for approved reusable asset libraries, contact-sheet review, or the complete production QA system.

### Blender look development

Python 3.11 + Blender's `bpy` are required:

```bash
pip install -r blender/requirements.txt
python blender/scripts/lookdev.py --out renders/lookdev --res 1280x720 --samples 32
```

The older `assemble_shot.py` remains a starter asset-linking path. The first runnable procedural shot renderer is `blender/scripts/vertical_slice.py`, orchestrated by `blender/scripts/render_pilot.py`.

## Production architecture

See [Architecture](docs/ARCHITECTURE.md), [Roadmap](docs/ROADMAP.md), [Art Direction](docs/ART-DIRECTION.md), [Character Bible](docs/CHARACTER-BIBLE.md), [Asset Standards](docs/ASSET-STANDARDS.md), [Shot Specification](docs/SHOT-SPECIFICATION.md), and [Quality Standards](docs/QUALITY-STANDARDS.md).

The `generate-3d-video` agent skill defines the user-facing workflow and must report incomplete stages honestly.
