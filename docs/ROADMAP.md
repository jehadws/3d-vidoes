# Roadmap

This roadmap distinguishes implemented planning infrastructure from the still-unproven 3D production stages. A phase is not complete until its exit criteria are demonstrated with real project assets and repeatable evidence.

| Phase | Deliverable | Exit condition | Status |
|---|---|---|---|
| 1. Art direction | Character bible, visual standards, approved look-dev | Approved visual identity and repeatable target-quality render | **Open**: look-dev v0 exists; art direction awaiting visual approval |
| 2. 3D foundation | Production protagonist, rig, authored actions, materials, environments, props | Reusable assets pass technical and visual QA | **Prototype implemented**: procedural rig/actions and set dressing added; Blender runtime and art review pending |
| 3. Story + shot planning | Audio alignment, agent-authored beat sheet, timed shot plan | Full narration coverage, valid timing, human-approved animatic/plan | **Planning implemented**; needs real-video evaluation |
| 4. Production engine | Blender scene assembly, deterministic rendering, cache/resume | Repeated real shots render correctly from clean checkout | **First vertical-slice renderer added**; Blender execution, resume/cache, and repeated-shot validation pending |
| 5. QA system | Contact sheets, motion review, audio/video QC, evidence | Automated technical gates + documented human approval | Technical stream/duration checks added; visual QA and approval still open |
| 6. Full production | Edited 5–8 minute video | Full-length pilot delivered with verified specs and no blocking defects | Not started |

## Pilot acceptance

The first pilot should be 30–60 seconds and prove a coherent story, not merely attractive stills. It should include:
- One approved recurring protagonist and at least one reusable rig/action set.
- One indoor and one outdoor environment plus a small reusable prop set.
- Walking, talking, reacting, and at least one meaningful interaction.
- Wide, medium, and close-up coverage with motivated camera changes.
- A dramatic but coherent lighting transition.
- Narration-aligned timing, continuity, and reviewed motion.
- A final encoded video with verified duration, frame rate, resolution, and audio sync.

## Implementation order

1. Repository structure, schemas, asset registry, audio analysis — implemented.
2. Agent-driven story direction in the skill plus local timed-shot-plan validation — implemented; validate against real scripts and narration.
3. Build and visually approve the production character/rig and environments — procedural prototype now exists; approval pending.
4. Implement rig/action binding, camera motion, lighting, and deterministic Blender scene assembly — first procedural vertical slice added; run on a real Blender installation and fix compatibility issues.
5. Implement preview/final render orchestration, render cache persistence, retries, and resource limits — per-shot render orchestration added; persistent cache/resume and bounded parallelism remain.
6. Build contact sheets, motion QA evidence, final FFmpeg assembly, and technical QC — basic assembly and technical QC added; contact sheets and human review remain.
7. Complete and review the 30–60 second pilot.
8. Only then scale to a 5–8 minute video and treat the workflow as production-ready.
