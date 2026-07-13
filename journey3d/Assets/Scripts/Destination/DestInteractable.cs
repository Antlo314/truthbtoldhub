using UnityEngine;

namespace Journey3D
{
    public enum DestAction
    {
        ReturnHut,
        ClaimRelic,
        SpeakGuide,
    }

    /// Interactable inside a destination zone (return gate, relic, guide).
    public class DestInteractable : MonoBehaviour
    {
        public DestAction action;
        public string destId;
        public string label = "Interact";
        public Color accent = Color.white;
        public float interactRadius = 2.6f;

        private Light _halo;
        private Transform _label;

        private void Start()
        {
            var go = new GameObject("halo");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = Vector3.up * 1.4f;
            _halo = go.AddComponent<Light>();
            _halo.type = LightType.Point;
            _halo.color = accent;
            _halo.range = 4f;
            _halo.intensity = 1.2f;

            PropUtils.GoldRing(transform, 0.75f, 0.03f, UIKit.WithA(accent, 0.75f), 0.05f);

            var lg = new GameObject("label");
            lg.transform.SetParent(transform, false);
            lg.transform.localPosition = Vector3.up * 2.2f;
            var tm = lg.AddComponent<TextMesh>();
            tm.text = label;
            tm.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            tm.fontSize = 42;
            tm.characterSize = 0.04f;
            tm.anchor = TextAnchor.MiddleCenter;
            tm.alignment = TextAlignment.Center;
            tm.color = Color.Lerp(accent, Color.white, 0.3f);
            tm.fontStyle = FontStyle.Bold;
            lg.GetComponent<MeshRenderer>().material = tm.font.material;
            _label = lg.transform;
        }

        private void Update()
        {
            if (_halo != null)
                _halo.intensity = 1.0f + Mathf.Sin(Time.time * 2.2f) * 0.35f;
            if (_label != null && Camera.main != null)
            {
                var to = _label.position - Camera.main.transform.position;
                to.y = 0;
                if (to.sqrMagnitude > 0.01f)
                    _label.rotation = Quaternion.LookRotation(to);
            }
        }
    }
}
