using UnityEngine;

namespace Journey3D
{
    /// Footsteps, UI SFX, and place BGM (procedural loops — no external files).
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager I { get; private set; }

        public Transform player;

        private CharacterController _cc;
        private AudioSource _footSrc;
        private AudioSource _uiSrc;
        private AudioSource _bgmSrc;
        private AudioClip _footClip;
        private AudioClip _chimeClip;
        private AudioClip _clickClip;
        private AudioClip _tickClip;
        private AudioClip _successClip;
        private float _stepT;
        private string _bgmPlace = "";
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
            _footSrc.volume = 0.3f;

            var uiGo = new GameObject("UI");
            uiGo.transform.SetParent(transform, false);
            _uiSrc = uiGo.AddComponent<AudioSource>();
            _uiSrc.spatialBlend = 0f;
            _uiSrc.volume = 0.45f;

            var bgmGo = new GameObject("BGM");
            bgmGo.transform.SetParent(transform, false);
            _bgmSrc = bgmGo.AddComponent<AudioSource>();
            _bgmSrc.spatialBlend = 0f;
            _bgmSrc.loop = true;
            _bgmSrc.volume = 0f;
            _bgmSrc.playOnAwake = false;

            if (player != null) _cc = player.GetComponent<CharacterController>();

            PlayPlaceMusic("hut");
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

        /// Crossfade to place bed: hut | eden | fair | giza | kolbrin | emerald
        public void PlayPlaceMusic(string placeId)
        {
            if (string.IsNullOrEmpty(placeId)) placeId = "hut";
            if (_bgmPlace == placeId && _bgmSrc != null && _bgmSrc.isPlaying) return;
            _bgmPlace = placeId;
            if (_bgmSrc == null) return;

            var clip = MakePlaceBed(placeId);
            _bgmSrc.Stop();
            _bgmSrc.clip = clip;
            _bgmSrc.volume = 0f;
            _bgmSrc.Play();
            StopAllCoroutines();
            StartCoroutine(FadeBgm(0.22f, 0.9f));
        }

        private System.Collections.IEnumerator FadeBgm(float target, float seconds)
        {
            if (_bgmSrc == null) yield break;
            float start = _bgmSrc.volume;
            float t = 0f;
            while (t < seconds)
            {
                t += Time.unscaledDeltaTime;
                _bgmSrc.volume = Mathf.Lerp(start, target, t / seconds);
                yield return null;
            }
            _bgmSrc.volume = target;
        }

        private void Update()
        {
            if (_cc == null) return;
            var v = _cc.velocity;
            v.y = 0;
            float speed = v.magnitude;
            if (speed > 0.55f)
            {
                _stepT -= Time.deltaTime;
                if (_stepT <= 0f)
                {
                    _footSrc.pitch = Random.Range(0.92f, 1.08f);
                    _footSrc.PlayOneShot(_footClip, 0.55f);
                    _stepT = speed > 3.2f ? 0.34f : 0.44f;
                }
            }
            else
            {
                _stepT = 0f;
            }
        }

        private AudioClip MakePlaceBed(string place)
        {
            // ~8s loop of layered soft tones — unique color per place
            int n = SR * 8;
            var data = new float[n];
            float root, fifth, color, drone, pace;
            switch (place)
            {
                case "eden":
                    root = 196f; fifth = 294f; color = 392f; drone = 98f; pace = 0.35f; break; // G major garden
                case "fair":
                    root = 220f; fifth = 330f; color = 440f; drone = 110f; pace = 0.55f; break; // brighter midway
                case "giza":
                    root = 165f; fifth = 247f; color = 330f; drone = 82f; pace = 0.28f; break; // dry / stone
                case "kolbrin":
                    root = 147f; fifth = 220f; color = 277f; drone = 73f; pace = 0.25f; break; // vault dark
                case "emerald":
                    root = 185f; fifth = 277f; color = 370f; drone = 92f; pace = 0.4f; break; // mystic green
                default: // hut
                    root = 174f; fifth = 261f; color = 349f; drone = 87f; pace = 0.32f; break; // warm hearth
            }

            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float env = 0.55f + 0.45f * Mathf.Sin(t * pace * Mathf.PI * 2f);
                float a = Mathf.Sin(2f * Mathf.PI * drone * t) * 0.22f;
                float b = Mathf.Sin(2f * Mathf.PI * root * t) * 0.16f;
                float c = Mathf.Sin(2f * Mathf.PI * fifth * t) * 0.1f;
                // soft high color, gated
                float gate = 0.5f + 0.5f * Mathf.Sin(t * 0.2f * Mathf.PI * 2f + 1.2f);
                float d = Mathf.Sin(2f * Mathf.PI * color * t) * 0.05f * gate;
                // gentle noise bed
                float noise = (Mathf.PerlinNoise(t * 0.7f, place.GetHashCode() * 0.01f) - 0.5f) * 0.04f;
                data[i] = (a + b + c + d + noise) * env * 0.55f;
            }
            // fade loop edges
            int fade = SR / 4;
            for (int i = 0; i < fade; i++)
            {
                float k = i / (float)fade;
                data[i] *= k;
                data[n - 1 - i] *= k;
            }
            var clip = AudioClip.Create("bgm_" + place, n, 1, SR, false);
            clip.SetData(data, 0);
            return clip;
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
            int n = SR / 3;
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)SR;
                float env = Mathf.Exp(-4.5f * t);
                float a = Mathf.Sin(2f * Mathf.PI * 523f * t);
                float b = Mathf.Sin(2f * Mathf.PI * 784f * t);
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
