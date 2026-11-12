"""Look-dev scene: original protagonist + data-driven face system + dance-hall mood.

Run with the `bpy` module (Python 3.11):
  python blender/scripts/lookdev.py --out renders/lookdev --res 1280x720 --samples 48 [--shots closeup,sheet]
or inside Blender:
  blender -b -P blender/scripts/lookdev.py -- --out renders/lookdev

Shots: closeup, overshoulder, wide, sheet (expression sheet).
Expressions come from assets/characters/protagonist/expressions.json.
All designs here are original look-dev drafts, not approved art.
"""
import argparse
import json
import math
import os
import random
import sys
import time

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EXPR = json.load(open(os.path.join(ROOT, "assets/characters/protagonist/expressions.json")))

# --- Draft palette (look-dev only) ------------------------------------------
HERO = dict(skin="#F3D2B3", hair="#2E8C8A", cloth="#E9A93B", pants="#3A3358", scarf="#E8604C", shoe="#2A2438", cheek="#F08A8A")
CROWD = [
    dict(skin="#F1C9A5", hair="#6B3F2A", cloth="#D9578C", pants="#3A3358", shoe="#2A2438"),
    dict(skin="#C98E65", hair="#1E1B26", cloth="#4C7FD1", pants="#2F2B4A", shoe="#2A2438"),
    dict(skin="#8D5B3C", hair="#E2B04A", cloth="#5FB48A", pants="#3A3358", shoe="#2A2438"),
    dict(skin="#F3D2B3", hair="#B5472F", cloth="#9A6BD6", pants="#2F2B4A", shoe="#2A2438"),
    dict(skin="#E3B592", hair="#2E8C8A", cloth="#E9794B", pants="#3A3358", shoe="#2A2438"),
]
INK = "#1B1524"

H = Vector((0, 0, 1.64))        # head center (character-local)
R = Vector((0.52, 0.48, 0.47))  # head ellipsoid radii
FU, FV = 1.15, 0.95              # face-space -> angle scale


# --- helpers -----------------------------------------------------------------
def srgb(hexstr, a=1.0):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (f(c[0]), f(c[1]), f(c[2]), a)


_mat_cache = {}


def mat(color, rough=0.6, coat=0.0, emit=0.0, key=None):
    k = key or (color, rough, coat, emit)
    if k in _mat_cache:
        return _mat_cache[k]
    m = bpy.data.materials.new(f"m_{len(_mat_cache)}")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(color)
    b.inputs["Roughness"].default_value = rough
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.12
    if emit:
        b.inputs["Emission Color"].default_value = srgb(color)
        b.inputs["Emission Strength"].default_value = emit
    _mat_cache[k] = m
    return m


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def smooth(o):
    for p in o.data.polygons:
        p.use_smooth = True


def ellipsoid(name, center, radii, material, seg=32, rings=16, rot=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1, location=center)
    o = bpy.context.object
    o.name = name
    o.scale = radii
    if rot:
        o.rotation_euler = rot
    o.data.materials.append(material)
    smooth(o)
    return o


def limb(name, p0, p1, r, material, seg=16):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    bpy.ops.mesh.primitive_cylinder_add(vertices=seg, radius=r, depth=d.length, location=(p0 + p1) / 2)
    o = bpy.context.object
    o.name = name
    o.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
    o.data.materials.append(material)
    smooth(o)
    return o


def face_point(u, v, lift=1.0):
    yaw, pitch = u * FU, v * FV
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    return H + Vector((R.x * d.x, R.y * d.y, R.z * d.z)) * lift


def face_normal(u, v):
    yaw, pitch = u * FU, v * FV
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    return Vector((d.x / R.x, d.y / R.y, d.z / R.z)).normalized()


_taper = None


