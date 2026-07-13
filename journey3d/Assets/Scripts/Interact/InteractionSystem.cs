using UnityEngine;

namespace Journey3D
{
    /// Finds nearest station or destination interactable; routes E / Esc.
    public class InteractionSystem : MonoBehaviour
    {
        public Transform player;
        public HutUI ui;
        public Station Nearest { get; private set; }
        public DestInteractable NearestDest { get; private set; }

        private Station[] _stations;
        private DestInteractable[] _dests;

        private void Start() => Refresh();

        public void Refresh()
        {
            _stations = Object.FindObjectsByType<Station>(FindObjectsSortMode.None);
            _dests = Object.FindObjectsByType<DestInteractable>(FindObjectsSortMode.None);
        }

        private void Update()
        {
            if (player == null || ui == null) return;

            if (ui.PanelOpen)
            {
                if (Input.GetKeyDown(KeyCode.Escape)) ui.ClosePanel();
                return;
            }

            Nearest = null;
            NearestDest = null;
            float best = float.MaxValue;

            if (_dests != null)
            {
                foreach (var d in _dests)
                {
                    if (d == null || !d.gameObject.activeInHierarchy) continue;
                    float dist = Vector3.Distance(player.position, d.transform.position);
                    if (dist <= d.interactRadius && dist < best)
                    {
                        best = dist;
                        NearestDest = d;
                    }
                }
            }

            if (NearestDest == null && _stations != null)
            {
                best = float.MaxValue;
                foreach (var s in _stations)
                {
                    if (s == null || !s.gameObject.activeInHierarchy) continue;
                    float d = Vector3.Distance(player.position, s.transform.position);
                    if (d <= s.interactRadius && d < best)
                    {
                        best = d;
                        Nearest = s;
                    }
                }
            }

            if (NearestDest != null)
                ui.SetPromptLabel(NearestDest.label, NearestDest.accent);
            else
                ui.SetPrompt(Nearest);

            bool interact = Input.GetKeyDown(KeyCode.E) || InputHub.ConsumeInteract();
            if (!interact) return;

            if (NearestDest != null)
            {
                HandleDest(NearestDest);
                return;
            }

            if (Nearest != null)
            {
                var rig = Nearest.GetComponent<CharacterRig>();
                if (rig != null)
                {
                    if (rig.Has("Interact")) rig.PlayOnce("Interact");
                    else if (rig.Has("Wave")) rig.PlayOnce("Wave");
                }
                ui.OpenStation(Nearest);
            }
        }

        private void HandleDest(DestInteractable d)
        {
            if (d.completed && d.action != DestAction.ReturnHut && d.action != DestAction.SpeakGuide
                && d.action != DestAction.Challenge && d.action != DestAction.ClaimRelic)
            {
                ui?.ShowToast("Already complete.");
                return;
            }

            AudioManager.I?.PlayClick();
            switch (d.action)
            {
                case DestAction.ReturnHut:
                    DestinationManager.I?.Leave();
                    break;
                case DestAction.ClaimRelic:
                    DestinationManager.I?.ClaimRelic(d.destId);
                    if (DestinationManager.HasRelic(d.destId))
                        d.MarkDone("Relic claimed");
                    Refresh();
                    break;
                case DestAction.SpeakGuide:
                    DestinationManager.I?.SpeakGuide(d.destId);
                    break;
                case DestAction.SiteTask:
                    DestinationManager.I?.SiteTask(d.destId, d.siteId, d);
                    Refresh();
                    break;
                case DestAction.Challenge:
                    // Strike anim — staff attack if bound, else punch / interact
                    var app = Object.FindFirstObjectByType<PlayerAppearance>();
                    if (app != null && app.Rig != null)
                    {
                        string[] strikes = {
                            "Attack", "Punch", "Hit", "Sword_Slash", "Sword_Attack",
                            "Interact", "Wave"
                        };
                        foreach (var clip in strikes)
                        {
                            if (app.Rig.Has(clip)) { app.Rig.PlayOnce(clip); break; }
                        }
                    }
                    DestinationManager.I?.Challenge(d.destId, d);
                    Refresh();
                    break;
            }
        }
    }
}
