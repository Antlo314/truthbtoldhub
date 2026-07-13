using UnityEngine;

namespace Journey3D
{
    /// Procedural enterable zones for each road — real places, not cinema-only.
    public static class DestinationBuilder
    {
        public static GameObject Build(DestinationDef def, Transform player)
        {
            var root = new GameObject("Dest_" + def.id);
            var accent = UIKit.Hex(def.accent);

            // Sky / fog theming
            if (Camera.main != null)
                Camera.main.backgroundColor = SkyFor(def.id);
            RenderSettings.fogColor = SkyFor(def.id) * 0.55f;
            RenderSettings.fogDensity = 0.0045f;
            RenderSettings.ambientLight = Color.Lerp(accent, Color.white, 0.55f) * 0.55f;

            // Ground
            var ground = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ground.name = "ground";
            ground.transform.SetParent(root.transform, false);
            ground.transform.position = new Vector3(0, -0.5f, 0);
            ground.transform.localScale = new Vector3(80f, 1f, 80f);
            Object.Destroy(ground.GetComponent<Collider>());
            var gcol = ground.AddComponent<BoxCollider>();
            gcol.size = Vector3.one;
            ground.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(GroundFor(def.id));

            // Soft wash
            PropUtils.SoftQuad("wash", new Vector3(0, 0.02f, 0), new Vector3(18f, 18f, 1f),
                UIKit.WithA(accent, 0.12f)).transform.SetParent(root.transform, true);

            // Central dais
            PropUtils.Pedestal(new Vector3(0, 0, 4f), 0.15f, 1.4f, new Color(0.2f, 0.16f, 0.12f))
                .transform.SetParent(root.transform, true);
            PropUtils.GoldRing(root.transform, 1.6f, 0.04f, UIKit.WithA(accent, 0.8f), 0.06f);

            // Theme props
            ScatterTheme(root.transform, def.id, accent);

            // Guide NPC
            var guide = SpawnGuide(def, new Vector3(0, 0, 5.2f), player);
            if (guide != null)
            {
                guide.transform.SetParent(root.transform, true);
                var di = guide.AddComponent<DestInteractable>();
                di.action = DestAction.SpeakGuide;
                di.destId = def.id;
                di.label = def.guide;
                di.accent = accent;
                di.interactRadius = 3.2f;
            }

            // Relic pedestal
            var relicPos = new Vector3(3.2f, 0, 2.4f);
            var relic = BuildRelic(def.id, accent, relicPos);
            relic.transform.SetParent(root.transform, true);

            // Return gate
            var gatePos = new Vector3(0, 0, -6.5f);
            var gate = BuildReturnGate(accent, gatePos);
            gate.transform.SetParent(root.transform, true);

            // Title floating
            var title = new GameObject("dest_title");
            title.transform.SetParent(root.transform, false);
            title.transform.position = new Vector3(0, 3.4f, 4f);
            var tm = title.AddComponent<TextMesh>();
            tm.text = def.name;
            tm.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            tm.fontSize = 52;
            tm.characterSize = 0.05f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.color = accent;
            tm.fontStyle = FontStyle.Bold;
            title.GetComponent<MeshRenderer>().material = tm.font.material;

            // Ambient light
            var light = new GameObject("dest_key");
            light.transform.SetParent(root.transform, false);
            light.transform.position = new Vector3(2f, 5f, 2f);
            var l = light.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = accent;
            l.intensity = 1.6f;
            l.range = 22f;

            // Spawn player at gate
            if (player != null)
            {
                var cc = player.GetComponent<CharacterController>();
                if (cc != null) cc.enabled = false;
                player.position = new Vector3(0, 0.1f, -4.5f);
                player.rotation = Quaternion.Euler(0, 0, 0);
                if (cc != null) cc.enabled = true;
            }

            return root;
        }

