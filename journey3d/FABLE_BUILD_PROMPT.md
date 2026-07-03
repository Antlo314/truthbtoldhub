# BUILD PROMPT — Truth's Hut: Character Creator, Exterior Terrain Ring & Go-Live

**To:** Claude Fable 5 (autonomous coding agent)
**Repo:** `C:/Users/aarons/Desktop/sacred-sanctum` (branch `main`)
**Credit note:** These are expensive credits. Do NOT re-explore what is already documented below. Every file path, number, field name, color, method name, and command you need is in this prompt and has been verified against the actual files. Read only the specific files cited, make the changes, build, verify, ship. Do not re-derive facts stated here as "verified."

---

## MISSION

Turn the current 3D "Truth's Hut" (interior-only) into a small, complete, live 3D world: an **in-hut character creator**, a **hut exterior with a small bounded terrain ring around it**, and a **working live deploy at `/world`** with the dark-render bug fixed. Do all three. Persist the player's created character to the existing Supabase backend without touching the user/progress data model.

## HARD SCOPE LIMITS (do not exceed)

- Build ONLY: the existing hut interior + a new hut **exterior shell/roof/doorway** + a **small terrain ring** (grass ground, a short path, a handful of trees/rocks, a sky) with a **natural + invisible boundary** so the player can walk out the door, circle the hut, and **cannot walk into an empty void**.
- Terrain ring radius: **~18–22m from hut center**, bounded by a ring of trees/rocks + an invisible collider wall. This is NOT the full 5-destination world. No other destinations, no distant biomes, no fast-travel map.
- **Scene-level vert/instance budget for the exterior:** ≤ 20 total scatter instances (trees + rocks combined), reusing 4–5 base FBX models. Do NOT author per-instance unique meshes. Each model still < 500 verts.
- Do NOT rebuild the 2D web game. Do NOT change the users-and-progress backend schema (see GUARDRAILS).
- **Reversibility (the last commit `f2faf80` deliberately stripped the overworld to Hut-only via a reversible kill switch):** put the entire exterior/terrain behind a single toggle flag (e.g. `bool ExteriorEnabled` in `GameBootstrap`, default `true`) so this expansion can be reverted without another strip commit. Confirm you are not fighting that kill switch — re-enable/extend it, don't duplicate it.

---

## CURRENT STATE (verified — trust this, do not re-derive)

