using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Journey3D
{
    /// Port of lib/game/truthLore.ts - gating, trust, deflections.
    public static class TruthLore
    {
        public const string DiscPrefix = "truth_qa_";

        public static string DiscId(string questionId) => DiscPrefix + questionId;

        public static List<string> Asked()
        {
            return SaveState.Character.discovered
                .Where(d => d.StartsWith(DiscPrefix))
                .Select(d => d.Substring(DiscPrefix.Length))
                .ToList();
        }

        public static int Depth() => Asked().Count;

        /// Trust is EARNED by walking: relics, guardians, riddles, path, conversation.
        public static int Trust()
        {
            var c = SaveState.Character;
            int t = 0;
            t += c.inventory.Count * 4;
            t += c.cleared.Count * 4;
            t += c.solved.Count * 3;
            t += Mathf.Min(8, c.skills.Count);
            t += Depth();
            if (c.sourceReturned) t += 12;
            return t;
        }

        public static string TrustLabel()
        {
            int t = Trust();
            if (t >= 24) return "A Witness";
            if (t >= 16) return "A Confidant";
            if (t >= 8) return "Trusted";
            if (t >= 3) return "Known to Him";
            return "A Stranger";
        }

        public static bool IsUnlocked(TruthQuestionDef q)
        {
            var asked = new HashSet<string>(Asked());
            if (q.requires.Count > 0 && !q.requires.All(asked.Contains)) return false;
            if (q.minDepth > 0 && Depth() < q.minDepth) return false;
            if (q.trustGate > 0 && Trust() < q.trustGate) return false;
            return true;
        }

        public static string Deflection(TruthQuestionDef q)
        {
            var lore = GameData.Lore;
            var asked = new HashSet<string>(Asked());
            bool reqsMet = q.requires.Count == 0 || q.requires.All(asked.Contains);
            int depthGap = q.minDepth > 0 ? q.minDepth - Depth() : 0;
            bool trustShort = q.trustGate > 0 && Trust() < q.trustGate;
            if (!reqsMet) return Pick(lore.deflectNotNow);
            if (depthGap > 0 && depthGap <= 2) return Pick(lore.deflectSoon);
            if (trustShort) return Pick(lore.deflectTrust);
            return Pick(lore.deflectNotNow);
        }

        public static string Intro()
        {
            int depth = Depth();
            if (depth == 0) return "Truth does not preach his whole life to strangers. Sit. Ask - and listen. The hood hides his face, not his account.";
            if (depth < 4) return "He answers, but guardedly. There are chambers of his story still locked.";
            if (depth < 8) return "The hooded brother speaks plainly now. The wilderness, the cell, the family he wounded, the cup sorrow drove him to - the word is opening.";
            if (depth < 12) return "Anthony speaks without mask now - the fast, the 400 Series, what he needs from you. Deeper grief still waits for those who will sit long enough to ask.";
            return "Anthony stands before you - separated from his babies, chasing the Source because everything else collapses. Witness, not tourist. Empty the flesh and walk the last run with him.";
        }

        private static string Pick(List<string> pool) =>
            pool.Count == 0 ? "Not now." : pool[Random.Range(0, pool.Count)];
    }
}
