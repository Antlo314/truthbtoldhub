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
        private Text _panelEyebrow;
        private Image _panelTitleBar;
        private Image _panelAccentBar;
        private Button _closeBtn;
        private GameObject _arcadeGameHost; // live mini-game overlay
        private bool _creatorLock;          // first-run: cannot close until the soul is made
        private int _creatorTab;

        public bool PanelOpen => _panelRoot != null && _panelRoot.gameObject.activeSelf;

        // bump to send EVERY soul (even ones created before) through the new
        // creation scene once; it saves and won't ask again unless bumped again
        public const int CURRENT_CREATOR_VERSION = 3;

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

        /// One-time in-hut welcome after soul exists · closes the "what now?" gap.
        private void MaybeShowHutWelcome()
        {
            if (PlayerPrefs.GetInt("tbth_hut_welcome_v2", 0) == 1) return;
            OpenHutWelcome();
        }

        private void OpenHutWelcome()
        {
            var list = OpenShell("Orientation", "Welcome to Truth's Hut", UIKit.Gold);
            UIKit.HeroCard(list, "Chamber of return",
                "Gold rings mark living stations. Walk the aisle to Truth. The Sanctum door opens the living Hall.",
                UIKit.Gold);
            Header(list, "How to move");
            UIKit.ListRow(list, "Walk & look", "WASD or left stick · right-drag / right stick look", UIKit.Faint, null, "◎", "", 64, true);
            UIKit.ListRow(list, "Interact", "E to open a station · Esc to close panels", UIKit.Faint, null, "◎", "", 64, true);
            Header(list, "First path");
            UIKit.ListRow(list, "1 · Speak with Truth", "North dais — ask what only he will answer", UIKit.Amber, null, "1", "", 64, true);
            UIKit.ListRow(list, "2 · Ledger & Hall", "Word of the day, then community beyond the door", UIKit.Amber, null, "2", "", 64, true);
            UIKit.ListRow(list, "3 · Wayfinder", "Vision portals for the roads beyond the hut", UIKit.Amber, null, "3", "", 64, true);
            PrimaryCta(list, "Begin the walk →", UIKit.Gold, () =>
            {
                PlayerPrefs.SetInt("tbth_hut_welcome_v2", 1);
                PlayerPrefs.Save();
                ClosePanel();
            });
        }

        private void Update()
        {
            if (_soulLine != null)
            {
                var c = SaveState.Character;
                string place = DestinationManager.I != null && DestinationManager.I.InDestination
                    ? DestinationManager.I.CurrentId.ToUpperInvariant()
                    : "HUT";
                _soulLine.text = $"{c.name}  ·  {place}  ·  {TruthLore.TrustLabel()}  ·  Fe {c.iron}  Cu {c.copper}  ✦ {c.cosmic}";
            }
            if (_toast != null && _toast.gameObject.activeSelf && Time.unscaledTime > _toastUntil)
                _toast.gameObject.SetActive(false);
        }

        // =====================================================
        //  HUD
        // =====================================================
        private void BuildHud()
        {
            var hud = UIKit.Panel(_canvas.transform, "hud", Color.clear);
            UIKit.Fill(hud);

            // Bottom interact prompt — pill
            var promptPill = UIKit.Panel(hud, "prompt_pill", new Color(0.04f, 0.03f, 0.02f, 0.82f));
            promptPill.anchorMin = new Vector2(0.5f, 0f);
            promptPill.anchorMax = new Vector2(0.5f, 0f);
            promptPill.pivot = new Vector2(0.5f, 0f);
            promptPill.anchoredPosition = new Vector2(0, 56);
            promptPill.sizeDelta = new Vector2(420, 48);
            var pout = promptPill.gameObject.AddComponent<Outline>();
            pout.effectColor = new Color(0.98f, 0.75f, 0.22f, 0.35f);
            pout.effectDistance = new Vector2(1, -1);
            _prompt = UIKit.Label(promptPill, "", 16, UIKit.Amber, TextAnchor.MiddleCenter, FontStyle.Bold);
            UIKit.Fill(_prompt.rectTransform, 8);
            promptPill.gameObject.SetActive(false);
            _promptPill = promptPill;

            // Top soul status — glass bar
            var topBar = UIKit.Panel(hud, "topbar", new Color(0.05f, 0.04f, 0.03f, 0.78f));
            topBar.anchorMin = new Vector2(0, 1);
            topBar.anchorMax = new Vector2(0, 1);
            topBar.pivot = new Vector2(0, 1);
            topBar.anchoredPosition = new Vector2(16, -14);
            topBar.sizeDelta = new Vector2(520, 42);
            var tout = topBar.gameObject.AddComponent<Outline>();
            tout.effectColor = new Color(1f, 1f, 1f, 0.08f);
            tout.effectDistance = new Vector2(1, -1);
            _soulLine = UIKit.Label(topBar, "", 14, UIKit.Amber, TextAnchor.MiddleLeft, FontStyle.Bold);
            UIKit.Fill(_soulLine.rectTransform, 14);

            var help = UIKit.Label(hud, "WASD  ·  look  ·  E  ·  Esc", 12, UIKit.Muted, TextAnchor.MiddleRight);
            var hrt = help.rectTransform;
            hrt.anchorMin = new Vector2(1, 0);
            hrt.anchorMax = new Vector2(1, 0);
            hrt.pivot = new Vector2(1, 0);
            hrt.anchoredPosition = new Vector2(-18, 14);
            hrt.sizeDelta = new Vector2(320, 22);

            // Objective chip (top-right)
            _objChip = UIKit.Panel(hud, "obj_chip", new Color(0.05f, 0.04f, 0.03f, 0.88f));
            _objChip.anchorMin = new Vector2(1, 1);
            _objChip.anchorMax = new Vector2(1, 1);
            _objChip.pivot = new Vector2(1, 1);
            _objChip.anchoredPosition = new Vector2(-16, -14);
            _objChip.sizeDelta = new Vector2(340, 64);
            var oout = _objChip.gameObject.AddComponent<Outline>();
            oout.effectColor = new Color(0.98f, 0.75f, 0.22f, 0.4f);
            oout.effectDistance = new Vector2(1, -1);
            _objEyebrow = UIKit.Label(_objChip, "OBJECTIVE", 10, UIKit.Gold, TextAnchor.UpperLeft, FontStyle.Bold);
            var oer = _objEyebrow.rectTransform;
            oer.anchorMin = new Vector2(0, 1); oer.anchorMax = new Vector2(1, 1); oer.pivot = new Vector2(0, 1);
            oer.anchoredPosition = new Vector2(14, -10); oer.sizeDelta = new Vector2(-28, 16);
            _objTitle = UIKit.Label(_objChip, "", 14, UIKit.Body, TextAnchor.UpperLeft, FontStyle.Bold);
            var otr = _objTitle.rectTransform;
            otr.anchorMin = new Vector2(0, 1); otr.anchorMax = new Vector2(1, 1); otr.pivot = new Vector2(0, 1);
            otr.anchoredPosition = new Vector2(14, -26); otr.sizeDelta = new Vector2(-28, 20);
            _objDetail = UIKit.Label(_objChip, "", 12, UIKit.Faint, TextAnchor.UpperLeft);
            var odr = _objDetail.rectTransform;
            odr.anchorMin = new Vector2(0, 1); odr.anchorMax = new Vector2(1, 1); odr.pivot = new Vector2(0, 1);
            odr.anchoredPosition = new Vector2(14, -44); odr.sizeDelta = new Vector2(-28, 16);

            // Toast
            _toast = UIKit.Label(hud, "", 15, UIKit.Amber, TextAnchor.MiddleCenter, FontStyle.Bold);
            var tr = _toast.rectTransform;
            tr.anchorMin = new Vector2(0.5f, 0.5f);
            tr.anchorMax = new Vector2(0.5f, 0.5f);
            tr.pivot = new Vector2(0.5f, 0.5f);
            tr.anchoredPosition = new Vector2(0, 120);
            tr.sizeDelta = new Vector2(640, 40);
            _toast.gameObject.SetActive(false);

            RefreshObjective();
        }

        private RectTransform _promptPill;
        private RectTransform _objChip;
        private Text _objEyebrow, _objTitle, _objDetail;
        private Text _toast;
        private float _toastUntil;

        public void SetPrompt(Station s)
        {
            if (s == null) { SetPromptLabel(null, UIKit.Amber); return; }
            SetPromptLabel(s.label, s.accent);
        }

        public void SetPromptLabel(string label, Color accent)
        {
            if (_prompt == null || _promptPill == null) return;
            if (string.IsNullOrEmpty(label))
            {
                _promptPill.gameObject.SetActive(false);
                _prompt.text = "";
                return;
            }
            _promptPill.gameObject.SetActive(true);
            _prompt.text = $"E   ·   {label}";
            _prompt.color = accent;
            var outl = _promptPill.GetComponent<Outline>();
            if (outl != null) outl.effectColor = UIKit.WithA(accent, 0.45f);
        }

        public void RefreshObjective()
        {
            if (_objTitle == null) return;
            var o = ObjectiveSystem.Current();
            _objTitle.text = o.title;
            if (_objDetail != null) _objDetail.text = o.detail;
        }

        public void ShowToast(string msg)
        {
            if (_toast == null) return;
            _toast.text = msg ?? "";
            _toast.gameObject.SetActive(true);
            _toastUntil = Time.unscaledTime + 3.2f;
        }

        public void OnDestinationEntered(DestinationDef def)
        {
            ClosePanel();
            ShowToast("Entered · " + (def?.name ?? "the road"));
            RefreshObjective();
        }

        public void OnDestinationLeft()
        {
            ShowToast("Returned to Truth's Hut");
            RefreshObjective();
        }

        public void ShowGuideDialogue(DestinationDef def)
        {
            if (def == null) return;
            var list = OpenShell(def.guide, def.name, UIKit.Hex(def.accent));
            UIKit.HeroCard(list, "Guide", "\"" + def.quote + "\"", UIKit.Hex(def.accent));
            BodyText(list,
                "You stand on living ground — not a vision, but a road. Walk the path, claim the relic, and return through the south gate when you are ready.",
                100, UIKit.Body);
            PrimaryCta(list, "Continue →", UIKit.Hex(def.accent), ClosePanel);
            AudioManager.I?.PlayStationOpen();
        }

        // =====================================================
        //  Panel frame
        // =====================================================
        private Image _dimImage;

        private void BuildPanelFrame()
        {
            _panelRoot = UIKit.Panel(_canvas.transform, "panelRoot", UIKit.Dim);
            _dimImage = _panelRoot.GetComponent<Image>();
            UIKit.Fill(_panelRoot);

            var frame = UIKit.Panel(_panelRoot, "frame", UIKit.PanelBg);
            _panelFrame = frame;
            SetFrameWide();
            var outline = frame.gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(0.98f, 0.75f, 0.22f, 0.4f);
            outline.effectDistance = new Vector2(1.5f, -1.5f);

            // left accent strip (recolored per station)
            var accentStrip = UIKit.Panel(frame, "accent_strip", UIKit.Gold);
            accentStrip.anchorMin = new Vector2(0, 0);
            accentStrip.anchorMax = new Vector2(0, 1);
            accentStrip.pivot = new Vector2(0, 0.5f);
            accentStrip.anchoredPosition = Vector2.zero;
            accentStrip.sizeDelta = new Vector2(4, 0);
            _panelAccentBar = accentStrip.GetComponent<Image>();

            // header block
            var titleBar = UIKit.Panel(frame, "titlebar", new Color(0.07f, 0.055f, 0.035f, 1f));
            titleBar.anchorMin = new Vector2(0, 1);
            titleBar.anchorMax = new Vector2(1, 1);
            titleBar.pivot = new Vector2(0.5f, 1);
            titleBar.anchoredPosition = Vector2.zero;
            titleBar.sizeDelta = new Vector2(0, 86);
            _panelTitleBar = titleBar.GetComponent<Image>();

            _panelEyebrow = UIKit.Label(titleBar, "", 11, UIKit.Faint, TextAnchor.UpperLeft, FontStyle.Bold);
            var ert = _panelEyebrow.rectTransform;
            ert.anchorMin = new Vector2(0, 1);
            ert.anchorMax = new Vector2(1, 1);
            ert.pivot = new Vector2(0, 1);
            ert.anchoredPosition = new Vector2(22, -14);
            ert.sizeDelta = new Vector2(-90, 18);

            _panelTitle = UIKit.Label(titleBar, "", 26, UIKit.Gold, TextAnchor.UpperLeft, FontStyle.Bold);
            var trt = _panelTitle.rectTransform;
            trt.anchorMin = new Vector2(0, 1);
            trt.anchorMax = new Vector2(1, 1);
            trt.pivot = new Vector2(0, 1);
            trt.anchoredPosition = new Vector2(22, -34);
            trt.sizeDelta = new Vector2(-90, 40);

            // hairline under header
            var hair = UIKit.Panel(frame, "hair", UIKit.Rule);
            hair.anchorMin = new Vector2(0, 1);
            hair.anchorMax = new Vector2(1, 1);
            hair.pivot = new Vector2(0.5f, 1);
            hair.anchoredPosition = new Vector2(0, -86);
            hair.sizeDelta = new Vector2(0, 1);

            _closeBtn = UIKit.GhostButton(titleBar, "✕", UIKit.Gold, ClosePanel);
            var crt = _closeBtn.GetComponent<RectTransform>();
            crt.anchorMin = new Vector2(1, 0.5f);
            crt.anchorMax = new Vector2(1, 0.5f);
            crt.pivot = new Vector2(1, 0.5f);
            crt.anchoredPosition = new Vector2(-14, 0);
            crt.sizeDelta = new Vector2(48, 48);

            _panelBody = UIKit.Panel(frame, "body", Color.clear);
            _panelBody.anchorMin = Vector2.zero;
            _panelBody.anchorMax = Vector2.one;
            _panelBody.offsetMin = new Vector2(8, 12);
            _panelBody.offsetMax = new Vector2(-8, -94);

            _panelRoot.gameObject.SetActive(false);
        }

        private void SetFrameWide()
        {
            _panelFrame.anchorMin = new Vector2(0.5f, 0.5f);
            _panelFrame.anchorMax = new Vector2(0.5f, 0.5f);
            _panelFrame.pivot = new Vector2(0.5f, 0.5f);
            float w = Mathf.Min(760f, Screen.width * 0.94f);
            float h = Mathf.Min(820f, Screen.height * 0.9f);
            _panelFrame.sizeDelta = new Vector2(w, h);
            _panelFrame.anchoredPosition = Vector2.zero;
        }

        private void SetFrameSide()
        {
            // Creator: dock right so avatar stays in view
            _panelFrame.anchorMin = new Vector2(1f, 0.5f);
            _panelFrame.anchorMax = new Vector2(1f, 0.5f);
            _panelFrame.pivot = new Vector2(1f, 0.5f);
            float w = Mathf.Min(520f, Screen.width * 0.48f);
            float h = Mathf.Min(820f, Screen.height * 0.9f);
            _panelFrame.sizeDelta = new Vector2(Mathf.Max(360f, w), h);
            _panelFrame.anchoredPosition = new Vector2(-16f, 0);
        }

        public void ClosePanel()
        {
            if (_creatorLock) return;
            if (_arcadeGameHost != null) Destroy(_arcadeGameHost);
            _arcadeGameHost = null;
            _panelRoot.gameObject.SetActive(false);
            if (cameraRig != null) cameraRig.portraitMode = false;
            if (_dimImage != null) _dimImage.color = UIKit.Dim;
            SetFrameWide();
            LockInput(false);
        }

        private void LockInput(bool locked)
        {
            if (player != null) player.inputLocked = locked;
            if (cameraRig != null) cameraRig.inputLocked = locked;
        }

        /// Clears body, themes chrome, shows panel. Returns raw body for custom layouts (creator).
        private RectTransform FreshBody(string title, Color accent)
        {
            return PrepareShell("Station", title, accent);
        }

        private RectTransform PrepareShell(string eyebrow, string title, Color accent)
        {
            foreach (Transform child in _panelBody) Destroy(child.gameObject);
            if (_panelEyebrow != null)
            {
                _panelEyebrow.text = (eyebrow ?? "STATION").ToUpperInvariant();
                _panelEyebrow.color = UIKit.WithA(accent, 0.85f);
            }
            _panelTitle.text = title ?? "";
            _panelTitle.color = accent;
            if (_panelAccentBar != null) _panelAccentBar.color = accent;
            if (_panelTitleBar != null)
                _panelTitleBar.color = Color.Lerp(new Color(0.07f, 0.055f, 0.035f, 1f), UIKit.WithA(accent, 0.18f), 0.35f);
            var outl = _panelFrame != null ? _panelFrame.GetComponent<Outline>() : null;
            if (outl != null) outl.effectColor = UIKit.WithA(accent, 0.45f);
            _panelRoot.gameObject.SetActive(true);
            UIKit.PlayOpen(_panelFrame.gameObject);
            LockInput(true);
            return _panelBody;
        }

        /// Themed shell + scroll list (standard station menus).
        private RectTransform OpenShell(string eyebrow, string title, Color accent)
        {
            return UIKit.ScrollList(PrepareShell(eyebrow, title, accent));
        }

        private void PrimaryCta(Transform list, string label, Color accent, System.Action onClick)
        {
            var b = UIKit.PrimaryButton(list, label, accent, onClick);
            UIKit.LE(b, prefH: 54, minH: 52);
        }

        private void GhostCta(Transform list, string label, Color accent, System.Action onClick)
        {
            var b = UIKit.GhostButton(list, label, accent, onClick);
            UIKit.LE(b, prefH: 50, minH: 48);
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

        private void Header(Transform parent, string text)
        {
            UIKit.RuleLine(parent);
            UIKit.SectionLabel(parent, text);
        }

        private void BodyText(Transform parent, string text, float height, Color? color = null)
        {
            var t = UIKit.Label(parent, text, 15, color ?? UIKit.Body);
            UIKit.LE(t, prefH: height, minH: Mathf.Max(32f, height * 0.5f));
        }

        private Button RowButton(Transform parent, string label, Color accent, System.Action onClick, float height = 52)
        {
            // Map legacy row buttons to industry list rows
            var b = UIKit.ListRow(parent, label, "", accent, onClick, "◆", "›", Mathf.Max(UIKit.TouchMin, height));
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
            var list = OpenShell("The Ledger", "The Daily Word", s.accent);
            UIKit.HeroCard(list, "From Truth", "Words carried in from the wider Hub — pinned dispatches first.", s.accent);
            var loading = UIKit.LoadingState(list, "Unrolling the scrolls…");

            SupabaseClient.I.FetchBulletins(8, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0)
                    UIKit.EmptyState(list, "The page is quiet", "No dispatches today. The word will come.", s.accent);
                foreach (var r in rows)
                {
                    string title = (r.pinned ? "★  " : "") + r.title;
                    string sub = ShortDate(r.published_at) + "  ·  " + Truncate(r.body, 90);
                    UIKit.ListRow(list, title, sub, s.accent, null, r.pinned ? "★" : "☰", "", 84, true);
                }
                Header(list, "Continue");
                PrimaryCta(list, "Join the Hall →", s.accent, () => OpenWeb("/archive"));
                GhostCta(list, "Read the Codex", UIKit.Faint, () => OpenWeb("/codex"));
            });
        }

        // =====================================================
        //  2. THE SEEING GLASS
        // =====================================================
        private void OpenSeeingGlass(Station s)
        {
            var list = OpenShell("Seeing Glass", "Visions & Light", s.accent);
            UIKit.HeroCard(list, "Dispatches of light", "Titles of films and stills. Full playback lives on the Hub.", s.accent);
            var loading = UIKit.LoadingState(list, "The glass is clearing…");

            SupabaseClient.I.FetchMedia("video,image", 12, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0)
                    UIKit.EmptyState(list, "No visions yet", "The glass waits for new light.", s.accent);
                foreach (var r in rows)
                {
                    string glyph = r.kind == "video" ? "▶" : "▣";
                    string kind = r.kind == "video" ? "Vision" : "Still";
                    UIKit.ListRow(list, r.title, kind, s.accent, null, glyph, "", 68, true);
                }
                Header(list, "Open on the Hub");
                PrimaryCta(list, "Wayfinder portals →", s.accent, () => OpenWeb("/vision"));
                GhostCta(list, "Cinema transmissions", UIKit.Faint, () => OpenWeb("/cinema"));
            });
        }

        // =====================================================
        //  3. THE ARCHIVE
        // =====================================================
        private void OpenArchive(Station s)
        {
            var list = OpenShell("The Archive", "Scrolls & Frequencies", s.accent);
            UIKit.HeroCard(list, "Shelves of the hut", "Scrolls to study, frequencies to hear. The Library holds the full collection.", s.accent);
            var loading = UIKit.LoadingState(list, "Dusting the shelves…");

            SupabaseClient.I.FetchMedia("pdf,link,audio", 12, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0)
                    UIKit.EmptyState(list, "Shelves restocking", "Return soon — or enter the Library now.", s.accent);
                foreach (var r in rows)
                {
                    string glyph = r.kind == "audio" ? "♪" : "§";
                    string kind = r.kind == "audio" ? "Frequency" : "Scroll";
                    UIKit.ListRow(list, r.title, kind, s.accent, null, glyph, "", 68, true);
                }
                Header(list, "Open on the Hub");
                PrimaryCta(list, "Enter the Library →", s.accent, () => OpenWeb("/library"));
                GhostCta(list, "Open the Codex", UIKit.Faint, () => OpenWeb("/codex"));
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
            var body = PrepareShell(_creatorLock ? "First shape" : "Soul Mirror",
                _creatorLock ? "Shape Your Soul" : "Your Soul", accent);
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
                RowButton(list, (sel ? "? " : "") + nm + PathBlurb(id), sel ? UIKit.Amber : UIKit.Body, () => { c.path = id; RenderCreator(); }, 54);
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
            var list = OpenShell("The Forge", "Steel & Tonics", s.accent);
            var c = SaveState.Character;

            if (!c.discovered.Contains("hut3d_starter_pouch"))
            {
                c.iron += 3; c.copper += 2;
                SaveState.MarkDiscovered("hut3d_starter_pouch");
                UIKit.HeroCard(list, "Starter pouch",
                    "Truth presses ore into your hand: \"Every smith starts with borrowed ore.\"  (+3 iron, +2 copper)",
                    UIKit.Amber);
            }

            UIKit.StatPills(list, new[]
            {
                ("Iron", c.iron.ToString()),
                ("Copper", c.copper.ToString()),
                ("Cosmic", c.cosmic.ToString()),
            }, s.accent);

            Header(list, "Weapon ladder");
            foreach (var w in GameData.Data.weapons)
            {
                bool owned = c.ownedWeapons.Contains(w.id);
                bool equipped = c.equippedWeapon == w.id;
                string cost = CostString(w.iron, w.copper, w.cosmic);
                string status = equipped ? "Bearing" : owned ? "Forged" : (cost.Length > 0 ? cost : "Free");
                string sub = "Might " + w.damage + " · Reach " + w.reach + "  ·  " + status;
                string glyph = equipped ? "W" : owned ? "+" : "o";
                if (!owned)
                {
                    bool can = SaveState.CanForge(w);
                    UIKit.ListRow(list, w.name, sub + "  ·  " + Truncate(w.flavor, 40), s.accent, () =>
                    {
                        if (SaveState.Forge(w)) OpenForge(s);
                    }, glyph, can ? "FORGE" : "...", 86, !can);
                }
                else if (!equipped)
                {
                    UIKit.ListRow(list, w.name, sub, UIKit.Amber, () =>
                    {
                        c.equippedWeapon = w.id; SaveState.Save(); OpenForge(s);
                    }, glyph, "WIELD", 78);
                }
                else
                {
                    UIKit.ListRow(list, w.name, sub, UIKit.Amber, null, glyph, "EQ", 72, true);
                }
            }

            Header(list, "Tonics for the road");
            foreach (var t in GameData.Data.consumables)
            {
                if (c.cleared.Count < t.minClears) continue;
                int stock = SaveState.Stock(t.id);
                string effect = (t.hp > 0 ? "+" + t.hp + " HP " : "") + (t.damage > 0 ? "+" + t.damage + " dmg" : "");
                var accent = UIKit.Hex(t.accent);
                bool can = SaveState.CanCraft(t);
                UIKit.ListRow(list, t.name, effect + " · stock " + stock + "/" + SaveState.MaxConsumableStack + " · " + CostString(t.iron, t.copper, t.cosmic),
                    accent, () => { if (SaveState.Craft(t)) OpenForge(s); }, "+", can ? "BREW" : "...", 78, !can);
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
            var list = OpenShell("The Offering", "Fuel the Vision", s.accent);
            UIKit.HeroCard(list, "Patronage",
                "The hut, the Hall, and the 400 Series are built in the open. Every offering keeps the forge lit.",
                s.accent);
            BodyText(list,
                "Funds the recovery of buried knowledge, the craft of the 400 Series, and the ground this chamber stands on.",
                72, UIKit.Faint);
            PrimaryCta(list, "Make an offering →", s.accent, () => OpenWeb("/support"));
            GhostCta(list, "Learn about the 400 Series", UIKit.Hex("#a855f7"), () => OpenWeb("/cinema"));
            Header(list, "From Truth");
            BodyText(list, "\"When you patron this work, when you share it, when you refuse to quit the chamber, you stoke a fire I cannot keep alone.\"", 80, UIKit.Faint);
        }

        // =====================================================
        //  7. THE ARCADE
        // =====================================================
        private void OpenArcade(Station s)
        {
            var list = OpenShell("The Arcade", "Season " + GameData.CurrentSeason(), s.accent);
            UIKit.HeroCard(list, "Three cabinets", "Runs etch onto the season board of the Hub.", s.accent);

            AddArcadeCard(list, "tetra", "TETRA", "Stack the falling forms. Clear lines. Ascend.", UIKit.Hex("#22d3ee"));
            AddArcadeCard(list, "serpent", "SERPENT", "Grow by the luminous orbs. Do not bite yourself.", UIKit.Hex("#22c55e"));
            AddArcadeCard(list, "veil", "VEIL", "Ride the pulse. Gather units. Return to the source.", UIKit.Hex("#7c5cff"));
        }

        private void AddArcadeCard(Transform list, string gameId, string title, string blurb, Color accent)
        {
            UIKit.ListRow(list, title, blurb, accent, () => LaunchGame(gameId, accent), "▶", "PLAY", 80);
            GhostCta(list, $"Season board · {title}", accent, () => ShowLeaderboard(gameId, title, accent));
        }

        private void ShowLeaderboard(string gameId, string title, Color accent)
        {
            var list = OpenShell("Season board", title + " · " + GameData.CurrentSeason(), accent);
            var loading = UIKit.LoadingState(list, "Consulting the board keeper…");
            SupabaseClient.I.FetchLeaderboard(gameId, GameData.CurrentSeason(), 400, rows =>
            {
                if (loading != null) Destroy(loading.gameObject);
                if (rows.Count == 0)
                    UIKit.EmptyState(list, "No runs yet", "Be the first etched this season.", accent);
                int rank = 1;
                foreach (var r in rows)
                {
                    if (rank > 10) break;
                    bool you = r.player_name == SaveState.Character.name;
                    string metric = gameId == "tetra" ? $"lines {r.lines} · lv {r.level}"
                                  : gameId == "veil" ? $"try {r.level}" : "";
                    string sub = $"{r.score:n0}" + (metric.Length > 0 ? "  ·  " + metric : "");
                    UIKit.ListRow(list, $"#{rank}  {r.player_name}", sub, you ? UIKit.Amber : accent, null,
                        rank <= 3 ? "★" : "·", "", 64, true);
                    rank++;
                }
                PrimaryCta(list, "Back to cabinets →", accent, () => OpenArcade(GetStation(StationId.Arcade)));
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
            PrepareShell("Arcade run", gameId.ToUpperInvariant() + "  ·  Esc to abandon", accent);

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

            var list = OpenShell("Run complete", result.game.ToUpperInvariant(), accent);
            string metric = result.game == "tetra" ? $"Lines {result.lines} · Level {result.level}"
                          : result.game == "veil" ? $"Attempts {result.level}" : "Season board";
            UIKit.StatPills(list, new[]
            {
                ("Score", result.score.ToString("n0")),
                ("Detail", metric),
            }, accent);
            BodyText(list, "Etching the run onto the season board…", 36, UIKit.Faint);
            SupabaseClient.I.SubmitScore(result, SaveState.Character.name, (ok, msg) =>
            {
                BodyText(list, msg ?? (ok ? "Etched." : "Could not etch."), 50, ok ? UIKit.Amber : UIKit.Faint);
                PrimaryCta(list, "Back to cabinets →", accent, () => OpenArcade(GetStation(StationId.Arcade)));
            });
        }

        // =====================================================
        //  8. THE WAYFINDER
        // =====================================================
        private void OpenWayfinder(Station s)
        {
            var list = OpenShell("The Wayfinder", "Roads Beyond", s.accent);
            UIKit.HeroCard(list, "Real places",
                "Step through and walk Eden, Giza, the Fair, the Vault, the Emerald Halls. Claim relics. Return by the south gate.",
                s.accent);
            Header(list, "Travel");
            foreach (var d in GameData.Data.destinations)
            {
                var accent = UIKit.Hex(d.accent);
                string destId = d.id;
                bool visited = DestinationManager.Visited(destId);
                bool relic = DestinationManager.HasRelic(destId);
                string status = relic ? "Relic claimed" : visited ? "Visited" : "Unopened";
                string sub = d.guide + "  ·  " + status + "  ·  \"" + Truncate(d.quote, 36) + "\"";
                UIKit.ListRow(list, d.name, sub, accent, () =>
                {
                    ClosePanel();
                    DestinationManager.I?.Enter(destId);
                }, relic ? "★" : "◈", "TRAVEL", 88);
            }
            Header(list, "Visions on the Hub");
            GhostCta(list, "Cinematic vision portals →", s.accent, () => OpenWeb("/vision"));
            Header(list, "Also on the Hub");
            UIKit.ListRow(list, "Epilogue", "Roads so far · Return to the Source", UIKit.Amber, () => OpenWeb("/epilogue"), "☀");
            UIKit.ListRow(list, "The Hall", "Gather with souls", s.accent, () => OpenWeb("/archive"), "◎");
            UIKit.ListRow(list, "The Codex", "Memory & whispers", s.accent, () => OpenWeb("/codex"), "§");
            UIKit.ListRow(list, "The Cinema", "Transmissions", s.accent, () => OpenWeb("/cinema"), "▶");
            UIKit.ListRow(list, "The Offering", "Fuel the vision", UIKit.Gold, () => OpenWeb("/support"), "✦");
        }

        // =====================================================
        //  9. ASK TRUTH
        // =====================================================
        private void OpenTruth(Station s)
        {
            var list = OpenShell("Ask Truth", "The Brother Behind the Hood", s.accent);
            UIKit.HeroCard(list, TruthLore.TrustLabel(),
                TruthLore.Intro(),
                s.accent);
            int depth = TruthLore.Depth();
            int total = GameData.Lore.questions.Count;
            UIKit.StatPills(list, new[]
            {
                ("Threads", $"{depth}/{total}"),
                ("Standing", TruthLore.TrustLabel()),
            }, s.accent);
            UIKit.ProgressBar(list, total > 0 ? (float)depth / total : 0f, s.accent);

            Header(list, "Threads");
            var asked = new HashSet<string>(TruthLore.Asked());
            foreach (var q in GameData.Lore.questions)
            {
                bool opened = asked.Contains(q.id);
                bool unlocked = TruthLore.IsUnlocked(q);
                var color = opened ? UIKit.Amber : unlocked ? s.accent : UIKit.Muted;
                string glyph = opened ? "●" : unlocked ? "?" : "◌";
                string status = opened ? "Opened" : unlocked ? "Ask now" : "Sealed";
                UIKit.ListRow(list, q.prompt, status, color, () =>
                {
                    if (unlocked || opened) ShowTruthAnswer(s, q);
                    else ShowTruthDeflection(s, q);
                }, glyph, unlocked || opened ? "›" : "", 72, !unlocked && !opened);
            }
        }

        private void ShowTruthAnswer(Station s, TruthQuestionDef q)
        {
            SaveState.MarkDiscovered(TruthLore.DiscId(q.id));
            var list = OpenShell("Truth speaks", q.prompt, s.accent);
            BodyText(list, q.answer, 220, UIKit.Body);
            if (!string.IsNullOrEmpty(q.accountTitle))
            {
                Header(list, "Codex page unlocked");
                UIKit.ListRow(list, q.accountTitle, Truncate(q.accountBody, 100), UIKit.Amber, null, "§", "", 80, true);
            }
            PrimaryCta(list, "Ask more →", s.accent, () => OpenTruth(s));
        }

        private void ShowTruthDeflection(Station s, TruthQuestionDef q)
        {
            var list = OpenShell("Truth holds the thread", q.prompt, s.accent);
            BodyText(list, TruthLore.Deflection(q), 140, UIKit.Body);
            GhostCta(list, "Ask something else", s.accent, () => OpenTruth(s));
        }

        // =====================================================
        //  10. THE SANCTUM
        // =====================================================
        private void OpenSanctum(Station s)
        {
            var list = OpenShell("The Hall", "Living Community", s.accent);
            UIKit.HeroCard(list, "Beyond this door",
                "Chambers of voice. Whispers soul-to-soul. Architects keep the peace. Real-time. Signed-in. Sacred.",
                s.accent);
            PrimaryCta(list, "Enter the Hall →", s.accent, () => OpenWeb("/archive"));
            UIKit.ListRow(list, "Your soul profile", "Identity core on the Hub", UIKit.Body, () => OpenWeb("/self"), "◎");
            UIKit.ListRow(list, "Founding seals", "The 144 · hierarchy", UIKit.Faint, () => OpenWeb("/hierarchy"), "★");
        }

        // ---------- utils ----------
        private static string Truncate(string t, int max) =>
            string.IsNullOrEmpty(t) ? "" : t.Length <= max ? t : t.Substring(0, max) + "...";

        private static string ShortDate(string iso) =>
            string.IsNullOrEmpty(iso) ? "" : iso.Length >= 10 ? iso.Substring(0, 10) : iso;
    }
}
