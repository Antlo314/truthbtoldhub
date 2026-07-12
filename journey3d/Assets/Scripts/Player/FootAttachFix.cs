using UnityEngine;

namespace Journey3D
{
    /// Quaternius parents Foot.L/R under Root, not under LowerLeg. When walk
    /// clips lose foot position keys (or paths miss), the shin moves and the
    /// foot stays put → skinned mesh stretches. Every LateUpdate, after
    /// Animation has posed the legs, snap each foot to its lower-leg end
    /// while preserving the foot's animated rotation.
    public class FootAttachFix : MonoBehaviour
    {
        private Transform _footL, _footR;
        private Transform _ankleL, _ankleR;
        private bool _ready;

        public void Bind(Transform characterRoot)
        {
            _ready = false;
            if (characterRoot == null) return;
            var root = FindDeep(characterRoot, "CharacterArmature") ?? characterRoot;

            _footL = FindDeep(root, "Foot.L");
            _footR = FindDeep(root, "Foot.R");
            var loL = FindDeep(root, "LowerLeg.L");
            var loR = FindDeep(root, "LowerLeg.R");

            // Prefer the explicit end marker Quaternius exports
            _ankleL = loL != null ? (FindDeep(loL, "LowerLeg.L_end") ?? loL) : null;
            _ankleR = loR != null ? (FindDeep(loR, "LowerLeg.R_end") ?? loR) : null;

            // If end is the lower leg itself, project down the bone
            _ready = _footL != null && _footR != null && _ankleL != null && _ankleR != null;
            Debug.Log($"J3D foot-fix: ready={_ready} footL={Name(_footL)} ankleL={Name(_ankleL)} footR={Name(_footR)} ankleR={Name(_ankleR)}");
        }

        private void LateUpdate()
        {
            if (!_ready) return;
            Snap(_footL, _ankleL);
            Snap(_footR, _ankleR);
        }

        private static void Snap(Transform foot, Transform ankle)
        {
            if (foot == null || ankle == null) return;
            // Keep animated rotation; only re-anchor position to the shin end.
            // If ankle is an "_end" leaf, its position is the joint. If it's the
            // LowerLeg bone, use a point along its length (child end or tip).
            Vector3 target = ankle.position;
            if (!ankle.name.EndsWith("_end") && ankle.childCount > 0)
            {
                // Prefer end child
                for (int i = 0; i < ankle.childCount; i++)
                {
                    var c = ankle.GetChild(i);
                    if (c.name.EndsWith("_end")) { target = c.position; break; }
                }
            }
            foot.position = target;
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
