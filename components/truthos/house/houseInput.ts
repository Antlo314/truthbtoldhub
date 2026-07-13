/**
 * Shared mutable input — keyboard + mobile.
 * clearAll() must run on lock / blur / visibility so movement never runs away.
 */
export const houseInput = {
    axisX: 0,
    axisFwd: 0,
    lookVX: 0,
    lookVY: 0,
    lookDX: 0,
    lookDY: 0,
    jumpQueued: false,
    interactQueued: false,
    movingTouch: false,
    lookingTouch: false,
    /** Last time any intentional move input was received */
    lastInputAt: 0,

    queueJump() {
        this.jumpQueued = true;
        this.touchInput();
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
    consumeLookPixels() {
        const dx = this.lookDX;
        const dy = this.lookDY;
        this.lookDX = 0;
        this.lookDY = 0;
        return { dx, dy };
    },
    setMove(strafe: number, forward: number) {
        this.axisX = strafe;
        this.axisFwd = forward;
        if (Math.abs(strafe) > 0.01 || Math.abs(forward) > 0.01) {
            this.touchInput();
        }
    },
    clearMove() {
        this.axisX = 0;
        this.axisFwd = 0;
        this.movingTouch = false;
    },
    setLookVelocity(vx: number, vy: number) {
        this.lookVX = vx;
        this.lookVY = vy;
    },
    clearLook() {
        this.lookVX = 0;
        this.lookVY = 0;
        this.lookDX = 0;
        this.lookDY = 0;
        this.lookingTouch = false;
    },
    touchInput() {
        this.lastInputAt = performance.now();
    },
    /** Hard stop everything — call on blur, lock, tab hide */
    clearAll() {
        this.clearMove();
        this.clearLook();
        this.jumpQueued = false;
        this.interactQueued = false;
    },
};
