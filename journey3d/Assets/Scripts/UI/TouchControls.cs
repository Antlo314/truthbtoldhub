using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace Journey3D
{
    /// On-screen controls for phones/tablets: a left thumb-stick (movement),
    /// a right-side look pad (camera drag), and an Interact button. Built in
    /// code; only shown on touch devices. Hidden while a station panel is open.
    public class TouchControls : MonoBehaviour
    {
        public HutUI ui;

        private RectTransform _stickBase, _stickKnob;
        private int _stickFinger = -1;
        private Vector2 _stickCenter;
        private const float StickRadius = 120f;

        private GameObject _root;

        private void Start()
        {
            if (!InputHub.ShowTouchUI) { enabled = false; return; }
            Build();
        }

        private void Build()
        {
            var canvas = UIKit.CreateCanvas("TouchCanvas");
            canvas.sortingOrder = 50;
            _root = canvas.gameObject;

            // left thumb-stick
            _stickBase = UIKit.Panel(canvas.transform, "stickBase", new Color(1, 1, 1, 0.08f));
            _stickBase.sizeDelta = new Vector2(StickRadius * 2, StickRadius * 2);
            _stickBase.anchorMin = _stickBase.anchorMax = new Vector2(0, 0);
            _stickBase.pivot = new Vector2(0.5f, 0.5f);
            _stickBase.anchoredPosition = new Vector2(190, 190);
            var baseImg = _stickBase.GetComponent<Image>();
            baseImg.raycastTarget = false;
            AddCircleOutline(_stickBase, UIKit.Gold);

            _stickKnob = UIKit.Panel(_stickBase, "knob", new Color(UIKit.Gold.r, UIKit.Gold.g, UIKit.Gold.b, 0.5f));
            _stickKnob.sizeDelta = new Vector2(90, 90);
            _stickKnob.anchorMin = _stickKnob.anchorMax = _stickKnob.pivot = new Vector2(0.5f, 0.5f);
            _stickKnob.anchoredPosition = Vector2.zero;
            _stickKnob.GetComponent<Image>().raycastTarget = false;

            // interact button (bottom-right)
            var interact = UIKit.TextButton(canvas.transform, "E", UIKit.Amber, () => InputHub.QueueInteract(), 40);
            var irt = interact.GetComponent<RectTransform>();
            irt.anchorMin = irt.anchorMax = new Vector2(1, 0);
            irt.pivot = new Vector2(1, 0);
            irt.anchoredPosition = new Vector2(-70, 150);
            irt.sizeDelta = new Vector2(150, 150);
            MakeRound(irt);
        }

        private void Update()
        {
            if (_root == null) return;
            bool hide = ui != null && ui.PanelOpen;
            if (_root.activeSelf == hide) _root.SetActive(!hide);
            if (hide) { InputHub.MoveTouch = Vector2.zero; return; }

            HandleStick();
            HandleLookPad();
        }

        private void HandleStick()
        {
            // find/track a finger that started in the left half, below mid-screen
            if (_stickFinger < 0)
            {
                for (int i = 0; i < Input.touchCount; i++)
                {
                    var t = Input.GetTouch(i);
                    if (t.phase == TouchPhase.Began && t.position.x < Screen.width * 0.5f && t.position.y < Screen.height * 0.6f)
                    {
                        _stickFinger = t.fingerId;
                        _stickCenter = t.position;
                        _stickBase.position = t.position;
                        break;
                    }
                }
            }
            if (_stickFinger < 0) { InputHub.MoveTouch = Vector2.zero; ResetKnob(); return; }

            bool found = false;
            for (int i = 0; i < Input.touchCount; i++)
            {
                var t = Input.GetTouch(i);
                if (t.fingerId != _stickFinger) continue;
                found = true;
                if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
                {
                    _stickFinger = -1;
                    InputHub.MoveTouch = Vector2.zero;
                    ResetKnob();
                    return;
                }
                Vector2 delta = t.position - _stickCenter;
                Vector2 clamped = Vector2.ClampMagnitude(delta, StickRadius);
                _stickKnob.anchoredPosition = clamped;
                InputHub.MoveTouch = clamped / StickRadius;
            }
            if (!found) { _stickFinger = -1; InputHub.MoveTouch = Vector2.zero; ResetKnob(); }
        }

        private void HandleLookPad()
        {
            // any finger dragging on the right half orbits the camera
            for (int i = 0; i < Input.touchCount; i++)
            {
                var t = Input.GetTouch(i);
                if (t.fingerId == _stickFinger) continue;
                if (t.position.x > Screen.width * 0.5f && t.phase == TouchPhase.Moved)
                    InputHub.LookTouchDelta += t.deltaPosition;
            }
        }

        private void ResetKnob()
        {
            if (_stickKnob != null) _stickKnob.anchoredPosition = Vector2.zero;
        }

        private static void AddCircleOutline(RectTransform rt, Color c)
        {
            var o = rt.gameObject.AddComponent<Outline>();
            o.effectColor = new Color(c.r, c.g, c.b, 0.5f);
            o.effectDistance = new Vector2(2, -2);
        }

        private static void MakeRound(RectTransform rt)
        {
            // visual only; UGUI Image stays square but the accent reads as a pad
        }
    }
}
