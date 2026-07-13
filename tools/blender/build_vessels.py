"""
Headless Blender: build low-poly man/woman vessel bases + export GLB.
Run:
  blender --background --python tools/blender/build_vessels.py

These are BLOCKOUT bases (proportions + hierarchy), not painted-ref perfection.
Refine in Blender UI or replace with sculpted meshes later.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

# Project root = three levels up from this file: tools/blender/build_vessels.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models", "vessels")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures):
        for b in list(block):
            block.remove(b)


def mat(name, color, roughness=0.75):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = roughness
    return m


def add_box(name, loc, scale, material, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if material:
        ob.data.materials.append(material)
    if parent:
        ob.parent = parent
    return ob


def add_capsule_approx(name, loc, radius, depth, material, parent=None, segments=8):
    """Vertical capsule-like from cylinder + spheres (low poly)."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segments, radius=radius, depth=depth, location=loc
    )
    body = bpy.context.active_object
    body.name = name + "_cyl"
    if material:
        body.data.materials.append(material)

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=segments // 2, radius=radius,
        location=(loc[0], loc[1], loc[2] + depth * 0.5)
    )
    top = bpy.context.active_object
    top.name = name + "_top"
    if material:
        top.data.materials.append(material)

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=segments // 2, radius=radius,
        location=(loc[0], loc[1], loc[2] - depth * 0.5)
    )
    bot = bpy.context.active_object
    bot.name = name + "_bot"
    if material:
        bot.data.materials.append(material)

    # Join
    for o in (top, bot, body):
        o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    body.name = name
    if parent:
        body.parent = parent
    return body


def add_sphere(name, loc, radius, material, parent=None, segments=10):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=segments // 2, radius=radius, location=loc
    )
    ob = bpy.context.active_object
    ob.name = name
    if material:
        ob.data.materials.append(material)
    if parent:
        ob.parent = parent
    return ob


def build_vessel(kind="man"):
    """
    kind: man | woman
    Units: meters. Feet on Z=0. Blender Z-up; we'll export Y-up for glTF.
    Total height ~1.72m, legs ~50%, short torso.
    """
    is_fem = kind == "woman"
    # widths
    shoulder = 0.38 if is_fem else 0.44
    hip_w = 0.36 if is_fem else 0.34
    torso_r = 0.16 if is_fem else 0.18
    head_r = 0.105 if is_fem else 0.11
    leg_spread = 0.09 if is_fem else 0.11

    # Materials (tintable names for runtime)
    m_skin = mat("skin", (0.78, 0.56, 0.42))
    m_hair = mat("hair", (0.12, 0.10, 0.09))
    m_top = mat("cloth_top", (0.25, 0.45, 0.48))
    m_bottom = mat("cloth_bottom", (0.18, 0.20, 0.28))
    m_boots = mat("boots", (0.22, 0.16, 0.12))

    # Empty root at origin (feet)
    root = bpy.data.objects.new(f"vessel_{kind}", None)
    bpy.context.collection.objects.link(root)
    root.empty_display_size = 0.2

    # —— legs (long) —— hip at z=0.90
    hip_z = 0.90
    thigh_len = 0.42
    shin_len = 0.38

    for side, sx in (("L", -1), ("R", 1)):
        x = sx * leg_spread
        # upper leg
        uz = hip_z - thigh_len * 0.5
        add_capsule_approx(
            f"Thigh_{side}", (x, 0, uz), 0.07, thigh_len * 0.85, m_bottom, root, 8
        )
        # lower leg
        lz = hip_z - thigh_len - shin_len * 0.45
        add_capsule_approx(
            f"Shin_{side}", (x, 0, lz), 0.055, shin_len * 0.75, m_bottom, root, 8
        )
        # boot
        add_box(
            f"Boot_{side}",
            (x, 0.03, 0.05),
            (0.11, 0.18, 0.09),
            m_boots,
            root,
        )

    # hips
    add_capsule_approx("Hips", (0, 0, hip_z - 0.02), hip_w * 0.45, 0.12, m_bottom, root, 8)

    # short torso
    torso_z = 1.12
    add_capsule_approx("Torso", (0, 0, torso_z), torso_r, 0.32, m_top, root, 10)

    # arms
    arm_z = 1.28
    for side, sx in (("L", -1), ("R", 1)):
        x = sx * (shoulder * 0.55)
        add_capsule_approx(
            f"Arm_{side}",
            (x, 0, arm_z - 0.12),
            0.045,
            0.38,
            m_skin,
            root,
            8,
        )

    # head
    head_z = 1.52
    add_sphere("Head", (0, 0, head_z), head_r, m_skin, root, 12)
    # hair cap
    hair = add_sphere("Hair", (0, -0.01, head_z + 0.04), head_r * 1.05, m_hair, root, 10)
    # flatten hair bottom a bit via scale
    hair.scale = (1.0, 1.0, 0.65)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Simple eyes (markers)
    eye_y = 0.09
    for side, sx in (("L", -1), ("R", 1)):
        add_sphere(
            f"Eye_{side}",
            (sx * 0.035, eye_y, head_z + 0.01),
            0.015,
            mat(f"eye_{side}", (0.15, 0.18, 0.22), 0.3),
            root,
            6,
        )

    # Select hierarchy and join into one mesh for easy export (optional keep separate)
    # Join all mesh children for a single GLB mesh with multi materials
    meshes = [o for o in bpy.data.objects if o.type == "MESH" and o.parent == root]
    if meshes:
        bpy.ops.object.select_all(action="DESELECT")
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        body = bpy.context.active_object
        body.name = f"VesselBody_{kind}"
        body.parent = root
        # Origin at feet
        bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
        # Move so lowest vertex sits on Z=0
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        min_z = min((body.matrix_world @ Vector(v.co)).z for v in body.data.vertices)
        body.location.z -= min_z
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    return root


def export_glb(filepath):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_yup=True,
    )
    print("Exported:", filepath)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for kind in ("man", "woman"):
        clear_scene()
        build_vessel(kind)
        out = os.path.join(OUT_DIR, f"vessel_{kind}.glb")
        export_glb(out)
    print("DONE. Outputs in", OUT_DIR)


if __name__ == "__main__":
    main()
