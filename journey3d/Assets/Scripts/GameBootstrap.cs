using UnityEngine;

namespace Journey3D
{
    /// Assembles Truth's Hut at runtime from the Blender-built models in
    /// Resources/Models. The scene file only carries this one component.
    public class GameBootstrap : MonoBehaviour
    {
        private Transform _playerRoot;

        private void Awake()
        {
            Application.targetFrameRate = 120;
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.16f, 0.12f, 0.09f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.02f, 0.03f, 0.05f);
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogDensity = 0.012f;

            SaveState.Load();
            BuildRoom();
            BuildStations();
            var player = BuildPlayer();
            var cam = BuildCamera(player);
            BuildSystems(player, cam);
            BuildLights();
        }

        // ---------- helpers ----------
        private GameObject Spawn(string model, Vector3 pos, float yaw, bool collide = true)
        {
            var prefab = Resources.Load<GameObject>("Models/" + model);
            if (prefab == null)
            {
                Debug.LogError("Missing model: " + model);
                return new GameObject(model + "_missing");
            }
            var go = Instantiate(prefab, pos, Quaternion.Euler(0, yaw, 0));
            go.name = model;
            if (collide)
            {
                foreach (var mf in go.GetComponentsInChildren<MeshFilter>())
                {
                    var mc = mf.gameObject.AddComponent<MeshCollider>();
                    mc.sharedMesh = mf.sharedMesh;
                    mc.convex = model != "hut_shell";   // room stays concave so we walk inside it
                }
            }
            return go;
        }

        private void BuildRoom()
        {
            Spawn("hut_shell", Vector3.zero, 0);
            Spawn("hut_rug", new Vector3(0, 0.02f, 0), 0, collide: false);
            var fire = Spawn("fireplace", new Vector3(6.05f, 0, 0), -90f);
            var flame = new GameObject("firelight");
            flame.transform.SetParent(fire.transform, false);
            flame.transform.localPosition = new Vector3(0, 1.1f, -0.4f);
            var l = flame.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = new Color(1f, 0.55f, 0.2f);
            l.range = 9f;
            flame.AddComponent<FlickerLight>().baseIntensity = 2.6f;
        }

        private void AddStation(GameObject go, StationId id, string label, string hex)
        {
            var s = go.AddComponent<Station>();
            s.id = id;
            s.label = label;
            s.accent = UIKit.Hex(hex);
        }

        private void BuildStations()
        {
            // model fronts face +Z after Blender export; yaw turns them into the room
            var ledger = Spawn("ledger_lectern", new Vector3(-4.2f, 0, 5.7f), 165f);
            AddStation(ledger, StationId.Ledger, "The Ledger", "#fbbf24");

            var glass = Spawn("seeing_glass", new Vector3(3.9f, 0, 5.7f), -165f);
            AddStation(glass, StationId.SeeingGlass, "The Seeing Glass", "#22d3ee");

            var door = Spawn("sanctum_door", new Vector3(0, 0, 6.78f), 180f);
            AddStation(door, StationId.Sanctum, "The Sanctum", "#7c5cff");

            var truth = Spawn("truth_sage", new Vector3(0, 0, 3.2f), 180f);
            AddStation(truth, StationId.Truth, "Ask Truth", "#f97316");
            truth.GetComponent<Station>().interactRadius = 2.8f;

            var archive = Spawn("archive_shelf", new Vector3(-6.25f, 0, 1.6f), 90f);
            AddStation(archive, StationId.Archive, "The Archive", "#fcd34d");

            var mirror = Spawn("soul_mirror", new Vector3(-6.3f, 0, -2.4f), 90f);
            AddStation(mirror, StationId.Soul, "Your Soul", "#94a3b8");

            var forge = Spawn("forge_station", new Vector3(5.1f, 0, -3.6f), -110f);
            AddStation(forge, StationId.Forge, "The Forge", "#f97316");

            var offering = Spawn("offering_altar", new Vector3(-3.8f, 0, -5.5f), 20f);
            AddStation(offering, StationId.Offering, "The Offering", "#fbbf24");

            var arcade = Spawn("arcade_cabinet", new Vector3(0.6f, 0, -6.15f), 0f);
            AddStation(arcade, StationId.Arcade, "The Arcade", "#7c5cff");

            var table = Spawn("wayfinder_table", new Vector3(3.6f, 0, -4.7f), 0f);
            AddStation(table, StationId.Wayfinder, "The Wayfinder", "#22c55e");
        }

        private PlayerController BuildPlayer()
        {
            var root = new GameObject("Player");
            root.transform.position = new Vector3(0, 0.05f, -2.2f);
            var cc = root.AddComponent<CharacterController>();
            cc.height = 1.8f;
            cc.radius = 0.35f;
            cc.center = new Vector3(0, 0.95f, 0);

            var avatarPrefab = Resources.Load<GameObject>("Models/player_avatar");
            Transform avatar = null;
            if (avatarPrefab != null)
            {
                var a = Instantiate(avatarPrefab, root.transform);
                a.name = "avatar";
                avatar = a.transform;
            }

            var pc = root.AddComponent<PlayerController>();
            pc.avatar = avatar;
            _playerRoot = root.transform;
            return pc;
        }

        private CameraRig BuildCamera(PlayerController player)
        {
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.02f, 0.03f, 0.055f);
            cam.fieldOfView = 55f;
            camGo.AddComponent<AudioListener>();
            var rig = camGo.AddComponent<CameraRig>();
            rig.target = player.transform;
            camGo.transform.position = player.transform.position + new Vector3(0, 3, -5);
            return rig;
        }

        private void BuildSystems(PlayerController player, CameraRig rig)
        {
            var sys = new GameObject("Systems");
            sys.AddComponent<SupabaseClient>();
            var ui = sys.AddComponent<HutUI>();
            ui.player = player;
            ui.cameraRig = rig;
            var interact = sys.AddComponent<InteractionSystem>();
            interact.player = player.transform;
            interact.ui = ui;
        }

        private void BuildLights()
        {
            // warm hearth-room key light
            var key = new GameObject("KeyLight");
            key.transform.position = new Vector3(0, 3.6f, 0);
            var kl = key.AddComponent<Light>();
            kl.type = LightType.Point;
            kl.color = new Color(1f, 0.86f, 0.62f);
            kl.range = 14f;
            kl.intensity = 1.15f;

            // cool fill from the sanctum door
            var fill = new GameObject("SanctumGlow");
            fill.transform.position = new Vector3(0, 2.2f, 6.2f);
            var fl = fill.AddComponent<Light>();
            fl.type = LightType.Point;
            fl.color = new Color(0.49f, 0.36f, 1f);
            fl.range = 6f;
            fl.intensity = 1.1f;
        }
    }
}
