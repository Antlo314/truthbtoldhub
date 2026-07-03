using UnityEngine;

namespace Journey3D
{
    /// Footstep ticks while walking. The soundtrack plays from the host page;
    /// the fireplace is visual-only now — its old procedural crackle was a
    /// constant filtered-noise bed that read as static, so it was removed.
    public class AudioManager : MonoBehaviour
    {
        public Transform player;

        private CharacterController _cc;
        private AudioSource _footSrc;
        private AudioClip _footClip;
        private float _stepT;
        private const int SR = 44100;

        private void Start()
        {
            // footsteps
            _footClip = MakeStep();
            var footGo = new GameObject("Footsteps");
            footGo.transform.SetParent(transform, false);
            _footSrc = footGo.AddComponent<AudioSource>();
            _footSrc.spatialBlend = 0f;
            _footSrc.volume = 0.3f;

            if (player != null) _cc = player.GetComponent<CharacterController>();
        }

        private void Update()
        {
            if (_cc == null) return;
            var v = _cc.velocity;
            v.y = 0;
            float speed = v.magnitude;
            if (speed > 0.6f)
            {
                _stepT -= Time.deltaTime;
                if (_stepT <= 0f)
                {
                    _footSrc.pitch = Random.Range(0.9f, 1.1f);
                    _footSrc.PlayOneShot(_footClip);
                    _stepT = 0.42f;
                }
            }
            else
            {
                _stepT = 0f;
            }
        }

        // ---- procedural clips ----
        private AudioClip MakeStep()
        {
            int n = SR / 8;   // ~0.12s
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float env = Mathf.Exp(-18f * (i / (float)n));
                float body = Mathf.Sin(2f * Mathf.PI * 90f * (i / (float)SR));
                float noise = Random.value * 2f - 1f;
                data[i] = env * (0.6f * body + 0.4f * noise) * 0.8f;
            }
            var clip = AudioClip.Create("step", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
