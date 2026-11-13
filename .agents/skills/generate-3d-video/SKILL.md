---
name: generate-3d-video
description: >
  Use when the user supplies a script and its voiceover audio and wants a complete stylized 3D animated video.
  The user inputs only the script and voiceover; this skill handles transcription, story direction, shot planning,
  asset creation, Blender scene production, rendering, sound design, editing, QA, and final delivery autonomously.
---

# Generate a 3D Video — Full Production Skill

## Mission

Produce a complete, original, stylized 3D animated video from exactly two user inputs:
1. The final script.
2. The matching voiceover audio.

The user should not need to configure an AI provider, API key, external generation service, story-director service, or production microservices. The agent itself performs the creative and orchestration work. Local tools such as Blender, FFmpeg, FFprobe, and Whisper.cpp are implementation dependencies, not user-facing services.

The deliverable is a finished, edited, technically verified video—not merely a storyboard, shot list, scene file, or preview.

## Input contract

- Required: one script file and one voiceover audio file.
- Accept common text formats for the script and audio formats supported by installed FFmpeg/FFprobe.
- If either input is missing, ask only for the missing input.
- Do not ask the user to choose a model, API provider, art direction, shot count, render engine, aspect ratio, resolution, music, or SFX.
- Use repository/project defaults for all production choices. Default to the project's configured aspect ratio, FPS, and resolution; if absent, use 16:9, 30 fps, and 1920×1080.
- Do not ask for a title; derive a concise project title and safe slug from the script.
- Do not ask the user to approve every intermediate production stage. Work autonomously and provide concise progress/results. Ask only when a genuine ambiguity or destructive decision cannot be resolved safely.

## Core principles

1. **Narration is immutable.** Never rewrite, reorder, add, or omit spoken words. The audio is the timing authority; the supplied script is the intended wording and story reference.
2. **Original visual identity.** Follow this repository's approved art direction and character bible. Do not copy another creator's character, assets, shots, or exact compositions.
3. **Story first.** Plan meaningful story beats, then shots. Never make a mechanical one-sentence/one-shot storyboard.
4. **Actual 3D animation.** Build reusable 3D assets, rigs, scenes, cameras, lights, and animation. Do not substitute unrelated generated stills or slideshow motion for 3D animation.
5. **Inspect before scaling.** Render look-dev and previews, inspect images and motion, fix defects, then render finals.
6. **Resume safely.** Reuse approved assets and unchanged renders. Never regenerate completed work without a reason.
7. **Evidence over claims.** Every completed stage must have a real artifact, command result, or QA record.

## First run: repository and tool preflight

1. Read README, architecture, art direction, character bible, asset standards, shot schema, quality standards, roadmap, and this skill's workflow references.
2. Inspect the existing project, asset registry, Blender scripts, render planner/cache, tests, and previous outputs.
3. Detect Node.js, Python, Blender, FFmpeg/FFprobe, Whisper.cpp, and available CPU/GPU render devices. Never assume availability.
4. Run baseline tests and project validation. Record pre-existing failures separately.
5. Locate the two supplied inputs. Copy them into the project's input folders without modifying the originals.
6. Create or resume `projects/<slug>/`; do not overwrite an existing project with a different script/audio pair.

If a required local dependency is missing, install it only when the repository documents a safe, reproducible local setup. Do not replace a missing local tool with a paid/remote API or third-party service. If installation is not possible, continue all independent stages and report the exact blocker.

## Project layout

Use the repository's existing conventions; target:

```text
projects/<slug>/
  input/
    script.<ext>
    voiceover.<ext>
  analysis/
    transcript.json
    audio-report.json
  story/
    bible.md
    shot-plan.json
  assets/
  scenes/
  shots/
  renders/
    preview/
    final/
  audio/
    music/
    sfx/
    mix/
  edit/
  qa/
  output/
```

Keep source inputs immutable. Keep temporary files and caches out of source folders.

## End-to-end workflow

Follow [production-pipeline.md](workflows/production-pipeline.md) in order. Read the stage-specific references when needed:

- [Audio analysis](workflows/audio-analysis.md)
- [Visual direction and shot planning](workflows/visual-direction.md)
- [Blender production](workflows/blender-production.md)
- [Quality assurance](workflows/quality-assurance.md)

### Stage 1 — Audio analysis

- Probe the original voiceover with FFprobe.
- Transcribe the actual audio using the locally installed Whisper.cpp tool.
- Align phrases to timestamps; preserve confidence/uncertainty.
- Compare the transcript with the supplied script and report exact, omitted, added, reordered, and uncertain passages.
- Use audio duration, pauses, emphasis, and delivery as timing truth.
- Do not invent word-level timing when only phrase timing exists.

