using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Which local rotation channels move on Walk for Quaternius legs?
    public static class LegAxisProbe
    {
        public static void Probe()
        {
            foreach (var donor in new[] { "anims_masc", "anims_fem" })
            {
                var clips = Resources.LoadAll<AnimationClip>("Models/quaternius/" + donor);
                foreach (var clip in clips)
                {
                    string shortName = clip.name;
                    int bar = shortName.LastIndexOf('|');
                    if (bar >= 0) shortName = shortName.Substring(bar + 1);
                    if (shortName != "Walk" && shortName != "Idle_Neutral" && shortName != "Run") continue;

                    Debug.Log($"LEGPROBE === {donor} / {shortName} ===");
                    foreach (var b in AnimationUtility.GetCurveBindings(clip))
                    {
                        bool leg = b.path.Contains("UpperLeg") || b.path.Contains("LowerLeg")
                                   || b.path.EndsWith("Hips") || b.path.Contains("/Hips");
                        if (!leg) continue;
                        if (!b.propertyName.StartsWith("m_LocalRotation")) continue;
                        var c = AnimationUtility.GetEditorCurve(clip, b);
                        if (c == null || c.keys.Length < 2) continue;
                        float min = c.keys[0].value, max = c.keys[0].value;
                        foreach (var k in c.keys)
                        {
                            if (k.value < min) min = k.value;
                            if (k.value > max) max = k.value;
                        }
                        float amp = max - min;
                        if (amp < 0.015f) continue;
                        Debug.Log($"LEGPROBE {shortName} | {b.path} | {b.propertyName} amp={amp:F3} [{min:F2},{max:F2}]");
                    }
                }
            }
            Debug.Log("LEGPROBE done");
        }
    }
}
