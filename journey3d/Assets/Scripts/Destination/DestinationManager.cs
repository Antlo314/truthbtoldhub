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
        private Color _hutFogColor;
        private Color _hutAmbient;
        private float _hutFog;
        private bool _hutFogOn;

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
            _hutFogColor = RenderSettings.fogColor;
            _hutAmbient = RenderSettings.ambientLight;
            _hutFogOn = RenderSettings.fog;

            if (hutRoot != null) hutRoot.gameObject.SetActive(false);

            _zone = DestinationBuilder.Build(def, player);
            CurrentId = destId;
            SaveState.MarkDiscovered("dest_enter_" + destId);
            SaveState.Save();

            AudioManager.I?.PlayPlaceMusic(destId);
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
            RenderSettings.fog = _hutFogOn;
            RenderSettings.fogDensity = _hutFog > 0 ? _hutFog : 0.0032f;
            RenderSettings.fogColor = _hutFogColor;
            RenderSettings.ambientLight = _hutAmbient;

            AudioManager.I?.PlayPlaceMusic("hut");
            if (!silent)
            {
                AudioManager.I?.PlayStationOpen();
                ui?.OnDestinationLeft();
            }
            ui?.RefreshObjective();
            Object.FindFirstObjectByType<InteractionSystem>()?.Refresh();
        }

        public DestinationRun ActiveRun =>
            _zone != null ? _zone.GetComponent<DestinationRun>() : null;

        public void ClaimRelic(string destId)
        {
            string relicId = "relic_" + destId;
            var c = SaveState.Character;
            if (c.inventory.Contains(relicId))
            {
                ui?.ShowToast("You already carry this relic.");
                return;
            }
            var run = ActiveRun;
            if (run != null && !run.RelicUnlocked)
            {
                ui?.ShowToast(run.PhaseHint());
                return;
            }
            c.inventory.Add(relicId);
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

        public void SpeakGuide(string destId)
        {
            var def = GameData.Data.destinations.Find(d => d.id == destId);
            if (def == null) return;
            ActiveRun?.OnGuideSpoken();

            // First weapon of the journey is given by the Gardener in Eden
            if (destId == "eden" && !SaveState.HasWeapon("wood_staff"))
            {
                SaveState.GrantWeapon("wood_staff", equip: true);
                Object.FindFirstObjectByType<PlayerWeaponView>()?.Refresh();
                var app = Object.FindFirstObjectByType<PlayerAppearance>();
                if (app != null && app.Rig != null)
                {
                    if (app.Rig.Has("Interact")) app.Rig.PlayOnce("Interact");
                    else if (app.Rig.Has("Wave")) app.Rig.PlayOnce("Wave");
                }
                AudioManager.I?.PlaySuccess();
                ui?.ShowToast("The Gardener places a Wooden Staff in your hands.");
            }

            ui?.ShowGuideDialogue(def);
            ui?.RefreshObjective();
        }

        public void SiteTask(string destId, string siteId, DestInteractable node)
        {
            ActiveRun?.OnSiteTask(siteId, node);
        }

        public void Challenge(string destId, DestInteractable node)
        {
            ActiveRun?.OnGuardianStrike(node);
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
