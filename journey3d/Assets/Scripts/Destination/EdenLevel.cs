using UnityEngine;

namespace Journey3D
{
    /// Full low-poly Eden garden level — dense 3D geometry, not text placeholders.
    /// Layout (north = deeper into garden):
    ///   Gate clearing → Garden path → Three tend sites → Guardian glade → Tree of Life / relic
    public static class EdenLevel
    {
        public const string Id = "eden";

        public static GameObject Build(DestinationDef def, Transform player)
        {
            var root = new GameObject("EdenLevel");
            var accent = UIKit.Hex("#22c55e");
            var run = root.AddComponent<DestinationRun>();

            ApplySky();
            BuildTerrain(root.transform, accent);
            BuildHedgeWalls(root.transform);
            BuildGateClearing(root.transform, accent);
            BuildGardenBeds(root.transform, accent);
            BuildStream(root.transform);

            // Guide — open grass platform (no rocks underfoot)
            BuildGuidePlatform(root.transform, new Vector3(0, 0, 5f), accent);
            var guide = SpawnPerson("char_fem_gown", "anims_fem", new Vector3(0, 0.08f, 5f), 180f, player);
            if (guide != null)
            {
                guide.transform.SetParent(root.transform, true);
                // Ensure she is not buried: re-seat after parent
                var ccGuide = guide.GetComponentInChildren<Collider>();
                guide.transform.position = new Vector3(0, 0.08f, 5f);
                var di = guide.AddComponent<DestInteractable>();
                di.action = DestAction.SpeakGuide;
                di.destId = Id;
                di.label = "The Gardener";
                di.accent = accent;
                di.interactRadius = 3.2f;
            }

            // Three physical tend sites (no giant world titles — HUD prompt only)
            var siteA = BuildTendTree(root.transform, new Vector3(8f, 0, 8f), accent, "a", "Tend the east oak");
            var siteB = BuildSpring(root.transform, new Vector3(-8f, 0, 9f), accent, "b", "Water the spring");
            var siteC = BuildFlowerCircle(root.transform, new Vector3(0, 0, 14f), accent, "c", "Name the first flower");

            // Hedge barrier before sanctum (physical wall)
            var barrier = BuildHedgeGate(root.transform, new Vector3(0, 0, 20f), accent);

            // Guardian — dark crystal in glade
            var guardian = BuildGuardian(root.transform, new Vector3(0, 0, 22.5f), accent);

            // Tree of Life + relic (deep garden)
            var relic = BuildTreeOfLife(root.transform, new Vector3(0, 0, 30f), accent);

            // Dense forest ring (the "real" forest, not a log seal)
            BuildForestRing(root.transform, accent);

            // Soft path markers (geometry only)
            for (int i = 0; i < 18; i++)
            {
                float z = -6f + i * 2.1f;
                PropUtils.SoftQuad("path_" + i, new Vector3(0, 0.03f, z), new Vector3(2.8f, 1.8f, 1f),
                    new Color(0.35f, 0.28f, 0.16f, 0.55f)).transform.SetParent(root.transform, true);
            }

            // Lights
            PropUtils.PointGlow(root.transform, new Vector3(0, 5f, 10f), new Color(0.85f, 1f, 0.7f), 1.6f, 24f);
            PropUtils.PointGlow(root.transform, new Vector3(0, 4f, 28f), accent, 1.8f, 14f);

            run.Bind(Id, accent,
                relic.GetComponent<DestInteractable>(),
                guardian.GetComponent<DestInteractable>(),
                barrier);

            if (player != null)
            {
                var cc = player.GetComponent<CharacterController>();
                if (cc != null) cc.enabled = false;
                player.position = new Vector3(0, 0.15f, -5f);
                player.rotation = Quaternion.identity;
                if (cc != null) cc.enabled = true;
            }

            return root;
        }

        private static void ApplySky()
        {
            // Soft dawn garden sky (distinct from hut dusk-indigo)
            if (Camera.main != null)
            {
                Camera.main.backgroundColor = new Color(0.55f, 0.78f, 0.92f);
                Camera.main.clearFlags = CameraClearFlags.SolidColor;
            }
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.65f, 0.82f, 0.7f);
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogDensity = 0.0028f;
            RenderSettings.ambientLight = new Color(0.62f, 0.72f, 0.52f);
        }

