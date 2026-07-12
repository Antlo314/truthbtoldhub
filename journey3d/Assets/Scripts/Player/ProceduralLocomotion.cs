using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Bone-driven walk when FBX clips are unavailable.
    /// Swing axes are AUTO-CALIBRATED to the character's right vector so legs
    /// stride forward/back (not side-to-side) regardless of bone roll.
    public class ProceduralLocomotion : MonoBehaviour
    {
        public enum Mode { Idle, Walk, Run }

        [Header("Timing")]
        public float walkHz = 1.65f;
        public float runHz = 2.4f;
        public float idleHz = 0.5f;

        [Header("Amplitudes (degrees)")]
        public float legSwingWalk = 28f;
        public float legSwingRun = 38f;
        public float kneeBendWalk = 55f;
        public float kneeBendRun = 70f;
        public float armSwingWalk = 24f;
        public float armSwingRun = 36f;
        public float hipSway = 4f;
        public float spineBob = 3f;
        public float idleBreath = 2f;

        /// When true, LateUpdate drives bones. Set false when CharacterRig clips own the mesh.
        public bool Active = true;

        private Transform _character;      // facing reference (wrapper)
        private Transform _root;           // CharacterArmature
        private Transform _hips, _spine, _chest, _head;
        private Transform _upL, _loL, _upR, _loR;
        private Transform _armUL, _armLL, _armUR, _armLR;
        private Transform _footL, _footR;

        private Quaternion _bHips, _bSpine, _bChest, _bHead;
        private Quaternion _bUpL, _bLoL, _bUpR, _bLoR;
        private Quaternion _bAUL, _bALL, _bAUR, _bALR;
        private Quaternion _bFootL, _bFootR;
        private Vector3 _bRootLocalPos;

        // Local swing axes in each bone's bind-pose space (unit vectors)
        private Vector3 _axUpL, _axLoL, _axUpR, _axLoR;
        private Vector3 _axAUL, _axALL, _axAUR, _axALR;
        private Vector3 _axHips, _axSpine;

        private float _phase;
        private Mode _mode = Mode.Idle;
        private Mode _target = Mode.Idle;
        private float _blend;
        private bool _ready;

        public Mode CurrentMode => _mode;
        public bool Ready => _ready;

        public void Bind(Transform characterRoot)
        {
            _ready = false;
            Active = true;
            if (characterRoot == null) return;

            // Facing reference: prefer outer wrapper (player-facing), else root
            _character = characterRoot.parent != null ? characterRoot.parent : characterRoot;
            _root = FindDeep(characterRoot, "CharacterArmature") ?? characterRoot;
            _bRootLocalPos = _root.localPosition;

            _hips = FindBone(_root, "Hips");
            _spine = FindBone(_root, "Abdomen", "Torso", "Spine");
            _chest = FindBone(_root, "Chest");
            _head = FindBone(_root, "Head");

            _upL = FindBone(_root, "UpperLeg.L");
            _loL = FindBone(_root, "LowerLeg.L");
            _upR = FindBone(_root, "UpperLeg.R");
            _loR = FindBone(_root, "LowerLeg.R");
            _armUL = FindBone(_root, "UpperArm.L");
            _armLL = FindBone(_root, "LowerArm.L");
            _armUR = FindBone(_root, "UpperArm.R");
            _armLR = FindBone(_root, "LowerArm.R");
            _footL = FindBone(_root, "Foot.L");
            _footR = FindBone(_root, "Foot.R");

            if (_upL == null || _upR == null)
                HeuristicLegs();

            CaptureBind();
            CalibrateAxes();

            int parts = CountBound();
            _ready = _upL != null && _upR != null;
            if (!_ready && _root != null) _ready = true;

            Debug.Log($"J3D proc loco '{characterRoot.name}': ready={_ready} active={Active} " +
                      $"upL={Name(_upL)} axL={_axUpL} upR={Name(_upR)} axR={_axUpR}");
        }

        /// World axis for hip flexion = character's RIGHT (legs swing in the sagittal plane).
        private void CalibrateAxes()
        {
            Vector3 worldFlex = _character != null ? _character.right : Vector3.right;
            // Prefer slightly tilted if character not yet facing
            if (worldFlex.sqrMagnitude < 0.01f) worldFlex = Vector3.right;
            worldFlex.Normalize();

            _axUpL = LocalAxis(_upL, worldFlex);
            _axLoL = LocalAxis(_loL, worldFlex);
            _axUpR = LocalAxis(_upR, worldFlex);
            _axLoR = LocalAxis(_loR, worldFlex);
            _axAUL = LocalAxis(_armUL, worldFlex);
            _axALL = LocalAxis(_armLL, worldFlex);
            _axAUR = LocalAxis(_armUR, worldFlex);
            _axALR = LocalAxis(_armLR, worldFlex);
            _axHips = LocalAxis(_hips, worldFlex);
            _axSpine = LocalAxis(_spine, worldFlex);

            // Safety defaults if bone missing
            if (_axUpL.sqrMagnitude < 0.01f) _axUpL = Vector3.right;
            if (_axUpR.sqrMagnitude < 0.01f) _axUpR = Vector3.right;
            if (_axLoL.sqrMagnitude < 0.01f) _axLoL = Vector3.right;
            if (_axLoR.sqrMagnitude < 0.01f) _axLoR = Vector3.right;
        }

        private static Vector3 LocalAxis(Transform bone, Vector3 worldAxis)
        {
            if (bone == null) return Vector3.right;
            // Axis in bone-local space that matches world flex axis at bind pose
            Vector3 local = bone.InverseTransformDirection(worldAxis);
            if (local.sqrMagnitude < 1e-6f) return Vector3.right;
            return local.normalized;
        }

        private void CaptureBind()
        {
            if (_hips) _bHips = _hips.localRotation;
            if (_spine) _bSpine = _spine.localRotation;
            if (_chest) _bChest = _chest.localRotation;
            if (_head) _bHead = _head.localRotation;
            if (_upL) _bUpL = _upL.localRotation;
            if (_loL) _bLoL = _loL.localRotation;
            if (_upR) _bUpR = _upR.localRotation;
            if (_loR) _bLoR = _loR.localRotation;
            if (_armUL) _bAUL = _armUL.localRotation;
            if (_armLL) _bALL = _armLL.localRotation;
            if (_armUR) _bAUR = _armUR.localRotation;
            if (_armLR) _bALR = _armLR.localRotation;
            if (_footL) _bFootL = _footL.localRotation;
            if (_footR) _bFootR = _footR.localRotation;
        }

        private int CountBound()
        {
            int n = 0;
            if (_hips) n++;
            if (_upL) n++; if (_loL) n++;
            if (_upR) n++; if (_loR) n++;
            if (_armUL) n++; if (_armUR) n++;
            return n;
        }

        public void SetMode(Mode mode) => _target = mode;

        private void LateUpdate()
        {
            if (!_ready || !Active) return;

            // Re-calibrate if character turned a lot (axes are in bone space so usually stable)
            float targetBlend = _target == Mode.Idle ? 0f : 1f;
            _blend = Mathf.MoveTowards(_blend, targetBlend, Time.deltaTime * 5f);
            _mode = _blend > 0.12f ? _target : Mode.Idle;

            float hz = _mode == Mode.Run ? runHz : _mode == Mode.Walk ? walkHz : idleHz;
            _phase += Time.deltaTime * hz * Mathf.PI * 2f;

            float t = _phase;
            float s = Mathf.Sin(t);
            float s2 = Mathf.Sin(t * 2f);

            if (_mode == Mode.Idle || _blend < 0.05f)
            {
                ApplyIdle(t);
                return;
            }

            float legA = Mathf.Lerp(legSwingWalk, legSwingRun, _mode == Mode.Run ? 1f : 0f) * _blend;
            float kneeA = Mathf.Lerp(kneeBendWalk, kneeBendRun, _mode == Mode.Run ? 1f : 0f) * _blend;
            float armA = Mathf.Lerp(armSwingWalk, armSwingRun, _mode == Mode.Run ? 1f : 0f) * _blend;

            // Sagittal swing: opposite legs, forward/back via calibrated axis
            float leftSwing = s * legA;
            float rightSwing = -s * legA;
            // Knee only folds on recovery (when thigh swings back)
            float leftKnee = Mathf.Max(0f, -s) * kneeA;
            float rightKnee = Mathf.Max(0f, s) * kneeA;

            Apply(_upL, _bUpL, _axUpL, leftSwing);
            Apply(_loL, _bLoL, _axLoL, leftKnee);
            Apply(_upR, _bUpR, _axUpR, rightSwing);
            Apply(_loR, _bLoR, _axLoR, rightKnee);

            if (_footL) Apply(_footL, _bFootL, _axUpL, -leftSwing * 0.35f - leftKnee * 0.15f);
            if (_footR) Apply(_footR, _bFootR, _axUpR, -rightSwing * 0.35f - rightKnee * 0.15f);

            // Arms counter-swing on same flex axis
            Apply(_armUL, _bAUL, _axAUL, -leftSwing * (armA / Mathf.Max(8f, legA)));
            Apply(_armUR, _bAUR, _axAUR, -rightSwing * (armA / Mathf.Max(8f, legA)));
            Apply(_armLL, _bALL, _axALL, Mathf.Max(0f, s) * 16f * _blend);
            Apply(_armLR, _bALR, _axALR, Mathf.Max(0f, -s) * 16f * _blend);

            // Subtle torso
            if (_hips) Apply(_hips, _bHips, _axHips, s2 * spineBob * 0.35f * _blend);
            if (_spine) Apply(_spine, _bSpine, _axSpine, s2 * spineBob * _blend);
            if (_chest) Apply(_chest, _bChest, _axSpine, -s2 * spineBob * 0.45f * _blend);
            if (_head) Apply(_head, _bHead, _axSpine, -s2 * 1.2f * _blend);

            float bob = Mathf.Abs(s2) * 0.025f * _blend * (_mode == Mode.Run ? 1.3f : 1f);
            _root.localPosition = _bRootLocalPos + Vector3.up * bob;
        }

        private static void Apply(Transform bone, Quaternion bind, Vector3 localAxis, float degrees)
        {
            if (bone == null || localAxis.sqrMagnitude < 1e-6f) return;
            bone.localRotation = bind * Quaternion.AngleAxis(degrees, localAxis);
        }

        private void ApplyIdle(float t)
        {
            float breath = Mathf.Sin(t) * idleBreath;
            float shift = Mathf.Sin(t * 0.47f) * 2.5f;

            if (_spine) Apply(_spine, _bSpine, _axSpine, breath * 0.7f);
            if (_chest) Apply(_chest, _bChest, _axSpine, breath);
            if (_head) Apply(_head, _bHead, _axSpine, -breath * 0.35f);
            if (_hips) Apply(_hips, _bHips, Vector3.up, shift * 0.4f); // slight yaw weight shift

            // Soft knee ease
            Apply(_upL, _bUpL, _axUpL, shift * 0.35f);
            Apply(_upR, _bUpR, _axUpR, -shift * 0.35f);
            Apply(_loL, _bLoL, _axLoL, Mathf.Abs(shift) * 0.6f);
            Apply(_loR, _bLoR, _axLoR, Mathf.Abs(shift) * 0.6f);

            Apply(_armUL, _bAUL, _axAUL, breath * 0.4f);
            Apply(_armUR, _bAUR, _axAUR, breath * 0.4f);

            _root.localPosition = Vector3.Lerp(_root.localPosition,
                _bRootLocalPos + Vector3.up * (Mathf.Sin(t) * 0.007f), 0.25f);
        }

        private void HeuristicLegs()
        {
            // already exact-named for Quaternius; nothing extra
        }

        private static Transform FindBone(Transform root, params string[] names)
        {
            foreach (var name in names)
            {
                var t = FindDeep(root, name);
                if (t != null) return t;
            }
            return null;
        }

        private static Transform FindDeep(Transform root, string exact)
        {
            if (root.name == exact) return root;
            for (int i = 0; i < root.childCount; i++)
            {
                var f = FindDeep(root.GetChild(i), exact);
                if (f != null) return f;
            }
            return null;
        }

        private static string Name(Transform t) => t != null ? t.name : "null";
    }
}
