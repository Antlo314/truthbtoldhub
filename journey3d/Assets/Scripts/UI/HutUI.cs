using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Journey3D
{
    /// The hut interface: HUD prompt + the ten station panels.
    /// Everything is built in code - no prefabs, no scene UI.
    public class HutUI : MonoBehaviour
    {
        public PlayerController player;
        public CameraRig cameraRig;
        public PlayerAppearance appearance;

        private Canvas _canvas;
        private Text _prompt;
        private Text _soulLine;
        private RectTransform _panelRoot;   // dim + frame, active while a station is open
        private RectTransform _panelFrame;  // the card itself (wide or side layout)
        private RectTransform _panelBody;   // content area rebuilt per station
        private Text _panelTitle;
        private Image _panelTitleBar;
        private Button _closeBtn;
        private GameObject _arcadeGameHost; // live mini-game overlay
        private bool _creatorLock;          // first-run: cannot close until the soul is made
        private int _creatorTab;

        public bool PanelOpen => _panelRoot != null && _panelRoot.gameObject.activeSelf;

        // bump to send EVERY soul (even ones created before) through the new
        // creation scene once; it saves and won't ask again unless bumped again
        public const int CURRENT_CREATOR_VERSION = 1;

        private static bool NeedsCreation()
        {
            var c = SaveState.Character;
            return !c.created || c.creatorVersion < CURRENT_CREATOR_VERSION;
        }

        private void Start()
        {
            _canvas = UIKit.CreateCanvas("HutCanvas");
            BuildHud();
            BuildPanelFrame();
            // first-run (and after a creator version bump): everyone builds a
            // soul once before the hut is playable
            if (NeedsCreation())
                OpenCreator(true);
            else
                MaybeShowHutWelcome();
        }

        /// One-time in-hut welcome after soul exists — closes the "what now?" gap.
        private void MaybeShowHutWelcome()
        {
            if (PlayerPrefs.GetInt("tbth_hut_welcome_v2", 0) == 1) return;
            OpenHutWelcome();
        }

        private void OpenHutWelcome()
        {
            var body = FreshBody("Welcome to Truth's Hut", UIKit.Gold);
            var list = UIKit.ScrollList(body);
            BodyText(list,
                "You stand in the chamber of return. Gold rings mark living stations. " +
                "Walk the aisle to Truth. Touch the Ledger, Archive, Forge, Offering, Arcade, and Wayfinder. " +
                "The Sanctum door opens the living Hall on the Hub.", 150, UIKit.Body);
            Header(list, "How to move");
            BodyText(list, "WASD or left stick to walk. Right-drag or right stick to look. E to interact. Esc to close panels.", 70, UIKit.Faint);
            Header(list, "The path");
            BodyText(list, "1. Speak with Truth  ·  2. Check the Ledger  ·  3. Open the Sanctum door for community  ·  4. Wayfinder for the roads beyond", 90, UIKit.Body);
            RowButton(list, "Begin", UIKit.Gold, () =>
            {
                PlayerPrefs.SetInt("tbth_hut_welcome_v2", 1);
                PlayerPrefs.Save();
                ClosePanel();
            }, 56);
        }

        private void Update()
        {
            if (_soulLine != null)
            {
                var c = SaveState.Character;
                _soulLine.text = $"{c.name}   ·   {TruthLore.TrustLabel()}   ·   Iron {c.iron}  Copper {c.copper}  Cosmic {c.cosmic}";
            }
        }

        // =====================================================
        //  HUD
        // =====================================================
        private void BuildHud()
        {
            var hud = UIKit.Panel(_canvas.transform, "hud", Color.clear);
            UIKit.Fill(hud);

            _prompt = UIKit.Label(hud, "", 26, UIKit.Amber, TextAnchor.MiddleCenter, FontStyle.Bold);
            var prt = _prompt.rectTransform;
            prt.anchorMin = new Vector2(0.5f, 0f);
            prt.anchorMax = new Vector2(0.5f, 0f);
            prt.pivot = new Vector2(0.5f, 0f);
            prt.anchoredPosition = new Vector2(0, 70);
            prt.sizeDelta = new Vector2(900, 44);

            var topBar = UIKit.Panel(hud, "topbar", new Color(0.04f, 0.03f, 0.02f, 0.62f));
            topBar.anchorMin = new Vector2(0, 1);
            topBar.anchorMax = new Vector2(0, 1);
            topBar.pivot = new Vector2(0, 1);
            topBar.anchoredPosition = new Vector2(16, -12);
            topBar.sizeDelta = new Vector2(680, 44);
            _soulLine = UIKit.Label(topBar, "", 17, UIKit.Amber, TextAnchor.MiddleLeft);
            UIKit.Fill(_soulLine.rectTransform, 12);

            var help = UIKit.Label(hud, "WASD walk  ·  Right-drag look  ·  E interact  ·  Esc close", 14, UIKit.Faint, TextAnchor.MiddleRight);
            var hrt = help.rectTransform;
            hrt.anchorMin = new Vector2(1, 0);
            hrt.anchorMax = new Vector2(1, 0);
            hrt.pivot = new Vector2(1, 0);
            hrt.anchoredPosition = new Vector2(-18, 14);
            hrt.sizeDelta = new Vector2(600, 24);
        }

        public void SetPrompt(Station s)
        {
            if (_prompt == null) return;
            if (s == null) { _prompt.text = ""; return; }
            _prompt.text = $"[E]  {s.label}";
            _prompt.color = s.accent;
        }

        // =====================================================
        //  Panel frame
        // =====================================================
        private Image _dimImage;

        private void BuildPanelFrame()
        {
            _panelRoot = UIKit.Panel(_canvas.transform, "panelRoot", new Color(0, 0, 0, 0.78f));
            _dimImage = _panelRoot.GetComponent<Image>();
            UIKit.Fill(_panelRoot);

            // responsive: fill the screen with margins so phones get a usable
            // panel instead of a fixed 980px card
            var frame = UIKit.Panel(_panelRoot, "frame", new Color(0.06f, 0.05f, 0.04f, 0.97f));
            _panelFrame = frame;
            SetFrameWide();
            var outline = frame.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(0.98f, 0.75f, 0.22f, 0.85f);
            outline.effectDistance = new Vector2(2, -2);

            var titleBar = UIKit.Panel(frame, "titlebar", new Color(0.14f, 0.1f, 0.04f, 1f));
            titleBar.anchorMin = new Vector2(0, 1);
            titleBar.anchorMax = new Vector2(1, 1);
            titleBar.pivot = new Vector2(0.5f, 1);
            titleBar.sizeDelta = new Vector2(0, 64);
            _panelTitleBar = titleBar.GetComponent<Image>();
            _panelTitle = UIKit.Label(titleBar, "", 30, UIKit.Gold, TextAnchor.MiddleLeft, FontStyle.Bold);
            UIKit.Fill(_panelTitle.rectTransform, 18);

            _closeBtn = UIKit.TextButton(titleBar, "X", UIKit.Gold, ClosePanel, 24);
            var close = _closeBtn;
            var crt = close.GetComponent<RectTransform>();
            crt.anchorMin = new Vector2(1, 0.5f);
            crt.anchorMax = new Vector2(1, 0.5f);
            crt.pivot = new Vector2(1, 0.5f);
            crt.anchoredPosition = new Vector2(-12, 0);
            crt.sizeDelta = new Vector2(42, 42);

            _panelBody = UIKit.Panel(frame, "body", Color.clear);
            _panelBody.anchorMin = Vector2.zero;
            _panelBody.anchorMax = Vector2.one;
            _panelBody.offsetMin = new Vector2(14, 14);
            _panelBody.offsetMax = new Vector2(-14, -72);

            _panelRoot.gameObject.SetActive(false);
        }

        private void SetFrameWide()
        {
            _panelFrame.anchorMin = new Vector2(0.02f, 0.03f);
            _panelFrame.anchorMax = new Vector2(0.98f, 0.97f);
            _panelFrame.pivot = new Vector2(0.5f, 0.5f);
            _panelFrame.offsetMin = Vector2.zero;
            _panelFrame.offsetMax = Vector2.zero;
        }

        private void SetFrameSide()
        {
            // creator layout: card docks right so the avatar stays on screen
            _panelFrame.anchorMin = new Vector2(0.46f, 0.03f);
            _panelFrame.anchorMax = new Vector2(0.99f, 0.97f);
            _panelFrame.pivot = new Vector2(0.5f, 0.5f);
            _panelFrame.offsetMin = Vector2.zero;
            _panelFrame.offsetMax = Vector2.zero;
        }

        public void ClosePanel()
        {
            if (_creatorLock) return;   // first-run soul creation must be completed
            if (_arcadeGameHost != null) Destroy(_arcadeGameHost);
            _arcadeGameHost = null;
            _panelRoot.gameObject.SetActive(false);
            if (cameraRig != null) cameraRig.portraitMode = false;
            if (_dimImage != null) _dimImage.color = new Color(0, 0, 0, 0.72f);
            SetFrameWide();
            LockInput(false);
        }

        private void LockInput(bool locked)
        {
            if (player != null) player.inputLocked = locked;
            if (cameraRig != null) cameraRig.inputLocked = locked;
        }

        private RectTransform FreshBody(string title, Color accent)
        {
            foreach (Transform child in _panelBody) Destroy(child.gameObject);
            _panelTitle.text = title;
            _panelTitle.color = accent;
            _panelRoot.gameObject.SetActive(true);
            LockInput(true);
            return _panelBody;
        }

        // =====================================================
        //  Station routing
        // =====================================================
        public void OpenStation(Station s)
        {
            // stations always use the full-width panel with a full dim and no
            // portrait camera - reset in case the creator left the side layout
            // (a lingering side/dim state would make the panel look empty/hidden)
            SetFrameWide();
            if (_dimImage != null) _dimImage.color = new Color(0, 0, 0, 0.78f);
            if (cameraRig != null) cameraRig.portraitMode = false;
            AudioManager.I?.PlayStationOpen();

            switch (s.id)
            {
                case StationId.Ledger: OpenLedger(s); break;
                case StationId.SeeingGlass: OpenSeeingGlass(s); break;
                case StationId.Archive: OpenArchive(s); break;
                case StationId.Soul: OpenSoul(s); break;
                case StationId.Forge: OpenForge(s); break;
                case StationId.Offering: OpenOffering(s); break;
                case StationId.Arcade: OpenArcade(s); break;
                case StationId.Wayfinder: OpenWayfinder(s); break;
                case StationId.Truth: OpenTruth(s); break;
                case StationId.Sanctum: OpenSanctum(s); break;
            }
        }

        private Text Header(Transform parent, string text)
        {
            var t = UIKit.Label(parent, text, 18, UIKit.Faint);
            var le = t.gameObject.AddComponent<LayoutElement>();
            le.preferredHeight = 46;
            return t;
        }

        private void BodyText(Transform parent, string text, float height, Color? color = null)
        {
            var t = UIKit.Label(parent, text, 19, color ?? UIKit.Body);
            var le = t.gameObject.AddComponent<LayoutElement>();
            le.preferredHeight = height;
        }

        private Button RowButton(Transform parent, string label, Color accent, System.Action onClick, float height = 52)
        {
            var b = UIKit.TextButton(parent, label, accent, onClick);
            var le = b.gameObject.AddComponent<LayoutElement>();
            le.preferredHeight = height;
            return b;
        }

        private void OpenWeb(string path)
        {
            Application.OpenURL(GameData.Config.webBase + path);
        }

        // =====================================================
        //  1. THE LEDGER
        // =====================================================
        private void OpenLedger(Station s)
        {
            var body = FreshBody("The Ledger  ·  The Daily Word", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Words from Truth, carried in from the wider Hub.");
            var loading = UIKit.Label(list, "Unrolling the scrolls...", 19, UIKit.Faint, TextAnchor.MiddleCenter, FontStyle.Italic);
            loading.gameObject.AddComponent<LayoutElement>().preferredHeight = 40;

            SupabaseClient.I.FetchBulletins(8, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0)
                {
                    BodyText(list, "The ledger page is quiet today. The word will come.", 60);
                }
                foreach (var r in rows)
                {
                    var row = UIKit.Row(list, 10, new Color(1, 1, 1, 0.04f));
                    var stack = row.gameObject.AddComponent<VerticalLayoutGroup>();
                    stack.padding = new RectOffset(12, 12, 8, 8);
                    stack.spacing = 4;
                    stack.childForceExpandHeight = false;
                    stack.childControlHeight = true;
                    row.GetComponent<LayoutElement>().preferredHeight = 130;
                    var title = UIKit.Label(row, (r.pinned ? "* " : "") + r.title, 21, s.accent, TextAnchor.UpperLeft, FontStyle.Bold);
                    title.gameObject.AddComponent<LayoutElement>().preferredHeight = 28;
                    var date = UIKit.Label(row, ShortDate(r.published_at), 14, UIKit.Faint);
                    date.gameObject.AddComponent<LayoutElement>().preferredHeight = 18;
                    var bodyTxt = UIKit.Label(row, Truncate(r.body, 220), 17, UIKit.Body);
                    bodyTxt.gameObject.AddComponent<LayoutElement>().flexibleHeight = 1;
                }
                RowButton(list, "Join the conversation in the Hall", s.accent, () => OpenWeb("/archive"));
                RowButton(list, "Read the Codex", UIKit.Faint, () => OpenWeb("/codex"));
            });
        }

        // =====================================================
        //  2. THE SEEING GLASS
        // =====================================================
        private void OpenSeeingGlass(Station s)
        {
            var body = FreshBody("The Seeing Glass  ·  Visions", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Dispatches of light - videos and images from the work. This glass shows their titles; the Hub plays them in full.");
            var loading = UIKit.Label(list, "The glass is clearing...", 19, UIKit.Faint, TextAnchor.MiddleCenter, FontStyle.Italic);
            loading.gameObject.AddComponent<LayoutElement>().preferredHeight = 40;

            SupabaseClient.I.FetchMedia("video,image", 12, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0) BodyText(list, "No visions yet - the glass waits for new light.", 50);
                foreach (var r in rows)
                {
                    var row = UIKit.Row(list, 54, new Color(1, 1, 1, 0.04f));
                    var t = UIKit.Label(row, $"{(r.kind == "video" ? "[Vision]" : "[Still]")}  {r.title}", 18, UIKit.Body, TextAnchor.MiddleLeft);
                    UIKit.Fill(t.rectTransform, 10);
                }
                RowButton(list, "Open the Wayfinder portals", s.accent, () => OpenWeb("/vision"));
                RowButton(list, "Watch the transmissions", UIKit.Faint, () => OpenWeb("/cinema"));
            });
        }

        // =====================================================
        //  3. THE ARCHIVE
        // =====================================================
        private void OpenArchive(Station s)
        {
            var body = FreshBody("The Archive  ·  Scrolls & Frequencies", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Scrolls to study, frequencies to hear. The Library holds the full shelves.");
            var loading = UIKit.Label(list, "Dusting the shelves...", 19, UIKit.Faint, TextAnchor.MiddleCenter, FontStyle.Italic);
            loading.gameObject.AddComponent<LayoutElement>().preferredHeight = 40;

            SupabaseClient.I.FetchMedia("pdf,link,audio", 12, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0) BodyText(list, "The shelves are being restocked.", 50);
                foreach (var r in rows)
                {
                    var row = UIKit.Row(list, 54, new Color(1, 1, 1, 0.04f));
                    string tag = r.kind == "audio" ? "[Frequency]" : "[Scroll]";
                    var t = UIKit.Label(row, $"{tag}  {r.title}", 18, UIKit.Body, TextAnchor.MiddleLeft);
                    UIKit.Fill(t.rectTransform, 10);
                }
                RowButton(list, "Enter the Library", s.accent, () => OpenWeb("/library"));
                RowButton(list, "Open the Codex", UIKit.Faint, () => OpenWeb("/codex"));
            });
        }

        // =====================================================
        //  4. YOUR SOUL
        // =====================================================
        private void OpenSoul(Station s)
        {
            // The Soul Mirror opens the 3D character creator.
            OpenCreator(false);
        }

        // =====================================================
        //  CHARACTER CREATOR (Soul Mirror + first-run)
        // =====================================================
        private static readonly string[] CreatorTabs = { "Body", "Hair", "Garb", "Path" };

        public void OpenCreator(bool firstRun)
        {
            _creatorLock = firstRun && NeedsCreation();
            _creatorTab = 0;
            // dock the card right + slow portrait orbit so you SEE your soul change;
            // barely dim the world so the live avatar preview stays visible
            SetFrameSide();
            if (_dimImage != null) _dimImage.color = new Color(0, 0, 0, 0.12f);
            if (cameraRig != null) cameraRig.portraitMode = true;
            RenderCreator();
        }

        private void RenderCreator()
        {
            var accent = UIKit.Amber;
            var c = SaveState.Character;
            var body = FreshBody(_creatorLock ? "Shape Your Soul  ·  Welcome, wanderer" : "Your Soul", accent);
            if (_closeBtn != null) _closeBtn.gameObject.SetActive(!_creatorLock);

            // tab bar
            var tabBar = UIKit.Panel(body, "tabs", Color.clear);
            tabBar.anchorMin = new Vector2(0, 1); tabBar.anchorMax = new Vector2(1, 1); tabBar.pivot = new Vector2(0.5f, 1);
            tabBar.sizeDelta = new Vector2(0, 42);
            var hl = tabBar.gameObject.AddComponent<HorizontalLayoutGroup>();
            hl.spacing = 6; hl.childControlWidth = true; hl.childForceExpandWidth = true; hl.childControlHeight = true; hl.childForceExpandHeight = true;
            for (int i = 0; i < CreatorTabs.Length; i++)
            {
                int idx = i;
                UIKit.TextButton(tabBar, CreatorTabs[i], i == _creatorTab ? accent : UIKit.Faint, () => { _creatorTab = idx; RenderCreator(); }, 17);
            }

            // scroll content between tab bar and bottom bar
            var host = UIKit.Panel(body, "host", Color.clear);
            host.anchorMin = Vector2.zero; host.anchorMax = Vector2.one; host.offsetMin = new Vector2(0, 52); host.offsetMax = new Vector2(0, -50);
            var list = UIKit.ScrollList(host);

            PreviewChips(list);
            switch (_creatorTab)
            {
                case 0: TabBody(list, c); break;
                case 1: TabHair(list, c); break;
                case 2: TabGarb(list, c); break;
                default: TabPath(list, c); break;
            }

            // bottom bar
            var bottom = UIKit.Panel(body, "bottom", Color.clear);
            bottom.anchorMin = new Vector2(0, 0); bottom.anchorMax = new Vector2(1, 0); bottom.pivot = new Vector2(0.5f, 0);
            bottom.sizeDelta = new Vector2(0, 44);
            var bh = bottom.gameObject.AddComponent<HorizontalLayoutGroup>();
            bh.spacing = 10; bh.childControlWidth = true; bh.childForceExpandWidth = true; bh.childControlHeight = true; bh.childForceExpandHeight = true;
            UIKit.TextButton(bottom, "Randomize", UIKit.Faint, () => { RandomizeAppearance(); appearance?.Apply(); RenderCreator(); }, 18);
            UIKit.TextButton(bottom, _creatorLock ? "Enter the Hut" : "Save", accent, SaveCreator, 20);
        }

        private void PreviewChips(Transform list)
        {
            var c = SaveState.Character;
            var row = UIKit.Row(list, 58, new Color(1, 1, 1, 0.05f));
            var h = row.gameObject.AddComponent<HorizontalLayoutGroup>();
            h.spacing = 8; h.padding = new RectOffset(12, 12, 8, 8);
            h.childControlWidth = true; h.childForceExpandWidth = true; h.childControlHeight = true; h.childForceExpandHeight = true;
            Chip(row, "Skin", AvatarPalette.Skin(c.skin));
            Chip(row, "Hair", AvatarPalette.Hair(c.hairColor));
            Chip(row, "Top", AvatarPalette.Cloth(c.top));
            Chip(row, "Legs", AvatarPalette.Cloth(c.bottom));
            Chip(row, "Boots", AvatarPalette.Boot(c.boots));
            Chip(row, "Eyes", AvatarPalette.Eye(c.eyes));
        }

        private void Chip(Transform parent, string label, Color col)
        {
            var chip = UIKit.Panel(parent, "chip", col);
            var t = UIKit.Label(chip, label, 13, new Color(0, 0, 0, 0.75f), TextAnchor.LowerCenter, FontStyle.Bold);
            UIKit.Fill(t.rectTransform, 3);
        }

        private void TabBody(Transform list, CharacterState c)
        {
            OptionGrid(list, "Frame", AvatarPalette.BUILDS, c.build, v => { c.build = v; if (!System.Array.Exists(AvatarPalette.OutfitsFor(v), o => o == c.outfit)) c.outfit = AvatarPalette.OutfitsFor(v)[0]; });
            SwatchGrid(list, "Skin tone", AvatarPalette.SKIN_TONES, c.skin, i => c.skin = i);
            SwatchGrid(list, "Eyes", AvatarPalette.EYE_COLORS, c.eyes, i => c.eyes = i);
        }

        private void TabHair(Transform list, CharacterState c)
        {
            SwatchGrid(list, "Hair color", AvatarPalette.HAIR_COLORS, c.hairColor, i => c.hairColor = i);
            BodyText(list, "Hair style and face are woven at the 2D shrine on the Hub - here your soul wears the garb's own cut.", 50, UIKit.Faint);
        }

        private void TabGarb(Transform list, CharacterState c)
        {
            OptionGrid(list, "Garb  (changes your whole figure)", AvatarPalette.OutfitsFor(c.build), c.outfit, v => c.outfit = v);
            SwatchGrid(list, "Top color", AvatarPalette.CLOTH_COLORS, c.top, i => c.top = i);
            SwatchGrid(list, "Legs color", AvatarPalette.CLOTH_COLORS, c.bottom, i => c.bottom = i);
            SwatchGrid(list, "Boots", AvatarPalette.BOOT_COLORS, c.boots, i => c.boots = i);
        }

        private void TabPath(Transform list, CharacterState c)
        {
            BodyText(list, "Name your soul", 28, UIKit.Faint);
            var input = UIKit.Input(list, "Speak your name...", c.name);
            input.gameObject.AddComponent<LayoutElement>().preferredHeight = 50;
            input.onValueChanged.AddListener(v => { if (!string.IsNullOrWhiteSpace(v)) c.name = v.Trim(); });

            BodyText(list, "Choose your path to the Source", 28, UIKit.Faint);
            for (int i = 0; i < AvatarPalette.PATHS.Length; i++)
            {
                string id = AvatarPalette.PATHS[i];
                string nm = AvatarPalette.PATH_NAMES[i];
                bool sel = c.path == id;
                RowButton(list, (sel ? "★ " : "") + nm + PathBlurb(id), sel ? UIKit.Amber : UIKit.Body, () => { c.path = id; RenderCreator(); }, 54);
            }
        }

        private static string PathBlurb(string id)
        {
            switch (id)
            {
                case "seer": return "  ·  vision & range";
                case "sentinel": return "  ·  defense & poise";
                case "scribe": return "  ·  crit & lifesteal";
                default: return "  ·  regen & spirit";
            }
        }

        // ---- creator widgets ----
        private void OptionGrid(Transform list, string label, string[] choices, string current, System.Action<string> set)
        {
            BodyText(list, label, 30, UIKit.Faint);
            const int cols = 4;
            int rows = Mathf.CeilToInt(choices.Length / (float)cols);
            var row = UIKit.Row(list, rows * 46 + 14, Color.clear);
            var grid = row.gameObject.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(205, 40); grid.spacing = new Vector2(8, 6);
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount; grid.constraintCount = cols;
            foreach (var ch in choices)
            {
                string v = ch;
                var col = v == current ? UIKit.Amber : UIKit.Faint;
                UIKit.TextButton(row, v, col, () => { set(v); appearance?.Apply(); RenderCreator(); }, 16);
            }
        }

        private void SwatchGrid(Transform list, string label, string[] hexes, int current, System.Action<int> set)
        {
            BodyText(list, label, 30, UIKit.Faint);
            const int cols = 16;
            int rows = Mathf.CeilToInt(hexes.Length / (float)cols);
            var row = UIKit.Row(list, rows * 50 + 12, Color.clear);
            var grid = row.gameObject.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(44, 44); grid.spacing = new Vector2(6, 6);
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount; grid.constraintCount = cols;
            for (int i = 0; i < hexes.Length; i++)
            {
                int idx = i;
                var go = new GameObject("sw");
                var rt = UIKit.Rect(go, row);
                go.AddComponent<Image>().color = UIKit.Hex(hexes[i]);
                var btn = go.AddComponent<Button>();
                btn.onClick.AddListener(() => { set(idx); appearance?.Apply(); RenderCreator(); });
                if (i == current)
                {
                    var o = go.AddComponent<Outline>();
                    o.effectColor = UIKit.Amber;
                    o.effectDistance = new Vector2(3, -3);
                }
            }
        }

        private void RandomizeAppearance()
        {
            var c = SaveState.Character;
            c.build = AvatarPalette.BUILDS[Random.Range(0, AvatarPalette.BUILDS.Length)];
            c.skin = Random.Range(0, AvatarPalette.SKIN_TONES.Length);
            c.hairStyle = AvatarPalette.HAIR_STYLES[Random.Range(0, AvatarPalette.HAIR_STYLES.Length)];
            c.hairColor = Random.Range(0, AvatarPalette.HAIR_COLORS.Length);
            c.face = AvatarPalette.FACES[Random.Range(0, AvatarPalette.FACES.Length)];
            var outfits = AvatarPalette.OutfitsFor(c.build);
            c.outfit = outfits[Random.Range(0, outfits.Length)];
            c.top = Random.Range(0, AvatarPalette.CLOTH_COLORS.Length);
            c.bottom = Random.Range(0, AvatarPalette.CLOTH_COLORS.Length);
            c.boots = Random.Range(0, AvatarPalette.BOOT_COLORS.Length);
            c.eyes = Random.Range(0, AvatarPalette.EYE_COLORS.Length);
            c.extra = AvatarPalette.EXTRAS[Random.Range(0, AvatarPalette.EXTRAS.Length)];
        }

        private void SaveCreator()
        {
            var c = SaveState.Character;
            if (string.IsNullOrWhiteSpace(c.name) || c.name == "Wandering Soul") c.name = "Wandering Soul";
            if (string.IsNullOrEmpty(c.path)) c.path = "seer";
            c.created = true;
            c.creatorVersion = CURRENT_CREATOR_VERSION;
            SaveState.Save();
            appearance?.Apply();
            _creatorLock = false;
            if (_closeBtn != null) _closeBtn.gameObject.SetActive(true);
            ClosePanel();
            // Fresh souls get the hut orientation right after creation
            if (PlayerPrefs.GetInt("tbth_hut_welcome_v2", 0) != 1)
                OpenHutWelcome();
        }

        // =====================================================
        //  5. THE FORGE
        // =====================================================
        private void OpenForge(Station s)
        {
            var body = FreshBody("The Forge  ·  Steel & Tonics", s.accent);
            var list = UIKit.ScrollList(body);
            var c = SaveState.Character;

            // one-time starter pouch so new souls can work the forge
            if (!c.discovered.Contains("hut3d_starter_pouch"))
            {
                c.iron += 3; c.copper += 2;
                SaveState.MarkDiscovered("hut3d_starter_pouch");
                BodyText(list, "Truth presses a small pouch into your hand: \"Every smith starts with borrowed ore. Repay the road, not me.\"  (+3 iron, +2 copper)", 70, UIKit.Amber);
            }

            Header(list, $"Your satchel:  Iron {c.iron}  ·  Copper {c.copper}  ·  Cosmic {c.cosmic}");

            BodyText(list, "— THE WEAPON LADDER —", 30, s.accent);
            foreach (var w in GameData.Data.weapons)
            {
                bool owned = c.ownedWeapons.Contains(w.id);
                bool equipped = c.equippedWeapon == w.id;
                string cost = CostString(w.iron, w.copper, w.cosmic);
                string status = equipped ? "  [BEARING]" : owned ? "  [FORGED]" : "";
                var row = UIKit.Row(list, 96, new Color(1, 1, 1, 0.04f));
                var stack = row.gameObject.AddComponent<VerticalLayoutGroup>();
                stack.padding = new RectOffset(12, 12, 6, 6);
                stack.childForceExpandHeight = false;
                stack.childControlHeight = true;
                var title = UIKit.Label(row, $"{w.name}{status}   ·   might {w.damage}  reach {w.reach}", 19, equipped ? UIKit.Amber : UIKit.Body, TextAnchor.UpperLeft, FontStyle.Bold);
                title.gameObject.AddComponent<LayoutElement>().preferredHeight = 26;
                var fl = UIKit.Label(row, w.flavor + (cost.Length > 0 ? $"   ({cost})" : ""), 15, UIKit.Faint);
                fl.gameObject.AddComponent<LayoutElement>().preferredHeight = 40;
                if (!owned)
                {
                    string label = SaveState.CanForge(w) ? $"Forge  ·  {cost}" : $"Needs {cost}";
                    var btn = UIKit.TextButton(row, label, s.accent, () =>
                    {
                        if (SaveState.Forge(w)) OpenForge(s);
                    }, 16);
                    btn.interactable = SaveState.CanForge(w);
                    btn.gameObject.AddComponent<LayoutElement>().preferredHeight = 30;
                }
                else if (!equipped)
                {
                    var btn = UIKit.TextButton(row, "Take up", UIKit.Amber, () =>
                    {
                        c.equippedWeapon = w.id; SaveState.Save(); OpenForge(s);
                    }, 16);
                    btn.gameObject.AddComponent<LayoutElement>().preferredHeight = 30;
                }
            }

            BodyText(list, "— TONICS FOR THE ROAD —  (drink before a fight; max 5 of each)", 34, s.accent);
            foreach (var t in GameData.Data.consumables)
            {
                if (c.cleared.Count < t.minClears) continue;   // sealed recipes stay hidden, like the web hut
                int stock = SaveState.Stock(t.id);
                string effect = (t.hp > 0 ? $"+{t.hp} vitality " : "") + (t.damage > 0 ? $"+{t.damage} might" : "");
                var row = UIKit.Row(list, 88, new Color(1, 1, 1, 0.04f));
                var stack = row.gameObject.AddComponent<VerticalLayoutGroup>();
                stack.padding = new RectOffset(12, 12, 6, 6);
                stack.childForceExpandHeight = false;
                stack.childControlHeight = true;
                var accent = UIKit.Hex(t.accent);
                var title = UIKit.Label(row, $"{t.name}   ·   {effect}   ·   stock {stock}/{SaveState.MaxConsumableStack}", 18, accent, TextAnchor.UpperLeft, FontStyle.Bold);
                title.gameObject.AddComponent<LayoutElement>().preferredHeight = 24;
                var d = UIKit.Label(row, t.desc, 15, UIKit.Faint);
                d.gameObject.AddComponent<LayoutElement>().preferredHeight = 34;
                var btn = UIKit.TextButton(row, $"Brew  ·  {CostString(t.iron, t.copper, t.cosmic)}", accent, () =>
                {
                    if (SaveState.Craft(t)) OpenForge(s);
                }, 15);
                btn.interactable = SaveState.CanCraft(t);
                btn.gameObject.AddComponent<LayoutElement>().preferredHeight = 28;
            }
        }

        private static string CostString(int iron, int copper, int cosmic)
        {
            var parts = new List<string>();
            if (iron > 0) parts.Add($"{iron} iron");
            if (copper > 0) parts.Add($"{copper} copper");
            if (cosmic > 0) parts.Add($"{cosmic} cosmic");
            return parts.Count == 0 ? "" : string.Join(" · ", parts);
        }

        // =====================================================
        //  6. THE OFFERING
        // =====================================================
        private void OpenOffering(Station s)
        {
            var body = FreshBody("The Offering  ·  Fuel the Vision", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "The work of light runs on more than willpower.");
            BodyText(list,
                "This hut, the Sanctum, and the 400 Series - a cinematic telling of Israelite history and recovered scroll-wisdom - " +
                "are built in the open, by one man refusing to quit the last run.\n\n" +
                "Patronage keeps the forge lit: it funds the recovery of buried knowledge, the craft of the 400 Series, " +
                "and the ground this chamber stands on. Every offering, one-time or monthly, is fuel.", 220);
            RowButton(list, "Make an offering", s.accent, () => OpenWeb("/support"), 58);
            RowButton(list, "Learn about the 400 Series", UIKit.Hex("#a855f7"), () => OpenWeb("/cinema"), 58);
            BodyText(list, "\"When you patron this work, when you share it, when you refuse to quit the chamber, you stoke a fire I cannot keep alone.\" - Truth", 90, UIKit.Faint);
        }

        // =====================================================
        //  7. THE ARCADE
        // =====================================================
        private void OpenArcade(Station s)
        {
            var body = FreshBody("The Arcade  ·  Season " + GameData.CurrentSeason(), s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Three cabinets hum in the corner. Runs are etched onto the season board of the Hub.");

            AddArcadeCard(list, "tetra", "TETRA", "Stack the falling forms. Clear lines. Ascend.", UIKit.Hex("#22d3ee"));
            AddArcadeCard(list, "serpent", "SERPENT", "Grow by the luminous orbs. Do not bite yourself.", UIKit.Hex("#22c55e"));
            AddArcadeCard(list, "veil", "VEIL", "Ride the pulse. Gather units. Return to the source.", UIKit.Hex("#7c5cff"));
        }

        private void AddArcadeCard(Transform list, string gameId, string title, string blurb, Color accent)
        {
            var row = UIKit.Row(list, 120, new Color(accent.r, accent.g, accent.b, 0.07f));
            var stack = row.gameObject.AddComponent<VerticalLayoutGroup>();
            stack.padding = new RectOffset(14, 14, 8, 8);
            stack.spacing = 4;
            stack.childForceExpandHeight = false;
            stack.childControlHeight = true;
            var t = UIKit.Label(row, title, 24, accent, TextAnchor.UpperLeft, FontStyle.Bold);
            t.gameObject.AddComponent<LayoutElement>().preferredHeight = 30;
            var b = UIKit.Label(row, blurb, 16, UIKit.Body);
            b.gameObject.AddComponent<LayoutElement>().preferredHeight = 24;

            var btnRow = UIKit.Panel(row, "btns", Color.clear);
            btnRow.gameObject.AddComponent<LayoutElement>().preferredHeight = 40;
            var h = btnRow.gameObject.AddComponent<HorizontalLayoutGroup>();
            h.spacing = 12;
            h.childForceExpandWidth = true;
            h.childControlWidth = true;
            h.childForceExpandHeight = true;
            h.childControlHeight = true;
            UIKit.TextButton(btnRow, "PLAY", accent, () => LaunchGame(gameId, accent), 18);
            UIKit.TextButton(btnRow, "Season board", accent, () => ShowLeaderboard(gameId, title, accent), 16);
        }

        private void ShowLeaderboard(string gameId, string title, Color accent)
        {
            var body = FreshBody($"{title}  ·  Season board  ·  {GameData.CurrentSeason()}", accent);
            var list = UIKit.ScrollList(body);
            var loading = UIKit.Label(list, "Consulting the board keeper...", 19, UIKit.Faint, TextAnchor.MiddleCenter, FontStyle.Italic);
            loading.gameObject.AddComponent<LayoutElement>().preferredHeight = 40;
            SupabaseClient.I.FetchLeaderboard(gameId, GameData.CurrentSeason(), 400, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0) BodyText(list, "No runs etched this season yet. Be the first.", 50);
                int rank = 1;
                foreach (var r in rows)
                {
                    if (rank > 10) break;
                    bool you = r.player_name == SaveState.Character.name;
                    var row = UIKit.Row(list, 46, new Color(1, 1, 1, you ? 0.12f : 0.04f));
                    string metric = gameId == "tetra" ? $"lines {r.lines}  lv {r.level}"
                                  : gameId == "veil" ? $"try {r.level}" : "";
                    var t = UIKit.Label(row, $"#{rank}   {r.player_name}   ·   {r.score:n0}   {metric}", 18,
                        you ? UIKit.Amber : UIKit.Body, TextAnchor.MiddleLeft, you ? FontStyle.Bold : FontStyle.Normal);
                    UIKit.Fill(t.rectTransform, 10);
                    rank++;
                }
                RowButton(list, "Back to the cabinets", accent, () => OpenArcade(GetStation(StationId.Arcade)));
            });
        }

        private Station GetStation(StationId id)
        {
            foreach (var s in FindObjectsByType<Station>(FindObjectsSortMode.None))
                if (s.id == id) return s;
            return null;
        }

        private void LaunchGame(string gameId, Color accent)
        {
            foreach (Transform child in _panelBody) Destroy(child.gameObject);
            _panelTitle.text = gameId.ToUpper() + "  ·  Esc to abandon the run";
            _panelTitle.color = accent;

            _arcadeGameHost = new GameObject("arcade_" + gameId);
            var rt = UIKit.Rect(_arcadeGameHost, _panelBody);
            UIKit.Fill(rt);

            ArcadeGameBase game = gameId switch
            {
                "tetra" => _arcadeGameHost.AddComponent<TetraGame>(),
                "serpent" => _arcadeGameHost.AddComponent<SerpentGame>(),
                _ => _arcadeGameHost.AddComponent<VeilGame>(),
            };
            game.accent = accent;
            game.onGameOver = result => OnArcadeGameOver(result, accent);
        }

        private void OnArcadeGameOver(ScoreResult result, Color accent)
        {
            if (_arcadeGameHost != null) Destroy(_arcadeGameHost);
            _arcadeGameHost = null;

            var body = FreshBody("Run complete", accent);
            var list = UIKit.ScrollList(body);
            string metric = result.game == "tetra" ? $"\nLines {result.lines}   ·   Level {result.level}"
                          : result.game == "veil" ? $"\nAttempts {result.level}" : "";
            BodyText(list, $"{result.game.ToUpper()}\n\nScore  {result.score:n0}{metric}", 140, accent);
            BodyText(list, "Etching the run onto the season board...", 40, UIKit.Faint);
            SupabaseClient.I.SubmitScore(result, SaveState.Character.name, (ok, msg) =>
            {
                BodyText(list, (ok ? "" : "") + msg, 70, ok ? UIKit.Amber : UIKit.Faint);
                RowButton(list, "Back to the cabinets", accent, () => OpenArcade(GetStation(StationId.Arcade)));
            });
        }

        // =====================================================
        //  8. THE WAYFINDER
        // =====================================================
        private void OpenWayfinder(Station s)
        {
            var body = FreshBody("The Wayfinder  ·  Roads Beyond", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Vision portals are open. Look through peace and trial, claim each road's relic. Full 3D chambers are still being laid.");
            RowButton(list, "Open the full Wayfinder map →", s.accent, () => OpenWeb("/vision"), 52);
            foreach (var d in GameData.Data.destinations)
            {
                var accent = UIKit.Hex(d.accent);
                var row = UIKit.Row(list, 110, new Color(accent.r, accent.g, accent.b, 0.08f));
                var stack = row.gameObject.AddComponent<VerticalLayoutGroup>();
                stack.padding = new RectOffset(14, 14, 8, 8);
                stack.spacing = 4;
                stack.childForceExpandHeight = false;
                stack.childControlHeight = true;
                var t = UIKit.Label(row, $"{d.name}   ·   {d.guide}", 18, accent, TextAnchor.UpperLeft, FontStyle.Bold);
                t.gameObject.AddComponent<LayoutElement>().preferredHeight = 24;
                var q = UIKit.Label(row, $"\"{d.quote}\"", 15, UIKit.Faint, TextAnchor.UpperLeft, FontStyle.Italic);
                q.gameObject.AddComponent<LayoutElement>().preferredHeight = 36;
                string destId = d.id;
                var openBtn = UIKit.TextButton(row, "Open vision portal →", accent, () => OpenWeb("/vision/" + destId), 16);
                openBtn.gameObject.AddComponent<LayoutElement>().preferredHeight = 36;
            }
            Header(list, "Also on the Hub");
            RowButton(list, "Epilogue — roads so far / Source", UIKit.Amber, () => OpenWeb("/epilogue"));
            RowButton(list, "The Hall — gather with souls", s.accent, () => OpenWeb("/archive"));
            RowButton(list, "The Codex — memory & whispers", s.accent, () => OpenWeb("/codex"));
            RowButton(list, "The Cinema — transmissions", s.accent, () => OpenWeb("/cinema"));
            RowButton(list, "The Offering — fuel the vision", UIKit.Gold, () => OpenWeb("/support"));
        }

        // =====================================================
        //  9. ASK TRUTH
        // =====================================================
        private void OpenTruth(Station s)
        {
            var body = FreshBody("Ask Truth", s.accent);
            var list = UIKit.ScrollList(body);
            BodyText(list, TruthLore.Intro(), 90, UIKit.Body);
            Header(list, $"Standing: {TruthLore.TrustLabel()}   ·   Threads opened: {TruthLore.Depth()}/{GameData.Lore.questions.Count}");

            var asked = new HashSet<string>(TruthLore.Asked());
            foreach (var q in GameData.Lore.questions)
            {
                bool opened = asked.Contains(q.id);
                bool unlocked = TruthLore.IsUnlocked(q);
                var color = opened ? UIKit.Amber : unlocked ? s.accent : new Color(1, 1, 1, 0.28f);
                string prefix = opened ? "· " : unlocked ? "? " : "~ ";
                RowButton(list, prefix + q.prompt, color, () =>
                {
                    if (unlocked || opened) ShowTruthAnswer(s, q);
                    else ShowTruthDeflection(s, q);
                }, 46);
            }
        }

        private void ShowTruthAnswer(Station s, TruthQuestionDef q)
        {
            SaveState.MarkDiscovered(TruthLore.DiscId(q.id));
            var body = FreshBody("Truth speaks", s.accent);
            var list = UIKit.ScrollList(body);
            BodyText(list, q.prompt, 40, UIKit.Faint);
            BodyText(list, q.answer, 260, UIKit.Body);
            if (!string.IsNullOrEmpty(q.accountTitle))
            {
                BodyText(list, "— CODEX PAGE UNLOCKED —", 34, UIKit.Amber);
                BodyText(list, q.accountTitle, 30, UIKit.Amber);
                BodyText(list, q.accountBody, 120, UIKit.Faint);
            }
            RowButton(list, "Ask more", s.accent, () => OpenTruth(s));
        }

        private void ShowTruthDeflection(Station s, TruthQuestionDef q)
        {
            var body = FreshBody("Truth holds the thread", s.accent);
            var list = UIKit.ScrollList(body);
            BodyText(list, q.prompt, 40, UIKit.Faint);
            BodyText(list, TruthLore.Deflection(q), 140, UIKit.Body);
            RowButton(list, "Ask something else", s.accent, () => OpenTruth(s));
        }

        // =====================================================
        //  10. THE SANCTUM
        // =====================================================
        private void OpenSanctum(Station s)
        {
            var body = FreshBody("The Hall  ·  Living Community", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Beyond this door: chambers of voice.");
            BodyText(list,
                "The Hall is where walking souls gather — live chambers, whispers soul-to-soul, " +
                "and the Architects who keep the peace. Real-time. Signed-in. Sacred.", 110);
            RowButton(list, "Enter the Hall", s.accent, () => OpenWeb("/archive"), 58);
            RowButton(list, "Your soul profile", UIKit.Body, () => OpenWeb("/self"), 48);
            RowButton(list, "Founding seals", UIKit.Faint, () => OpenWeb("/hierarchy"), 48);
        }

        // ---------- utils ----------
        private static string Truncate(string t, int max) =>
            string.IsNullOrEmpty(t) ? "" : t.Length <= max ? t : t.Substring(0, max) + "...";

        private static string ShortDate(string iso) =>
            string.IsNullOrEmpty(iso) ? "" : iso.Length >= 10 ? iso.Substring(0, 10) : iso;
    }
}
