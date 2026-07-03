using UnityEngine;

namespace Journey3D
{
    /// Gentle idle rotation/hover (seeing glass orb, pins, glyphs).
    public class SlowSpin : MonoBehaviour
    {
        public Vector3 axis = Vector3.up;
        public float degreesPerSecond = 20f;
        public float hoverAmplitude;
        public float hoverSpeed = 1.4f;

        private Vector3 _basePos;

        private void Start() { _basePos = transform.localPosition; }

        private void Update()
        {
            transform.Rotate(axis, degreesPerSecond * Time.deltaTime, Space.Self);
            if (hoverAmplitude > 0f)
                transform.localPosition = _basePos + Vector3.up * Mathf.Sin(Time.time * hoverSpeed) * hoverAmplitude;
        }
    }
}
