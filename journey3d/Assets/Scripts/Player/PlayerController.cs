using UnityEngine;

namespace Journey3D
{
    /// Camera-relative WASD movement with a procedural walk bob.
    [RequireComponent(typeof(CharacterController))]
    public class PlayerController : MonoBehaviour
    {
        public float moveSpeed = 4.2f;
        public float turnSpeed = 14f;
        public Transform avatar;          // visual child (bobs while walking)
        public bool inputLocked;          // true while a station panel is open

        private CharacterController _cc;
        private float _bobT;
        private Vector3 _avatarBase;

        private void Awake()
        {
            _cc = GetComponent<CharacterController>();
            if (avatar != null) _avatarBase = avatar.localPosition;
        }

        private void Update()
        {
            // absolute safety net: if physics ever lets the soul slip below
            // the world, place them back at the hearth instead of the void
            if (transform.position.y < -3f)
            {
                _cc.enabled = false;
                transform.position = new Vector3(0, 0.1f, -2.2f);
                _cc.enabled = true;
            }

            if (inputLocked)
            {
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

            Vector3 wish = (fwd * v + right * h);
            if (wish.sqrMagnitude > 1f) wish.Normalize();

            _cc.SimpleMove(wish * moveSpeed);

            if (wish.sqrMagnitude > 0.01f)
            {
                var target = Quaternion.LookRotation(wish, Vector3.up);
                transform.rotation = Quaternion.Slerp(transform.rotation, target, turnSpeed * Time.deltaTime);
                if (avatar != null)
                {
                    _bobT += Time.deltaTime * 11f;
                    avatar.localPosition = _avatarBase + Vector3.up * Mathf.Abs(Mathf.Sin(_bobT)) * 0.06f;
                    avatar.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(_bobT) * 2.2f);
                }
            }
            else
            {
                SettleAvatar();
            }
        }

        private void SettleAvatar()
        {
            if (avatar == null) return;
            _bobT = 0;
            avatar.localPosition = Vector3.Lerp(avatar.localPosition, _avatarBase, 10f * Time.deltaTime);
            avatar.localRotation = Quaternion.Slerp(avatar.localRotation, Quaternion.identity, 10f * Time.deltaTime);
        }
    }
}
