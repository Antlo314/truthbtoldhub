using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Journey3D
{
    /// Sacred shell UI kit — rounded cards, clear hierarchy, touch-friendly.
    public static class UIKit
    {
        public static readonly Color Void = Hex("#05060c");
        public static readonly Color PanelBg = new Color(0.045f, 0.04f, 0.035f, 0.96f);
        public static readonly Color CardBg = new Color(0.08f, 0.07f, 0.055f, 0.92f);
        public static readonly Color Gold = Hex("#fbbf24");
        public static readonly Color Amber = Hex("#fcd34d");
        public static readonly Color Faint = new Color(1f, 0.95f, 0.85f, 0.48f);
        public static readonly Color Body = new Color(0.94f, 0.91f, 0.84f, 0.9f);
        public static readonly Color Rule = new Color(0.98f, 0.75f, 0.22f, 0.28f);

        private static Font _font;
        public static Font Font => _font != null ? _font : (_font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"));

        private static Sprite _round;
        public static Sprite RoundedSprite()
        {
            if (_round != null) return _round;
            const int s = 64, r = 18;
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
            _round = Sprite.Create(tex, new Rect(0, 0, s, s), new Vector2(0.5f, 0.5f), 100f, 0,
                SpriteMeshType.FullRect, new Vector4(r, r, r, r));
            return _round;
        }

        private static Image RoundedImage(GameObject go, Color color)
        {
            var img = go.AddComponent<Image>();
            img.color = color;
            img.sprite = RoundedSprite();
            img.type = Image.Type.Sliced;
            return img;
        }

        public static Color Hex(string hex) =>
            ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.white;

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
            var rt = Rect(go, parent);
            var t = go.AddComponent<Text>();
            t.font = Font;
            t.text = text;
            t.fontSize = size;
            t.color = color;
            t.alignment = align;
            t.fontStyle = style;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.lineSpacing = 1.08f;
            return t;
        }

        public static Button TextButton(Transform parent, string label, Color accent, System.Action onClick, int fontSize = 18)
        {
            var go = new GameObject("btn");
            var rt = Rect(go, parent);
            var img = RoundedImage(go, new Color(accent.r, accent.g, accent.b, 0.18f));
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            var colors = btn.colors;
            colors.highlightedColor = new Color(1.15f, 1.15f, 1.15f, 1f);
            colors.pressedColor = new Color(0.85f, 0.85f, 0.85f, 1f);
            btn.colors = colors;
            btn.onClick.AddListener(() => onClick?.Invoke());

            // left accent bar
            var bar = Panel(go.transform, "accent", new Color(accent.r, accent.g, accent.b, 0.95f));
            bar.anchorMin = new Vector2(0, 0.15f);
            bar.anchorMax = new Vector2(0, 0.85f);
            bar.pivot = new Vector2(0, 0.5f);
            bar.anchoredPosition = new Vector2(8, 0);
            bar.sizeDelta = new Vector2(4, 0);

            var outline = go.AddComponent<Outline>();
            outline.effectColor = new Color(accent.r, accent.g, accent.b, 0.45f);
            outline.effectDistance = new Vector2(1.2f, -1.2f);

            var txt = Label(go.transform, label, fontSize,
                new Color(Mathf.Min(1f, accent.r * 0.5f + 0.55f), Mathf.Min(1f, accent.g * 0.5f + 0.55f), Mathf.Min(1f, accent.b * 0.5f + 0.5f)),
                TextAnchor.MiddleCenter, FontStyle.Bold);
            Fill(txt.rectTransform, 10);
            txt.rectTransform.offsetMin = new Vector2(18, 6);
            txt.rectTransform.offsetMax = new Vector2(-12, -6);
            return btn;
        }

        public static Button PrimaryButton(Transform parent, string label, Color accent, System.Action onClick)
        {
            var go = new GameObject("btn_primary");
            Rect(go, parent);
            var img = RoundedImage(go, new Color(accent.r, accent.g, accent.b, 0.95f));
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            btn.onClick.AddListener(() => onClick?.Invoke());
            var txt = Label(go.transform, label, 17, new Color(0.06f, 0.04f, 0.02f), TextAnchor.MiddleCenter, FontStyle.Bold);
            Fill(txt.rectTransform, 8);
            return btn;
        }

        public static RectTransform Card(Transform parent, Color? bg = null)
        {
            var card = Panel(parent, "card", bg ?? CardBg);
            var le = card.gameObject.AddComponent<LayoutElement>();
            le.flexibleWidth = 1;
            le.minHeight = 48;
            var outline = card.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(1f, 1f, 1f, 0.06f);
            outline.effectDistance = new Vector2(1, -1);
            return card;
        }

        public static RectTransform SectionLabel(Transform parent, string text)
        {
            var t = Label(parent, text.ToUpperInvariant(), 12, Faint, TextAnchor.MiddleLeft, FontStyle.Bold);
            var le = t.gameObject.AddComponent<LayoutElement>();
            le.preferredHeight = 28;
            le.minHeight = 28;
            return t.rectTransform;
        }

        public static RectTransform RuleLine(Transform parent)
        {
            var go = new GameObject("rule");
            var rt = Rect(go, parent);
            var img = go.AddComponent<Image>();
            img.color = Rule;
            var le = go.AddComponent<LayoutElement>();
            le.preferredHeight = 1;
            le.minHeight = 1;
            le.flexibleWidth = 1;
            return rt;
        }

        /// Vertical scrolling list with soft mask.
        public static RectTransform ScrollList(Transform parent)
        {
            var viewport = Panel(parent, "viewport", new Color(0, 0, 0, 0.12f));
            Fill(viewport);
            viewport.gameObject.AddComponent<RectMask2D>();
            var scroll = viewport.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 36f;
            scroll.inertia = true;
            scroll.decelerationRate = 0.12f;

            var content = new GameObject("content");
            var crt = Rect(content, viewport);
            crt.anchorMin = new Vector2(0, 1);
            crt.anchorMax = new Vector2(1, 1);
            crt.pivot = new Vector2(0.5f, 1);
            crt.offsetMin = new Vector2(10, 0);
            crt.offsetMax = new Vector2(-10, 0);
            var layout = content.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 12;
            layout.padding = new RectOffset(6, 6, 12, 20);
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
            var le = row.gameObject.AddComponent<LayoutElement>();
            le.preferredHeight = height;
            le.minHeight = Mathf.Min(height, 48f);
            le.flexibleWidth = 1;
            return row;
        }

        public static InputField Input(Transform parent, string placeholder, string value)
        {
            var go = new GameObject("input");
            Rect(go, parent);
            RoundedImage(go, new Color(0, 0, 0, 0.45f));
            var input = go.AddComponent<InputField>();
            var txt = Label(go.transform, "", 18, Body, TextAnchor.MiddleLeft);
            Fill(txt.rectTransform, 12);
            var ph = Label(go.transform, placeholder, 18, Faint, TextAnchor.MiddleLeft, FontStyle.Italic);
            Fill(ph.rectTransform, 12);
            input.textComponent = txt;
            input.placeholder = ph;
            input.text = value;
            return input;
        }
    }
}
