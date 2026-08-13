/**
 * The Mark — yearly tag wall layout and helpers.
 *
 * Cells live on three plaster walls in the west room. One email, one
 * calendar year (UTC). Positions here are the same numbers the 3D mural
 * and the paint panel read, so a mark cannot land in the wrong place.
 */
import { SHELL, u } from '@/components/truthos/house/homeMap';

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
    /** Plane yaw (radians) — faces into the room */
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

const X0 = SHELL.minX;
const MARK_SOUTH = u(-4.4);
const MARK_NORTH = u(0.6);
const Y0 = 0.95;

function cellsOn(
    face: WallFace,
    origin: { x: number; z: number },
    along: 'x' | 'z',
    dir: 1 | -1,
    count: number,
    ry: number,
): WallCell[] {
    const out: WallCell[] = [];
    for (let col = 0; col < count; col++) {
        for (let row = 0; row < WALL_ROWS; row++) {
            const alongOff = (col + 0.5) * WALL_CELL * dir;
            const x = along === 'x' ? origin.x + alongOff : origin.x;
            const z = along === 'z' ? origin.z + alongOff : origin.z;
            out.push({
                id: `${face}-${col}-${row}`,
                face,
                col,
                row,
                x,
                y: Y0 + (row + 0.5) * WALL_CELL,
                z,
                ry,
            });
        }
    }
    return out;
}

/** West wall: walk south → north. Faces +X (into the room). */
const WEST = cellsOn('w', { x: X0 + 0.07, z: MARK_SOUTH + 0.35 }, 'z', 1, 22, Math.PI / 2);

/** South wall: walk west → east. Faces +Z. */
const SOUTH = cellsOn('s', { x: X0 + 0.35, z: MARK_SOUTH + 0.07 }, 'x', 1, 16, 0);

/** North plaster west of the bath door. Faces −Z. */
const NORTH = cellsOn('n', { x: X0 + 0.35, z: MARK_NORTH - 0.07 }, 'x', 1, 8, Math.PI);

export const WALL_CELLS: WallCell[] = [...WEST, ...SOUTH, ...NORTH];

export function cellByKey(face: WallFace, col: number, row: number): WallCell | undefined {
    return WALL_CELLS.find((c) => c.face === face && c.col === col && c.row === row);
}
