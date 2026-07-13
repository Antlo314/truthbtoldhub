using UnityEngine;

namespace Journey3D
{
    /// Smooth locomotion state machine over Quaternius clips (or procedural).
    public class WalkAnimator : MonoBehaviour
    {
        private PlayerAppearance _appearance;
        private CharacterController _cc;
        private PlayerController _pc;
        private float _smoothSpeed;
        private string _locState = "Idle";

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

            float speed = _pc != null ? _pc.PlanarSpeed : new Vector3(_cc.velocity.x, 0, _cc.velocity.z).magnitude;

            if (speed < 0.15f && _pc != null && !_pc.inputLocked)
            {
                float h = Mathf.Abs(Input.GetAxisRaw("Horizontal") + InputHub.MoveTouch.x);
                float vv = Mathf.Abs(Input.GetAxisRaw("Vertical") + InputHub.MoveTouch.y);
                if (h + vv > 0.25f) speed = Mathf.Max(speed, 1.2f);
            }

            // Smooth speed so Idle↔Walk doesn't chatter
            _smoothSpeed = Mathf.Lerp(_smoothSpeed, speed, 1f - Mathf.Exp(-8f * Time.deltaTime));

            bool oneShot = rig != null && IsOneShot(rig.Current);
            bool useClips = rig != null && rig.ClipsBound && CharacterRig.PlayAnimations;

            if (proc != null)
                proc.Active = !useClips;

            if (oneShot) return;

            // Hysteresis — enter walk > 0.4, stay walking until < 0.15
            string want = "Idle";
            if (_smoothSpeed > 3.4f && (useClips ? rig.Has("Run") : true))
                want = "Run";
            else if (_smoothSpeed > 0.4f || (_locState == "Walk" && _smoothSpeed > 0.15f)
                || (_locState == "Run" && _smoothSpeed > 0.15f && _smoothSpeed <= 3.4f))
                want = _smoothSpeed > 3.4f && useClips && rig.Has("Run") ? "Run" : "Walk";

            if (want == "Run" && useClips && !rig.Has("Run")) want = "Walk";

            if (useClips)
            {
                // Longer crossfades = smoother gait transitions
                if (want == "Run")
                    TryPlay(rig, "Run", 0.28f);
                else if (want == "Walk" && rig.Has("Walk"))
                    TryPlay(rig, "Walk", 0.3f);
                else
                    TryPlay(rig, rig.IdleName(), 0.32f);
                _locState = want == "Idle" ? "Idle" : want;
                return;
            }

            if (proc != null && proc.Ready)
            {
                proc.Active = true;
                if (want == "Run") proc.SetMode(ProceduralLocomotion.Mode.Run);
                else if (want == "Walk") proc.SetMode(ProceduralLocomotion.Mode.Walk);
                else proc.SetMode(ProceduralLocomotion.Mode.Idle);
                _locState = want;
            }
        }

        private static bool IsOneShot(string current)
        {
            if (string.IsNullOrEmpty(current)) return false;
            if (current == "Interact" || current == "Wave" || current == "Punch" || current == "Hit")
                return true;
            if (current.StartsWith("Attack") || current.StartsWith("Sword") || current.StartsWith("Hit"))
                return true;
            return false;
        }

        private void TryPlay(CharacterRig rig, string clip, float fade)
        {
            if (rig == null || string.IsNullOrEmpty(clip)) return;
            // Match clip rate to planar speed for less foot-skate
            if (clip == "Walk" || clip == "Run")
            {
                float s = clip == "Run"
                    ? 0.92f + Mathf.Clamp01(_smoothSpeed / 5f) * 0.18f
                    : 0.85f + Mathf.Clamp01(_smoothSpeed / 3.5f) * 0.28f;
                rig.SetSpeed(clip, s);
            }
            rig.Play(clip, fade);
        }
    }
}
