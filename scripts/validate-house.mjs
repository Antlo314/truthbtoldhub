/**
 * House plan validator — run it after touching homeMap/HomeDecor.
 *
 *   node scripts/validate-house.mjs
 *
 * Three assertions, all against the SAME tables the walker collides with,
 * so a pass here means a pass in the world:
 *
 *   1. DOORWAYS  — nothing solid stands in a door's clearance box.
 *   2. STAIR     — the flight and both landings are clear of furniture.
 *   3. REACH     — flood-fill from the spawn seat touches every room on
 *                  the storey (and the upper storey from the stair top),
 *                  so no prop has sealed a room off.
 *
 * homeMap is TypeScript with extensionless imports, which node's type
 * stripper cannot resolve — so we copy it to a temp dir and rewrite the
 * relative import specifiers to carry .ts. (Same trick as the jungle
 * plan validation.)
 */
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HOUSE = join(HERE, '..', 'components', 'truthos', 'house');
const DEPS = ['homeMap.ts', 'jungleMap.ts', 'houseMap.ts'];

const tmp = mkdtempSync(join(tmpdir(), 'housecheck-'));
try {
    for (const f of DEPS) {
        const src = readFileSync(join(HOUSE, f), 'utf8');
        writeFileSync(
            join(tmp, f),
            src.replace(/from '(\.\.?\/[^']+?)'/g, (m, spec) => (spec.endsWith('.ts') ? m : `from '${spec}.ts'`)),
        );
    }
    const map = await import(pathToFileURL(join(tmp, 'homeMap.ts')).href);
    run(map);
} finally {
    rmSync(tmp, { recursive: true, force: true });
}

