using System;
using System.Collections.Generic;

namespace Journey3D
{
    // ---------- StreamingAssets data ----------
    [Serializable]
    public class AppConfig
    {
        public string supabaseUrl;
        public string supabaseAnonKey;
        public string webBase;
    }

    [Serializable]
    public class WeaponDef
    {
        public string id;
        public string name;
        public string kind;
        public int damage;
        public int reach;
        public string flavor;
        public string forge;
        public int iron;
        public int copper;
        public int cosmic;
    }

    [Serializable]
    public class ConsumableDef
    {
        public string id;
        public string name;
        public string desc;
        public int hp;
        public int damage;
        public int iron;
        public int copper;
        public int cosmic;
        public string accent;
        public int minClears;
    }

    [Serializable]
    public class DestinationDef
    {
        public string id;
        public string name;
        public string guide;
        public string accent;
        public string quote;
    }

    [Serializable]
    public class GameDataFile
    {
        public List<WeaponDef> weapons = new List<WeaponDef>();
        public List<ConsumableDef> consumables = new List<ConsumableDef>();
        public List<DestinationDef> destinations = new List<DestinationDef>();
    }

    [Serializable]
    public class TruthQuestionDef
    {
        public string id;
        public string prompt;
        public string answer;
        public List<string> requires = new List<string>();
        public int minDepth;
        public int trustGate;
        public string accountTitle;
        public string accountBody;
    }

    [Serializable]
    public class TruthLoreFile
    {
        public List<TruthQuestionDef> questions = new List<TruthQuestionDef>();
        public List<string> deflectSoon = new List<string>();
        public List<string> deflectNotNow = new List<string>();
        public List<string> deflectTrust = new List<string>();
    }

    // ---------- Arcade score contract (matches web arcade_scores) ----------
    [Serializable]
    public class ScoreResult
    {
        public string game;   // 'tetra' | 'serpent' | 'veil'
        public int score;     // points / units
        public int lines;     // rows cleared (tetra) or 0
        public int level;     // level reached, or attempts (veil)
    }

    [Serializable]
    public class LeaderboardRow
    {
        public string player_name;
        public int score;
        public int lines;
        public int level;
    }

    [Serializable]
    public class BulletinRow
    {
        public string title;
        public string body;
        public string published_at;
        public bool pinned;
    }

    [Serializable]
    public class MediaRow
    {
        public string title;
        public string kind;   // video | image | pdf | link | audio
        public string published_at;
    }
}
