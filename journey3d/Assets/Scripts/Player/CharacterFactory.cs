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

            // Guaranteed motion — bone-driven walk/idle even if FBX clips don't retarget
            var proc = wrapper.AddComponent<ProceduralLocomotion>();
            proc.Bind(inst.transform);

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
    /// simple named playback. Clip names are normalized
    /// ("CharacterArmature|…|Walk" -> "Walk") so gameplay can say Play("Walk").
    public class CharacterRig : MonoBehaviour
    {
        // FBX clips path fine but retarget still glitches; ProceduralLocomotion
        // is the authoritative walk/idle. Keep false so clips don't fight bones.
        public static bool PlayAnimations = false;

        private Animation _anim;
        private string _current = "";

        public void Bind(GameObject inst, string donor)
        {
            _anim = inst.GetComponent<Animation>();
            if (_anim == null) _anim = inst.AddComponent<Animation>();
            _anim.playAutomatically = false;
            _anim.cullingType = AnimationCullingType.AlwaysAnimate;

            if (!PlayAnimations)
            {
                Debug.LogWarning($"J3D rig '{name}': PlayAnimations=false (bind pose only)");
                return;
            }

            var clips = Resources.LoadAll<AnimationClip>("Models/quaternius/" + donor);
            int added = 0;
            foreach (var clip in clips)
            {
                if (clip == null) continue;
                // Ensure legacy — donor import is Legacy, but be defensive
                if (!clip.legacy) clip.legacy = true;

                string name = NormalizeClipName(clip.name);
                if (string.IsNullOrEmpty(name)) continue;
                if (_anim.GetClip(name) != null) continue;

                _anim.AddClip(clip, name);
                var st = _anim[name];
                if (st == null) continue;
                st.wrapMode = IsLoopingClip(name) ? WrapMode.Loop : WrapMode.Once;
                st.layer = 0;
                st.blendMode = AnimationBlendMode.Blend;
                st.enabled = true;
                st.weight = 1f;
                added++;
            }

            if (added == 0)
                Debug.LogError($"J3D rig '{name}': no clips bound from donor '{donor}' (found {clips.Length} raw)");
            else
                Debug.Log($"J3D rig '{name}': bound {added} clips from {donor}");

            Play(IdleName(), 0f);
        }

        private static string NormalizeClipName(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return raw;
            // "CharacterArmature|CharacterArmature|CharacterArmature|Idle" -> "Idle"
            int bar = raw.LastIndexOf('|');
            if (bar >= 0) raw = raw.Substring(bar + 1);
            // also handle "CharacterArmature|Idle" already stripped once
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
        public string Current => _current;

        public void Play(string name, float fade = 0.18f)
        {
            if (!PlayAnimations || _anim == null || string.IsNullOrEmpty(name)) return;
            if (_current == name) return;
            if (_anim[name] == null) return;
            _current = name;
            if (fade <= 0f) _anim.Play(name);
            else _anim.CrossFade(name, fade);
        }

        /// Fire a one-shot (Interact, Wave, …) then return to idle when done.
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
