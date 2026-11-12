# Shot Specification

A shot is **structured data**, not procedural code. The planner decides what to show; Blender assembles and animates it. Schema: [`schemas/shot.schema.json`](../schemas/shot.schema.json).

```json
{
  "id": "shot_001",
  "duration": 5.5,
  "environment": "city_street",
  "characters": [{ "asset": "protagonist", "animation": "walking", "expression": "curious" }],
  "camera": { "type": "medium", "movement": "tracking" },
  "lighting": "late_afternoon",
  "story_beat": "The protagonist discovers something unusual"
}
```

| Field | Rule |
|---|---|
| `id` | `shot_` + 3+ digits, unique within a project |
| `duration` | seconds, > 0 |
| `environment` | ID of an `environment` asset |
| `characters[].asset` | ID of a `character` asset; `animation`/`expression` must exist in that asset's metadata |
| `props[]` | optional IDs of `prop` assets |
| `camera.type` | `wide`, `medium`, `close_up`, `extreme_close_up`, `over_shoulder`, `top_down` |
| `camera.movement` | `static`, `pan`, `tilt`, `tracking`, `dolly_in`, `dolly_out`, `orbit` |
| `story_beat` | required; every shot must justify itself |

Organization in Blender: files grouped by **sequence**; each shot is a collection with its own camera.
