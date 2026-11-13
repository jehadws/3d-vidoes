# Production Pipeline

This is an autonomous pipeline with two user inputs only: the script and its voiceover. All story direction, production planning, asset work, animation, rendering, sound, editing, and QA are handled by the agent using repository code and local tools.

## Stage 0 — Intake and preflight

- Locate the supplied script and voiceover. Ask only for whichever one is missing.
- Derive a project slug/title from the script; use project defaults for aspect, resolution, and FPS.
- Copy inputs into the project without modifying originals.
- Inspect prior project state; resume only when the source pair matches.
- Check Node.js, Python, Blender, FFmpeg/FFprobe, Whisper.cpp, render hardware, tests, schemas, assets, and cache.
- Record tool versions, settings, source hashes, and baseline validation.

**Gate:** Never start a stage whose required inputs or tools are missing. Continue independent stages and document blockers. No remote API, hosted model, paid provider, or third-party generation service is required.

## Stage 1 — Audio analysis

Run the local analyzer with the supplied pair:

```bash
npm run analyze-audio -- --project <slug> --audio projects/<slug>/input/voiceover.wav --script projects/<slug>/input/script.md --model <installed-whisper-model>
```

- Probe the original audio with FFprobe.
- Transcribe with local Whisper.cpp and preserve phrase timestamps.
- Compare transcription with the supplied script.
- Record duration, pauses, confidence/uncertainty, and mismatches.
- Preserve source files unchanged.

**Gate:** The transcript must cover the actual narration. Resolve severe recognition/alignment uncertainty before timing shots. Do not silently rewrite or drop spoken material.

## Stage 2 — Story direction and shot plan

The agent itself acts as story director; do not call a separate story API/service.

- Read the full script, timed transcript, project art direction, character bible, quality standards, and asset registry.
- Create `story/bible.md` and `story/shot-plan.json`.
- Group the narration into coherent dramatic beats, not one shot per sentence.
- Assign every transcript segment to exactly one beat and at least one correctly timed shot.
- Design shots for camera, acting, staging, lighting, composition, transitions, and continuity.
- Use only existing asset IDs; explicitly identify new assets that need to be built.
- Preserve the narration's original words and timing.

Validate:

```bash
npm run validate:story -- --project <slug>
```

Fix all schema, timing, coverage, overlap, and asset-reference errors.

**Gate:** The plan is structurally valid, covers the complete narration, and can be produced with existing or planned assets.

## Stage 3 — Art direction and asset production

- Reuse existing approved assets first.
- Build missing reusable characters, rigs, expressions, animation clips, environments, props, and materials.
- Create and inspect a look-dev render.
- Register asset metadata, versions, dependencies, and supported actions.
- Validate every shot's asset references.
- Freeze shared assets before shot production.

**Gate:** Required hero assets have passed visual and technical checks. Do not use placeholder assets in final shots.

## Stage 4 — Blender scenes and animation

- Convert shots to renderer-compatible specifications.
- Assemble scenes using deterministic Blender scripts.
- Bind registered rigs, actions, props, cameras, lighting, and materials.
- Animate acting with clear silhouettes, anticipation, follow-through, contact, and readable holds.
- Preserve continuity across adjacent shots.
- Save scene files and dependency manifests.

**Gate:** Every planned shot has one valid implementation, all dependencies resolve, and scenes pass technical validation.

## Stage 5 — Preview rendering and visual review

- Render previews for every shot.
- Generate contact sheets and representative motion previews.
- Inspect them visually.
- Record defects with shot IDs and evidence.
- Correct staging, animation, camera, lighting, clipping, intersections, timing, and continuity.
- Re-render changed shots and invalidate stale cache entries.

**Gate:** No critical visual defects remain. A passing schema check alone is not visual approval.

## Stage 6 — Final rendering, sound, and edit

- Render approved shots using the project's final profile.
- Verify shot durations and frame counts.
- Assemble the complete visual timeline against the original voiceover.
- Add appropriate music, ambience, and SFX from available local assets/original work.
- Mix so narration remains clear; prevent clipping and sync drift.
- Encode the final MP4 with FFmpeg.

**Gate:** No missing/duplicate shots; timeline and narration durations agree within the project tolerance.

## Stage 7 — Final QA and delivery

- Probe the final MP4 and verify video/audio streams, codecs, resolution, FPS, and duration.
- Check audio/video sync, black or missing frames, transitions, opening, ending, and pacing.
- Inspect the full video when practical; clearly label any sampled-only review.
- Save QA evidence, production manifest, and logs.
- Deliver the real MP4 and concise verified report.

## Recovery

- Resume from the last verified stage.
- Retry only failed work after diagnosing the failure.
- Preserve successful renders and approved assets.
- Invalidate cache entries when any source, asset, animation, camera, lighting, or render setting changes.
- Never mark a stage complete without its artifact and validation evidence.
