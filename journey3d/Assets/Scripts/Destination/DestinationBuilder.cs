using UnityEngine;

namespace Journey3D
{
    /// Multi-beat enterable zones: gate → guide → 3 sites → guardian → relic → return.
    public static class DestinationBuilder
    {
        public static GameObject Build(DestinationDef def, Transform player)
        {
            // Eden gets a full low-poly garden level (not sparse text markers)
            if (def != null && def.id == "eden")
                return EdenLevel.Build(def, player);

            var root = new GameObject("Dest_" + def.id);
            var accent = UIKit.Hex(def.accent);
            var run = root.AddComponent<DestinationRun>();

            ThemeWorld(def.id, accent);

            // Ground
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "ground";
            ground.transform.SetParent(root.transform, false);
            ground.transform.position = new Vector3(0, -0.5f, 0);
            ground.transform.localScale = new Vector3(100f, 1f, 120f);
            Object.Destroy(ground.GetComponent<Collider>());
            ground.AddComponent<BoxCollider>().size = Vector3.one;
            ground.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(GroundFor(def.id));

            // Path corridor north (deeper map)
            BuildPath(root.transform, accent);
            ScatterTheme(root.transform, def.id, accent);

            // —— BEAT 0: Return gate (south spawn) ——
            var gate = BuildReturnGate(accent, new Vector3(0, 0, -8f));
            gate.transform.SetParent(root.transform, true);

            // —— BEAT 1: Guide ——
            var guide = SpawnGuide(def, new Vector3(0, 0, 2f), player);
            DestInteractable guideDi = null;
            if (guide != null)
            {
                guide.transform.SetParent(root.transform, true);
                guideDi = guide.AddComponent<DestInteractable>();
                guideDi.action = DestAction.SpeakGuide;
                guideDi.destId = def.id;
                guideDi.label = def.guide;
                guideDi.accent = accent;
                guideDi.interactRadius = 3.2f;
            }

            // —— BEAT 2: Three site tasks (spread) ——
            var sites = SiteDefs(def.id);
            for (int i = 0; i < sites.Length; i++)
            {
                var s = sites[i];
                var node = BuildSite(def.id, s.id, s.label, s.pos, accent, s.kind);
                node.transform.SetParent(root.transform, true);
            }

            // —— BEAT 3: Guardian + barrier before relic ——
            var barrier = BuildBarrier(new Vector3(0, 0, 14f), accent);
            barrier.transform.SetParent(root.transform, true);

            var guardian = BuildGuardian(def.id, accent, new Vector3(0, 0, 12.5f));
            guardian.transform.SetParent(root.transform, true);
            var guardDi = guardian.GetComponent<DestInteractable>();

            // —— BEAT 4: Relic (north, behind barrier) ——
            var relic = BuildRelic(def.id, accent, new Vector3(0, 0, 18f));
            relic.transform.SetParent(root.transform, true);
            var relicDi = relic.GetComponent<DestInteractable>();

            // No floating world-space title text — place is told by geometry + HUD

            // Key light
            var light = new GameObject("dest_key");
            light.transform.SetParent(root.transform, false);
            light.transform.position = new Vector3(3f, 6f, 8f);
            var l = light.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = accent;
            l.intensity = 1.8f;
            l.range = 28f;

            run.Bind(def.id, accent, relicDi, guardDi, barrier);

            // Spawn player at gate
            if (player != null)
            {
                var cc = player.GetComponent<CharacterController>();
                if (cc != null) cc.enabled = false;
                player.position = new Vector3(0, 0.15f, -6f);
                player.rotation = Quaternion.Euler(0, 0, 0);
                if (cc != null) cc.enabled = true;
            }

            return root;
        }

        private struct SiteDef
        {
            public string id, label, kind;
            public Vector3 pos;
        }

