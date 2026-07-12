using UnityEngine;

namespace Journey3D
{
    /// Prefers real Quaternius Walk/Run/Idle clips; falls back to calibrated
    /// procedural stride (forward/back, not side sway).
    public class WalkAnimator : MonoBehaviour
    {
        private PlayerAppearance _appearance;
        private CharacterController _cc;
        private PlayerController _pc;

        public void Bind(PlayerAppearance appearance, CharacterController cc)
        {
            _appearance = appearance;
            _cc = cc;
            _pc = GetComponent<PlayerController>();
        }

        private void Update()
        {
            if (_appearance == null || _cc == null) return;

            var rig = _appearance.Rig;
            var proc = _appearance.Proc;

            var v = _cc.velocity;
            v.y = 0;
            float speed = v.magnitude;

            if (speed < 0.12f && _pc != null && !_pc.inputLocked)
            {
                float h = Mathf.Abs(Input.GetAxisRaw("Horizontal") + InputHub.MoveTouch.x);
                float vv = Mathf.Abs(Input.GetAxisRaw("Vertical") + InputHub.MoveTouch.y);
                if (h + vv > 0.2f) speed = Mathf.Max(speed, 1.5f);
            }

            bool oneShot = rig != null && (rig.Current == "Interact" || rig.Current == "Wave");
            bool useClips = rig != null && rig.ClipsBound && CharacterRig.PlayAnimations;

            // Keep procedural off while clips drive the mesh
            if (proc != null)
                proc.Active = !useClips || !rig.ClipsBound;

            if (oneShot) return;

            if (useClips)
            {
                if (speed > 3.4f && rig.Has("Run")) rig.Play("Run", 0.12f);
                else if (speed > 0.25f && rig.Has("Walk")) rig.Play("Walk", 0.12f);
                else rig.Play(rig.IdleName(), 0.18f);
                return;
            }

            // Procedural fallback — axes calibrated to character.right (true stride)
            if (proc != null && proc.Ready)
            {
                proc.Active = true;
                if (speed > 3.4f) proc.SetMode(ProceduralLocomotion.Mode.Run);
                else if (speed > 0.25f) proc.SetMode(ProceduralLocomotion.Mode.Walk);
                else proc.SetMode(ProceduralLocomotion.Mode.Idle);
            }
        }
    }
}
