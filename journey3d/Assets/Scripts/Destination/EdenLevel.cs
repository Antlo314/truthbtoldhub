using UnityEngine;

namespace Journey3D
{
    /// Intricate low-poly Eden garden — multi-room living landscape.
    /// Layout (south → north):
    ///   Return arch → entrance meadow → Gardener glade → forked path /
    ///   east oak grove · west spring gorge · center flower rotunda →
    ///   stream + bridge → hedge barrier → guardian glade → Tree of Life sanctum
    public static class EdenLevel
    {
        public const string Id = "eden";

        // Keep clear of props
        private static readonly Vector3 GuideClear = new Vector3(0, 0, 5f);
        private const float GuideClearR = 4.5f;
        private static readonly Vector3[] PathClear =
        {
            new Vector3(0, 0, -5f), new Vector3(0, 0, 0f), new Vector3(0, 0, 5f),
            new Vector3(0, 0, 10f), new Vector3(0, 0, 14f), new Vector3(0, 0, 18f),
            new Vector3(0, 0, 22.5f), new Vector3(0, 0, 30f),
            new Vector3(8f, 0, 8f), new Vector3(-8f, 0, 9f),
        };

        public static GameObject Build(DestinationDef def, Transform player)
        {
            var root = new GameObject("EdenLevel");
            var accent = UIKit.Hex("#22c55e");
            var run = root.AddComponent<DestinationRun>();

            ApplySky();
            BuildTerrain(root.transform, accent);
            BuildHillsAndTerraces(root.transform);
            BuildWindingPath(root.transform, accent);
            BuildHedgeWalls(root.transform);
            BuildGateClearing(root.transform, accent);
            BuildEntranceMeadow(root.transform, accent);
            BuildGardenBeds(root.transform, accent);
            BuildArborsAndTrellises(root.transform, accent);
            BuildStreamAndBridge(root.transform, accent);
            BuildStandingStones(root.transform, accent);
            BuildMushroomGlades(root.transform);
            BuildAmbientWildlifeProps(root.transform);

            // Guide — open grass platform (no rocks underfoot)
            BuildGuidePlatform(root.transform, GuideClear, accent);
            var guide = SpawnPerson("char_fem_gown", "anims_fem", new Vector3(0, 0.08f, 5f), 180f, player);
            if (guide != null)
            {
                guide.transform.SetParent(root.transform, true);
                guide.transform.position = new Vector3(0, 0.08f, 5f);
                var di = guide.AddComponent<DestInteractable>();
                di.action = DestAction.SpeakGuide;
                di.destId = Id;
                di.label = "The Gardener";
                di.accent = accent;
                di.interactRadius = 3.2f;
            }

            // Three tend sites — denser set dressing around each
            BuildTendTree(root.transform, new Vector3(8f, 0, 8f), accent, "a", "Tend the east oak");
            BuildSpring(root.transform, new Vector3(-8f, 0, 9f), accent, "b", "Water the spring");
            BuildFlowerCircle(root.transform, new Vector3(0, 0, 14f), accent, "c", "Name the first flower");

            var barrier = BuildHedgeGate(root.transform, new Vector3(0, 0, 20f), accent);
            var guardian = BuildGuardian(root.transform, new Vector3(0, 0, 22.5f), accent);
            var relic = BuildTreeOfLife(root.transform, new Vector3(0, 0, 30f), accent);

            BuildForestRing(root.transform, accent);
            BuildCanopyScatter(root.transform);
            BuildFloatingMotes(root.transform, accent);
            BuildLights(root.transform, accent);

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

        // ─────────────────────────────────────────────
        //  Atmosphere
        // ─────────────────────────────────────────────
        private static void ApplySky()
        {
            if (Camera.main != null)
            {
                Camera.main.backgroundColor = new Color(0.52f, 0.76f, 0.9f);
                Camera.main.clearFlags = CameraClearFlags.SolidColor;
                Camera.main.farClipPlane = 240f;
            }
            RenderSettings.fog = true;
            RenderSettings.fogColor = new Color(0.62f, 0.8f, 0.68f);
            RenderSettings.fogMode = FogMode.Exponential;
            RenderSettings.fogDensity = 0.0024f;
            RenderSettings.ambientLight = new Color(0.58f, 0.7f, 0.5f);
        }

        private static void BuildLights(Transform parent, Color accent)
        {
            // Key dawn sun-like
            PropUtils.PointGlow(parent, new Vector3(-4f, 9f, 6f), new Color(1f, 0.92f, 0.7f), 1.9f, 32f);
            // Path wash
            PropUtils.PointGlow(parent, new Vector3(0, 5f, 10f), new Color(0.85f, 1f, 0.72f), 1.4f, 22f);
            // Stream sparkle
            PropUtils.PointGlow(parent, new Vector3(0, 2.2f, 12f), new Color(0.45f, 0.85f, 1f), 0.9f, 8f);
            // Guardian gloom
            PropUtils.PointGlow(parent, new Vector3(0, 3.5f, 22.5f), new Color(0.25f, 0.55f, 0.3f), 1.2f, 10f);
            // Tree of Life sanctum
            PropUtils.PointGlow(parent, new Vector3(0, 5f, 30f), accent, 2.0f, 16f);
            PropUtils.PointGlow(parent, new Vector3(2f, 3f, 28f), new Color(1f, 0.9f, 0.45f), 1.0f, 7f);
            // Side grove accents
            PropUtils.PointGlow(parent, new Vector3(8f, 3.5f, 8f), new Color(0.7f, 1f, 0.55f), 1.0f, 8f);
            PropUtils.PointGlow(parent, new Vector3(-8f, 2.5f, 9f), new Color(0.4f, 0.8f, 1f), 1.1f, 7f);
        }

        // ─────────────────────────────────────────────
        //  Ground layers
        // ─────────────────────────────────────────────
        private static void BuildTerrain(Transform parent, Color accent)
        {
            // Main ground
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "eden_ground";
            ground.transform.SetParent(parent, false);
            ground.transform.position = new Vector3(0, -0.5f, 14f);
            ground.transform.localScale = new Vector3(110f, 1f, 110f);
            Object.Destroy(ground.GetComponent<Collider>());
            ground.AddComponent<BoxCollider>().size = Vector3.one;
            ground.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.2f, 0.4f, 0.18f));

            // Soft color patches (meadow rooms)
            SoftPatch(parent, new Vector3(0, 0.02f, 0f), 7f, new Color(0.24f, 0.46f, 0.2f));
            SoftPatch(parent, new Vector3(8f, 0.02f, 8f), 5f, new Color(0.26f, 0.44f, 0.18f));
            SoftPatch(parent, new Vector3(-8f, 0.02f, 9f), 5f, new Color(0.18f, 0.38f, 0.28f));
            SoftPatch(parent, new Vector3(0, 0.02f, 14f), 6f, new Color(0.3f, 0.48f, 0.22f));
            SoftPatch(parent, new Vector3(0, 0.02f, 22.5f), 5.5f, new Color(0.16f, 0.28f, 0.16f));

