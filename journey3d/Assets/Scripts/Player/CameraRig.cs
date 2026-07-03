using UnityEngine;

namespace Journey3D
{
    /// Smooth third-person follow with hold-right-mouse orbit and scroll zoom.
    public class CameraRig : MonoBehaviour
    {
        public Transform target;
        public float distance = 4.4f;
        public float minDistance = 2f;
        public float maxDistance = 7f;
        public float height = 2.6f;
        public float orbitSpeed = 3.2f;
        public float followLerp = 8f;
        public bool inputLocked;

        private float _yaw = 0f;     // start behind the player, facing Truth and the back wall
        private float _pitch = 18f;

        private void LateUpdate()
        {
            if (target == null) return;

            if (!inputLocked)
            {
                if (Input.GetMouseButton(1))
                {
                    _yaw += Input.GetAxis("Mouse X") * orbitSpeed;
                    _pitch = Mathf.Clamp(_pitch - Input.GetAxis("Mouse Y") * orbitSpeed, 4f, 65f);
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
