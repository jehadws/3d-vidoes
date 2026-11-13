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
| Blender scene assembly | Starter only; real asset linking and animation are not production-verified |
| Character rig, authored animation library, environment/prop library | Not production-ready |
| Automated rendering, compositing, editing, audio mix | Incomplete |
| Motion QA, contact sheets, final-video QC | Incomplete |
| End-to-end production of a 5–8 minute video | Not yet production-ready |

The current repository is an evolving production engine, not yet a verified push-button end-to-end renderer. The skill must execute supported stages and report blockers honestly.

## Quick start

Requires Node.js 20+. Install dependencies and run the checks:

```bash
npm ci
npm test
npm run validate
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

The validator checks schema, narration coverage, timing, beat/shot relationships, overlaps, gaps, and registered asset/animation/expression references.

## Blender look development

Python 3.11 + Blender's `bpy` are required:

```bash
pip install -r blender/requirements.txt
python blender/scripts/lookdev.py --out renders/lookdev --res 1280x720 --samples 32
```

The current `assemble_shot.py` is a foundation script, not a complete animation renderer. It still needs real approved asset libraries, rig/action application, camera animation, lighting presets, and render orchestration before it can be used for final production.

## Production architecture

See [Architecture](docs/ARCHITECTURE.md), [Roadmap](docs/ROADMAP.md), [Art Direction](docs/ART-DIRECTION.md), [Character Bible](docs/CHARACTER-BIBLE.md), [Asset Standards](docs/ASSET-STANDARDS.md), [Shot Specification](docs/SHOT-SPECIFICATION.md), and [Quality Standards](docs/QUALITY-STANDARDS.md).

The `generate-3d-video` agent skill defines the user-facing workflow and must report incomplete stages honestly.
