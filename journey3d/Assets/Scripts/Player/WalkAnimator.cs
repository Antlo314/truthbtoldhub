using UnityEngine;

namespace Journey3D
{
    /// Drives locomotion via ProceduralLocomotion (always works on Quaternius bones).
    /// Also pokes CharacterRig clips when present for layered polish.
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

            var proc = _appearance.Proc;
            var rig = _appearance.Rig;

            var v = _cc.velocity;
            v.y = 0;
            float speed = v.magnitude;

            if (speed < 0.15f && _pc != null && !_pc.inputLocked)
            {
                float h = Mathf.Abs(Input.GetAxisRaw("Horizontal") + InputHub.MoveTouch.x);
                float vv = Mathf.Abs(Input.GetAxisRaw("Vertical") + InputHub.MoveTouch.y);
                if (h + vv > 0.2f) speed = Mathf.Max(speed, 1.4f);
            }

            bool oneShot = rig != null && (rig.Current == "Interact" || rig.Current == "Wave");

            if (proc != null && proc.Ready && !oneShot)
            {
                if (speed > 3.2f) proc.SetMode(ProceduralLocomotion.Mode.Run);
                else if (speed > 0.28f) proc.SetMode(ProceduralLocomotion.Mode.Walk);
                else proc.SetMode(ProceduralLocomotion.Mode.Idle);
            }

            if (rig != null && !oneShot)
            {
                // Clips may not drive the mesh; procedural LateUpdate is authoritative.
                // Keep clip state in sync for any future systems that read Current.
                if (speed > 3.2f && rig.Has("Run")) rig.Play("Run");
                else if (speed > 0.28f && rig.Has("Walk")) rig.Play("Walk");
                else rig.Play(rig.IdleName(), 0.22f);
            }
        }
    }
}
