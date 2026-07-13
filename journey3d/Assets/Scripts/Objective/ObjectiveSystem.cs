using System.Linq;

namespace Journey3D
{
    public struct Objective
    {
        public string title;
        public string detail;
        public string id;
    }

    /// Soft first-hour / journey objectives from save state.
    public static class ObjectiveSystem
    {
        public static Objective Current()
        {
            var c = SaveState.Character;

            if (DestinationManager.I != null && DestinationManager.I.InDestination)
            {
                string id = DestinationManager.I.CurrentId;
                if (!DestinationManager.HasRelic(id))
                    return new Objective
                    {
                        id = "claim_" + id,
                        title = "Claim the relic",
                        detail = DestinationManager.RelicName(id) + " waits on the dais",
                    };
                return new Objective
                {
                    id = "return",
                    title = "Return to the Hut",
                    detail = "Walk the glowing gate south",
                };
            }

            if (!c.discovered.Any(d => d.StartsWith("truth_qa_") || d.StartsWith("guide_")))
            {
                // After speaking Truth, MarkDiscovered uses TruthLore.DiscId
            }

            int truthDepth = c.discovered.Count(d => d.StartsWith("truth_qa_"));
            if (truthDepth < 1)
                return new Objective
                {
                    id = "meet_truth",
                    title = "Speak with Truth",
                    detail = "Walk the aisle · press E at the north dais",
                };

            var dests = GameData.Data.destinations;
            foreach (var d in dests)
            {
                if (!DestinationManager.Visited(d.id))
                    return new Objective
                    {
                        id = "travel_" + d.id,
                        title = "Travel · " + ShortName(d.name),
                        detail = "Wayfinder · " + d.guide,
                    };
                if (!DestinationManager.HasRelic(d.id))
                    return new Objective
                    {
                        id = "relic_" + d.id,
                        title = "Claim · " + DestinationManager.RelicName(d.id),
                        detail = "Return to " + ShortName(d.name),
                    };
            }

            if (!c.sourceReturned)
                return new Objective
                {
                    id = "epilogue",
                    title = "Return to the Source",
                    detail = "All roads walked · open Epilogue on the Hub",
                };

            return new Objective
            {
                id = "roam",
                title = "The chamber is yours",
                detail = "Roam, forge, and gather in the Hall",
            };
        }

        private static string ShortName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "the road";
            int i = name.IndexOf('-');
            if (i < 0) i = name.IndexOf('—');
            return i > 0 ? name.Substring(0, i).Trim() : name;
        }
    }
}
