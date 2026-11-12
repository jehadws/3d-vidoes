"""Assemble one shot in Blender from a shot-spec JSON.

Run headless:
  blender -b -P blender/scripts/assemble_shot.py -- \
      --shot projects/pilot-video/shots/shot_001.json \
      --project projects/pilot-video/project.json \
      --out projects/pilot-video/scenes/shot_001.blend \
      [--quality preview|final]

STATUS: starter script, untested against a real Blender install (none was available
when written). It links assets (never copies), builds one collection + camera per shot,
and applies project fps/resolution/render engine. Animation/expression application is
left as TODOs until the protagonist rig exists (Phase 2).
"""
import argparse
import json
import math
import os
import sys

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

CAMERA_PRESETS = {  # focal length (mm), (distance m, height m) from subject
    "wide": (28, (8.0, 1.6)),
    "medium": (40, (4.0, 1.5)),
    "close_up": (65, (1.8, 1.55)),
    "extreme_close_up": (85, (0.8, 1.6)),
    "over_shoulder": (50, (2.0, 1.7)),
    "top_down": (35, (0.0, 9.0)),
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--shot", required=True)
    p.add_argument("--project", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--quality", choices=["preview", "final"], default="preview")
    return p.parse_args(argv)


def load_asset_meta(asset_id):
    """Find assets/**/metadata.json with a matching id."""
    for dirpath, _, files in os.walk(os.path.join(ROOT, "assets")):
        if "metadata.json" in files:
            with open(os.path.join(dirpath, "metadata.json")) as f:
                meta = json.load(f)
            if meta.get("id") == asset_id:
                return dirpath, meta
    raise RuntimeError(f"asset not found: {asset_id}")


def link_collection(asset_id, collection_name=None):
    """Link (not append) a collection from an asset's .blend into the scene."""
    dirpath, meta = load_asset_meta(asset_id)
    blend = os.path.join(dirpath, meta["source"])
    if not os.path.exists(blend):
        raise RuntimeError(f"{asset_id}: source file missing: {blend}")
    name = collection_name or asset_id
    with bpy.data.libraries.load(blend, link=True) as (src, dst):
        if name not in src.collections:
            raise RuntimeError(f"{asset_id}: collection '{name}' not in {blend}")
        dst.collections = [name]
    inst = bpy.data.objects.new(f"{asset_id}_inst", None)
    inst.instance_type = "COLLECTION"
    inst.instance_collection = dst.collections[0]
    return inst


def main():
    args = parse_args()
    with open(args.shot) as f:
        shot = json.load(f)
    with open(args.project) as f:
        cfg = json.load(f)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = cfg["fps"]
    scene.render.resolution_x = cfg["resolution"]["width"]
    scene.render.resolution_y = cfg["resolution"]["height"]
    scene.render.engine = cfg.get("render", {}).get(args.quality, {}).get("engine", "BLENDER_EEVEE_NEXT")
    scene.frame_start = 1
    scene.frame_end = max(1, round(shot["duration"] * cfg["fps"]))

    shot_col = bpy.data.collections.new(shot["id"])
    scene.collection.children.link(shot_col)

    shot_col.objects.link(link_collection(shot["environment"]))

    subject = (0.0, 0.0, 0.0)
    for c in shot.get("characters", []):
        inst = link_collection(c["asset"])
        if "position" in c:
            inst.location = c["position"]
            subject = tuple(c["position"])
        inst.rotation_euler[2] = math.radians(c.get("rotation_z", 0))
        shot_col.objects.link(inst)
        # TODO(Phase 2): apply c["animation"] action and c["expression"] pose from the rig.

    for prop_id in shot.get("props", []):
        shot_col.objects.link(link_collection(prop_id))

    # Camera
    focal, (dist, height) = CAMERA_PRESETS[shot["camera"]["type"]]
    focal = shot["camera"].get("focal_length_mm", focal)
    cam_data = bpy.data.cameras.new(f"{shot['id']}_cam")
    cam_data.lens = focal
    cam = bpy.data.objects.new(f"{shot['id']}_cam", cam_data)
    cam.location = (subject[0], subject[1] - dist, height)
    cam.rotation_euler = (math.radians(90), 0, 0)
    shot_col.objects.link(cam)
    scene.camera = cam
    # TODO: implement camera.movement (pan/tilt/tracking/dolly/orbit) as keyframes over scene.frame_range.

    # TODO: apply shot["lighting"] (lighting asset or preset name).

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.out))
    print(f"assembled {shot['id']} -> {args.out}")


if __name__ == "__main__":
    main()
