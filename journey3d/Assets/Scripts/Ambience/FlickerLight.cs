using UnityEngine;

namespace Journey3D
{
    /// Firelight flicker for the hearth.
    [RequireComponent(typeof(Light))]
    public class FlickerLight : MonoBehaviour
    {
        public float baseIntensity = 2.4f;
        public float flickerAmount = 0.7f;
        public float speed = 9f;

        private Light _light;
        private float _seed;

        private void Awake()
        {
            _light = GetComponent<Light>();
            _seed = Random.value * 100f;
        }

        private void Update()
        {
            float n = Mathf.PerlinNoise(_seed, Time.time * speed * 0.1f);
            _light.intensity = baseIntensity + (n - 0.5f) * 2f * flickerAmount;
        }
    }
}
