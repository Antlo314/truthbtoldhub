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
            var shader = Shader.Find("Unlit/Color") ?? Shader.Find("Sprites/Default") ?? Shader.Find("Standard");
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
    }
}
