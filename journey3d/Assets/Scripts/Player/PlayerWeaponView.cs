using UnityEngine;

namespace Journey3D
{
    /// Simple visible staff when a weapon is equipped (primitive, no extra assets).
    public class PlayerWeaponView : MonoBehaviour
    {
        private GameObject _staff;
        private Transform _hand;

        private void Start()
        {
            FindHand();
            Refresh();
        }

        private void FindHand()
        {
            // Prefer right hand bone on Quaternius modular
            string[] names = { "Hand.R", "RightHand", "hand_r", "mixamorig:RightHand", "Hand_R" };
            foreach (var n in names)
            {
                _hand = FindDeep(transform, n);
                if (_hand != null) break;
            }
            if (_hand == null)
            {
                // fallback: attach to player root roughly at hand height
                var hold = new GameObject("WeaponHold");
                hold.transform.SetParent(transform, false);
                hold.transform.localPosition = new Vector3(0.22f, 0.95f, 0.25f);
                _hand = hold.transform;
            }
        }

        public void Refresh()
        {
            bool has = !string.IsNullOrEmpty(SaveState.Character.equippedWeapon);
            if (!has)
            {
                if (_staff != null) _staff.SetActive(false);
                return;
            }
            if (_staff == null) BuildStaff();
            if (_staff != null) _staff.SetActive(true);
        }

        private void BuildStaff()
        {
            if (_hand == null) FindHand();
            _staff = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            _staff.name = "WoodenStaff";
            _staff.transform.SetParent(_hand, false);
            _staff.transform.localPosition = new Vector3(0.02f, -0.15f, 0.05f);
            _staff.transform.localRotation = Quaternion.Euler(8f, 0f, 12f);
            _staff.transform.localScale = new Vector3(0.045f, 0.55f, 0.045f);
            Object.Destroy(_staff.GetComponent<Collider>());
            _staff.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.45f, 0.28f, 0.14f));

            // tip glow
            var tip = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            tip.transform.SetParent(_staff.transform, false);
            tip.transform.localPosition = new Vector3(0, 1.05f, 0);
            tip.transform.localScale = Vector3.one * 0.35f;
            Object.Destroy(tip.GetComponent<Collider>());
            tip.GetComponent<MeshRenderer>().sharedMaterial =
                PropUtils.UnlitMat(new Color(0.85f, 0.75f, 0.35f));
        }

        private static Transform FindDeep(Transform root, string name)
        {
            if (root.name == name) return root;
            foreach (Transform c in root)
            {
                var f = FindDeep(c, name);
                if (f != null) return f;
            }
            return null;
        }
    }
}
