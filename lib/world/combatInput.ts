/**
 * What the hands asked for — keys, mouse buttons and the phone's buttons
 * all queue here, and the fight loop (PlainCombat) takes them one a frame.
 */
export type CombatCmd = 'light' | 'heavy' | 'roll' | 'pray' | 'burst';

export const combatInput = {
    queue: [] as CombatCmd[],
    /** shield raised (C held, or the phone's Guard held) */
    block: false,
    push(c: CombatCmd) {
        // a held key repeats; one of each kind waiting is enough
        if (this.queue.length < 3 && !this.queue.includes(c)) this.queue.push(c);
    },
    take(): CombatCmd | undefined {
        return this.queue.shift();
    },
    clear() {
        this.queue.length = 0;
        this.block = false;
    },
};
