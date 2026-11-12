# Roadmap

| Phase | Deliverable | Exit condition | Status |
|---|---|---|---|
| 1. Art direction | Character bible, visual standards | Approved visual identity | **Open**: look-dev v0 rendered, awaiting approval ([report](LOOKDEV-REPORT.md)) |
| 2. 3D foundation | Character, rig, materials, environments | Reusable asset library | Not started |
| 3. Pilot production | 30–60 s animated sequence | Quality approved | Not started |
| 4. Production engine | Automated scene assembly + rendering | Repeatable production | Scaffolded (validate, jobs) |
| 5. QA system | Contact sheets, validation, visual review | Gates pass | Not started |
| 6. Full production | 5–8 minute video | Publication-ready | Not started |

## Pilot contents

One recurring protagonist; one indoor and one outdoor environment; a few props; narration or dialogue; walking, talking, reacting, interacting; wide/medium/close-up shots; at least one dramatic lighting transition. It must prove a coherent story, not attractive frames.

## Implementation order

1. ✅ Create repository structure (this branch)
2. Define visual identity and character bible
3. Build protagonist model and rig
4. One environment and a small prop library
5. Blender automation to assemble a single shot (`blender/scripts/assemble_shot.py` is the starting point)
6. Pilot (30–60 s)
7. Evaluate before committing to the full engine
