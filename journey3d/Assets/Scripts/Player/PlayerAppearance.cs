using UnityEngine;

namespace Journey3D
{
    /// Visible form of the player: abstract soul vessel (no human mesh).
    /// Path color tints the vessel. Bob motion is driven lightly in Update.
    public class PlayerAppearance : MonoBehaviour
    {
        private GameObject _vessel;
        private Transform _bobRoot;
        private float _bobPhase;

        public CharacterRig Rig { get; private set; }
        public ProceduralLocomotion Proc { get; private set; }
        public GameObject Model => _vessel;

        public void Apply()
        {
            if (_vessel != null) Object.Destroy(_vessel);
            var c = SaveState.Character;
            var accent = PathAccent(c.path);
            _vessel = PropUtils.SoulVessel(transform, accent);
            _bobRoot = _vessel.transform;
            Rig = null;
            Proc = null;
        }

        private void Update()
        {
            if (_bobRoot == null) return;
            _bobPhase += Time.deltaTime * 2.2f;
            float y = 0.95f + Mathf.Sin(_bobPhase) * 0.06f;
            var cc = GetComponent<CharacterController>();
            float speed = 0f;
            if (cc != null)
            {
                var v = cc.velocity; v.y = 0;
                speed = v.magnitude;
            }
            // lean forward slightly when moving
            float lean = Mathf.Clamp01(speed * 0.15f) * 8f;
            _bobRoot.localPosition = new Vector3(0, y, 0);
            _bobRoot.localRotation = Quaternion.Euler(lean, 0, 0);
        }

        private static Color PathAccent(string path)
        {
            return path switch
            {
                "seer" => UIKit.Hex("#22d3ee"),
                "sentinel" => UIKit.Hex("#fbbf24"),
                "scribe" => UIKit.Hex("#a855f7"),
                "mystic" => UIKit.Hex("#f97316"),
                _ => UIKit.Hex("#fcd34d"),
            };
        }
    }
}
