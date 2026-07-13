using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Multi-beat progress for one destination visit.
    /// Guide → site tasks → guardian → relic unlock → return.
    public class DestinationRun : MonoBehaviour
    {
        public string destId;
        public Color accent = Color.white;

        public int SitesRequired = 3;
        public int SitesDone { get; private set; }
        public bool GuideSpoken { get; private set; }
        public bool GuardianCleared { get; private set; }
        public bool RelicUnlocked => GuardianCleared || SitesDone >= SitesRequired;

        private readonly HashSet<string> _sites = new HashSet<string>();
        private DestInteractable _relic;
        private DestInteractable _guardian;
        private GameObject _barrier;
        private int _guardianHits;
        private const int GuardianNeed = 3;

        public void Bind(string id, Color acc, DestInteractable relic, DestInteractable guardian, GameObject barrier)
        {
            destId = id;
            accent = acc;
            _relic = relic;
            _guardian = guardian;
            _barrier = barrier;

            // restore progress from save
            GuideSpoken = SaveState.Character.discovered.Contains("guide_" + id)
                || SaveState.Character.discovered.Contains("dest_quest_" + id);
            foreach (var d in SaveState.Character.discovered)
            {
                string prefix = "site_" + id + "_";
                if (d.StartsWith(prefix))
                    _sites.Add(d.Substring(prefix.Length));
            }
            SitesDone = _sites.Count;
            GuardianCleared = SaveState.Character.discovered.Contains("guardian_" + id)
                || SaveState.Character.cleared.Contains(id);

            if (DestinationManager.HasRelic(id) || GuardianCleared)
            {
                if (DestinationManager.HasRelic(id))
                {
                    SitesDone = SitesRequired;
                    GuideSpoken = true;
                    GuardianCleared = true;
                }
                OpenRelic();
                ClearBarrier();
                if (_guardian != null && GuardianCleared)
                    _guardian.MarkDone("Guardian fallen");
            }
            else if (_relic != null)
            {
                _relic.SetLabel("Sealed · complete the road");
            }

            if (SitesDone >= SitesRequired && _guardian != null && !GuardianCleared)
                _guardian.SetLabel("Challenge · strike 3 times");
        }

        public void OnGuideSpoken()
        {
            GuideSpoken = true;
            SaveState.MarkDiscovered("guide_" + destId);
            SaveState.MarkDiscovered("dest_quest_" + destId);
            DestinationManager.I?.ui?.ShowToast("Quest · tend the three sites, then face the guardian");
            DestinationManager.I?.ui?.RefreshObjective();
        }

        public bool OnSiteTask(string siteId, DestInteractable node)
        {
            if (string.IsNullOrEmpty(siteId) || node == null || node.completed) return false;
            if (!GuideSpoken)
            {
                DestinationManager.I?.ui?.ShowToast("Speak with the guide first.");
                return false;
            }
            if (_sites.Contains(siteId)) return false;
            _sites.Add(siteId);
            SitesDone = _sites.Count;
            node.MarkDone("Done");
            SaveState.MarkDiscovered("site_" + destId + "_" + siteId);
            AudioManager.I?.PlaySuccess();
            DestinationManager.I?.ui?.ShowToast($"Site {SitesDone}/{SitesRequired} complete");
            if (SitesDone >= SitesRequired && _guardian != null && !GuardianCleared)
            {
                _guardian.SetLabel("Challenge · strike 3 times");
                DestinationManager.I?.ui?.ShowToast("The guardian awakens — approach and press E");
            }
            DestinationManager.I?.ui?.RefreshObjective();
            return true;
        }

        public bool OnGuardianStrike(DestInteractable node)
        {
            if (node == null || GuardianCleared) return false;
            if (!GuideSpoken)
            {
                DestinationManager.I?.ui?.ShowToast("Speak with the guide first.");
                return false;
            }
            if (SitesDone < SitesRequired)
            {
                DestinationManager.I?.ui?.ShowToast($"Tend the sites first ({SitesDone}/{SitesRequired}).");
                return false;
            }
            _guardianHits++;
            AudioManager.I?.PlayClick();
            node.SetLabel($"Guardian · hit {_guardianHits}/{GuardianNeed}");
            DestinationManager.I?.ui?.ShowToast($"Strike {_guardianHits}/{GuardianNeed}");
            if (_guardianHits >= GuardianNeed)
            {
                GuardianCleared = true;
                node.MarkDone("Guardian fallen");
                SaveState.MarkDiscovered("guardian_" + destId);
                if (!SaveState.Character.cleared.Contains(destId))
                {
                    SaveState.Character.cleared.Add(destId);
                    SaveState.Save();
                }
                ClearBarrier();
                OpenRelic();
                AudioManager.I?.PlaySuccess();
                DestinationManager.I?.ui?.ShowToast("Path open — claim the relic");
                DestinationManager.I?.ui?.RefreshObjective();
            }
            return true;
        }

        private void OpenRelic()
        {
            if (_relic == null) return;
            if (DestinationManager.HasRelic(destId))
            {
                _relic.MarkDone("Relic claimed");
                return;
            }
            _relic.completed = false;
            _relic.SetLabel(DestinationManager.RelicName(destId));
        }

        private void ClearBarrier()
        {
            if (_barrier != null)
            {
                Object.Destroy(_barrier);
                _barrier = null;
            }
        }

        public string PhaseHint()
        {
            if (DestinationManager.HasRelic(destId))
                return "Return south through the gate";
            if (!GuideSpoken)
                return "Speak with the guide";
            if (SitesDone < SitesRequired)
                return $"Tend sites {SitesDone}/{SitesRequired}";
            if (!GuardianCleared)
                return "Challenge the guardian (E ×3)";
            return "Claim the relic";
        }
    }
}
