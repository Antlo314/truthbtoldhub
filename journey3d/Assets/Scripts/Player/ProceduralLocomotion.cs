using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Industry-reliable character motion when FBX retarget fails.
    /// Finds Quaternius (and generic humanoid) bones by name and drives a
    /// real walk / run / idle cycle with foot-plant timing, hip sway, and
    /// arm counter-swing. No AnimationClip required.
    public class ProceduralLocomotion : MonoBehaviour
    {
        public enum Mode { Idle, Walk, Run }

        [Header("Timing")]
        public float walkHz = 1.55f;
        public float runHz = 2.35f;
        public float idleHz = 0.55f;

        [Header("Amplitudes (degrees)")]
        public float legSwingWalk = 32f;
        public float legSwingRun = 42f;
        public float kneeBendWalk = 48f;
        public float kneeBendRun = 62f;
        public float armSwingWalk = 26f;
        public float armSwingRun = 38f;
        public float hipSway = 5f;
        public float spineBob = 3.5f;
        public float idleBreath = 2.2f;
        public float idleWeightShift = 3.5f;

        private Transform _root;           // CharacterArmature or rig root
        private Transform _hips, _spine, _chest, _head;
        private Transform _upL, _loL, _upR, _loR;   // legs
        private Transform _armUL, _armLL, _armUR, _armLR; // arms
        private Transform _footL, _footR;

        private Quaternion _bHips, _bSpine, _bChest, _bHead;
        private Quaternion _bUpL, _bLoL, _bUpR, _bLoR;
        private Quaternion _bAUL, _bALL, _bAUR, _bALR;
        private Quaternion _bFootL, _bFootR;
        private Vector3 _bRootLocalPos;

        private float _phase;
        private Mode _mode = Mode.Idle;
        private Mode _target = Mode.Idle;
        private float _blend; // 0 idle .. 1 full locomotion weight
        private bool _ready;

        public Mode CurrentMode => _mode;
        public bool Ready => _ready;

        public void Bind(Transform characterRoot)
        {
            _ready = false;
            if (characterRoot == null) return;

            // Prefer the armature node so we don't rotate mesh props
            _root = FindDeep(characterRoot, "CharacterArmature") ?? characterRoot;
            _bRootLocalPos = _root.localPosition;

            // Quaternius Ultimate Modular exact hierarchy:
            // CharacterArmature/Root/Body/{Hips, UpperLeg.L/R}
            // CharacterArmature/Root/Body/Hips/Abdomen/Torso/Chest/...
            // CharacterArmature/Root/Foot.L/R
            _hips = FindBone(_root, "Hips", "hip", "Pelvis", "pelvis");
            _spine = FindBone(_root, "Abdomen", "Torso", "Spine", "spine", "Spine1");
            _chest = FindBone(_root, "Chest", "Torso", "Spine2", "UpperChest");
            _head = FindBone(_root, "Head", "head");

            _upL = FindBone(_root, "UpperLeg.L", "LeftUpLeg", "LeftUpperLeg", "UpperLeg_L", "Thigh.L");
            _loL = FindBone(_root, "LowerLeg.L", "LeftLeg", "LeftLowerLeg", "LowerLeg_L", "Shin.L");
            _upR = FindBone(_root, "UpperLeg.R", "RightUpLeg", "RightUpperLeg", "UpperLeg_R", "Thigh.R");
            _loR = FindBone(_root, "LowerLeg.R", "RightLeg", "RightLowerLeg", "LowerLeg_R", "Shin.R");

            _armUL = FindBone(_root, "UpperArm.L", "LeftArm", "LeftUpperArm", "UpperArm_L", "Shoulder.L");
            _armLL = FindBone(_root, "LowerArm.L", "LeftForeArm", "LeftLowerArm", "LowerArm_L", "ForeArm.L");
            _armUR = FindBone(_root, "UpperArm.R", "RightArm", "RightUpperArm", "UpperArm_R", "Shoulder.R");
            _armLR = FindBone(_root, "LowerArm.R", "RightForeArm", "RightLowerArm", "LowerArm_R", "ForeArm.R");

            _footL = FindBone(_root, "Foot.L", "LeftFoot", "Foot_L", "LeftAnkle");
            _footR = FindBone(_root, "Foot.R", "RightFoot", "Foot_R", "RightAnkle");

            // If Quaternius uses numbered bones, fall back to heuristic under Hips
            if (_upL == null || _upR == null)
                HeuristicLegsFromHips();

            // Last resort: walk the full tree and assign by index under Hips
            if (_upL == null || _upR == null)
                AssignBySpatialHeuristic(characterRoot);

            CaptureBind();
            int parts = CountBound();
            _ready = parts >= 2; // even hips-only gets idle breath; legs preferred
            // Always ready if we found ANY transform tree — body bob still works
            if (!_ready && _root != null)
            {
                _ready = true; // root bob + whatever we have
            }
            Debug.Log($"J3D proc loco '{characterRoot.name}': ready={_ready} parts={parts} " +
                      $"hips={Name(_hips)} upL={Name(_upL)} loL={Name(_loL)} upR={Name(_upR)} loR={Name(_loR)} " +
                      $"armL={Name(_armUL)} armR={Name(_armUR)} spine={Name(_spine)}");
            if (_upL == null)
                LogAllBones(characterRoot, 0, 60);
        }

        private void AssignBySpatialHeuristic(Transform characterRoot)
        {
            var all = new List<Transform>();
            CollectAll(characterRoot, all);
            // candidates: bones roughly mid-height that aren't mesh parts
            var limbs = new List<Transform>();
            foreach (var t in all)
            {
                string n = t.name.ToLowerInvariant();
                if (n.Contains("body") || n.Contains("mesh") || n.Contains("head") ||
                    n.Contains("foot") || n.Contains("hand") || n.Contains("finger")) continue;
                if (t.childCount == 0) continue;
                limbs.Add(t);
            }
            // pick two deepest branches that look opposite in local X
            if (_hips == null)
            {
                foreach (var t in all)
                    if (t.name.IndexOf("hip", System.StringComparison.OrdinalIgnoreCase) >= 0 ||
                        t.name.IndexOf("pelvis", System.StringComparison.OrdinalIgnoreCase) >= 0)
                    { _hips = t; break; }
            }
            if (_hips == null && all.Count > 1) _hips = characterRoot;

            // children of hips sorted by x
            if (_hips != null && _hips.childCount >= 2)
            {
                var kids = new List<Transform>();
                for (int i = 0; i < _hips.childCount; i++) kids.Add(_hips.GetChild(i));
                kids.Sort((a, b) => a.localPosition.x.CompareTo(b.localPosition.x));
                // leftmost with children = left leg-ish, rightmost = right leg
                Transform left = null, right = null;
                foreach (var k in kids)
                {
                    string n = k.name.ToLowerInvariant();
                    if (n.Contains("spine") || n.Contains("chest") || n.Contains("neck") || n.Contains("head")) continue;
                    if (left == null) left = k;
                    right = k;
                }
                if (_upL == null && left != null) { _upL = left; if (left.childCount > 0) _loL = left.GetChild(0); }
                if (_upR == null && right != null && right != left) { _upR = right; if (right.childCount > 0) _loR = right.GetChild(0); }
            }
        }

        private static void CollectAll(Transform t, List<Transform> into)
        {
            into.Add(t);
            for (int i = 0; i < t.childCount; i++) CollectAll(t.GetChild(i), into);
        }

        private static void LogAllBones(Transform t, int depth, int budget)
        {
            if (budget <= 0) return;
            Debug.Log($"J3D bone {new string('-', depth)}{t.name}");
            budget--;
            for (int i = 0; i < t.childCount && budget > 0; i++)
                LogAllBones(t.GetChild(i), depth + 1, budget);
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
            if (_spine) n++;
            return n;
        }

        public void SetMode(Mode mode)
        {
            _target = mode;
        }

        private void LateUpdate()
        {
            if (!_ready) return;

            // Smooth mode blend
            float targetBlend = _target == Mode.Idle ? 0f : 1f;
            _blend = Mathf.MoveTowards(_blend, targetBlend, Time.deltaTime * 4.5f);
            if (_blend > 0.15f) _mode = _target;
            else _mode = Mode.Idle;

            float hz = _mode == Mode.Run ? runHz : _mode == Mode.Walk ? walkHz : idleHz;
            _phase += Time.deltaTime * hz * Mathf.PI * 2f;
            if (_phase > Mathf.PI * 200f) _phase -= Mathf.PI * 200f;

            float t = _phase;
            float s = Mathf.Sin(t);
            float c = Mathf.Cos(t);
            // second harmonic for knee snap
            float s2 = Mathf.Sin(t * 2f);

            if (_mode == Mode.Idle || _blend < 0.05f)
            {
                ApplyIdle(t);
                return;
            }

            float legA = Mathf.Lerp(legSwingWalk, legSwingRun, _mode == Mode.Run ? 1f : 0f) * _blend;
            float kneeA = Mathf.Lerp(kneeBendWalk, kneeBendRun, _mode == Mode.Run ? 1f : 0f) * _blend;
            float armA = Mathf.Lerp(armSwingWalk, armSwingRun, _mode == Mode.Run ? 1f : 0f) * _blend;

            // Legs: opposite phase, pitch around local X (forward swing)
            // Knee only bends on the recovery half (positive swing)
            float leftLeg = s * legA;
            float rightLeg = -s * legA;
            float leftKnee = Mathf.Max(0f, -s) * kneeA + Mathf.Max(0f, s2) * (kneeA * 0.15f);
            float rightKnee = Mathf.Max(0f, s) * kneeA + Mathf.Max(0f, -s2) * (kneeA * 0.15f);

            if (_upL) _upL.localRotation = _bUpL * Quaternion.Euler(leftLeg, 0, 0);
            if (_loL) _loL.localRotation = _bLoL * Quaternion.Euler(leftKnee, 0, 0);
            if (_upR) _upR.localRotation = _bUpR * Quaternion.Euler(rightLeg, 0, 0);
            if (_loR) _loR.localRotation = _bLoR * Quaternion.Euler(rightKnee, 0, 0);

            // Feet plant: slight counter-pitch
            if (_footL) _footL.localRotation = _bFootL * Quaternion.Euler(-leftLeg * 0.35f - leftKnee * 0.2f, 0, 0);
            if (_footR) _footR.localRotation = _bFootR * Quaternion.Euler(-rightLeg * 0.35f - rightKnee * 0.2f, 0, 0);

            // Arms counter-swing
            if (_armUL) _armUL.localRotation = _bAUL * Quaternion.Euler(-leftLeg * (armA / Mathf.Max(1f, legA)), 0, 6f * _blend);
            if (_armUR) _armUR.localRotation = _bAUR * Quaternion.Euler(-rightLeg * (armA / Mathf.Max(1f, legA)), 0, -6f * _blend);
            if (_armLL) _armLL.localRotation = _bALL * Quaternion.Euler(Mathf.Max(0f, s) * 18f * _blend, 0, 0);
            if (_armLR) _armLR.localRotation = _bALR * Quaternion.Euler(Mathf.Max(0f, -s) * 18f * _blend, 0, 0);

            // Hip sway + vertical bob on armature root
            if (_hips)
                _hips.localRotation = _bHips * Quaternion.Euler(s2 * spineBob * 0.4f * _blend, s * hipSway * _blend, c * hipSway * 0.6f * _blend);
            if (_spine)
                _spine.localRotation = _bSpine * Quaternion.Euler(s2 * spineBob * _blend, 0, -s * hipSway * 0.4f * _blend);
            if (_chest)
                _chest.localRotation = _bChest * Quaternion.Euler(-s2 * spineBob * 0.5f * _blend, 0, 0);
            if (_head)
                _head.localRotation = _bHead * Quaternion.Euler(-s2 * 1.5f * _blend, s * 2f * _blend, 0);

            // Whole-body vertical bob (root)
            float bob = Mathf.Abs(s2) * 0.028f * _blend * (_mode == Mode.Run ? 1.35f : 1f);
            _root.localPosition = _bRootLocalPos + Vector3.up * bob;
        }

        private void ApplyIdle(float t)
        {
            float breath = Mathf.Sin(t) * idleBreath;
            float shift = Mathf.Sin(t * 0.5f) * idleWeightShift;

            if (_hips)
                _hips.localRotation = _bHips * Quaternion.Euler(0, 0, shift * 0.35f);
            if (_spine)
                _spine.localRotation = _bSpine * Quaternion.Euler(breath * 0.6f, 0, shift * 0.2f);
            if (_chest)
                _chest.localRotation = _bChest * Quaternion.Euler(breath, 0, 0);
            if (_head)
                _head.localRotation = _bHead * Quaternion.Euler(-breath * 0.4f, Mathf.Sin(t * 0.37f) * 2.5f, 0);

            // Soft weight shift on legs
            if (_upL) _upL.localRotation = _bUpL * Quaternion.Euler(shift * 0.4f, 0, shift * 0.25f);
            if (_upR) _upR.localRotation = _bUpR * Quaternion.Euler(-shift * 0.4f, 0, shift * 0.25f);
            if (_loL) _loL.localRotation = _bLoL * Quaternion.Euler(Mathf.Abs(shift) * 0.5f, 0, 0);
            if (_loR) _loR.localRotation = _bLoR * Quaternion.Euler(Mathf.Abs(shift) * 0.5f, 0, 0);

            // Arms hang with micro motion
            if (_armUL) _armUL.localRotation = _bAUL * Quaternion.Euler(breath * 0.5f, 0, 2f + shift * 0.3f);
            if (_armUR) _armUR.localRotation = _bAUR * Quaternion.Euler(breath * 0.5f, 0, -2f + shift * 0.3f);

            _root.localPosition = Vector3.Lerp(_root.localPosition, _bRootLocalPos + Vector3.up * (Mathf.Sin(t) * 0.008f), 0.2f);
        }

        // ---------- bone finding ----------
        private void HeuristicLegsFromHips()
        {
            if (_hips == null) return;
            // First two deep children that look like limbs
            var legs = new List<Transform>();
            CollectByHint(_hips, legs, new[] { "leg", "thigh", "upleg", "upperleg" }, 8);
            if (legs.Count >= 2)
            {
                // sort by x position so left is -x
                legs.Sort((a, b) => a.position.x.CompareTo(b.position.x));
                if (_upL == null) _upL = legs[0];
                if (_upR == null) _upR = legs[legs.Count - 1];
                if (_loL == null && _upL != null && _upL.childCount > 0) _loL = _upL.GetChild(0);
                if (_loR == null && _upR != null && _upR.childCount > 0) _loR = _upR.GetChild(0);
            }
        }

        private static void CollectByHint(Transform t, List<Transform> into, string[] hints, int max)
        {
            if (into.Count >= max) return;
            string n = t.name.ToLowerInvariant();
            foreach (var h in hints)
            {
                if (n.Contains(h)) { into.Add(t); break; }
            }
            for (int i = 0; i < t.childCount; i++)
                CollectByHint(t.GetChild(i), into, hints, max);
        }

        private static Transform FindBone(Transform root, params string[] names)
        {
            foreach (var name in names)
            {
                var t = FindDeep(root, name);
                if (t != null) return t;
            }
            // contains match (case insensitive)
            foreach (var name in names)
            {
                var t = FindContains(root, name.ToLowerInvariant());
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

        private static Transform FindContains(Transform root, string part)
        {
            if (root.name.ToLowerInvariant().Contains(part)) return root;
            for (int i = 0; i < root.childCount; i++)
            {
                var f = FindContains(root.GetChild(i), part);
                if (f != null) return f;
            }
            return null;
        }

        private static string Name(Transform t) => t != null ? t.name : "null";
    }
}
