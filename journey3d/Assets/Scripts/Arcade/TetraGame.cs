using UnityEngine;
using UnityEngine.UI;

namespace Journey3D
{
    /// TETRA - stack the falling forms. Score contract: score, lines, level.
    public class TetraGame : ArcadeGameBase
    {
        protected override string GameId => "tetra";

        private const int W = 10, H = 20;
        private const float Cell = 26f;

        private static readonly Vector2Int[][] Shapes =
        {
            new[] { new Vector2Int(-1, 0), new Vector2Int(0, 0), new Vector2Int(1, 0), new Vector2Int(2, 0) },   // I
            new[] { new Vector2Int(0, 0), new Vector2Int(1, 0), new Vector2Int(0, 1), new Vector2Int(1, 1) },     // O
            new[] { new Vector2Int(-1, 0), new Vector2Int(0, 0), new Vector2Int(1, 0), new Vector2Int(0, 1) },    // T
            new[] { new Vector2Int(-1, 0), new Vector2Int(0, 0), new Vector2Int(0, 1), new Vector2Int(1, 1) },    // S
            new[] { new Vector2Int(-1, 1), new Vector2Int(0, 1), new Vector2Int(0, 0), new Vector2Int(1, 0) },    // Z
            new[] { new Vector2Int(-1, 0), new Vector2Int(0, 0), new Vector2Int(1, 0), new Vector2Int(-1, 1) },   // J
            new[] { new Vector2Int(-1, 0), new Vector2Int(0, 0), new Vector2Int(1, 0), new Vector2Int(1, 1) },    // L
        };

        private static readonly Color[] ShapeColors =
        {
            new Color(0.13f, 0.83f, 0.93f), new Color(0.98f, 0.83f, 0.14f), new Color(0.66f, 0.4f, 1f),
            new Color(0.13f, 0.77f, 0.37f), new Color(0.94f, 0.27f, 0.27f), new Color(0.23f, 0.44f, 0.94f),
            new Color(0.98f, 0.55f, 0.09f),
        };

        private int[,] _board = new int[W, H];      // 0 empty, else color index+1
        private Image[,] _cells = new Image[W, H];
        private int _pieceType;
        private Vector2Int[] _piece = new Vector2Int[4];
        private Vector2Int _pos;
        private float _fallT;
        private float _softT;

        protected override void BuildBoard()
        {
            var frame = UIKit.Panel(transform, "frame", new Color(1, 1, 1, 0.06f));
            frame.anchorMin = frame.anchorMax = frame.pivot = new Vector2(0.5f, 0.5f);
            frame.sizeDelta = new Vector2(W * Cell + 8, H * Cell + 8);
            for (int x = 0; x < W; x++)
                for (int y = 0; y < H; y++)
                    _cells[x, y] = MakeCell(transform,
                        (x - W / 2f + 0.5f) * Cell,
                        (y - H / 2f + 0.5f) * Cell,
                        Cell - 2, Color.black);
            Spawn();
            Render();
        }

        private void Spawn()
        {
            _pieceType = Random.Range(0, Shapes.Length);
            for (int i = 0; i < 4; i++) _piece[i] = Shapes[_pieceType][i];
            _pos = new Vector2Int(W / 2, H - 2);
            if (!Fits(_pos, _piece)) EndGame();
        }

        private bool Fits(Vector2Int pos, Vector2Int[] piece)
        {
            foreach (var p in piece)
            {
                int x = pos.x + p.x, y = pos.y + p.y;
                if (x < 0 || x >= W || y < 0) return false;
                if (y < H && _board[x, y] != 0) return false;
            }
            return true;
        }

        private void Update()
        {
            if (ended) return;

            if (Input.GetKeyDown(KeyCode.LeftArrow) || Input.GetKeyDown(KeyCode.A)) TryMove(new Vector2Int(-1, 0));
            if (Input.GetKeyDown(KeyCode.RightArrow) || Input.GetKeyDown(KeyCode.D)) TryMove(new Vector2Int(1, 0));
            if (Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.W)) TryRotate();
            if (Input.GetKeyDown(KeyCode.Space)) { while (TryMove(new Vector2Int(0, -1))) { } Lock(); return; }

            bool soft = Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S);
            _softT += Time.deltaTime;
            float speed = Mathf.Max(0.07f, 0.8f - level * 0.07f);
            _fallT += Time.deltaTime;

            if (soft && _softT >= 0.05f)
            {
                _softT = 0;
                if (!TryMove(new Vector2Int(0, -1))) Lock();
                _fallT = 0;
            }
            else if (_fallT >= speed)
            {
                _fallT = 0;
                if (!TryMove(new Vector2Int(0, -1))) Lock();
            }
        }

        private bool TryMove(Vector2Int delta)
        {
            if (!Fits(_pos + delta, _piece)) return false;
            _pos += delta;
            Render();
            return true;
        }

        private void TryRotate()
        {
            if (_pieceType == 1) return; // O
            var rotated = new Vector2Int[4];
            for (int i = 0; i < 4; i++) rotated[i] = new Vector2Int(_piece[i].y, -_piece[i].x);
            foreach (var kick in new[] { 0, -1, 1, -2, 2 })
            {
                var p = _pos + new Vector2Int(kick, 0);
                if (Fits(p, rotated)) { _piece = rotated; _pos = p; Render(); return; }
            }
        }

        private void Lock()
        {
            foreach (var p in _piece)
            {
                int x = _pos.x + p.x, y = _pos.y + p.y;
                if (y >= H) { EndGame(); return; }
                _board[x, y] = _pieceType + 1;
            }
            ClearLines();
            Spawn();
            Render();
        }

        private void ClearLines()
        {
            int cleared = 0;
            for (int y = H - 1; y >= 0; y--)
            {
                bool full = true;
                for (int x = 0; x < W; x++) if (_board[x, y] == 0) { full = false; break; }
                if (!full) continue;
                cleared++;
                for (int yy = y; yy < H - 1; yy++)
                    for (int x = 0; x < W; x++)
                        _board[x, yy] = _board[x, yy + 1];
                for (int x = 0; x < W; x++) _board[x, H - 1] = 0;
            }
            if (cleared > 0)
            {
                int[] points = { 0, 40, 100, 300, 1200 };
                score += points[Mathf.Min(4, cleared)] * (level + 1);
                lines += cleared;
                level = lines / 10;
                UpdateStatus();
            }
        }

        protected override void UpdateStatus()
        {
            if (statusText != null)
                statusText.text = $"SCORE {score:n0}    LINES {lines}    LEVEL {level}";
        }

        private void Render()
        {
            for (int x = 0; x < W; x++)
                for (int y = 0; y < H; y++)
                    _cells[x, y].color = _board[x, y] == 0
                        ? new Color(0.02f, 0.03f, 0.06f)
                        : ShapeColors[_board[x, y] - 1];
            foreach (var p in _piece)
            {
                int x = _pos.x + p.x, y = _pos.y + p.y;
                if (x >= 0 && x < W && y >= 0 && y < H)
                    _cells[x, y].color = ShapeColors[_pieceType];
            }
        }
    }
}