- **Two projects in one repo:** a Next.js site (`truthbtoldhub.com`, auto-deploys via Vercel on push to `main`) and a Unity project at `journey3d/` (Unity **6000.5.2f1** — confirmed the only installed editor; assets authored in Blender 5.1).
- **3D game route:** `app/world/page.tsx` loads the Unity WebGL build via `createUnityInstance`. Build artifacts are served from `public/hut3d/Build/` (`webgl.loader.js`, `webgl.data.unityweb`, `webgl.framework.js.unityweb`, `webgl.wasm.unityweb`). The 2D web game lives at route **`/world2d`** — keep it working.
- **`/world` is gated by `middleware.ts`** (auth session + gate cookie required). A fresh/logged-out browser will be redirected — that is NOT a broken build. Test `/world` while logged in. Do NOT alter the middleware matcher except to confirm it still includes `/world` and does NOT intercept `/hut3d/Build/*` static assets.
- **Scene is assembled at RUNTIME.** The scene file is `journey3d/Assets/Scenes/Hut.unity` and carries a single `GameBootstrap` object. `journey3d/Assets/Scripts/GameBootstrap.cs` `Awake()` builds everything: `BuildRoom()`, `BuildStations()` (10 stations), `BuildPlayer()`, `BuildCamera()`, `BuildSystems()`, `BuildLights()`. Models load via `Resources.Load<GameObject>("Models/" + name)` from `journey3d/Assets/Resources/Models/` (14 FBX files, no extension in the load call).
- **Assets are Blender-procedural.** `journey3d/AssetPipeline/build_assets.py` runs headless (`blender --background --python build_assets.py`) and exports one FBX per asset into `journey3d/Assets/Resources/Models/`. It defines helper fns `box`, `cyl`, `cone`, `sphere`, `torus`, `mat`, material presets (`M_WOOD_DARK`, `M_WOOD_MID`, `M_WOOD_LIGHT`, `M_STONE`, `M_GOLD`, `M_PAPER`, …), `export_asset`, `clear_scene`, `build_hut_shell()`, and `build_player()`.
- **Render pipeline is BUILT-IN (verified in `GraphicsSettings.asset`: `m_CustomRenderPipeline: {fileID: 0}`).** There is NO URP/SRP. Principled-BSDF FBX materials import as Unity **Standard** shader. Do NOT spend any time investigating "URP vs Built-in material translation" — that avenue is already eliminated.
- **Coordinate & scale conventions:** 1 Blender unit = 1 meter. Room interior 14×14m, 4.2m tall, 0.3m walls. Models authored **+Z-facing** in Blender; `GameBootstrap.Spawn(model, pos, yaw)` applies a Y-rotation (yaw). Axes: +X right, +Y up, +Z forward. Keep every model **< 500 verts** for WebGL.
- **Collider rule (verified `GameBootstrap` ~line 47):** `mc.convex = model != "hut_shell"`. The hut shell keeps a **concave MeshCollider** — the player is physically sealed inside. See Deliverable B / doorway note: you MUST cut a real opening in the shell mesh, not just add exterior geometry.
- **Color palette (hex):** `WOOD_DARK #1a120b`, `WOOD_MID #3a2a1c`, `WOOD_LIGHT #5a3d22`, `STONE #6b6f76`, `STONE_DARK #44474d`, `GOLD #fbbf24`, `AMBER #fcd34d`, `ORANGE #f97316`, `CYAN #22d3ee`, `GREEN #22c55e`, `PURPLE #7c5cff`, `PAPER #e8d9b0`, `DARKVOID #06080e`.
- **Current player avatar:** static single FBX `player_avatar.fbx`, built by `build_player()` — hardcoded teal tunic `#0f766e`, medium-brown skin `#8d5a3b`, black hair, dark pants, gold belt. ~14 primitives. Spawned in `BuildPlayer()` as child of the `Player` root at `(0, 0.05f, -2.2f)`.
- **Local save:** `journey3d/Assets/Scripts/Data/SaveState.cs` — `CharacterState` (flat fields: `name`, `path`, `vitality/maxVitality`, `iron/copper/cosmic` (top-level ints), `equippedWeapon` (string), `ownedWeapons`, `consumables`, `discovered/cleared/solved/skills/inventory`, `sourceReturned`, `soulPower`). Persisted to **PlayerPrefs key `"soul_record"`** via `JsonUtility.ToJson/FromJson`. **There are currently NO avatar-appearance fields.** The 3D build does NOT sync to Supabase yet — it only reads/writes PlayerPrefs.
- **`SupabaseClient.cs` (verified):** the ONLY write path is `SubmitScoreCo` — a hand-built JSON POST to `/rest/v1/arcade_scores`. There is **no `game_state` upsert method, no character serializer, no upsert/conflict handling.** You must write a new coroutine (see A5). `WebAuth.cs` provides `WebAuth.SignedIn` and `WebAuth.AccessToken` via the `J3D_ReadSession` JS bridge (WebGL-only, inside truthbtoldhub.com).
- **Camera (verified `BuildCamera()`):** it does NOT set `farClipPlane`/`nearClipPlane`, so Unity's default far = **1000m** — a 50m sky dome is already safe. Do NOT add a "set far to 60" step. Only touch clip planes if `CameraRig.cs` is found to clamp them; otherwise leave defaults.

- **KNOWN BUG (fix this first — Deliverable C0):** In WebGL the hut renders very dark/near-black. Verified `Awake()` values: `RenderSettings.ambientMode = Flat`, `ambientLight = (0.34, 0.27, 0.2)`, exponential **fog enabled** `fogColor (0.02,0.03,0.05)` `fogDensity 0.012`, camera clears to solid `(0.02,0.03,0.055)`. Lights: two point lights (`KeyLight` intensity 1.7 range 16, `SanctumGlow` intensity 1.1) + a fireplace flicker light. Pipeline is Built-in (Standard shader). Most likely cause: **Standard-shader materials receiving almost no light (dim Flat ambient + only 2 point lights) with near-black fog tinting everything toward black.** See C0 for the prescribed fix order.

