"""
Headless Blender: rigged low-poly man/woman vessels (bone-parented limbs).
Arms attached to shoulders; legs to hips; animatable from Three.js.

  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" --background --python tools/blender/build_vessels.py
"""
import os
import math
import bpy
from mathutils import Vector, Matrix

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUT_DIR = os.path.join(ROOT, "public", "models", "vessels")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.armatures, bpy.data.objects):
        for b in list(coll):
            coll.remove(b)


def make_mat(name, rgb, rough=0.8):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        if "Roughness" in bsdf.inputs:
            bsdf.inputs["Roughness"].default_value = rough
    return m


def mesh_cube(name, loc, size, mat, collection):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if mat:
        ob.data.materials.append(mat)
    return ob


def mesh_cyl(name, loc, radius, depth, mat, segs=8):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=segs, radius=radius, depth=depth, location=loc
    )
    ob = bpy.context.active_object
    ob.name = name
    if mat:
        ob.data.materials.append(mat)
    return ob


def mesh_sphere(name, loc, radius, mat, segs=10):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segs, ring_count=max(4, segs // 2), radius=radius, location=loc
    )
    ob = bpy.context.active_object
    ob.name = name
    if mat:
        ob.data.materials.append(mat)
    return ob


def create_armature(kind):
    """Standard humanoid, T-pose-ish, feet at Z=0. Units meters."""
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm_ob = bpy.context.active_object
    arm_ob.name = f"Armature_{kind}"
    arm = arm_ob.data
    arm.name = f"ArmatureData_{kind}"

    # Remove default bone
    eb = arm.edit_bones
    for b in list(eb):
        eb.remove(b)

    def bone(name, head, tail, parent=None):
        b = eb.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if parent:
            b.parent = eb[parent]
            b.use_connect = False
        return b

    # Vertical spine (Z-up in Blender)
    bone("Hips", (0, 0, 0.90), (0, 0, 1.02))
    bone("Spine", (0, 0, 1.02), (0, 0, 1.22), "Hips")
    bone("Chest", (0, 0, 1.22), (0, 0, 1.38), "Spine")
    bone("Neck", (0, 0, 1.38), (0, 0, 1.46), "Chest")
    bone("Head", (0, 0, 1.46), (0, 0, 1.62), "Neck")

    # Legs
    bone("LeftUpperLeg", (-0.11, 0, 0.90), (-0.11, 0, 0.50), "Hips")
    bone("LeftLowerLeg", (-0.11, 0, 0.50), (-0.11, 0, 0.10), "LeftUpperLeg")
    bone("LeftFoot", (-0.11, 0, 0.10), (-0.11, 0.12, 0.02), "LeftLowerLeg")

    bone("RightUpperLeg", (0.11, 0, 0.90), (0.11, 0, 0.50), "Hips")
    bone("RightLowerLeg", (0.11, 0, 0.50), (0.11, 0, 0.10), "RightUpperLeg")
    bone("RightFoot", (0.11, 0, 0.10), (0.11, 0.12, 0.02), "RightLowerLeg")

    # Arms from chest — slightly out (A-pose light)
    bone("LeftUpperArm", (-0.16, 0, 1.34), (-0.38, 0, 1.18), "Chest")
    bone("LeftLowerArm", (-0.38, 0, 1.18), (-0.52, 0, 1.00), "LeftUpperArm")
    bone("LeftHand", (-0.52, 0, 1.00), (-0.58, 0, 0.96), "LeftLowerArm")

    bone("RightUpperArm", (0.16, 0, 1.34), (0.38, 0, 1.18), "Chest")
    bone("RightLowerArm", (0.38, 0, 1.18), (0.52, 0, 1.00), "RightUpperArm")
    bone("RightHand", (0.52, 0, 1.00), (0.58, 0, 0.96), "RightLowerArm")

    bpy.ops.object.mode_set(mode="OBJECT")
    return arm_ob


def parent_to_bone(obj, armature, bone_name):
    """Bone-parent mesh while keeping current world placement."""
    mw = obj.matrix_world.copy()
    obj.parent = armature
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    # Restore world matrix after parenting
    obj.matrix_world = mw


