/**
 * The Mark — yearly tag wall layout and helpers.
 *
 * Cells live on the three plaster faces of the Mark apse in the Sanctum:
 * the back wall ('w', the widest, ten cells across) and the two side
 * walls ('s' on the left as you face in, 'n' on the right, six cells
 * each). One email, one calendar year (UTC). Positions here are the same
 * numbers the 3D mural and the paint panel read, so a mark cannot land
 * in the wrong place.
 */
import { ALCOVE, alcove, facetAngle, facetToWorld, worldToFacet } from '@/components/truthos/house/homeMap';

export { WALL_YEAR, nextYearOpen, CAPTION_MAX, PNG_MAX_BYTES, normEmail, clipCaption } from './wallYear';

export const WALL_CELL = 0.4;
export const WALL_ROWS = 3;

export type WallFace = 'w' | 's' | 'n';

export type WallCell = {
    id: string;
    face: WallFace;
    col: number;
    row: number;
    /** World-space center of the cell */
    x: number;
    y: number;
    z: number;
    /** Plane yaw (radians) — faces into the apse */
    ry: number;
};

export type WallMark = {
    year: number;
    face: WallFace;
    col: number;
    row: number;
    png: string;
    caption: string;
    goldFrame: boolean;
    authorId: string | null;
    hidden?: boolean;
};

const MARK = alcove('mark');
const F = MARK.facet;
const A = facetAngle(F);
const W = ALCOVE.width;
const D = ALCOVE.depth;
const Y0 = 0.95;

/** A plane's yaw whose normal should point along (nx, nz). */
const yawOf = (nx: number, nz: number) => Math.atan2(nx, nz);
/** Back wall faces the hall: −outward normal */
const BACK_RY = yawOf(-Math.cos(A), -Math.sin(A));
/** Left wall (local −x) faces +local x = (sin A, −cos A) */
const LEFT_RY = yawOf(Math.sin(A), -Math.cos(A));
/** Right wall faces −local x */
const RIGHT_RY = yawOf(-Math.sin(A), Math.cos(A));

function cellsOn(face: WallFace, count: number, local: (col: number) => { x: number; z: number }, ry: number): WallCell[] {
    const out: WallCell[] = [];
    for (let col = 0; col < count; col++) {
        const l = local(col);
        const w = facetToWorld(F, l.x, l.z);
        for (let row = 0; row < WALL_ROWS; row++) {
            out.push({
                id: `${face}-${col}-${row}`,
                face,
                col,
                row,
                x: w.x,
                y: Y0 + (row + 0.5) * WALL_CELL,
                z: w.z,
                ry,
            });
        }
    }
    return out;
}

/** Back wall: ten cells, left → right as you face in. */
const BACK = cellsOn('w', 10, (col) => ({ x: -2.0 + (col + 0.5) * WALL_CELL, z: D - 0.07 }), BACK_RY);
/** Left wall: six cells, from the opening toward the back. */
const LEFT = cellsOn('s', 6, (col) => ({ x: -W / 2 + 0.07, z: 0.3 + (col + 0.5) * WALL_CELL }), LEFT_RY);
/** Right wall: six cells, from the opening toward the back. */
const RIGHT = cellsOn('n', 6, (col) => ({ x: W / 2 - 0.07, z: 0.3 + (col + 0.5) * WALL_CELL }), RIGHT_RY);

export const WALL_CELLS: WallCell[] = [...BACK, ...LEFT, ...RIGHT];

export function cellByKey(face: WallFace, col: number, row: number): WallCell | undefined {
    return WALL_CELLS.find((c) => c.face === face && c.col === col && c.row === row);
}

/** Which plaster you are standing in front of. */
export function nearestWallFace(x: number, z: number): WallFace {
    const l = worldToFacet(F, x, z);
    if (l.z > D - 1.0) return 'w';
    return l.x < 0 ? 's' : 'n';
}