---

## DELIVERABLE A — 3D CHARACTER CREATION & CUSTOMIZATION

Build an in-hut character creator that reproduces the 2D game's appearance options, renders the result on the player's avatar live in the hut, and persists it.

### A1. Mirror the canonical appearance schema

The authoritative shape is the web `AvatarConfig` in `lib/game/avatar.ts`, embedded in `GameCharacter.avatar` in `lib/store/useGameStore.ts`. Reproduce these exact fields and option sets:

- **build**: `masc` | `fem`
- **skin**: int index 0–13 (14 `SKIN_TONES`)
- **hairStyle**: one of 14 — `short, afro, locs, twists, coils, waves, highTop, long, bun, braids, buzz, ponytail, crown, curls`
- **hairColor**: int index 0–10 (11 `HAIR_COLORS`)
- **face**: one of 5 — `calm, keen, goatee, beard, mustache`
- **top**: int 0–15 (16 `CLOTH_COLORS`)
- **bottom**: int 0–15 (`CLOTH_COLORS`)
- **boots**: int 0–5 (6 `BOOT_COLORS`)
- **outfit**: one of 8 — `tunic, vest, robe, dress, gown, cloak, wanderer, vestment` (gender-aware: masc → tunic/vest/robe/cloak/wanderer/vestment; fem → dress/gown/robe/tunic/wanderer/vestment)
- **extra**: one of 9 — `none, circlet, hood, earrings, glasses, warpaint, belt, flower, scar`
- **eyes**: int **0–5** (6 `EYE_COLORS` — verified length 6; `avatar.ts` line 60)
- **beardColor**: int index into `HAIR_COLORS`, **optional**. Verified semantics (`avatar.ts` line 96): `beard = HAIR_COLORS[cfg.beardColor ?? cfg.hairColor]`. So when unset, it resolves to `hairColor`. Do NOT hard-store 0 as a substitute — see A2.
- **path**: `seer | sentinel | scribe | mystic` (from `lib/game/paths.ts`) — selected here too.

Read `lib/game/avatar.ts` and copy the EXACT palette hex arrays verbatim — verified contents:
- `EYE_COLORS = ['#2a2030', '#5b3a1e', '#2e5b8a', '#2f6b4f', '#6b3a6e', '#8a8f98']` (6)
- `BOOT_COLORS = ['#4a3324', '#2b2b30', '#5a4632', '#3a2a44', '#6b7280', '#7f1d1d']` (6)
- `SKIN_TONES` (14, line 43), `HAIR_COLORS` (11, line 48), `CLOTH_COLORS` (16, line 52) — copy these arrays exactly from the file; do not trust remembered values.

Also read `app/awakening/create/page.tsx` for the tab structure (Body, Hair, Face, Outfit, Extras, Aura/Eyes).

### A2. Extend the Unity save model

Add these primitive fields to `CharacterState` in `journey3d/Assets/Scripts/Data/SaveState.cs` (primitives only — `JsonUtility` cannot serialize dicts/nested generics):

```csharp
public string build = "masc";
public int    skin = 4;
public string hairStyle = "short";
public int    hairColor = 0;
public string face = "calm";
public int    top = 0;
public int    bottom = 6;
public int    boots = 0;
public string outfit = "tunic";
public string extra = "none";
public int    eyes = 0;
public int    beardColor = -1;   // -1 = "unset": resolve to hairColor at render/serialize time (mirrors 2D `beardColor ?? hairColor`)
public string garment = "plain"; // wearable overlay id; PRESERVE, do not blow away (see A5)
```