function run(M) {
    const {
        FURNITURE, DOORWAYS, MAIN_DOORWAYS_END, STAIR, SHELL, ROOMS,
        PLAYER_R, INTRO, collidersFor, roomsOn, artFootprints, AISLES,
    } = M;
    const fail = [];
    const R = PLAYER_R;
    const ART_BOXES = artFootprints();

    const overlaps = (a, b) =>
        Math.abs(a.x - b.x) < a.hx + b.hx && Math.abs(a.z - b.z) < a.hz + b.hz;

    // Doorways are pushed main-storey-first, so the index splits them. Without
    // this a main-floor prop gets reported against an upper-floor door it is
    // three metres below.
    const doorLevel = (i) => (i < MAIN_DOORWAYS_END ? 'main' : 'upper');

    /* 1 ── doorway clearance ─────────────────────────────────── */
    // Furniture and art fail a door in DIFFERENT ways, so they get different
    // boxes:
    //   · furniture stands on the floor and you walk into it, so it must clear
    //     the opening AND a body's width of approach on each side;
    //   · art hangs at head height and never blocks a step — what it can do is
    //     hang ACROSS the opening, which is what you see. So it is tested
    //     against the bare opening only. Padding art like furniture would flag
    //     every picture hung near a door, which is where pictures go.
    const DEPTH = SHELL.t / 2 + R + 0.45;
    DOORWAYS.forEach((d, i) => {
        const lvl = doorLevel(i);
        const walkBox =
            d.axis === 'x'
                ? { x: d.x, z: d.z, hx: d.w / 2 + R, hz: DEPTH }
                : { x: d.x, z: d.z, hx: DEPTH, hz: d.w / 2 + R };
        const openBox =
            d.axis === 'x'
                ? { x: d.x, z: d.z, hx: d.w / 2, hz: SHELL.t / 2 + 0.12 }
                : { x: d.x, z: d.z, hx: SHELL.t / 2 + 0.12, hz: d.w / 2 };

        for (const f of FURNITURE) {
            if (f.level !== lvl) continue;
            if (overlaps(walkBox, f)) {
                fail.push(`DOORWAY  ${f.level} "${f.name}" blocks the door at (${d.x.toFixed(2)}, ${d.z.toFixed(2)})`);
            }
        }
        for (const a of ART_BOXES) {
            if (a.level !== lvl) continue;
            if (overlaps(openBox, a)) {
                fail.push(`DOORWAY  ${a.level} art "${a.name}" hangs across the opening at (${d.x.toFixed(2)}, ${d.z.toFixed(2)})`);
            }
        }
    });

    /* 2 ── stair clearance ───────────────────────────────────── */
    // Floor space only — art on the shaft wall beside the flight is fine, so
    // this reads FURNITURE, not ART.
    const PAD = 1.3;
    const stairBox = {
        x: (STAIR.minX + STAIR.maxX) / 2,
        z: (STAIR.zTop + STAIR.zBottom) / 2,
        hx: (STAIR.maxX - STAIR.minX) / 2 + R,
        hz: (STAIR.zBottom - STAIR.zTop) / 2 + PAD,
    };
    for (const f of FURNITURE) {
        if (overlaps(stairBox, f)) fail.push(`STAIR    ${f.level} "${f.name}" stands on the stair run or its landings`);
    }

    /* 2b ── solidity ─────────────────────────────────────────── */
    // Nothing may be inside anything else. Two end tables were buried in the
    // shell wall: their footprints were never checked against the walls, only
    // against doors and the stair, so a prop could sit half in masonry and the
    // suite still passed. Two assertions:
    //   · no prop overlaps a WALL (art is exempt — art hangs ON walls);
    //   · no prop overlaps another prop on the same storey.
    const JUNGLE = new Set(M.JUNGLE_COLLIDERS ?? []);
    const wallsOn = (level) =>
        (level === 'upper' ? M.UPPER_COLLIDERS : M.MAIN_COLLIDERS).filter((c) => !JUNGLE.has(c));
    for (const f of FURNITURE) {
        for (const w of wallsOn(f.level)) {
            if (overlaps(w, f)) {
                const depth = Math.min(
                    f.hx + w.hx - Math.abs(f.x - w.x),
                    f.hz + w.hz - Math.abs(f.z - w.z),
                );
                fail.push(
                    `SOLID    ${f.level} "${f.name}" is inside a wall at (${w.x.toFixed(2)}, ${w.z.toFixed(2)}) by ${depth.toFixed(2)}m`,
                );
                break; // one report per prop is enough to act on
            }
        }
    }
    for (let i = 0; i < FURNITURE.length; i++) {
        for (let j = i + 1; j < FURNITURE.length; j++) {
            const a = FURNITURE[i];
            const b = FURNITURE[j];
            if (a.level !== b.level) continue;
            if (overlaps(a, b)) {
                fail.push(`SOLID    ${a.level} "${a.name}" intersects "${b.name}"`);
            }
        }
    }

    /* 3 ── hallways ──────────────────────────────────────────── */
    // "Zero obstacles in hallways" as assertions, two ways:
    //   a) circulation rooms (the main hall, the landing) may contain NO
    //      furniture at all — a hall is not a furniture room;
    //   b) a clear straight band must run the hall's full length down its
    //      middle, wide enough for a body with margin (1.1 m). (a) implies
    //      (b) today, but (b) also survives someone relaxing (a) later.
    const HALL_IDS = ['hall_m', 'landing'];
    const BAND_HALF = 0.55;
    for (const id of HALL_IDS) {
        const room = ROOMS.find((r) => r.id === id);
        if (!room) { fail.push(`HALLWAY  room "${id}" missing from ROOMS`); continue; }
        const roomBox = {
            x: (room.minX + room.maxX) / 2,
            z: (room.minZ + room.maxZ) / 2,
            hx: (room.maxX - room.minX) / 2,
            hz: (room.maxZ - room.minZ) / 2,
        };
        for (const f of FURNITURE) {
            if (f.level !== room.level) continue;
            if (overlaps(roomBox, f)) {
                fail.push(`HALLWAY  ${room.level} "${f.name}" stands in the ${room.name} (${id}) — halls stay empty`);
            }
        }
        // the walking band runs along the room's long axis
        const alongZ = roomBox.hz >= roomBox.hx;
        const band = alongZ
            ? { x: roomBox.x, z: roomBox.z, hx: BAND_HALF, hz: roomBox.hz }
            : { x: roomBox.x, z: roomBox.z, hx: roomBox.hx, hz: BAND_HALF };
        for (const f of FURNITURE) {
            if (f.level !== room.level) continue;
            if (overlaps(band, f)) {
                fail.push(`HALLWAY  ${room.level} "${f.name}" pinches the ${room.name} walking band`);
            }
        }
    }

    /* 3b ── lived-in room aisles ─────────────────────────────── */
    if (Array.isArray(AISLES)) {
        for (const a of AISLES) {
            for (const f of FURNITURE) {
                if (f.level !== a.level) continue;
                if (overlaps(a, f)) {
                    fail.push(`AISLE    ${a.level} "${f.name}" sits in the ${a.name} walk`);
                }
            }
        }
    }

    /* 4 ── reachability, twice ───────────────────────────────── */
    // Pass 1 at PLAYER_R proves every room can be entered. Pass 2 at a
    // COMFORT radius proves it can be entered without squeezing: a 1.0 m
    // disc must fit down every route. The comfort pass runs on a much finer
    // grid — the free band through a 1.2 m door at comfort width is only
    // 0.2 m across, and a coarse grid would miss it and cry wolf.
    const PASSES = [
        { label: 'REACH', radius: R, step: 0.28 },
        { label: 'PINCH', radius: 0.5, step: 0.07 },
    ];
    for (const pass of PASSES)
    for (const level of ['main', 'upper']) {
        const STEP = pass.step;
        const RR = pass.radius;
        const cs = collidersFor(level);
        const blocked = (x, z) => {
            for (const c of cs) {
                if (x > c.x - c.hx - RR && x < c.x + c.hx + RR && z > c.z - c.hz - RR && z < c.z + c.hz + RR) return true;
            }
            return false;
        };
        // Start at the seat (main) / the top of the stair (upper)
        const start =
            level === 'main'
                ? { x: INTRO.stand.x, z: INTRO.stand.z }
                : { x: (STAIR.minX + STAIR.maxX) / 2, z: STAIR.zTop - 0.9 };
        if (blocked(start.x, start.z)) {
            fail.push(`${pass.label}    ${level}: the start point itself is inside a collider`);
            continue;
        }
        const key = (i, j) => `${i},${j}`;
        const i0 = Math.round(start.x / STEP);
        const j0 = Math.round(start.z / STEP);
        const seen = new Set([key(i0, j0)]);
        const queue = [[i0, j0]];
        const iMin = Math.floor(SHELL.minX / STEP) - 1;
        const iMax = Math.ceil(SHELL.maxX / STEP) + 1;
        const jMin = Math.floor(SHELL.minZ / STEP) - 1;
        const jMax = Math.ceil(SHELL.maxZ / STEP) + 1;
        while (queue.length) {
            const [i, j] = queue.pop();
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const ni = i + di;
                const nj = j + dj;
                if (ni < iMin || ni > iMax || nj < jMin || nj > jMax) continue;
                const k = key(ni, nj);
                if (seen.has(k)) continue;
                if (blocked(ni * STEP, nj * STEP)) continue;
                seen.add(k);
                queue.push([ni, nj]);
            }
        }
        // Every non-solid room on this storey must have SOME reached cell
        for (const r of roomsOn(level)) {
            if (r.solid) continue;
            let touched = 0;
            for (let x = r.minX + 0.4; x < r.maxX - 0.4; x += STEP) {
                for (let z = r.minZ + 0.4; z < r.maxZ - 0.4; z += STEP) {
                    if (seen.has(key(Math.round(x / STEP), Math.round(z / STEP)))) touched++;
                }
            }
            if (touched === 0) {
                fail.push(
                    pass.label === 'PINCH'
                        ? `PINCH    ${level}: "${r.name}" (${r.id}) can only be reached by squeezing — a 1.0 m body does not fit the route`
                        : `REACH    ${level}: "${r.name}" (${r.id}) cannot be walked into`,
                );
            }
        }
        console.log(`  ${pass.label.toLowerCase()} ${level}: ${seen.size} cells at r=${RR}`);
    }

    console.log('');
    if (fail.length) {
        for (const f of fail) console.log(`  ✗ ${f}`);
        console.log(`\n${fail.length} problem(s).`);
        process.exit(1);
    }
    console.log(`  OK ${FURNITURE.length} props, ${ART_BOXES.length} artworks, ${DOORWAYS.length} doorways, halls empty, no pinch points, every room reachable.`);
}
