# d3-video

A quality-first production system for original, **stylized 3D animated story videos**, built on Blender, Node.js, and FFmpeg.

> **Direction:** stylized 3D (see [Decision Log](docs/DECISION-LOG.md)). Earlier 2.5D material is preserved in [docs/archive/2.5d](docs/archive/2.5d/).

## Principles

- Quality first: expressive character acting, cinematic composition, coherent environments, reusable assets.
- Separate story direction, asset management, animation, rendering, editing, and QA.
- Assets are linked by stable IDs and versions; shots are structured data.
- Incremental rendering uses content hashes to avoid rebuilding unchanged shots.
- Original visual identity; references are high-level guidance, never templates to copy.
- Human review and approval before final rendering or publishing.

## Implementation status

| Capability | Status |
|---|---|
| Audio probing + phrase transcription | Implemented (FFprobe + Whisper.cpp) |
| Script/transcript comparison + pause map | Implemented |
| AI story direction + timed shot plan | Implemented in this branch; requires a configured chat-completions provider |
| Schema/timeline validation | Implemented for story plans, assets, projects, and legacy shot specs |
| Asset registry + render cache planning | Implemented |
| Blender scene assembly | Starter only; real asset linking and animation are not production-verified |
| Character rig, authored animation library, environment/prop library | Not production-ready |
| Automated rendering, compositing, editing, audio mix | Incomplete |
| Motion QA, contact sheets, final-video QC | Incomplete |
| End-to-end production of a 5–8 minute video | Not yet production-ready |

A passing plan validation is not a rendered or visually approved video. The current repository is an evolving production engine, not yet a push-button end-to-end renderer.

## Quick start

Requires Node.js 20+. Install dependencies:

```bash
npm ci
npm test
npm run validate
```

### 1. Analyze narration

Requires FFprobe, Whisper.cpp `whisper-cli`, and a local Whisper.cpp model:

```bash
npm run analyze-audio -- --project pilot-video --audio projects/pilot-video/audio/voiceover.wav --script projects/pilot-video/script/script.md --model models/ggml-base.en.bin
```

This writes `projects/<project>/analysis/transcript.json` with audio metadata, phrase timestamps, pauses, and script comparison. Source script and audio remain unchanged.

### 2. Generate the AI story and shot plan

Configure an OpenAI-compatible chat-completions endpoint. The default endpoint is OpenAI; alternative providers can supply a compatible endpoint URL.

PowerShell:

```powershell
$env:STORY_DIRECTOR_API_KEY = "your-api-key"
$env:STORY_DIRECTOR_MODEL = "your-model"
# Optional; default is https://api.openai.com/v1/chat/completions
$env:STORY_DIRECTOR_API_URL = "https://api.openai.com/v1/chat/completions"

npm run direct-story -- --project pilot-video
```

The command reads the script and analyzed transcript, inventories registered assets, requests a structured plan, validates it locally, and writes:

```
projects/pilot-video/story/shot-plan.json
```

Optional flags: `--script FILE`, `--transcript FILE`, `--output FILE`, and `--director-model MODEL`. The API key is read only from the environment and is never written to the plan. A plan is rejected if it contains unknown narration references, duplicate IDs, invalid timing, overlapping beats/shots, missing beat coverage, or shots that do not represent every narration segment.

### 3. Validate and inspect render jobs

```bash
npm run validate
npm run jobs -- --quality preview
npm run validate:strict
npm run jobs -- --quality final
```

Strict validation intentionally fails until all production assets are approved and their source/preview files exist.

## Blender look development

Python 3.11 + Blender's `bpy` are required:

```bash
pip install -r blender/requirements.txt
python blender/scripts/lookdev.py --out renders/lookdev --res 1280x720 --samples 32
```

The current `assemble_shot.py` is a foundation script, not a complete animation renderer. It still needs real approved asset libraries, rig/action application, camera animation, lighting presets, and render orchestration before it can be used for final production.

## Production architecture

See [Architecture](docs/ARCHITECTURE.md), [Roadmap](docs/ROADMAP.md), [Art Direction](docs/ART-DIRECTION.md), [Character Bible](docs/CHARACTER-BIBLE.md), [Asset Standards](docs/ASSET-STANDARDS.md), [Shot Specification](docs/SHOT-SPECIFICATION.md), and [Quality Standards](docs/QUALITY-STANDARDS.md).

The `generate-3d-video` agent skill documents the full intended workflow. It must report incomplete stages honestly and must never label a storyboard, preview, or unreviewed render as a finished video.

## Relationship to d2-video

`d2-video` remains separate. This repository reuses proven ideas for script processing, voiceover timing, orchestration, and visual QA while developing an original 3D character, asset, and Blender pipeline.
