"""
Touchless Virtual Mouse for Sparsh Mukthi 3D — moves the REAL Windows cursor.

Based on the classic PyAutoGUI touchless mouse. Run this next to the classroom
and your hand drives the actual PC cursor everywhere (browser included), so
hover/click behave natively:

    ☝️  index finger        → move the real cursor
    ✌️  index+middle close  → left click
    🙌  two hands           → spread apart / bring together = scroll (zoom)

The in-browser gesture panel remains the zero-install fallback; you can run
both — this script simply takes over the pointer.

    pip install -r requirements.txt
    python virtual_mouse.py        (Esc in the preview window quits)
"""
import cv2
import numpy as np
import mediapipe as mp
import pyautogui

# === Configuration ===
CAM_WIDTH, CAM_HEIGHT = 640, 480
FRAME_REDUCTION = 100   # dead border of the camera frame
SMOOTHENING = 7         # cursor easing divisor
DEADZONE_PX = 4         # ignore hand tremor below this (no jitter)
CLICK_THRESHOLD = 40    # px between index & middle tips → click
ZOOM_THRESHOLD = 10     # px spread change to trigger a scroll step
SCROLL_FACTOR = 20      # scroll "clicks" per step

pyautogui.FAILSAFE = True  # slam cursor into a screen corner to abort
pyautogui.PAUSE = 0

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW if hasattr(cv2, "CAP_DSHOW") else 0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAM_WIDTH)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils
hands = mp_hands.Hands(max_num_hands=2, min_detection_confidence=0.7)

screen_w, screen_h = pyautogui.size()

prev_x = prev_y = 0
click_armed = True
zoom_prev_dist = None


def fingers_up(lm):
    tips = [4, 8, 12, 16, 20]
    st = [1 if lm[tips[0]].x < lm[tips[0] - 1].x else 0]  # thumb
    for tip in tips[1:]:
        st.append(1 if lm[tip].y < lm[tip - 2].y else 0)
    return st


while True:
    ret, frame = cap.read()
    if not ret:
        break

    img = cv2.flip(frame, 1)
    res = hands.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    hand_count = len(res.multi_hand_landmarks) if res.multi_hand_landmarks else 0

    # --- 🙌 TWO-HAND ZOOM (scroll) ---
    if hand_count == 2:
        pts = []
        for hlm in res.multi_hand_landmarks:
            mp_draw.draw_landmarks(img, hlm, mp_hands.HAND_CONNECTIONS)
            lm8 = hlm.landmark[8]
            pts.append((int(lm8.x * CAM_WIDTH), int(lm8.y * CAM_HEIGHT)))

        (x1, y1), (x2, y2) = pts
        cv2.line(img, (x1, y1), (x2, y2), (0, 200, 255), 3)
        dist = np.hypot(x2 - x1, y2 - y1)

        if zoom_prev_dist is None:
            zoom_prev_dist = dist
        else:
            delta = dist - zoom_prev_dist
            if abs(delta) > ZOOM_THRESHOLD:
                pyautogui.scroll(int(delta / ZOOM_THRESHOLD) * SCROLL_FACTOR)
                zoom_prev_dist = dist
        click_armed = True

    # --- ☝️ ONE-HAND MOUSE & CLICKS ---
    elif hand_count == 1:
        zoom_prev_dist = None
        hlm = res.multi_hand_landmarks[0]
        mp_draw.draw_landmarks(img, hlm, mp_hands.HAND_CONNECTIONS)
        lm = hlm.landmark
        fu = fingers_up(lm)
        idx, mid = fu[1], fu[2]

        if idx and not mid:
            # move the REAL cursor
            x_px = int(lm[8].x * CAM_WIDTH)
            y_px = int(lm[8].y * CAM_HEIGHT)
            x_scr = np.interp(x_px, (FRAME_REDUCTION, CAM_WIDTH - FRAME_REDUCTION), (0, screen_w))
            y_scr = np.interp(y_px, (FRAME_REDUCTION, CAM_HEIGHT - FRAME_REDUCTION), (0, screen_h))
            curr_x = prev_x + (x_scr - prev_x) / SMOOTHENING
            curr_y = prev_y + (y_scr - prev_y) / SMOOTHENING
            if np.hypot(curr_x - prev_x, curr_y - prev_y) > DEADZONE_PX:  # tremor gate
                pyautogui.moveTo(curr_x, curr_y)
                prev_x, prev_y = curr_x, curr_y
            click_armed = True

        elif idx and mid:
            # ✌️ close fingers = one left click (re-arm on separation)
            x1, y1 = int(lm[8].x * CAM_WIDTH), int(lm[8].y * CAM_HEIGHT)
            x2, y2 = int(lm[12].x * CAM_WIDTH), int(lm[12].y * CAM_HEIGHT)
            close = np.hypot(x2 - x1, y2 - y1) < CLICK_THRESHOLD
            if close and click_armed:
                pyautogui.click()
                click_armed = False
            elif not close:
                click_armed = True
    else:
        zoom_prev_dist = None
        click_armed = True

    cv2.rectangle(
        img,
        (FRAME_REDUCTION, FRAME_REDUCTION),
        (CAM_WIDTH - FRAME_REDUCTION, CAM_HEIGHT - FRAME_REDUCTION),
        (255, 0, 255),
        2,
    )
    cv2.imshow("Touchless Virtual Mouse — Esc to quit", img)
    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
