using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Journey3D
{
    /// VEIL - ride the pulse, gather units, return to the source.
    /// Score contract: score = units banked, lines = 0, level = attempts.
    public class VeilGame : ArcadeGameBase
    {
        protected override string GameId => "veil";

        private const float FieldW = 900f, FieldH = 520f;
        private const float PlayerSpeed = 320f;

        private RectTransform _player;
        private RectTransform _source;
        private readonly List<RectTransform> _units = new List<RectTransform>();
        private readonly List<RectTransform> _pulses = new List<RectTransform>();
        private int _carried;
        private int _hits;
        private float _timeLeft = 90f;
        private float _spawnT;
        private float _pulseT;
        private float _invuln;

        protected override void BuildBoard()
        {
            level = 1; // first attempt underway
            var frame = UIKit.Panel(transform, "frame", new Color(0.49f, 0.36f, 1f, 0.05f));
            frame.anchorMin = frame.anchorMax = frame.pivot = new Vector2(0.5f, 0.5f);
            frame.sizeDelta = new Vector2(FieldW + 10, FieldH + 10);

            _source = MakeCell(transform, 0, 0, 44, new Color(0.49f, 0.36f, 1f, 0.9f)).rectTransform;
            _player = MakeCell(transform, 0, -120, 22, new Color(0.99f, 0.83f, 0.24f)).rectTransform;

            for (int i = 0; i < 6; i++) SpawnUnit();
        }

        private void SpawnUnit()
        {
            var pos = new Vector2(Random.Range(-FieldW / 2 + 40, FieldW / 2 - 40), Random.Range(-FieldH / 2 + 40, FieldH / 2 - 40));
            if (pos.magnitude < 90) pos = pos.normalized * 140;
            _units.Add(MakeCell(transform, pos.x, pos.y, 16, new Color(0.65f, 0.9f, 1f)).rectTransform);
        }

        private void SpawnPulse()
        {
            // a shard that sweeps across the veil; touching it costs the carried units
            bool horizontal = Random.value > 0.5f;
            float lane = horizontal ? Random.Range(-FieldH / 2 + 30, FieldH / 2 - 30) : Random.Range(-FieldW / 2 + 30, FieldW / 2 - 30);
            var rt = MakeCell(transform,
                horizontal ? -FieldW / 2 : lane,
                horizontal ? lane : FieldH / 2,
                26, new Color(0.9f, 0.2f, 0.5f, 0.95f)).rectTransform;
            rt.name = horizontal ? "pulse_h" : "pulse_v";
            _pulses.Add(rt);
        }

        private void Update()
        {
            if (ended) return;

            _timeLeft -= Time.deltaTime;
            _invuln -= Time.deltaTime;
            if (_timeLeft <= 0) { EndGame(); return; }

            // movement
            var d = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            if (d.sqrMagnitude > 1) d.Normalize();
            var p = _player.anchoredPosition + d * PlayerSpeed * Time.deltaTime;
            p.x = Mathf.Clamp(p.x, -FieldW / 2 + 12, FieldW / 2 - 12);
            p.y = Mathf.Clamp(p.y, -FieldH / 2 + 12, FieldH / 2 - 12);
            _player.anchoredPosition = p;

            // source pulse breath
            float breath = 1f + Mathf.Sin(Time.time * 2.4f) * 0.15f;
            _source.localScale = Vector3.one * breath;

            // collect units
            for (int i = _units.Count - 1; i >= 0; i--)
            {
                if (Vector2.Distance(_units[i].anchoredPosition, p) < 22)
                {
                    Destroy(_units[i].gameObject);
                    _units.RemoveAt(i);
                    _carried++;
                    UpdateStatus();
                }
            }

            // bank at the source
            if (_carried > 0 && Vector2.Distance(_source.anchoredPosition, p) < 38)
            {
                score += _carried + (_carried >= 4 ? _carried : 0);   // full-hands bonus
                _carried = 0;
                UpdateStatus();
            }

            // spawn cadence
            _spawnT += Time.deltaTime;
            if (_spawnT > 2.2f && _units.Count < 10) { _spawnT = 0; SpawnUnit(); }
            _pulseT += Time.deltaTime;
            float cadence = Mathf.Max(1.1f, 2.6f - Time.timeSinceLevelLoad * 0.01f);
            if (_pulseT > cadence) { _pulseT = 0; SpawnPulse(); }

            // move pulses + collide
            float sweep = 240f + (90f - _timeLeft) * 1.6f;
            for (int i = _pulses.Count - 1; i >= 0; i--)
            {
                var rt = _pulses[i];
                bool horizontal = rt.name == "pulse_h";
                rt.anchoredPosition += (horizontal ? Vector2.right : Vector2.down) * sweep * Time.deltaTime;
                if (Mathf.Abs(rt.anchoredPosition.x) > FieldW / 2 + 30 || Mathf.Abs(rt.anchoredPosition.y) > FieldH / 2 + 30)
                {
                    Destroy(rt.gameObject);
                    _pulses.RemoveAt(i);
                    continue;
                }
                if (_invuln <= 0 && Vector2.Distance(rt.anchoredPosition, p) < 24)
                {
                    _carried = 0;
                    _hits++;
                    _invuln = 1.2f;
                    level = _hits + 1;         // attempts, shown as "Try" on the board
                    UpdateStatus();
                    if (_hits >= 3) { EndGame(); return; }
                }
            }
        }

        protected override void UpdateStatus()
        {
            if (statusText != null)
                statusText.text = $"BANKED {score}    CARRYING {_carried}    TRY {level}    {Mathf.CeilToInt(_timeLeft)}s";
        }
    }
}
