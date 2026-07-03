using UnityEngine;

namespace Journey3D
{
    /// Spawns Quaternius CC0 characters (Resources/Models/quaternius),
    /// normalized to a real-world height and seated on the ground, and binds
    /// the shared Legacy animation set for their rig via CharacterRig.
    public static class CharacterFactory
    {
        public const float PlayerHeight = 1.72f;

        /// model: e.g. "char_masc_tunic". donor: "anims_masc" / "anims_fem".
        /// Returns a wrapper whose child is the normalized character instance.
        public static GameObject Spawn(string model, string donor, Vector3 pos, float yaw, float height, bool collide)
        {
            var prefab = Resources.Load<GameObject>("Models/quaternius/" + model);
            if (prefab == null)
            {
                Debug.LogError("Missing character: " + model);
                return new GameObject(model + "_missing");
            }
            var wrapper = new GameObject(model);
            wrapper.transform.SetPositionAndRotation(pos, Quaternion.Euler(0, yaw, 0));
            var inst = Object.Instantiate(prefab, wrapper.transform);
            inst.name = "rig";
            inst.transform.localPosition = Vector3.zero;
            inst.transform.localRotation = Quaternion.identity;
            Normalize(wrapper.transform, inst.transform, height);

            // Skinned-mesh renderer bounds are unreliable for these imported rigs
            // (they balloon - see Normalize's note), so Unity frustum-culls the
            // character to INVISIBILITY. Force per-frame bounds recompute so the
            // character always draws where it actually is.
            foreach (var smr in inst.GetComponentsInChildren<SkinnedMeshRenderer>())
                smr.updateWhenOffscreen = true;

            var rig = wrapper.AddComponent<CharacterRig>();
            rig.Bind(inst, donor);

            if (collide)
            {
                // simple capsule-ish box so souls can't walk through people
                var col = new GameObject("bounds_col");
                col.transform.SetParent(wrapper.transform, false);
                col.transform.localPosition = new Vector3(0, height * 0.5f, 0);
                col.AddComponent<BoxCollider>().size = new Vector3(0.55f, height, 0.45f);
            }
            return wrapper;
        }

        /// Scales the instance so its bind-pose mesh bounds stand `height` tall
        /// with feet at the wrapper origin. Uses sharedMesh bounds transformed
        /// by each renderer - Renderer.bounds is NOT valid for skinned meshes
        /// before their first skinning update (it collapses and the scale
        /// explodes), so it must not be used here.
        private static void Normalize(Transform wrapper, Transform inst, float height)
        {
            if (!MeshSpaceBounds(inst, out var b))
            {
                Debug.LogError($"J3D char '{wrapper.name}': no measurable meshes");
                return;
            }
            float scale = height / Mathf.Max(0.01f, b.size.y);
            inst.localScale = inst.localScale * scale;   // compose with any import scale
            if (!MeshSpaceBounds(inst, out var b2)) return;
            inst.position += wrapper.position - new Vector3(b2.center.x, b2.min.y, b2.center.z);
            Debug.Log($"J3D char '{wrapper.name}': raw={b.size.y:F2} scale={scale:F4} final={b2.size.y:F2} rootScale={inst.localScale.x:F4}");
        }

        private static bool MeshSpaceBounds(Transform inst, out Bounds bounds)
        {
            bounds = new Bounds();
            bool first = true;
            foreach (var r in inst.GetComponentsInChildren<Renderer>())
            {
                Mesh mesh = null;
                if (r is SkinnedMeshRenderer smr) mesh = smr.sharedMesh;
                else { var mf = r.GetComponent<MeshFilter>(); if (mf != null) mesh = mf.sharedMesh; }
                if (mesh == null) continue;
                var lb = mesh.bounds;
                var m = r.transform.localToWorldMatrix;
                for (int i = 0; i < 8; i++)
                {
                    var corner = lb.center + Vector3.Scale(lb.extents, new Vector3(
                        (i & 1) == 0 ? -1 : 1, (i & 2) == 0 ? -1 : 1, (i & 4) == 0 ? -1 : 1));
                    var w = m.MultiplyPoint3x4(corner);
                    if (first) { bounds = new Bounds(w, Vector3.zero); first = false; }
                    else bounds.Encapsulate(w);
                }
            }
            return !first;
        }
    }

    /// Holds the Legacy Animation for one spawned character and exposes
    /// simple named playback. Clip names are normalized ("Armature|Walk" ->
    /// "Walk") so gameplay code can just say Play("Walk").
    public class CharacterRig : MonoBehaviour
    {
        private Animation _anim;
        private string _current = "";

        public void Bind(GameObject inst, string donor)
        {
            // Legacy-rig imports already carry an Animation component
            _anim = inst.GetComponent<Animation>();
            if (_anim == null) _anim = inst.AddComponent<Animation>();
            _anim.playAutomatically = false;
            var clips = Resources.LoadAll<AnimationClip>("Models/quaternius/" + donor);
            foreach (var clip in clips)
            {
                string name = clip.name;
                int bar = name.LastIndexOf('|');
                if (bar >= 0) name = name.Substring(bar + 1);
                _anim.AddClip(clip, name);
                var st = _anim[name];
                st.wrapMode = (name == "Idle" || name == "Idle_Neutral" || name == "Walk" ||
                               name == "Run" || name == "Idle_Sword" || name == "Idle_Gun")
                    ? WrapMode.Loop : WrapMode.Once;
            }
            if (clips.Length == 0) Debug.LogError("No clips in donor " + donor);
            Play(IdleName(), 0f);
            Invoke(nameof(LogLiveBounds), 1.5f);   // post-first-skinning sanity check
        }

        private void LogLiveBounds()
        {
            var rends = GetComponentsInChildren<Renderer>();
            if (rends.Length == 0) return;
            var b = rends[0].bounds;
            foreach (var r in rends) b.Encapsulate(r.bounds);
            Debug.Log($"J3D live '{name}': worldSize={b.size} center={b.center} playing={_current}");
        }

        public string IdleName() => Has("Idle_Neutral") ? "Idle_Neutral" : "Idle";
        public bool Has(string name) => _anim != null && _anim[name] != null;

        public void Play(string name, float fade = 0.18f)
        {
            if (_anim == null || _current == name || _anim[name] == null) return;
            _current = name;
            if (fade <= 0f) _anim.Play(name);
            else _anim.CrossFade(name, fade);
        }
    }
}
