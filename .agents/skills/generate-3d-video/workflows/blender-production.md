# Blender Scene Assembly, Animation, and Rendering

## Before production

Inspect the existing Blender scripts, templates, rigs, project settings, and JSON schemas. Use existing repository interfaces first. Do not invent a CLI command or JSON property and assume it is implemented.

Check:
- Blender version and background-mode availability.
- Render engine and supported features.
- Project FPS, resolution, color management, frame range, and output format.
- GPU availability and render-device configuration.
- Required asset files and linked libraries.

## Asset-first scene assembly

Resolve assets by stable registry ID and version. Prefer linked/reused assets over duplicated models. Record the asset dependencies for each shot.

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

Use the project's configured preview and final profiles. The current reference analysis suggests testing Eevee for the project's soft stylized look; do not switch the production default without a documented look-dev comparison and approval.

Render to temporary or project render directories, never over source assets. Use stable frame ranges and deterministic output naming. Record the Blender command, scene, settings, and exit status.

## Caching

A render cache key should include all inputs that can change the output:
- Shot specification.
- Blender scene and linked asset versions.
- Animation data.
- Camera and lighting settings.
- Render profile and Blender version.
- Relevant compositing settings.

If any dependency changes, invalidate the affected shot. Do not reuse a stale render merely because a file with the expected name exists.

## Current repository capability warning

The production engine currently has a scaffolded job planner and Blender assembly entry point. Inspect their implementation and tests before use. If actual animation, scene assembly, or rendering is not implemented or verified, report that limitation and create the missing handoff artifacts rather than claiming production succeeded.
