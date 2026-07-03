using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Gives the flat-colored primitive world real surface "skin": generates
    /// seamless tiling textures in code (wood grain, stone, grass, thatch,
    /// cloth, leaves, parchment) and applies them to imported materials by
    /// name, keeping each material's base color as the tint. No external
    /// assets, no FBX texture pain - works cleanly in WebGL.
    public static class WorldSkin
    {
        private enum Surf { None, Wood, Stone, Grass, Thatch, Cloth, Leaves, Parchment }
        private const int SZ = 256;
        private static readonly Dictionary<Surf, Texture2D> _tex = new Dictionary<Surf, Texture2D>();

        public static void Skin(GameObject go, bool instanced = false)
        {
            foreach (var r in go.GetComponentsInChildren<Renderer>())
            {
                var mats = instanced ? r.materials : r.sharedMaterials;
                foreach (var m in mats) SkinMat(m);
            }
        }

        private static void SkinMat(Material m)
        {
            if (m == null) return;
            string n = m.name.ToLowerInvariant();

            // never touch light-emitting or bare-skin/metal surfaces
            if (IsEmissive(m, n)) return;
            if (Has(n, "skin", "head", "hand", "face", "beard", "neck", "brow", "nose", "av_hair", "hair")) return;
            if (Has(n, "gold", "belt", "coin", "handle", "metal", "water", "glass", "mirror")) return;

            var surf = Classify(n);
            if (surf == Surf.None) return;

            var tex = Get(surf);
            if (m.HasProperty("_MainTex")) m.mainTexture = tex;
            m.mainTextureScale = ScaleFor(surf);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", surf == Surf.Cloth ? 0.1f : 0.2f);
        }

        private static bool IsEmissive(Material m, string n)
        {
            if (Has(n, "glow", "screen", "flame", "fire", "sky", "orb", "eye", "seam",
                    "marquee", "window", "coals", "ember", "lantern", "lamp", "candle", "pin", "glyph")) return true;
            if (m.IsKeywordEnabled("_EMISSION")) return true;
            if (m.HasProperty("_EmissionColor") && m.GetColor("_EmissionColor").maxColorComponent > 0.15f) return true;
            return false;
        }

        private static Surf Classify(string n)
        {
            if (Has(n, "leaves", "canopy")) return Surf.Leaves;
            if (Has(n, "grass", "ground")) return Surf.Grass;
            if (Has(n, "thatch", "roof")) return Surf.Thatch;
            if (Has(n, "paper", "scroll", "map", "page", "parch")) return Surf.Parchment;
            if (Has(n, "robe", "tunic", "av_top", "av_bottom", "av_boots", "boot", "cloth", "rug", "garment", "book")) return Surf.Cloth;
            if (Has(n, "stone", "rock", "hearth", "chimney", "plinth", "pedestal", "anvil", "iron", "brazier", "path", "soot")) return Surf.Stone;
            if (Has(n, "wood", "log", "beam", "plank", "post", "door", "frame", "table", "desk",
                    "shelf", "stump", "barrel", "cab", "lectern", "ridge", "gable", "staff", "trunk", "bark", "spine", "foot")) return Surf.Wood;
            return Surf.None;
        }

        private static Vector2 ScaleFor(Surf s)
        {
            switch (s)
            {
                case Surf.Grass: return new Vector2(24, 24);
                case Surf.Thatch: return new Vector2(5, 5);
                case Surf.Stone: return new Vector2(2.5f, 2.5f);
                case Surf.Cloth: return new Vector2(3, 3);
                case Surf.Leaves: return new Vector2(1.5f, 1.5f);
                case Surf.Parchment: return new Vector2(1.5f, 1.5f);
                default: return new Vector2(2.5f, 2.5f); // wood
            }
        }

        private static bool Has(string n, params string[] keys)
        {
            foreach (var k in keys) if (n.Contains(k)) return true;
            return false;
        }

        // ---- texture generation ----
        private static Texture2D Get(Surf s)
        {
            if (_tex.TryGetValue(s, out var t) && t != null) return t;
            var tex = new Texture2D(SZ, SZ, TextureFormat.RGB24, true) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
            var px = new Color32[SZ * SZ];
            for (int y = 0; y < SZ; y++)
                for (int x = 0; x < SZ; x++)
                {
                    float u = x / (float)SZ, v = y / (float)SZ;
                    float lum = Lum(s, u, v);
                    byte b = (byte)(Mathf.Clamp01(lum) * 255);
                    px[y * SZ + x] = new Color32(b, b, b, 255);
                }
            tex.SetPixels32(px);
            tex.Apply(true);
            _tex[s] = tex;
            return tex;
        }

        private static float Lum(Surf s, float u, float v)
        {
            switch (s)
            {
                case Surf.Wood:
                {
                    float n = Fbm(u, v, 4, 4);
                    float rings = 0.5f + 0.5f * Mathf.Sin((v * 11f + n * 5f) * Mathf.PI * 2f);
                    float lum = 0.58f + 0.26f * n + 0.22f * rings;           // stronger grain
                    if (Mathf.Repeat(v * 4f, 1f) < 0.05f) lum *= 0.5f;       // plank seams
                    return lum;
                }
                case Surf.Stone:
                {
                    float n = Fbm(u, v, 5, 4);
                    float crack = Fbm(u, v, 11, 3);
                    float lum = 0.56f + 0.42f * n;                           // stronger mottle
                    if (crack > 0.7f) lum *= 0.52f;
                    return lum;
                }
                case Surf.Grass:
                {
                    float n = Fbm(u, v, 6, 4);
                    float blade = Fbm(u, v, 26, 2);
                    return 0.5f + 0.42f * n + 0.16f * blade;                 // richer variation
                }
                case Surf.Thatch:
                {
                    float streak = 0.5f + 0.5f * Mathf.Sin((u * 22f + Fbm(u, v, 6, 3) * 3f) * Mathf.PI * 2f);
                    return 0.6f + 0.28f * Fbm(u, v, 5, 3) + 0.16f * streak;
                }
                case Surf.Cloth:
                {
                    float weave = 0.5f + 0.25f * Mathf.Sin(u * 60f * Mathf.PI * 2f) + 0.25f * Mathf.Sin(v * 60f * Mathf.PI * 2f);
                    return 0.82f + 0.12f * Fbm(u, v, 6, 3) + 0.08f * (weave - 0.5f);
                }
                case Surf.Leaves:
                {
                    float n = Fbm(u, v, 8, 4);
                    return 0.55f + 0.42f * n;
                }
                case Surf.Parchment:
                {
                    return 0.82f + 0.18f * Fbm(u, v, 4, 4);
                }
                default: return 1f;
            }
        }

        private static float P(float x, float y) => Mathf.PerlinNoise(x + 0.137f, y + 0.719f);

        private static float Seamless(float u, float v, float period)
        {
            float x = u * period, y = v * period, w = period;
            float a = P(x, y), b = P(x - w, y), c = P(x, y - w), d = P(x - w, y - w);
            return (a * (w - x) * (w - y) + b * x * (w - y) + c * (w - x) * y + d * x * y) / (w * w);
        }

        private static float Fbm(float u, float v, float basePeriod, int octaves)
        {
            float sum = 0, amp = 0.5f, norm = 0;
            for (int i = 0; i < octaves; i++)
            {
                float per = basePeriod * (1 << i);
                sum += Seamless(u, v, per) * amp;
                norm += amp;
                amp *= 0.5f;
            }
            return sum / norm;
        }
    }
}