Preserve every existing field and the `"soul_record"` PlayerPrefs key/format (2D + hybrid play depend on it). Do not rename or remove fields. When mapping `beardColor` to the web `avatar.beardColor` (A5), emit it only if `>= 0`; when `-1`, omit it so the web falls back to `hairColor`.

### A3. Render the avatar (material-recolor path)

**Use single-rig recoloring via material swaps — NOT swappable part meshes.** Implement:

1. **Parametrize `build_player()`** in `build_assets.py` to accept appearance args (`skin_hex`, `hair_hex`, `tunic_hex`, `pants_hex`, `boots_hex`, `outfit_style`, `build`) with the current hardcoded values as defaults, so a no-arg call reproduces today's avatar. Keep separate, **named** materials per body part (skin, hair, tunic/outfit, pants, boots, belt) so Unity can look them up and recolor at runtime.
2. **Recolor at runtime.** In `BuildPlayer()` (`GameBootstrap.cs`), after instantiating `player_avatar`, look up each child renderer by material/submesh name and set `material.color` from `CharacterState` mapped through the palette. Port the palette into a C# `AvatarPalette` static class whose arrays are byte-for-byte identical to `avatar.ts` (SKIN_TONES/HAIR_COLORS/CLOTH_COLORS/BOOT_COLORS/EYE_COLORS) so index→hex resolves identically. Resolve `beardColor` as `beardColor < 0 ? hairColor : beardColor`.
3. **Silhouette-changing options** (outfit style, hair style, build): recoloring can't express these. For v1, accept color-only variation and note the limitation; only toggle child sub-mesh visibility if `build_player()` already emits them as named parts. Do NOT export 50+ FBX variants.
4. Add a small **character light** (low-range, low-intensity point light) parented to the `Player` root so the avatar reads against dark timber.

### A4. Creator UI + live preview

Add an in-hut creator gated behind the existing **Soul Mirror** station (`StationId.Soul`, "Your Soul", at `(-6.3, 0, -2.4)` in `BuildStations()`). Interacting opens a Unity UI panel using the project's existing patterns — read `journey3d/Assets/Scripts` for `HutUI.cs` and `UIKit` and reuse them. Tabs: **Build** (masc/fem), **Hair** (14 styles + 11 color swatches), **Face** (5), **Outfit** (gender-aware list + 3 color pickers: top/bottom/boots), **Extras** (9), **Eyes** (6), **Path** (Seer/Sentinel/Scribe/Mystic), and a **Name** field. Changing any option must **recolor/update the live player avatar in the hut immediately**. Buttons: **Save**, **Randomize**, **Revert**.

### A5. Persist (local + cloud, without touching user/progress schema)

- On **Save**: write appearance + name + path into `SaveState.Character`, call `SaveState.Save()` (PlayerPrefs, optimistic/instant).
- Then, **if `WebAuth.SignedIn`**, upsert to the existing `game_state` Supabase table. **There is no existing upsert method — write a new `UpsertGameStateCo()` coroutine modeled on `SubmitScoreCo` in `SupabaseClient.cs`:**
  - `POST {supabaseUrl}/rest/v1/game_state`
  - Headers: `apikey: {anonKey}`, `Authorization: Bearer {WebAuth.AccessToken}`, `Content-Type: application/json`, and **`Prefer: resolution=merge-duplicates`** (this is how PostgREST performs upsert-on-conflict against the `user_id` PK). ⚠️ The Supabase-JS `onConflict: user_id` syntax does NOT apply to a raw REST call — use the `Prefer` header.
  - Body: a **hand-built, web-shaped `character` JSON** — do NOT `JsonUtility.ToJson(SaveState.Character)`. The flat Unity `CharacterState` does not match the web `GameCharacter` (web has nested `appearance{gender,bodyTile,aura}`, `avatar{...AvatarConfig}`, `equipped{}`, `materials{}`, `consumables` as a record). Read `lib/store/useGameStore.ts` for the exact `GameCharacter` shape and build a matching JSON string:
    - `character.name`, `character.path`
    - `character.avatar` = the full `AvatarConfig` (build, skin, hairStyle, hairColor, face, top, bottom, boots, outfit, extra, eyes, and `beardColor` only if `>= 0`) as **indices, not hexes**
    - **PRESERVE `character.avatar.garment`** — if a cloud/local value exists, carry it through; do NOT overwrite the whole avatar object and null a worn garment.
    - **EXCLUDE `soulPower`** from the character blob entirely (it is server-only, `profiles`-table currency; must never appear in `game_state.character`).
  - Top-level body: `{"user_id": <uid>, "character": {…web-shaped…}, "initiated": true, "updated_at": "<ISO8601 now>"}`.
