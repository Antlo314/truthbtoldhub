using UnityEngine;

namespace Journey3D
{
    public enum StationId
    {
        Ledger, SeeingGlass, Archive, Soul, Forge, Offering, Arcade, Wayfinder, Truth, Sanctum
    }

    /// One of the ten hut stations. InteractionSystem finds the nearest;
    /// HutUI opens its panel. Visual upgrade: gold floor ring + richer halo.
    public class Station : MonoBehaviour
    {
        public StationId id;
        public string label;
        public string hint;
        public Color accent = Color.white;
        public float interactRadius = 2.4f;

        private Light _halo;
        private float _pulseT;
        private Transform _label;
        private Transform _ring;

        private void Start()
        {
            var go = new GameObject("halo");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = Vector3.up * 1.55f;
            _halo = go.AddComponent<Light>();
            _halo.type = LightType.Point;
            _halo.color = accent;
            _halo.range = 3.6f;
            _halo.intensity = 1.05f;

            // Sacred floor ring (reads from across the chamber)
            float ringR = Mathf.Clamp(interactRadius * 0.42f, 0.55f, 1.15f);
            var ringGo = PropUtils.GoldRing(transform, ringR, 0.04f,
                new Color(accent.r, accent.g, accent.b, 0.85f) * 0.55f + new Color(0.3f, 0.22f, 0.08f),
                0.045f);
            _ring = ringGo.transform;

            // Soft ground wash (parented so it stays with the station)
            var wash = PropUtils.SoftQuad("floor_wash",
                transform.position + Vector3.up * 0.03f,
                new Vector3(ringR * 2.2f, ringR * 2.2f, 1f),
                new Color(accent.r, accent.g, accent.b, 0.14f));
            wash.transform.SetParent(transform, true);

            BuildLabel();
        }

        private void BuildLabel()
        {
            float top = 2.1f;
            foreach (var r in GetComponentsInChildren<Renderer>())
                top = Mathf.Max(top, r.bounds.max.y - transform.position.y + 0.45f);

            var go = new GameObject("label");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = Vector3.up * top;
            var tm = go.AddComponent<TextMesh>();
            tm.text = label;
            tm.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            tm.fontSize = 48;
            tm.characterSize = 0.042f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = Color.Lerp(accent, Color.white, 0.25f);
            tm.fontStyle = FontStyle.Bold;
            go.GetComponent<MeshRenderer>().material = tm.font.material;
            _label = go.transform;
        }

        private void Update()
        {
            _pulseT += Time.deltaTime * 2.1f;
            if (_halo != null)
                _halo.intensity = 0.85f + Mathf.Sin(_pulseT) * 0.35f;

            if (_ring != null)
            {
                float s = 1f + Mathf.Sin(_pulseT * 0.85f) * 0.04f;
                _ring.localScale = new Vector3(s, 1f, s);
            }

            if (_label != null && Camera.main != null)
            {
                var toCam = _label.position - Camera.main.transform.position;
                toCam.y = 0;
                if (toCam.sqrMagnitude > 0.01f)
                    _label.rotation = Quaternion.LookRotation(toCam);
                _label.localScale = Vector3.one * (1f + Mathf.Sin(_pulseT * 0.7f) * 0.045f);
            }
        }
    }
}
