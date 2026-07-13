using System.Linq;

namespace Journey3D
{
    public struct Objective
    {
        public string title;
        public string detail;
        public string id;
    }

    /// Soft journey objectives from save state + active destination run.
    public static class ObjectiveSystem
    {
        public static Objective Current()
        {
            var c = SaveState.Character;

            if (DestinationManager.I != null && DestinationManager.I.InDestination)
            {
                string id = DestinationManager.I.CurrentId;
                var run = DestinationManager.I.ActiveRun;
                if (run != null)
                {
                    return new Objective
                    {
                        id = "run_" + id,
                        title = ShortName(id),
                        detail = run.PhaseHint(),
                    };
                }
                if (!DestinationManager.HasRelic(id))
                    return new Objective
                    {
                        id = "claim_" + id,
                        title = "Claim the relic",
                        detail = DestinationManager.RelicName(id),
                    };
                return new Objective
                {
                    id = "return",
                    title = "Return to the Hut",
                    detail = "South gate · glowing arch",
                };
            }

            int truthDepth = c.discovered.Count(d => d.StartsWith("truth_qa_"));
            if (truthDepth < 1)
                return new Objective
                {
                    id = "meet_truth",
                    title = "Speak with Truth",
                    detail = "Walk the aisle · E at the north dais",
                };

            var dests = GameData.Data.destinations;
            foreach (var d in dests)
            {
                if (!DestinationManager.Visited(d.id))
                    return new Objective
                    {
                        id = "travel_" + d.id,
                        title = "Travel · " + ShortName(d.name),
                        detail = "Wayfinder · " + d.guide + " · multi-beat road",
                    };
                if (!DestinationManager.HasRelic(d.id))
                    return new Objective
                    {
                        id = "finish_" + d.id,
                        title = "Finish · " + ShortName(d.name),
                        detail = "Sites · guardian · relic",
                    };
            }

            if (!c.sourceReturned)
                return new Objective
                {
                    id = "epilogue",
                    title = "Return to the Source",
                    detail = "All relics · Epilogue on the Hub",
                };

            return new Objective
            {
                id = "roam",
                title = "The chamber is yours",
                detail = "Roam, forge, gather in the Hall",
            };
        }

        private static string ShortName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "the road";
            // id-style
            if (name.IndexOf(' ') < 0 && name.IndexOf('-') < 0)
                return char.ToUpper(name[0]) + name.Substring(1);
            int i = name.IndexOf('-');
            if (i < 0) i = name.IndexOf('—');
            return i > 0 ? name.Substring(0, i).Trim() : name;
        }
    }
}
