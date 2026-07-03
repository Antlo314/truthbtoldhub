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
        }

        private void Update()
        {
            if (_halo == null) return;
            _pulseT += Time.deltaTime * 2.2f;
            _halo.intensity = 0.75f + Mathf.Sin(_pulseT) * 0.25f;
        }
    }
}
