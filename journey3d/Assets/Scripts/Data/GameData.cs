using System;
using UnityEngine;

namespace Journey3D
{
    /// Loads static design data from Resources/Data once per run.
    /// (TextAssets work on every platform, including WebGL.)
    public static class GameData
    {
        private static AppConfig _config;
        private static GameDataFile _data;
        private static TruthLoreFile _lore;

        public static AppConfig Config => _config ??= Load<AppConfig>("config");
        public static GameDataFile Data => _data ??= Load<GameDataFile>("game_data");
        public static TruthLoreFile Lore => _lore ??= Load<TruthLoreFile>("truth_lore");

        private static T Load<T>(string file) where T : new()
        {
            try
            {
                var ta = Resources.Load<TextAsset>("Data/" + file);
                return JsonUtility.FromJson<T>(ta.text);
            }
            catch (Exception e)
            {
                Debug.LogError($"GameData: failed to load {file}: {e.Message}");
                return new T();
            }
        }

        public static WeaponDef Weapon(string id) => Data.weapons.Find(w => w.id == id);
        public static ConsumableDef Consumable(string id) => Data.consumables.Find(c => c.id == id);

        /// Season key matching the web arcade: UTC "YYYY-MM".
        public static string CurrentSeason()
        {
            var now = DateTime.UtcNow;
            return $"{now.Year:D4}-{now.Month:D2}";
        }
    }
}
