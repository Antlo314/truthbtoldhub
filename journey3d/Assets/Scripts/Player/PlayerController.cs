using UnityEngine;

namespace Journey3D
{
    /// Camera-relative WASD + jump. Smoothed facing; light bob only when skeletal walk is off.
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public float moveSpeed = 3.9f;
        public float turnSpeed = 11f;
        public float jumpHeight = 1.35f;
        public float gravity = -22f;
        public Transform avatar;
        public bool inputLocked;

        private CharacterController _cc;
        private float _bobT;
        private Vector3 _avatarBase;
        private float _vy;
        private Vector3 _smoothWish;
        private bool _grounded;

        public bool IsGrounded => _grounded;
        public float PlanarSpeed { get; private set; }

        private void Awake()
        {
            _cc = GetComponent<CharacterController>();
            if (avatar != null) _avatarBase = avatar.localPosition;
        }

        private void Update()
        {
            if (transform.position.y < -3f)
            {
                _cc.enabled = false;
                bool inDest = DestinationManager.I != null && DestinationManager.I.InDestination;
                transform.position = inDest
                    ? new Vector3(0, 0.15f, -5f)
                    : new Vector3(0, 0.1f, -2.2f);
                _vy = 0f;
                _cc.enabled = true;
            }

            if (inputLocked)
            {
                _smoothWish = Vector3.zero;
                PlanarSpeed = 0f;
                ApplyGravityOnly();
                SettleAvatar();
                return;
            }

            float h = Mathf.Clamp(Input.GetAxisRaw("Horizontal") + InputHub.MoveTouch.x, -1f, 1f);
            float v = Mathf.Clamp(Input.GetAxisRaw("Vertical") + InputHub.MoveTouch.y, -1f, 1f);
            var cam = Camera.main;
            Vector3 fwd = cam != null ? cam.transform.forward : Vector3.forward;
            Vector3 right = cam != null ? cam.transform.right : Vector3.right;
            fwd.y = 0; right.y = 0;
            fwd.Normalize(); right.Normalize();

            Vector3 wish = fwd * v + right * h;
            if (wish.sqrMagnitude > 1f) wish.Normalize();
            // Smooth input so walk clips don't pop every frame
            _smoothWish = Vector3.Lerp(_smoothWish, wish, 1f - Mathf.Exp(-14f * Time.deltaTime));
            if (_smoothWish.sqrMagnitude < 0.002f) _smoothWish = Vector3.zero;

            _grounded = _cc.isGrounded;
            if (_grounded && _vy < 0f) _vy = -1.5f;

            bool jumpPressed = Input.GetKeyDown(KeyCode.Space) || Input.GetButtonDown("Jump")
                || InputHub.ConsumeJump();
            if (jumpPressed && _grounded)
            {
                _vy = Mathf.Sqrt(jumpHeight * -2f * gravity);
                AudioManager.I?.PlayTick();
            }

            _vy += gravity * Time.deltaTime;

            Vector3 motion = _smoothWish * moveSpeed;
            motion.y = _vy;
            _cc.Move(motion * Time.deltaTime);

            PlanarSpeed = new Vector3(_cc.velocity.x, 0, _cc.velocity.z).magnitude;

            if (_smoothWish.sqrMagnitude > 0.01f)
            {
                var target = Quaternion.LookRotation(_smoothWish, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, target, turnSpeed * Time.deltaTime);
                // Very light bob only — skeletal Walk clips carry the gait
                if (avatar != null)
                {
                    _bobT += Time.deltaTime * (5.5f + PlanarSpeed * 0.9f);
                    float bob = Mathf.Abs(Mathf.Sin(_bobT)) * 0.014f;
                    avatar.localPosition = Vector3.Lerp(avatar.localPosition, _avatarBase + Vector3.up * bob, 10f * Time.deltaTime);
                    avatar.localRotation = Quaternion.Slerp(avatar.localRotation,
                        Quaternion.Euler(0, 0, Mathf.Sin(_bobT) * 0.6f), 8f * Time.deltaTime);
                }
            }
            else
            {
                SettleAvatar();
            }
        }

        private void ApplyGravityOnly()
        {
            _grounded = _cc.isGrounded;
            if (_grounded && _vy < 0f) _vy = -1.5f;
            _vy += gravity * Time.deltaTime;
            _cc.Move(new Vector3(0, _vy, 0) * Time.deltaTime);
        }

        private void SettleAvatar()
        {
            if (avatar == null) return;
            _bobT = Mathf.Lerp(_bobT, 0f, 8f * Time.deltaTime);
            avatar.localPosition = Vector3.Lerp(avatar.localPosition, _avatarBase, 12f * Time.deltaTime);
            avatar.localRotation = Quaternion.Slerp(avatar.localRotation, Quaternion.identity, 12f * Time.deltaTime);
        }
    }
}
