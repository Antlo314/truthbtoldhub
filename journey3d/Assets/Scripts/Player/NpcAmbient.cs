using UnityEngine;

namespace Journey3D
{
    /// Keeps Truth present: procedural idle always, occasional Wave when near.
    public class NpcAmbient : MonoBehaviour
    {
        public float waveIntervalMin = 12f;
        public float waveIntervalMax = 28f;
        public float waveRadius = 6.5f;

        private CharacterRig _rig;
        private ProceduralLocomotion _proc;
        private Transform _player;
        private float _nextWave;

        public void Bind(CharacterRig rig, Transform player)
        {
            _rig = rig != null ? rig : GetComponent<CharacterRig>();
            _proc = GetComponent<ProceduralLocomotion>();
            _player = player;
            if (_proc != null) _proc.SetMode(ProceduralLocomotion.Mode.Idle);
            Schedule();
        }

        private void Awake()
        {
            if (_rig == null) _rig = GetComponent<CharacterRig>();
            if (_proc == null) _proc = GetComponent<ProceduralLocomotion>();
        }

        private void Schedule()
        {
            _nextWave = Time.time + Random.Range(waveIntervalMin, waveIntervalMax);
        }

        private void Update()
        {
            if (_proc != null) _proc.SetMode(ProceduralLocomotion.Mode.Idle);
            if (_rig == null || _player == null) return;
            if (Time.time < _nextWave) return;
            Schedule();

            float d = Vector3.Distance(transform.position, _player.position);
            if (d > waveRadius) return;
            var cur = _rig.Current;
            if (cur == "Interact" || cur == "Wave") return;
            if (_rig.Has("Wave")) _rig.PlayOnce("Wave");
        }
    }
}
