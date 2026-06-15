// ============================================================
//  PUZZLES — real, solvable quests gating each relic.
//  Two interactive types (data-driven, mobile-first):
//   - 'dials'    : set symbol/number dials to a combination
//   - 'sequence' : order/decode tokens into the right order
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

export type Puzzle = SequencePuzzle | DialsPuzzle;

export function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
