using UnityEngine;

namespace Journey3D
{
    /// Smooth third-person follow with hold-right-mouse orbit and scroll zoom.
    public class CameraRig : MonoBehaviour
    {
        public Transform target;
        public float distance = 5.5f;
        public float minDistance = 2.5f;
        public float maxDistance = 9f;
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
            transform.position = Vector3.Lerp(transform.position, wanted, followLerp * Time.deltaTime);
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(focus - transform.position), followLerp * Time.deltaTime);
        }
    }
}
