# Production Pipeline

This workflow defines the end-to-end state machine for one narrated 3D video.

## Stage 0 — Preflight

- Identify the project root and supplied script/audio.
- Read repository guidance and project configuration.
- Check Blender, FFmpeg, Node.js, Python, available GPU/render devices, and audio tools.
- Run existing tests and validation.
- Check asset registry and prior project outputs.
- Create a run manifest recording inputs, versions, settings, and start state.

**Gate:** Do not start rendering if required tools or inputs are missing. Continue with planning where possible and report blockers precisely.

## Stage 1 — Narration analysis

Follow `audio-analysis.md`.

Deliver:
- Transcript with timestamps and confidence/source metadata.
- Audio duration, sample rate, channels, and loudness information where available.
- Pause/emphasis map.
- Script-to-audio alignment report.
- Segments suitable for story beats.

**Gate:** All spoken content must be accounted for. Mark uncertain alignment rather than inventing timestamps.

## Stage 2 — Story direction

Follow `visual-direction.md`.

Deliver:
- One-sentence premise and audience promise.
- Beat sheet with narration ranges.
- Visual motif and emotional progression.
- Character/environment/prop requirements.
- Continuity notes and ending image.

**Gate:** The visuals must explain, dramatize, or emotionally support the narration rather than merely illustrate each word.

## Stage 3 — Shot planning

Deliver a structured shot list using the repository schema. Each shot should include:
- Stable ID and duration.
- Start/end time and narration segment references.
- Environment and required assets.
- Character action, expression, and staging.
- Camera framing, angle, and movement.
- Lighting and visual effects.
- Transition in/out and continuity constraints.
- Production status and QA status.

Durations must fit the voiceover timeline. Avoid gaps or overlaps unless intentionally specified.

**Gate:** Validate every shot against the current schema before Blender assembly.

## Stage 4 — Asset resolution and look development

- Search the asset registry before creating anything.
- Reuse approved character rigs, animation clips, environments, props, materials, and lighting setups.
- Record all asset IDs and versions used by each shot.
- If a required asset is missing, create a minimal look-dev test before building a large asset.
- Confirm character scale, face readability, material response, lighting, and camera language.

**Gate:** New hero assets must pass a visual review before being used throughout the project.

## Stage 5 — Scene assembly and animation

- Build scenes from structured shot data.
- Keep one authoritative camera and shot configuration per shot.
- Use deterministic scripts and explicit Blender settings.
- Animate acting beats, anticipation, holds, reactions, and transitions intentionally.
- Verify rig constraints, contact points, foot placement, prop interaction, and camera clipping.
- Save reusable scene/asset files and record dependencies.

**Gate:** A shot is not complete because its Blender file exists; it must render successfully and pass visual review.

## Stage 6 — Preview rendering

- Render low-cost previews at the configured preview quality.
- Generate contact sheets grouped by sequence.
- Review both individual frames and motion over time.
- Fix staging, animation, continuity, lighting, and timing before final rendering.
- Re-render only changed shots when caching allows it.

**Gate:** Do not spend final-render resources on shots with unresolved blocking defects.

## Stage 7 — Final rendering and edit

- Render approved shots at final project settings.
- Confirm frame count and duration for every shot.
- Assemble shots in timeline order.
- Place the original voiceover against the aligned timeline.
- Add music, SFX, and captions only when assets/tools are available and rights are clear.
- Keep narration intelligible; avoid clipping and abrupt level changes.
- Use FFmpeg or the repository's editing layer for final assembly.

**Gate:** The assembled video must have the intended duration and no missing or duplicated shots.

## Stage 8 — Final QA and delivery

Follow `quality-assurance.md`.

- Verify output file exists and is readable.
- Probe codec, dimensions, frame rate, duration, and audio streams.
- Check opening, ending, transitions, sync, and representative frames throughout.
- Review the entire video when practical; never describe sampled-frame inspection as full review.
- Save QA evidence and a production report.
- Deliver the exact output path and distinguish completed stages from blocked ones.
