using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Batch diagnostic: reads the imported models and reports, in UNITY space,
    /// where the hut walls sit and which wall carries the doorway gap, plus
    /// readability/bounds for every model. Run:
    ///   Unity -batchmode -executeMethod Journey3D.EditorTools.GeomProbe.Probe -quit
    public static class GeomProbe
    {
        public static void ProbeKenney()
        {
            foreach (var name in new[]
            {
                "nat_tree_default", "nat_tree_pineTallA", "nat_tree_oak", "nat_rock_largeA",
                "nat_stone_tallC", "nat_plant_bushLarge", "nat_flower_redA", "nat_mushroom_redGroup",
                "fur_table", "fur_chairRounded", "fur_bookcaseOpen", "fur_rugRound", "fur_pottedPlant",
            })
            {
                var prefab = Resources.Load<GameObject>("Models/kenney/" + name);
                if (prefab == null) { Debug.Log($"KPROBE {name}: MISSING"); continue; }
                var rends = prefab.GetComponentsInChildren<MeshRenderer>();
                var b = new Bounds();
                bool first = true;
                string col = "?";
                foreach (var r in rends)
                {
                    if (first) { b = r.bounds; first = false; } else b.Encapsulate(r.bounds);
                    if (r.sharedMaterial != null && col == "?")
                        col = r.sharedMaterial.HasProperty("_Color") ? r.sharedMaterial.color.ToString() : "no _Color";
                }
                Debug.Log($"KPROBE {name}: size={b.size} center={b.center} mats={rends.Length} firstColor={col}");
            }
            Debug.Log("KPROBE done");
        }

        public static void Probe()
        {
            foreach (var name in new[]
            {
                "hut_shell", "terrain_ground", "terrain_path", "hut_exterior",
                "sky_dome", "tree_pine", "rock_large", "truth_sage", "player_avatar",
            })
            {
                var prefab = Resources.Load<GameObject>("Models/" + name);
                if (prefab == null) { Debug.Log($"PROBE {name}: MISSING"); continue; }
                var mf = prefab.GetComponentInChildren<MeshFilter>();
                if (mf == null || mf.sharedMesh == null) { Debug.Log($"PROBE {name}: no mesh"); continue; }
                var mesh = mf.sharedMesh;
                var b = mesh.bounds;
                // account for import scale on the transform
                var s = mf.transform.lossyScale;
                Debug.Log($"PROBE {name}: readable={mesh.isReadable} verts={mesh.vertexCount} " +
                          $"boundsCenter={b.center} boundsSize={b.size} scale={s}");
            }

            // door detection: sample hut_shell vertices in world-ish space (apply transform scale)
            var shell = Resources.Load<GameObject>("Models/hut_shell");
            var smf = shell.GetComponentInChildren<MeshFilter>();
            var m = smf.sharedMesh;
            var scale = smf.transform.lossyScale;
            var verts = m.vertices;
            int nearPosZ = 0, nearNegZ = 0, doorPosZ = 0, doorNegZ = 0, nearPosX = 0, nearNegX = 0;
            foreach (var vRaw in verts)
            {
                var v = Vector3.Scale(vRaw, scale);
                bool doorBand = Mathf.Abs(v.x) < 1.4f && v.y > 0.3f && v.y < 2.3f;
                if (v.z > 6.5f) { nearPosZ++; if (doorBand) doorPosZ++; }
                if (v.z < -6.5f) { nearNegZ++; if (doorBand) doorNegZ++; }
                if (v.x > 6.5f) nearPosX++;
                if (v.x < -6.5f) nearNegX++;
            }
            Debug.Log($"PROBE walls: +Z verts={nearPosZ} (doorBand {doorPosZ})  -Z verts={nearNegZ} (doorBand {doorNegZ})  +X={nearPosX}  -X={nearNegX}");
            Debug.Log("PROBE door wall = the +/-Z wall whose doorBand count is LOW relative to the other (gap = few verts at door height near x=0; posts add some)");
        }
    }
}
