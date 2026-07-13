using System.Linq;

namespace Journey3D
{
    public struct Objective
    {
        public string title;
        public string detail;
        public string id;
    }

    /// Journey objectives — Eden-first until that road is complete.
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
                        title = "Eden",
                        detail = run.PhaseHint(),
                    };
                }
            }

            int truthDepth = c.discovered.Count(d => d.StartsWith("truth_qa_"));
            if (truthDepth < 1)
                return new Objective
                {
                    id = "meet_truth",
                    title = "Speak with Truth",
                    detail = "Walk the aisle · E at the north dais",
                };

            if (!DestinationManager.HasRelic("eden"))
            {
                if (!DestinationManager.Visited("eden"))
                    return new Objective
                    {
                        id = "travel_eden",
                        title = "Travel to Eden",
                        detail = "Wayfinder · receive your first staff",
                    };
                if (!SaveState.HasWeapon("wood_staff"))
                    return new Objective
                    {
                        id = "staff",
                        title = "Receive the Wooden Staff",
                        detail = "Speak with the Gardener",
                    };
                return new Objective
                {
                    id = "finish_eden",
                    title = "Complete Eden",
                    detail = "Sites · guardian · Seed of First Light",
                };
            }

            return new Objective
            {
                id = "eden_done",
                title = "Eden is complete",
                detail = "Further ages remain sealed · roam the hut",
            };
        }
    }
}