### Stage 2 — Story direction

The agent performs story direction directly—there is no separate story API or service.

Create:
- `story/bible.md`: logline, audience promise, protagonist/cast, emotional arc, visual motifs, locations, art direction, lighting language, continuity rules, ending image.
- `story/shot-plan.json`: schema-compliant beats and timed shots linked to transcript segment IDs.

Group narration into dramatic beats. Design varied shots with explicit character action, environment, props, camera, lighting, composition, transitions, and continuity. Use only registered asset IDs and supported animation/expression IDs when they exist. If a required asset does not exist yet, identify it as a production asset requirement in the plan and create it in the asset stage—do not invent a registry ID.

Run `npm run validate:story -- --project <slug>` after writing the plan. Fix every validation error before scene production.

### Stage 3 — Art direction and reusable assets

- Read the character bible and approved art direction.
- Inspect the existing asset library before creating duplicates.
- Build the protagonist and reusable cast, rigs, facial expressions, body actions, environments, props, and materials required by the shot plan.
- Establish one consistent scale, material system, color pipeline, lighting language, and naming/version convention.
- Create a small look-dev scene and render it. Inspect the actual render before propagating the style.
- Register every reusable asset with stable ID, version, source file, type, supported animations/expressions, and approval status.
- Never mark concept assets as production-approved without visual and technical review.

### Stage 4 — Scene assembly and animation

- Convert the validated shot plan into renderer-compatible shot specs.
- Resolve assets by registry ID/version.
- Assemble Blender scenes deterministically.
- Apply real rig actions, keyframes, camera motion, lighting, materials, and prop interactions.
- Animate anticipation, action, follow-through, holds, eye-lines, weight, and contact—not just generic idle loops.
- Preserve character identity, screen direction, environment geography, prop state, scale, and lighting continuity.
- Validate each scene and save reproducible project files.

### Stage 5 — Preview and visual QA

- Render low-cost previews for every shot.
- Generate contact sheets and motion previews.
- Inspect all contact sheets and representative motion, not just renderer logs.
- Record defects by shot ID and severity.
- Fix missing assets, bad framing, clipping, intersections, floating props, weak acting, foot sliding, continuity errors, lighting defects, and timing problems.
- Re-render only affected shots when the cache is valid.
- Do not start final rendering while critical preview defects remain.

### Stage 6 — Final render and sound

- Render approved shots at the configured final settings.
- Verify frame count and duration for each shot.
- Assemble shots in timeline order against the original voiceover.
- Create or select appropriate music, ambience, and SFX using local/repository assets and original work; do not depend on remote generation services.
- Keep narration intelligible; mix music and SFX beneath it, avoid clipping, and preserve sync.
- Use FFmpeg for deterministic assembly and encoding.

### Stage 7 — Final QA and delivery

- Verify output exists, decodes, and contains video and audio streams.
- Probe duration, codec, resolution, frame rate, and audio properties.
- Check narration sync, missing/duplicated/black frames, transitions, opening hook, pacing, and ending.
- Inspect the complete video when practical. If only sampled sections were reviewed, state that clearly.
- Save contact sheets, QA report, render manifest, and production log.
- Deliver the actual MP4 and its verified path.

## Resume and concurrency rules

- Freeze shared character, environment, material, and registry assets before parallel shot work.
- Shared assets and project manifests have one writer at a time.
- Partition shots into deterministic batches; workers may edit only assigned shots.
- Use the repository's scheduler/lease system when implemented. Never bypass its concurrency controls.
- Re-plan only when shot specs, implementations, or batch settings change.
- Resume missing/failed work; do not redo accepted shots unnecessarily.
- Cache keys must include shot spec, scene, asset versions, animation, camera, lighting, render settings, and Blender version.
- Record each worker's completed/failed IDs, files changed, validation, and blockers.

## Approval and safety boundaries

- Use defaults and continue without intermediate approval for ordinary reversible production decisions.
- Ask before destructive replacement of user source files or approved assets.
- Do not publish or upload publicly unless explicitly requested.
- Never fabricate an output, QA result, render status, or performance measurement.

## Completion report

Report:
- Exact final MP4 path and file size.
- Verified duration, resolution, FPS, codec, and audio stream.
- Planned/rendered/approved shot counts.
- Audio alignment status.
- Visual and technical QA status.
- Any stages that remain blocked and why.
- Tests and validation commands actually run.

A valid shot plan, Blender file, preview, or unreviewed render is not a finished-video deliverable.
