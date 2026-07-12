using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Keep model meshes CPU-readable so runtime MeshColliders work in
    /// WebGL builds (which otherwise strip mesh data after upload to GPU).
    /// Quaternius characters import as Legacy animation: the char_* files are
    /// mesh+rig only, the anims_* donor files carry the shared clip sets that
    /// CharacterRig plays across every character of the same rig.
    ///
    /// CRITICAL: Blender re-export nested the armature path three times
    /// (CharacterArmature|CharacterArmature|CharacterArmature|Bone). Played
    /// as-is those curves hit nothing (or the wrong transform) and contort the
    /// mesh. We collapse paths to a single CharacterArmature/… prefix, strip
    /// object-level scale/position (root motion), and keep bone rotations.
    public class ModelImportSettings : AssetPostprocessor
    {
        // bump to force re-import when this processor's behavior changes
        public override uint GetVersion() => 5;

        private void OnPreprocessModel()
        {
            if (!assetPath.Contains("Resources/Models")) return;
            var importer = (ModelImporter)assetImporter;
            importer.isReadable = true;

            if (assetPath.Contains("Models/quaternius"))
            {
                importer.animationType = ModelImporterAnimationType.Legacy;
                importer.importAnimation = assetPath.Contains("anims_");
                importer.importCameras = false;
                importer.importLights = false;
                // keep full hierarchy so CharacterArmature path matches clips
                importer.optimizeGameObjects = false;
                importer.preserveHierarchy = true;
            }
        }

        private void OnPostprocessAnimation(GameObject root, AnimationClip clip)
        {
            if (!assetPath.Contains("Models/quaternius/anims_")) return;

            int removed = 0;
            int repathed = 0;
            var bindings = AnimationUtility.GetCurveBindings(clip);
            // Collect first so we can rewrite without mutating while iterating
            var work = new List<(EditorCurveBinding oldB, EditorCurveBinding newB, AnimationCurve curve)>();

            foreach (var binding in bindings)
            {
                bool killScale = binding.propertyName.StartsWith("m_LocalScale");
                bool killPos = binding.propertyName.StartsWith("m_LocalPosition");
                if (killScale || killPos)
                {
                    AnimationUtility.SetEditorCurve(clip, binding, null);
                    removed++;
                    continue;
                }

                string path = binding.path ?? "";
                string fixedPath = NormalizeBonePath(path);
                if (fixedPath == path) continue;

                var curve = AnimationUtility.GetEditorCurve(clip, binding);
                if (curve == null) continue;
                var newB = binding;
                newB.path = fixedPath;
                work.Add((binding, newB, curve));
            }

            foreach (var (oldB, newB, curve) in work)
            {
                AnimationUtility.SetEditorCurve(clip, oldB, null);
                AnimationUtility.SetEditorCurve(clip, newB, curve);
                repathed++;
            }

            if (removed > 0 || repathed > 0)
                Debug.Log($"J3D import [{clip.name}]: stripped {removed} scale/pos curves, repathed {repathed} bone paths");
        }

        /// Collapse Blender's nested armature prefixes and normalize separators.
        /// Examples:
        ///   "CharacterArmature/CharacterArmature/CharacterArmature/Hips" -> "CharacterArmature/Hips"
        ///   "CharacterArmature|Hips|Spine" (if any) -> "CharacterArmature/Hips/Spine"
        private static string NormalizeBonePath(string path)
        {
            if (string.IsNullOrEmpty(path)) return path;
            // Unity uses '/', but some tools leak '|'
            path = path.Replace('|', '/');
            // Collapse repeated CharacterArmature segments
            while (path.Contains("CharacterArmature/CharacterArmature"))
                path = path.Replace("CharacterArmature/CharacterArmature", "CharacterArmature");
            // Leading junk like "//CharacterArmature"
            path = Regex.Replace(path, @"^/+", "");
            return path;
        }
    }
}
