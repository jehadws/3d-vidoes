# Visual Direction and Shot Planning

## AI story director

After narration analysis, run:

```bash
npm run direct-story -- --project <project-name>
```

Configure `STORY_DIRECTOR_API_KEY` and `STORY_DIRECTOR_MODEL`; optionally set `STORY_DIRECTOR_API_URL` to an OpenAI-compatible chat-completions endpoint. The command reads the project script and `analysis/transcript.json`, inventories registered assets, requests schema-constrained JSON, validates the result locally, and writes `story/shot-plan.json`.

The generated plan contains the premise, audience promise, visual motifs, emotional arc, continuity rules, ending image, narration-linked story beats, and timed shots. Validation checks schema shape, unique IDs, full transcript-to-beat coverage, beat-to-shot references, timing bounds, shot overlap, and registered asset types/animation/expression references.

A successful command means the plan is structurally and temporally valid. It does **not** mean the art direction, assets, animation, or video are approved. Review the output before scene production. If the script/transcript comparison is poor, resolve the narration mismatch rather than asking the director to conceal it.

## Director's brief

Before writing or approving shots, define:
- The premise and central question.
- What the viewer should understand or feel at the end.
- The protagonist's immediate objective and emotional change.
- The visual metaphor or recurring motif, if useful.
- The visual escalation from opening hook to payoff.
- The final image or action that gives the video closure.

Use the repository's approved art direction and character bible. If these are still proposed or incomplete, do not silently treat them as approved.

## Beat sheet

For each beat record:
- Stable beat ID.
- Narration start/end and segment references.
- What the narration communicates.
- What the viewer sees.
- Character intention and emotion.
- Environment and asset needs.
- How the beat transitions to the next one.

Every spoken section should have a visual purpose. Avoid literal word-for-word illustration when a stronger action or metaphor communicates the idea.

## Shot design

Build a sequence with intentional variety:
- Establishing wides to orient the viewer.
- Medium shots for action and interaction.
- Close-ups for reactions and important details.
- Over-the-shoulder and point-of-view shots when they clarify perspective.
- Insert shots for meaningful props or visual evidence.
- Occasional composed hero frames for major reveals.

Use camera movement only when it supports the action or emotion. Static framing is valid and often stronger than constant movement.

For each shot specify:
- ID, beat ID, narration time range, and narration segment references.
- Environment, characters, props, and supported animation/expression IDs.
- Character blocking, action, pose, and expression.
- Camera type, angle, lens intent, and movement.
- Lighting and foreground/midground/background composition.
- Transitions and continuity requirements.

## Continuity

Maintain character identity and proportions; position, screen direction, eyelines, and movement direction; prop ownership and state; environment layout and lighting motivation; camera axis and spatial geography; and consistent material/color treatment.

## Originality

Use references to understand broad visual principles, not to reproduce recognizable designs. Create original character silhouettes, faces, costumes, environments, props, graphic overlays, and compositions.

## Shot plan acceptance

- All transcript segments appear in exactly one beat and at least one shot.
- Shot IDs and beat IDs are unique.
- Every shot belongs to a known beat and remains inside its beat's timing.
- No shot overlaps another shot.
- Every asset reference exists and matches its required type.
- Character actions use registered animation/expression names when those fields are supplied.
- Shot complexity is achievable with the current asset and animation library.
- A short pilot proves the style before planning a long production at full detail.
