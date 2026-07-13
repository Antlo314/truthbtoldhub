using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Owns travel between Truth's Hut and real destination zones (Eden, Giza…).
    public class DestinationManager : MonoBehaviour
    {
        public static DestinationManager I { get; private set; }

        public Transform player;
        public HutUI ui;
        public Transform hutRoot;
        public Camera mainCam;

        public string CurrentId { get; private set; }
        public bool InDestination => !string.IsNullOrEmpty(CurrentId);

        private GameObject _zone;
        private Vector3 _hutPlayerPos;
        private Quaternion _hutPlayerRot;
        private Color _hutSky;
        private float _hutFog;

        private void Awake()
        {
            I = this;
        }

        private void OnDestroy()
        {
            if (I == this) I = null;
        }

        public void Enter(string destId)
        {
            if (string.IsNullOrEmpty(destId)) return;
            if (InDestination) Leave(silent: true);

            var def = GameData.Data.destinations.Find(d => d.id == destId);
            if (def == null)
            {
                Debug.LogWarning("Unknown destination: " + destId);
                return;
            }

            if (player != null)
            {
                _hutPlayerPos = player.position;
                _hutPlayerRot = player.rotation;
            }
            if (mainCam != null)
            {
                _hutSky = mainCam.backgroundColor;
                mainCam.farClipPlane = 220f;
            }
            _hutFog = RenderSettings.fogDensity;

            if (hutRoot != null) hutRoot.gameObject.SetActive(false);

            _zone = DestinationBuilder.Build(def, player);
            CurrentId = destId;
            SaveState.MarkDiscovered("dest_enter_" + destId);
            SaveState.Save();

            AudioManager.I?.PlaySuccess();
            ui?.OnDestinationEntered(def);
            ui?.RefreshObjective();
            Object.FindFirstObjectByType<InteractionSystem>()?.Refresh();
        }

        public void Leave(bool silent = false)
        {
            if (_zone != null) Destroy(_zone);
            _zone = null;
            CurrentId = null;

            if (hutRoot != null) hutRoot.gameObject.SetActive(true);

            if (player != null)
            {
                var cc = player.GetComponent<CharacterController>();
                if (cc != null) cc.enabled = false;
                player.SetPositionAndRotation(_hutPlayerPos, _hutPlayerRot);
                if (cc != null) cc.enabled = true;
            }
            if (mainCam != null)
            {
                mainCam.backgroundColor = _hutSky;
                mainCam.farClipPlane = 150f;
            }
            RenderSettings.fogDensity = _hutFog > 0 ? _hutFog : 0.0032f;

            if (!silent)
            {
                AudioManager.I?.PlayStationOpen();
                ui?.OnDestinationLeft();
            }
            ui?.RefreshObjective();
            Object.FindFirstObjectByType<InteractionSystem>()?.Refresh();
        }

        public void ClaimRelic(string destId)
        {
            string relicId = "relic_" + destId;
            var c = SaveState.Character;
            if (!c.inventory.Contains(relicId))
            {
                c.inventory.Add(relicId);
                // soft material reward
                switch (destId)
                {
                    case "giza": c.iron += 2; break;
                    case "fair": c.copper += 2; break;
                    case "emerald": c.cosmic += 1; break;
                    default: c.iron += 1; c.copper += 1; break;
                }
                SaveState.MarkDiscovered("relic_" + destId);
                SaveState.Save();
                AudioManager.I?.PlaySuccess();
                ui?.ShowToast($"Relic claimed · {RelicName(destId)}");
                ui?.RefreshObjective();
            }
            else
            {
                ui?.ShowToast("You already carry this relic.");
            }
        }

        public void SpeakGuide(string destId)
        {
            var def = GameData.Data.destinations.Find(d => d.id == destId);
            if (def == null) return;
            ui?.ShowGuideDialogue(def);
            SaveState.MarkDiscovered("guide_" + destId);
            SaveState.Save();
            ui?.RefreshObjective();
        }

        public static string RelicName(string destId) => destId switch
        {
            "eden" => "Seed of First Light",
            "fair" => "Ivory Ticket Stub",
            "giza" => "Giza Iron Sliver",
            "kolbrin" => "Ashen Page",
            "emerald" => "Emerald Law-Shard",
            _ => "Relic",
        };

        public static bool HasRelic(string destId) =>
            SaveState.Character.inventory.Contains("relic_" + destId);

        public static bool Visited(string destId) =>
            SaveState.Character.discovered.Contains("dest_enter_" + destId);
    }
}
