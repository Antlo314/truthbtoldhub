using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Owns the player's visible character: picks the Quaternius model for
    /// the saved build+outfit and tints its named materials from the palette
    /// indices (shared byte-for-byte with the 2D game's save format).
    public class PlayerAppearance : MonoBehaviour
    {
        private GameObject _model;
        private string _build = "", _outfit = "";
        private readonly List<Material> _mats = new List<Material>();

        public CharacterRig Rig { get; private set; }

        /// Per-outfit garment materials to tint (top / legs / boots).
        /// Unmapped materials keep the kit's own colors.
        private struct Garb { public string[] top, bottom, boots; }
        private static readonly Dictionary<string, Garb> GARB = new Dictionary<string, Garb>
        {
            // masc (Ultimate Modular Men)
            { "masc/tunic",    new Garb { top = new[]{"red_dark"}, bottom = new[]{"lightblue"}, boots = new[]{"white"} } },
            { "masc/cloak",    new Garb { top = new[]{"purple"}, bottom = new[]{"lightblue"}, boots = new[]{"white"} } },
            { "masc/wanderer", new Garb { top = new[]{"green","lightgreen"}, bottom = new[]{"brown2"}, boots = new[]{"black"} } },
            { "masc/vestment", new Garb { top = new[]{"red"}, bottom = new[]{"lightblue"}, boots = new[]{"brown"} } },
            { "masc/vest",     new Garb { top = new[]{"worker_vest","worker_yellow"}, bottom = new[]{"lightbrown"}, boots = new[]{"black"} } },
            { "masc/robe",     new Garb { top = new[]{"suit"}, bottom = new string[0], boots = new[]{"black"} } },
            // fem (Ultimate Modular Women)
            { "fem/dress",     new Garb { top = new[]{"orange"}, bottom = new[]{"grey"}, boots = new[]{"brown"} } },
            { "fem/gown",      new Garb { top = new[]{"limegreen"}, bottom = new[]{"red"}, boots = new[]{"brown"} } },
            { "fem/robe",      new Garb { top = new[]{"purple"}, bottom = new[]{"brown2"}, boots = new[]{"brown"} } },
            { "fem/tunic",     new Garb { top = new[]{"brown"}, bottom = new[]{"darkbrown"}, boots = new[]{"black"} } },
            { "fem/wanderer",  new Garb { top = new[]{"green","lightgreen"}, bottom = new[]{"brown_02"}, boots = new[]{"brown"} } },
            { "fem/vestment",  new Garb { top = new[]{"worker_vest","worker_yellow"}, bottom = new[]{"brown_02"}, boots = new[]{"black"} } },
        };

        public void Apply()
        {
            var c = SaveState.Character;
            string build = c.build == "fem" ? "fem" : "masc";
            string outfit = ValidOutfit(build, c.outfit);
            if (_model == null || build != _build || outfit != _outfit)
                RebuildModel(build, outfit);
            Tint(c, build, outfit);
        }

        private static string ValidOutfit(string build, string outfit)
        {
            var options = AvatarPalette.OutfitsFor(build);
            foreach (var o in options) if (o == outfit) return outfit;
            return options[0];
        }

        private void RebuildModel(string build, string outfit)
        {
            if (_model != null) Destroy(_model);
            _build = build;
            _outfit = outfit;
            _model = CharacterFactory.Spawn(
                $"char_{build}_{outfit}",
                build == "fem" ? "anims_fem" : "anims_masc",
                transform.position, 0f, CharacterFactory.PlayerHeight, collide: false);
            _model.transform.SetParent(transform, false);
            _model.transform.localPosition = Vector3.zero;
            _model.transform.localRotation = Quaternion.identity;
            Rig = _model.GetComponent<CharacterRig>();

            _mats.Clear();
            foreach (var r in _model.GetComponentsInChildren<Renderer>())
                _mats.AddRange(r.materials);   // instanced copies, safe to tint
        }

        private void Tint(CharacterState c, string build, string outfit)
        {
            GARB.TryGetValue(build + "/" + outfit, out var garb);
            foreach (var m in _mats)
            {
                if (m == null) continue;
                string n = m.name.ToLowerInvariant().Replace(" (instance)", "");
                if (n == "skin") SetColor(m, AvatarPalette.Skin(c.skin));
                else if (n == "skin_darker") SetColor(m, AvatarPalette.Skin(c.skin) * 0.82f);
                else if (n.StartsWith("hair") || n == "eyebrows" || n == "moustache")
                    SetColor(m, AvatarPalette.Hair(c.hairColor));
                else if (n == "eye") SetColor(m, AvatarPalette.Eye(c.eyes));
                else if (Matches(garb.top, n)) SetColor(m, AvatarPalette.Cloth(c.top));
                else if (Matches(garb.bottom, n)) SetColor(m, AvatarPalette.Cloth(c.bottom));
                else if (Matches(garb.boots, n)) SetColor(m, AvatarPalette.Boot(c.boots));
            }
        }

        private static bool Matches(string[] names, string n)
        {
            if (names == null) return false;
            foreach (var x in names) if (x == n) return true;
            return false;
        }

        private static void SetColor(Material m, Color col)
        {
            if (m.HasProperty("_Color")) m.color = col;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", col);
        }
    }
}
