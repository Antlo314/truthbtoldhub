# Character construction notes (Truth B Told hut)

Research summary for building player vessels in this project.  
Reference images: `vessel_man.jpg`, `vessel_woman.jpg`.

## Proportion canon (adult humanoid)

Use a **~7–7.5 head** canon (realistic-stylized, not chibi):

| Segment | Share of total height | Notes |
|--------|------------------------|--------|
| Head | ~13% | 1 unit |
| Neck + torso (to crotch) | ~27–30% | **Shorter than legs** — common bug is “long torso / short legs” |
| Legs (crotch to sole) | **~50–52%** | Half the figure reads adult |
| Arms | wrist near mid-thigh | Shoulder width: man wider, woman narrower |

**Rule of thumb:** if the figure looks short overall, **do not shrink the whole body** — lengthen legs and keep torso compact.

Industry sources that agree: character-design proportion sheets (7.5-head adult), game art blogs on stylized humanoids, and third-person camera docs that assume ~1.6–1.8m player height.

## Hierarchy (how to build the rig)

Build **bottom-up** as a transform tree (same idea as Unity/Unreal/Three skeletons):

```
Root (feet on ground, y=0)
└─ Hips
   ├─ LeftUpperLeg → LeftLowerLeg → LeftFoot
   ├─ RightUpperLeg → RightLowerLeg → RightFoot
   └─ Spine / Torso
      ├─ LeftUpperArm → LeftLowerArm → LeftHand
      ├─ RightUpperArm → RightLowerArm → RightHand
      └─ Neck → Head
```

- **Pivots at joints** (hip, knee, shoulder, elbow) so walk/jump rotate cleanly.
- **Walk:** opposite arm/leg phase, small hip sway, small vertical bob at hips (not whole-body bounce).
- **Jump:** tuck thighs, slight arm raise, freeze gait while airborne.
- **Materials:** few solid colors from the soul palette (skin / hair / cloth / boots) for WebGL readability.

## Third-person camera (free look)

Patterns used in successful 3rd-person games / tutorials (Unity Third Person, orbit cams):

1. **Orbit pivot** on the character chest/head, not a fixed south offset.
2. **Yaw** (mouse X / drag) orbits horizontally; **pitch** (mouse Y) tilts with clamps (e.g. −20° … +55°).
3. **Distance** fixed or scroll-zoom later; spring-arm style so the camera stays behind-ish.
4. **Move relative to camera planar forward** (WASD always matches view).
5. **Look input:** right-mouse drag, or left-drag on the right half of screen (mobile-friendly).
6. Don’t fight the player: when a station panel is open, lock look + move.

## Style for this project

- Sacred / aetheric, **readable silhouettes**, low-poly friendly volumes.
- Match hut ambience: warm gold, deep indigo, soft hearth light.
- Man / woman share the same skeleton proportions; only width and garment volumes differ.
- Next step after refs: either (A) refine procedural mesh to match sheets, or (B) import glTF modeled from these sheets.

## Files

- `vessel_man.jpg` — male vessel modeling reference  
- `vessel_woman.jpg` — female vessel modeling reference  
- This file — construction rules for agents & artists  
