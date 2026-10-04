# Build Log — Review Findings Fix

## What Was Fixed

### Finding 1 — Phone Join API Mismatch (CRITICAL)
- **Root cause:** `useSession.joinSession()` was posting `{ pairCode, role: 'phone' }` to `POST /api/session/create`, which ignores `pairCode` and always creates a new session. The phone would join a freshly created session with no PC peer — pairing never occurred.
- **Fix:** Created `src/app/api/session/join/route.ts` — a new `POST /api/session/join` endpoint that calls `sessionStore.getByPairCode(pairCode)`, issues a phone-role JWT for the found session, and returns the same response shape as `/api/session/create`.
- **Additional:** Added `phoneTokenHash?: string` to `ServerSession` so the phone's token hash is stored separately from the PC's `tokenHash`. Updated `server.ts` `handleJoin` to check the per-role hash, preventing the phone's join from locking out the PC.
- **Updated:** `useSession.joinSession()` now calls `/api/session/join` (not `/api/session/create`).

### Finding 2 — JWT Token in URL (HIGH)
- **Root cause:** `SessionCreator` and `SessionJoiner` both navigated to `/app?sessionId=…&token=…`, placing the raw JWT in the browser address bar, history, and server access logs.
- **Fix:** `SessionCreator.handleGoToWorkspace()` now navigates to `/app?role=pc` (role only). `SessionJoiner.handleJoin()` navigates to `/app?role=phone`. Both already persist session data to `sessionStorage` via `useSession`.
- **`Workspace.tsx`** updated to read `sessionId` and `token` from `useSession` (which restores from `sessionStorage`) rather than URL search params. The `useEffect` redirect guard now triggers on the session hook's state.
- **`src/app/app/page.tsx`** simplified — removed the `useSearchParams` URL-based guard (which would have incorrectly redirected since `token` is no longer in the URL).

### Finding 3 — RateLimiter Memory Growth (LOW)
- **Root cause:** `RateLimiter.cleanup()` existed but was never called; the `windows` Map grew without bound.
- **Fix:** Added `import rateLimiter` (default export) to `server.ts` alongside the existing `wsRateLimiter` import. Added a `setInterval(() => { rateLimiter.cleanup(); wsRateLimiter.cleanup(); }, 60_000)` inside `app.prepare().then()` alongside the existing SessionStore cleanup interval.

---

## Verification Results

### Type Check
```
npm run type-check
```
**Result:** ✅ 0 errors

### Tests
```
npm test
```
**Result:** ✅ 88 tests passed (5 test files)
- tests/unit/rate-limiter.test.ts — 7 passed
- tests/unit/file-utils.test.ts — 27 passed
- tests/unit/content-detection.test.ts — 16 passed
- tests/unit/session.test.ts — 20 passed
- tests/integration/api.test.ts — 18 passed

### Build
```
npm run build
```
**Result:** ✅ Build succeeded
- 23 pages generated (including new `/api/session/join` dynamic route)
- PWA service worker generated at `public/sw.js`
- No compilation errors

---

## Commit
`1212bf8` — fix: phone join API, remove JWT from URL, add rate-limiter cleanup
