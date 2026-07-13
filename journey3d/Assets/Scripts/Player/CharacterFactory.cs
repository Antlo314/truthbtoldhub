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
            bool isTruth = model != null && model.Contains("truth");
            // King (char_truth) bone paths do NOT match modular masc/fem donors —
            // retargeted clips + procedural locomotion turn him into an invisible ghost.
            bool clipsOk = false;
            if (!isTruth)
                clipsOk = rig.Bind(inst, donor);
            else
                Debug.Log("J3D Truth: static King pose (no masc retarget — keeps mesh visible)");

            if (!isTruth)
            {
                var proc = wrapper.AddComponent<ProceduralLocomotion>();
                proc.Bind(inst.transform);
                proc.Active = !clipsOk;

                var feet = wrapper.AddComponent<FootAttachFix>();
                feet.Bind(inst.transform);
            }

            if (collide)
            {
                var col = new GameObject("bounds_col");
                col.transform.SetParent(wrapper.transform, false);
                col.transform.localPosition = new Vector3(0, height * 0.5f, 0);
                col.AddComponent<BoxCollider>().size = new Vector3(0.55f, height, 0.45f);
            }

            ForceVisible(wrapper, truthKing: isTruth);
            return wrapper;
        }

        /// Makes skinned characters reliably visible on WebGL (opaque unlit tints).
        public static void ForceVisible(GameObject root, bool truthKing = false)
        {
            if (root == null) return;
            // King armature does not match modular masc bone paths — procedural
            // locomotion turns him into an invisible / exploded ghost.
            if (truthKing)
            {
                var proc = root.GetComponent<ProceduralLocomotion>();
                if (proc != null)
                {
                    proc.Active = false;
                    Object.Destroy(proc);
                }
                var feet = root.GetComponent<FootAttachFix>();
                if (feet != null) Object.Destroy(feet);
            }

            foreach (var r in root.GetComponentsInChildren<Renderer>(true))
            {
                r.enabled = true;
                r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
                r.receiveShadows = false;
                if (r is SkinnedMeshRenderer smr)
                {
                    smr.updateWhenOffscreen = true;
                    smr.skinnedMotionVectors = false;
                    // Expand bounds so frustum never culls him at rest
                    smr.localBounds = new Bounds(new Vector3(0, 0.9f, 0), new Vector3(1.2f, 2.2f, 1.2f));
                }
                var mats = r.materials;
                for (int i = 0; i < mats.Length; i++)
                {
                    var src = mats[i];
                    if (src == null) continue;
                    string n = src.name.ToLowerInvariant();
                    Color c = Color.white;
                    if (src.HasProperty("_Color")) c = src.color;
                    else if (src.HasProperty("_BaseColor")) c = src.GetColor("_BaseColor");
                    // transparent / near-black materials read as ghosts
                    if (c.a < 0.9f) c.a = 1f;
                    if (c.maxColorComponent < 0.08f) c = new Color(0.55f, 0.45f, 0.35f, 1f);

                    if (truthKing)
                    {
                        // Color by mesh part + material name (King is multi-mat, not all-blue)
                        string part = r.gameObject.name.ToLowerInvariant();
                        bool head = part.Contains("head") || n.Contains("skin") || n.Contains("hair")
                            || n.Contains("eye") || n.Contains("beard") || n.Contains("white");
                        bool feet = part.Contains("feet") || part.Contains("foot") || n.Contains("boot");
                        bool legs = part.Contains("leg");

                        if (n.Contains("skin") || (head && !n.Contains("hair") && !n.Contains("white") && !n.Contains("gold") && !n.Contains("metal") && !n.Contains("eye")))
                            c = new Color(0.93f, 0.76f, 0.62f, 1f);          // skin
                        else if (n.Contains("hair") || n.Contains("beard") || n.Contains("white"))
                            c = new Color(0.94f, 0.94f, 0.96f, 1f);          // white hair/beard
                        else if (n.Contains("gold"))
                            c = new Color(0.98f, 0.82f, 0.28f, 1f);          // crown / trim
                        else if (n.Contains("metal") && n.Contains("dark"))
                            c = new Color(0.28f, 0.26f, 0.3f, 1f);           // dark metal
                        else if (n.Contains("metal"))
                            c = new Color(0.75f, 0.72f, 0.68f, 1f);          // silver metal
                        else if (n.Contains("eye"))
                            c = new Color(0.2f, 0.35f, 0.5f, 1f);
                        else if (n.Contains("beige") || n.Contains("brown") || n.Contains("darkbrown"))
                            c = new Color(0.48f, 0.32f, 0.2f, 1f);           // belts / leather
                        else if (feet || n.Contains("boot"))
                            c = new Color(0.22f, 0.16f, 0.12f, 1f);          // boots
                        else if (legs && !n.Contains("blue"))
                            c = new Color(0.2f, 0.18f, 0.28f, 1f);           // dark pants
                        else if (n.Contains("blue"))
                            c = new Color(0.22f, 0.32f, 0.62f, 1f);          // robe only
                        else if (part.Contains("body"))
                            c = new Color(0.22f, 0.32f, 0.62f, 1f);          // body robe
                        else
                            c = new Color(0.55f, 0.48f, 0.4f, 1f);           // neutral trim (never pure blue dump)
                    }

                    var newMat = PropUtils.UnlitMat(c);
                    newMat.name = src.name;
                    mats[i] = newMat;
                }
                r.materials = mats;
            }
            WorldSkin.Skin(root);
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

        public void Play(string name, float fade = 0.22f)
        {
            if (!_bound || _anim == null || string.IsNullOrEmpty(name)) return;
            if (_current == name) return;
            if (_anim[name] == null) return;
            _current = name;
            // Longer crossfades = less pop on walk/idle transitions
            float f = fade <= 0f ? 0f : Mathf.Max(fade, 0.22f);
            if (f <= 0f) _anim.Play(name);
            else _anim.CrossFade(name, f);
        }

        public void SetSpeed(string name, float speed)
        {
            if (_anim == null || _anim[name] == null) return;
            _anim[name].speed = Mathf.Clamp(speed, 0.7f, 1.35f);
        }

        public void PlayOnce(string name, float fade = 0.14f)
        {
            if (!Has(name)) return;
            Play(name, fade);
            var st = _anim[name];
            if (st != null && st.wrapMode != WrapMode.Loop)
                StartCoroutine(ReturnToIdle(st.length / Mathf.Max(0.01f, st.speed)));
        }

        private System.Collections.IEnumerator ReturnToIdle(float delay)
        {
            yield return new WaitForSeconds(Mathf.Max(0.05f, delay - 0.05f));
            if (_current != "Walk" && _current != "Run")
                Play(IdleName(), 0.26f);
        }
    }
}
