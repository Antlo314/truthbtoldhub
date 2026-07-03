using UnityEditor;

namespace Journey3D.EditorTools
{
    /// Keep model meshes CPU-readable so runtime MeshColliders work in
    /// WebGL builds (which otherwise strip mesh data after upload to GPU).
    public class ModelImportSettings : AssetPostprocessor
    {
        private void OnPreprocessModel()
        {
            if (!assetPath.Contains("Resources/Models")) return;
            var importer = (ModelImporter)assetImporter;
            importer.isReadable = true;
        }
    }
}
