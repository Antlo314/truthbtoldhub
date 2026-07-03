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

        private Canvas _canvas;
        private Text _prompt;
        private Text _soulLine;
        private RectTransform _panelRoot;   // dim + frame, active while a station is open
        private RectTransform _panelBody;   // content area rebuilt per station
        private Text _panelTitle;
        private Image _panelTitleBar;
        private GameObject _arcadeGameHost; // live mini-game overlay

        public bool PanelOpen => _panelRoot != null && _panelRoot.gameObject.activeSelf;

        private void Start()
        {
            _canvas = UIKit.CreateCanvas("HutCanvas");
            BuildHud();
            BuildPanelFrame();
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

            var topBar = UIKit.Panel(hud, "topbar", new Color(0, 0, 0, 0.45f));
            topBar.anchorMin = new Vector2(0, 1);
            topBar.anchorMax = new Vector2(0, 1);
            topBar.pivot = new Vector2(0, 1);
            topBar.anchoredPosition = new Vector2(18, -14);
            topBar.sizeDelta = new Vector2(660, 40);
            _soulLine = UIKit.Label(topBar, "", 18, UIKit.Body, TextAnchor.MiddleLeft);
            UIKit.Fill(_soulLine.rectTransform, 10);

            var help = UIKit.Label(hud, "WASD move  ·  Right-drag orbit  ·  E interact  ·  Esc close", 15, UIKit.Faint, TextAnchor.MiddleRight);
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
        private void BuildPanelFrame()
        {
            _panelRoot = UIKit.Panel(_canvas.transform, "panelRoot", new Color(0, 0, 0, 0.72f));
            UIKit.Fill(_panelRoot);

            var frame = UIKit.Panel(_panelRoot, "frame", UIKit.PanelBg);
            frame.anchorMin = new Vector2(0.5f, 0.5f);
            frame.anchorMax = new Vector2(0.5f, 0.5f);
            frame.pivot = new Vector2(0.5f, 0.5f);
            frame.sizeDelta = new Vector2(980, 660);
            var outline = frame.gameObject.AddComponent<Outline>();
            outline.effectColor = UIKit.Gold;
            outline.effectDistance = new Vector2(2, -2);

            var titleBar = UIKit.Panel(frame, "titlebar", new Color(0.12f, 0.08f, 0.03f, 1f));
            titleBar.anchorMin = new Vector2(0, 1);
            titleBar.anchorMax = new Vector2(1, 1);
            titleBar.pivot = new Vector2(0.5f, 1);
            titleBar.sizeDelta = new Vector2(0, 64);
            _panelTitleBar = titleBar.GetComponent<Image>();
            _panelTitle = UIKit.Label(titleBar, "", 30, UIKit.Gold, TextAnchor.MiddleLeft, FontStyle.Bold);
            UIKit.Fill(_panelTitle.rectTransform, 18);

            var close = UIKit.TextButton(titleBar, "X", UIKit.Gold, ClosePanel, 24);
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

        public void ClosePanel()
        {
            if (_arcadeGameHost != null) Destroy(_arcadeGameHost);
            _arcadeGameHost = null;
            _panelRoot.gameObject.SetActive(false);
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
            UIKit.Fill(list.parent.GetComponent<RectTransform>());
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
                RowButton(list, "Leave a testimony on the Hub", s.accent, () => OpenWeb("/world?hut=ledger"));
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
                RowButton(list, "Open the Seeing Glass on the Hub", s.accent, () => OpenWeb("/world?hut=visions"));
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
            });
        }

        // =====================================================
        //  4. YOUR SOUL
        // =====================================================
        private void OpenSoul(Station s)
        {
            var body = FreshBody("Your Soul", s.accent);
            var list = UIKit.ScrollList(body);
            var c = SaveState.Character;

            Header(list, "The record the mirror keeps of you.");
            BodyText(list, "Name", 26, UIKit.Faint);
            var input = UIKit.Input(list, "Speak your name...", c.name);
            input.gameObject.AddComponent<LayoutElement>().preferredHeight = 48;
            input.onEndEdit.AddListener(v =>
            {
                if (!string.IsNullOrWhiteSpace(v)) { c.name = v.Trim(); SaveState.Save(); }
            });

            BodyText(list, $"Standing with Truth:  {TruthLore.TrustLabel()}  (trust {TruthLore.Trust()})", 34, s.accent);
            BodyText(list, $"Vitality  {c.vitality}/{c.maxVitality}    ·    Soul Power  {c.soulPower}", 30);
            BodyText(list, $"Materials    Iron {c.iron}  ·  Copper {c.copper}  ·  Cosmic {c.cosmic}", 30);
            var w = GameData.Weapon(c.equippedWeapon);
            BodyText(list, $"Bearing:  {(w != null ? w.name : c.equippedWeapon)}", 30, UIKit.Amber);
            BodyText(list, $"Threads opened with Truth:  {TruthLore.Depth()} / {GameData.Lore.questions.Count}", 30);
            BodyText(list, $"Guardians felled: {c.cleared.Count}   ·   Relics: {c.inventory.Count}   ·   Riddles: {c.solved.Count}", 30);
            RowButton(list, "Shape your appearance on the Hub", s.accent, () => OpenWeb("/awakening/create"));
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
            RowButton(list, "Make an offering on the Hub", s.accent, () => OpenWeb("/world?hut=offering"), 58);
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
            var body = FreshBody("The Wayfinder  ·  The Portal Board", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Five roads wait beyond the hut. The hut is the epicenter now - the world is being rebuilt around it, and the portals will open again.");
            foreach (var d in GameData.Data.destinations)
            {
                var accent = UIKit.Hex(d.accent);
                var row = UIKit.Row(list, 96, new Color(accent.r, accent.g, accent.b, 0.06f));
                var stack = row.gameObject.AddComponent<VerticalLayoutGroup>();
                stack.padding = new RectOffset(14, 14, 8, 8);
                stack.childForceExpandHeight = false;
                stack.childControlHeight = true;
                var t = UIKit.Label(row, $"{d.name}   ·   guide: {d.guide}   ·   SEALED", 19, accent, TextAnchor.UpperLeft, FontStyle.Bold);
                t.gameObject.AddComponent<LayoutElement>().preferredHeight = 26;
                var q = UIKit.Label(row, $"\"{d.quote}\"", 16, UIKit.Faint, TextAnchor.UpperLeft, FontStyle.Italic);
                q.gameObject.AddComponent<LayoutElement>().preferredHeight = 44;
            }
            BodyText(list, "The community ledger and world rhythms live on the Hub while the 3D roads are laid.", 44, UIKit.Faint);
            RowButton(list, "View the community ledger on the Hub", s.accent, () => OpenWeb("/world?hut=map"));
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
            var body = FreshBody("The Sanctum  ·  The Community", s.accent);
            var list = UIKit.ScrollList(body);
            Header(list, "Beyond this door: the living halls.");
            BodyText(list,
                "The Sanctum is where walking souls gather - halls of talk, direct words soul-to-soul, " +
                "and the architects' chambers. It lives on the Hub, signed-in and real-time.", 110);
            RowButton(list, "Open the Sanctum", s.accent, () => OpenWeb("/archive"), 58);
        }

        // ---------- utils ----------
        private static string Truncate(string t, int max) =>
            string.IsNullOrEmpty(t) ? "" : t.Length <= max ? t : t.Substring(0, max) + "...";

        private static string ShortDate(string iso) =>
            string.IsNullOrEmpty(iso) ? "" : iso.Length >= 10 ? iso.Substring(0, 10) : iso;
    }
}
