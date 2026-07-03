using UnityEngine;

namespace Journey3D
{
    /// Byte-for-byte port of lib/game/avatar.ts palettes + option lists, so a
    /// soul customized in 3D maps to the exact same indices the 2D game uses.
    public static class AvatarPalette
    {
        public static readonly string[] SKIN_TONES = {
            "#ffe0bd","#f5cfa0","#eab98a","#d9a066","#c68642","#a96d3c",
            "#8d5524","#7a4a22","#67421d","#523015","#3d2410","#2b1a0c",
            "#a8c686","#c7b8e6",
        };
        public static readonly string[] HAIR_COLORS = {
            "#1b1b1f","#2d2118","#4a3119","#6b4423","#8a5a2b","#b07a3a",
            "#d9b35c","#e8e0d0","#9aa0a6","#5b6e8c",
        };
        public static readonly string[] CLOTH_COLORS = {
            "#3b6ea5","#2f8f5b","#a23b3b","#7a4fb0","#b9882e","#2b8a8a",
            "#465063","#b05a8a","#d4a017","#5a6b2f","#7a3b2e","#cfcfcf",
            "#1f2937","#14532d","#831843","#78350f",
        };
        public static readonly string[] BOOT_COLORS = {
            "#4a3324","#2b2b30","#5a4632","#3a2a44","#6b7280","#7f1d1d",
        };
        public static readonly string[] EYE_COLORS = {
            "#2a2030","#5b3a1e","#2e5b8a","#2f6b4f","#6b3a6e","#8a8f98",
        };
        public static readonly string[] EYE_NAMES = { "Deep","Amber","Sea","Verdant","Violet","Storm" };

        public static readonly string[] BUILDS = { "masc", "fem" };
        public static readonly string[] HAIR_STYLES = {
            "short","afro","locs","twists","coils","waves","highTop",
            "long","bun","braids","buzz","ponytail","crown","curls",
        };
        public static readonly string[] FACES = { "calm","keen","goatee","beard","mustache" };
        public static readonly string[] OUTFITS_MASC = { "tunic","vest","robe","cloak","wanderer","vestment" };
        public static readonly string[] OUTFITS_FEM = { "dress","gown","robe","tunic","wanderer","vestment" };
        public static readonly string[] EXTRAS = {
            "none","circlet","hood","earrings","glasses","warpaint","belt","flower","scar",
        };
        public static readonly string[] PATHS = { "seer","sentinel","scribe","mystic" };
        public static readonly string[] PATH_NAMES = { "Seer","Sentinel","Scribe","Mystic" };

        private static Color Parse(string hex)
        {
            return ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.magenta;
        }

        private static Color At(string[] arr, int i)
        {
            if (arr.Length == 0) return Color.magenta;
            return Parse(arr[Mathf.Clamp(i, 0, arr.Length - 1)]);
        }

        public static Color Skin(int i) => At(SKIN_TONES, i);
        public static Color Hair(int i) => At(HAIR_COLORS, i);
        public static Color Cloth(int i) => At(CLOTH_COLORS, i);
        public static Color Boot(int i) => At(BOOT_COLORS, i);
        public static Color Eye(int i) => At(EYE_COLORS, i);
        public static string HexSkin(int i) => SKIN_TONES[Mathf.Clamp(i, 0, SKIN_TONES.Length - 1)];

        public static string[] OutfitsFor(string build) => build == "fem" ? OUTFITS_FEM : OUTFITS_MASC;
    }
}