- **`initiated` / awakening convergence:** setting `initiated:true` from 3D must match the flag the 2D `/awakening` flow reads to skip re-awakening. Before assuming `true` is sufficient, read how `/awakening` (and `useGameStore`) gates on `initiated`, and set exactly that flag so a soul created in 3D is NOT re-prompted for the 2D awakening ceremony (and vice-versa).
- **Never write** `soul_power`, `tier`, `is_supporter`, `is_banned` (server-only, `profiles`, locked by `secure_profiles_privileges.sql`).
- **Offline/demo mode** (`NEXT_PUBLIC_TBTH_DEMO`) and unsigned souls: PlayerPrefs save still works; skip the cloud upsert silently, no error.

**A acceptance:** Player opens Soul Mirror → picks build/skin/hair/face/outfit/colors/extras/eyes/path/name → avatar in the hut updates live → Save persists to PlayerPrefs and (if signed in) upserts a web-shaped `character` (with indexed `avatar`, preserved `garment`, no `soulPower`) to `game_state` via the `Prefer: resolution=merge-duplicates` POST → reloading `/world` restores the look → the same character shows the matching pixel avatar on `/world2d` after a cloud sync.

---

## DELIVERABLE B — TERRAIN / EXTERIOR WORLD (small bounded ring)

Extend `build_assets.py` with new Blender-procedural assets and spawn them in `GameBootstrap.cs`. Honor the palette, the +Z-forward/yaw convention, meters scale, and the <500-vert budget.

### B0. Open the hut shell (REQUIRED — the player is currently sealed in)

The hut shell has a concave collider and no walkable opening. Before any exterior work:
1. Read `build_hut_shell()` in `build_assets.py` to find the wall layout and confirm there is (or is not) a gap.
2. **Cut a real doorway** into `build_hut_shell()` on a chosen wall at a defined coordinate (e.g. the front `-Z` wall, a ~1.2m-wide × ~2.2m-tall gap centered on X=0). Rebuild the shell as wall segments around the gap rather than one solid box, so the concave MeshCollider itself has the opening. The **interior floor top and exterior ground top must both be y = 0** at the threshold (no step/seam).
3. Cut the **matching doorway** in `hut_exterior` (B1) at the same wall + coordinate so interior and exterior openings align.

Do NOT rely on `sanctum_door` as the exit: it is a **station** (`StationId.Sanctum`) placed at `(0,0,6.78)` with yaw 180° (the far `+Z` wall) and is not necessarily a walkable opening. Pick the exit wall explicitly per step 2.

### B1. New Blender assets (add to `build_assets.py`, follow existing helpers + `export_asset`)

- **`terrain_ground.fbx`** — flat ground disc/plane ~**44×44m** (covers the ~22m ring), centered, **top surface at y = 0** (match interior floor; place mesh so its top face is exactly 0, or at `y = -0.02` ONLY if you offset the geometry so the walkable top still reads at 0 at the threshold — priority: no seam/step at the doorway). Material `TERRAIN_GRASS = #2d5016`. < 500 verts.
- **`hut_exterior.fbx`** — outward-facing timber shell mirroring `hut_shell` dimensions (14×14m footprint, ~4.2m walls, 0.3m thick) built OUTSIDE the interior volume, **with the front doorway opening aligned to B0's cut**. Add a **gable roof** (two angled boxes ~30–45°), material `ROOF_THATCH = #6b4423`. Add a **chimney** above the fireplace side. Reuse `M_WOOD_*`.
- **`tree_pine.fbx`, `tree_oak.fbx`** (2–3 variants) — trunk (`cyl`) + canopy (`cone` stack or `sphere`). `TREE_BARK = #3d2817`, `TREE_LEAVES = #1f4620`. ~30–50 verts each.
- **`rock_small.fbx`, `rock_large.fbx`** — overlapping scaled spheres. `ROCK_GREY = #5a5a5a`.
- **`sky_dome.fbx`** — low-res inward-facing hemisphere, radius ~**50m**, material `SKY_COLOR = #87ceeb`, **unlit/emissive-only (LOW emission)** so it self-lights independently of the sun light and does not depend on ambient. ~50–100 verts.
- (Optional, cheap) **`terrain_path.fbx`** — a few connected `box` segments from the door outward. `TERRAIN_PATH = #8b7355`.

