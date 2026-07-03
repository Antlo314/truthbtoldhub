using UnityEngine;

namespace Journey3D
{
    /// Assembles Truth's Hut (and its small exterior yard) at runtime from the
    /// Blender-built models in Resources/Models. The scene file only carries
    /// this one component.
    public class GameBootstrap : MonoBehaviour
    {
        public bool ExteriorEnabled = true;   // kill switch for the yard (reversible)

        private Transform _playerRoot;
        private PlayerAppearance _appearance;

        private void Awake()
        {
            Application.targetFrameRate = 60;

            // ---- lighting (fixes the previously near-black WebGL room) ----
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.52f, 0.47f, 0.42f);
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.11f, 0.13f, 0.17f);
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogDensity = 0.0035f;

            SaveState.Load();
            BuildSun();
            BuildRoom();
            if (ExteriorEnabled) BuildExterior();
            BuildStations();
            var player = BuildPlayer();
            var cam = BuildCamera(player);
            BuildSystems(player, cam);
            BuildLights();

            // startup self-check, visible in the browser console
            bool grounded = Physics.Raycast(new Vector3(0, 2f, -2.2f), Vector3.down, out var hit, 10f);
            Debug.Log(grounded
                ? $"J3D physics ok: ground '{hit.collider.name}' at y={hit.point.y:F2}"
                : "J3D physics FAULT: no ground under spawn!");
        }

        // ---------- helpers ----------
        private GameObject Spawn(string model, Vector3 pos, float yaw, bool collide = true, float scale = 1f)
        {
            var prefab = Resources.Load<GameObject>("Models/" + model);
            if (prefab == null)
            {
                Debug.LogError("Missing model: " + model);
                return new GameObject(model + "_missing");
            }
            // compose with the prefab's own rotation so any FBX axis-correction
            // the importer put on the root is preserved (identity when baked)
            var go = Instantiate(prefab, pos, Quaternion.Euler(0, yaw, 0) * prefab.transform.rotation);
            go.name = model;
            if (scale != 1f) go.transform.localScale = Vector3.one * scale;
            // Runtime MeshCollider cooking proved unreliable in WebGL builds
            // (players fell through the floor), so props get a primitive
            // bounds box instead and the room/ground use code-built boxes.
            if (collide) AddBoundsCollider(go);
            return go;
        }

        private static void AddBoundsCollider(GameObject go)
        {
            var rends = go.GetComponentsInChildren<Renderer>();
            if (rends.Length == 0) return;
            var b = rends[0].bounds;
            foreach (var r in rends) b.Encapsulate(r.bounds);
            var col = new GameObject("bounds_col");
            col.transform.position = b.center;
            col.transform.SetParent(go.transform, true);
            col.AddComponent<BoxCollider>().size = b.size;
        }

        private static void PhysicsBox(Transform parent, Vector3 center, Vector3 size)
        {
            var go = new GameObject("phys");
            go.transform.SetParent(parent, false);
            go.transform.position = center;
            go.AddComponent<BoxCollider>().size = size;
        }

        /// Deterministic room + ground physics (primitive boxes only).
        /// The doorway gap sits on the -Z wall at x in [-0.85, 0.85].
        private void BuildRoomPhysics()
        {
            var root = new GameObject("RoomPhysics").transform;
            PhysicsBox(root, new Vector3(0, -0.5f, 0), new Vector3(60, 1, 60));          // ground, top at y=0
            PhysicsBox(root, new Vector3(7f, 2.1f, 0), new Vector3(0.35f, 4.2f, 14.6f)); // +X wall
            PhysicsBox(root, new Vector3(-7f, 2.1f, 0), new Vector3(0.35f, 4.2f, 14.6f));// -X wall
            PhysicsBox(root, new Vector3(0, 2.1f, 7f), new Vector3(14.6f, 4.2f, 0.35f)); // +Z wall (sanctum)
            // -Z wall split around the doorway
            PhysicsBox(root, new Vector3(-3.925f, 2.1f, -7f), new Vector3(6.15f, 4.2f, 0.35f));
            PhysicsBox(root, new Vector3(3.925f, 2.1f, -7f), new Vector3(6.15f, 4.2f, 0.35f));
            PhysicsBox(root, new Vector3(0, 3.4f, -7f), new Vector3(1.8f, 1.6f, 0.35f)); // lintel above the door
        }

        private void BuildSun()
        {
            var sun = new GameObject("Sun");
            var sl = sun.AddComponent<Light>();
            sl.type = LightType.Directional;
            sl.color = new Color(1f, 0.95f, 0.84f);
            sl.intensity = 1.15f;
            sl.shadows = LightShadows.None;   // keep WebGL/mobile cheap
            sun.transform.rotation = Quaternion.Euler(52f, 28f, 0);
        }

        private void BuildRoom()
        {
            Spawn("hut_shell", Vector3.zero, 0, collide: false);   // physics is code-built below
            BuildRoomPhysics();
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

        private void BuildExterior()
        {
            Spawn("terrain_ground", new Vector3(0, 0, 0), 0, collide: false);   // ground box in BuildRoomPhysics
            Spawn("terrain_path", new Vector3(0, 0, 0), 0, collide: false);
            Spawn("hut_exterior", Vector3.zero, 0, collide: false);    // roof + chimney, overhead
            Spawn("sky_dome", Vector3.zero, 0, collide: false);        // huge emissive dome

            // scatter trees + rocks around the ~20m ring (hand-placed, ≤20 total)
            float[] ang = { 8, 40, 70, 105, 138, 168, 200, 232, 262, 292, 322, 350 };
            for (int i = 0; i < ang.Length; i++)
            {
                float r = 18f + (i % 3) * 1.6f;
                float rad = ang[i] * Mathf.Deg2Rad;
                var p = new Vector3(Mathf.Cos(rad) * r, 0, Mathf.Sin(rad) * r);
                bool pine = i % 2 == 0;
                Spawn(pine ? "tree_pine" : "tree_oak", p, ang[i], scale: 0.9f + (i % 4) * 0.12f);
            }
            float[] rockAng = { 24, 88, 150, 214, 300 };
            for (int i = 0; i < rockAng.Length; i++)
            {
                float rad = rockAng[i] * Mathf.Deg2Rad;
                var p = new Vector3(Mathf.Cos(rad) * 21f, 0, Mathf.Sin(rad) * 21f);
                Spawn(i % 2 == 0 ? "rock_large" : "rock_small", p, rockAng[i] * 1.7f);
            }

            BuildBoundaryRing(22.5f);
        }

        private void BuildBoundaryRing(float radius)
        {
            // invisible wall so the player can circle the hut but never reach a void
            var ring = new GameObject("Boundary");
            const int segs = 36;
            for (int i = 0; i < segs; i++)
            {
                float a = (i / (float)segs) * Mathf.PI * 2f;
                var seg = new GameObject("seg");
                seg.transform.SetParent(ring.transform, false);
                seg.transform.position = new Vector3(Mathf.Cos(a) * radius, 2f, Mathf.Sin(a) * radius);
                seg.transform.rotation = Quaternion.Euler(0, -a * Mathf.Rad2Deg, 0);
                var bc = seg.AddComponent<BoxCollider>();
                bc.size = new Vector3(radius * 2f * Mathf.PI / segs + 0.5f, 4f, 0.5f);
            }
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

            // kept clear of the doorway gap at x in [-0.85, 0.85] on the -Z wall
            var arcade = Spawn("arcade_cabinet", new Vector3(2.6f, 0, -6.1f), 0f);
            AddStation(arcade, StationId.Arcade, "The Arcade", "#7c5cff");

            var table = Spawn("wayfinder_table", new Vector3(3.6f, 0, -4.7f), 0f);
            AddStation(table, StationId.Wayfinder, "The Wayfinder", "#22c55e");
        }

        private PlayerController BuildPlayer()
        {
            var root = new GameObject("Player");
            root.tag = "Player";
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
                a.transform.localPosition = Vector3.zero;
                avatar = a.transform;
                _appearance = root.AddComponent<PlayerAppearance>();
                _appearance.Bind(a);
                root.AddComponent<WalkAnimator>().Bind(a.transform, cc);
            }

            var pc = root.AddComponent<PlayerController>();
            pc.avatar = null;   // gait handled by WalkAnimator, not the old bob
            _playerRoot = root.transform;
            return pc;
        }

        private CameraRig BuildCamera(PlayerController player)
        {
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.55f, 0.68f, 0.83f);   // sky fallback
            cam.fieldOfView = 60f;
            camGo.AddComponent<AudioListener>();
            var rig = camGo.AddComponent<CameraRig>();
            rig.target = player.transform;
            camGo.transform.position = player.transform.position + new Vector3(0, 2.4f, -3f);
            return rig;
        }

        private void BuildSystems(PlayerController player, CameraRig rig)
        {
            var sys = new GameObject("Systems");
            sys.AddComponent<SupabaseClient>();
            var ui = sys.AddComponent<HutUI>();
            ui.player = player;
            ui.cameraRig = rig;
            ui.appearance = _appearance;
            var interact = sys.AddComponent<InteractionSystem>();
            interact.player = player.transform;
            interact.ui = ui;

            var touch = sys.AddComponent<TouchControls>();
            touch.ui = ui;

            var audioMgr = sys.AddComponent<AudioManager>();
            audioMgr.player = player.transform;
            // first-run soul creation is triggered inside HutUI.Start (after its canvas exists)
        }

        private void BuildLights()
        {
            var key = new GameObject("KeyLight");
            key.transform.position = new Vector3(0, 3.6f, 0);
            var kl = key.AddComponent<Light>();
            kl.type = LightType.Point;
            kl.color = new Color(1f, 0.86f, 0.62f);
            kl.range = 16f;
            kl.intensity = 1.5f;

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
