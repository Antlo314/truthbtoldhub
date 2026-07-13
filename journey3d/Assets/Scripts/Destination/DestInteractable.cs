using UnityEngine;

namespace Journey3D
{
    public enum DestAction
    {
        ReturnHut,
        ClaimRelic,
        SpeakGuide,
        SiteTask,      // tend / light / read / attune
        Challenge,     // strike the guardian
    }

    /// Interactable inside a destination zone.
    public class DestInteractable : MonoBehaviour
    {
        public DestAction action;
        public string destId;
        public string siteId;          // for SiteTask / Challenge ids
        public string label = "Interact";
        public Color accent = Color.white;
        public float interactRadius = 2.6f;
        public bool completed;

        private Light _halo;
        private TextMesh _labelMesh;
        private Transform _labelRoot;

        public void SetLabel(string text)
        {
            label = text ?? label;
            if (_labelMesh != null) _labelMesh.text = label;
        }

        public void MarkDone(string doneLabel = null)
        {
            completed = true;
            if (!string.IsNullOrEmpty(doneLabel)) SetLabel(doneLabel);
            if (_halo != null)
            {
                _halo.color = new Color(0.5f, 0.5f, 0.5f);
                _halo.intensity = 0.4f;
            }
        }

        private void Start()
        {
            var go = new GameObject("halo");
            go.transform.SetParent(transform, false);
            go.transform.localPosition = Vector3.up * 1.4f;
            _halo = go.AddComponent<Light>();
            _halo.type = LightType.Point;
            _halo.color = accent;
            _halo.range = 4f;
            _halo.intensity = completed ? 0.4f : 1.2f;

            PropUtils.GoldRing(transform, 0.75f, 0.03f, UIKit.WithA(accent, 0.75f), 0.05f);

            var lg = new GameObject("label");
            lg.transform.SetParent(transform, false);
            lg.transform.localPosition = Vector3.up * 2.2f;
            _labelMesh = lg.AddComponent<TextMesh>();
            _labelMesh.text = label;
            _labelMesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            _labelMesh.fontSize = 42;
            _labelMesh.characterSize = 0.04f;
            _labelMesh.anchor = TextAnchor.MiddleCenter;
            _labelMesh.alignment = TextAlignment.Center;
            _labelMesh.color = Color.Lerp(accent, Color.white, 0.3f);
            _labelMesh.fontStyle = FontStyle.Bold;
            lg.GetComponent<MeshRenderer>().material = _labelMesh.font.material;
            _labelRoot = lg.transform;
        }

        private void Update()
        {
            if (_halo != null && !completed)
                _halo.intensity = 1.0f + Mathf.Sin(Time.time * 2.2f) * 0.35f;
            if (_labelRoot != null && Camera.main != null)
            {
                var to = _labelRoot.position - Camera.main.transform.position;
                to.y = 0;
                if (to.sqrMagnitude > 0.01f)
                    _labelRoot.rotation = Quaternion.LookRotation(to);
            }
        }
    }
}
