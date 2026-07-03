using UnityEngine;

namespace Journey3D
{
    /// Drives real locomotion clips (Idle / Walk / Run) on the player's
    /// Quaternius rig from CharacterController speed. Survives model swaps
    /// in the soul creator by re-reading the rig from PlayerAppearance.
    public class WalkAnimator : MonoBehaviour
    {
        private PlayerAppearance _appearance;
        private CharacterController _cc;

        public void Bind(PlayerAppearance appearance, CharacterController cc)
        {
            _appearance = appearance;
            _cc = cc;
        }

        private void Update()
        {
            if (_appearance == null || _cc == null) return;
            var rig = _appearance.Rig;
            if (rig == null) return;

            var v = _cc.velocity;
            v.y = 0;
            float speed = v.magnitude;

            if (speed > 3.2f && rig.Has("Run")) rig.Play("Run");
            else if (speed > 0.35f && rig.Has("Walk")) rig.Play("Walk");
            else rig.Play(rig.IdleName(), 0.25f);
        }
    }
}
