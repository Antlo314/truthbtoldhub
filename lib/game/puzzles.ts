// ============================================================
//  PUZZLES — real, solvable quests gating each relic.
//  Four interactive types (data-driven, mobile-first):
//   - 'dials'        : set symbol/number dials to a combination
//   - 'sequence'     : order/decode tokens into the right order
//   - 'cipher'       : rotate a wheel until the message decodes
//   - 'constellation': tap stars in order to trace a figure
//  Every puzzle is solvable from its prompt + hint (no guessing).
// ============================================================

export interface SequencePuzzle {
    kind: 'sequence';
    id: string;
    title: string;
    prompt: string;
    hint?: string;
    tokens: string[];     // shown to the player (component shuffles)
    solution: string[];   // correct order of token labels
    solvedText: string;
}

export interface DialsPuzzle {
    kind: 'dials';
    id: string;
    title: string;
    prompt: string;
    hint?: string;
    dials: { label: string; values: string[] }[];
    solution: number[];   // correct value index per dial
    solvedText: string;
}

// Rotate a cipher wheel: the player turns it until the encoded message
// reads as a true word. `shift` is the wheel position (0-25) at which
// caesarShift(cipherText, -shift) spells the answer.
export interface CipherPuzzle {
    kind: 'cipher';
    id: string;
    title: string;
    prompt: string;
    hint?: string;
    cipherText: string;   // uppercase A-Z + spaces; the encoded message
    shift: number;        // wheel value (0-25) that decodes it
    solvedText: string;
}

// Trace a constellation: tap the stars in the right order to draw the figure.
// A wrong tap resets the trace. Spatial cousin of 'sequence'.
export interface ConstellationPuzzle {
    kind: 'constellation';
    id: string;
    title: string;
    prompt: string;
    hint?: string;
    stars: { label: string; x: number; y: number }[]; // x,y as 0-100 (% of field)
    solution: string[];   // order of star labels to connect
    solvedText: string;
}

export type Puzzle = SequencePuzzle | DialsPuzzle | CipherPuzzle | ConstellationPuzzle;

export function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Shift each A-Z letter by `n` (wraps mod 26); spaces/punctuation pass through.
// Decoding a +k cipher = caesarShift(text, -k).
export function caesarShift(text: string, n: number): string {
    const s = ((n % 26) + 26) % 26;
    return text.replace(/[A-Z]/g, (ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + s) % 26) + 65));
}