        private static GameObject BuildReturnGate(Color accent, Vector3 pos)
        {
            var root = new GameObject("ReturnGate");
            root.transform.position = pos;

            // Arch pillars
            for (int i = -1; i <= 1; i += 2)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                p.transform.SetParent(root.transform, false);
                p.transform.localPosition = new Vector3(i * 1.1f, 1.2f, 0);
                p.transform.localScale = new Vector3(0.35f, 1.2f, 0.35f);
                Object.Destroy(p.GetComponent<Collider>());
                p.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(new Color(0.25f, 0.2f, 0.15f));
            }
            var lintel = GameObject.CreatePrimitive(PrimitiveType.Cube);
            lintel.transform.SetParent(root.transform, false);
            lintel.transform.localPosition = new Vector3(0, 2.45f, 0);
            lintel.transform.localScale = new Vector3(2.6f, 0.25f, 0.4f);
            Object.Destroy(lintel.GetComponent<Collider>());
            lintel.GetComponent<MeshRenderer>().sharedMaterial = PropUtils.UnlitMat(UIKit.WithA(accent, 0.9f));

            // Portal glow sphere
            var orb = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            orb.transform.SetParent(root.transform, false);
            orb.transform.localPosition = new Vector3(0, 1.3f, 0.2f);
            orb.transform.localScale = Vector3.one * 0.9f;
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
            var ped = PropUtils.Pedestal(pos, 0.5f, 0.45f, new Color(0.18f, 0.14f, 0.1f));
            ped.transform.SetParent(root.transform, true);

            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.transform.SetParent(root.transform, false);
            core.transform.localPosition = new Vector3(0, 1.05f, 0);
            core.transform.localScale = Vector3.one * 0.38f;
            Object.Destroy(core.GetComponent<Collider>());
            bool owned = DestinationManager.HasRelic(destId);
            core.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(owned ? new Color(0.4f, 0.4f, 0.4f) : accent);
            if (!owned) core.AddComponent<SlowSpin>().degreesPerSecond = 40f;

            var di = root.AddComponent<DestInteractable>();
            di.action = DestAction.ClaimRelic;
            di.destId = destId;
            di.label = owned ? "Relic claimed" : DestinationManager.RelicName(destId);
            di.accent = accent;
            di.interactRadius = 2.4f;
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
            var rng = new System.Random(id.GetHashCode());
            string[] trees = id switch
            {
                "eden" => new[] { "nat_tree_oak", "nat_tree_detailed", "nat_tree_default", "nat_plant_bushLarge" },
                "fair" => new[] { "nat_tree_thin", "nat_tree_small", "nat_plant_bushDetailed" },
                "giza" => new[] { "nat_rock_largeA", "nat_stone_tallC", "nat_rock_tallA", "nat_stone_largeB" },
                "kolbrin" => new[] { "nat_rock_largeC", "nat_stone_tallC", "nat_log_stack" },
                "emerald" => new[] { "nat_tree_pineTallA", "nat_tree_pineRoundC", "nat_mushroom_redGroup" },
                _ => new[] { "nat_tree_default", "nat_rock_largeA" },
            };

            for (int i = 0; i < 18; i++)
            {
                float ang = (i / 18f) * Mathf.PI * 2f + 0.2f;
                float r = 8f + (i % 4) * 2.4f;
                var p = new Vector3(Mathf.Cos(ang) * r, 0, Mathf.Sin(ang) * r + 1f);
                string t = trees[i % trees.Length];
                var go = SpawnKenneyLocal(t, p, (float)rng.NextDouble() * 360f,
                    t.Contains("rock") || t.Contains("stone") ? 1.4f + (i % 3) * 0.4f : 2.8f + (i % 3) * 0.6f);
                if (go != null) go.transform.SetParent(parent, true);
            }

            // path markers back to gate
            for (int i = 0; i < 5; i++)
            {
                float z = -5f + i * 1.8f;
                PropUtils.SoftQuad("path_" + i, new Vector3(0, 0.025f, z), new Vector3(1.6f, 1.2f, 1f),
                    UIKit.WithA(accent, 0.1f)).transform.SetParent(parent, true);
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
