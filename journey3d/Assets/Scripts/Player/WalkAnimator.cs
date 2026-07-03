using System.Collections.Generic;
using UnityEngine;

namespace Journey3D
{
    /// Procedural walk cycle for the multi-part avatar: legs and arms swing
    /// from hip/shoulder pivots, the body bobs. Parts are found by name and
    /// re-parented under pivot transforms at setup.
    public class WalkAnimator : MonoBehaviour
    {
        private Transform _hipL, _hipR, _shoulderL, _shoulderR;
        private Transform _body;
        private Vector3 _bodyBase;
        private float _phase;
        private CharacterController _cc;

        public void Bind(Transform avatarRoot, CharacterController cc)
        {
            _cc = cc;
            _body = avatarRoot;
            _bodyBase = avatarRoot.localPosition;

            _hipL = MakePivot(avatarRoot, new Vector3(-0.13f, 0.72f, 0), "leg_l", "boot_l");
            _hipR = MakePivot(avatarRoot, new Vector3(0.13f, 0.72f, 0), "leg_r", "boot_r");
            _shoulderL = MakePivot(avatarRoot, new Vector3(-0.31f, 1.3f, 0), "arm_l", "hand_l");
            _shoulderR = MakePivot(avatarRoot, new Vector3(0.31f, 1.3f, 0), "arm_r", "hand_r");
        }

        private static Transform MakePivot(Transform root, Vector3 localPos, params string[] partNames)
        {
            var pivot = new GameObject("pivot").transform;
            pivot.SetParent(root, false);
            pivot.localPosition = localPos;
            foreach (var n in partNames)
            {
                var part = FindDeep(root, n);
                if (part != null) part.SetParent(pivot, true);
            }
            return pivot;
        }

        private static Transform FindDeep(Transform root, string name)
        {
            foreach (var t in root.GetComponentsInChildren<Transform>())
                if (t.name.StartsWith(name)) return t;
            return null;
        }

        private void Update()
        {
            if (_cc == null || _body == null) return;
            var v = _cc.velocity;
            v.y = 0;
            float speed = v.magnitude;

            if (speed > 0.4f)
            {
                _phase += Time.deltaTime * speed * 2.6f;
                float swing = Mathf.Sin(_phase) * 32f;
                SetSwing(_hipL, swing);
                SetSwing(_hipR, -swing);
                SetSwing(_shoulderL, -swing * 0.65f);
                SetSwing(_shoulderR, swing * 0.65f);
                _body.localPosition = _bodyBase + Vector3.up * Mathf.Abs(Mathf.Sin(_phase)) * 0.05f;
            }
            else
            {
                // settle to idle
                _phase = 0;
                Settle(_hipL); Settle(_hipR); Settle(_shoulderL); Settle(_shoulderR);
                _body.localPosition = Vector3.Lerp(_body.localPosition, _bodyBase, 10f * Time.deltaTime);
            }
        }

        private static void SetSwing(Transform pivot, float deg)
        {
            if (pivot != null)
                pivot.localRotation = Quaternion.Euler(deg, 0, 0);
        }

        private static void Settle(Transform pivot)
        {
            if (pivot != null)
                pivot.localRotation = Quaternion.Slerp(pivot.localRotation, Quaternion.identity, 10f * Time.deltaTime);
        }
    }
}
