using UnityEngine;

namespace Journey3D
{
    /// Unifies keyboard/mouse and touch input so the rest of the game reads
    /// one source. Touch controls write here; PlayerController/InteractionSystem
    /// read here (added on top of keyboard).
    public static class InputHub
    {
        public static Vector2 MoveTouch;      // -1..1 from the on-screen stick
        public static Vector2 LookTouchDelta; // drag delta from the look pad (px)
        private static bool _interactQueued;

        public static bool ShowTouchUI =>
            Application.isMobilePlatform || Input.touchSupported;

        public static void QueueInteract() => _interactQueued = true;

        public static bool ConsumeInteract()
        {
            if (!_interactQueued) return false;
            _interactQueued = false;
            return true;
        }

        public static Vector2 ConsumeLookDelta()
        {
            var d = LookTouchDelta;
            LookTouchDelta = Vector2.zero;
            return d;
        }
    }
}
