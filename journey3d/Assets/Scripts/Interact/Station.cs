using UnityEngine;

namespace Journey3D
{
    public enum StationId
    {
        Ledger, SeeingGlass, Archive, Soul, Forge, Offering, Arcade, Wayfinder, Truth, Sanctum
    }

    /// One of the ten hut stations. The InteractionSystem finds the
    /// nearest one and HutUI opens its panel.
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

        private void Start()
        {
            // soft accent halo so stations read from across the room
            var go = new GameObject("halo");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = Vector3.up * 1.6f;
            _halo = go.AddComponent<Light>();
            _halo.type = LightType.Point;
            _halo.color = accent;
            _halo.range = 3.2f;
            _halo.intensity = 0.9f;

            BuildLabel();
        }

        private void BuildLabel()
        {
            // floating name above the prop, always facing the camera
            float top = 2.1f;
            foreach (var r in GetComponentsInChildren<Renderer>())
                top = Mathf.Max(top, r.bounds.max.y - transform.position.y + 0.45f);

            var go = new GameObject("label");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = Vector3.up * top;
            var tm = go.AddComponent<TextMesh>();
            tm.text = label;
            tm.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            tm.fontSize = 46;
            tm.characterSize = 0.045f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = accent;
            tm.fontStyle = FontStyle.Bold;
            go.GetComponent<MeshRenderer>().material = tm.font.material;
            _label = go.transform;
        }

        private void Update()
        {
            if (_halo != null)
            {
                _pulseT += Time.deltaTime * 2.2f;
                _halo.intensity = 0.75f + Mathf.Sin(_pulseT) * 0.25f;
            }
            if (_label != null && Camera.main != null)
            {
                // billboard toward the camera (keep upright)
                var toCam = _label.position - Camera.main.transform.position;
                toCam.y = 0;
                if (toCam.sqrMagnitude > 0.01f)
                    _label.rotation = Quaternion.LookRotation(toCam);
                // gentle hover
                _label.localScale = Vector3.one * (1f + Mathf.Sin(_pulseT * 0.7f) * 0.04f);
            }
        }
    }
}
