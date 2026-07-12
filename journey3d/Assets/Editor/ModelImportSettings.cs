using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Quaternius import rules:
    /// - Strip ALL scale curves (Blender unit bake blew characters up ~46x).
    /// - Strip position ONLY on armature/root (root motion / unit offset).
    /// - KEEP foot & limb positions — Foot.L/R live under Root, not under
    ///   LowerLeg. Without their position keys the feet stay in bind pose while
    ///   the legs walk → skinned mesh stretches between ankle and shin.
    public class ModelImportSettings : AssetPostprocessor
    {
        // bump to force re-import
        public override uint GetVersion() => 7;

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
                importer.optimizeGameObjects = false;
                importer.preserveHierarchy = true;
            }
        }

        private void OnPostprocessAnimation(GameObject root, AnimationClip clip)
        {
            if (!assetPath.Contains("Models/quaternius/anims_")) return;

            int removedScale = 0, removedPos = 0, keptPos = 0, repathed = 0;
            var bindings = AnimationUtility.GetCurveBindings(clip);
            var work = new List<(EditorCurveBinding oldB, EditorCurveBinding newB, AnimationCurve curve)>();

            foreach (var binding in bindings)
            {
                string path = binding.path ?? "";
                string prop = binding.propertyName ?? "";

                if (prop.StartsWith("m_LocalScale"))
                {
                    AnimationUtility.SetEditorCurve(clip, binding, null);
                    removedScale++;
                    continue;
                }

                if (prop.StartsWith("m_LocalPosition"))
                {
                    // Keep positional animation on feet, legs, hips, spine, arms —
                    // only strip root/armature object motion (the unit-conversion bake).
                    if (IsRootMotionPath(path))
                    {
                        AnimationUtility.SetEditorCurve(clip, binding, null);
                        removedPos++;
                    }
                    else
                    {
                        keptPos++;
                    }
                    continue;
                }

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

            if (removedScale + removedPos + repathed + keptPos > 0)
                Debug.Log($"J3D import [{clip.name}]: scale-kill={removedScale} root-pos-kill={removedPos} limb-pos-kept={keptPos} repathed={repathed}");
        }

        /// Root / armature only — not Foot, UpperLeg, Hips, etc.
        private static bool IsRootMotionPath(string path)
        {
            if (string.IsNullOrEmpty(path)) return true; // curves on the animated root itself
            path = path.Replace('|', '/').Trim('/');
            // Exact root nodes only
            if (path == "CharacterArmature") return true;
            if (path == "CharacterArmature/Root") return true;
            if (path == "Root") return true;
            if (path == "Armature") return true;
            // Nested duplicate armature paths from bad exports
            if (Regex.IsMatch(path, @"^(CharacterArmature/)+Root$")) return true;
            if (Regex.IsMatch(path, @"^(CharacterArmature/)+$")) return true;
            return false;
        }

        private static string NormalizeBonePath(string path)
        {
            if (string.IsNullOrEmpty(path)) return path;
            path = path.Replace('|', '/');
            while (path.Contains("CharacterArmature/CharacterArmature"))
                path = path.Replace("CharacterArmature/CharacterArmature", "CharacterArmature");
            path = Regex.Replace(path, @"^/+", "");
            return path;
        }
    }
}
