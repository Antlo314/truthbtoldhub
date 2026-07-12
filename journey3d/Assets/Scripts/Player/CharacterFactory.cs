using UnityEngine;

namespace Journey3D
{
    /// Spawns Quaternius CC0 characters and binds real Walk/Idle clips from
    /// anims_masc / anims_fem (same rig as the mesh). Procedural locomotion
    /// is a calibrated fallback only if clips fail to bind.
    public static class CharacterFactory
    {
        public const float PlayerHeight = 1.72f;

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

            foreach (var smr in inst.GetComponentsInChildren<SkinnedMeshRenderer>())
                smr.updateWhenOffscreen = true;

            var rig = wrapper.AddComponent<CharacterRig>();
            bool clipsOk = rig.Bind(inst, donor);

            // Always attach procedural; disable it when skeletal clips own the bones
            var proc = wrapper.AddComponent<ProceduralLocomotion>();
            proc.Bind(inst.transform);
            proc.Active = !clipsOk; // clips win when bound

            if (collide)
            {
                var col = new GameObject("bounds_col");
                col.transform.SetParent(wrapper.transform, false);
                col.transform.localPosition = new Vector3(0, height * 0.5f, 0);
                col.AddComponent<BoxCollider>().size = new Vector3(0.55f, height, 0.45f);
            }
            return wrapper;
        }

        private static void Normalize(Transform wrapper, Transform inst, float height)
        {
            if (!MeshSpaceBounds(inst, out var b))
            {
                Debug.LogError($"J3D char '{wrapper.name}': no measurable meshes");
                return;
            }
            float scale = height / Mathf.Max(0.01f, b.size.y);
            inst.localScale = inst.localScale * scale;
            if (!MeshSpaceBounds(inst, out var b2)) return;
            inst.position += wrapper.position - new Vector3(b2.center.x, b2.min.y, b2.center.z);
            Debug.Log($"J3D char '{wrapper.name}': raw={b.size.y:F2} scale={scale:F4} final={b2.size.y:F2}");
        }

        private static bool MeshSpaceBounds(Transform inst, out Bounds bounds)
        {
            bounds = new Bounds();
            bool first = true;
            foreach (var r in inst.GetComponentsInChildren<Renderer>())
            {
                Mesh mesh = null;
                if (r is SkinnedMeshRenderer smr) mesh = smr.sharedMesh;
                else
                {
                    var mf = r.GetComponent<MeshFilter>();
                    if (mf != null) mesh = mf.sharedMesh;
                }
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

    /// Plays Quaternius Legacy clips (Idle / Walk / Run / Interact / Wave).
    /// Clips live on anims_masc|fem; mesh is char_* — same CharacterArmature paths.
    public class CharacterRig : MonoBehaviour
    {
        public static bool PlayAnimations = true;

        private Animation _anim;
        private string _current = "";
        private bool _bound;

        public bool ClipsBound => _bound;
        public string Current => _current;

        /// Returns true if Walk (or Idle) clip is ready to play.
        public bool Bind(GameObject inst, string donor)
        {
            _bound = false;
            _anim = inst.GetComponent<Animation>();
            if (_anim == null) _anim = inst.AddComponent<Animation>();
            _anim.playAutomatically = false;
            _anim.cullingType = AnimationCullingType.AlwaysAnimate;
            _anim.enabled = true;

            if (!PlayAnimations)
            {
                Debug.LogWarning($"J3D rig '{name}': PlayAnimations=false");
                return false;
            }

            var clips = Resources.LoadAll<AnimationClip>("Models/quaternius/" + donor);
            int added = 0;
            foreach (var clip in clips)
            {
                if (clip == null) continue;
                // Runtime instance so we don't mutate shared import assets
                var runtime = Object.Instantiate(clip);
                runtime.name = clip.name;
                runtime.legacy = true;
                runtime.wrapMode = WrapMode.Loop;

                string clipName = NormalizeClipName(clip.name);
                if (string.IsNullOrEmpty(clipName)) continue;
                if (_anim.GetClip(clipName) != null) continue;

                _anim.AddClip(runtime, clipName);
                var st = _anim[clipName];
                if (st == null) continue;
                st.wrapMode = IsLoopingClip(clipName) ? WrapMode.Loop : WrapMode.Once;
                st.layer = 0;
                st.blendMode = AnimationBlendMode.Blend;
                st.weight = 1f;
                st.enabled = true;
                st.speed = 1f;
                added++;
            }

            _bound = added > 0 && (Has("Walk") || Has("Idle") || Has("Idle_Neutral"));
            Debug.Log($"J3D rig '{name}': bound {added} clips from {donor}, walk={Has("Walk")}, idle={Has("Idle_Neutral")||Has("Idle")}, ok={_bound}");

            if (_bound) Play(IdleName(), 0f);
            return _bound;
        }

        private static string NormalizeClipName(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return raw;
            int bar = raw.LastIndexOf('|');
            if (bar >= 0) raw = raw.Substring(bar + 1);
            bar = raw.LastIndexOf('|');
            if (bar >= 0) raw = raw.Substring(bar + 1);
            return raw.Trim();
        }

        private static bool IsLoopingClip(string name)
        {
            return name == "Idle" || name == "Idle_Neutral" || name == "Walk" ||
                   name == "Run" || name == "Idle_Sword" || name == "Idle_Gun" ||
                   name == "Run_Back" || name == "Run_Left" || name == "Run_Right";
        }

        public string IdleName() => Has("Idle_Neutral") ? "Idle_Neutral" : "Idle";
        public bool Has(string name) => _anim != null && _anim[name] != null;

        public void Play(string name, float fade = 0.15f)
        {
            if (!_bound || _anim == null || string.IsNullOrEmpty(name)) return;
            if (_current == name) return;
            if (_anim[name] == null) return;
            _current = name;
            if (fade <= 0f) _anim.Play(name);
            else _anim.CrossFade(name, fade);
        }

        public void PlayOnce(string name, float fade = 0.12f)
        {
            if (!Has(name)) return;
            Play(name, fade);
            var st = _anim[name];
            if (st != null && st.wrapMode != WrapMode.Loop)
                StartCoroutine(ReturnToIdle(st.length));
        }

        private System.Collections.IEnumerator ReturnToIdle(float delay)
        {
            yield return new WaitForSeconds(Mathf.Max(0.05f, delay - 0.05f));
            if (_current != "Walk" && _current != "Run")
                Play(IdleName(), 0.2f);
        }
    }
}
