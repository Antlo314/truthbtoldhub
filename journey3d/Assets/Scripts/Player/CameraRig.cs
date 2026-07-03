using UnityEngine;

namespace Journey3D
{
    /// Smooth third-person follow with hold-right-mouse orbit and scroll zoom.
    public class CameraRig : MonoBehaviour
    {
        public Transform target;
        public float distance = 3.9f;
        public float minDistance = 1.8f;
        public float maxDistance = 8f;
        public float height = 2.2f;
        public float orbitSpeed = 3.2f;
        public float followLerp = 10f;
        public bool inputLocked;
        public bool portraitMode;    // creator: slow auto-orbit close on the avatar

        private float _yaw = 0f;     // start behind the player, facing Truth and the back wall
        private float _pitch = 13f;  // lower angle - see the room, not the floor

        private void LateUpdate()
        {
            if (target == null) return;

            if (portraitMode)
            {
                // slow catwalk orbit, framed on the body; offset left so the
                // avatar sits beside the creator card, not under it
                _yaw += 14f * Time.deltaTime;
                var pRot = Quaternion.Euler(6f, _yaw + 180f, 0);   // face the front
                var pFocus = target.position + Vector3.up * 1.0f + transform.right * -0.55f;
                var pWanted = pFocus - pRot * Vector3.forward * 3.1f + Vector3.up * 0.35f;
                transform.position = Vector3.Lerp(transform.position, pWanted, 6f * Time.deltaTime);
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(pFocus - transform.position), 6f * Time.deltaTime);
                return;
            }

            if (!inputLocked)
            {
                if (Input.GetMouseButton(1))
                {
                    _yaw += Input.GetAxis("Mouse X") * orbitSpeed;
                    _pitch = Mathf.Clamp(_pitch - Input.GetAxis("Mouse Y") * orbitSpeed, 4f, 65f);
                }
                var touchLook = InputHub.ConsumeLookDelta();
                if (touchLook != Vector2.zero)
                {
                    _yaw += touchLook.x * orbitSpeed * 0.05f;
                    _pitch = Mathf.Clamp(_pitch - touchLook.y * orbitSpeed * 0.05f, 4f, 65f);
                }
                distance = Mathf.Clamp(distance - Input.GetAxis("Mouse ScrollWheel") * 3f, minDistance, maxDistance);
            }

            var rot = Quaternion.Euler(_pitch, _yaw, 0);
            var focus = target.position + Vector3.up * 1.2f;
            var wanted = focus - rot * Vector3.forward * distance + Vector3.up * (height - 1.2f);

            // never let walls swallow the camera - clamp to the first thing hit
            var dir = wanted - focus;
            float dist = dir.magnitude;
            if (dist > 0.01f && Physics.SphereCast(focus, 0.3f, dir / dist, out var hit, dist))
                wanted = focus + dir / dist * Mathf.Max(0.5f, hit.distance - 0.15f);

            transform.position = Vector3.Lerp(transform.position, wanted, followLerp * Time.deltaTime);
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(focus - transform.position), followLerp * Time.deltaTime);
        }
    }
}
