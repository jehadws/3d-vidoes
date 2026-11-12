---
name: generate-3d-video
description: Produce a complete stylized 3D narrated video from a script and voiceover audio. Use when the user supplies a script and narration audio and asks for a finished animated video, a pilot, or production-ready shots.
---

# Generate a 3D Video

## Mission

Turn a supplied script and voiceover audio into a coherent, original, stylized 3D animated video. The target deliverable is a reviewed, edited video file—not merely a storyboard or a set of still images.

## First: inspect the repository and available tools

1. Read the README, architecture, art direction, quality standards, shot specification, roadmap, and decision records.
2. Inspect the current project, schemas, asset registry, Blender scripts, CLI commands, and tests.
3. Detect Node.js, Blender, FFmpeg, Python, FFprobe, Whisper.cpp, and available GPU/render devices. Never assume a tool is installed.
4. Run baseline tests and validation; separate pre-existing failures from new failures.
5. Preserve the repository's original visual identity. Use references as high-level guidance only.

## Inputs and defaults

Normally the user supplies:
- A script file (prefer `script.md`).
- A voiceover file (WAV preferred; use another format only if installed tools support it).

Use the project's configured frame rate and resolution. The pilot defaults to 30 fps and 1920×1080. Never silently change global settings or overwrite source media.

Keep project artifacts under `projects/<project-name>/`:
- `script/` and `audio/` — source inputs.
- `analysis/transcript.json` — transcript and timing evidence.
- `story/shot-plan.json` — AI-directed beats and timed shots.
- `shots/` — renderer-compatible shot specs when generated.
- `scenes/`, `renders/`, `qa/`, and `output/` — production outputs and evidence.

Adapt to existing project conventions instead of creating duplicate structures.

## Production workflow

Follow [the production pipeline](workflows/production-pipeline.md) in order:

1. Preflight tools, inputs, project configuration, tests, and assets.
2. Analyze narration with `npm run analyze-audio -- --project NAME --audio FILE --script FILE --model MODEL`.
3. Generate the story and timed shot plan with `npm run direct-story -- --project NAME`. Configure `STORY_DIRECTOR_API_KEY`, `STORY_DIRECTOR_MODEL`, and optionally `STORY_DIRECTOR_API_URL`. The default endpoint is OpenAI-compatible chat completions.
4. Review the beat/shot plan and resolve missing or concept-status assets. Do not treat a valid plan as approval of the art direction.
5. Build and animate Blender scenes only with real approved assets and supported rig actions.
6. Render previews, inspect contact sheets and motion, correct defects, then obtain human approval.
7. Render finals, assemble narration/video/audio, and perform technical and visual QA.
8. Deliver the verified output path and a production report.

Read the corresponding workflow before each stage:
- [Audio analysis](workflows/audio-analysis.md)
- [Visual direction and shot planning](workflows/visual-direction.md)
- [Blender production](workflows/blender-production.md)
- [Quality assurance](workflows/quality-assurance.md)

## Direction rules

- Think in story beats, not one shot per sentence.
- Narration is the timing backbone; never invent or silently omit spoken content.
- Favor expressive acting, readable silhouettes, deliberate camera placement, and coherent environments.
- Maintain screen direction, spatial continuity, identity, prop state, lighting logic, and scale.
- Reuse approved assets. Use only registered animation clips and expressions.
- Use authored animation for important acting; procedural motion is supplementary.
- Vary shot sizes and motivate camera movement.
- Do not generate unrelated AI still images and present them as continuous 3D animation.
- Do not copy another creator's characters, scenes, assets, overlays, or exact compositions.

## Execution and autonomy

- Execute every stage the repository and installed tools genuinely support.
- Implement a small reusable component when a capability is missing and it fits the task; otherwise create an explicit handoff artifact.
- Do not claim a scene was animated, rendered, reviewed, or assembled unless the artifact exists and was inspected.
- Never replace a failed stage with a fabricated placeholder final video.
- Use previews before expensive final renders. Cache by source/configuration/asset content where supported.
- Keep a production log with commands, tool versions, warnings, failures, and completed stages.
- Never overwrite source audio, source script, or approved assets.
- Do not commit large renders or source media unless explicitly tracked by the repository.

## Approval and destructive actions

Human approval is required for major art-direction changes, irreversible asset replacement, final render approval, and publishing. Do not publish to a public platform unless explicitly requested.

## Completion report

Report only verified facts:
- Final video path, duration, resolution, and frame rate.
- Planned, rendered, and approved shot counts.
- Audio alignment and QA status.
- Blocked stages and why.
- Tests and validation commands actually run.

A storyboard, plan, preview, or unreviewed render is not a finished-video deliverable.
