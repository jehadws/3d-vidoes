# Production Pipeline

This workflow defines the end-to-end state machine for one narrated 3D video.

## Stage 0 — Preflight

- Identify project root and supplied script/audio.
- Read repository guidance and project configuration.
- Check Blender, FFmpeg, Node.js, Python, GPU/render devices, FFprobe, and transcription tools.
- Run tests and validation; record baseline failures.
- Check asset registry and existing project outputs.
- Create a run manifest with inputs, versions, settings, and start state.

**Gate:** Do not start rendering if required tools or inputs are missing. Continue with planning where possible and report blockers precisely.

## Stage 1 — Narration analysis

Run the audio analyzer:

```bash
npm run analyze-audio -- --project NAME --audio FILE --script FILE --model MODEL
```

Deliver a timestamped transcript, media metadata, pauses, and script/transcript comparison.

**Gate:** All spoken content must be accounted for. Resolve severe script/audio mismatches and mark uncertain alignment rather than inventing timestamps.

## Stage 2 — AI story direction and shot planning

Configure `STORY_DIRECTOR_API_KEY` and `STORY_DIRECTOR_MODEL`; optionally configure `STORY_DIRECTOR_API_URL`. Run:

```bash
npm run direct-story -- --project NAME
```

Review `projects/NAME/story/shot-plan.json`. The director creates a premise, audience promise, motifs, emotional progression, beat sheet, timed shots, camera/acting/composition intent, and continuity notes.

**Gate:** The plan must pass JSON Schema, narration coverage, timing, reference, and asset compatibility checks. Human review still decides whether the story and visual direction are good.

## Stage 3 — Asset resolution and look development

- Search the asset registry before creating anything.
- Reuse approved character rigs, animation clips, environments, props, materials, and lighting setups.
- Record asset IDs and versions used by each shot.
- If a required asset is missing, create a minimal look-dev test before building a large asset.
- Confirm character scale, face readability, material response, lighting, and camera language.

**Gate:** Hero assets must pass visual review before use throughout the project. Concept assets are not final-render-ready.

## Stage 4 — Scene assembly and animation

- Build scenes from structured shot data.
- Keep one authoritative camera and shot configuration per shot.
- Use deterministic scripts and explicit Blender settings.
- Animate acting beats, anticipation, holds, reactions, and transitions intentionally.
- Verify rig constraints, contact points, foot placement, prop interaction, and camera clipping.
- Save reusable scene/asset files and record dependencies.

**Gate:** A Blender file existing on disk does not make a shot complete. It must render and pass visual review.

## Stage 5 — Preview rendering

- Render low-cost previews at configured preview quality.
- Generate contact sheets grouped by sequence.
- Review still frames and motion.
- Fix staging, animation, continuity, lighting, and timing before final rendering.
- Re-render only changed shots when caching allows it.

**Gate:** Do not spend final-render resources on shots with unresolved blocking defects.

## Stage 6 — Final rendering and edit

- Render approved shots at final project settings.
- Confirm frame count and duration for every shot.
- Assemble shots in timeline order and place the original voiceover against the aligned timeline.
- Add music, SFX, and captions only when tools/assets are available and rights are clear.
- Keep narration intelligible; avoid clipping and abrupt level changes.
- Use FFmpeg or the editing layer for final assembly.

**Gate:** The assembled video must have intended duration and no missing or duplicated shots.

## Stage 7 — Final QA and delivery

- Verify output exists and is readable.
- Probe codec, dimensions, frame rate, duration, and audio streams.
- Check opening, ending, transitions, sync, and representative frames throughout.
- Review the entire video when practical; never describe sampled-frame inspection as full review.
- Save QA evidence and a production report.
- Deliver the exact output path and distinguish completed stages from blocked ones.
