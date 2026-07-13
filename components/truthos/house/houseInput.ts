/**
 * Shared mutable input for the house (keyboard + mobile pads).
 * Written by mobile HUD; read every frame by FirstPersonController.
 */
export const houseInput = {
    /** Strafe −1…1 (A/D + shaped joystick X) */
    axisX: 0,
    /** Forward contribution −1…1 — stick Y up is negative in raw UI; we store shaped forward as +forward intent in axisFwd */
    axisFwd: 0,
    /** Continuous look velocity (rad/s-ish via sens) from touch look pad — applied each frame */
    lookVX: 0,
    lookVY: 0,
    /** One-shot pixel look deltas (desktop path / residual) */
    lookDX: 0,
    lookDY: 0,
    jumpQueued: false,
    interactQueued: false,
    /** True while any locomotion touch is active */
    movingTouch: false,
    /** True while look touch is active */
    lookingTouch: false,

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
    consumeLookPixels() {
        const dx = this.lookDX;
        const dy = this.lookDY;
        this.lookDX = 0;
        this.lookDY = 0;
        return { dx, dy };
    },
    /** Shaped move: x = strafe, fwd = walk forward (+1 forward) */
    setMove(strafe: number, forward: number) {
        this.axisX = strafe;
        this.axisFwd = forward;
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
        this.lookingTouch = false;
    },
};