        private static void BuildTerrain(Transform parent, Color accent)
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "eden_ground";
            ground.transform.SetParent(parent, false);
            ground.transform.position = new Vector3(0, -0.5f, 14f);
            ground.transform.localScale = new Vector3(90f, 1f, 90f);
            Object.Destroy(ground.GetComponent<Collider>());
            ground.AddComponent<BoxCollider>().size = Vector3.one;
            ground.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.22f, 0.42f, 0.2f));

            // Raised garden plateau near Tree of Life
            var plateau = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            plateau.name = "sanctum_plateau";
            plateau.transform.SetParent(parent, false);
            plateau.transform.position = new Vector3(0, 0.08f, 30f);
            plateau.transform.localScale = new Vector3(12f, 0.12f, 12f);
            Object.Destroy(plateau.GetComponent<Collider>());
            plateau.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.28f, 0.48f, 0.22f));
        }

        private static void BuildHedgeWalls(Transform parent)
        {
            // Side hedges create a garden corridor feel
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 12; i++)
                {
                    float z = -4f + i * 3f;
                    float x = side * 11f;
                    var bush = SpawnKenney("nat_plant_bushLarge", new Vector3(x, 0, z), i * 30f, 2.4f + (i % 3) * 0.3f);
                    if (bush != null) bush.transform.SetParent(parent, true);
                    var tree = SpawnKenney(i % 2 == 0 ? "nat_tree_oak" : "nat_tree_detailed",
                        new Vector3(x + side * 2.5f, 0, z + 0.8f), i * 40f, 4.5f + (i % 4) * 0.6f);
                    if (tree != null) tree.transform.SetParent(parent, true);
                }
            }
        }

        private static void BuildGuidePlatform(Transform parent, Vector3 pos, Color accent)
        {
            // Flat moss ring — keeps rocks/trees away from the Gardener
            var pad = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pad.name = "guide_pad";
            pad.transform.SetParent(parent, false);
            pad.transform.position = pos + Vector3.up * 0.02f;
            pad.transform.localScale = new Vector3(4.5f, 0.04f, 4.5f);
            Object.Destroy(pad.GetComponent<Collider>());
            pad.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.25f, 0.48f, 0.24f));
            PropUtils.GoldRing(parent, 2.0f, 0.05f, UIKit.WithA(accent, 0.55f), 0.04f);
            // flowers only at edge of pad (not center)
            for (int i = 0; i < 6; i++)
            {
                float a = i / 6f * Mathf.PI * 2f;
                var f = SpawnKenney("nat_flower_yellowB",
                    pos + new Vector3(Mathf.Cos(a) * 2.1f, 0, Mathf.Sin(a) * 2.1f), i * 40f, 0.55f);
                if (f != null) f.transform.SetParent(parent, true);
            }
        }

        private static void BuildGateClearing(Transform parent, Color accent)
        {
            // Return gate — living tree arch only (stones off to the side, not under NPCs)
            var gate = new GameObject("ReturnGate");
            gate.transform.SetParent(parent, false);
            gate.transform.position = new Vector3(0, 0, -8f);

            for (int i = -1; i <= 1; i += 2)
            {
                var t = SpawnKenney("nat_tree_oak", new Vector3(i * 2.4f, 0, 0), i * 20f, 5.5f);
                if (t != null) t.transform.SetParent(gate.transform, true);
            }
            // stones well clear of path center
            var stoneL = SpawnKenney("nat_stone_tallC", new Vector3(-4.5f, 0, -1.5f), 10f, 2.0f);
            if (stoneL != null) stoneL.transform.SetParent(parent, true);
            var stoneR = SpawnKenney("nat_stone_tallC", new Vector3(4.5f, 0, -1.2f), -15f, 1.9f);
            if (stoneR != null) stoneR.transform.SetParent(parent, true);
            // Portal orb between trees
            var orb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            orb.transform.SetParent(gate.transform, false);
            orb.transform.localPosition = new Vector3(0, 1.5f, 0.4f);
            orb.transform.localScale = Vector3.one * 1.1f;
            Object.Destroy(orb.GetComponent<Collider>());
            orb.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(UIKit.WithA(accent, 0.9f));
            orb.AddComponent<SlowSpin>().degreesPerSecond = 16f;
            PropUtils.PointGlow(gate.transform, new Vector3(0, 1.5f, 0.4f), accent, 1.5f, 6f);

            var di = gate.AddComponent<DestInteractable>();
            di.action = DestAction.ReturnHut;
            di.label = "Return to Hut";
            di.accent = accent;
            di.interactRadius = 3f;

            // Path stones to the sides only
            var dais = SpawnKenney("nat_stone_largeB", new Vector3(-5f, 0, -3f), 0, 2.0f);
            if (dais != null) dais.transform.SetParent(parent, true);
        }

        private static void BuildGardenBeds(Transform parent, Color accent)
        {
            string[] flowers = { "nat_flower_redA", "nat_flower_yellowB", "nat_flower_purpleC", "nat_mushroom_redGroup" };
            for (int bed = 0; bed < 6; bed++)
            {
                float z = 4f + bed * 2.5f;
                float x = (bed % 2 == 0 ? -1f : 1f) * 4.5f;
                for (int f = 0; f < 5; f++)
                {
                    var fl = SpawnKenney(flowers[f % flowers.Length],
                        new Vector3(x + (f - 2) * 0.55f, 0, z + (f % 2) * 0.3f),
                        f * 40f, 0.55f + (f % 3) * 0.15f);
                    if (fl != null) fl.transform.SetParent(parent, true);
                }
            }
            // Logs as benches
            var log = SpawnKenney("nat_log_stack", new Vector3(-3.5f, 0, 2f), 90f, 2.2f);
            if (log != null) log.transform.SetParent(parent, true);
            var log2 = SpawnKenney("nat_log_stack", new Vector3(3.5f, 0, 2.2f), 85f, 2f);
            if (log2 != null) log2.transform.SetParent(parent, true);
        }

        private static void BuildStream(Transform parent)
        {
            // Simple water ribbon crossing the path mid-garden
            for (int i = 0; i < 8; i++)
            {
                var w = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                w.name = "stream";
                w.transform.SetParent(parent, false);
                w.transform.position = new Vector3(-6f + i * 1.7f, 0.04f, 11.5f + Mathf.Sin(i) * 0.4f);
                w.transform.localScale = new Vector3(1.8f, 0.06f, 1.8f);
                Object.Destroy(w.GetComponent<Collider>());
                w.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.25f, 0.5f, 0.75f, 1f));
            }
        }

        private static GameObject BuildTendTree(Transform parent, Vector3 pos, Color accent, string siteId, string label)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.SetParent(parent, false);
            root.transform.position = pos;
            var tree = SpawnKenney("nat_tree_oak", Vector3.zero, 25f, 5.5f);
            if (tree != null)
            {
                tree.transform.SetParent(root.transform, false);
                tree.transform.localPosition = Vector3.zero;
            }
            PropUtils.GoldRing(root.transform, 1.1f, 0.04f, UIKit.WithA(accent, 0.7f), 0.05f);
            AddSite(root, siteId, label, accent);
            return root;
        }

        private static GameObject BuildSpring(Transform parent, Vector3 pos, Color accent, string siteId, string label)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.SetParent(parent, false);
            root.transform.position = pos;
            var rocks = SpawnKenney("nat_rock_largeA", new Vector3(0.4f, 0, 0.3f), 10f, 1.6f);
            if (rocks != null) rocks.transform.SetParent(root.transform, true);
            var pool = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pool.transform.SetParent(root.transform, false);
            pool.transform.localPosition = new Vector3(0, 0.06f, 0);
            pool.transform.localScale = new Vector3(2.2f, 0.08f, 2.2f);
            Object.Destroy(pool.GetComponent<Collider>());
            pool.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.2f, 0.55f, 0.8f));
            PropUtils.PointGlow(root.transform, new Vector3(0, 0.5f, 0), new Color(0.4f, 0.8f, 1f), 1.0f, 4f);
            PropUtils.GoldRing(root.transform, 1.3f, 0.04f, UIKit.WithA(accent, 0.65f), 0.05f);
            AddSite(root, siteId, label, accent);
            return root;
        }

        private static GameObject BuildFlowerCircle(Transform parent, Vector3 pos, Color accent, string siteId, string label)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.SetParent(parent, false);
            root.transform.position = pos;
            string[] fl = { "nat_flower_redA", "nat_flower_yellowB", "nat_flower_purpleC" };
            for (int i = 0; i < 10; i++)
            {
                float a = i / 10f * Mathf.PI * 2f;
                var f = SpawnKenney(fl[i % fl.Length],
                    new Vector3(Mathf.Cos(a) * 1.4f, 0, Mathf.Sin(a) * 1.4f), i * 30f, 0.7f);
                if (f != null) f.transform.SetParent(root.transform, true);
            }
            PropUtils.GoldRing(root.transform, 1.6f, 0.04f, UIKit.WithA(accent, 0.7f), 0.05f);
            AddSite(root, siteId, label, accent);
            return root;
        }

        private static void AddSite(GameObject root, string siteId, string label, Color accent)
        {
            bool done = SaveState.Character.discovered.Contains("site_eden_" + siteId);
            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.SiteTask;
            di.destId = Id;
            di.siteId = siteId;
            di.label = done ? "Tended" : label;
            di.accent = accent;
            di.completed = done;
            di.interactRadius = 2.6f;
        }

        private static GameObject BuildHedgeGate(Transform parent, Vector3 pos, Color accent)
        {
            var root = new GameObject("Barrier");
            root.transform.SetParent(parent, false);
            root.transform.position = pos;
            // Living hedge wall with gap blocked by crystal film
            for (int i = -4; i <= 4; i++)
            {
                if (i == 0) continue;
                var b = SpawnKenney("nat_plant_bushLarge", new Vector3(i * 1.35f, 0, 0), i * 15f, 2.8f);
                if (b != null) b.transform.SetParent(root.transform, true);
            }
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.transform.SetParent(root.transform, false);
            wall.transform.localPosition = new Vector3(0, 1.4f, 0);
            wall.transform.localScale = new Vector3(3.2f, 2.8f, 0.5f);
            wall.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.15f, 0.35f, 0.2f, 0.85f));
            return root;
        }

        private static GameObject BuildGuardian(Transform parent, Vector3 pos, Color accent)
        {
            var root = new GameObject("Guardian");
            root.transform.SetParent(parent, false);
            root.transform.position = pos;

            // Stacked dark stones + glowing eye (readable low-poly boss)
            var baseR = SpawnKenney("nat_rock_largeA", Vector3.zero, 0, 2.2f);
            if (baseR != null) baseR.transform.SetParent(root.transform, true);
            var body = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0, 2.0f, 0);
            body.transform.localScale = new Vector3(1.4f, 1.8f, 1.4f);
            Object.Destroy(body.GetComponent<Collider>());
            body.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.12f, 0.18f, 0.12f));
            body.AddComponent<SlowSpin>().degreesPerSecond = 12f;

            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.transform.SetParent(root.transform, false);
            eye.transform.localPosition = new Vector3(0, 2.2f, 0.7f);
            eye.transform.localScale = Vector3.one * 0.35f;
            Object.Destroy(eye.GetComponent<Collider>());
            eye.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(accent);
            PropUtils.PointGlow(root.transform, new Vector3(0, 2.2f, 0.5f), accent, 1.6f, 7f);

            bool cleared = SaveState.Character.discovered.Contains("guardian_eden")
                || SaveState.Character.cleared.Contains(Id);
            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.Challenge;
            di.destId = Id;
            di.siteId = "guardian";
            di.label = cleared ? "Guardian fallen" : "Garden Guardian";
            di.accent = accent;
            di.completed = cleared;
            di.interactRadius = 3.2f;
            return root;
        }

        private static GameObject BuildTreeOfLife(Transform parent, Vector3 pos, Color accent)
        {
            var root = new GameObject("Relic");
            root.transform.SetParent(parent, false);
            root.transform.position = pos;

            var tree = SpawnKenney("nat_tree_detailed", Vector3.zero, 0, 8f);
            if (tree != null) tree.transform.SetParent(root.transform, true);
            var oak = SpawnKenney("nat_tree_oak", new Vector3(2.5f, 0, 1f), 40f, 5f);
            if (oak != null) oak.transform.SetParent(root.transform, true);
            var oak2 = SpawnKenney("nat_tree_oak", new Vector3(-2.8f, 0, 0.5f), -30f, 5.5f);
            if (oak2 != null) oak2.transform.SetParent(root.transform, true);

            // Relic seed at roots
            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.transform.SetParent(root.transform, false);
            core.transform.localPosition = new Vector3(0, 0.9f, 1.2f);
            core.transform.localScale = Vector3.one * 0.5f;
            Object.Destroy(core.GetComponent<Collider>());
            bool owned = DestinationManager.HasRelic(Id);
            core.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(owned ? new Color(0.4f, 0.4f, 0.4f) : new Color(0.95f, 0.85f, 0.3f));
            if (!owned) core.AddComponent<SlowSpin>().degreesPerSecond = 35f;
            PropUtils.PointGlow(root.transform, new Vector3(0, 1f, 1.2f), new Color(1f, 0.9f, 0.4f), 1.8f, 6f);
            PropUtils.GoldRing(root.transform, 2.2f, 0.05f, UIKit.WithA(accent, 0.8f), 0.07f);

            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.ClaimRelic;
            di.destId = Id;
            di.label = owned ? "Relic claimed" : DestinationManager.RelicName(Id);
            di.accent = accent;
            di.completed = owned;
            di.interactRadius = 2.8f;
            return root;
        }

        private static void BuildForestRing(Transform parent, Color accent)
        {
            string[] trees = { "nat_tree_oak", "nat_tree_detailed", "nat_tree_default", "nat_tree_fat",
                               "nat_tree_pineTallA", "nat_tree_pineRoundC", "nat_plant_bushLarge" };
            // Guide stands at (0, 5) — keep a clear circle free of trees/rocks
            Vector3 guideClear = new Vector3(0, 0, 5f);
            const float guideClearR = 4.2f;
            for (int i = 0; i < 48; i++)
            {
                float ang = (i / 48f) * Mathf.PI * 2f;
                float r = 22f + (i % 4) * 2.5f;
                float x = Mathf.Cos(ang) * r;
                float z = 14f + Mathf.Sin(ang) * r;
                // leave south gate approach open
                if (z < -2f && Mathf.Abs(x) < 4f) continue;
                if (Vector3.Distance(new Vector3(x, 0, z), guideClear) < guideClearR) continue;
                var t = SpawnKenney(trees[i % trees.Length], new Vector3(x, 0, z), i * 17f,
                    4f + (i % 5) * 0.8f);
                if (t != null) t.transform.SetParent(parent, true);
            }
            // Understory
            for (int i = 0; i < 30; i++)
            {
                float ang = (i / 30f) * Mathf.PI * 2f + 0.1f;
                float r = 16f + (i % 3) * 1.5f;
                float x = Mathf.Cos(ang) * r;
                float z = 14f + Mathf.Sin(ang) * r;
                if (Vector3.Distance(new Vector3(x, 0, z), guideClear) < guideClearR) continue;
                var b = SpawnKenney("nat_plant_bushDetailed",
                    new Vector3(x, 0, z),
                    i * 20f, 1.8f);
                if (b != null) b.transform.SetParent(parent, true);
            }
        }

        private static GameObject SpawnPerson(string model, string anim, Vector3 pos, float yaw, Transform player)
        {
            var go = CharacterFactory.Spawn(model, anim, pos, yaw, 1.78f, collide: true);
            CharacterFactory.ForceVisible(go, truthKing: false);
            var rig = go.GetComponent<CharacterRig>();
            if (rig != null)
            {
                var amb = go.AddComponent<NpcAmbient>();
                if (player != null) amb.Bind(rig, player);
            }
            return go;
        }

        private static GameObject SpawnKenney(string name, Vector3 pos, float yaw, float targetSize)
        {
            var prefab = Resources.Load<GameObject>("Models/kenney/" + name);
            if (prefab == null) return null;
            var wrapper = new GameObject(name);
            wrapper.transform.SetPositionAndRotation(pos, Quaternion.Euler(0, yaw, 0));
            var inst = Object.Instantiate(prefab, wrapper.transform);
            inst.transform.localPosition = Vector3.zero;
            var rends = inst.GetComponentsInChildren<Renderer>();
            if (rends.Length > 0)
            {
                var b = rends[0].bounds;
                for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
                float dim = b.size.y > 0.05f ? b.size.y : Mathf.Max(b.size.x, b.size.z);
                inst.transform.localScale = Vector3.one * (targetSize / Mathf.Max(0.01f, dim));
                b = rends[0].bounds;
                for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
                inst.transform.position += wrapper.transform.position
                    - new Vector3(b.center.x, b.min.y - 0.008f, b.center.z);
            }
            return wrapper;
        }
    }
}
