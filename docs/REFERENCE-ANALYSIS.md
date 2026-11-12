# Reference Analysis — target video type

Source: a 39 s, 1920×1080, 30 fps stylized 3D short (a school dance scene). This document records the *style family* we are targeting and the technical consequences. It is **not** a license to copy: our protagonist, supporting cast, locations, props, UI and palette must be original (see ADR-0002 and ART-DIRECTION).

## 1. What the reference does

**Characters**
- Oversized spherical heads (roughly as tall as the torso) on thin cylindrical necks.
- Simple tube/capsule bodies, small mitten or ball hands, minimal limb detail.
- Clothing as flat, saturated color blocks with a few folds; hair as simple solid caps/shapes.
- Faces are *graphic*: drawn brows, heavy eyelids, small mouth, blush marks, eyelashes. They read as 2D features on a smooth glossy sphere.
- Soft specular sheen on the heads (clearcoat feel) gives volume without detail.
- Expression comes from a few strong features (lid shape, brow angle, smirk), not from complex facial deformation.

**Environment**
- One readable location (a gym/dance hall): wooden floor with court lines, bleachers, stage, string lights.
- Detail is sparse and subordinate to characters; crowds are many low-detail copies of the same character kit.

**Lighting and color**
- Violet/purple ambient and fill, warm wood floor and warm practical lights as contrast.
- Out-of-focus bokeh dots from string lights; strong depth of field; soft vignette.
- Soft shadows, low contrast, saturated but not noisy.

**Camera and editing**
- Shot vocabulary: extreme close-up on a face, over-shoulder with blurred foreground characters, medium two-shot, high-angle wide with the crowd.
- Camera is mostly static or slow-moving; the reaction close-up carries the humor.
- Appears letterboxed with black bars; confirm the intended final aspect before building render presets.

**Graphic overlays (2D, over the 3D)**
- HUD elements (a hearts counter), a price tag (`$20`), a floating name label, speech bubbles, and a glowing line effect tracing paths across the floor.

## 2. What this means for the pipeline

| Finding | Consequence |
|---|---|
| Stylized, low-contrast, glossy-soft look, bokeh DoF | **Eevee is likely sufficient for final renders.** Treat Cycles as optional, not the default. Verify with a look-dev test. |
| Faces are drawn features on a sphere | Build the face as a **face-atlas / decal system** (swappable eyes, brows, mouths, blush) driven per expression, rather than heavy facial rigging. Simplifies the rig a lot. |
| Simple bodies, mitten hands | Lower rig complexity: spine, neck, arms, simple hand poses. Budget animation effort on acting, not anatomy. |
| Large crowds of the same kit | Need a **crowd/instancing system**: one base body with swappable hair, clothing color, and accessory variants. |
| 2D overlays and line FX | Add an **overlay layer** (HUD, labels, bubbles, path FX) composited separately from the 3D render, so text/UI can change without re-rendering shots. |
| 30 fps, 1080p | Set project fps to **30** (was 24). |

## 3. Original-identity rules (must hold)

- Design our own protagonist: our own head shape treatment, silhouette hook, proportions, hairstyle, outfit, palette, and face language. Do not reuse the reference's characters or their specific designs.
- Original location, props, UI shapes, typography, and effect styling.
- It is fine to share broad traits (simple glossy rounded characters, drawn faces, purple-toned moody lighting, bokeh, close-up reaction comedy). Differentiate on the specifics.

## 4. Open decisions

1. Final aspect ratio (16:9 vs letterboxed wider).
2. Protagonist concept: what is *our* silhouette hook?
3. Palette: our own, within a moody-saturated family.
4. Story domain: dance-style social comedy, explainers, or mixed?
5. Face system: texture atlas vs. mesh-based features (prototype both in look-dev).

## 5. Look-dev test (next deliverable)

One Blender scene, rendered at 1920×1080 in Eevee: one original protagonist (sphere head, neck, body, hands), the face-atlas system with 5 expressions, one simple environment with warm floor + string-light bokeh, violet fill, DoF, and one close-up + one wide. Review against QUALITY-STANDARDS before any rigging work.
