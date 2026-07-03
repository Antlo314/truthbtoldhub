using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Recolors the player avatar's named part-materials from CharacterState.
    /// The Blender rig exports one mesh with materials named av_skin/av_hair/
    /// av_top/av_bottom/av_boots (+ gold belt); we tint those instances.
    public class PlayerAppearance : MonoBehaviour
    {
        private readonly List<Material> _mats = new List<Material>();

        public void Bind(GameObject avatar)
        {
            _mats.Clear();
            foreach (var mr in avatar.GetComponentsInChildren<MeshRenderer>())
                _mats.AddRange(mr.materials);   // instanced copies, safe to tint
            Apply();
        }

        public void Apply()
        {
            var c = SaveState.Character;
            int beard = c.beardColor < 0 ? c.hairColor : c.beardColor;
            foreach (var m in _mats)
            {
                if (m == null) continue;
                string n = m.name.ToLowerInvariant();
                if (n.Contains("av_skin")) SetColor(m, AvatarPalette.Skin(c.skin));
                else if (n.Contains("av_hair")) SetColor(m, AvatarPalette.Hair(beard >= 0 ? c.hairColor : 0));
                else if (n.Contains("av_top")) SetColor(m, AvatarPalette.Cloth(c.top));
                else if (n.Contains("av_bottom")) SetColor(m, AvatarPalette.Cloth(c.bottom));
                else if (n.Contains("av_boots")) SetColor(m, AvatarPalette.Boot(c.boots));
            }
        }

        private static void SetColor(Material m, Color col)
        {
            if (m.HasProperty("_Color")) m.color = col;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", col);
        }
    }
}
