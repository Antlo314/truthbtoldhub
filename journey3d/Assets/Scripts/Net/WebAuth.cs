using System;
using UnityEngine;
#if UNITY_WEBGL && !UNITY_EDITOR
using System.Runtime.InteropServices;
#endif

namespace Journey3D
{
    /// The signed-in soul, when the game runs inside truthbtoldhub.com.
    /// Elsewhere (editor/desktop) there is no session and calls fail soft.
    public static class WebAuth
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern string J3D_ReadSession();
#endif

        [Serializable]
        private class Session
        {
            public string token;
            public string userId;
            public string email;
        }

        private static Session _session;
        private static bool _read;

        private static Session Current
        {
            get
            {
                if (_read) return _session;
                _read = true;
#if UNITY_WEBGL && !UNITY_EDITOR
                try
                {
                    var raw = J3D_ReadSession();
                    if (!string.IsNullOrEmpty(raw))
                        _session = JsonUtility.FromJson<Session>(raw);
                }
                catch { _session = null; }
#endif
                return _session;
            }
        }

        public static bool SignedIn => !string.IsNullOrEmpty(Current?.token);
        public static string AccessToken => Current?.token;
        public static string UserId => Current?.userId;
    }
}
