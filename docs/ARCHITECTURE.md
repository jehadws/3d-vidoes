# Architecture

Direction: **Stylized 3D · Quality first.** Blender-based, asset-driven production engine focused on character acting, cinematic composition, consistent environments, and reusable assets. This is a production system for complete animated stories, not a 2D-to-3D converter.

## Pipeline

1. **Story & narration** — script, voiceover, timing, story beats
2. **Visual planning** — storyboard, shot list, camera, acting, continuity
3. **Reusable 3D asset library** — characters & rigs, props, environments, materials & lighting
4. **Scene assembly & animation** — Blender: rigging, acting, camera, lighting
5. **Rendering & compositing** — preview, final, grading, effects
6. **Editing & QA** — voiceover, music, SFX, captions, final QC

Principle: story, assets, animation, rendering, and editing are **separate systems** so quality can improve without rewriting the pipeline.

## Stack

| Component | Technology | Responsibility |
|---|---|---|
| Orchestration | Node.js | Pipeline, jobs, manifests |
| 3D engine | Blender | Scene creation and animation |
| Automation | Blender Python API | Asset and scene generation |
| Final render | Cycles | High-quality output |
| Preview render | Eevee | Fast iteration |
| Compositing | Blender compositor | Final polish |
| Video assembly | FFmpeg | Audio, captions, encoding |
| Validation | Node.js + Python | Automated QA |

## Repository map

| Path | Purpose |
|---|---|
| `apps/production` | CLI and orchestration (`validate`, `jobs`) |
| `apps/dashboard` | Future production UI |
| `packages/story, storyboard, shot-planner` | Scripts, visual planning, shot specs |
| `packages/assets` | Asset registry and resolution (**implemented**) |
| `packages/quality` | Schema + reference validation (**implemented**) |
| `packages/rendering` | Cache keys and job planning (**implemented**) |
| `packages/blender, animation, compositing, editing` | Placeholders (Phase 4+) |
| `assets/` | Source-of-truth reusable assets, each with `metadata.json` |
| `blender/` | Templates, scripts, rigs, render presets |
| `projects/<name>/` | Per-video script, audio, shots, scenes, renders, output |
| `schemas/` | JSON Schemas for assets, shots, projects |

## Key decisions

- **Assets are linked, not duplicated.** Every asset has a stable ID, semver version, and status. See [ASSET-STANDARDS.md](ASSET-STANDARDS.md).
- **Shots are data, not code.** A shot is a JSON spec; the planner decides what to show, Blender assembles it. See [SHOT-SPECIFICATION.md](SHOT-SPECIFICATION.md).
- **Authored animation first, procedural second.** Authored clips are the foundation; procedural motion extends them (secondary motion, variation). Fully procedural acting is avoided.
- **Incremental builds.** Each shot has a content-hash cache key (shot spec + resolved asset versions + render preset). Only shots with a changed key re-render; failed jobs resume.
- **Blender files organized by sequence**, one collection + camera per shot.
- **Human approval gate** before final (Cycles) rendering. See [QUALITY-STANDARDS.md](QUALITY-STANDARDS.md).

## Relationship to d2-video

`d2-video` stays stable and separate. Reuse its proven concepts (script processing, voiceover/timing, orchestration, project config, visual QA workflow); replace its 2D renderer, character system, and composition assets with Blender equivalents.
