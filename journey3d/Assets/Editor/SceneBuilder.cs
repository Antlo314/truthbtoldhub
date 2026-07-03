using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Journey3D.EditorTools
{
    /// Builds the Hut scene (a single Bootstrap object - everything else is
    /// assembled at runtime) and registers it in Build Settings.
    /// Batch use:  Unity -batchmode -executeMethod Journey3D.EditorTools.SceneBuilder.Build -quit
    public static class SceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/Hut.unity";

        [MenuItem("Journey/Build Hut Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var go = new GameObject("Bootstrap");
            go.AddComponent<GameBootstrap>();

            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);

            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            // sanity: log imported model bounds so scale problems surface in the batch log
            foreach (var name in new[] { "hut_shell", "player_avatar", "truth_sage", "arcade_cabinet" })
            {
                var prefab = Resources.Load<GameObject>("Models/" + name);
                if (prefab == null) { Debug.LogError("SCENEBUILDER missing model " + name); continue; }
                var bounds = new Bounds(Vector3.zero, Vector3.zero);
                bool first = true;
                foreach (var r in prefab.GetComponentsInChildren<MeshRenderer>())
                {
                    if (first) { bounds = r.bounds; first = false; }
                    else bounds.Encapsulate(r.bounds);
                }
                Debug.Log($"SCENEBUILDER bounds {name}: size={bounds.size}");
            }
            Debug.Log("SCENEBUILDER done -> " + ScenePath);
        }
    }
}
