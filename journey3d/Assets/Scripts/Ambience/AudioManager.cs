using UnityEngine;

namespace Journey3D
{
    /// Footsteps + soft station-open chime (procedural, no external files).
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager I { get; private set; }

        public Transform player;

        private CharacterController _cc;
        private AudioSource _footSrc;
        private AudioSource _uiSrc;
        private AudioClip _footClip;
        private AudioClip _chimeClip;
        private AudioClip _clickClip;
        private AudioClip _tickClip;
        private AudioClip _successClip;
        private float _stepT;
        private const int SR = 44100;

        private void Awake()
        {
            I = this;
        }

        private void Start()
        {
            _footClip = MakeStep();
            _chimeClip = MakeChime();
            _clickClip = MakeClick();
            _tickClip = MakeTick();
            _successClip = MakeSuccess();

            var footGo = new GameObject("Footsteps");
            footGo.transform.SetParent(transform, false);
            _footSrc = footGo.AddComponent<AudioSource>();
            _footSrc.spatialBlend = 0f;
            _footSrc.volume = 0.32f;

            var uiGo = new GameObject("UI");
            uiGo.transform.SetParent(transform, false);
            _uiSrc = uiGo.AddComponent<AudioSource>();
            _uiSrc.spatialBlend = 0f;
            _uiSrc.volume = 0.45f;

            if (player != null) _cc = player.GetComponent<CharacterController>();
        }

        private void OnDestroy()
        {
            if (I == this) I = null;
        }

        public void PlayStationOpen()
        {
            if (_uiSrc == null || _chimeClip == null) return;
            _uiSrc.pitch = Random.Range(0.96f, 1.04f);
            _uiSrc.PlayOneShot(_chimeClip, 0.7f);
        }

        public void PlayClick()
        {
            if (_uiSrc == null || _clickClip == null) return;
            _uiSrc.pitch = Random.Range(0.97f, 1.05f);
            _uiSrc.PlayOneShot(_clickClip, 0.55f);
        }

        public void PlayTick()
        {
            if (_uiSrc == null || _tickClip == null) return;
            _uiSrc.pitch = Random.Range(0.98f, 1.06f);
            _uiSrc.PlayOneShot(_tickClip, 0.28f);
        }

        public void PlaySuccess()
        {
            if (_uiSrc == null || _successClip == null) return;
            _uiSrc.pitch = 1f;
            _uiSrc.PlayOneShot(_successClip, 0.75f);
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
                    _stepT = speed > 3.2f ? 0.32f : 0.42f;
                }
            }
            else
            {
                _stepT = 0f;
            }
        }

        private AudioClip MakeStep()
        {
            int n = SR / 8;
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

        private AudioClip MakeChime()
        {
            int n = SR / 3; // ~0.33s
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float env = Mathf.Exp(-4.5f * t);
                float a = Mathf.Sin(2f * Mathf.PI * 523f * t); // C5
                float b = Mathf.Sin(2f * Mathf.PI * 784f * t); // G5
                data[i] = env * (0.55f * a + 0.35f * b) * 0.55f;
            }
            var clip = AudioClip.Create("chime", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip MakeClick()
        {
            int n = SR / 20;
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float env = Mathf.Exp(-55f * t);
                data[i] = env * Mathf.Sin(2f * Mathf.PI * 880f * t) * 0.55f;
            }
            var clip = AudioClip.Create("click", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip MakeTick()
        {
            int n = SR / 28;
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float env = Mathf.Exp(-80f * t);
                data[i] = env * Mathf.Sin(2f * Mathf.PI * 1200f * t) * 0.35f;
            }
            var clip = AudioClip.Create("tick", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip MakeSuccess()
        {
            int n = SR / 2;
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float env = Mathf.Exp(-3.2f * t);
                float a = Mathf.Sin(2f * Mathf.PI * 392f * t);
                float b = Mathf.Sin(2f * Mathf.PI * 523f * t);
                float c = Mathf.Sin(2f * Mathf.PI * 659f * t);
                data[i] = env * (0.4f * a + 0.35f * b + 0.25f * c) * 0.5f;
            }
            var clip = AudioClip.Create("success", n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
