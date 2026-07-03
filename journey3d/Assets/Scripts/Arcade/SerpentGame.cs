using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Journey3D
{
    /// SERPENT - grow by the luminous orbs. Score contract: score, 0, 0.
    public class SerpentGame : ArcadeGameBase
    {
        protected override string GameId => "serpent";

        private const int N = 16;          // 16x16, like the web Kolbrin variant
        private const float Cell = 30f;

        private Image[,] _cells = new Image[N, N];
        private List<Vector2Int> _snake = new List<Vector2Int>();
        private Vector2Int _dir = new Vector2Int(1, 0);
        private Vector2Int _nextDir = new Vector2Int(1, 0);
        private Vector2Int _orb;
        private float _tickT;
        private float _tick = 0.16f;

        protected override void BuildBoard()
        {
            var frame = UIKit.Panel(transform, "frame", new Color(1, 1, 1, 0.06f));
            frame.anchorMin = frame.anchorMax = frame.pivot = new Vector2(0.5f, 0.5f);
            frame.sizeDelta = new Vector2(N * Cell + 8, N * Cell + 8);
            for (int x = 0; x < N; x++)
                for (int y = 0; y < N; y++)
                    _cells[x, y] = MakeCell(transform,
                        (x - N / 2f + 0.5f) * Cell,
                        (y - N / 2f + 0.5f) * Cell,
                        Cell - 2, new Color(0.02f, 0.04f, 0.03f));
            _snake.Clear();
            _snake.Add(new Vector2Int(N / 2, N / 2));
            _snake.Add(new Vector2Int(N / 2 - 1, N / 2));
            _snake.Add(new Vector2Int(N / 2 - 2, N / 2));
            PlaceOrb();
            Render();
        }

        private void PlaceOrb()
        {
            do
            {
                _orb = new Vector2Int(Random.Range(0, N), Random.Range(0, N));
            } while (_snake.Contains(_orb));
        }

        private void Update()
        {
            if (ended) return;

            if ((Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) && _dir.x != 1) _nextDir = new Vector2Int(-1, 0);
            if ((Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) && _dir.x != -1) _nextDir = new Vector2Int(1, 0);
            if ((Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) && _dir.y != -1) _nextDir = new Vector2Int(0, 1);
            if ((Input.GetKeyDown(KeyCode.DownArrow) || Input.GetKeyDown(KeyCode.S)) && _dir.y != 1) _nextDir = new Vector2Int(0, -1);

            _tickT += Time.deltaTime;
            if (_tickT < _tick) return;
            _tickT = 0;

            _dir = _nextDir;
            var head = _snake[0] + _dir;
            if (head.x < 0 || head.x >= N || head.y < 0 || head.y >= N || _snake.Contains(head))
            {
                EndGame();
                return;
            }
            _snake.Insert(0, head);
            if (head == _orb)
            {
                score += 10;
                _tick = Mathf.Max(0.06f, _tick - 0.004f);
                PlaceOrb();
                UpdateStatus();
            }
            else
            {
                _snake.RemoveAt(_snake.Count - 1);
            }
            Render();
        }

        private void Render()
        {
            for (int x = 0; x < N; x++)
                for (int y = 0; y < N; y++)
                    _cells[x, y].color = new Color(0.02f, 0.04f, 0.03f);
            _cells[_orb.x, _orb.y].color = new Color(0.99f, 0.83f, 0.24f);
            for (int i = 0; i < _snake.Count; i++)
            {
                float fade = 1f - i / (float)(_snake.Count + 4);
                _cells[_snake[i].x, _snake[i].y].color = new Color(0.13f * fade + 0.02f, 0.9f * fade + 0.08f, 0.4f * fade + 0.04f);
            }
        }
    }
}