        private static SiteDef[] SiteDefs(string destId) => destId switch
        {
            "eden" => new[]
            {
                new SiteDef { id = "a", label = "Tend the east tree", kind = "tree", pos = new Vector3(6.5f, 0, 5f) },
                new SiteDef { id = "b", label = "Water the spring", kind = "spring", pos = new Vector3(-6.5f, 0, 6f) },
                new SiteDef { id = "c", label = "Name the first flower", kind = "flower", pos = new Vector3(0, 0, 9f) },
            },
            "fair" => new[]
            {
                new SiteDef { id = "a", label = "Light the midway lamp", kind = "lamp", pos = new Vector3(7f, 0, 5f) },
                new SiteDef { id = "b", label = "Find the ticket booth", kind = "booth", pos = new Vector3(-7f, 0, 6.5f) },
                new SiteDef { id = "c", label = "Ring the fair bell", kind = "bell", pos = new Vector3(1f, 0, 9.5f) },
            },
            "giza" => new[]
            {
                new SiteDef { id = "a", label = "Align the east stone", kind = "stone", pos = new Vector3(7f, 0, 5f) },
                new SiteDef { id = "b", label = "Align the west stone", kind = "stone", pos = new Vector3(-7f, 0, 5.5f) },
                new SiteDef { id = "c", label = "Touch the engine core", kind = "core", pos = new Vector3(0, 0, 9f) },
            },
            "kolbrin" => new[]
            {
                new SiteDef { id = "a", label = "Read the left folio", kind = "folio", pos = new Vector3(6f, 0, 5f) },
                new SiteDef { id = "b", label = "Read the right folio", kind = "folio", pos = new Vector3(-6f, 0, 5.5f) },
                new SiteDef { id = "c", label = "Open the vault seal", kind = "seal", pos = new Vector3(0, 0, 9.5f) },
            },
            "emerald" => new[]
            {
                new SiteDef { id = "a", label = "Recite the first law", kind = "law", pos = new Vector3(6.5f, 0, 5f) },
                new SiteDef { id = "b", label = "Recite the second law", kind = "law", pos = new Vector3(-6.5f, 0, 6f) },
                new SiteDef { id = "c", label = "Kneel at the green fire", kind = "fire", pos = new Vector3(0, 0, 9f) },
            },
            _ => new[]
            {
                new SiteDef { id = "a", label = "First site", kind = "node", pos = new Vector3(6f, 0, 5f) },
                new SiteDef { id = "b", label = "Second site", kind = "node", pos = new Vector3(-6f, 0, 5f) },
                new SiteDef { id = "c", label = "Third site", kind = "node", pos = new Vector3(0, 0, 9f) },
            },
        };

        private static void ThemeWorld(string id, Color accent)
        {
            if (Camera.main != null)
                Camera.main.backgroundColor = SkyFor(id);
            RenderSettings.fogColor = SkyFor(id) * 0.55f;
            RenderSettings.fogDensity = 0.0042f;
            RenderSettings.ambientLight = Color.Lerp(accent, Color.white, 0.55f) * 0.55f;
        }

        private static void BuildPath(Transform parent, Color accent)
        {
            for (int i = 0; i < 14; i++)
            {
                float z = -7f + i * 2f;
                PropUtils.SoftQuad("path_" + i, new Vector3(0, 0.025f, z), new Vector3(2.2f, 1.6f, 1f),
                    UIKit.WithA(accent, 0.11f)).transform.SetParent(parent, true);
            }
            PropUtils.GoldRing(parent, 1.4f, 0.04f, UIKit.WithA(accent, 0.55f), 0.05f);
        }

        private static GameObject BuildSite(string destId, string siteId, string label, Vector3 pos, Color accent, string kind)
        {
            var root = new GameObject("Site_" + siteId);
            root.transform.position = pos;

            // visual by kind
            if (kind == "tree" || kind == "flower")
            {
                var t = SpawnKenneyLocal(kind == "flower" ? "nat_flower_purpleC" : "nat_tree_oak", pos, 20f, kind == "flower" ? 0.9f : 3.2f);
                if (t != null) t.transform.SetParent(root.transform, true);
            }
            else if (kind == "stone" || kind == "seal" || kind == "core")
            {
                var t = SpawnKenneyLocal("nat_stone_tallC", pos, 40f, 2.2f);
                if (t != null) t.transform.SetParent(root.transform, true);
            }
            else if (kind == "lamp" || kind == "fire" || kind == "bell")
            {
                var t = SpawnKenneyLocal("fur_lampRoundTable", pos, 0, 1.1f);
                if (t != null) t.transform.SetParent(root.transform, true);
                PropUtils.PointGlow(root.transform, Vector3.up * 1.2f, accent, 1.2f, 5f);
            }
            else if (kind == "spring")
            {
                var pool = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                pool.transform.SetParent(root.transform, false);
                pool.transform.localPosition = new Vector3(0, 0.05f, 0);
                pool.transform.localScale = new Vector3(1.4f, 0.08f, 1.4f);
                Object.Destroy(pool.GetComponent<Collider>());
                pool.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(new Color(0.2f, 0.45f, 0.7f));
            }
            else if (kind == "folio" || kind == "law" || kind == "booth")
            {
                var t = SpawnKenneyLocal("fur_books", pos + Vector3.up * 0.4f, 15f, 0.5f);
                if (t != null) t.transform.SetParent(root.transform, true);
                var ped = PropUtils.Pedestal(pos, 0.35f, 0.4f, new Color(0.2f, 0.15f, 0.1f));
                ped.transform.SetParent(root.transform, true);
            }
            else
            {
                var ped = PropUtils.Pedestal(pos, 0.4f, 0.5f, new Color(0.2f, 0.15f, 0.1f));
                ped.transform.SetParent(root.transform, true);
            }

            bool done = SaveState.Character.discovered.Contains("site_" + destId + "_" + siteId);
            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.SiteTask;
            di.destId = destId;
            di.siteId = siteId;
            di.label = done ? "Done" : label;
            di.accent = accent;
            di.completed = done;
            di.interactRadius = 2.5f;
            return root;
        }

