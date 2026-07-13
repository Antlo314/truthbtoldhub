using UnityEngine;

namespace Journey3D
{
    /// Runtime props for hut redesign — no external downloads required.
    /// Gold rings, pedestals, and soft glows built from primitives (WebGL-safe).
    public static class PropUtils
    {
        public static GameObject GoldRing(Transform parent, float radius, float y, Color color, float thickness = 0.06f)
        {
            var root = new GameObject("gold_ring");
            root.transform.SetParent(parent, false);
            root.transform.localPosition = new Vector3(0, y, 0);
            // approximate ring with 16 thin boxes
            int segs = 20;
            for (int i = 0; i < segs; i++)
            {
                float a0 = (i / (float)segs) * Mathf.PI * 2f;
                float a1 = ((i + 1) / (float)segs) * Mathf.PI * 2f;
                float am = (a0 + a1) * 0.5f;
                var p0 = new Vector3(Mathf.Cos(a0), 0, Mathf.Sin(a0)) * radius;
                var p1 = new Vector3(Mathf.Cos(a1), 0, Mathf.Sin(a1)) * radius;
                var mid = (p0 + p1) * 0.5f;
                float len = Vector3.Distance(p0, p1);
                var seg = GameObject.CreatePrimitive(PrimitiveType.Cube);
                Object.Destroy(seg.GetComponent<Collider>());
                seg.transform.SetParent(root.transform, false);
                seg.transform.localPosition = mid;
                seg.transform.localRotation = Quaternion.LookRotation(p1 - p0, Vector3.up);
                seg.transform.localScale = new Vector3(thickness, thickness * 0.5f, len);
                var r = seg.GetComponent<MeshRenderer>();
                r.sharedMaterial = UnlitMat(color);
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            return root;
        }

        public static GameObject Pedestal(Vector3 pos, float height, float radius, Color color)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            go.name = "pedestal";
            go.transform.position = pos + Vector3.up * (height * 0.5f);
            go.transform.localScale = new Vector3(radius * 2f, height * 0.5f, radius * 2f);
            Object.Destroy(go.GetComponent<Collider>());
            go.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(color);
            return go;
        }

        public static Light PointGlow(Transform parent, Vector3 localPos, Color color, float intensity, float range)
        {
            var go = new GameObject("glow");
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            var l = go.AddComponent<Light>();
            l.type = LightType.Point;
            l.color = color;
            l.intensity = intensity;
            l.range = range;
            return l;
        }

        public static Material UnlitMat(Color c)
        {
            var shader = Shader.Find("Custom/UnlitTextureTint") ?? Shader.Find("Sprites/Default") ?? Shader.Find("Unlit/Color") ?? Shader.Find("Standard");
            var m = new Material(shader);
            if (m.HasProperty("_Color")) m.color = c;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            return m;
        }

        public static GameObject SoftQuad(string name, Vector3 pos, Vector3 scale, Color color, Transform parent = null)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = name;
            if (parent != null) go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.transform.localScale = scale;
            go.transform.rotation = Quaternion.Euler(90f, 0, 0);
            Object.Destroy(go.GetComponent<Collider>());
            var r = go.GetComponent<MeshRenderer>();
            r.sharedMaterial = UnlitMat(color);
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return go;
        }

        /// Abstract sacred presence — no human mesh. Floating crystal core + rings + glow.
        public static GameObject TruthPresence(Vector3 worldPos)
        {
            var root = new GameObject("TruthPresence");
            root.transform.position = worldPos;

            // stone dais
            var dais = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            dais.name = "dais";
            dais.transform.SetParent(root.transform, false);
            dais.transform.localPosition = new Vector3(0, 0.08f, 0);
            dais.transform.localScale = new Vector3(1.35f, 0.08f, 1.35f);
            Object.Destroy(dais.GetComponent<Collider>());
            dais.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(new Color(0.18f, 0.14f, 0.1f));

            GoldRing(root.transform, 1.05f, 0.02f, new Color(1f, 0.75f, 0.3f, 0.9f), 0.055f);
            GoldRing(root.transform, 0.55f, 0.95f, new Color(0.99f, 0.83f, 0.35f, 0.55f), 0.03f);

            // core — octahedron-like diamond (scaled cube)
            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.name = "core";
            core.transform.SetParent(root.transform, false);
            core.transform.localPosition = new Vector3(0, 1.15f, 0);
            core.transform.localScale = new Vector3(0.55f, 0.75f, 0.55f);
            Object.Destroy(core.GetComponent<Collider>());
            core.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(new Color(1f, 0.88f, 0.45f));
            core.AddComponent<SlowSpin>().degreesPerSecond = 22f;

            // inner flame lens
            var flame = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            flame.name = "flame";
            flame.transform.SetParent(core.transform, false);
            flame.transform.localPosition = Vector3.zero;
            flame.transform.localScale = new Vector3(0.55f, 0.7f, 0.55f);
            Object.Destroy(flame.GetComponent<Collider>());
            flame.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(new Color(0.35f, 0.75f, 1f, 1f));

            // outer halo disc
            var halo = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            halo.name = "halo";
            halo.transform.SetParent(root.transform, false);
            halo.transform.localPosition = new Vector3(0, 1.55f, 0);
            halo.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            halo.transform.localScale = new Vector3(0.9f, 0.02f, 0.9f);
            Object.Destroy(halo.GetComponent<Collider>());
            halo.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(new Color(1f, 0.8f, 0.3f, 0.35f));
            halo.AddComponent<SlowSpin>().degreesPerSecond = -14f;

            PointGlow(root.transform, new Vector3(0, 1.3f, 0), new Color(1f, 0.84f, 0.42f), 1.85f, 6.5f);
            PointGlow(root.transform, new Vector3(0, 1.1f, 0), new Color(0.4f, 0.75f, 1f), 0.9f, 3.5f);

            // interaction collider (no human mesh)
            var col = root.AddComponent<CapsuleCollider>();
            col.center = new Vector3(0, 1.0f, 0);
            col.radius = 0.55f;
            col.height = 2.2f;
            col.isTrigger = true;

            return root;
        }

        /// Player as abstract soul vessel — orb + ring, no human body.
        public static GameObject SoulVessel(Transform parent, Color accent)
        {
            var root = new GameObject("SoulVessel");
            root.transform.SetParent(parent, false);
            root.transform.localPosition = new Vector3(0, 0.95f, 0);

            var core = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            core.name = "core";
            core.transform.SetParent(root.transform, false);
            core.transform.localScale = new Vector3(0.42f, 0.55f, 0.42f);
            Object.Destroy(core.GetComponent<Collider>());
            core.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(accent);

            var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            ring.name = "ring";
            ring.transform.SetParent(root.transform, false);
            ring.transform.localPosition = Vector3.zero;
            ring.transform.localRotation = Quaternion.Euler(90f, 0, 0);
            ring.transform.localScale = new Vector3(0.72f, 0.015f, 0.72f);
            Object.Destroy(ring.GetComponent<Collider>());
            ring.GetComponent<MeshRenderer>().sharedMaterial = UnlitMat(new Color(1f, 0.85f, 0.4f));
            ring.AddComponent<SlowSpin>().degreesPerSecond = 40f;

            PointGlow(root.transform, Vector3.zero, accent, 1.1f, 3.2f);
            return root;
        }
    }
}
