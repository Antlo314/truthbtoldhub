"""
Headless Blender 5.1 — unique low-poly Aether Shelf props for Truth B Told Hub.

  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" --background --python tools/blender/build_aether_world.py

Exports GLB to public/models/aether/. Each mesh stays under ~800 tris.
"""
import os
import math
import bpy
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models", "aether")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.objects):
        for b in list(coll):
            coll.remove(b)


def mat(name, rgb, rough=0.72, metal=0.05, emit=0.0):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = rough
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metal
        key = "Emission Strength" if "Emission Strength" in bsdf.inputs else None
        if key:
            bsdf.inputs[key].default_value = emit
        if emit > 0 and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*rgb, 1.0)
    return m


BASALT = None
GOLD = None
AETHER = None
OBSIDIAN = None


def mats():
    global BASALT, GOLD, AETHER, OBSIDIAN
    BASALT = mat("Basalt", (0.11, 0.09, 0.14), 0.86, 0.02)
    GOLD = mat("GoldVein", (0.85, 0.68, 0.32), 0.28, 0.72, 0.15)
    AETHER = mat("Aether", (0.42, 0.28, 0.95), 0.35, 0.08, 1.4)
    OBSIDIAN = mat("Obsidian", (0.04, 0.03, 0.06), 0.18, 0.35)


def assign(ob, m):
    if ob.data.materials:
        ob.data.materials[0] = m
    else:
        ob.data.materials.append(m)


def cube(name, loc, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    assign(ob, material)
    return ob


def cyl(name, loc, r_top, r_bot, depth, material, verts=8):
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=r_bot, radius2=r_top, depth=depth, location=loc
    )
    ob = bpy.context.active_object
    ob.name = name
    assign(ob, material)
    return ob


def ico(name, loc, r, material, subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    assign(ob, material)
    return ob


def export_glb(name):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    print("exported", path)


def build_terrace_slab():
    clear_scene()
    mats()
    cube("slab", (0, 0, 0), (2.4, 0.22, 2.0), BASALT)
    cube("vein", (0.15, 0.12, 0), (2.1, 0.04, 0.12), GOLD)
    export_glb("terrace_slab")


def build_lantern_pillar():
    clear_scene()
    mats()
    cyl("post", (0, 1.1, 0), 0.12, 0.18, 2.2, BASALT, 7)
    cube("cap", (0, 2.28, 0), (0.42, 0.1, 0.42), GOLD)
    ico("flame", (0, 2.62, 0), 0.16, AETHER, 1)
    export_glb("lantern_pillar")


def build_source_well():
    clear_scene()
    mats()
    cyl("rim", (0, 0.18, 0), 1.15, 1.25, 0.36, BASALT, 10)
    cyl("inner", (0, 0.12, 0), 0.82, 0.82, 0.2, OBSIDIAN, 10)
    ico("core", (0, 0.42, 0), 0.38, AETHER, 1)
    export_glb("source_well")


def build_obsidian_shard():
    clear_scene()
    mats()
    bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=0.28, radius2=0.02, depth=1.1, location=(0, 0.55, 0))
    ob = bpy.context.active_object
    ob.name = "shard"
    ob.rotation_euler = (0.18, 0.4, 0.1)
    bpy.ops.object.transform_apply(rotation=True)
    assign(ob, OBSIDIAN)
    cube("edge", (0.02, 0.5, 0), (0.04, 0.9, 0.04), GOLD)
    export_glb("obsidian_shard")


def build_bridge_span():
    clear_scene()
    mats()
    cube("deck", (0, 0.08, 0), (2.8, 0.16, 1.5), BASALT)
    cube("rail_l", (0, 0.38, 0.68), (2.8, 0.08, 0.08), GOLD)
    cube("rail_r", (0, 0.38, -0.68), (2.8, 0.08, 0.08), GOLD)
    export_glb("bridge_span")


def build_isle_base():
    clear_scene()
    mats()
    cyl("mass", (0, -0.8, 0), 4.2, 1.4, 2.2, BASALT, 8)
    cyl("top", (0, 0.12, 0), 4.6, 4.4, 0.28, BASALT, 8)
    cube("vein", (0.4, 0.22, 0), (3.2, 0.05, 0.14), GOLD)
    export_glb("isle_base")


def build_sentinel():
    clear_scene()
    mats()
    cube("body", (0, 1.3, 0), (0.55, 2.4, 0.4), BASALT)
    cube("head", (0, 2.7, 0.05), (0.48, 0.42, 0.42), OBSIDIAN)
    ico("eye", (0, 2.72, 0.24), 0.08, AETHER, 1)
    cube("blade", (0.42, 1.6, 0), (0.08, 1.6, 0.08), GOLD)
    export_glb("sentinel")


def build_hut_accent():
    """Gold-vein roof finial — sits on the existing house, does not replace walls."""
    clear_scene()
    mats()
    cyl("spire", (0, 0.7, 0), 0.06, 0.22, 1.4, GOLD, 6)
    ico("orb", (0, 1.5, 0), 0.18, AETHER, 1)
    export_glb("hut_finial")


if __name__ == "__main__":
    for fn in (
        build_terrace_slab,
        build_lantern_pillar,
        build_source_well,
        build_obsidian_shard,
        build_bridge_span,
        build_isle_base,
        build_sentinel,
        build_hut_accent,
    ):
        fn()
    print("Aether Shelf assets done →", OUT_DIR)
