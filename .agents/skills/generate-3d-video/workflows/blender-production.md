# Blender Scene Assembly, Animation, and Rendering

## Before production

Inspect the existing Blender scripts, templates, rigs, project settings, and JSON schemas. Use existing repository interfaces first. Do not invent a CLI command or JSON property and assume it is implemented.

Check:
- Blender version and background-mode availability.
- Render engine and supported features.
- Project FPS, resolution, color management, frame range, and output format.
- GPU availability and render-device configuration.
- Required local FFmpeg/FFprobe executables.

## First executable vertical slice

The repository now includes a procedural shot renderer and local pilot orchestrator:

- `blender/scripts/vertical_slice.py` builds a rigged stylized protagonist, pose actions, expressions, environment, prop, lighting, and camera movement, then renders one H.264 shot.
- `blender/scripts/render_pilot.py` renders the project's shot specs, concatenates the shot files, muxes the original voiceover, and checks the resulting media streams and duration.
- Run it with `npm run render:pilot -- --project <slug> --audio <voiceover-file> --quality preview`.

The current procedural renderer is a controlled first slice, not the final reusable asset library. It provides actual rig-driven pose motion and camera keyframes, but the generated design and acting still require visual review. The script uses a compact procedural indoor/outdoor environment and a consistent stylized palette so the first run does not depend on downloaded assets.

Before running, ensure the skill has converted the approved story plan into `projects/<slug>/shots/*.json` using the existing shot schema. Shot durations must sum to the source voiceover duration within 0.25 seconds. The orchestrator deliberately refuses to trim or stretch the narration to hide a planning mismatch.

## Asset-first production path

As the asset library matures, resolve reusable approved assets by stable registry ID and version. Prefer linked/reused assets over duplicated models. Record the asset dependencies for each shot.

For each shot:
1. Load the approved scene/template.
2. Resolve environment, character, prop, material, and animation assets.
3. Apply character staging and action.
4. Set camera, lighting, and frame range.
5. Validate missing assets and broken references.
6. Save the scene deterministically.
7. Render a preview.
8. Inspect the preview before marking the shot ready for final render.

## Animation direction

Prioritize readable acting:
- Clear pose silhouettes.
- Anticipation before important actions.
- Deliberate action and follow-through.
- Holds that let reactions read.
- Believable weight shifts and contact.
- Eye direction and facial expression that support intention.
- Consistent movement across cuts.

Avoid relying on a generic idle loop for every character. Avoid unmotivated procedural motion and camera shake.

## Render policy

Use the project's configured FPS and resolution. The vertical-slice renderer currently uses Eevee Next for predictable local previews and MP4 output; do not promote that choice to the final production default without a documented look-dev comparison and approval.

Render to project render directories, never over source assets. Record the Blender command, scene settings, and exit status.

## Validation boundary

The orchestrator performs technical checks: shot input structure, duration coverage, process exit codes, output existence, video/audio stream presence, and final duration. It does not perform human visual review, contact-sheet inspection, motion scoring, or final artistic approval. A successful MP4 encode is not proof of visual quality.

The previous `assemble_shot.py` remains a scaffolded asset-linking entry point. If the new renderer fails on the installed Blender version, report the exact Blender error and do not mark the shot as rendered.
