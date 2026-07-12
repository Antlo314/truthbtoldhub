using UnityEditor;
using UnityEngine;
namespace Journey3D.EditorTools {
public static class FootProbe {
  public static void Probe() {
    var clips = Resources.LoadAll<AnimationClip>("Models/quaternius/anims_masc");
    foreach (var clip in clips) {
      string n = clip.name; int b = n.LastIndexOf('|'); if (b>=0) n=n.Substring(b+1);
      if (n!="Walk" && n!="Idle_Neutral") continue;
      Debug.Log("FOOTPROBE clip="+n);
      foreach (var bind in AnimationUtility.GetCurveBindings(clip)) {
        if (!bind.path.Contains("Foot") && !bind.path.Contains("LowerLeg") && !bind.path.EndsWith("Root") && !bind.path.EndsWith("CharacterArmature") && !bind.path.Contains("UpperLeg")) continue;
        var c = AnimationUtility.GetEditorCurve(clip, bind);
        if (c==null||c.keys.Length<1) continue;
        float min=c.keys[0].value,max=c.keys[0].value;
        foreach (var k in c.keys){ if(k.value<min)min=k.value; if(k.value>max)max=k.value; }
        float amp=max-min;
        if (amp<0.0001f && !bind.propertyName.StartsWith("m_LocalPosition")) continue;
        Debug.Log("FOOTPROBE "+n+" | "+bind.path+" | "+bind.propertyName+" amp="+amp.ToString("F4"));
      }
    }
    Debug.Log("FOOTPROBE done");
  }
}}