            // Sanctum plateau — multi-tier
            var plateau = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            plateau.name = "sanctum_plateau";
            plateau.transform.SetParent(parent, false);
            plateau.transform.position = new Vector3(0, 0.06f, 30f);
            plateau.transform.localScale = new Vector3(14f, 0.1f, 14f);
            Object.Destroy(plateau.GetComponent<Collider>());
            plateau.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.28f, 0.5f, 0.24f));

            var plateau2 = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            plateau2.name = "sanctum_inner";
            plateau2.transform.SetParent(parent, false);
            plateau2.transform.position = new Vector3(0, 0.12f, 30f);
            plateau2.transform.localScale = new Vector3(8f, 0.08f, 8f);
            Object.Destroy(plateau2.GetComponent<Collider>());
            plateau2.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.32f, 0.55f, 0.28f));

            // Ring of moss around sanctum
            for (int i = 0; i < 12; i++)
            {
                float a = i / 12f * Mathf.PI * 2f;
                SoftPatch(parent,
                    new Vector3(Mathf.Cos(a) * 7.5f, 0.03f, 30f + Mathf.Sin(a) * 7.5f),
                    1.8f, new Color(0.22f, 0.48f, 0.26f));
            }
        }

        private static void SoftPatch(Transform parent, Vector3 localOrWorld, float size, Color c)
        {
            var p = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            p.name = "soft_patch";
            p.transform.SetParent(parent, false);
            // Treat as local when parented (sites pass local offsets)
            p.transform.localPosition = localOrWorld;
            p.transform.localScale = new Vector3(size, 0.03f, size);
            Object.Destroy(p.GetComponent<Collider>());
            p.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(c);
        }

        private static void BuildHillsAndTerraces(Transform parent)
        {
            // Low hills framing the garden (visual only, no walk blockers on path)
            Vector3[] hills =
            {
                new Vector3(-14f, -0.3f, 2f), new Vector3(14f, -0.3f, 3f),
                new Vector3(-16f, -0.4f, 16f), new Vector3(16f, -0.4f, 18f),
                new Vector3(-12f, -0.35f, 28f), new Vector3(13f, -0.35f, 27f),
                new Vector3(-18f, -0.5f, 8f), new Vector3(18f, -0.5f, 10f),
            };
            for (int i = 0; i < hills.Length; i++)
            {
                var h = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                h.name = "hill";
                h.transform.SetParent(parent, false);
                h.transform.position = hills[i];
                float s = 4.5f + (i % 3) * 1.2f;
                h.transform.localScale = new Vector3(s * 1.6f, s * 0.55f, s * 1.3f);
                Object.Destroy(h.GetComponent<Collider>());
                h.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.18f + (i % 3) * 0.02f, 0.36f, 0.16f));
            }

            // Terraced retaining "walls" of low rock near west spring approach
            for (int i = 0; i < 5; i++)
            {
                var r = SpawnKenney("nat_rock_largeC",
                    new Vector3(-11f + i * 0.3f, 0, 6f + i * 0.9f), i * 25f, 1.1f + (i % 2) * 0.3f);
                if (r != null && ClearOfPath(r.transform.position)) r.transform.SetParent(parent, true);
                else if (r != null) Object.Destroy(r);
            }
        }

        // ─────────────────────────────────────────────
        //  Paths
        // ─────────────────────────────────────────────
        private static void BuildWindingPath(Transform parent, Color accent)
        {
            // Main spine with slight sinuous wobble
            for (int i = 0; i < 28; i++)
            {
                float t = i / 27f;
                float z = -7f + t * 38f;
                float x = Mathf.Sin(t * Mathf.PI * 1.6f) * 0.55f;
                float w = 2.4f + Mathf.Sin(t * 8f) * 0.35f;
                PropUtils.SoftQuad("path_" + i, new Vector3(x, 0.035f, z), new Vector3(w, 1.5f, 1f),
                    new Color(0.38f, 0.3f, 0.16f, 0.62f)).transform.SetParent(parent, true);

                // Pebble edge every other step
                if (i % 2 == 0)
                {
                    var pebble = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                    pebble.name = "pebble";
                    pebble.transform.SetParent(parent, false);
                    pebble.transform.position = new Vector3(x + (i % 4 < 2 ? 1.3f : -1.3f), 0.04f, z);
                    pebble.transform.localScale = Vector3.one * (0.12f + (i % 3) * 0.04f);
                    Object.Destroy(pebble.GetComponent<Collider>());
                    pebble.GetComponent<MeshRenderer>().sharedMaterial =
                        PropUtils.UnlitMat(new Color(0.45f, 0.4f, 0.32f));
                }
            }

            // Fork east to oak grove
            for (int i = 0; i < 8; i++)
            {
                float t = i / 7f;
                PropUtils.SoftQuad("path_e_" + i,
                    new Vector3(t * 7.5f, 0.032f, 5f + t * 2.8f),
                    new Vector3(1.6f, 1.2f, 1f),
                    new Color(0.36f, 0.28f, 0.15f, 0.55f)).transform.SetParent(parent, true);
            }
            // Fork west to spring
            for (int i = 0; i < 8; i++)
            {
                float t = i / 7f;
                PropUtils.SoftQuad("path_w_" + i,
                    new Vector3(-t * 7.5f, 0.032f, 5.2f + t * 3.2f),
                    new Vector3(1.6f, 1.2f, 1f),
                    new Color(0.34f, 0.28f, 0.16f, 0.55f)).transform.SetParent(parent, true);
            }

            // Gold waymarkers along spine
            for (int i = 0; i < 5; i++)
            {
                float z = -4f + i * 6.5f;
                var m = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                m.name = "waymark";
                m.transform.SetParent(parent, false);
                m.transform.position = new Vector3(1.6f * (i % 2 == 0 ? 1 : -1), 0.35f, z);
                m.transform.localScale = new Vector3(0.08f, 0.35f, 0.08f);
                Object.Destroy(m.GetComponent<Collider>());
                m.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.55f, 0.4f, 0.2f));
                var cap = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                cap.transform.SetParent(m.transform, false);
                cap.transform.localPosition = new Vector3(0, 1.1f, 0);
                cap.transform.localScale = Vector3.one * 1.6f;
                Object.Destroy(cap.GetComponent<Collider>());
                cap.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(UIKit.WithA(accent, 0.85f));
            }
        }

        // ─────────────────────────────────────────────
        //  Hedges / walls / rooms
        // ─────────────────────────────────────────────
        private static void BuildHedgeWalls(Transform parent)
        {
            for (int side = -1; side <= 1; side += 2)
            {
                for (int i = 0; i < 16; i++)
                {
                    float z = -6f + i * 2.6f;
                    float x = side * (10.5f + (i % 3) * 0.4f);
                    if (!ClearOfPath(new Vector3(x, 0, z))) continue;

                    var bush = SpawnKenney("nat_plant_bushLarge",
                        new Vector3(x, 0, z), i * 28f, 2.2f + (i % 4) * 0.35f);
                    if (bush != null) bush.transform.SetParent(parent, true);

                    if (i % 2 == 0)
                    {
                        var tree = SpawnKenney(
                            i % 4 == 0 ? "nat_tree_oak" :
                            i % 4 == 2 ? "nat_tree_detailed" : "nat_tree_fat",
                            new Vector3(x + side * 2.2f, 0, z + 0.6f),
                            i * 35f, 4.2f + (i % 5) * 0.55f);
                        if (tree != null) tree.transform.SetParent(parent, true);
                    }

                    // Inner understory
                    if (i % 3 == 1)
                    {
                        var u = SpawnKenney("nat_plant_bushDetailed",
                            new Vector3(x - side * 1.8f, 0, z + 0.4f), i * 15f, 1.5f);
                        if (u != null && ClearOfPath(u.transform.position))
                            u.transform.SetParent(parent, true);
                        else if (u != null) Object.Destroy(u);
                    }
                }
            }
        }

        private static void BuildArborsAndTrellises(Transform parent, Color accent)
        {
            // Living arch mid-path (before flower circle)
            BuildLivingArch(parent, new Vector3(0, 0, 11.5f), accent, 3.2f);
            // Second arch before barrier
            BuildLivingArch(parent, new Vector3(0, 0, 17.5f), accent, 3.0f);
            // Side pergola near gardener (decorative posts)
            for (int i = 0; i < 3; i++)
            {
                float z = 3f + i * 1.2f;
                MakePost(parent, new Vector3(-3.8f, 0, z), 1.8f, accent);
                MakePost(parent, new Vector3(3.8f, 0, z), 1.8f, accent);
            }
            // Vine canopy between posts (soft quads)
            for (int i = 0; i < 3; i++)
            {
                PropUtils.SoftQuad("vine_canopy_" + i,
                    new Vector3(0, 1.75f, 3.2f + i * 1.2f),
                    new Vector3(7.2f, 0.8f, 1f),
                    new Color(0.15f, 0.42f, 0.18f, 0.55f)).transform.SetParent(parent, true);
            }
        }

        private static void BuildLivingArch(Transform parent, Vector3 pos, Color accent, float height)
        {
            var arch = new GameObject("LivingArch");
            arch.transform.SetParent(parent, false);
            arch.transform.position = pos;

            for (int s = -1; s <= 1; s += 2)
            {
                var t = SpawnKenney("nat_tree_thin", new Vector3(s * 1.8f, 0, 0), s * 15f, height + 1.5f);
                if (t != null) t.transform.SetParent(arch.transform, true);
                var b = SpawnKenney("nat_plant_bushDetailed", new Vector3(s * 1.5f, 0, 0.2f), s * 40f, 1.4f);
                if (b != null) b.transform.SetParent(arch.transform, true);
            }
            // Canopy crosspiece
            var bar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            bar.transform.SetParent(arch.transform, false);
            bar.transform.localPosition = new Vector3(0, height, 0);
            bar.transform.localScale = new Vector3(3.8f, 0.35f, 0.7f);
            Object.Destroy(bar.GetComponent<Collider>());
            bar.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.18f, 0.4f, 0.16f));
            // Hanging blooms
            for (int i = -2; i <= 2; i++)
            {
                var fl = SpawnKenney(
                    i % 2 == 0 ? "nat_flower_purpleC" : "nat_flower_yellowB",
                    pos + new Vector3(i * 0.55f, height - 0.5f, 0.15f), i * 20f, 0.4f);
                if (fl != null) fl.transform.SetParent(arch.transform, true);
            }
            PropUtils.PointGlow(arch.transform, new Vector3(0, height * 0.7f, 0), accent, 0.6f, 4f);
        }

        private static void MakePost(Transform parent, Vector3 pos, float h, Color accent)
        {
            var p = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            p.name = "post";
            p.transform.SetParent(parent, false);
            p.transform.position = pos + Vector3.up * (h * 0.5f);
            p.transform.localScale = new Vector3(0.14f, h * 0.5f, 0.14f);
            Object.Destroy(p.GetComponent<Collider>());
            p.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.4f, 0.28f, 0.14f));
            var top = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            top.transform.SetParent(p.transform, false);
            top.transform.localPosition = new Vector3(0, 1.05f, 0);
            top.transform.localScale = new Vector3(1.8f, 0.5f, 1.8f);
            Object.Destroy(top.GetComponent<Collider>());
            top.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(UIKit.WithA(accent, 0.7f));
        }

        // ─────────────────────────────────────────────
        //  Gate / entrance / gardener
        // ─────────────────────────────────────────────
        private static void BuildGateClearing(Transform parent, Color accent)
        {
            var gate = new GameObject("ReturnGate");
            gate.transform.SetParent(parent, false);
            gate.transform.position = new Vector3(0, 0, -8f);

            // Twin ancient oaks
            for (int i = -1; i <= 1; i += 2)
            {
                var t = SpawnKenney("nat_tree_oak", new Vector3(i * 2.6f, 0, 0), i * 18f, 6.2f);
                if (t != null) t.transform.SetParent(gate.transform, true);
                var t2 = SpawnKenney("nat_tree_detailed", new Vector3(i * 3.8f, 0, -1.2f), i * 40f, 4.5f);
                if (t2 != null) t2.transform.SetParent(gate.transform, true);
            }
            // Standing stones framing — clear of center
            var stoneL = SpawnKenney("nat_stone_tallC", new Vector3(-4.8f, 0, -1.2f), 12f, 2.3f);
            if (stoneL != null) stoneL.transform.SetParent(parent, true);
            var stoneR = SpawnKenney("nat_stone_tallC", new Vector3(4.8f, 0, -0.9f), -18f, 2.1f);
            if (stoneR != null) stoneR.transform.SetParent(parent, true);
            var slab = SpawnKenney("nat_stone_largeB", new Vector3(-5.5f, 0, -3.2f), 5f, 2.2f);
            if (slab != null) slab.transform.SetParent(parent, true);
            var slab2 = SpawnKenney("nat_stone_largeB", new Vector3(5.2f, 0, -3.5f), -8f, 1.9f);
            if (slab2 != null) slab2.transform.SetParent(parent, true);

            // Portal orb + outer rings
            var orb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            orb.transform.SetParent(gate.transform, false);
            orb.transform.localPosition = new Vector3(0, 1.6f, 0.4f);
            orb.transform.localScale = Vector3.one * 1.15f;
            Object.Destroy(orb.GetComponent<Collider>());
            orb.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(UIKit.WithA(accent, 0.92f));
            orb.AddComponent<SlowSpin>().degreesPerSecond = 18f;

            var halo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            halo.transform.SetParent(gate.transform, false);
            halo.transform.localPosition = new Vector3(0, 1.6f, 0.4f);
            halo.transform.localRotation = Quaternion.Euler(90, 0, 0);
            halo.transform.localScale = new Vector3(2.2f, 0.04f, 2.2f);
            Object.Destroy(halo.GetComponent<Collider>());
            halo.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(UIKit.WithA(new Color(0.95f, 0.85f, 0.35f), 0.55f));
            halo.AddComponent<SlowSpin>().degreesPerSecond = -28f;

            PropUtils.PointGlow(gate.transform, new Vector3(0, 1.6f, 0.4f), accent, 1.7f, 7f);
            PropUtils.GoldRing(gate.transform, 1.6f, 0.04f, UIKit.WithA(accent, 0.6f), 0.05f);

            var di = gate.AddComponent<DestInteractable>();
            di.action = DestAction.ReturnHut;
            di.label = "Return to Hut";
            di.accent = accent;
            di.interactRadius = 3f;

            // Welcome moss carpet
            SoftPatch(parent, new Vector3(0, 0.025f, -5.5f), 4.5f, new Color(0.26f, 0.5f, 0.26f));
        }

        private static void BuildEntranceMeadow(Transform parent, Color accent)
        {
            string[] fl = { "nat_flower_redA", "nat_flower_yellowB", "nat_flower_purpleC", "nat_grass_leafsLarge" };
            // Wildflower drifts left/right of spawn
            for (int bank = -1; bank <= 1; bank += 2)
            {
                for (int i = 0; i < 18; i++)
                {
                    float x = bank * (2.8f + (i % 5) * 0.55f + (i % 3) * 0.2f);
                    float z = -6.5f + (i / 5f) * 1.1f + (i % 4) * 0.35f;
                    if (Mathf.Abs(x) < 1.4f) continue;
                    var f = SpawnKenney(fl[i % fl.Length],
                        new Vector3(x, 0, z), i * 37f, 0.45f + (i % 4) * 0.12f);
                    if (f != null) f.transform.SetParent(parent, true);
                }
            }
            // Fallen log benches framing entrance
            var log = SpawnKenney("nat_log_stack", new Vector3(-3.8f, 0, -3.5f), 95f, 2.4f);
            if (log != null) log.transform.SetParent(parent, true);
            var log2 = SpawnKenney("nat_log_stack", new Vector3(3.9f, 0, -3.2f), 80f, 2.2f);
            if (log2 != null) log2.transform.SetParent(parent, true);
        }

        private static void BuildGuidePlatform(Transform parent, Vector3 pos, Color accent)
        {
            var pad = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            pad.name = "guide_pad";
            pad.transform.SetParent(parent, false);
            pad.transform.position = pos + Vector3.up * 0.02f;
            pad.transform.localScale = new Vector3(4.8f, 0.04f, 4.8f);
            Object.Destroy(pad.GetComponent<Collider>());
            pad.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.25f, 0.5f, 0.26f));

            // Concentric rings
            for (int r = 0; r < 2; r++)
            {
                var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                ring.transform.SetParent(parent, false);
                ring.transform.position = pos + Vector3.up * (0.04f + r * 0.02f);
                float s = 3.2f - r * 1.1f;
                ring.transform.localScale = new Vector3(s, 0.02f, s);
                Object.Destroy(ring.GetComponent<Collider>());
                ring.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(UIKit.WithA(accent, 0.35f + r * 0.15f));
            }

            // Flower crown at edge only
            string[] fl = { "nat_flower_yellowB", "nat_flower_purpleC", "nat_flower_redA" };
            for (int i = 0; i < 10; i++)
            {
                float a = i / 10f * Mathf.PI * 2f;
                var f = SpawnKenney(fl[i % fl.Length],
                    pos + new Vector3(Mathf.Cos(a) * 2.25f, 0, Mathf.Sin(a) * 2.25f),
                    i * 40f, 0.5f + (i % 3) * 0.1f);
                if (f != null) f.transform.SetParent(parent, true);
            }
            // Small lamp posts either side of gardener
            MakePost(parent, pos + new Vector3(-2.4f, 0, -1.2f), 1.4f, accent);
            MakePost(parent, pos + new Vector3(2.4f, 0, -1.2f), 1.4f, accent);
            PropUtils.PointGlow(parent, pos + new Vector3(0, 2.2f, 0), new Color(0.9f, 1f, 0.7f), 0.9f, 5f);
        }

        private static void BuildGardenBeds(Transform parent, Color accent)
        {
            string[] flowers = {
                "nat_flower_redA", "nat_flower_yellowB", "nat_flower_purpleC",
                "nat_mushroom_redGroup", "nat_grass_leafsLarge"
            };

            // Formal beds along both sides of mid-path
            for (int bed = 0; bed < 10; bed++)
            {
                float z = 1.5f + bed * 1.7f;
                float x = (bed % 2 == 0 ? -1f : 1f) * (4.2f + (bed % 3) * 0.35f);
                // Bed soil patch
                SoftPatch(parent, new Vector3(x, 0.028f, z), 1.6f, new Color(0.28f, 0.22f, 0.12f));
                for (int f = 0; f < 7; f++)
                {
                    var fl = SpawnKenney(flowers[f % flowers.Length],
                        new Vector3(x + (f - 3) * 0.32f, 0, z + ((f % 3) - 1) * 0.28f),
                        f * 40f + bed * 10f, 0.5f + (f % 3) * 0.12f);
                    if (fl != null) fl.transform.SetParent(parent, true);
                }
            }

            // Potted accents near path edges
            for (int i = 0; i < 6; i++)
            {
                float z = 2f + i * 2.5f;
                float x = (i % 2 == 0 ? -1f : 1f) * 3.2f;
                var pot = SpawnKenney("fur_pottedPlant", new Vector3(x, 0, z), i * 20f, 0.85f);
                if (pot != null && ClearOfPath(new Vector3(x, 0, z)))
                    pot.transform.SetParent(parent, true);
                else if (pot != null) Object.Destroy(pot);
            }

            // Benches
            var log = SpawnKenney("nat_log_stack", new Vector3(-3.6f, 0, 2.2f), 90f, 2.3f);
            if (log != null) log.transform.SetParent(parent, true);
            var log2 = SpawnKenney("nat_log_stack", new Vector3(3.6f, 0, 2.4f), 85f, 2.1f);
            if (log2 != null) log2.transform.SetParent(parent, true);
            var bench = SpawnKenney("fur_bench", new Vector3(-4.5f, 0, 12f), 90f, 1.4f);
            if (bench != null) bench.transform.SetParent(parent, true);
            var bench2 = SpawnKenney("fur_bench", new Vector3(4.5f, 0, 12.2f), -90f, 1.4f);
            if (bench2 != null) bench2.transform.SetParent(parent, true);
        }

        // ─────────────────────────────────────────────
        //  Water
        // ─────────────────────────────────────────────
        private static void BuildStreamAndBridge(Transform parent, Color accent)
        {
            // Meandering stream across mid-garden
            for (int i = 0; i < 16; i++)
            {
                float t = i / 15f;
                float x = -10f + t * 20f;
                float z = 11.2f + Mathf.Sin(t * Mathf.PI * 2.2f) * 1.1f + Mathf.Cos(t * 5f) * 0.25f;
                var w = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                w.name = "stream";
                w.transform.SetParent(parent, false);
                w.transform.position = new Vector3(x, 0.04f, z);
                float s = 1.5f + Mathf.Sin(t * 9f) * 0.35f;
                w.transform.localScale = new Vector3(s, 0.05f, s);
                Object.Destroy(w.GetComponent<Collider>());
                w.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.22f + t * 0.05f, 0.48f, 0.72f + Mathf.Sin(t * 6f) * 0.05f));
            }

            // Banks with stones & reeds
            for (int i = 0; i < 10; i++)
            {
                float t = i / 9f;
                float x = -9f + t * 18f;
                float z = 11.2f + Mathf.Sin(t * Mathf.PI * 2.2f) * 1.1f;
                float side = i % 2 == 0 ? 1.4f : -1.4f;
                var rock = SpawnKenney(i % 3 == 0 ? "nat_rock_tallA" : "nat_rock_largeC",
                    new Vector3(x, 0, z + side), i * 30f, 0.7f + (i % 3) * 0.25f);
                if (rock != null) rock.transform.SetParent(parent, true);
                if (i % 2 == 0)
                {
                    var reed = SpawnKenney("nat_grass_leafsLarge",
                        new Vector3(x + 0.4f, 0, z + side * 0.7f), i * 15f, 0.7f);
                    if (reed != null) reed.transform.SetParent(parent, true);
                }
            }

            // Wooden bridge over the path crossing
            var bridge = new GameObject("Bridge");
            bridge.transform.SetParent(parent, false);
            bridge.transform.position = new Vector3(0, 0.12f, 11.5f);
            var deck = GameObject.CreatePrimitive(PrimitiveType.Cube);
            deck.transform.SetParent(bridge.transform, false);
            deck.transform.localPosition = Vector3.zero;
            deck.transform.localScale = new Vector3(2.6f, 0.12f, 3.4f);
            Object.Destroy(deck.GetComponent<Collider>());
            deck.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.42f, 0.28f, 0.14f));
            // Rails
            for (int s = -1; s <= 1; s += 2)
            {
                var rail = GameObject.CreatePrimitive(PrimitiveType.Cube);
                rail.transform.SetParent(bridge.transform, false);
                rail.transform.localPosition = new Vector3(s * 1.2f, 0.35f, 0);
                rail.transform.localScale = new Vector3(0.1f, 0.55f, 3.2f);
                Object.Destroy(rail.GetComponent<Collider>());
                rail.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.35f, 0.22f, 0.12f));
            }
            // Plank lines
            for (int i = 0; i < 5; i++)
            {
                var pl = GameObject.CreatePrimitive(PrimitiveType.Cube);
                pl.transform.SetParent(bridge.transform, false);
                pl.transform.localPosition = new Vector3(0, 0.07f, -1.2f + i * 0.6f);
                pl.transform.localScale = new Vector3(2.5f, 0.04f, 0.12f);
                Object.Destroy(pl.GetComponent<Collider>());
                pl.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.48f, 0.32f, 0.16f));
            }
            PropUtils.PointGlow(bridge.transform, new Vector3(0, 0.8f, 0), new Color(0.5f, 0.85f, 1f), 0.7f, 4f);
        }

        // ─────────────────────────────────────────────
        //  Extra set dressing
        // ─────────────────────────────────────────────
        private static void BuildStandingStones(Transform parent, Color accent)
        {
            // Circle of stones around flower site approach
            for (int i = 0; i < 7; i++)
            {
                float a = i / 7f * Mathf.PI * 2f + 0.2f;
                float r = 3.4f;
                var s = SpawnKenney("nat_stone_tallC",
                    new Vector3(Mathf.Cos(a) * r, 0, 14f + Mathf.Sin(a) * r),
                    i * 25f, 1.4f + (i % 3) * 0.35f);
                if (s != null) s.transform.SetParent(parent, true);
            }
            // Lone menhirs at far corners of garden
            var m1 = SpawnKenney("nat_stone_tallC", new Vector3(-9f, 0, 18f), 10f, 2.8f);
            if (m1 != null) m1.transform.SetParent(parent, true);
            var m2 = SpawnKenney("nat_stone_tallC", new Vector3(9.5f, 0, 17.5f), -20f, 2.6f);
            if (m2 != null) m2.transform.SetParent(parent, true);
            PropUtils.PointGlow(parent, new Vector3(-9f, 2f, 18f), UIKit.WithA(accent, 0.6f), 0.5f, 4f);
            PropUtils.PointGlow(parent, new Vector3(9.5f, 2f, 17.5f), UIKit.WithA(accent, 0.6f), 0.5f, 4f);
        }

        private static void BuildMushroomGlades(Transform parent)
        {
            Vector3[] centers =
            {
                new Vector3(-6f, 0, 3f), new Vector3(6.5f, 0, 4f),
                new Vector3(-5f, 0, 16f), new Vector3(5.5f, 0, 15.5f),
                new Vector3(-3f, 0, 25f), new Vector3(3.5f, 0, 26f),
            };
            for (int c = 0; c < centers.Length; c++)
            {
                if (!ClearOfPath(centers[c])) continue;
                for (int i = 0; i < 4; i++)
                {
                    float a = i / 4f * Mathf.PI * 2f;
                    var m = SpawnKenney("nat_mushroom_redGroup",
                        centers[c] + new Vector3(Mathf.Cos(a) * 0.6f, 0, Mathf.Sin(a) * 0.6f),
                        i * 40f, 0.55f + (i % 2) * 0.15f);
                    if (m != null) m.transform.SetParent(parent, true);
                }
            }
        }

        private static void BuildAmbientWildlifeProps(Transform parent)
        {
            // Small trees as "saplings" near path edges
            for (int i = 0; i < 14; i++)
            {
                float z = -5f + i * 2.6f;
                float x = (i % 2 == 0 ? -1f : 1f) * (5.5f + (i % 3) * 0.8f);
                if (!ClearOfPath(new Vector3(x, 0, z))) continue;
                var t = SpawnKenney(i % 2 == 0 ? "nat_tree_small" : "nat_tree_thin",
                    new Vector3(x, 0, z), i * 22f, 1.8f + (i % 4) * 0.4f);
                if (t != null) t.transform.SetParent(parent, true);
            }
        }

        private static void BuildFloatingMotes(Transform parent, Color accent)
        {
            // Soft floating "seed lights" — pure visual density
            for (int i = 0; i < 22; i++)
            {
                float ang = i / 22f * Mathf.PI * 2f;
                float r = 4f + (i % 5) * 2.2f;
                float x = Mathf.Cos(ang) * r * 0.7f;
                float z = 8f + Mathf.Sin(ang) * r + (i % 4) * 1.5f;
                var m = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                m.name = "mote";
                m.transform.SetParent(parent, false);
                m.transform.position = new Vector3(x, 1.2f + (i % 5) * 0.35f, z);
                m.transform.localScale = Vector3.one * (0.08f + (i % 3) * 0.03f);
                Object.Destroy(m.GetComponent<Collider>());
                bool gold = i % 3 == 0;
                m.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(
                    gold ? new Color(0.98f, 0.88f, 0.4f) : UIKit.WithA(accent, 0.9f));
                m.AddComponent<SlowSpin>().degreesPerSecond = 20f + i * 3f;
            }
        }

        private static void BuildCanopyScatter(Transform parent)
        {
            // Overhead leaf disks for depth (cheap canopy feel)
            for (int i = 0; i < 16; i++)
            {
                float ang = i / 16f * Mathf.PI * 2f;
                float r = 8f + (i % 4) * 3f;
                float x = Mathf.Cos(ang) * r;
                float z = 14f + Mathf.Sin(ang) * r * 0.8f;
                if (Mathf.Abs(x) < 3f && z > 8f && z < 18f) continue; // keep center open
                var c = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                c.name = "canopy";
                c.transform.SetParent(parent, false);
                c.transform.position = new Vector3(x, 4.5f + (i % 3) * 0.6f, z);
                c.transform.localScale = new Vector3(3f + (i % 3), 0.08f, 3f + (i % 2));
                Object.Destroy(c.GetComponent<Collider>());
                c.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.12f, 0.32f + (i % 3) * 0.04f, 0.14f, 0.75f));
            }
        }

        // ─────────────────────────────────────────────
        //  Sites / barrier / guardian / relic
        // ─────────────────────────────────────────────
        private static GameObject BuildTendTree(Transform parent, Vector3 pos, Color accent, string siteId, string label)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.SetParent(parent, false);
            root.transform.position = pos;

            var tree = SpawnKenney("nat_tree_oak", Vector3.zero, 25f, 6.2f);
            if (tree != null)
            {
                tree.transform.SetParent(root.transform, false);
                tree.transform.localPosition = Vector3.zero;
            }
            // Companion trees
            var t2 = SpawnKenney("nat_tree_small", new Vector3(2.2f, 0, 1.2f), 40f, 2.8f);
            if (t2 != null) t2.transform.SetParent(root.transform, true);
            var t3 = SpawnKenney("nat_tree_thin", new Vector3(-1.8f, 0, 1.5f), -30f, 3.2f);
            if (t3 != null) t3.transform.SetParent(root.transform, true);
            // Root ring flowers
            for (int i = 0; i < 8; i++)
            {
                float a = i / 8f * Mathf.PI * 2f;
                var f = SpawnKenney("nat_flower_yellowB",
                    new Vector3(Mathf.Cos(a) * 1.6f, 0, Mathf.Sin(a) * 1.6f), i * 20f, 0.55f);
                if (f != null) f.transform.SetParent(root.transform, true);
            }
            SoftPatch(root.transform, new Vector3(0, 0.02f, 0), 3.5f, new Color(0.24f, 0.42f, 0.18f));
            PropUtils.GoldRing(root.transform, 1.2f, 0.04f, UIKit.WithA(accent, 0.75f), 0.05f);
            PropUtils.PointGlow(root.transform, new Vector3(0, 3f, 0), new Color(0.7f, 1f, 0.5f), 0.8f, 5f);
            AddSite(root, siteId, label, accent);
            return root;
        }

        private static GameObject BuildSpring(Transform parent, Vector3 pos, Color accent, string siteId, string label)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.SetParent(parent, false);
            root.transform.position = pos;

            // Rock basin
            for (int i = 0; i < 5; i++)
            {
                float a = i / 5f * Mathf.PI * 2f;
                var rocks = SpawnKenney(i % 2 == 0 ? "nat_rock_largeA" : "nat_rock_largeC",
                    new Vector3(Mathf.Cos(a) * 1.3f, 0, Mathf.Sin(a) * 1.3f), i * 40f, 1.2f + (i % 2) * 0.3f);
                if (rocks != null) rocks.transform.SetParent(root.transform, true);
            }
            // Nested pools
            for (int i = 0; i < 3; i++)
            {
                var pool = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pool.transform.SetParent(root.transform, false);
                pool.transform.localPosition = new Vector3(0, 0.05f + i * 0.02f, 0);
                float s = 2.4f - i * 0.55f;
                pool.transform.localScale = new Vector3(s, 0.06f, s);
                Object.Destroy(pool.GetComponent<Collider>());
                pool.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.18f + i * 0.05f, 0.5f + i * 0.08f, 0.78f));
            }
            // Spring spout
            var spout = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            spout.transform.SetParent(root.transform, false);
            spout.transform.localPosition = new Vector3(0, 0.9f, 0);
            spout.transform.localScale = new Vector3(0.12f, 0.7f, 0.12f);
            Object.Destroy(spout.GetComponent<Collider>());
            spout.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.45f, 0.8f, 1f));
            var droplet = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            droplet.transform.SetParent(root.transform, false);
            droplet.transform.localPosition = new Vector3(0, 1.55f, 0);
            droplet.transform.localScale = Vector3.one * 0.22f;
            Object.Destroy(droplet.GetComponent<Collider>());
            droplet.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.6f, 0.9f, 1f));
            droplet.AddComponent<SlowSpin>().degreesPerSecond = 40f;

            var fern = SpawnKenney("nat_grass_leafsLarge", new Vector3(1.5f, 0, 0.8f), 20f, 0.9f);
            if (fern != null) fern.transform.SetParent(root.transform, true);
            var fern2 = SpawnKenney("nat_grass_leafsLarge", new Vector3(-1.3f, 0, -0.6f), -30f, 0.85f);
            if (fern2 != null) fern2.transform.SetParent(root.transform, true);

            PropUtils.PointGlow(root.transform, new Vector3(0, 0.6f, 0), new Color(0.4f, 0.85f, 1f), 1.2f, 5f);
            PropUtils.GoldRing(root.transform, 1.5f, 0.04f, UIKit.WithA(accent, 0.7f), 0.05f);
            AddSite(root, siteId, label, accent);
            return root;
        }

        private static GameObject BuildFlowerCircle(Transform parent, Vector3 pos, Color accent, string siteId, string label)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.SetParent(parent, false);
            root.transform.position = pos;

            SoftPatch(root.transform, new Vector3(0, 0.02f, 0), 4f, new Color(0.32f, 0.48f, 0.22f));

            string[] fl = { "nat_flower_redA", "nat_flower_yellowB", "nat_flower_purpleC" };
            // Double ring of flowers
            for (int ring = 0; ring < 2; ring++)
            {
                int n = ring == 0 ? 12 : 8;
                float rad = ring == 0 ? 1.9f : 1.0f;
                for (int i = 0; i < n; i++)
                {
                    float a = i / (float)n * Mathf.PI * 2f + ring * 0.2f;
                    var f = SpawnKenney(fl[(i + ring) % fl.Length],
                        new Vector3(Mathf.Cos(a) * rad, 0, Mathf.Sin(a) * rad),
                        i * 28f, 0.65f + ring * 0.1f);
                    if (f != null) f.transform.SetParent(root.transform, true);
                }
            }
            // Center bloom pedestal
            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.transform.SetParent(root.transform, false);
            core.transform.localPosition = new Vector3(0, 0.35f, 0);
            core.transform.localScale = Vector3.one * 0.45f;
            Object.Destroy(core.GetComponent<Collider>());
            core.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.95f, 0.55f, 0.75f));
            core.AddComponent<SlowSpin>().degreesPerSecond = 22f;

            PropUtils.GoldRing(root.transform, 2.1f, 0.04f, UIKit.WithA(accent, 0.75f), 0.05f);
            PropUtils.GoldRing(root.transform, 1.2f, 0.05f, UIKit.WithA(new Color(0.95f, 0.7f, 0.3f), 0.5f), 0.03f);
            PropUtils.PointGlow(root.transform, new Vector3(0, 1f, 0), new Color(1f, 0.7f, 0.85f), 0.9f, 4f);
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

            // Dense hedge wall with layered depth
            for (int row = 0; row < 2; row++)
            {
                for (int i = -6; i <= 6; i++)
                {
                    if (i == 0 || i == -1 || i == 1) continue; // center gap for crystal film
                    var b = SpawnKenney(row == 0 ? "nat_plant_bushLarge" : "nat_plant_bushDetailed",
                        new Vector3(i * 1.15f, 0, row * 0.7f), i * 18f + row * 10f,
                        2.5f + (Mathf.Abs(i) % 3) * 0.25f + row * 0.3f);
                    if (b != null) b.transform.SetParent(root.transform, true);
                }
            }
            // Trees behind hedge
            for (int i = -3; i <= 3; i++)
            {
                if (Mathf.Abs(i) < 1) continue;
                var t = SpawnKenney("nat_tree_pineTallA",
                    new Vector3(i * 2.2f, 0, 1.5f), i * 15f, 5f + Mathf.Abs(i) * 0.3f);
                if (t != null) t.transform.SetParent(root.transform, true);
            }

            // Living crystal film across the gate
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.transform.SetParent(root.transform, false);
            wall.transform.localPosition = new Vector3(0, 1.5f, 0);
            wall.transform.localScale = new Vector3(3.6f, 3.0f, 0.35f);
            wall.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.12f, 0.38f, 0.2f));
            // Inner shimmer
            var film = GameObject.CreatePrimitive(PrimitiveType.Cube);
            film.transform.SetParent(root.transform, false);
            film.transform.localPosition = new Vector3(0, 1.5f, 0.05f);
            film.transform.localScale = new Vector3(3.0f, 2.5f, 0.12f);
            Object.Destroy(film.GetComponent<Collider>());
            film.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(UIKit.WithA(accent, 0.55f));
            film.AddComponent<SlowSpin>().degreesPerSecond = 8f;

            PropUtils.PointGlow(root.transform, new Vector3(0, 1.8f, 0), accent, 1.0f, 6f);
            return root;
        }

        private static GameObject BuildGuardian(Transform parent, Vector3 pos, Color accent)
        {
            var root = new GameObject("Guardian");
            root.transform.SetParent(parent, false);
            root.transform.position = pos;

            SoftPatch(root.transform, new Vector3(0, 0.02f, 0), 5f, new Color(0.14f, 0.24f, 0.14f));

            // Stone cairn base
            var baseR = SpawnKenney("nat_rock_largeA", Vector3.zero, 0, 2.4f);
            if (baseR != null) baseR.transform.SetParent(root.transform, true);
            var base2 = SpawnKenney("nat_rock_largeC", new Vector3(0.8f, 0, -0.5f), 40f, 1.6f);
            if (base2 != null) base2.transform.SetParent(root.transform, true);
            var base3 = SpawnKenney("nat_rock_tallA", new Vector3(-0.9f, 0, 0.4f), -25f, 1.8f);
            if (base3 != null) base3.transform.SetParent(root.transform, true);

            // Layered body
            for (int i = 0; i < 3; i++)
            {
                var body = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                body.transform.SetParent(root.transform, false);
                body.transform.localPosition = new Vector3(0, 1.4f + i * 0.65f, 0);
                float s = 1.5f - i * 0.28f;
                body.transform.localScale = new Vector3(s, s * 0.9f, s);
                Object.Destroy(body.GetComponent<Collider>());
                body.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.1f + i * 0.03f, 0.16f + i * 0.02f, 0.1f));
                if (i == 1) body.AddComponent<SlowSpin>().degreesPerSecond = 14f;
            }

            // Glowing eye
            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.transform.SetParent(root.transform, false);
            eye.transform.localPosition = new Vector3(0, 2.4f, 0.75f);
            eye.transform.localScale = Vector3.one * 0.38f;
            Object.Destroy(eye.GetComponent<Collider>());
            eye.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(accent);

            // Orbiting shards
            for (int i = 0; i < 4; i++)
            {
                float a = i / 4f * Mathf.PI * 2f;
                var shard = GameObject.CreatePrimitive(PrimitiveType.Cube);
                shard.transform.SetParent(root.transform, false);
                shard.transform.localPosition = new Vector3(Mathf.Cos(a) * 1.6f, 2.2f, Mathf.Sin(a) * 1.6f);
                shard.transform.localScale = new Vector3(0.18f, 0.5f, 0.12f);
                shard.transform.localRotation = Quaternion.Euler(20, i * 45f, 15);
                Object.Destroy(shard.GetComponent<Collider>());
                shard.GetComponent<MeshRenderer>().sharedMaterial =
                    PropUtils.UnlitMat(new Color(0.2f, 0.45f, 0.25f));
                shard.AddComponent<SlowSpin>().degreesPerSecond = 30f + i * 5f;
            }

            PropUtils.PointGlow(root.transform, new Vector3(0, 2.4f, 0.5f), accent, 1.8f, 8f);
            PropUtils.GoldRing(root.transform, 2.0f, 0.04f, UIKit.WithA(new Color(0.3f, 0.7f, 0.4f), 0.5f), 0.05f);

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

            // Central colossus + satellites
            var tree = SpawnKenney("nat_tree_detailed", Vector3.zero, 0, 9.5f);
            if (tree != null) tree.transform.SetParent(root.transform, true);
            var oak = SpawnKenney("nat_tree_oak", new Vector3(2.8f, 0, 1.2f), 40f, 5.5f);
            if (oak != null) oak.transform.SetParent(root.transform, true);
            var oak2 = SpawnKenney("nat_tree_oak", new Vector3(-3.0f, 0, 0.6f), -30f, 6f);
            if (oak2 != null) oak2.transform.SetParent(root.transform, true);
            var pine = SpawnKenney("nat_tree_pineRoundC", new Vector3(1.5f, 0, -2.5f), 15f, 4.5f);
            if (pine != null) pine.transform.SetParent(root.transform, true);
            var pine2 = SpawnKenney("nat_tree_pineTallA", new Vector3(-2f, 0, -2.2f), -20f, 5.5f);
            if (pine2 != null) pine2.transform.SetParent(root.transform, true);

            // Root mounds
            for (int i = 0; i < 6; i++)
            {
                float a = i / 6f * Mathf.PI * 2f;
                var m = SpawnKenney("nat_rock_largeC",
                    new Vector3(Mathf.Cos(a) * 2.4f, 0, Mathf.Sin(a) * 2.4f + 0.5f),
                    i * 30f, 1.0f);
                if (m != null) m.transform.SetParent(root.transform, true);
            }

            // Flower carpet on plateau
            string[] fl = { "nat_flower_yellowB", "nat_flower_purpleC", "nat_flower_redA" };
            for (int i = 0; i < 16; i++)
            {
                float a = i / 16f * Mathf.PI * 2f;
                var f = SpawnKenney(fl[i % fl.Length],
                    new Vector3(Mathf.Cos(a) * 4.5f, 0, Mathf.Sin(a) * 4.5f),
                    i * 22f, 0.55f);
                if (f != null) f.transform.SetParent(root.transform, true);
            }

            // Relic seed — multi-layer
            bool owned = DestinationManager.HasRelic(Id);
            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.transform.SetParent(root.transform, false);
            core.transform.localPosition = new Vector3(0, 1.0f, 1.3f);
            core.transform.localScale = Vector3.one * 0.55f;
            Object.Destroy(core.GetComponent<Collider>());
            core.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(owned ? new Color(0.4f, 0.4f, 0.4f) : new Color(0.98f, 0.88f, 0.32f));
            if (!owned) core.AddComponent<SlowSpin>().degreesPerSecond = 35f;

            var shell = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            shell.transform.SetParent(root.transform, false);
            shell.transform.localPosition = new Vector3(0, 1.0f, 1.3f);
            shell.transform.localScale = Vector3.one * 0.85f;
            Object.Destroy(shell.GetComponent<Collider>());
            shell.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(UIKit.WithA(owned ? new Color(0.3f, 0.3f, 0.3f) : accent, 0.35f));
            if (!owned) shell.AddComponent<SlowSpin>().degreesPerSecond = -18f;

            PropUtils.PointGlow(root.transform, new Vector3(0, 1.1f, 1.3f), new Color(1f, 0.9f, 0.4f), 2.0f, 7f);
            PropUtils.GoldRing(root.transform, 2.4f, 0.05f, UIKit.WithA(accent, 0.85f), 0.07f);
            PropUtils.GoldRing(root.transform, 3.5f, 0.04f, UIKit.WithA(new Color(0.95f, 0.8f, 0.3f), 0.4f), 0.04f);

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
            string[] trees = {
                "nat_tree_oak", "nat_tree_detailed", "nat_tree_default", "nat_tree_fat",
                "nat_tree_pineTallA", "nat_tree_pineRoundC", "nat_plant_bushLarge",
                "nat_tree_thin", "nat_tree_small"
            };

            // Outer dense ring
            for (int i = 0; i < 64; i++)
            {
                float ang = (i / 64f) * Mathf.PI * 2f;
                float r = 24f + (i % 5) * 2.2f;
                float x = Mathf.Cos(ang) * r;
                float z = 14f + Mathf.Sin(ang) * r;
                if (z < -2f && Mathf.Abs(x) < 4.5f) continue;
                if (!ClearOfPath(new Vector3(x, 0, z))) continue;
                var t = SpawnKenney(trees[i % trees.Length], new Vector3(x, 0, z), i * 17f,
                    3.8f + (i % 6) * 0.7f);
                if (t != null) t.transform.SetParent(parent, true);
            }

            // Mid ring denser understory
            for (int i = 0; i < 40; i++)
            {
                float ang = (i / 40f) * Mathf.PI * 2f + 0.15f;
                float r = 17f + (i % 4) * 1.4f;
                float x = Mathf.Cos(ang) * r;
                float z = 14f + Mathf.Sin(ang) * r;
                if (!ClearOfPath(new Vector3(x, 0, z))) continue;
                var b = SpawnKenney(i % 2 == 0 ? "nat_plant_bushDetailed" : "nat_plant_bushLarge",
                    new Vector3(x, 0, z), i * 20f, 1.6f + (i % 3) * 0.3f);
                if (b != null) b.transform.SetParent(parent, true);
            }

            // Deep background pines (far ring)
            for (int i = 0; i < 28; i++)
            {
                float ang = (i / 28f) * Mathf.PI * 2f + 0.05f;
                float r = 32f + (i % 3) * 2f;
                float x = Mathf.Cos(ang) * r;
                float z = 14f + Mathf.Sin(ang) * r;
                var t = SpawnKenney(i % 2 == 0 ? "nat_tree_pineTallA" : "nat_tree_pineRoundC",
                    new Vector3(x, 0, z), i * 12f, 6f + (i % 4) * 0.8f);
                if (t != null) t.transform.SetParent(parent, true);
            }
        }

        // ─────────────────────────────────────────────
        //  Helpers
        // ─────────────────────────────────────────────
        private static bool ClearOfPath(Vector3 p)
        {
            if (Vector3.Distance(new Vector3(p.x, 0, p.z), GuideClear) < GuideClearR) return false;
            // Keep main corridor open
            if (Mathf.Abs(p.x) < 1.6f && p.z > -7f && p.z < 32f) return false;
            foreach (var c in PathClear)
            {
                if (Vector3.Distance(new Vector3(p.x, 0, p.z), c) < 2.8f) return false;
            }
            return true;
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