def build_vessel(kind="man"):
    clear_scene()
    is_fem = kind == "woman"

    m_skin = make_mat("skin", (0.82, 0.60, 0.45))
    m_hair = make_mat("hair", (0.12, 0.09, 0.08))
    m_top = make_mat("cloth_top", (0.22, 0.48, 0.50))
    m_bottom = make_mat("cloth_bottom", (0.16, 0.18, 0.26))
    m_boots = make_mat("boots", (0.20, 0.14, 0.10))
    m_eye = make_mat("eye", (0.12, 0.14, 0.18), 0.35)

    shoulder_w = 0.34 if is_fem else 0.40
    hip_w = 0.36 if is_fem else 0.34
    torso_r = 0.15 if is_fem else 0.17
    head_r = 0.10 if is_fem else 0.105
    arm_r = 0.042 if is_fem else 0.048
    thigh_r = 0.07 if is_fem else 0.075

    arm_ob = create_armature(kind)

    parts = []

    # Hips mesh at hips bone
    hips = mesh_cyl("HipsMesh", (0, 0, 0.94), hip_w * 0.42, 0.14, m_bottom, 10)
    parts.append((hips, "Hips"))

    # Torso / chest (short)
    torso = mesh_cyl("TorsoMesh", (0, 0, 1.20), torso_r, 0.30, m_top, 10)
    parts.append((torso, "Chest"))

    # Head + hair
    head = mesh_sphere("HeadMesh", (0, 0, 1.52), head_r, m_skin, 12)
    parts.append((head, "Head"))
    hair = mesh_sphere("HairMesh", (0, -0.01, 1.56), head_r * 1.06, m_hair, 10)
    hair.scale = (1.05, 1.05, 0.7)
    bpy.context.view_layer.objects.active = hair
    bpy.ops.object.transform_apply(scale=True)
    parts.append((hair, "Head"))

    # Eyes
    for sx, name in ((-1, "EyeL"), (1, "EyeR")):
        e = mesh_sphere(name, (sx * 0.035, 0.09, 1.53), 0.014, m_eye, 6)
        parts.append((e, "Head"))

    # Legs
    for sx, side in ((-1, "Left"), (1, "Right")):
        x = sx * 0.11
        thigh = mesh_cyl(f"Thigh_{side}", (x, 0, 0.70), thigh_r, 0.38, m_bottom, 8)
        parts.append((thigh, f"{side}UpperLeg"))
        shin = mesh_cyl(f"Shin_{side}", (x, 0, 0.30), thigh_r * 0.78, 0.36, m_bottom, 8)
        parts.append((shin, f"{side}LowerLeg"))
        foot = mesh_cube(
            f"Foot_{side}",
            (x, 0.04, 0.05),
            (0.10, 0.18, 0.08),
            m_boots,
            None,
        )
        parts.append((foot, f"{side}Foot"))

    # Arms — attached along upper/lower arm bones
    for sx, side in ((-1, "Left"), (1, "Right")):
        # Upper arm midpoint between shoulder and elbow
        ux = sx * 0.27
        uz = 1.26
        upper = mesh_cyl(f"UpperArm_{side}", (ux, 0, uz), arm_r, 0.30, m_skin, 8)
        # Rotate cylinder to align roughly along bone (down-out)
        upper.rotation_euler = (0, 0, sx * 0.55)
        bpy.context.view_layer.objects.active = upper
        bpy.ops.object.transform_apply(rotation=True)
        parts.append((upper, f"{side}UpperArm"))

        lx = sx * 0.45
        lz = 1.09
        lower = mesh_cyl(f"LowerArm_{side}", (lx, 0, lz), arm_r * 0.9, 0.26, m_skin, 8)
        lower.rotation_euler = (0, 0, sx * 0.7)
        bpy.context.view_layer.objects.active = lower
        bpy.ops.object.transform_apply(rotation=True)
        parts.append((lower, f"{side}LowerArm"))

        hand = mesh_sphere(f"Hand_{side}", (sx * 0.55, 0, 0.98), 0.04, m_skin, 8)
        parts.append((hand, f"{side}Hand"))

    # Parent each mesh to its bone (keeps attachment under animation)
    bpy.context.view_layer.update()
    for ob, bname in parts:
        # Clear parent first
        ob.parent = None
        parent_to_bone(ob, arm_ob, bname)

    # Select armature + meshes for export
    bpy.ops.object.select_all(action="DESELECT")
    arm_ob.select_set(True)
    for ob, _ in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = arm_ob

    return arm_ob


def export_glb(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=False,
        export_apply=False,
        export_yup=True,
        export_animations=False,
        export_skins=True,
        export_def_bones=False,
    )
    print("Exported", path)


def main():
    for kind in ("man", "woman"):
        build_vessel(kind)
        export_glb(os.path.join(OUT_DIR, f"vessel_{kind}.glb"))
    print("DONE", OUT_DIR)


if __name__ == "__main__":
    main()
