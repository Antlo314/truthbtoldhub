using UnityEngine;

namespace Journey3D
{
    /// Finds the nearest station to the player and routes E-presses to the UI.
    public class InteractionSystem : MonoBehaviour
    {
        public Transform player;
        public HutUI ui;
        public Station Nearest { get; private set; }

        private Station[] _stations;

        private void Start()
        {
            _stations = FindObjectsByType<Station>(FindObjectsSortMode.None);
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
            float bestDist = float.MaxValue;
            foreach (var s in _stations)
            {
                float d = Vector3.Distance(player.position, s.transform.position);
                if (d <= s.interactRadius && d < bestDist)
                {
                    bestDist = d;
                    Nearest = s;
                }
            }

            ui.SetPrompt(Nearest);

            bool interact = Input.GetKeyDown(KeyCode.E) || InputHub.ConsumeInteract();
            if (Nearest != null && interact)
                ui.OpenStation(Nearest);
        }
    }
}