        private static GameObject BuildGuardian(string destId, Color accent, Vector3 pos)
        {
            var root = new GameObject("Guardian");
            root.transform.position = pos;

            // dark crystal form (no extra human needed)
            var body = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            body.transform.SetParent(root.transform, false);
            body.transform.localPosition = new Vector3(0, 1.3f, 0);
            body.transform.localScale = new Vector3(1.1f, 1.6f, 1.1f);
            Object.Destroy(body.GetComponent<Collider>());
            body.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(new Color(0.08f, 0.06f, 0.12f));
            body.AddComponent<SlowSpin>().degreesPerSecond = 25f;

            var eye = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            eye.transform.SetParent(root.transform, false);
            eye.transform.localPosition = new Vector3(0, 1.55f, 0.45f);
            eye.transform.localScale = Vector3.one * 0.28f;
            Object.Destroy(eye.GetComponent<Collider>());
            eye.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(accent);

            PropUtils.PointGlow(root.transform, new Vector3(0, 1.5f, 0), accent, 1.4f, 6f);

            bool cleared = SaveState.Character.discovered.Contains("guardian_" + destId)
                || SaveState.Character.cleared.Contains(destId);
            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.Challenge;
            di.destId = destId;
            di.siteId = "guardian";
            di.label = cleared ? "Guardian fallen" : "Guardian · sealed";
            di.accent = accent;
            di.completed = cleared;
            di.interactRadius = 3f;
            return root;
        }

        private static GameObject BuildBarrier(Vector3 pos, Color accent)
        {
            var root = new GameObject("Barrier");
            root.transform.position = pos;
            var wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.transform.SetParent(root.transform, false);
            wall.transform.localPosition = new Vector3(0, 1.5f, 0);
            wall.transform.localScale = new Vector3(8f, 3f, 0.4f);
            wall.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(UIKit.WithA(accent, 0.35f));
            // keep collider to block
            var glow = PropUtils.SoftQuad("barrier_glow", pos + Vector3.up * 0.05f, new Vector3(9f, 2f, 1f),
                UIKit.WithA(accent, 0.2f));
            glow.transform.SetParent(root.transform, true);
            return root;
        }

        private static GameObject BuildReturnGate(Color accent, Vector3 pos)
        {
            var root = new GameObject("ReturnGate");
            root.transform.position = pos;
            for (int i = -1; i <= 1; i += 2)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                p.transform.SetParent(root.transform, false);
                p.transform.localPosition = new Vector3(i * 1.15f, 1.2f, 0);
                p.transform.localScale = new Vector3(0.35f, 1.2f, 0.35f);
                Object.Destroy(p.GetComponent<Collider>());
                p.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(new Color(0.25f, 0.2f, 0.15f));
            }
            var lintel = GameObject.CreatePrimitive(PrimitiveType.Cube);
            lintel.transform.SetParent(root.transform, false);
            lintel.transform.localPosition = new Vector3(0, 2.45f, 0);
            lintel.transform.localScale = new Vector3(2.7f, 0.25f, 0.4f);
            Object.Destroy(lintel.GetComponent<Collider>());
            lintel.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(UIKit.WithA(accent, 0.9f));

            var orb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            orb.transform.SetParent(root.transform, false);
            orb.transform.localPosition = new Vector3(0, 1.3f, 0.2f);
            orb.transform.localScale = Vector3.one * 0.95f;
            Object.Destroy(orb.GetComponent<Collider>());
            orb.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(UIKit.WithA(accent, 0.85f));
            orb.AddComponent<SlowSpin>().degreesPerSecond = 18f;

            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.ReturnHut;
            di.label = "Return to Hut";
            di.accent = accent;
            di.interactRadius = 2.8f;
            return root;
        }

        private static GameObject BuildRelic(string destId, Color accent, Vector3 pos)
        {
            var root = new GameObject("Relic");
            root.transform.position = pos;
            var ped = PropUtils.Pedestal(pos, 0.55f, 0.5f, new Color(0.18f, 0.14f, 0.1f));
            ped.transform.SetParent(root.transform, true);

            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.transform.SetParent(root.transform, false);
            core.transform.localPosition = new Vector3(0, 1.15f, 0);
            core.transform.localScale = Vector3.one * 0.42f;
            Object.Destroy(core.GetComponent<Collider>());
            bool owned = DestinationManager.HasRelic(destId);
            core.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(owned ? new Color(0.4f, 0.4f, 0.4f) : accent);
            if (!owned) core.AddComponent<SlowSpin>().degreesPerSecond = 40f;
            PropUtils.PointGlow(root.transform, new Vector3(0, 1.2f, 0), accent, 1.3f, 5f);

            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.ClaimRelic;
            di.destId = destId;
            di.label = owned ? "Relic claimed" : DestinationManager.RelicName(destId);
            di.accent = accent;
            di.completed = owned;
            di.interactRadius = 2.5f;
            return root;
        }

