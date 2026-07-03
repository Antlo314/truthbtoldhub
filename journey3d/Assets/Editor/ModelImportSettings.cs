using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Keep model meshes CPU-readable so runtime MeshColliders work in
    /// WebGL builds (which otherwise strip mesh data after upload to GPU).
    /// Quaternius characters import as Legacy animation: the char_* files are
    /// mesh+rig only, the anims_* donor files carry the shared clip sets that
    /// CharacterRig plays across every character of the same rig.
    public class ModelImportSettings : AssetPostprocessor
    {
        // bump to force re-import when this processor's behavior changes
        public override uint GetVersion() => 2;

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
            }
        }

        /// The Blender action bake writes object-level transform keys onto the
        /// armature node itself. Played back on a differently-imported mesh
        /// prefab, those scale/position keys stomp Unity's unit-conversion on
        /// that node and blow the character up. Bone curves live BELOW the
        /// armature path and are untouched.
        private void OnPostprocessAnimation(GameObject root, AnimationClip clip)
        {
            if (!assetPath.Contains("Models/quaternius/anims_")) return;
            int removed = 0;
            foreach (var binding in AnimationUtility.GetCurveBindings(clip))
            {
                bool armatureNode = binding.path == "CharacterArmature";
                bool transformKey = binding.propertyName.StartsWith("m_LocalScale") ||
                                    binding.propertyName.StartsWith("m_LocalPosition");
                if (armatureNode && transformKey)
                {
                    AnimationUtility.SetEditorCurve(clip, binding, null);
                    removed++;
                }
            }
            if (removed > 0)
                Debug.Log($"J3D import: stripped {removed} armature-object curves from {clip.name}");
        }
    }
}
