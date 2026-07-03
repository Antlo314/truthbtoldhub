using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;

namespace Journey3D
{
    [Serializable]
    public class ItemStack
    {
        public string id;
        public int count;
    }

    /// The soul's persistent record - mirrors the web GameCharacter shape.
    [Serializable]
    public class CharacterState
    {
        public string name = "Wandering Soul";
        public string path = "";                    // seer | sentinel | scribe | mystic
        public int vitality = 100;
        public int maxVitality = 100;
        public int iron;
        public int copper;
        public int cosmic;
        public string equippedWeapon = "wood_staff";
        public List<string> ownedWeapons = new List<string> { "wood_staff" };
        public List<ItemStack> consumables = new List<ItemStack>();
        public List<string> discovered = new List<string>();  // truth_qa_* ids and more
        public List<string> cleared = new List<string>();     // guardians felled
        public List<string> solved = new List<string>();      // riddles answered
        public List<string> skills = new List<string>();      // attunements walked
        public List<string> inventory = new List<string>();   // relics
        public bool sourceReturned;
        public int soulPower;
    }

    public static class SaveState
    {
        public const int MaxConsumableStack = 5;
        private const string PrefsKey = "soul_record";
        private static CharacterState _char;

        public static CharacterState Character
        {
            get
            {
                if (_char == null) Load();
                return _char;
            }
        }

        public static void Load()
        {
            try
            {
                var json = PlayerPrefs.GetString(PrefsKey, "");
                _char = string.IsNullOrEmpty(json)
                    ? new CharacterState()
                    : JsonUtility.FromJson<CharacterState>(json);
            }
            catch { _char = new CharacterState(); }
            _char ??= new CharacterState();
        }

        public static void Save()
        {
            try
            {
                PlayerPrefs.SetString(PrefsKey, JsonUtility.ToJson(_char));
                PlayerPrefs.Save();
            }
            catch (Exception e) { Debug.LogError("SaveState: " + e.Message); }
        }

        // ---------- materials ----------
        public static bool CanAfford(int iron, int copper, int cosmic)
        {
            var c = Character;
            return c.iron >= iron && c.copper >= copper && c.cosmic >= cosmic;
        }

        public static void Spend(int iron, int copper, int cosmic)
        {
            var c = Character;
            c.iron -= iron; c.copper -= copper; c.cosmic -= cosmic;
            Save();
        }

        // ---------- consumables ----------
        public static int Stock(string id) =>
            Character.consumables.FirstOrDefault(s => s.id == id)?.count ?? 0;

        public static bool CanCraft(ConsumableDef def)
        {
            if (def == null) return false;
            if (Character.cleared.Count < def.minClears) return false;
            if (Stock(def.id) >= MaxConsumableStack) return false;
            return CanAfford(def.iron, def.copper, def.cosmic);
        }

        public static bool Craft(ConsumableDef def)
        {
            if (!CanCraft(def)) return false;
            Spend(def.iron, def.copper, def.cosmic);
            var stack = Character.consumables.FirstOrDefault(s => s.id == def.id);
            if (stack == null) Character.consumables.Add(new ItemStack { id = def.id, count = 1 });
            else stack.count++;
            Save();
            return true;
        }

        // ---------- weapons ----------
        public static bool CanForge(WeaponDef def)
        {
            if (def == null || Character.ownedWeapons.Contains(def.id)) return false;
            return CanAfford(def.iron, def.copper, def.cosmic);
        }

        public static bool Forge(WeaponDef def)
        {
            if (!CanForge(def)) return false;
            Spend(def.iron, def.copper, def.cosmic);
            Character.ownedWeapons.Add(def.id);
            Character.equippedWeapon = def.id;
            Save();
            return true;
        }

        // ---------- discovery (Ask Truth) ----------
        public static void MarkDiscovered(string id)
        {
            if (!Character.discovered.Contains(id))
            {
                Character.discovered.Add(id);
                Save();
            }
        }
    }
}
