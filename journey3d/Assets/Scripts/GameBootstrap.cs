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

            // NOTE: real-time shadows are OFF - Unity WebGL strips shadow shader
            // variants, which rendered the in-world scene black. Do not re-enable
            // without shipping the shadow variants in a shader-variant collection.
            QualitySettings.shadows = ShadowQuality.Disable;
            QualitySettings.pixelLightCount = 4;

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
            WorldSkin.Skin(go);   // grained/mottled surface textures over flat color
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

        /// Spawns a Kenney CC0 model normalized to a real-world size and seated
        /// on the ground, regardless of the kit's native scale/pivot. Keeps the
        /// kit's own flat colors (no WorldSkin).
        private GameObject SpawnKenney(string name, Vector3 pos, float yaw, float targetSize, bool collide = true, bool flat = false)
        {
            var prefab = Resources.Load<GameObject>("Models/kenney/" + name);
            if (prefab == null) { Debug.LogError("Missing kenney: " + name); return null; }
            var wrapper = new GameObject(name);
            wrapper.transform.SetPositionAndRotation(pos, Quaternion.Euler(0, yaw, 0));
            var inst = Instantiate(prefab, wrapper.transform);
            inst.transform.localPosition = Vector3.zero;
            inst.transform.localRotation = Quaternion.identity;

            var rends = inst.GetComponentsInChildren<Renderer>();
            if (rends.Length > 0)
            {
                var b = rends[0].bounds;
                for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
                float dim = flat ? Mathf.Max(b.size.x, b.size.z) : b.size.y;
                inst.transform.localScale = Vector3.one * (targetSize / Mathf.Max(0.01f, dim));
                b = rends[0].bounds;
                for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
                // seat base at the wrapper origin, lifted 8mm so a model's base
                // is never exactly coplanar with the floor (avoids z-fighting)
                inst.transform.position += wrapper.transform.position - new Vector3(b.center.x, b.min.y - 0.008f, b.center.z);
            }
            if (collide) AddBoundsCollider(wrapper);
            return wrapper;
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
            sl.intensity = 1.2f;
            sl.shadows = LightShadows.None;   // WebGL variant-stripping -> black
            sun.transform.rotation = Quaternion.Euler(52f, 28f, 0);
        }

        private void BuildRoom()
        {
            Spawn("hut_shell", Vector3.zero, 0, collide: false);   // physics is code-built below
            BuildRoomPhysics();

            // ---- a lived-in hut: sleeping corner, hearth-side dining, reading
            //      nook, entry bench (Kenney furniture, sized to the room) ----

            // center rug between the door and Truth
            SpawnKenney("fur_rugRound", new Vector3(0, 0.02f, -1.2f), 0, 4.6f, collide: false, flat: true);

            // sleeping corner (left wall, between archive and back wall)
            SpawnKenney("fur_bedSingle", new Vector3(-5.4f, 0, 4.4f), 90f, 1.05f);
            SpawnKenney("fur_sideTable", new Vector3(-4.0f, 0, 5.6f), 0, 0.6f, collide: false);
            SpawnKenney("fur_lampRoundTable", new Vector3(-4.0f, 0.62f, 5.6f), 0, 0.5f, collide: false);

            // hearth-side dining: table with stools near the fire
            SpawnKenney("fur_table", new Vector3(4.4f, 0, 1.9f), 0, 0.9f);
            SpawnKenney("fur_books", new Vector3(4.4f, 0.92f, 1.9f), 25f, 0.32f, collide: false);
            SpawnKenney("fur_stoolBar", new Vector3(3.5f, 0, 1.9f), 0, 0.8f, collide: false);
            SpawnKenney("fur_stoolBar", new Vector3(5.3f, 0, 1.9f), 0, 0.8f, collide: false);

            // reading nook next to the archive shelf
            SpawnKenney("fur_bookcaseOpen", new Vector3(-6.3f, 0, -0.4f), 90f, 2.2f);
            SpawnKenney("fur_chairRounded", new Vector3(-5.2f, 0, -1.4f), 120f, 1.0f, collide: false);

            // entry: bench + coat rack beside the door, greenery at the corners
            SpawnKenney("fur_bench", new Vector3(-2.4f, 0, -6.2f), 0, 0.85f);
            SpawnKenney("fur_coatRack", new Vector3(-4.6f, 0, -6.2f), 0, 1.9f, collide: false);
            SpawnKenney("fur_pottedPlant", new Vector3(6.2f, 0, 6.1f), 0, 1.5f, collide: false);
            SpawnKenney("fur_pottedPlant", new Vector3(-6.2f, 0, 6.2f), 200f, 1.35f, collide: false);
            var fire = Spawn("fireplace", new Vector3(6.05f, 0.02f, 0), -90f);   // lift hearth off the floor (was coplanar -> z-fight)
            var flame = new GameObject("firelight");
            flame.transform.SetParent(fire.transform, false);
            flame.transform.localPosition = new Vector3(0, 1.1f, -0.4f);
            var l = flame.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = new Color(1f, 0.55f, 0.2f);
            l.range = 9f;
            flame.AddComponent<FlickerLight>().baseIntensity = 2.6f;
        }

        // the clearing: everything the player can reach stays inside this radius
        private const float BOUNDARY_R = 22.5f;
        // the one path out runs due -Z (out the hut door); the forest parts here
        private const float TRAIL_DEG = 270f;
        private const float TRAIL_HALF_DEG = 8f;

        private void BuildExterior()
        {
            // 120x120 visible grass so no edge is ever in sight (physics ground
            // stays the code-built box; the player never leaves the forest ring)
            // 2cm below the hut's wood floor - they were coplanar at y=0 and
            // z-fought (grass bleeding through the interior floor)
            Spawn("terrain_ground", new Vector3(0, -0.06f, 0), 0, collide: false, scale: 2.5f);   // 6cm below the wood floor -> no z-fight inside
            Spawn("terrain_path", new Vector3(0, 0, 0), 0, collide: false);
            Spawn("terrain_path", new Vector3(0, 0, -10.4f), 0, collide: false);   // pavers on to the trailhead
            Spawn("hut_exterior", Vector3.zero, 0, collide: false);    // roof + chimney, overhead
            Spawn("sky_dome", Vector3.zero, 0, collide: false);        // huge emissive dome

            // scattered trees inside the clearing so the yard reads as a glade
            string[] trees = { "nat_tree_default", "nat_tree_pineTallA", "nat_tree_detailed", "nat_tree_oak",
                               "nat_tree_fat", "nat_tree_thin", "nat_tree_pineRoundC", "nat_tree_small" };
            float[] ang = { 8, 32, 58, 84, 110, 138, 166, 194, 222, 306, 334 };   // gap left around the trail
            for (int i = 0; i < ang.Length; i++)
            {
                float r = 17.5f + (i % 3) * 1.4f;
                float rad = ang[i] * Mathf.Deg2Rad;
                var p = new Vector3(Mathf.Cos(rad) * r, 0, Mathf.Sin(rad) * r);
                SpawnKenney(trees[i % trees.Length], p, ang[i] * 2.3f, 3.2f + (i % 4) * 0.6f);
            }
            // rocks + standing stones
            string[] rocks = { "nat_rock_largeA", "nat_stone_tallC", "nat_rock_largeC", "nat_stone_largeB", "nat_rock_tallA" };
            float[] rang = { 20, 70, 120, 175, 205, 250, 300, 340 };
            for (int i = 0; i < rang.Length; i++)
            {
                if (InTrail(rang[i])) continue;
                float rad = rang[i] * Mathf.Deg2Rad;
                var p = new Vector3(Mathf.Cos(rad) * 20.5f, 0, Mathf.Sin(rad) * 20.5f);
                SpawnKenney(rocks[i % rocks.Length], p, rang[i] * 1.7f, 1.2f + (i % 3) * 0.5f);
            }
            // bushes, flowers, mushrooms, logs across the mid-yard (non-blocking)
            string[] flora = { "nat_plant_bushLarge", "nat_flower_redA", "nat_plant_bushDetailed", "nat_flower_yellowB",
                               "nat_mushroom_redGroup", "nat_flower_purpleC", "nat_log_stack", "nat_grass_leafsLarge" };
            float[] fang = { 15, 45, 80, 120, 150, 190, 225, 265, 300, 335 };
            for (int i = 0; i < fang.Length; i++)
            {
                float rad = fang[i] * Mathf.Deg2Rad;
                float r = 10.5f + (i % 4) * 2.1f;
                var p = new Vector3(Mathf.Cos(rad) * r, 0, Mathf.Sin(rad) * r);
                SpawnKenney(flora[i % flora.Length], p, fang[i] * 3f, 0.7f + (i % 3) * 0.4f, collide: false);
            }

            BuildForestWall();
            BuildBoundary();
            BuildTrailhead();
        }

        private static bool InTrail(float deg, float halfWidth = TRAIL_HALF_DEG + 4f)
        {
            return Mathf.Abs(Mathf.DeltaAngle(deg, TRAIL_DEG)) < halfWidth;
        }

        /// A dense double ring of big trees just past the boundary, with
        /// understory bushes plugging the trunk gaps - a living border wall.
        /// The only opening is the trail corridor at TRAIL_DEG.
        private void BuildForestWall()
        {
            string[] big = { "nat_tree_pineTallA", "nat_tree_detailed", "nat_tree_default", "nat_tree_oak",
                             "nat_tree_fat", "nat_tree_pineRoundC" };
            var rng = new System.Random(7);
            var root = new GameObject("ForestWall").transform;

            // inner ring: heavyweight trees shoulder to shoulder (~5 deg apart)
            for (float deg = 0; deg < 360f; deg += 5f)
            {
                if (InTrail(deg)) continue;
                float jitter = (float)rng.NextDouble() * 2.2f;
                float r = 24f + jitter;
                float rad = deg * Mathf.Deg2Rad;
                var p = new Vector3(Mathf.Cos(rad) * r, 0, Mathf.Sin(rad) * r);
                var t = SpawnKenney(big[rng.Next(big.Length)], p, (float)rng.NextDouble() * 360f,
                    5.2f + (float)rng.NextDouble() * 2.6f, collide: false);
                if (t != null) t.transform.SetParent(root, true);
            }
            // outer ring: staggered, taller, sells depth beyond the wall
            for (float deg = 2.5f; deg < 360f; deg += 7f)
            {
                if (InTrail(deg)) continue;
                float r = 28.5f + (float)rng.NextDouble() * 3f;
                float rad = deg * Mathf.Deg2Rad;
                var p = new Vector3(Mathf.Cos(rad) * r, 0, Mathf.Sin(rad) * r);
                var t = SpawnKenney(big[rng.Next(big.Length)], p, (float)rng.NextDouble() * 360f,
                    6.5f + (float)rng.NextDouble() * 3f, collide: false);
                if (t != null) t.transform.SetParent(root, true);
            }
            // understory: bushes at trunk height so there is no seeing through
            string[] brush = { "nat_plant_bushLarge", "nat_plant_bushDetailed" };
            for (float deg = 1.5f; deg < 360f; deg += 4f)
            {
                if (InTrail(deg)) continue;
                float rad = deg * Mathf.Deg2Rad;
                float r = 23.2f + (float)rng.NextDouble() * 1.2f;
                var p = new Vector3(Mathf.Cos(rad) * r, 0, Mathf.Sin(rad) * r);
                var b = SpawnKenney(brush[rng.Next(brush.Length)], p, (float)rng.NextDouble() * 360f,
                    1.6f + (float)rng.NextDouble() * 1.2f, collide: false);
                if (b != null) b.transform.SetParent(root, true);
            }
        }

        /// Invisible wall around the clearing. Segments face outward
        /// (tangent walls, overlapping) so there are no gaps to slip through.
        private void BuildBoundary()
        {
            var ring = new GameObject("Boundary");
            const int segs = 48;
            for (int i = 0; i < segs; i++)
            {
                float deg = (i / (float)segs) * 360f;
                // only the corridor MOUTH stays open (its own walls seal the rest);
                // a wider skip here would leave slip-gaps beside the corridor
                if (InTrail(deg, 7f)) continue;
                float rad = deg * Mathf.Deg2Rad;
                var dirOut = new Vector3(Mathf.Cos(rad), 0, Mathf.Sin(rad));
                var seg = new GameObject("seg");
                seg.transform.SetParent(ring.transform, false);
                seg.transform.position = dirOut * BOUNDARY_R + Vector3.up * 2.5f;
                seg.transform.rotation = Quaternion.LookRotation(dirOut);   // local Z = radial
                var bc = seg.AddComponent<BoxCollider>();
                // chord length + generous overlap; thick so fast souls can't tunnel
                bc.size = new Vector3(BOUNDARY_R * 2f * Mathf.PI / segs + 1.2f, 5f, 0.8f);
            }
        }

        /// The start of the adventure: a walled path south through the forest,
        /// sealed at its end by fallen timber between two standing stones.
        private void BuildTrailhead()
        {
            var root = new GameObject("Trailhead").transform;

            // corridor walls from the clearing edge to the seal
            AddWall(root, new Vector3(-2.6f, 2.5f, -25.5f), new Vector3(0.8f, 5f, 9f));
            AddWall(root, new Vector3(2.6f, 2.5f, -25.5f), new Vector3(0.8f, 5f, 9f));
            AddWall(root, new Vector3(0, 2.5f, -29.6f), new Vector3(6f, 5f, 0.8f));   // seal

            // trees hugging the corridor so the path reads as a forest lane
            var rng = new System.Random(23);
            string[] big = { "nat_tree_pineTallA", "nat_tree_detailed", "nat_tree_oak", "nat_tree_default" };
            for (int i = 0; i < 8; i++)
            {
                float z = -23.5f - i * 2.3f;
                float x = (i % 2 == 0 ? 1f : -1f) * (3.6f + (float)rng.NextDouble() * 1.6f);
                SpawnKenney(big[rng.Next(big.Length)], new Vector3(x, 0, z),
                    (float)rng.NextDouble() * 360f, 5f + (float)rng.NextDouble() * 2.5f, collide: false);
            }
            // the path fading into the deep woods beyond the seal
            for (int i = 0; i < 4; i++)
            {
                float z = -32f - i * 3.4f;
                SpawnKenney(big[rng.Next(big.Length)], new Vector3(((i % 2 == 0) ? -1.2f : 1.4f) * (1.5f + i * 0.4f), 0, z),
                    (float)rng.NextDouble() * 360f, 6f + (float)rng.NextDouble() * 3f, collide: false);
            }

            // the seal itself: stones + fallen timber + a promise
            SpawnKenney("nat_stone_tallC", new Vector3(-2.2f, 0, -27.6f), 12f, 3.1f);
            SpawnKenney("nat_stone_tallC", new Vector3(2.2f, 0, -27.8f), 200f, 2.8f);
            SpawnKenney("nat_log_stack", new Vector3(0, 0, -28.4f), 90f, 3.4f, flat: true);
            SpawnKenney("nat_mushroom_redGroup", new Vector3(-1.4f, 0, -27.9f), 40f, 0.5f, collide: false);

            var sign = new GameObject("trail_sign");
            sign.transform.SetParent(root, false);
            sign.transform.position = new Vector3(0, 2.6f, -28.2f);
            sign.transform.rotation = Quaternion.Euler(0, 180f, 0);   // face the approaching soul (TextMesh reads from behind its forward)
            var tm = sign.AddComponent<TextMesh>();
            tm.text = "The road beyond is still being laid.\nThe forest will open when it is time.";
            tm.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            tm.fontSize = 44;
            tm.characterSize = 0.032f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = UIKit.Amber;
            sign.GetComponent<MeshRenderer>().material = tm.font.material;

            var glow = new GameObject("seal_glow");
            glow.transform.SetParent(root, false);
            glow.transform.position = new Vector3(0, 1.4f, -27.6f);
            var gl = glow.AddComponent<Light>();
            gl.type = LightType.Point;
            gl.color = new Color(1f, 0.75f, 0.35f);
            gl.range = 7f;
            glow.AddComponent<FlickerLight>().baseIntensity = 1.6f;
        }

        private static void AddWall(Transform parent, Vector3 center, Vector3 size)
        {
            var w = new GameObject("wall");
            w.transform.SetParent(parent, false);
            w.transform.position = center;
            w.AddComponent<BoxCollider>().size = size;
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

            // Truth is the King of the Quaternius kit: white beard, gold crown,
            // regal robes - a sage worth crossing a forest for
            var truth = CharacterFactory.Spawn("char_truth", "anims_masc",
                new Vector3(0, 0, 3.2f), 180f, 1.86f, collide: true);
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

            // corner between the arcade and the forge, clear of both
            var table = Spawn("wayfinder_table", new Vector3(5.8f, 0, -5.8f), -45f);
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

            // the soul itself: a real Quaternius character picked and tinted
            // from the saved build/outfit, animated with the shared clip set
            _appearance = root.AddComponent<PlayerAppearance>();
            _appearance.Apply();
            root.AddComponent<WalkAnimator>().Bind(_appearance, cc);

            var pc = root.AddComponent<PlayerController>();
            pc.avatar = null;   // gait comes from real animation clips now
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
            // tighten the far plane (default 1000 with a 60m sky wastes depth
            // precision -> z-fighting under WebGL's 16-bit depth buffer)
            cam.nearClipPlane = 0.3f;
            cam.farClipPlane = 150f;
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
