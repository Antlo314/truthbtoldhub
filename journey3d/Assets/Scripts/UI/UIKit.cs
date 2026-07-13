using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Journey3D
{
    /// Industry-level sacred UI kit for Truth's Hut.
    /// Design tokens + list rows, CTAs, empty/loading states, glass shell.
    public static class UIKit
    {
        // —— Design tokens ——
        public static readonly Color Void = Hex("#05060c");
        public static readonly Color PanelBg = Hex("#0c0a08");
        public static readonly Color CardBg = new Color(0.1f, 0.085f, 0.065f, 0.94f);
        public static readonly Color CardHover = new Color(0.14f, 0.12f, 0.09f, 0.96f);
        public static readonly Color Gold = Hex("#fbbf24");
        public static readonly Color Amber = Hex("#fcd34d");
        public static readonly Color Faint = new Color(1f, 0.95f, 0.85f, 0.5f);
        public static readonly Color Muted = new Color(1f, 0.95f, 0.85f, 0.32f);
        public static readonly Color Body = new Color(0.94f, 0.91f, 0.84f, 0.92f);
        public static readonly Color Rule = new Color(0.98f, 0.75f, 0.22f, 0.22f);
        public static readonly Color Border = new Color(1f, 1f, 1f, 0.08f);
        public static readonly Color Dim = new Color(0f, 0f, 0f, 0.78f);

        public const float SpaceXs = 6f;
        public const float SpaceSm = 10f;
        public const float SpaceMd = 14f;
        public const float SpaceLg = 20f;
        public const float TouchMin = 52f;

        private static Font _font;
        public static Font Font => _font != null ? _font : (_font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"));

        private static Sprite _round;
        private static Sprite _circle;

        public static Sprite RoundedSprite()
        {
            if (_round != null) return _round;
            _round = MakeRoundedSprite(64, 18);
            return _round;
        }

        public static Sprite CircleSprite()
        {
            if (_circle != null) return _circle;
            _circle = MakeRoundedSprite(64, 32);
            return _circle;
        }

        private static Sprite MakeRoundedSprite(int s, int r)
        {
            var tex = new Texture2D(s, s, TextureFormat.ARGB32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color32[s * s];
            for (int y = 0; y < s; y++)
                for (int x = 0; x < s; x++)
                {
                    float dx = Mathf.Min(x, s - 1 - x), dy = Mathf.Min(y, s - 1 - y);
                    float a = 1f;
                    if (dx < r && dy < r)
                    {
                        float d = Mathf.Sqrt((r - dx) * (r - dx) + (r - dy) * (r - dy));
                        a = Mathf.Clamp01(r - d + 0.5f);
                    }
                    px[y * s + x] = new Color32(255, 255, 255, (byte)(a * 255));
                }
            tex.SetPixels32(px);
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, s, s), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect, new Vector4(r, r, r, r));
        }

        private static Image RoundedImage(GameObject go, Color color, bool circle = false)
        {
            var img = go.AddComponent<Image>();
            img.color = color;
            img.sprite = circle ? CircleSprite() : RoundedSprite();
            img.type = Image.Type.Sliced;
            return img;
        }

        public static Color Hex(string hex) =>
            ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.white;

        public static Color WithA(Color c, float a) => new Color(c.r, c.g, c.b, a);

        public static Canvas CreateCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1440, 900);
            scaler.matchWidthOrHeight = 0.55f;
            go.AddComponent<GraphicRaycaster>();

            if (Object.FindFirstObjectByType<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.AddComponent<EventSystem>();
                es.AddComponent<StandaloneInputModule>();
            }
            return canvas;
        }

        public static RectTransform Rect(GameObject go, Transform parent)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            rt.SetParent(parent, false);
            return rt;
        }

        public static RectTransform Panel(Transform parent, string name, Color color)
        {
            var go = new GameObject(name);
            var rt = Rect(go, parent);
            RoundedImage(go, color);
            return rt;
        }

        public static void Fill(RectTransform rt, float pad = 0)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(pad, pad);
            rt.offsetMax = new Vector2(-pad, -pad);
        }

        public static Text Label(Transform parent, string text, int size, Color color,
            TextAnchor align = TextAnchor.UpperLeft, FontStyle style = FontStyle.Normal)
        {
            var go = new GameObject("label");
            Rect(go, parent);
            var t = go.AddComponent<Text>();
            t.font = Font;
            t.text = text ?? "";
            t.fontSize = size;
            t.color = color;
            t.alignment = align;
            t.fontStyle = style;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.lineSpacing = 1.12f;
            t.raycastTarget = false;
            return t;
        }

        public static LayoutElement LE(Component c, float prefH = -1, float minH = -1, float flexW = 1)
        {
            var le = c.gameObject.GetComponent<LayoutElement>() ?? c.gameObject.AddComponent<LayoutElement>();
            if (prefH >= 0) le.preferredHeight = prefH;
            if (minH >= 0) le.minHeight = minH;
            le.flexibleWidth = flexW;
            return le;
        }

        // —— Buttons ——

        public static Button TextButton(Transform parent, string label, Color accent, System.Action onClick, int fontSize = 16)
        {
            return MakeButton(parent, label, accent, onClick, fontSize, filled: false);
        }

        public static Button PrimaryButton(Transform parent, string label, Color accent, System.Action onClick)
        {
            return MakeButton(parent, label, accent, onClick, 16, filled: true);
        }

        public static Button GhostButton(Transform parent, string label, Color accent, System.Action onClick)
        {
            var b = MakeButton(parent, label, accent, onClick, 15, filled: false);
            var img = b.targetGraphic as Image;
            if (img != null) img.color = WithA(Color.white, 0.04f);
            return b;
        }

        private static Button MakeButton(Transform parent, string label, Color accent, System.Action onClick, int fontSize, bool filled)
        {
            var go = new GameObject(filled ? "btn_primary" : "btn");
            Rect(go, parent);
            Color bg = filled
                ? WithA(accent, 0.92f)
                : WithA(accent, 0.14f);
            var img = RoundedImage(go, bg);
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            var colors = btn.colors;
            colors.highlightedColor = new Color(1.12f, 1.12f, 1.12f, 1f);
            colors.pressedColor = new Color(0.88f, 0.88f, 0.88f, 1f);
            colors.disabledColor = new Color(0.5f, 0.5f, 0.5f, 0.45f);
            btn.colors = colors;
            btn.onClick.AddListener(() =>
            {
                AudioManager.I?.PlayClick();
                onClick?.Invoke();
            });

            if (!filled)
            {
                var bar = Panel(go.transform, "accent", WithA(accent, 0.95f));
                bar.anchorMin = new Vector2(0, 0.18f);
                bar.anchorMax = new Vector2(0, 0.82f);
                bar.pivot = new Vector2(0, 0.5f);
                bar.anchoredPosition = new Vector2(10, 0);
                bar.sizeDelta = new Vector2(3.5f, 0);
            }

            var outline = go.AddComponent<Outline>();
            outline.effectColor = WithA(accent, filled ? 0.35f : 0.5f);
            outline.effectDistance = new Vector2(1.1f, -1.1f);

            Color tc = filled ? new Color(0.06f, 0.04f, 0.02f, 1f)
                : new Color(Mathf.Min(1f, accent.r * 0.45f + 0.6f), Mathf.Min(1f, accent.g * 0.45f + 0.6f), Mathf.Min(1f, accent.b * 0.45f + 0.55f));
            var txt = Label(go.transform, label, fontSize, tc, TextAnchor.MiddleCenter, FontStyle.Bold);
            Fill(txt.rectTransform, 8);
            txt.rectTransform.offsetMin = new Vector2(filled ? 12 : 20, 8);
            txt.rectTransform.offsetMax = new Vector2(-12, -8);
            return btn;
        }

        // —— Structure ——

        public static RectTransform Card(Transform parent, Color? bg = null)
        {
            var card = Panel(parent, "card", bg ?? CardBg);
            LE(card, minH: 48);
            var outline = card.gameObject.AddComponent<Outline>();
            outline.effectColor = Border;
            outline.effectDistance = new Vector2(1, -1);
            return card;
        }

        public static RectTransform SectionLabel(Transform parent, string text)
        {
            var t = Label(parent, (text ?? "").ToUpperInvariant(), 11, Faint, TextAnchor.MiddleLeft, FontStyle.Bold);
            LE(t, prefH: 30, minH: 28);
            return t.rectTransform;
        }

        public static RectTransform RuleLine(Transform parent)
        {
            var go = new GameObject("rule");
            var rt = Rect(go, parent);
            go.AddComponent<Image>().color = Rule;
            LE(go.GetComponent<Image>(), prefH: 1, minH: 1);
            return rt;
        }

        /// Industry list row: glyph | title + subtitle | trailing / chevron
        public static Button ListRow(
            Transform parent,
            string title,
            string subtitle,
            Color accent,
            System.Action onClick,
            string glyph = "◆",
            string trailing = "›",
            float height = 72f,
            bool disabled = false)
        {
            var go = new GameObject("list_row");
            var rt = Rect(go, parent);
            var bg = WithA(accent, 0.07f);
            var img = RoundedImage(go, bg);
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.interactable = !disabled;
            var colors = btn.colors;
            colors.highlightedColor = new Color(1.08f, 1.08f, 1.08f, 1f);
            colors.pressedColor = new Color(0.9f, 0.9f, 0.9f, 1f);
            colors.disabledColor = new Color(0.6f, 0.6f, 0.6f, 0.5f);
            btn.colors = colors;
            if (onClick != null && !disabled)
                btn.onClick.AddListener(() =>
                {
                    AudioManager.I?.PlayClick();
                    onClick();
                });

            var outline = go.AddComponent<Outline>();
            outline.effectColor = WithA(accent, 0.22f);
            outline.effectDistance = new Vector2(1, -1);

            LE(btn, prefH: height, minH: Mathf.Max(TouchMin, height * 0.85f));

            // glyph disc
            var disc = new GameObject("glyph");
            var drt = Rect(disc, go.transform);
            drt.anchorMin = new Vector2(0, 0.5f);
            drt.anchorMax = new Vector2(0, 0.5f);
            drt.pivot = new Vector2(0, 0.5f);
            drt.anchoredPosition = new Vector2(14, 0);
            drt.sizeDelta = new Vector2(40, 40);
            RoundedImage(disc, WithA(accent, 0.22f), circle: true);
            var g = Label(disc.transform, glyph, 16, accent, TextAnchor.MiddleCenter, FontStyle.Bold);
            Fill(g.rectTransform);

            // text stack
            var stack = new GameObject("stack");
            var srt = Rect(stack, go.transform);
            srt.anchorMin = new Vector2(0, 0);
            srt.anchorMax = new Vector2(1, 1);
            srt.offsetMin = new Vector2(66, 10);
            srt.offsetMax = new Vector2(string.IsNullOrEmpty(trailing) ? -14 : -40, -10);
            var vl = stack.AddComponent<VerticalLayoutGroup>();
            vl.childAlignment = TextAnchor.MiddleLeft;
            vl.childControlHeight = true;
            vl.childForceExpandHeight = false;
            vl.childControlWidth = true;
            vl.childForceExpandWidth = true;
            vl.spacing = 3;

            var titleC = disabled ? Muted : Body;
            var t = Label(stack.transform, title, 16, titleC, TextAnchor.MiddleLeft, FontStyle.Bold);
            LE(t, prefH: 22, minH: 20);
            if (!string.IsNullOrEmpty(subtitle))
            {
                var s = Label(stack.transform, subtitle, 13, Faint, TextAnchor.MiddleLeft);
                LE(s, prefH: 18, minH: 16);
            }

            if (!string.IsNullOrEmpty(trailing))
            {
                var ch = Label(go.transform, trailing, 22, WithA(accent, 0.85f), TextAnchor.MiddleCenter, FontStyle.Bold);
                var crt = ch.rectTransform;
                crt.anchorMin = new Vector2(1, 0);
                crt.anchorMax = new Vector2(1, 1);
                crt.pivot = new Vector2(1, 0.5f);
                crt.anchoredPosition = new Vector2(-12, 0);
                crt.sizeDelta = new Vector2(28, 0);
            }
            return btn;
        }

        public static RectTransform HeroCard(Transform parent, string eyebrow, string body, Color accent)
        {
            var card = Card(parent, WithA(accent, 0.1f));
            LE(card, prefH: 110, minH: 96);
            var outline = card.gameObject.GetComponent<Outline>();
            if (outline != null) outline.effectColor = WithA(accent, 0.35f);

            var pad = new GameObject("pad");
            var prt = Rect(pad, card);
            Fill(prt, 14);
            var vl = pad.AddComponent<VerticalLayoutGroup>();
            vl.spacing = 6;
            vl.childControlHeight = true;
            vl.childForceExpandHeight = false;
            vl.childControlWidth = true;
            vl.childForceExpandWidth = true;

            var eb = Label(pad.transform, (eyebrow ?? "").ToUpperInvariant(), 11, accent, TextAnchor.UpperLeft, FontStyle.Bold);
            LE(eb, prefH: 18, minH: 16);
            var bd = Label(pad.transform, body ?? "", 15, Body, TextAnchor.UpperLeft);
            LE(bd, prefH: 56, minH: 40);
            return card;
        }

        public static RectTransform EmptyState(Transform parent, string title, string body, Color accent)
        {
            var card = Card(parent, WithA(Color.black, 0.35f));
            LE(card, prefH: 120, minH: 100);
            var pad = new GameObject("pad");
            Fill(Rect(pad, card), 18);
            var vl = pad.AddComponent<VerticalLayoutGroup>();
            vl.spacing = 8;
            vl.childAlignment = TextAnchor.MiddleCenter;
            vl.childControlHeight = true;
            vl.childForceExpandHeight = false;
            vl.childControlWidth = true;
            vl.childForceExpandWidth = true;
            var t = Label(pad.transform, title, 17, accent, TextAnchor.MiddleCenter, FontStyle.Bold);
            LE(t, prefH: 24);
            var b = Label(pad.transform, body, 14, Faint, TextAnchor.MiddleCenter);
            LE(b, prefH: 40);
            return card;
        }

        public static RectTransform LoadingState(Transform parent, string text)
        {
            var t = Label(parent, text ?? "Loading…", 15, Faint, TextAnchor.MiddleCenter, FontStyle.Italic);
            LE(t, prefH: 48, minH: 40);
            return t.rectTransform;
        }

        public static RectTransform StatPills(Transform parent, (string label, string value)[] stats, Color accent)
        {
            var row = Panel(parent, "stats", Color.clear);
            LE(row, prefH: 44, minH: 40);
            var h = row.gameObject.AddComponent<HorizontalLayoutGroup>();
            h.spacing = 8;
            h.childControlWidth = true;
            h.childForceExpandWidth = true;
            h.childControlHeight = true;
            h.childForceExpandHeight = true;
            foreach (var s in stats)
            {
                var pill = Panel(row, "pill", WithA(accent, 0.12f));
                var outline = pill.gameObject.AddComponent<Outline>();
                outline.effectColor = WithA(accent, 0.25f);
                outline.effectDistance = new Vector2(1, -1);
                var t = Label(pill, $"{s.label}  {s.value}", 12, Body, TextAnchor.MiddleCenter, FontStyle.Bold);
                Fill(t.rectTransform, 6);
            }
            return row;
        }

        public static RectTransform ProgressBar(Transform parent, float fill01, Color accent)
        {
            var track = Panel(parent, "track", WithA(Color.white, 0.08f));
            LE(track, prefH: 8, minH: 8);
            var fill = Panel(track, "fill", accent);
            fill.anchorMin = Vector2.zero;
            fill.anchorMax = new Vector2(Mathf.Clamp01(fill01), 1f);
            fill.offsetMin = Vector2.zero;
            fill.offsetMax = Vector2.zero;
            return track;
        }

        public static RectTransform ScrollList(Transform parent)
        {
            var viewport = Panel(parent, "viewport", new Color(0, 0, 0, 0.18f));
            Fill(viewport);
            viewport.gameObject.AddComponent<RectMask2D>();
            var scroll = viewport.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 42f;
            scroll.inertia = true;
            scroll.decelerationRate = 0.135f;

            var content = new GameObject("content");
            var crt = Rect(content, viewport);
            crt.anchorMin = new Vector2(0, 1);
            crt.anchorMax = new Vector2(1, 1);
            crt.pivot = new Vector2(0.5f, 1);
            crt.offsetMin = new Vector2(12, 0);
            crt.offsetMax = new Vector2(-12, 0);
            var layout = content.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 12;
            layout.padding = new RectOffset(4, 4, 14, 28);
            layout.childForceExpandHeight = false;
            layout.childControlHeight = true;
            layout.childControlWidth = true;
            layout.childForceExpandWidth = true;
            content.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.content = crt;
            scroll.viewport = viewport;
            return crt;
        }

        public static RectTransform Row(Transform content, float height, Color bg)
        {
            var row = Panel(content, "row", bg);
            LE(row, prefH: height, minH: Mathf.Min(height, TouchMin));
            return row;
        }

        public static InputField Input(Transform parent, string placeholder, string value)
        {
            var go = new GameObject("input");
            Rect(go, parent);
            RoundedImage(go, new Color(0, 0, 0, 0.5f));
            var outline = go.AddComponent<Outline>();
            outline.effectColor = Border;
            outline.effectDistance = new Vector2(1, -1);
            var input = go.AddComponent<InputField>();
            var txt = Label(go.transform, "", 17, Body, TextAnchor.MiddleLeft);
            Fill(txt.rectTransform, 14);
            var ph = Label(go.transform, placeholder, 17, Muted, TextAnchor.MiddleLeft, FontStyle.Italic);
            Fill(ph.rectTransform, 14);
            input.textComponent = txt;
            input.placeholder = ph;
            input.text = value ?? "";
            return input;
        }

        /// Soft open animation on a canvas group.
        public static void PlayOpen(GameObject target)
        {
            if (target == null) return;
            var cg = target.GetComponent<CanvasGroup>() ?? target.AddComponent<CanvasGroup>();
            cg.alpha = 0f;
            var anim = target.GetComponent<UIOpenAnim>() ?? target.AddComponent<UIOpenAnim>();
            anim.Play();
        }
    }

    /// Lightweight fade-in for panel open (no DOTween dependency).
    public class UIOpenAnim : MonoBehaviour
    {
        private CanvasGroup _cg;
        private float _t;
        private bool _playing;
        private RectTransform _rt;
        private Vector2 _from;

        public void Play()
        {
            _cg = GetComponent<CanvasGroup>() ?? gameObject.AddComponent<CanvasGroup>();
            _rt = transform as RectTransform;
            _cg.alpha = 0f;
            _t = 0f;
            _playing = true;
            if (_rt != null)
            {
                _from = _rt.anchoredPosition + new Vector2(0, -18f);
                _rt.anchoredPosition = _from;
            }
        }

        private void Update()
        {
            if (!_playing) return;
            _t += Time.unscaledDeltaTime * 4.2f;
            float k = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(_t));
            if (_cg != null) _cg.alpha = k;
            if (_rt != null)
                _rt.anchoredPosition = Vector2.Lerp(_from, _from + new Vector2(0, 18f), k);
            if (k >= 1f) _playing = false;
        }
    }
}
