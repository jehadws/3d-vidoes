---
name: generate-3d-video
description: Produce a complete stylized 3D narrated video from a script and voiceover audio. Use when the user supplies a script and narration audio and asks for a finished animated video, a pilot, or production-ready shots.
---

# Generate a 3D Video

## Mission

Turn a supplied script and voiceover audio into a coherent, original, stylized 3D animated video. The user should normally need to provide only:

- A script file (prefer `script.md`).
- A voiceover audio file (WAV preferred; MP3/M4A accepted if the available tools support them).

Take ownership of the production workflow. Do not stop after writing a storyboard or generating still images. The target deliverable is a reviewed, edited video file.

## First: inspect the repository and available tools

1. Read the repository `README.md`, `docs/ARCHITECTURE.md`, `docs/ART-DIRECTION.md`, `docs/QUALITY-STANDARDS.md`, `docs/SHOT-SPECIFICATION.md`, `docs/ROADMAP.md`, and relevant decision records.
2. Inspect the current project, schemas, asset registry, Blender scripts, CLI commands, and tests before changing anything.
3. Detect available versions and executables: Node.js, Blender, FFmpeg, and audio-analysis/transcription tools. Do not assume they are installed.
4. Run the existing validation and test commands before production work. Record failures separately from failures introduced by this run.
5. Preserve the repository's original visual identity. Treat reference analysis as high-level guidance only; do not copy another creator's characters, scenes, assets, overlays, or exact compositions.

## Inputs and defaults

Find the script and audio in the user's specified paths. If paths are not specified, inspect the current project directory for an obvious script and audio pair. Ask only if either required input is genuinely missing or ambiguous.

Use the project's configured frame rate and resolution. The current pilot target is 30 fps and 1920x1080 unless project configuration says otherwise. Do not silently change global project settings.

Create or update a project directory under `projects/<project-name>/`. Keep source inputs intact. Suggested working layout:

- `script.md` — copied or linked source script, never destructively rewritten.
- `audio/voiceover.<ext>` — source narration.
- `analysis/transcript.json` — transcript and timing evidence.
- `story/beat-sheet.md` — narrative beats and visual intent.
- `storyboard/shot-list.json` — timed shot plan.
- `scenes/` — shot/sequence scene data and Blender files as supported.
- `renders/preview/` and `renders/final/` — rendered shots.
- `qa/` — contact sheets, review notes, scores, and issue list.
- `output/final-video.mp4` — final assembled deliverable.

Adapt to existing project conventions instead of creating duplicate structures.

## Production workflow

Follow [the production pipeline](workflows/production-pipeline.md) in order:

1. Analyze narration and align script text to audio time.
2. Build a story beat sheet and visual direction.
3. Plan a varied, continuous sequence of shots.
4. Resolve reusable characters, environments, props, materials, and animation assets.
5. Build and animate Blender scenes using the repository's supported scripts and schemas.
6. Render previews, inspect evidence, correct issues, then render approved shots.
7. Assemble narration, shots, audio mix, and captions where supported.
8. Validate the final video and report the exact output path.

Read the relevant workflow document before each stage:
- [Audio analysis](workflows/audio-analysis.md)
- [Visual direction and shot planning](workflows/visual-direction.md)
- [Blender production](workflows/blender-production.md)
- [Quality assurance](workflows/quality-assurance.md)

## Direction rules

- Think in story beats, not one shot per sentence. A single sentence may need multiple visual moments; several short sentences may share one shot.
- The narration is the timing backbone. Align shot boundaries to meaning, pauses, emphasis, and changes in visual intent.
- Favor character acting, readable silhouettes, expressive poses, deliberate camera placement, and coherent environments over decorative complexity.
- Maintain screen direction, spatial continuity, character identity, prop continuity, lighting logic, and consistent scale.
- Reuse approved assets. Do not invent a new protagonist design or rebuild an existing environment in every shot.
- Use authored animation and rig controls for important acting. Procedural motion is supplementary, not a substitute for intentional performance.
- Use varied shot sizes and motivated camera movement. Avoid random cuts, constant camera motion, and repetitive framing.
- Keep visual effects and overlays editable separately when the existing pipeline supports it.
- Do not generate a sequence of unrelated AI still images and present it as continuous 3D animation.

## Execution and autonomy

- Execute every stage that the repository and installed tools genuinely support.
- When a capability is missing, implement the smallest safe reusable component if it fits the current task; otherwise produce a clearly labeled handoff artifact and continue with other stages.
- Do not claim a scene was animated, rendered, reviewed, or assembled unless the corresponding artifact exists and was inspected.
- Do not replace failed production with a fabricated placeholder final video.
- Use preview renders and contact sheets before expensive final renders.
- Cache by source/configuration/asset content where supported. Re-render only affected shots.
- Keep a production log with commands, tool versions, warnings, failures, and completed stages.
- Never overwrite source audio, source script, or existing approved assets.
- Do not commit generated large renders or source media unless the repository explicitly tracks them.

## Approval and destructive actions

Follow repository approval gates. Human approval is required for major art-direction changes, irreversible asset replacement, publishing, or destructive changes. Do not publish a video to a public platform unless the user explicitly requests it.

## Completion report

Report:
- Final video path, duration, resolution, and frame rate (only when verified).
- Number of planned, rendered, and approved shots.
- Audio alignment and final QA status.
- Important issues or stages that could not be completed.
- Tests and validation commands actually run.

A storyboard, preview, or collection of frames is not the finished-video deliverable. Clearly label partial outputs.
