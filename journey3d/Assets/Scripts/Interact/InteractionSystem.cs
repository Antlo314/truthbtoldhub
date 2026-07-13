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

            // Destination mode takes priority for dest interactables
            Nearest = null;
            NearestDest = null;
            float best = float.MaxValue;

            if (_dests != null)
            {
                foreach (var d in _dests)
                {
                    if (d == null) continue;
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
            AudioManager.I?.PlayClick();
            switch (d.action)
            {
                case DestAction.ReturnHut:
                    DestinationManager.I?.Leave();
                    break;
                case DestAction.ClaimRelic:
                    DestinationManager.I?.ClaimRelic(d.destId);
                    // refresh label
                    d.label = DestinationManager.HasRelic(d.destId) ? "Relic claimed" : d.label;
                    Refresh();
                    break;
                case DestAction.SpeakGuide:
                    DestinationManager.I?.SpeakGuide(d.destId);
                    break;
            }
        }
    }
}
