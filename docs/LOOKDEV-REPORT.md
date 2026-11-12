# Look-dev Report v0

**Status:** draft for review. Nothing here is approved art. See [REFERENCE-ANALYSIS](REFERENCE-ANALYSIS.md) for the target style family.

## What was built

`blender/scripts/lookdev.py` builds four test shots from code, using the `bpy` module (`pip install -r blender/requirements.txt`, Python 3.11):

| Shot | File | Tests |
|---|---|---|
| Expression sheet | `docs/lookdev/sheet.png` | Face system: neutral, happy, smirk, confused, surprised, worried |
| Close-up | `docs/lookdev/closeup.png` | Reaction close-up, DoF, glossy head, blurred background character |
| Over-the-shoulder | `docs/lookdev/overshoulder.png` | Foreground blur, mid-shot acting, bokeh, color mood |
| Wide / crowd | `docs/lookdev/wide.png` | Crowd instancing from one character kit, hall environment |

```bash
uv venv --python 3.11 .venv && uv pip install --python .venv/bin/python -r blender/requirements.txt
.venv/bin/python blender/scripts/lookdev.py --out renders/lookdev --res 1280x720 --samples 32
```

## Original protagonist (draft)

Egg-shaped glossy head, curled teal hair tuft, big coral scarf, mustard sweater, thin neck and legs. The tuft and scarf are the silhouette hooks. Palette is a draft (cream skin, teal, mustard, coral on violet/warm).

## Face system

Faces are **data**, not rigging: `assets/characters/protagonist/expressions.json` defines eye style, lids, brows, mouth curve/asymmetry and blush in face-space coordinates that are projected onto the head surface. Tapered brush-stroke curves give a graphic look. Adding or tuning an expression is a JSON edit.

## Findings

- The look is achievable with simple geometry: glossy sphere heads + drawn features + violet/warm lighting + DoF reads as the target style family.
- **Render cost is the main risk.** 1280×720 at 32 samples (Cycles, CPU, denoised) took ~130 s/frame on a 1-core machine. At 30 fps, a 40 s video is 1,200 frames, which is infeasible on CPU. Final output needs Eevee and/or a GPU. Eevee was **not** tested here (no GPU/display in the sandbox): test it locally first.
- Blender 5.0 renamed the Eevee engine id to `BLENDER_EEVEE`; the project schema accepts both.
- Crowd characters can come from one parametric kit (skin/hair/cloth variants), as planned.

## Known issues (not yet fixed)

1. Hero blends into the crowd in the wide shot and the head blows out near the spotlight. Needs a rim light, a color contrast, or a slightly larger hero.
2. Crowd hair caps intersect heads and show speckle highlights.
3. No animation yet; poses are static (`relaxed`, `raised`, `crossed`, `hips`).
4. No eyelid blink or eye-darts; eyes are static decals.
5. Floor plank texture repeats visibly; needs variation and a subtler court.
6. Overlay layer (HUD, labels, bubbles) is not built.

## Decisions needed

1. Does this protagonist direction work, or do you want a different silhouette/palette?
2. Aspect ratio (16:9 vs letterboxed).
3. Confirm Eevee/GPU as the final renderer after a local test.
