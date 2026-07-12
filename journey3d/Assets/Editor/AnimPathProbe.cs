using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Dumps first rotation curve paths from anim donors + bone hierarchy of a char.
    public static class AnimPathProbe
    {
        public static void Probe()
        {
            foreach (var donor in new[] { "anims_masc", "anims_fem" })
            {
                var clips = Resources.LoadAll<AnimationClip>("Models/quaternius/" + donor);
                Debug.Log($"APROBE donor {donor}: {clips.Length} clips");
                if (clips.Length == 0) continue;
                var clip = clips[0];
                var binds = AnimationUtility.GetCurveBindings(clip);
                int n = 0;
                foreach (var b in binds)
                {
                    if (!b.propertyName.StartsWith("m_LocalRotation")) continue;
                    Debug.Log($"APROBE path[{n}]='{b.path}' prop={b.propertyName}");
                    if (++n >= 12) break;
                }
            }

            var prefab = Resources.Load<GameObject>("Models/quaternius/char_masc_tunic");
            if (prefab != null)
            {
                Debug.Log("APROBE char hierarchy (all):");
                Dump(prefab.transform, 0, 200);
                Debug.Log("APROBE leg-like names:");
                DumpMatch(prefab.transform, "leg");
                DumpMatch(prefab.transform, "thigh");
                DumpMatch(prefab.transform, "foot");
                DumpMatch(prefab.transform, "hip");
                DumpMatch(prefab.transform, "shin");
            }
            Debug.Log("APROBE done");
        }

        private static int Dump(Transform t, int depth, int budget)
        {
            if (budget <= 0) return 0;
            Debug.Log($"APROBE bone {new string(' ', depth * 2)}{t.name}");
            budget--;
            for (int i = 0; i < t.childCount && budget > 0; i++)
                budget = Dump(t.GetChild(i), depth + 1, budget);
            return budget;
        }

        private static void DumpMatch(Transform t, string part)
        {
            if (t.name.ToLowerInvariant().Contains(part))
                Debug.Log($"APROBE match '{part}': {GetPath(t)}");
            for (int i = 0; i < t.childCount; i++) DumpMatch(t.GetChild(i), part);
        }

        private static string GetPath(Transform t)
        {
            var s = t.name;
            while (t.parent != null) { t = t.parent; s = t.name + "/" + s; }
            return s;
        }
    }
}
