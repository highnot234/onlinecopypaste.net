# OnlineCopyPaste — Manual E2E Test Plan

This document covers manual end-to-end tests for all critical user flows.
Each test includes: precondition, steps, and expected result.

---

## Test 1 — Session Creation Flow

**Precondition:** Browser on desktop. NEXT_PUBLIC_WS_URL is set (or default ws://localhost:3000).

**Steps:**
1. Navigate to `http://localhost:3000`
2. The homepage loads with the hero section visible
3. Scroll to the "Start a Session" section
4. Select a session duration (e.g., 10 min)
5. Click "⚡ Start Free Session"

**Expected result:**
- A QR code appears
- A 6-digit code in "XXX XXX" format is shown
- A join URL is displayed
- A "Copy Link" button is available
- An "Open Workspace →" button is available

---

## Test 2 — QR Code Scanning Pairing

**Precondition:** Test 1 completed. Mobile device with camera available.

**Steps:**
1. On the mobile device, open the camera
2. Point the camera at the QR code on the desktop browser
3. Tap the link that appears (should open `http://<server>/join/<code>`)
4. The phone browser navigates to the join page with the code pre-filled

**Expected result:**
- Phone browser shows "Joining session XXX XXX"
- 6-digit code is pre-filled in the input
- "Join Session →" button is active

---

## Test 3 — Manual Code Entry Pairing

**Precondition:** Session created on desktop (Test 1 completed).

**Steps:**
1. On mobile, navigate to `http://localhost:3000`
2. The homepage loads
3. Navigate to `http://localhost:3000/join/` (or use the "Join" CTA)
4. Manually type the 6-digit code shown on the desktop
5. Click "Join Session →"

**Expected result:**
- Phone redirects to `/app?sessionId=...&role=phone`
- Desktop workspace shows "Paired" status indicator
- Phone workspace shows "Paired" status indicator

---

## Test 4 — Text Transfer (Phone → PC)

**Precondition:** Session paired (Test 2 or 3 completed). Both devices showing workspace.

**Steps:**
1. On the phone workspace, navigate to the Clipboard tab
2. Type "Hello from phone" in the text area
3. Click "Send →"

**Expected result:**
- PC workspace Clipboard tab shows "Hello from phone" in the received list
- A "Copy" button appears next to the received item
- Clicking "Copy" copies the text to PC clipboard

---

## Test 5 — Text Transfer (PC → Phone)

**Precondition:** Session paired (Tests 2 or 3).

**Steps:**
1. On the PC workspace, navigate to the Clipboard tab
2. Type "Hello from PC" in the text area
3. Click "Send →"

**Expected result:**
- Phone workspace Clipboard tab shows "Hello from PC" in the received list

---

## Test 6 — File Upload and Transfer

**Precondition:** Session paired.

**Steps:**
1. On the PC workspace, navigate to the Files tab
2. Drag a file (e.g., test.pdf, ~1 MB) onto the DropZone
3. Observe the transfer progress

**Expected result:**
- DropZone shows dragover state when file is dragged over
- Transfer item appears in the transfer list with "Transferring" status
- Progress bar fills from 0% to 100%
- Status changes to "Complete"
- Phone workspace Files tab shows the received file with a "Download" button

---

## Test 7 — Image Preview

**Precondition:** Session paired.

**Steps:**
1. On the PC workspace, navigate to the Images tab
2. Select an image file (JPG or PNG) via the "Browse Images" button
3. Send the file
4. On the phone, navigate to the Images tab

**Expected result:**
- Image thumbnail appears in the received grid on the phone
- Clicking the thumbnail opens the image in a modal dialog
- Modal has a "Download" button
- Closing the modal (X or backdrop click) returns to the grid

---

## Test 8 — Code Snippet Transfer with Syntax Highlighting

**Precondition:** Session paired.

**Steps:**
1. On the phone workspace, navigate to the Code tab
2. Paste a JavaScript code snippet (e.g., `const x = () => console.log('hi')`)
3. Click "Send Code →"

**Expected result:**
- PC workspace Code tab shows the received snippet
- Syntax highlighting is applied (keywords are colored differently)
- Language detection shows "javascript" or "typescript"
- A "Copy" button is present

---

## Test 9 — Destroy Session

**Precondition:** Session paired.

**Steps:**
1. On the PC workspace, click the "🔥 Destroy Session" button
2. A confirmation modal appears
3. Read the confirmation text
4. Click "Yes, Destroy"

**Expected result:**
- Modal closes
- A success toast appears: "Session destroyed. All data cleared."
- Both devices redirect to the homepage (`/`)
- Attempting to use the old session code in a new session join returns an error

---

## Test 10 — Session Expiry

**Precondition:** Session created with 10-minute duration.

**Steps:**
1. Create a session with 10-minute duration
2. Wait for the countdown timer to reach 00:00
3. (Or manually advance the system clock for testing)

**Expected result:**
- SessionTimer turns red when < 5 minutes remain
- SessionTimer shows "Session expired" when time reaches 0
- The workspace redirects to the homepage

---

## Test 11 — Offline Mode Detection

**Precondition:** Browser on desktop. Network available initially.

**Steps:**
1. Navigate to `http://localhost:3000`
2. Note the connection indicator shows "ONLINE" (green)
3. Disable network connectivity (e.g., turn off Wi-Fi)
4. Wait 30 seconds (or trigger the offline event manually via DevTools)

**Expected result:**
- Connection indicator changes from "ONLINE" (green) to "OFFLINE" (red)
- Hovering over the indicator shows the tooltip: "No network connection detected..."
- Restoring network changes the indicator back to "ONLINE"

---

## Test 12 — PWA Install Prompt

**Precondition:** Chrome on Android (or Chrome on desktop).

**Steps:**
1. Navigate to `https://onlinecopypaste.net`
2. Open browser menu
3. Look for "Install app" or "Add to Home Screen" option

**Expected result:**
- The install option is available (manifest.json properly configured)
- After installation, the app opens in standalone mode (no browser chrome)
- Theme color matches the app's indigo color (#6366f1)

---

## Test 13 — Mobile Responsiveness

**Precondition:** Mobile browser (or desktop browser with mobile viewport simulation).

**Steps:**
1. Navigate to `http://localhost:3000` on mobile viewport (375px wide)
2. Check the header — hamburger menu should appear
3. Tap the hamburger — mobile menu should slide down
4. Navigate to the workspace at `/app`
5. Check the tab bar — tabs should be scrollable horizontally
6. Check each tab's content fits within the viewport

**Expected result:**
- No horizontal overflow on any page
- Hamburger menu works correctly
- Tab bar scrolls horizontally on small screens
- All buttons are tappable (min height ~44px)

---

## Test 14 — Ad Slot Rendering

**Precondition:** Two environments: (1) NEXT_PUBLIC_ADSENSE_ID not set, (2) NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS=true.

**Steps (Case A — no ADSENSE_ID):**
1. Start the app without NEXT_PUBLIC_ADSENSE_ID
2. Navigate to the homepage

**Expected result (Case A):**
- No ad slot rendered, no error in console

**Steps (Case B — placeholders enabled):**
1. Start the app with `NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS=true`
2. Navigate to the homepage

**Expected result (Case B):**
- Gray placeholder div visible with "Ad Placeholder" text
- No JavaScript errors
- Placeholder does not affect page layout
