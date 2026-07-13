/**
 * Shared mutable input for the house (keyboard + mobile pads).
 * Read every frame by FirstPersonController; written by mobile HUD / keyboard.
 */
export const houseInput = {
    /** Strafe −1…1 (A/D + joystick X) */
    axisX: 0,
    /** Forward −1…1 — negative is forward (joystick Y up = forward) */
    axisZ: 0,
    /** Extra look deltas in pixels (consumed each frame) */
    lookDX: 0,
    lookDY: 0,
    /** One-shot jump request */
    jumpQueued: false,
    /** One-shot interact request */
    interactQueued: false,

    queueJump() {
        this.jumpQueued = true;
    },
    queueInteract() {
        this.interactQueued = true;
    },
    consumeJump() {
        if (!this.jumpQueued) return false;
        this.jumpQueued = false;
        return true;
    },
    consumeInteract() {
        if (!this.interactQueued) return false;
        this.interactQueued = false;
        return true;
    },
    consumeLook() {
        const dx = this.lookDX;
        const dy = this.lookDY;
        this.lookDX = 0;
        this.lookDY = 0;
        return { dx, dy };
    },
    setMove(x: number, z: number) {
        this.axisX = x;
        this.axisZ = z;
    },
    clearMove() {
        this.axisX = 0;
        this.axisZ = 0;
    },
};
