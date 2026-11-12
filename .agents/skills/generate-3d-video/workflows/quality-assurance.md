# Visual and Technical Quality Assurance

## QA principle

Automated validation catches structural and technical defects. Human visual review determines whether the video is understandable, coherent, and engaging. A successful render command is not proof of visual quality.

## Shot-level review

Generate contact sheets and inspect representative frames plus motion previews. Review:
- Character identity and appearance consistency.
- Readable pose, silhouette, and expression.
- Correct action and prop interaction.
- Composition, camera framing, and screen direction.
- Environment continuity and spatial clarity.
- Lighting, materials, shadows, and color consistency.
- Clipping, intersections, floating objects, and foot/contact errors.
- Animation timing, transitions, and unwanted jitter.
- Missing assets, broken textures, and render artifacts.

Record defects against shot IDs with severity, evidence path, and a concrete correction.

## Suggested scoring

Use a 1–5 scale for:
- Story clarity.
- Character acting.
- Composition.
- Environment and lighting.
- Continuity.
- Technical/render quality.
- Audio/visual synchronization.

A suggested acceptance target is an average of at least 4, with no critical category below 3. Treat this as a review aid, not an automatic substitute for judgment.

## Final-video checks

Use available media inspection tools (for example FFmpeg/ffprobe) to verify:
- Output exists and is readable.
- Resolution, frame rate, duration, codecs, and audio streams.
- No missing, duplicated, or black sections.
- Narration begins and ends as intended.
- Lip/action timing is plausible where synchronization is relevant.
- Audio is intelligible, not clipped, and not unexpectedly silent.
- Captions, if included, match the spoken content.
- Opening hook, transitions, ending, and pacing work as a whole.

Inspect the entire video when practical. If only sampled frames or segments were reviewed, state that limitation explicitly.

## Fix-and-review loop

1. Create an issue list ordered by severity.
2. Fix critical defects before cosmetic polish.
3. Re-render affected shots only.
4. Rebuild the edit if shot duration or timing changed.
5. Re-run technical checks and visual review.
6. Save evidence and final QA report.

Never mark a shot approved solely because automated schema validation passed.