def get_taper():
    """Shared taper profile: brush-stroke style pointed ends."""
    global _taper
    if _taper is None:
        tc = bpy.data.curves.new("taper", "CURVE")
        tc.dimensions = "2D"
        sp = tc.splines.new("POLY")
        pts = [(0, 0.12), (0.12, 0.75), (0.5, 1.0), (0.88, 0.75), (1, 0.12)]
        sp.points.add(len(pts) - 1)
        for i, (x, y) in enumerate(pts):
            sp.points[i].co = (x, y, 0, 1)
        _taper = bpy.data.objects.new("taper", tc)
    return _taper


def stroke(name, pts_uv, thick, material, lift=1.014):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.taper_object = get_taper()
    cu.bevel_depth = thick
    cu.bevel_resolution = 3
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts_uv) - 1)
    for i, (u, v) in enumerate(pts_uv):
        x, y, z = face_point(u, v, lift)
        sp.points[i].co = (x, y, z, 1)
    o = bpy.data.objects.new(name, cu)
    o.data.materials.append(material)
    return link(o)


def decal(name, u, v, w, h, material):
    """Flattened ellipsoid lying on the head surface."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1, location=face_point(u, v, 1.0))
    o = bpy.context.object
    o.name = name
    o.scale = (w, 0.014, h)
    o.rotation_euler = face_normal(u, v).to_track_quat("Y", "Z").to_euler()
    o.data.materials.append(material)
    smooth(o)
    return o


# --- character ---------------------------------------------------------------
ARMS = {
    "relaxed": [(-0.36, -0.05, 0.55), (0.36, -0.05, 0.55)],
    "raised": [(-0.30, -0.28, 1.12), (0.30, -0.28, 1.12)],
    "crossed": [(0.10, -0.24, 0.80), (-0.10, -0.24, 0.84)],
    "hips": [(-0.40, 0.0, 0.70), (0.40, 0.0, 0.70)],
}


def build_character(name, pal, expr=None, detail=True, arms="relaxed", hair="tuft"):
    root = bpy.data.objects.new(name, None)
    link(root)
    parts = []
    skin = mat(pal["skin"], 0.35, coat=0.3, key=("skin", pal["skin"]))
    cloth = mat(pal["cloth"], 0.75)
    pants = mat(pal["pants"], 0.75)
    shoe = mat(pal["shoe"], 0.5)
    ink = mat(INK, 0.5, key="ink")
    seg = 32 if detail else 16
    ring = 16 if detail else 8

    for s in (-1, 1):
        parts.append(limb(f"{name}_leg", (s * 0.11, 0, 0.1), (s * 0.11, 0, 0.5), 0.04, pants, 10))
        parts.append(ellipsoid(f"{name}_shoe", (s * 0.11, -0.04, 0.06), (0.09, 0.15, 0.06), shoe, 16, 8))
    parts.append(ellipsoid(f"{name}_torso", (0, 0, 0.78), (0.27, 0.19, 0.32), cloth, seg, ring))
    parts.append(limb(f"{name}_neck", (0, 0, 1.0), (0, 0, 1.2), 0.055, skin, 12))
    head = ellipsoid(f"{name}_head", H, R, skin, 48 if detail else 24, 24 if detail else 12)
    parts.append(head)

    for s, hp in zip((-1, 1), ARMS[arms]):
        parts.append(limb(f"{name}_arm", (s * 0.26, 0, 0.98), hp, 0.045, cloth, 10))
        parts.append(ellipsoid(f"{name}_hand", hp, (0.07, 0.07, 0.07), skin, 16, 10))

    if detail:  # signature scarf + hair tuft (hero only)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.135, minor_radius=0.05, location=(0, 0, 1.08))
        sc = bpy.context.object
        sc.name = f"{name}_scarf"
        sc.data.materials.append(mat(pal.get("scarf", "#E8604C"), 0.8))
        smooth(sc)
        parts.append(sc)
        tuft = []
        for i in range(18):
            s = i / 17
            a = s * 4.4
            r = 0.14 * s
            tuft.append((r * math.sin(a), -0.02, 2.06 + 0.22 * s + r * (1 - math.cos(a)) * 0.6))
        cu = bpy.data.curves.new(f"{name}_tuft", "CURVE")
        cu.dimensions = "3D"
        cu.taper_object = get_taper()
        cu.bevel_depth = 0.036
        cu.bevel_resolution = 4
        cu.use_fill_caps = True
        sp = cu.splines.new("POLY")
        sp.points.add(len(tuft) - 1)
        for i, p in enumerate(tuft):
            sp.points[i].co = (*p, 1)
        t = bpy.data.objects.new(f"{name}_tuft", cu)
        t.data.materials.append(mat(pal["hair"], 0.6))
        parts.append(link(t))
    else:  # crowd hair cap
        parts.append(ellipsoid(f"{name}_hair", H + Vector((0, 0.06, 0.16)), (R.x * 1.03, R.y * 0.98, R.z * 0.72), mat(pal["hair"], 0.7), 16, 8))

    # --- face
    e = EXPR[expr] if expr else None
    if detail and e:
        for side, cx in ((0, -0.45), (1, 0.45)):
            ev = 0.06
            ew, eh = 0.075, 0.115 * e["open"]
            if e["eye"] == "arc":
                pts = [(cx + (-1 + i / 3) * 0.14, ev + 0.075 * (1 - (-1 + i / 3) ** 2)) for i in range(7)]
                parts.append(stroke(f"{name}_eye", pts, 0.024, ink))
            else:
                eh2 = eh * (1 - 0.4 * e["lid"])
                parts.append(decal(f"{name}_eye", cx, ev - 0.03 * e["lid"], ew, eh2, ink))
                if e["lid"]:
                    tilt = 0.03 * (1 if side else -1)
                    lid = [(cx - 0.12, ev + 0.05 - tilt * 0.4), (cx, ev + 0.065), (cx + 0.12, ev + 0.05 + tilt * 0.4)]
                    parts.append(stroke(f"{name}_lid", lid, 0.026, ink))
            h, inner = e["brows"][side]
            s = -1 if side == 0 else 1
            pts = []
            for i in range(9):
                t = i / 8
                u = cx - s * 0.17 + s * 0.37 * t
                v = h + inner * (1 - 2 * t) + 0.035 * math.sin(math.pi * t)
                pts.append((u, v))
            parts.append(stroke(f"{name}_brow", pts, 0.022, ink))
        m = e["mouth"]
        if m.get("open"):
            parts.append(decal(f"{name}_mouth", 0, -0.36, 0.06, 0.08 * m["open"], ink))
        else:
            pts = []
            for i in range(17):
                t = -1 + i / 8
                u = t * m["w"]
                v = -0.40 - m.get("curve", 0) * (1 - t * t) + m.get("asym", 0) * t * 0.5 + m.get("wobble", 0) * math.sin(t * math.pi * 2)
                pts.append((u, v))
            parts.append(stroke(f"{name}_mouth", pts, 0.023, ink))
        if e["blush"]:
            bl = mat(pal.get("cheek", "#F08A8A"), 0.8, key="blush")
            for cx in (-0.62, 0.62):
                parts.append(decal(f"{name}_blush", cx, -0.2, 0.075, 0.045, bl))
    elif not detail:  # crowd: tiny eyes
        for cx in (-0.4, 0.4):
            parts.append(decal(f"{name}_eye", cx, 0.04, 0.04, 0.05, ink))

    for p in parts:
        p.parent = root
    return root


# --- environment -------------------------------------------------------------
def build_hall():
    floor_m = bpy.data.materials.new("floor")
    floor_m.use_nodes = True
    nt = floor_m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.4
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.5
    br.inputs["Color1"].default_value = srgb("#C48E5E")
    br.inputs["Color2"].default_value = srgb("#B77F4F")
    br.inputs["Mortar"].default_value = srgb("#9A6438")
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.0015
    br.inputs["Brick Width"].default_value = 0.07
    br.inputs["Row Height"].default_value = 0.012
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    bpy.ops.mesh.primitive_plane_add(size=44, location=(0, 8, 0))
    f = bpy.context.object
    f.data.materials.append(floor_m)
    wall = bpy.ops.mesh.primitive_plane_add(size=44, location=(0, 18, 8), rotation=(math.pi / 2, 0, 0))
    bpy.context.object.data.materials.append(mat("#2B1E4A", 0.9))
    # court lines
    bpy.ops.curve.primitive_bezier_circle_add(radius=3.2, location=(0, 5, 0.006))
    c = bpy.context.object
    c.data.bevel_depth = 0.025
    c.data.materials.append(mat("#EDE7F6", 0.6, emit=0.4))
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 5, 0.006))
    ln = bpy.context.object
    ln.scale = (40, 0.05, 0.005)
    ln.data.materials.append(mat("#EDE7F6", 0.6, emit=0.4))
    # bleachers
    for i in range(3):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-10 - i * 1.6, 8, 0.45 + i * 0.5))
        s = bpy.context.object
        s.scale = (1.6, 22, 0.9 + i * 1.0)
        s.data.materials.append(mat("#8B4F7D", 0.8))
    # string lights (bokeh sources)
    cols = ["#FF8FB8", "#FFE08A", "#8FE3FF", "#FFB27A", "#C9A8FF"]
    k = 0
    for y in (4, 7.5, 11, 14.5):
        for i in range(-13, 14):
            x = i * 1.1
            z = 4.4 + 0.9 * (x / 14) ** 2 + 0.25 * math.sin(i * 1.7 + y)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.075, location=(x, y, z))
            bpy.context.object.data.materials.append(mat(cols[k % 5], 0.5, emit=5, key=("bulb", k % 5)))
            k += 1


def light(kind, loc, target, color, energy, size=3.0):
    ld = bpy.data.lights.new("L", kind)
    ld.energy = energy
    ld.color = color[:3]
    if kind == "AREA":
        ld.size = size
    o = link(bpy.data.objects.new("L", ld))
    o.location = loc
    aim(o, target)
    return o


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - Vector(obj.location)).to_track_quat("-Z", "Y").to_euler()


def wall_glow():
    light("AREA", (0, 8, 5.5), (0, 18, 6), (0.55, 0.35, 0.95), 2600, 12)


def world(color, strength):
    w = bpy.data.worlds.new("W")
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = srgb(color)
    bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = w


def camera(loc, target, focal, fstop=None, focus=None, ortho=None):
    cd = bpy.data.cameras.new("cam")
    cd.lens = focal
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    if fstop:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
        cd.dof.focus_distance = (Vector(focus or target) - Vector(loc)).length
    o = link(bpy.data.objects.new("cam", cd))
    o.location = loc
    aim(o, target)
    bpy.context.scene.camera = o
    return o


# --- shots -------------------------------------------------------------------
def shot_closeup():
    build_hall()
    hero = build_character("hero", HERO, "smirk", arms="crossed")
    hero.rotation_euler = (0, 0, math.radians(-14))
    bg = build_character("friend", CROWD[0], "neutral", arms="relaxed")
    bg.location = (-1.0, 1.0, 0)
    bg.rotation_euler = (0, 0, math.radians(10))
    world("#3A2A66", 0.8)
    wall_glow()
    light("AREA", (-3.5, -5, 4.5), (0, 0, 1.6), (0.72, 0.55, 1.0), 560, 4)
    light("AREA", (4, -4, 2.5), (0, 0, 1.4), (1.0, 0.72, 0.5), 260, 3)
    light("AREA", (3, 3.5, 4), (0, 0, 1.8), (1.0, 0.6, 0.35), 700, 2)
    camera((0.1, -4.2, 1.72), (0, 0, 1.64), 85, 2.0, (0.0, -0.45, 1.66))


def shot_overshoulder():
    build_hall()
    fg = build_character("fg", CROWD[1], None, detail=False, arms="relaxed")
    fg.location = (-0.8, -1.5, 0)
    fg.rotation_euler = (0, 0, math.pi - 0.2)
    hero = build_character("hero", HERO, "confused", arms="hips")
    hero.location = (0.25, 0.7, 0)
    world("#3A2A66", 0.8)
    wall_glow()
    light("AREA", (-3, -5, 4.5), (0, 0.7, 1.5), (0.72, 0.55, 1.0), 600, 4)
    light("AREA", (4, -3, 2.5), (0, 0.7, 1.4), (1.0, 0.72, 0.5), 240, 3)
    light("AREA", (3, 4.5, 4), (0, 0.7, 1.8), (1.0, 0.6, 0.35), 700, 2)
    camera((0.2, -4.3, 1.75), (0.25, 0.7, 1.55), 50, 2.2, (0.25, 0.25, 1.6))


def shot_wide():
    build_hall()
    random.seed(7)
    hero = build_character("hero", HERO, "happy", arms="raised")
    hero.location = (0, 3.2, 0)
    spots = []
    while len(spots) < 26:
        p = (random.uniform(-7, 7), random.uniform(0.5, 11))
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > 1.2 for q in spots):
            spots.append(p)
    spots = [p for p in spots if (p[0]) ** 2 + (p[1] - 3.2) ** 2 > 5.5]
    for i, p in enumerate(spots):
        c = build_character(f"c{i}", CROWD[i % 5], None, detail=False, arms=random.choice(["relaxed", "hips", "raised"]))
        c.location = (p[0], p[1], 0)
        c.rotation_euler = (0, 0, random.uniform(0, 6.28))
    world("#3A2A66", 0.8)
    light("AREA", (0.5, 3.2, 6), (0, 3.2, 0.8), (1.0, 0.85, 0.7), 350, 2.5)
    light("AREA", (0, 5, 8), (0, 5, 0), (0.85, 0.6, 1.0), 2500, 12)
    light("AREA", (6, -4, 5), (0, 4, 0.5), (1.0, 0.75, 0.55), 900, 5)
    camera((9, -11, 8.5), (0, 3.2, 0.9), 34, 8.0, (0, 3.2, 0.9))


def shot_sheet():
    names = ["neutral", "happy", "smirk", "confused", "surprised", "worried"]
    for i, n in enumerate(names):
        c = build_character(f"x_{n}", HERO, n, arms="relaxed")
        c.location = (-4.25 + i * 1.7, 0, 0)
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0))
    bpy.context.object.data.materials.append(mat("#CFC6E6", 0.9, key="sheet_floor"))
    world("#BDB3DA", 1.0)
    light("AREA", (-4, -6, 6), (0, 0, 1.4), (1, 0.95, 1), 520, 6)
    light("AREA", (5, -5, 3), (0, 0, 1.4), (1, 0.85, 0.75), 220, 5)
    camera((0, -12, 1.15), (0, 0, 1.15), 50, ortho=10.4)


SHOTS = {"closeup": shot_closeup, "overshoulder": shot_overshoulder, "wide": shot_wide, "sheet": shot_sheet}


def render(name, out, res, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = os.path.join(out, f"{name}.png")
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument("--out", default=os.path.join(ROOT, "renders", "lookdev"))
    p.add_argument("--res", default="1280x720")
    p.add_argument("--samples", type=int, default=48)
    p.add_argument("--shots", default=",".join(SHOTS))
    a = p.parse_args(argv)
    res = tuple(int(x) for x in a.res.split("x"))
    os.makedirs(a.out, exist_ok=True)
    for name in a.shots.split(","):
        t = time.time()
        bpy.ops.wm.read_factory_settings(use_empty=True)
        _mat_cache.clear()
        globals()['_taper'] = None
        SHOTS[name]()
        render(name, a.out, res, a.samples)
        print(f"{name}: {time.time() - t:.0f}s -> {a.out}/{name}.png", flush=True)


if __name__ == "__main__":
    main()
