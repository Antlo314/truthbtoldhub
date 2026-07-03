using System;
using UnityEngine;
using UnityEngine.UI;

namespace Journey3D
{
    /// Shared scaffolding for the three cabinets. Subclasses build their
    /// board under this transform and report a ScoreResult on game over.
    /// Contract (matches the web arcade_scores table):
    ///   tetra   -> score, lines, level
    ///   serpent -> score, 0, 0
    ///   veil    -> score(units), 0, level(attempts)
    public abstract class ArcadeGameBase : MonoBehaviour
    {
        public Color accent = Color.white;
        public Action<ScoreResult> onGameOver;

        protected int score;
        protected int lines;
        protected int level;
        protected bool ended;
        protected Text statusText;

        protected abstract string GameId { get; }

        protected virtual void Start()
        {
            var bg = UIKit.Panel(transform, "bg", new Color(0.01f, 0.015f, 0.03f, 1f));
            UIKit.Fill(bg);
            statusText = UIKit.Label(transform, "", 20, accent, TextAnchor.UpperCenter, FontStyle.Bold);
            var rt = statusText.rectTransform;
            rt.anchorMin = new Vector2(0, 1);
            rt.anchorMax = new Vector2(1, 1);
            rt.pivot = new Vector2(0.5f, 1);
            rt.anchoredPosition = new Vector2(0, -6);
            rt.sizeDelta = new Vector2(0, 30);
            BuildBoard();
            UpdateStatus();
        }

        protected abstract void BuildBoard();

        protected virtual void UpdateStatus()
        {
            if (statusText != null)
                statusText.text = $"SCORE {score:n0}";
        }

        protected void EndGame()
        {
            if (ended) return;
            ended = true;
            onGameOver?.Invoke(new ScoreResult { game = GameId, score = score, lines = lines, level = level });
        }

        /// Simple cell factory used by the grid games.
        protected Image MakeCell(Transform parent, float x, float y, float size, Color color)
        {
            var go = new GameObject("cell");
            var rt = UIKit.Rect(go, parent);
            rt.anchorMin = new Vector2(0.5f, 0.5f);
            rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = new Vector2(x, y);
            rt.sizeDelta = new Vector2(size, size);
            var img = go.AddComponent<Image>();
            img.color = color;
            return img;
        }
    }
}
