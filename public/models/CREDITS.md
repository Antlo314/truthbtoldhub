# Third-party assets

Everything in `public/models` and `public/textures` is either **CC0 (public
domain)** or original work for Truth B Told Hub. Nothing here requires
attribution; it is given anyway because the people who make free kits deserve
to be named.

## 3D models — `public/models/kenney/`

**Kenney** — https://kenney.nl — all kits **Creative Commons Zero (CC0 1.0)**.
Attribution is not required and redistribution is permitted; each kit's own
`License.txt` ships beside its models. Kenney's one request is not to use the
Kenney logo, which we don't.

| Folder | Kit | Used for |
| --- | --- | --- |
| `kenney/*.glb` | Furniture Kit, Nature Kit (first wave) | the house, the grove |
| `kenney/fantasy-town-kit/` | Fantasy Town Kit 2.0 | shelf lanterns, the Source fountain, the cinema stall, banners, bridge pillars |
| `kenney/castle-kit/` | Castle Kit | banners at the sentinels and the Hall, the Signal tower |
| `kenney/survival-kit/` | Survival Kit | signposts at every bridge, the Hall camp, the Spire workshop |
| `kenney/platformer-kit/` | Platformer Kit | the Aether shards (jewel), the terrace springs, the walk's flag |
| `kenney/food-kit/` | Food Kit | the kitchen, the laid table, coffee at the desk |
| `kenney/nature-kit/` | Nature Kit (second wave) | rim cliffs, standing stones, lilies, the Mirror Well's ring and obelisks |

Only the models the scene asks for are committed, pulled by
`scripts/fetch-kenney.mjs` (edit its `KITS` table to add more). The models are
the kits' own GLB exports, unmodified.

## Rigged vessels — `public/models/vessels/`

`vessel_masc.glb`, `vessel_fem.glb`, `vessel_anims.glb`

**Quaternius** — https://quaternius.com — **CC0**: Universal Base Characters,
Modular Character Outfits, Universal Animation Library (fetched from a pinned
GitHub mirror, see `scripts/build-vessels.mjs`). Rebuilt by that script into
one skinned body per build carrying every selectable part, plus a shared clip
library (idle, walk, jog, sprint, jump, sit, talk, dance, nod, shake, fold
arms, interact). Skin textures are converted to shading maps so the soul's
skin tone tints them at runtime.

## Models authored for this project — `public/models/aether/`

Procedural Blender 5.1 props for the Aether Shelf (`tools/blender/build_aether_world.py`).
Original work for Truth B Told Hub. No third-party mesh licence.

## Textures — `public/textures/polyhaven/`

**Poly Haven** — https://polyhaven.com — **CC0**. PBR scans (diffuse, GL normal,
roughness) pulled by `scripts/fetch-polyhaven.mjs`, capped at 1k by
`scripts/optimize-textures.mjs`. `manifest.json` records which Poly Haven slug
each surface came from.

`public/textures/cloud_puff.png` is generated (soft radial puff for the
volumetric cloud sea); original.

## Icons

Truth.OS app glyphs (`components/truthos/OsGlyph.tsx`) are original artwork
drawn for this project. No third-party icon pack is used for them, so there
are no attribution obligations.