### B2. Spawn in `GameBootstrap.cs` (behind the `ExteriorEnabled` flag)

Add a `BuildExterior()` call in `Awake()` after `BuildRoom()`, guarded by `ExteriorEnabled`. Spawn:
- `terrain_ground` centered (top at y=0 per B1);
- `hut_exterior` wrapping the interior, doorway aligned to the B0 cut;
- `sky_dome` **last / non-colliding** so it renders behind everything;
- `tree_pine/tree_oak/rock_*` scattered around the **18–22m ring** — **≤ 20 instances total**, hand-placed via `Spawn()`, denser at the edge to read as a natural wall.

### B3. Boundary (no void)

Add an **invisible cylindrical collider ring** at ~22m radius (runtime-created `GameObject`, colliders only, no renderer) so the player cannot leave, plus the tree/rock ring as the visual boundary. The player must walk **out the doorway, around the hut, to the ring, and back in** freely. Camera far defaults to 1000m (safe for the 50m dome) — do not change it unless `CameraRig.cs` clamps far below 60m.

### B4. Exterior lighting

Add a **directional "sun/moon" light** + modest ambient so the exterior is lit. Coordinate with the C0 fog/ambient fix — fog must not black out the exterior. The sky dome is emissive-only, so it stays visible regardless of the directional light; verify it doesn't wash out AFTER the ambient bump.

**B acceptance:** From inside the hut the player walks out the (real, cut) doorway onto grass at a seamless y=0 threshold, circles the hut under a visible sky, sees ≤20 trees/rocks bounding the ring, hits an invisible wall at ~22m (no void, no fall-through), and walks back inside. All new models load from `Resources/Models/`, < 500 verts, palette colors, no external textures. Exterior toggles off cleanly via `ExteriorEnabled=false`. WebGL stays smooth.

---

## DELIVERABLE C — GO LIVE ON THE WEBPAGE

### C0. FIX THE DARK-RENDER BUG FIRST

Pipeline is Built-in (Standard shader) — do NOT investigate URP. Apply fixes in this order, then re-check:
1. **Ambient + fog (most likely fix):** raise `RenderSettings.ambientLight` from `(0.34,0.27,0.2)` toward ~`(0.5,0.45,0.4)`; retune `fogColor` toward a lit tone and/or drop `fogDensity` from `0.012` to ~`0.004` (or disable fog indoors). This alone likely resolves the near-black room.
2. **Add a directional light** (low-intensity fill) so Standard-shader surfaces catch light beyond the two point lights.
3. **Only if faces are still black after 1–2:** check FBX import normals in Unity (inverted/missing normals render black); recalc/fix in the Blender export or import settings.
4. Confirm the WebGL build log has no shader-stripping/material errors.

Verify the fix in a **real WebGL build served through `/world`**, not the editor and not a stale artifact — editor lighting ≠ WebGL. See C4.

### C1. Regenerate assets (Blender headless)

```bash
cd C:/Users/aarons/Desktop/sacred-sanctum/journey3d/AssetPipeline
blender --background --python build_assets.py
```
Confirm all new + existing FBX land in `journey3d/Assets/Resources/Models/`.

### C2. Build Unity WebGL (headless batch — method is verified, do NOT search for it)

