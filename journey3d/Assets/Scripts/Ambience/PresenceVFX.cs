using UnityEngine;

namespace Journey3D
{
    /// Runtime gold dust + ember field — gives the hut a living sacred presence
    /// without external particle assets (WebGL-safe, low cost).
    public class PresenceVFX : MonoBehaviour
    {
        public int dustCount = 90;
        public int emberCount = 42;
        public float radius = 8.5f;
        public float height = 3.5f;
        public Color dustColor = new Color(1f, 0.88f, 0.48f, 0.62f);
        public Color emberColor = new Color(1f, 0.42f, 0.1f, 0.9f);

        private Transform[] _dust;
        private Transform[] _ember;
        private Vector3[] _dustVel;
        private Vector3[] _emberVel;
        private float[] _phase;

        public static PresenceVFX SpawnInHut()
        {
            var go = new GameObject("PresenceVFX");
            go.transform.position = new Vector3(0, 0.4f, 0);
            return go.AddComponent<PresenceVFX>();
        }

        private void Start()
        {
            var dustMat = MakeSpriteMat(dustColor, 0.06f);
            var emberMat = MakeSpriteMat(emberColor, 0.09f);

            _dust = new Transform[dustCount];
            _dustVel = new Vector3[dustCount];
            _phase = new float[dustCount];
            for (int i = 0; i < dustCount; i++)
            {
                _dust[i] = MakeQuad("dust", dustMat, Random.Range(0.03f, 0.07f));
                _dust[i].localPosition = RandomPoint();
                _dustVel[i] = new Vector3(Random.Range(-0.08f, 0.08f), Random.Range(0.04f, 0.12f), Random.Range(-0.08f, 0.08f));
                _phase[i] = Random.value * Mathf.PI * 2f;
            }

            _ember = new Transform[emberCount];
            _emberVel = new Vector3[emberCount];
            // Embers rise from the fireplace at +X
            var hearth = new Vector3(5.6f, 0.6f, 0f);
            for (int i = 0; i < emberCount; i++)
            {
                _ember[i] = MakeQuad("ember", emberMat, Random.Range(0.04f, 0.1f));
                _ember[i].position = hearth + new Vector3(Random.Range(-0.3f, 0.3f), Random.Range(0f, 0.5f), Random.Range(-0.3f, 0.3f));
                _emberVel[i] = new Vector3(Random.Range(-0.15f, 0.05f), Random.Range(0.35f, 0.85f), Random.Range(-0.15f, 0.15f));
            }
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            var cam = Camera.main;
            for (int i = 0; i < _dust.Length; i++)
            {
                if (_dust[i] == null) continue;
                _phase[i] += dt;
                var p = _dust[i].localPosition;
                p += _dustVel[i] * dt;
                p.x += Mathf.Sin(_phase[i] * 0.7f + i) * 0.01f;
                if (p.y > height || Mathf.Abs(p.x) > radius || Mathf.Abs(p.z) > radius)
                    p = RandomPoint();
                _dust[i].localPosition = p;
                if (cam != null) _dust[i].rotation = Quaternion.LookRotation(cam.transform.forward);
            }

            var hearth = new Vector3(5.6f, 0.6f, 0f);
            for (int i = 0; i < _ember.Length; i++)
            {
                if (_ember[i] == null) continue;
                var p = _ember[i].position;
                p += _emberVel[i] * dt;
                _emberVel[i] += new Vector3(Mathf.Sin(Time.time * 2f + i) * 0.02f, 0, Mathf.Cos(Time.time * 1.7f + i) * 0.02f);
                if (p.y > 3.8f)
                {
                    p = hearth + new Vector3(Random.Range(-0.25f, 0.25f), 0, Random.Range(-0.25f, 0.25f));
                    _emberVel[i] = new Vector3(Random.Range(-0.15f, 0.05f), Random.Range(0.35f, 0.85f), Random.Range(-0.15f, 0.15f));
                }
                _ember[i].position = p;
                if (cam != null) _ember[i].rotation = Quaternion.LookRotation(cam.transform.forward);
            }
        }

        private Vector3 RandomPoint()
        {
            return new Vector3(
                Random.Range(-radius * 0.85f, radius * 0.85f),
                Random.Range(0.3f, height * 0.9f),
                Random.Range(-radius * 0.85f, radius * 0.85f));
        }

        private Transform MakeQuad(string name, Material mat, float size)
        {
            var go = GameObject.CreatePrimitive(PrimitiveType.Quad);
            go.name = name;
            go.transform.SetParent(transform, false);
            go.transform.localScale = Vector3.one * size;
            Object.Destroy(go.GetComponent<Collider>());
            var r = go.GetComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            return go.transform;
        }

        private static Material MakeSpriteMat(Color c, float a)
        {
            var shader = Shader.Find("Sprites/Default") ?? Shader.Find("Unlit/Color") ?? Shader.Find("Standard");
            var m = new Material(shader);
            c.a = a;
            if (m.HasProperty("_Color")) m.color = c;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            // soft additive-ish via transparent queue
            if (m.HasProperty("_Mode"))
            {
                m.SetFloat("_Mode", 2);
                m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.DisableKeyword("_ALPHATEST_ON");
                m.EnableKeyword("_ALPHABLEND_ON");
                m.renderQueue = 3000;
            }
            return m;
        }
    }
}
