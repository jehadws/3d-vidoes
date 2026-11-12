# Asset Standards

Assets are reusable, versioned, and **linked** into scenes (never copied). Changes to a shared asset must be manageable without hand-editing every video.

## Every asset has

- A reusable source file (`.blend`)
- Documented scale and coordinate convention (default: meters, Z-up, -Y forward)
- Defined materials and texture standards
- Naming convention and a stable ID (`^[a-z][a-z0-9_]*$`)
- A preview image
- Validation rules
- Version information (semver)

Each asset directory contains a `metadata.json` validated by [`schemas/asset.schema.json`](../schemas/asset.schema.json).

## Status lifecycle

`concept` → `blockout` → `modeled` → `rigged` → `approved`

Shots may reference assets in any status during development. `validate --strict` (used before final render) fails on any asset that is not `approved` or whose source/preview files are missing.

## Example: character layout

```
assets/characters/protagonist/
├── metadata.json
├── model.blend
├── rig.blend
├── materials.blend
├── preview.png
├── expressions/   neutral, happy, confused, surprised, worried
└── animations/    idle, walking, running, talking, pointing, reacting
```

Environments and props follow the same principle with their own `type`.

## Large files

`.blend`, textures, and EXR are binary. Use Git LFS (see `.gitattributes`).