Verified build entry point: **`Journey3D.EditorTools.BuildScript.BuildWebGL`** (in `journey3d/Assets/Editor/BuildScript.cs`), scene `Assets/Scenes/Hut.unity`, output `journey3d/Builds/webgl/`. It already sets `WebGLCompressionFormat.Gzip` + `decompressionFallback = true` — **keep both unchanged** (Vercel serves the `.unityweb` gzip via the fallback, no server headers needed).

```bash
"C:/Program Files/Unity/Hub/Editor/6000.5.2f1/Editor/Unity.exe" -quit -batchmode -nographics -projectPath "C:/Users/aarons/Desktop/sacred-sanctum/journey3d" -executeMethod Journey3D.EditorTools.BuildScript.BuildWebGL -logFile "C:/Users/aarons/Desktop/sacred-sanctum/journey3d/build.log"
```
Read `build.log` for errors (shader stripping, missing models). Do NOT scaffold a new build script — this one exists.

### C3. Copy build output into the site (exact source path — note the nested `Build/`)

The artifacts land in **`journey3d/Builds/webgl/Build/`** (verified: `webgl.data.unityweb`, `webgl.framework.js.unityweb`, `webgl.loader.js`, `webgl.wasm.unityweb`). Copy the four files into `public/hut3d/Build/`:

```bash
cp journey3d/Builds/webgl/Build/webgl.loader.js \
   journey3d/Builds/webgl/Build/webgl.data.unityweb \
   journey3d/Builds/webgl/Build/webgl.framework.js.unityweb \
   journey3d/Builds/webgl/Build/webgl.wasm.unityweb \
   public/hut3d/Build/
```
⚠️ Do NOT copy from `journey3d/Builds/webgl/` root (that holds the HTML wrapper, not the artifacts) — copying the wrong level ships a stale build and breaks `/world`. Keep the four filenames EXACTLY as above (the custom `PROJECT:Journey` WebGL template produces these names; `app/world/page.tsx` expects them — read it to confirm).

### C4. Verify locally (through the served WebGL build)

Run `next dev`, open `/world` **while logged in** (middleware gates it). Confirm: room renders clearly lit (C0 bug fixed) in the actual WebGL artifact — not the editor; avatar customization works via Soul Mirror with live recolor; walk-out doorway + terrain ring + invisible boundary works; `/world2d` still loads the 2D game; browser console is error-free.

### C5. Commit & push (triggers Vercel)

Work on a branch, then merge to `main` (Vercel auto-deploys `main`). Include the new **`.fbx.meta`** files Unity generated next to each new `.fbx` (Unity needs them). Do NOT stage `journey3d/Builds/` (raw output) or `journey3d/Library/` — only `public/hut3d/Build/` ships. Confirm `.gitignore` covers `journey3d/Builds/` and `journey3d/Library/`; add entries if missing.