        private static GameObject SpawnGuide(DestinationDef def, Vector3 pos, Transform player)
        {
            string model = def.id switch
            {
                "eden" => "char_fem_gown",
                "fair" => "char_fem_wanderer",
                "giza" => "char_masc_vestment",
                "kolbrin" => "char_masc_robe",
                "emerald" => "char_masc_cloak",
                _ => "char_masc_tunic",
            };
            string anim = model.StartsWith("char_fem") ? "anims_fem" : "anims_masc";
            var go = CharacterFactory.Spawn(model, anim, pos, 180f, 1.78f, collide: true);
            CharacterFactory.ForceVisible(go, truthKing: false);
            var rig = go.GetComponent<CharacterRig>();
            if (rig != null)
            {
                var amb = go.AddComponent<NpcAmbient>();
                if (player != null) amb.Bind(rig, player);
            }
            return go;
        }

        private static void ScatterTheme(Transform parent, string id, Color accent)
        {
            var rng = new System.Random(id.GetHashCode() ^ 17);
            string[] trees = id switch
            {
                "eden" => new[] { "nat_tree_oak", "nat_tree_detailed", "nat_tree_default", "nat_plant_bushLarge", "nat_flower_yellowB" },
                "fair" => new[] { "nat_tree_thin", "nat_tree_small", "nat_plant_bushDetailed", "fur_lampRoundTable" },
                "giza" => new[] { "nat_rock_largeA", "nat_stone_tallC", "nat_rock_tallA", "nat_stone_largeB" },
                "kolbrin" => new[] { "nat_rock_largeC", "nat_stone_tallC", "nat_log_stack" },
                "emerald" => new[] { "nat_tree_pineTallA", "nat_tree_pineRoundC", "nat_mushroom_redGroup", "nat_tree_detailed" },
                _ => new[] { "nat_tree_default", "nat_rock_largeA" },
            };

            for (int i = 0; i < 28; i++)
            {
                float ang = (i / 28f) * Mathf.PI * 2f + 0.15f;
                float r = 10f + (i % 5) * 2.2f;
                // leave corridor open along +Z path
                float x = Mathf.Cos(ang) * r;
                float z = Mathf.Sin(ang) * r + 6f;
                if (Mathf.Abs(x) < 2.2f && z > -6f && z < 20f) continue;
                var p = new Vector3(x, 0, z);
                string t = trees[i % trees.Length];
                float size = t.Contains("rock") || t.Contains("stone") ? 1.5f + (i % 3) * 0.45f
                    : t.Contains("lamp") ? 0.9f
                    : 3.0f + (i % 4) * 0.55f;
                var go = SpawnKenneyLocal(t, p, (float)rng.NextDouble() * 360f, size);
                if (go != null) go.transform.SetParent(parent, true);
            }
        }

        private static GameObject SpawnKenneyLocal(string name, Vector3 pos, float yaw, float targetSize)
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
                float dim = b.size.y > 0.01f ? b.size.y : Mathf.Max(b.size.x, b.size.z);
                inst.transform.localScale = Vector3.one * (targetSize / Mathf.Max(0.01f, dim));
                b = rends[0].bounds;
                for (int i = 1; i < rends.Length; i++) b.Encapsulate(rends[i].bounds);
                inst.transform.position += wrapper.transform.position - new Vector3(b.center.x, b.min.y - 0.008f, b.center.z);
            }
            WorldSkin.Skin(wrapper);
            return wrapper;
        }

        private static Color SkyFor(string id) => id switch
        {
            "eden" => new Color(0.35f, 0.55f, 0.42f),
            "fair" => new Color(0.45f, 0.4f, 0.55f),
            "giza" => new Color(0.55f, 0.4f, 0.25f),
            "kolbrin" => new Color(0.15f, 0.18f, 0.28f),
            "emerald" => new Color(0.12f, 0.22f, 0.2f),
            _ => new Color(0.14f, 0.16f, 0.28f),
        };

        private static Color GroundFor(string id) => id switch
        {
            "eden" => new Color(0.18f, 0.32f, 0.16f),
            "fair" => new Color(0.28f, 0.24f, 0.22f),
            "giza" => new Color(0.42f, 0.32f, 0.18f),
            "kolbrin" => new Color(0.14f, 0.14f, 0.16f),
            "emerald" => new Color(0.1f, 0.2f, 0.16f),
            _ => new Color(0.16f, 0.18f, 0.12f),
        };
    }
}
