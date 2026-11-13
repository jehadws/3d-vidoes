"""Build and render one self-contained stylized 3D shot in Blender.

This is the first executable vertical-slice renderer. It creates a reusable,
rigged procedural protagonist, a simple art-directed environment, authored
pose animation, camera motion, lighting, and an H.264 shot file.

Run:
  blender -b -P blender/scripts/vertical_slice.py -- \
    --shot projects/pilot-video/shots/shot_001.json \
    --project projects/pilot-video/project.json \
    --out projects/pilot-video/renders/shots/shot_001.mp4 \
    --quality preview
"""
import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FPS_DEFAULT = 30

PALETTE = {
    "ink": "#25243A",
    "skin": "#F0C6A4",
    "hair": "#25243A",
    "jacket": "#E6A04B",
    "shirt": "#F5E9D8",
    "pants": "#3D496D",
    "shoe": "#25243A",
    "accent": "#E76F51",
    "floor": "#D9D2C7",
    "wall": "#BFC8C5",
    "deep": "#384B59",
    "glow": "#F7C96B",
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--shot", required=True)
    parser.add_argument("--project", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--quality", choices=("preview", "final"), default="preview")
    return parser.parse_args(argv)


def material(name, color, roughness=0.72, metallic=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*hex_rgb(color), 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*hex_rgb(color), 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    if emission:
        shader.inputs["Emission Color"].default_value = (*hex_rgb(color), 1.0)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


def hex_rgb(value):
    value = value.lstrip("#")
    rgb = [int(value[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb)


def move_to_collection(obj, collection):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def add_sphere(name, location, scale, mat, collection, parent=None, segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(12, segments // 2), radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    move_to_collection(obj, collection)
    if parent:
        attach_to_bone(obj, parent[0], parent[1])
    return obj


def add_cube(name, location, scale, mat, collection, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    move_to_collection(obj, collection)
    if bevel:
        mod = obj.modifiers.new("soft_edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        obj.modifiers.new("weighted_normals", "WEIGHTED_NORMAL")
    return obj


def add_capsule(name, start, end, radius, mat, collection, parent=None):
    a, b = Vector(start), Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=direction.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    move_to_collection(obj, collection)
    if parent:
        attach_to_bone(obj, parent[0], parent[1])
    return obj


def attach_to_bone(obj, rig, bone_name):
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def create_rig(collection):
    data = bpy.data.armatures.new("protagonist_rig")
    rig = bpy.data.objects.new("protagonist_rig", data)
    collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bones = {
        "root": ((0, 0, 0.0), (0, 0, 0.95), None),
        "torso": ((0, 0, 0.85), (0, 0, 1.38), "root"),
        "head": ((0, 0, 1.34), (0, 0, 1.95), "torso"),
        "upper_arm.L": ((-0.29, 0, 1.27), (-0.53, 0, 1.03), "torso"),
        "forearm.L": ((-0.53, 0, 1.03), (-0.57, -0.01, 0.78), "upper_arm.L"),
        "upper_arm.R": ((0.29, 0, 1.27), (0.53, 0, 1.03), "torso"),
        "forearm.R": ((0.53, 0, 1.03), (0.57, -0.01, 0.78), "upper_arm.R"),
        "thigh.L": ((-0.13, 0, 0.82), (-0.14, 0, 0.45), "root"),
        "shin.L": ((-0.14, 0, 0.45), (-0.14, 0, 0.12), "thigh.L"),
        "thigh.R": ((0.13, 0, 0.82), (0.14, 0, 0.45), "root"),
        "shin.R": ((0.14, 0, 0.45), (0.14, 0, 0.12), "thigh.R"),
    }
    for name, (head, tail, parent) in bones.items():
        bone = data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = data.edit_bones[parent]
            bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    rig.show_in_front = True
    rig["asset_id"] = "protagonist"
    return rig


def build_character(collection):
    skin = material("hero_skin", PALETTE["skin"])
    hair = material("hero_hair", PALETTE["hair"])
    jacket = material("hero_jacket", PALETTE["jacket"])
    shirt = material("hero_shirt", PALETTE["shirt"])
    pants = material("hero_pants", PALETTE["pants"])
    shoe = material("hero_shoes", PALETTE["shoe"])
    ink = material("hero_ink", PALETTE["ink"])
    accent = material("hero_accent", PALETTE["accent"])
    rig = create_rig(collection)

    add_sphere("torso", (0, 0, 1.1), (0.34, 0.23, 0.38), jacket, collection, (rig, "torso"))
    add_sphere("shirt_panel", (0, -0.205, 1.12), (0.16, 0.035, 0.25), shirt, collection, (rig, "torso"))
    add_sphere("neck", (0, 0, 1.43), (0.09, 0.09, 0.14), skin, collection, (rig, "head"))
    add_sphere("head", (0, -0.015, 1.72), (0.29, 0.27, 0.34), skin, collection, (rig, "head"))
    add_sphere("hair_cap", (0, 0.015, 1.91), (0.30, 0.275, 0.19), hair, collection, (rig, "head"))
    add_sphere("hair_tuft", (-0.12, -0.03, 2.06), (0.10, 0.12, 0.13), accent, collection, (rig, "head"))
    for side in (-1, 1):
        add_sphere("eye", (side * 0.105, -0.264, 1.76), (0.035, 0.018, 0.052), ink, collection, (rig, "head"), 20)
        add_sphere("shoe", (side * 0.14, -0.07, 0.075), (0.12, 0.20, 0.075), shoe, collection, (rig, "root"), 24)
        add_capsule("upper_arm", (side * 0.30, 0, 1.28), (side * 0.52, 0, 1.03), 0.085, jacket, collection, (rig, "upper_arm.L" if side < 0 else "upper_arm.R"))
        add_sphere("hand", (side * 0.57, -0.01, 0.77), (0.085, 0.075, 0.09), skin, collection, (rig, "forearm.L" if side < 0 else "forearm.R"))
        add_capsule("forearm", (side * 0.52, 0, 1.03), (side * 0.57, -0.01, 0.78), 0.065, skin, collection, (rig, "forearm.L" if side < 0 else "forearm.R"))
        add_capsule("thigh", (side * 0.13, 0, 0.82), (side * 0.14, 0, 0.45), 0.105, pants, collection, (rig, "thigh.L" if side < 0 else "thigh.R"))
        add_capsule("shin", (side * 0.14, 0, 0.45), (side * 0.14, 0, 0.12), 0.075, pants, collection, (rig, "shin.L" if side < 0 else "shin.R"))
    add_sphere("scarf", (0, -0.23, 1.43), (0.23, 0.055, 0.075), accent, collection, (rig, "head"))

    # Mouth variants are separate rig-following objects; exactly one is visible.
    expressions = {
        "neutral": (0.0, 0.025, 0.012),
        "curious": (0.0, 0.005, 0.018),
        "happy": (0.0, 0.015, 0.030),
        "surprised": (0.0, 0.0, 0.026),
    }
    for expression, (x, z, width) in expressions.items():
        mouth = add_sphere("expression_" + expression, (x, -0.279, 1.62 + z), (max(width, 0.009), 0.014, 0.012 if expression != "surprised" else 0.026), ink, collection, (rig, "head"), 20)
        mouth.hide_render = expression != "neutral"
        mouth.hide_viewport = expression != "neutral"
        mouth["expression"] = expression

    return rig


def animate_character(rig, animation, frame_end, fps):
    rig.animation_data_create()
    action_name = {
        "walking": "walk_cycle",
        "talking": "talk_cycle",
        "reacting": "react_action",
        "pointing": "point_action",
        "idle": "idle_breath",
        "running": "run_cycle",
    }.get(animation, "idle_breath")
    action = bpy.data.actions.new(action_name)
    rig.animation_data.action = action
    bones = rig.pose.bones
    for bone in bones:
        bone.rotation_mode = "XYZ"

    def pose(frame, values):
        for name, rotation in values.items():
            bones[name].rotation_euler = rotation
            bones[name].keyframe_insert(data_path="rotation_euler", frame=frame, group=name)

    if animation in ("walking", "running"):
        cycle = max(8, round(fps * (0.55 if animation == "running" else 0.9)))
        for frame in range(1, frame_end + cycle + 1, cycle // 4):
            phase = ((frame - 1) % cycle) / cycle * math.tau
            stride = 0.48 if animation == "running" else 0.32
            pose(frame, {
                "thigh.L": (math.sin(phase) * stride, 0, 0),
                "thigh.R": (-math.sin(phase) * stride, 0, 0),
                "upper_arm.L": (-math.sin(phase) * stride * 0.8, 0, 0),
                "upper_arm.R": (math.sin(phase) * stride * 0.8, 0, 0),
                "torso": (0, 0, math.sin(phase * 2) * 0.035),
                "root": (0, 0, abs(math.sin(phase)) * (0.035 if animation == "running" else 0.018)),
            })
    elif animation == "talking":
        pose(1, {"head": (0.02, 0, -0.04), "upper_arm.R": (-0.12, 0, -0.12)})
        pose(max(2, frame_end // 2), {"head": (-0.025, 0, 0.035), "upper_arm.R": (-0.35, 0, -0.18), "forearm.R": (-0.2, 0, 0.1), "torso": (0.015, 0, 0)})
        pose(frame_end, {"head": (0.02, 0, -0.025), "upper_arm.R": (-0.1, 0, -0.08)})
    elif animation == "reacting":
        pose(1, {"head": (0, 0, 0), "torso": (0, 0, 0)})
        pose(max(2, frame_end // 3), {"head": (-0.18, 0, 0.12), "torso": (-0.08, 0, 0), "upper_arm.L": (-0.55, 0, -0.2), "upper_arm.R": (-0.55, 0, 0.2)})
        pose(frame_end, {"head": (-0.08, 0, 0.04), "torso": (-0.025, 0, 0), "upper_arm.L": (-0.25, 0, -0.1), "upper_arm.R": (-0.25, 0, 0.1)})
    elif animation == "pointing":
        pose(1, {"upper_arm.R": (-0.1, 0, -0.1)})
        pose(frame_end, {"upper_arm.R": (-1.0, 0, -0.5), "forearm.R": (-0.15, 0, 0)})
    else:
        pose(1, {"torso": (0, 0, -0.015), "head": (0, 0, 0)})
        pose(max(2, frame_end // 2), {"torso": (0, 0, 0.015), "head": (0.015, 0, 0.015)})
        pose(frame_end, {"torso": (0, 0, -0.015), "head": (0, 0, 0)})
    rig["active_animation"] = animation


def build_environment(collection, environment):
    floor = material("environment_floor", PALETTE["floor"])
    wall = material("environment_wall", PALETTE["wall"])
    deep = material("environment_deep", PALETTE["deep"])
    glow = material("environment_glow", PALETTE["glow"], emission=0.25)
    add_cube("ground", (0, 0, -0.12), (18, 18, 0.2), floor, collection, 0.08)
    if environment in ("city_street", "outdoor", "street"):
        add_cube("distant_building_left", (-4.2, 3.4, 2.0), (3.2, 0.8, 4.2), wall, collection, 0.08)
        add_cube("distant_building_right", (4.0, 4.0, 2.4), (3.0, 0.9, 4.8), deep, collection, 0.08)
        for x in (-4.2, 4.0):
            for z in (1.3, 2.2, 3.1):
                add_cube("window", (x, 2.92 if x < 0 else 3.52, z), (0.38, 0.04, 0.48), glow, collection, 0.02)
        add_cube("horizon", (0, 5.0, 0.55), (14, 0.4, 1.1), deep, collection, 0.06)
    else:
        add_cube("back_wall", (0, 3.4, 2.1), (10, 0.25, 4.4), wall, collection, 0.08)
        add_cube("feature_panel", (-2.7, 3.22, 2.0), (2.2, 0.08, 2.6), deep, collection, 0.05)
        add_cube("window_glow", (2.5, 3.20, 2.35), (1.9, 0.06, 2.4), glow, collection, 0.04)
        add_cube("side_table", (1.4, 0.25, 0.42), (1.0, 0.7, 0.8), deep, collection, 0.06)


def add_lighting(scene):
    key_data = bpy.data.lights.new("key_softbox", "AREA")
    key_data.energy = 850
    key_data.shape = "DISK"
    key_data.size = 5.0
    key = bpy.data.objects.new("key_softbox", key_data)
    key.location = (-3.5, -4.5, 5.5)
    scene.collection.objects.link(key)
    key.rotation_euler = (Vector((0, 0, 1.0)) - key.location).to_track_quat("-Z", "Y").to_euler()

    rim_data = bpy.data.lights.new("warm_rim", "AREA")
    rim_data.energy = 520
    rim_data.color = (1.0, 0.68, 0.38)
    rim_data.size = 3.0
    rim = bpy.data.objects.new("warm_rim", rim_data)
    rim.location = (3.0, 2.5, 4.0)
    scene.collection.objects.link(rim)
    rim.rotation_euler = (Vector((0, 0, 1.2)) - rim.location).to_track_quat("-Z", "Y").to_euler()
    scene.world.color = (0.12, 0.12, 0.12)


def build_camera(scene, shot, frame_end):
    camera_data = bpy.data.cameras.new("shot_camera")
    camera = bpy.data.objects.new("shot_camera", camera_data)
    scene.collection.objects.link(camera)
    camera_data.lens = shot.get("camera", {}).get("focal_length_mm", 45)
    camera_data.dof.use_dof = False
    kind = shot.get("camera", {}).get("type", "medium")
    distance = {"wide": 7.0, "medium": 4.7, "close_up": 3.0, "extreme_close_up": 2.2, "over_shoulder": 3.8, "top_down": 7.0}.get(kind, 4.7)
    start = Vector((0.8, -distance, 2.25 if kind in ("wide", "medium") else 1.95))
    end = start.copy()
    movement = shot.get("camera", {}).get("movement", "static")
    target_start = Vector((0, 0, 1.05 if kind in ("wide", "medium") else 1.65))
    target_end = target_start.copy()
    if movement in ("dolly_in", "tracking"):
        end.y += distance * 0.18
    elif movement == "dolly_out":
        end.y -= distance * 0.18
    elif movement == "pan":
        target_end.x += 0.7
    elif movement == "tilt":
        target_end.z += 0.35
    elif movement == "orbit":
        end.x += 1.0
        end.y += 0.45

    for frame, position, target in ((1, start, target_start), (frame_end, end, target_end)):
        camera.location = position
        camera.rotation_euler = (target - position).to_track_quat("-Z", "Y").to_euler()
        camera.keyframe_insert(data_path="location", frame=frame)
        camera.keyframe_insert(data_path="rotation_euler", frame=frame)
    scene.camera = camera
    return camera


def main():
    args = parse_args()
    with open(args.shot, encoding="utf-8") as file:
        shot = json.load(file)
    with open(args.project, encoding="utf-8") as file:
        config = json.load(file)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    fps = int(config.get("fps", FPS_DEFAULT))
    duration = float(shot["duration"])
    frame_end = max(2, round(duration * fps))
    scene.render.fps = fps
    scene.render.fps_base = 1.0
    scene.frame_start = 1
    scene.frame_end = frame_end
    resolution = config.get("resolution", {"width": 1920, "height": 1080})
    scene.render.resolution_x = int(resolution["width"])
    scene.render.resolution_y = int(resolution["height"])
    scene.render.resolution_percentage = 55 if args.quality == "preview" else 100
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM" if args.quality == "preview" else "HIGH"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.filepath = os.path.abspath(args.out)
    scene.render.use_file_extension = True

    world = bpy.data.worlds.new("studio_world")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.20, 0.23, 0.28, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

    env_collection = bpy.data.collections.new("environment")
    scene.collection.children.link(env_collection)
    hero_collection = bpy.data.collections.new("character")
    scene.collection.children.link(hero_collection)
    build_environment(env_collection, shot.get("environment", "interior_room"))
    rig = build_character(hero_collection)
    character = (shot.get("characters") or [{}])[0]
    rig.location = character.get("position", [0, 0, 0])
    rig.rotation_euler.z = math.radians(float(character.get("rotation_z", 0)))
    animate_character(rig, character.get("animation", "idle"), frame_end, fps)
    expression = character.get("expression", "neutral")
    for obj in hero_collection.objects:
        if obj.get("expression"):
            visible = obj.get("expression") == expression
            obj.hide_render = not visible
            obj.hide_viewport = not visible

    if shot.get("props"):
        prop_collection = bpy.data.collections.new("props")
        scene.collection.children.link(prop_collection)
        orb_mat = material("story_prop_glow", PALETTE["glow"], metallic=0.15, emission=0.6)
        orb = add_sphere("story_orb", (1.0, -0.05, 1.0), (0.22, 0.22, 0.22), orb_mat, prop_collection, segments=40)
        orb.keyframe_insert(data_path="location", frame=1)
        orb.location.z += 0.18
        orb.keyframe_insert(data_path="location", frame=frame_end)

    add_lighting(scene)
    build_camera(scene, shot, frame_end)
    scene.frame_set(1)
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    bpy.ops.render.render(animation=True)
    print("VERTICAL_SLICE_RENDERED", shot["id"], args.out, duration, fps)


if __name__ == "__main__":
    main()