```bash
git checkout -b feat/hut-creator-terrain
git add journey3d/AssetPipeline/build_assets.py \
        journey3d/Assets/Resources/Models/ \
        journey3d/Assets/Scripts/ \
        journey3d/Assets/Editor/ \
        public/hut3d/Build/ app/ lib/
git status   # verify NO journey3d/Builds/ or journey3d/Library/ staged; verify new .fbx.meta present
git commit -m "feat(world3d): character creator, hut exterior + terrain ring, dark-render fix"
git checkout main && git merge --no-ff feat/hut-creator-terrain
git push origin main
```
End the commit message with:
`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

After push, confirm the Vercel deploy succeeds and `/world` is live (logged in).

---

## GUARDRAILS (do not violate)

1. **Do not break `/world2d`.** The 2D web game stays fully functional. The `"soul_record"` PlayerPrefs key/format stays backward-compatible.
2. **Users & progress backend is off-limits for schema changes.** Keep `game_state` (JSONB `character`, `initiated`, `updated_at`, RLS `auth.uid()=user_id`) and `profiles` exactly as they are. Appearance goes inside `game_state.character.avatar` (the existing `AvatarConfig` shape, index-based) — never into `profiles`.
3. **Never write server-only fields:** `soul_power`, `tier`, `is_supporter`, `is_banned` (locked by `secure_profiles_privileges.sql`). Never let `soulPower` ride into `game_state.character` (hand-build the blob; do not `JsonUtility.ToJson` the whole `CharacterState`).
4. **Preserve `avatar.garment`** on every upsert — do not null a worn wardrobe overlay.
5. **Honor existing contracts:** the `arcade_scores` submission format + RLS (`SubmitScore`: `game/score/lines/level/player_name/season`+optional `user_id`, season = `GameData.CurrentSeason()` `YYYY-MM`) — unchanged; the `WebAuth` `J3D_ReadSession` bridge — intact; `middleware.ts` matcher — still gates `/world`, still passes `/hut3d/Build/*`.
6. **Keep the architecture:** Blender-procedural assets + runtime assembly in `GameBootstrap.cs` via `Resources.Load("Models/...")`. No hand-placed scene objects in `Hut.unity`; no external image textures — Principled BSDF only (Base Color/Roughness/Metallic/optional Emission). Keep `BuildScript` Gzip + `decompressionFallback` and the `PROJECT:Journey` template unchanged.
7. **Reversibility:** exterior/terrain behind the `ExteriorEnabled` flag; do not re-strip or duplicate the existing kill switch from commit `f2faf80`.
8. **Credit efficiency:** don't re-explore documented files; use the verified build method/scene/paths; batch Blender regen + Unity build + copy + verify + push as one pass.

---

## ACCEPTANCE CHECKLIST (self-verify before finishing)

- [ ] Dark-render fixed: `/world` WebGL build renders the interior clearly lit (verified through the served build, not the editor).
- [ ] `CharacterState` has the 13 new fields (12 appearance + `garment`); `beardColor = -1` resolves to `hairColor`; `"soul_record"` format still backward-compatible.
- [ ] In-hut creator opens from the Soul Mirror station with Build/Hair/Face/Outfit/Extras/Eyes/Path/Name; option sets + palettes match `avatar.ts` exactly (EYE_COLORS=6, BOOT=6, SKIN=14, HAIR=11, CLOTH=16, copied verbatim).
- [ ] Changing options recolors the live avatar immediately (material-recolor, single rig, `AvatarPalette` C# arrays identical to `avatar.ts`).
- [ ] Save writes PlayerPrefs instantly; when signed in, a **new `UpsertGameStateCo`** POSTs to `/rest/v1/game_state` with `Prefer: resolution=merge-duplicates` and a **hand-built web-shaped** `character` (indexed `avatar`, preserved `garment`, NO `soulPower`), `initiated` set to the flag `/awakening` reads.
- [ ] A character created in 3D renders identically on `/world2d` after a cloud sync; no re-awakening prompt.
- [ ] Hut shell has a real cut doorway (concave collider opening); interior floor + exterior ground both y=0 at threshold (no step/seam).
- [ ] New assets in `Resources/Models/`: `terrain_ground`, `hut_exterior`, `sky_dome`, `tree_*`, `rock_*` (+ optional `terrain_path`), all <500 verts, palette colors, no external textures.
- [ ] Player walks out the doorway onto grass, circles the hut under a visible emissive sky, is stopped by an invisible ring at ~22m (no void, no fall-through), walks back inside. ≤20 scatter instances total.
- [ ] Exterior toggles cleanly via `ExteriorEnabled`. Camera far left at default 1000 (unless `CameraRig` clamped). WebGL smooth.
- [ ] Build via `Journey3D.EditorTools.BuildScript.BuildWebGL`; the 4 `webgl.*` files copied from `journey3d/Builds/webgl/Build/` → `public/hut3d/Build/` (correct nested source); Gzip + fallback unchanged.
- [ ] `/world` loads new build (logged in); `/world2d` works; console error-free.
- [ ] New `.fbx.meta` committed; `journey3d/Builds/` and `journey3d/Library/` NOT committed (gitignored); pushed to `main`; Vercel deploy succeeds; `/world` live.
