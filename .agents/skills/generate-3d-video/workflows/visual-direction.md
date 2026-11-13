# Visual Direction and Shot Planning

## Inputs and authority

The user supplies only a script and its voiceover. The agent performs all creative planning internally. Do not request a story API key, model/provider selection, third-party service, or separate story-director configuration.

The voiceover is authoritative for actual words, delivery, pauses, and timing. The script is authoritative for intended story structure and wording. Where they differ, preserve what was actually spoken and document the discrepancy.

## Story bible

Create `projects/<slug>/story/bible.md` with:
- Logline and audience promise.
- Central question and intended emotional payoff.
- Protagonist objective, personality, and emotional progression.
- Cast and stable visual identities.
- Locations, environment moods, and key lights.
- Recurring visual motifs and visual escalation.
- Camera and composition language.
- Continuity rules and ending image.

Use the repository's approved art direction and character bible. Do not silently treat concept art as approved production design.

## Beat sheet

Create a small number of meaningful beats based on:
- New information or story action.
- Emotional intention and character objective.
- Location/time changes.
- Reveals, contrasts, escalation, and payoff.
- Pauses and emphasis in the actual narration.

Each beat has a stable ID, title, purpose, start/end timestamps, transcript segment IDs, visual concept, and character direction.

Every transcript segment must belong to exactly one beat. Do not force one beat per sentence or one shot per transcript phrase.

## Shot design

Each shot should be visually specific and achievable. Include:
- Stable shot ID and parent beat ID.
- Start/end timestamps and transcript segment IDs.
- Environment, character, prop, and asset references.
- Character blocking, action, pose, and expression.
- Camera type, lens intent, angle, and motivated movement.
- Lighting and foreground/midground/background composition.
- Transition in/out and continuity notes.

Vary establishing wides, medium action shots, close-ups, inserts, over-the-shoulder, POV, and dramatic reveals when the story benefits. Static cameras are valid; never add movement only for variety.

## Continuity and production constraints

Maintain identity, proportions, screen direction, eyelines, spatial geography, prop state, scale, lighting logic, and material/color treatment. Use registered asset IDs and supported animation/expression names. New asset requirements must be identified explicitly and created/registered before final scene assembly.

## Validation

Run `npm run validate:story -- --project <slug>`. The validator checks schema, unique IDs, transcript coverage, beat/shot relationships, timing bounds, overlaps, gaps, narration-to-shot coverage, and asset/animation/expression references.

A valid plan is not proof that the video is visually good or rendered. Review the story bible and shot plan internally, then continue production autonomously.
