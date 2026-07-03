using UnityEditor;
using UnityEngine;

namespace Journey3D.EditorTools
{
    /// Batch use:
    ///   Unity -batchmode -projectPath journey3d -executeMethod Journey3D.EditorTools.BuildScript.BuildWebGL -quit
    public static class BuildScript
    {
        [MenuItem("Journey/Build WebGL")]
        public static void BuildWebGL()
        {
            PlayerSettings.companyName = "Truth B Told";
            PlayerSettings.productName = "The Journey - Truth's Hut";
            PlayerSettings.WebGL.template = "PROJECT:Journey";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;   // no server header config needed on Vercel
            PlayerSettings.runInBackground = true;

            var report = BuildPipeline.BuildPlayer(
                new[] { "Assets/Scenes/Hut.unity" },
                "Builds/webgl",
                BuildTarget.WebGL,
                BuildOptions.None);

            Debug.Log($"BUILDSCRIPT result={report.summary.result} size={report.summary.totalSize} errors={report.summary.totalErrors}");
            if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
                EditorApplication.Exit(1);
        }
    }
}
