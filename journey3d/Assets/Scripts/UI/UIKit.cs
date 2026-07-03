using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Journey3D
{
    /// Code-built UGUI helpers - the whole interface is constructed at runtime.
    public static class UIKit
    {
        public static readonly Color Void = Hex("#06080e");
        public static readonly Color PanelBg = new Color(0.055f, 0.045f, 0.03f, 0.97f);
        public static readonly Color Gold = Hex("#fbbf24");
        public static readonly Color Amber = Hex("#fcd34d");
        public static readonly Color Faint = new Color(1f, 0.95f, 0.85f, 0.55f);
        public static readonly Color Body = new Color(0.96f, 0.93f, 0.86f, 0.92f);

        private static Font _font;
        public static Font Font => _font != null ? _font : (_font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"));

        public static Color Hex(string hex)
        {
            return ColorUtility.TryParseHtmlString(hex, out var c) ? c : Color.white;
        }

        public static Canvas CreateCanvas(string name)
        {
            var go = new GameObject(name);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1600, 900);
            scaler.matchWidthOrHeight = 0.5f;
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
            go.AddComponent<Image>().color = color;
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
            return t;
        }

        public static Button TextButton(Transform parent, string label, Color accent, System.Action onClick, int fontSize = 20)
        {
            var go = new GameObject("btn_" + label);
            var rt = Rect(go, parent);
            var img = go.AddComponent<Image>();
            img.color = new Color(accent.r, accent.g, accent.b, 0.16f);
            var btn = go.AddComponent<Button>();
            var colors = btn.colors;
            colors.highlightedColor = new Color(1.2f, 1.2f, 1.2f, 1f);
            colors.pressedColor = new Color(0.8f, 0.8f, 0.8f, 1f);
            btn.colors = colors;
            btn.onClick.AddListener(() => onClick?.Invoke());

            var outline = go.AddComponent<Outline>();
            outline.effectColor = new Color(accent.r, accent.g, accent.b, 0.85f);
            outline.effectDistance = new Vector2(1.5f, -1.5f);

            var txt = Label(go.transform, label, fontSize, new Color(accent.r * 0.6f + 0.4f, accent.g * 0.6f + 0.4f, accent.b * 0.6f + 0.4f), TextAnchor.MiddleCenter, FontStyle.Bold);
            Fill(txt.rectTransform, 4);
            return btn;
        }

        /// Vertical scrolling list; returns the content transform to add rows to.
        public static RectTransform ScrollList(Transform parent)
        {
            var viewport = Panel(parent, "viewport", new Color(0, 0, 0, 0.25f));
            viewport.gameObject.AddComponent<RectMask2D>();
            var scroll = viewport.gameObject.AddComponent<ScrollRect>();
            scroll.horizontal = false;
            scroll.movementType = ScrollRect.MovementType.Clamped;
            scroll.scrollSensitivity = 28f;

            var content = new GameObject("content");
            var crt = Rect(content, viewport);
            crt.anchorMin = new Vector2(0, 1);
            crt.anchorMax = new Vector2(1, 1);
            crt.pivot = new Vector2(0.5f, 1);
            crt.offsetMin = new Vector2(6, 0);
            crt.offsetMax = new Vector2(-6, 0);
            var layout = content.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 10;
            layout.padding = new RectOffset(8, 8, 10, 10);
            layout.childForceExpandHeight = false;
            layout.childControlHeight = true;
            layout.childControlWidth = true;
            content.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scroll.content = crt;
            scroll.viewport = viewport;
            return crt;
        }

        /// A layout row inside a ScrollList with fixed preferred height.
        public static RectTransform Row(Transform content, float height, Color bg)
        {
            var row = Panel(content, "row", bg);
            var le = row.gameObject.AddComponent<LayoutElement>();
            le.preferredHeight = height;
            le.flexibleWidth = 1;
            return row;
        }

        public static InputField Input(Transform parent, string placeholder, string value)
        {
            var go = new GameObject("input");
            var rt = Rect(go, parent);
            go.AddComponent<Image>().color = new Color(0, 0, 0, 0.5f);
            var input = go.AddComponent<InputField>();
            var txt = Label(go.transform, "", 20, Body, TextAnchor.MiddleLeft);
            Fill(txt.rectTransform, 10);
            var ph = Label(go.transform, placeholder, 20, Faint, TextAnchor.MiddleLeft, FontStyle.Italic);
            Fill(ph.rectTransform, 10);
            input.textComponent = txt;
            input.placeholder = ph;
            input.text = value;
            return input;
        }
    }
}
