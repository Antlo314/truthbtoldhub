using UnityEngine;

namespace Journey3D
{
    /// Procedural ambience — no external audio files. Generates a warm drone,
    /// a fireplace crackle (positional), and footstep ticks while walking.
    public class AudioManager : MonoBehaviour
    {
        public Transform player;
        public Vector3 firePos = new Vector3(6.05f, 1.1f, 0f);

        private CharacterController _cc;
        private AudioSource _footSrc;
        private AudioClip _footClip;
        private float _stepT;
        private const int SR = 44100;

        private void Start()
        {
            // warm room drone (2D, quiet, looping)
            var droneGo = new GameObject("Drone");
            droneGo.transform.SetParent(transform, false);
            var drone = droneGo.AddComponent<AudioSource>();
            drone.clip = MakeDrone(4);
            drone.loop = true;
            drone.volume = 0.16f;
            drone.spatialBlend = 0f;
            drone.Play();

            // fireplace crackle (positional)
            var fireGo = new GameObject("FireCrackle");
            fireGo.transform.position = firePos;
            fireGo.transform.SetParent(transform, false);
            var fire = fireGo.AddComponent<AudioSource>();
            fire.clip = MakeFire(3);
            fire.loop = true;
            fire.volume = 0.35f;
            fire.spatialBlend = 1f;
            fire.minDistance = 1.5f;
            fire.maxDistance = 12f;
            fire.rolloffMode = AudioRolloffMode.Linear;
            fire.Play();

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
        private AudioClip MakeDrone(int seconds)
        {
            int n = SR * seconds;
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float swell = 0.8f + 0.2f * Mathf.Sin(2f * Mathf.PI * 0.08f * t);
                float s = Mathf.Sin(2f * Mathf.PI * 55f * t)
                        + 0.5f * Mathf.Sin(2f * Mathf.PI * 82.4f * t)
                        + 0.28f * Mathf.Sin(2f * Mathf.PI * 110f * t);
                data[i] = 0.16f * s * swell;
            }
            var clip = AudioClip.Create("drone", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip MakeFire(int seconds)
        {
            int n = SR * seconds;
            var data = new float[n];
            float bed = 0f;
            for (int i = 0; i < n; i++)
            {
                // low filtered noise bed + random crackle pops
                bed = bed * 0.96f + (Random.value * 2f - 1f) * 0.04f;
                float pop = 0f;
                if (Random.value < 0.0016f) pop = (Random.value * 2f - 1f) * Random.Range(0.3f, 0.9f);
                data[i] = Mathf.Clamp(bed + pop, -1f, 1f);
            }
            // decay the pops with a short tail
            for (int i = 1; i < n; i++)
                data[i] = Mathf.Lerp(data[i], data[i - 1], 0.25f);
            var clip = AudioClip.Create("fire", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

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
