# =============================================================
#  THE JOURNEY 3D - Blender asset pipeline
#  Run headless:  blender --background --python build_assets.py
#  Generates low-poly stylized models for Truth's Hut and
#  exports one FBX per asset into ../Assets/Resources/Models
# =============================================================
import bpy
import math
import os

OUT_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "Assets", "Resources", "Models"))
os.makedirs(OUT_DIR, exist_ok=True)

# ---------- helpers ----------
_mats = {}

def mat(name, color, rough=0.85, metal=0.0, emit=None, emit_strength=2.0):
    key = name
    if key in _mats:
        return _mats[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit is not None:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emit, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit_strength
    _mats[key] = m
    return m


def hex_c(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

# palette (from the 2D hut)
WOOD_DARK = hex_c('1a120b')
WOOD_MID = hex_c('3a2a1c')
WOOD_LIGHT = hex_c('5a3d22')
STONE = hex_c('6b6f76')
STONE_DARK = hex_c('44474d')
GOLD = hex_c('fbbf24')
AMBER = hex_c('fcd34d')
ORANGE = hex_c('f97316')
CYAN = hex_c('22d3ee')
GREEN = hex_c('22c55e')
PURPLE = hex_c('7c5cff')
PAPER = hex_c('e8d9b0')
DARKVOID = hex_c('06080e')

M_WOOD_DARK = lambda: mat('wood_dark', WOOD_DARK)
M_WOOD_MID = lambda: mat('wood_mid', WOOD_MID)
M_WOOD_LIGHT = lambda: mat('wood_light', WOOD_LIGHT)
M_STONE = lambda: mat('stone', STONE)
M_STONE_DARK = lambda: mat('stone_dark', STONE_DARK)
M_GOLD = lambda: mat('gold', GOLD, rough=0.35, metal=0.9)
M_PAPER = lambda: mat('paper', PAPER, rough=0.9)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves):
        for b in list(block):
            if b.users == 0:
                block.remove(b)


def _apply(obj, material, name):
    obj.name = name
    if material is not None:
        obj.data.materials.append(material)
    return obj


def box(name, size, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    return _apply(o, material, name)


def cyl(name, r, depth, loc, material, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    return _apply(bpy.context.active_object, material, name)


def cone(name, r1, r2, depth, loc, material, rot=(0, 0, 0), verts=16):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    return _apply(bpy.context.active_object, material, name)


def sphere(name, r, loc, material, scale=(1, 1, 1), segs=16, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return _apply(o, material, name)


def torus(name, r_major, r_minor, loc, material, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=r_major, minor_radius=r_minor, location=loc, rotation=rot,
                                     major_segments=24, minor_segments=10)
    o = bpy.context.active_object
    o.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    return _apply(o, material, name)


def export_asset(name, objects):
    """Join objects into one mesh named `name`, export FBX, then delete."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    if len(objects) > 1:
        bpy.ops.object.join()
    root = bpy.context.view_layer.objects.active
    root.name = name
    root.location = root.location  # keep authored origin at world origin
    bpy.ops.object.select_all(action='DESELECT')
    root.select_set(True)
    path = os.path.join(OUT_DIR, name + ".fbx")
    bpy.ops.export_scene.fbx(
        filepath=path,
        use_selection=True,
        object_types={'MESH'},
        apply_scale_options='FBX_SCALE_ALL',
        add_leaf_bones=False,
        bake_anim=False,
        path_mode='COPY',
    )
    bpy.ops.object.delete(use_global=False)
    print("EXPORTED", path)


# =============================================================
#  1. HUT SHELL - 14x14 room, wood interior, beams, windows
# =============================================================

def build_hut_shell():
    parts = []
    W, H, T = 14.0, 4.2, 0.3
    parts.append(box('floor', (W + 1, W + 1, 0.25), (0, 0, -0.125), M_WOOD_MID()))
    # plank lines (thin raised strips)
    for i in range(-6, 7, 2):
        parts.append(box('plank', (0.06, W, 0.26), (i, 0, -0.11), M_WOOD_DARK()))
    # walls: back(+Y), front(-Y), left(-X), right(+X)
    # back wall (+Y) carries a walkable DOORWAY: gap X in [-0.75, 0.75], up to z=2.6
    parts.append(box('wall_back_l', (6.25, T, H), (-3.875, W / 2, H / 2), M_WOOD_LIGHT()))
    parts.append(box('wall_back_r', (6.25, T, H), (3.875, W / 2, H / 2), M_WOOD_LIGHT()))
    parts.append(box('wall_back_lintel', (1.5, T, 1.6), (0, W / 2, 3.4), M_WOOD_LIGHT()))
    # door frame posts (gold trim, cosmetic)
    parts.append(box('door_post_l', (0.12, T + 0.05, 2.6), (-0.81, W / 2, 1.3), M_WOOD_DARK()))
    parts.append(box('door_post_r', (0.12, T + 0.05, 2.6), (0.81, W / 2, 1.3), M_WOOD_DARK()))
    parts.append(box('door_head', (1.74, T + 0.05, 0.14), (0, W / 2, 2.62), M_WOOD_DARK()))
    parts.append(box('wall_front', (W, T, H), (0, -W / 2, H / 2), M_WOOD_LIGHT()))
    parts.append(box('wall_left', (T, W, H), (-W / 2, 0, H / 2), M_WOOD_LIGHT()))
    parts.append(box('wall_right', (T, W, H), (W / 2, 0, H / 2), M_WOOD_LIGHT()))
    # ceiling + beams
    parts.append(box('ceiling', (W + 1, W + 1, 0.2), (0, 0, H + 0.1), M_WOOD_DARK()))
    for i in range(-2, 3):
        parts.append(box('beam', (0.35, W, 0.35), (i * 3.0, 0, H - 0.18), M_WOOD_DARK()))
    # wainscot trim (+Y side split around the doorway so it doesn't bar the exit)
    yb = W / 2 - T / 2 - 0.05
    parts.append(box('trim', (6.25, 0.1, 0.15), (-3.875, yb, 1.1), M_WOOD_DARK()))
    parts.append(box('trim', (6.25, 0.1, 0.15), (3.875, yb, 1.1), M_WOOD_DARK()))
    parts.append(box('trim', (W, 0.1, 0.15), (0, -yb, 1.1), M_WOOD_DARK()))
    for (sx, sy, lx, ly) in ((0.1, W, W / 2 - T / 2 - 0.05, 0), (0.1, W, -(W / 2 - T / 2 - 0.05), 0)):
        parts.append(box('trim', (sx, sy, 0.15), (lx, ly, 1.1), M_WOOD_DARK()))
    # windows (emissive amber) on left / right walls
    win = mat('window_glow', AMBER, emit=AMBER, emit_strength=3.0)
    for y in (-3.2, 3.2):
        parts.append(box('win_l', (0.12, 1.4, 1.6), (-(W / 2 - T / 2 - 0.02), y, 2.3), win))
        parts.append(box('win_r', (0.12, 1.4, 1.6), ((W / 2 - T / 2 - 0.02), y, 2.3), win))
        for x in (-(W / 2 - T / 2 - 0.06), (W / 2 - T / 2 - 0.06)):
            parts.append(box('win_bar_v', (0.14, 0.08, 1.6), (x, y, 2.3), M_WOOD_DARK()))
            parts.append(box('win_bar_h', (0.14, 1.4, 0.08), (x, y, 2.3), M_WOOD_DARK()))
    # chimney breast (stone) on right wall centre
    parts.append(box('chimney', (1.0, 3.0, H), (W / 2 - 0.55, 0, H / 2), M_STONE_DARK()))
    export_asset('hut_shell', parts)


# =============================================================
#  2. FIREPLACE (fits against chimney breast)
# =============================================================

def build_fireplace():
    parts = []
    fire_core = mat('fire_core', hex_c('fde047'), emit=hex_c('fde047'), emit_strength=8.0)
    fire_mid = mat('fire_mid', ORANGE, emit=ORANGE, emit_strength=6.0)
    # hearth stones
    parts.append(box('hearth_base', (1.2, 2.6, 0.25), (0, 0, 0.125), M_STONE()))
    parts.append(box('hearth_l', (1.0, 0.4, 1.5), (0, -1.1, 0.75), M_STONE()))
    parts.append(box('hearth_r', (1.0, 0.4, 1.5), (0, 1.1, 0.75), M_STONE()))
    parts.append(box('hearth_top', (1.0, 2.6, 0.35), (0, 0, 1.65), M_STONE()))
    parts.append(box('firebox', (0.7, 1.7, 1.2), (0.1, 0, 0.85), mat('soot', DARKVOID)))
    # logs
    parts.append(cyl('log1', 0.12, 1.2, (-0.15, 0, 0.42), M_WOOD_DARK(), rot=(math.pi / 2, 0, 0)))
    parts.append(cyl('log2', 0.12, 1.0, (-0.05, 0, 0.6), M_WOOD_DARK(), rot=(math.pi / 2, 0, 0.3)))
    # flames
    parts.append(cone('flame1', 0.3, 0.02, 0.9, (-0.1, 0, 1.0), fire_mid))
    parts.append(cone('flame2', 0.2, 0.02, 0.7, (-0.12, -0.25, 0.9), fire_mid))
    parts.append(cone('flame3', 0.16, 0.02, 0.55, (-0.1, 0.22, 0.85), fire_core))
    export_asset('fireplace', parts)


# =============================================================
#  3. TRUTH - the hooded sage (orange robe, gold trim)
# =============================================================

def build_truth():
    parts = []
    robe = mat('truth_robe', hex_c('b3480f'), rough=0.9)
    robe_dark = mat('truth_robe_dark', hex_c('7c300a'), rough=0.95)
    face_void = mat('truth_face', DARKVOID)
    eye = mat('truth_eye', AMBER, emit=AMBER, emit_strength=10.0)
    # robe body
    parts.append(cone('robe', 0.55, 0.28, 1.5, (0, 0, 0.75), robe, verts=20))
    # shoulders / chest
    parts.append(sphere('chest', 0.34, (0, 0, 1.5), robe, scale=(1, 0.9, 0.8)))
    # hood
    parts.append(sphere('hood', 0.3, (0, 0, 1.86), robe_dark, scale=(1, 1.05, 1.15)))
    parts.append(cone('hood_tip', 0.18, 0.01, 0.35, (0, -0.08, 2.15), robe_dark, rot=(-0.5, 0, 0)))
    # face void + eyes (faces -Y forward)
    parts.append(sphere('face', 0.21, (0, -0.14, 1.84), face_void, scale=(0.9, 0.6, 1.0)))
    parts.append(sphere('eye_l', 0.035, (-0.08, -0.26, 1.88), eye))
    parts.append(sphere('eye_r', 0.035, (0.08, -0.26, 1.88), eye))
    # arms folded low
    parts.append(cyl('arm_l', 0.09, 0.62, (-0.3, -0.12, 1.18), robe, rot=(0.5, 0.9, 0)))
    parts.append(cyl('arm_r', 0.09, 0.62, (0.3, -0.12, 1.18), robe, rot=(0.5, -0.9, 0)))
    parts.append(sphere('hand_l', 0.075, (-0.1, -0.3, 1.05), face_void))
    parts.append(sphere('hand_r', 0.075, (0.1, -0.3, 1.05), face_void))
    # gold belt + trim
    parts.append(torus('belt', 0.42, 0.035, (0, 0, 1.05), M_GOLD(), rot=(0, 0, 0), scale=(1, 1, 1.6)))
    parts.append(torus('hem', 0.55, 0.03, (0, 0, 0.06), M_GOLD()))
    export_asset('truth_sage', parts)


# =============================================================
#  4. PLAYER AVATAR - teal tunic wanderer
# =============================================================

def build_player():
    parts = []
    # Named, distinct materials per body part so Unity can recolor them at
    # runtime (AvatarPalette in C# maps CharacterState indices -> these).
    # Defaults reproduce the original teal wanderer for a no-appearance soul.
    mat_top = mat('av_top', hex_c('0f766e'), rough=0.85)      # tunic / outfit
    mat_skin = mat('av_skin', hex_c('8d5a3b'), rough=0.8)
    mat_bottom = mat('av_bottom', hex_c('26221c'), rough=0.9)  # pants
    mat_hair = mat('av_hair', hex_c('141210'), rough=0.95)
    mat_boots = mat('av_boots', hex_c('4a3324'), rough=0.85)
    # legs
    parts.append(cyl('leg_l', 0.09, 0.62, (-0.13, 0, 0.4), mat_bottom))
    parts.append(cyl('leg_r', 0.09, 0.62, (0.13, 0, 0.4), mat_bottom))
    # boots
    parts.append(box('boot_l', (0.16, 0.24, 0.14), (-0.13, -0.03, 0.07), mat_boots))
    parts.append(box('boot_r', (0.16, 0.24, 0.14), (0.13, -0.03, 0.07), mat_boots))
    # torso
    parts.append(box('torso', (0.46, 0.28, 0.62), (0, 0, 1.0), mat_top))
    parts.append(torus('belt', 0.27, 0.03, (0, 0, 0.74), M_GOLD(), scale=(1, 0.7, 1.4)))
    # arms
    parts.append(cyl('arm_l', 0.07, 0.58, (-0.31, 0, 1.02), mat_top, rot=(0, 0.12, 0)))
    parts.append(cyl('arm_r', 0.07, 0.58, (0.31, 0, 1.02), mat_top, rot=(0, -0.12, 0)))
    parts.append(sphere('hand_l', 0.07, (-0.35, 0, 0.7), mat_skin))
    parts.append(sphere('hand_r', 0.07, (0.35, 0, 0.7), mat_skin))
    # head (faces -Y)
    parts.append(sphere('head', 0.2, (0, 0, 1.52), mat_skin))
    parts.append(sphere('hair', 0.21, (0, 0.03, 1.58), mat_hair, scale=(1, 1, 0.8)))
    export_asset('player_avatar', parts)


# =============================================================
#  5. ARCADE CABINET (screen faces -Y)
# =============================================================

def build_arcade():
    parts = []
    body = mat('cab_body', hex_c('101623'), rough=0.7)
    screen = mat('cab_screen', CYAN, emit=CYAN, emit_strength=5.0)
    marquee = mat('cab_marquee', PURPLE, emit=PURPLE, emit_strength=4.0)
    btn_g = mat('cab_btn_g', GREEN, emit=GREEN, emit_strength=2.0)
    btn_o = mat('cab_btn_o', ORANGE, emit=ORANGE, emit_strength=2.0)
    parts.append(box('cab', (0.85, 0.7, 1.75), (0, 0, 0.875), body))
    parts.append(box('screen', (0.62, 0.06, 0.5), (0, -0.36, 1.25), screen))
    parts.append(box('marquee', (0.85, 0.2, 0.25), (0, -0.28, 1.85), marquee))
    parts.append(box('deck', (0.85, 0.35, 0.09), (0, -0.5, 0.95), body, rot=(0.18, 0, 0)))
    parts.append(cyl('joy', 0.035, 0.12, (-0.2, -0.55, 1.02), body))
    parts.append(sphere('joy_ball', 0.05, (-0.2, -0.55, 1.09), btn_o))
    parts.append(cyl('btn1', 0.045, 0.03, (0.12, -0.52, 1.0), btn_g))
    parts.append(cyl('btn2', 0.045, 0.03, (0.26, -0.54, 0.99), btn_o))
    export_asset('arcade_cabinet', parts)


# =============================================================
#  6. FORGE - anvil, brazier, quench barrel
# =============================================================

def build_forge():
    parts = []
    iron = mat('iron', hex_c('3f4753'), rough=0.4, metal=0.85)
    ember = mat('ember', ORANGE, emit=ORANGE, emit_strength=7.0)
    # anvil on stump
    parts.append(cyl('stump', 0.3, 0.55, (0, 0, 0.275), M_WOOD_DARK()))
    parts.append(box('anvil_body', (0.55, 0.24, 0.22), (0, 0, 0.66), iron))
    parts.append(cone('anvil_horn', 0.1, 0.01, 0.3, (0.4, 0, 0.68), iron, rot=(0, math.pi / 2, 0)))
    parts.append(box('anvil_base', (0.3, 0.2, 0.12), (0, 0, 0.55), iron))
    # brazier
    parts.append(cyl('brazier_bowl', 0.34, 0.25, (-0.85, 0.1, 0.62), iron))
    parts.append(cyl('brazier_leg1', 0.03, 0.55, (-1.0, 0.0, 0.28), iron, rot=(0.15, 0, 0)))
    parts.append(cyl('brazier_leg2', 0.03, 0.55, (-0.72, 0.25, 0.28), iron, rot=(-0.1, 0.1, 0)))
    parts.append(cyl('brazier_leg3', 0.03, 0.55, (-0.82, -0.08, 0.28), iron, rot=(0, -0.12, 0)))
    parts.append(sphere('coals', 0.26, (-0.85, 0.1, 0.75), ember, scale=(1, 1, 0.5)))
    # quench barrel
    parts.append(cyl('barrel', 0.24, 0.55, (0.75, 0.25, 0.275), M_WOOD_MID()))
    parts.append(cyl('water', 0.2, 0.02, (0.75, 0.25, 0.54), mat('water', hex_c('1d4ed8'), rough=0.15)))
    export_asset('forge_station', parts)


# =============================================================
#  7. LEDGER LECTERN
# =============================================================

def build_ledger():
    parts = []
    flame = mat('candle_flame', AMBER, emit=AMBER, emit_strength=8.0)
    parts.append(cyl('post', 0.09, 1.1, (0, 0, 0.55), M_WOOD_MID()))
    parts.append(cyl('foot', 0.3, 0.08, (0, 0, 0.04), M_WOOD_DARK()))
    parts.append(box('desk', (0.7, 0.5, 0.06), (0, -0.05, 1.15), M_WOOD_LIGHT(), rot=(0.35, 0, 0)))
    parts.append(box('page_l', (0.3, 0.42, 0.025), (-0.16, -0.05, 1.2), M_PAPER(), rot=(0.35, 0, 0.06)))
    parts.append(box('page_r', (0.3, 0.42, 0.025), (0.16, -0.05, 1.2), M_PAPER(), rot=(0.35, 0, -0.06)))
    parts.append(cyl('candle', 0.035, 0.18, (0.42, 0.18, 1.28), M_PAPER()))
    parts.append(cone('candle_fl', 0.03, 0.005, 0.09, (0.42, 0.18, 1.42), flame))
    export_asset('ledger_lectern', parts)


# =============================================================
#  8. SEEING GLASS - scrying orb on pedestal
# =============================================================

def build_seeing_glass():
    parts = []
    orb = mat('orb', hex_c('67e8f9'), rough=0.1, emit=hex_c('22d3ee'), emit_strength=3.0)
    parts.append(cone('pedestal', 0.34, 0.2, 1.0, (0, 0, 0.5), M_STONE_DARK(), verts=10))
    parts.append(cyl('pedestal_top', 0.26, 0.06, (0, 0, 1.03), M_STONE()))
    parts.append(sphere('orb', 0.3, (0, 0, 1.36), orb, segs=24, rings=16))
    parts.append(torus('orb_ring', 0.4, 0.025, (0, 0, 1.36), M_GOLD(), rot=(0.6, 0, 0.4)))
    export_asset('seeing_glass', parts)


# =============================================================
#  9. ARCHIVE SHELF - scrolls & tomes
# =============================================================

def build_archive():
    parts = []
    parts.append(box('frame_l', (0.08, 0.45, 2.2), (-0.7, 0, 1.1), M_WOOD_DARK()))
    parts.append(box('frame_r', (0.08, 0.45, 2.2), (0.7, 0, 1.1), M_WOOD_DARK()))
    parts.append(box('back', (1.48, 0.05, 2.2), (0, 0.2, 1.1), M_WOOD_MID()))
    for z in (0.35, 0.95, 1.55, 2.1):
        parts.append(box('shelf', (1.4, 0.42, 0.06), (0, 0, z), M_WOOD_LIGHT()))
    # scrolls (paper cylinders) on two shelves
    for i, x in enumerate((-0.5, -0.28, -0.05, 0.2, 0.45)):
        parts.append(cyl('scroll', 0.055, 0.4, (x, 0, 0.35 + 0.07 + 0.055), M_PAPER(), rot=(0, math.pi / 2, 0.12 * (i % 3 - 1))))
    for i, x in enumerate((-0.45, -0.2, 0.1, 0.38)):
        parts.append(cyl('scroll2', 0.055, 0.4, (x, 0, 1.55 + 0.07 + 0.055), M_PAPER(), rot=(0, math.pi / 2, -0.1 * (i % 2))))
    # books standing on middle shelf
    for x, c in ((-0.5, '7c5cff'), (-0.36, '22c55e'), (-0.22, 'b3480f'), (-0.08, '1d4ed8'), (0.08, 'fbbf24')):
        parts.append(box('book', (0.11, 0.3, 0.42), (x, 0, 0.95 + 0.07 + 0.21), mat('book_' + c, hex_c(c), rough=0.8)))
    export_asset('archive_shelf', parts)


# =============================================================
#  10. SOUL MIRROR - standing oval mirror
# =============================================================

def build_soul_mirror():
    parts = []
    glass = mat('mirror_glass', hex_c('cbd5e1'), rough=0.05, metal=0.9, emit=hex_c('94a3b8'), emit_strength=0.6)
    parts.append(torus('frame', 0.55, 0.05, (0, 0, 1.35), M_GOLD(), rot=(math.pi / 2, 0, 0), scale=(1, 1, 1.35)))
    parts.append(cyl('glass', 0.52, 0.02, (0, 0.01, 1.35), glass, rot=(math.pi / 2, 0, 0), verts=28))
    parts.append(box('leg_l', (0.08, 0.5, 0.08), (-0.45, 0, 0.04), M_WOOD_DARK()))
    parts.append(box('leg_r', (0.08, 0.5, 0.08), (0.45, 0, 0.04), M_WOOD_DARK()))
    parts.append(box('spine', (0.9, 0.08, 0.08), (0, 0, 0.35), M_WOOD_DARK()))
    export_asset('soul_mirror', parts)


# =============================================================
#  11. OFFERING - pedestal bowl with gold
# =============================================================

def build_offering():
    parts = []
    parts.append(box('plinth', (0.6, 0.6, 0.9), (0, 0, 0.45), M_STONE_DARK()))
    parts.append(box('plinth_top', (0.72, 0.72, 0.08), (0, 0, 0.94), M_STONE()))
    parts.append(cyl('bowl', 0.32, 0.16, (0, 0, 1.06), M_GOLD(), verts=20))
    parts.append(cyl('coins', 0.26, 0.06, (0, 0, 1.16), mat('coins', AMBER, rough=0.3, metal=1.0, emit=AMBER, emit_strength=1.2)))
    for x, y in ((-0.28, 0.28), (0.3, -0.26)):
        parts.append(cyl('candle_o', 0.04, 0.22, (x, y, 1.05), M_PAPER()))
        parts.append(cone('candle_ofl', 0.03, 0.005, 0.08, (x, y, 1.2), mat('candle_flame', AMBER, emit=AMBER, emit_strength=8.0)))
    export_asset('offering_altar', parts)


# =============================================================
#  12. WAYFINDER TABLE - map & destination pins
# =============================================================

def build_wayfinder():
    parts = []
    parts.append(cyl('table_top', 0.75, 0.07, (0, 0, 0.9), M_WOOD_LIGHT(), verts=24))
    parts.append(cyl('table_leg', 0.12, 0.88, (0, 0, 0.44), M_WOOD_DARK()))
    parts.append(cyl('table_foot', 0.4, 0.06, (0, 0, 0.03), M_WOOD_DARK()))
    parts.append(cyl('map', 0.6, 0.015, (0, 0, 0.945), M_PAPER(), verts=24))
    # destination pins: Eden green, Fair amber, Giza orange, Kolbrin cyan, Emerald purple
    pins = ((-0.3, 0.2, '22c55e'), (0.25, 0.3, 'fbbf24'), (0.35, -0.2, 'f97316'), (-0.15, -0.35, '22d3ee'), (0.0, 0.05, '7c5cff'))
    for x, y, c in pins:
        parts.append(cone('pin_' + c, 0.045, 0.005, 0.16, (x, y, 1.03), mat('pin_' + c, hex_c(c), emit=hex_c(c), emit_strength=3.0)))
    parts.append(torus('compass', 0.68, 0.02, (0, 0, 0.95), M_GOLD()))
    export_asset('wayfinder_table', parts)


# =============================================================
#  13. SANCTUM DOOR - grand double door (against back wall)
# =============================================================

def build_sanctum_door():
    parts = []
    door = mat('sanctum_door', hex_c('2a1f3d'), rough=0.6)
    seam = mat('sanctum_seam', PURPLE, emit=PURPLE, emit_strength=5.0)
    parts.append(box('frame_l', (0.18, 0.25, 2.6), (-0.95, 0, 1.3), M_WOOD_DARK()))
    parts.append(box('frame_r', (0.18, 0.25, 2.6), (0.95, 0, 1.3), M_WOOD_DARK()))
    parts.append(box('frame_top', (2.08, 0.25, 0.2), (0, 0, 2.7), M_WOOD_DARK()))
    parts.append(box('door_l', (0.82, 0.12, 2.5), (-0.44, 0, 1.25), door))
    parts.append(box('door_r', (0.82, 0.12, 2.5), (0.44, 0, 1.25), door))
    parts.append(box('seam', (0.06, 0.14, 2.5), (0, 0, 1.25), seam))
    parts.append(sphere('handle_l', 0.06, (-0.15, -0.1, 1.25), M_GOLD()))
    parts.append(sphere('handle_r', 0.06, (0.15, -0.1, 1.25), M_GOLD()))
    # arch glyph
    parts.append(torus('glyph', 0.35, 0.03, (0, -0.08, 2.15), seam, rot=(math.pi / 2, 0, 0)))
    export_asset('sanctum_door', parts)


# =============================================================
#  14. HUT RUG (center, cozy)
# =============================================================

def build_rug():
    parts = []
    parts.append(cyl('rug', 1.6, 0.03, (0, 0, 0.015), mat('rug', hex_c('7c2d12'), rough=0.95), verts=28))
    parts.append(torus('rug_trim', 1.5, 0.025, (0, 0, 0.03), M_GOLD(), scale=(1, 1, 0.5)))
    export_asset('hut_rug', parts)


# =============================================================
#  EXTERIOR — a small bounded yard around the hut
#  (Blender Z-up: ground top at z=0 to match the interior floor.)
# =============================================================

TERRAIN_GRASS = hex_c('2d5016')
TERRAIN_PATH = hex_c('8b7355')
ROOF_THATCH = hex_c('6b4423')
TREE_BARK = hex_c('3d2817')
TREE_LEAVES = hex_c('1f4620')
ROCK_GREY = hex_c('5a5a5a')
SKY_COLOR = hex_c('bcd7ee')


def build_terrain():
    parts = []
    grass = mat('terrain_grass', TERRAIN_GRASS, rough=1.0)
    # broad flat ground, top face at z=0 (seamless with the interior floor)
    parts.append(box('ground', (48, 48, 0.5), (0, 0, -0.25), grass))
    export_asset('terrain_ground', parts)


def build_path():
    parts = []
    stone = mat('path_stone', TERRAIN_PATH, rough=1.0)
    # stepping path leading OUT the +Y doorway, just above the grass
    for i, y in enumerate(range(8, 20, 2)):
        parts.append(box('paver', (1.4, 1.6, 0.06), (0, y, 0.02), stone))
    export_asset('terrain_path', parts)


def build_hut_roof():
    # Pitched gable roof that sits on top of the 14x14 walls (wall top z=4.2).
    # Ridge runs along Y; two slabs slope down toward +/-X. Plus a chimney cap.
    parts = []
    roof = mat('roof_thatch', ROOF_THATCH, rough=0.95)
    ridge_z = 6.4
    eave_z = 4.1
    half = 7.6                      # eave overhang beyond the 7.0 wall
    run = half                      # horizontal run per slope
    rise = ridge_z - eave_z
    slope_len = math.sqrt(run * run + rise * rise)
    ang = math.atan2(rise, run)     # tilt about Y
    midz = (ridge_z + eave_z) / 2
    # left slab (slopes down toward -X)
    parts.append(box('roof_l', (slope_len, 16.0, 0.3), (-run / 2, 0, midz), roof, rot=(0, ang, 0)))
    # right slab (slopes down toward +X)
    parts.append(box('roof_r', (slope_len, 16.0, 0.3), (run / 2, 0, midz), roof, rot=(0, -ang, 0)))
    # gable end fills (approximated with a thin tall box)
    parts.append(box('gable_a', (0.3, 15.6, rise), (0, 7.9, eave_z + rise / 2), M_WOOD_LIGHT()))
    parts.append(box('gable_b', (0.3, 15.6, rise), (0, -7.9, eave_z + rise / 2), M_WOOD_LIGHT()))
    # ridge beam
    parts.append(box('ridge', (0.35, 16.0, 0.35), (0, 0, ridge_z), M_WOOD_DARK()))
    # chimney cap above the fireplace side (+X, matches interior chimney)
    parts.append(box('chimney_cap', (1.1, 1.4, 1.6), (6.45, 0, 5.6), M_STONE_DARK()))
    export_asset('hut_exterior', parts)


def build_tree(name, leaves_hex, tall=True):
    parts = []
    bark = mat('tree_bark', TREE_BARK, rough=1.0)
    leaves = mat(name + '_leaves', leaves_hex, rough=1.0)
    h = 2.6 if tall else 1.9
    parts.append(cyl('trunk', 0.16, h, (0, 0, h / 2), bark, verts=8))
    if tall:  # pine: stacked cones
        parts.append(cone('c1', 1.0, 0.02, 1.5, (0, 0, h + 0.2), leaves, verts=10))
        parts.append(cone('c2', 0.8, 0.02, 1.3, (0, 0, h + 0.9), leaves, verts=10))
        parts.append(cone('c3', 0.55, 0.02, 1.0, (0, 0, h + 1.6), leaves, verts=10))
    else:     # oak: round canopy
        parts.append(sphere('canopy', 1.15, (0, 0, h + 0.7), leaves, segs=10, rings=7))
    export_asset(name, parts)


def build_rock(name, r):
    parts = []
    rock = mat('rock_grey', ROCK_GREY, rough=1.0)
    parts.append(sphere('r0', r, (0, 0, r * 0.55), rock, scale=(1.3, 1.0, 0.7), segs=8, rings=6))
    parts.append(sphere('r1', r * 0.6, (r * 0.5, r * 0.2, r * 0.5), rock, scale=(1, 1, 0.8), segs=8, rings=6))
    export_asset(name, parts)


def build_sky_dome():
    # Large inward-facing dome, emissive so it self-lights regardless of scene lights.
    parts = []
    sky = mat('sky', SKY_COLOR, rough=1.0, emit=SKY_COLOR, emit_strength=1.0)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=60, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = 'sky'
    o.data.materials.append(sky)
    # flip normals so it renders from the inside
    import bmesh
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.flip_normals()
    bpy.ops.object.mode_set(mode='OBJECT')
    export_asset('sky_dome', [o])


if __name__ == '__main__' or True:
    clear_scene()
    build_hut_shell()
    build_fireplace()
    build_truth()
    build_player()
    build_arcade()
    build_forge()
    build_ledger()
    build_seeing_glass()
    build_archive()
    build_soul_mirror()
    build_offering()
    build_wayfinder()
    build_sanctum_door()
    build_rug()
    # exterior yard
    build_terrain()
    build_path()
    build_hut_roof()
    build_tree('tree_pine', TREE_LEAVES, tall=True)
    build_tree('tree_oak', hex_c('2f5a1e'), tall=False)
    build_rock('rock_small', 0.5)
    build_rock('rock_large', 0.9)
    build_sky_dome()
    print("ALL ASSETS EXPORTED ->", OUT_DIR)
