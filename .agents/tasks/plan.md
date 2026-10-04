# Implementation Plan — OnlineCopyPaste.net

## Project Audit Summary

**Existing scaffold:**
- `package.json` — Next.js 14.2.18, React 18, ws 8.18.0, qrcode 1.5.4, prismjs 1.29.0, next-pwa 5.6.0, jsonwebtoken 9.0.2, uuid 10.0.0, vitest 1.6.0
- `next.config.ts` — withPWA wrapper (uses `module.exports`, correct for next-pwa 5.x), security headers, CSP defined
- `tsconfig.json` — esnext/bundler for Next.js app, excludes server.ts
- `tsconfig.server.json` — CommonJS target for server.ts + src/lib/**
- `tailwind.config.ts` — primary indigo (#6366f1), success green, danger red
- `.env.example` — all required env vars documented
- No source files exist yet — this is a clean scaffold

**Key decisions:**
1. `server.ts` uses CommonJS (`require`) because tsconfig.server.json targets CommonJS. The `src/lib/` files it imports must also be CommonJS-compatible (no top-level await, no ES module syntax).
2. WebRTC code (`src/lib/webrtc/`, all hooks) is browser-only. Never imported from `server.ts`. `tsconfig.server.json` excludes `src/app`, `src/components`, `src/hooks` — lib files shared between client and server must use Node.js-compatible APIs only.
3. `next.config.ts` keeps `module.exports = withPWA(nextConfig)` — not `export default`. This is already correct.
4. Prism.js: import only needed language packs (js, ts, python, css, json) to keep bundle under control.
5. Session tokens: JWT signed with `SESSION_SECRET`. Token contains `{ sessionId, role }`. Used to authenticate all session API calls.
6. File chunking: 64KB chunks, 20-byte binary header per chunk (16 bytes for UUID as ASCII hex + 4 bytes uint32 chunk index).
7. PWA: next-pwa 5.6.0 generates sw.js during `npm run build`. Add `NetworkOnly` rule for `/api/*` before the catch-all `NetworkFirst` rule.

---

## Interface Contracts

### WebSocket Message Protocol

All messages are JSON: `{ type: string, sessionId: string, payload: any }`

| type | direction | payload |
|------|-----------|---------|
| `join` | client→server | `{ role: 'pc'|'phone', token: string }` |
| `paired` | server→client | `{ role: 'pc'|'phone', peerRole: string }` |
| `offer` | client→server (relay) | `{ sdp: RTCSessionDescriptionInit }` |
| `answer` | client→server (relay) | `{ sdp: RTCSessionDescriptionInit }` |
| `ice-candidate` | client→server (relay) | `{ candidate: RTCIceCandidateInit }` |
| `destroy` | either→server | `{ reason?: string }` |
| `ping` | client→server | `{}` |
| `pong` | server→client | `{ timestamp: number }` |
| `error` | server→client | `{ code: string, message: string }` |
| `peer-disconnected` | server→client | `{ role: 'pc'|'phone' }` |

### Session Object (ServerSession in src/lib/session/types.ts)

```typescript
interface ServerSession {
  id: string                        // uuid v4
  pairCode: string                  // 6-digit string '482913'
  tokenHash: string                 // sha256 of JWT
  createdAt: Date
  expiresAt: Date
  status: 'waiting' | 'paired' | 'active' | 'destroyed'
  peers: { pc?: WebSocket; phone?: WebSocket }
  deviceCount: number
  ipAddress: string
}
```

### File Transfer DataChannel Protocol

**Step 1 — Sender sends file metadata (JSON):**
```json
{ "type": "file-meta", "transferId": "uuid-v4", "name": "photo.jpg", "size": 1048576, "mimeType": "image/jpeg", "totalChunks": 16 }
```

**Step 2 — Sender sends binary chunks:**
- 20-byte header: bytes 0–15 = transferId UUID as 16 ASCII hex chars, bytes 16–19 = chunkIndex as big-endian uint32
- Remaining bytes: chunk data (up to 65536 bytes)

**Step 3 — Sender signals completion (JSON):**
```json
{ "type": "file-complete", "transferId": "uuid-v4" }
```

**Cancellation (JSON, either side):**
```json
{ "type": "file-cancel", "transferId": "uuid-v4" }
```

---

## Complete File Tree

```
c:\OnlineCopyPaste.net\
├── server.ts                              # Custom HTTP + WebSocket signaling server
├── vitest.config.ts                       # Vitest configuration
├── README.md
├── public/
│   ├── manifest.json                      # PWA manifest
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── ads.txt
│   └── icons/
│       ├── icon-192.png                   # PWA icon (placeholder 1x1 px)
│       └── icon-512.png                   # PWA icon (placeholder 1x1 px)
├── src/
│   ├── types/
│   │   └── index.ts                       # All shared TypeScript types
│   ├── lib/
│   │   ├── session/
│   │   │   ├── types.ts                   # Server-side session types (uses ws.WebSocket)
│   │   │   ├── utils.ts                   # generateSessionId, generatePairCode, hashToken
│   │   │   └── SessionStore.ts            # In-memory Map singleton
│   │   ├── webrtc/
│   │   │   ├── config.ts                  # STUN/TURN ICE config (browser-only)
│   │   │   ├── PeerConnection.ts          # RTCPeerConnection wrapper (browser-only)
│   │   │   └── DataChannel.ts             # DataChannel + file chunking (browser-only)
│   │   ├── content-detection.ts           # URL/JSON/code/text detector
│   │   ├── file-utils.ts                  # sanitize, MIME check, format size
│   │   ├── rate-limiter.ts                # Sliding window rate limiter
│   │   └── analytics.ts                   # GA4 gtag helpers
│   ├── hooks/
│   │   ├── useWebRTC.ts                   # WebSocket + RTCPeerConnection orchestration
│   │   ├── useSession.ts                  # Session create/join/destroy + sessionStorage
│   │   ├── useConnectionStatus.ts         # ONLINE/LOCAL/OFFLINE mode detection
│   │   └── useTransferQueue.ts            # Transfer queue state management
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ConnectionStatus.tsx
│   │   ├── session/
│   │   │   ├── SessionCreator.tsx
│   │   │   ├── SessionJoiner.tsx
│   │   │   ├── SessionTimer.tsx
│   │   │   └── DestroySession.tsx
│   │   ├── workspace/
│   │   │   ├── Workspace.tsx
│   │   │   ├── ClipboardTab.tsx
│   │   │   ├── CodeTab.tsx
│   │   │   ├── FilesTab.tsx
│   │   │   ├── LinksTab.tsx
│   │   │   ├── ImagesTab.tsx
│   │   │   ├── NotesTab.tsx
│   │   │   └── TransfersTab.tsx
│   │   ├── transfer/
│   │   │   ├── TransferProgress.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   └── DropZone.tsx
│   │   └── ads/
│   │       └── AdSlot.tsx
│   └── app/
│       ├── globals.css
│       ├── layout.tsx                     # Root layout with metadata + GA/AdSense scripts
│       ├── page.tsx                       # Homepage
│       ├── app/
│       │   └── page.tsx                   # Workspace (requires active session)
│       ├── join/
│       │   └── [code]/
│       │       └── page.tsx               # Phone join page
│       ├── lab-mode/
│       │   └── page.tsx
│       ├── phone-to-pc/
│       │   └── page.tsx
│       ├── online-clipboard/
│       │   └── page.tsx
│       ├── file-transfer/
│       │   └── page.tsx
│       ├── code-transfer/
│       │   └── page.tsx
│       ├── how-it-works/
│       │   └── page.tsx
│       ├── security/
│       │   └── page.tsx
│       ├── faq/
│       │   └── page.tsx
│       ├── privacy/
│       │   └── page.tsx
│       ├── terms/
│       │   └── page.tsx
│       ├── cookies/
│       │   └── page.tsx
│       ├── about/
│       │   └── page.tsx
│       └── contact/
│           └── page.tsx
└── tests/
    ├── setup.ts                           # @testing-library/jest-dom import
    ├── unit/
    │   ├── session.test.ts
    │   ├── content-detection.test.ts
    │   ├── file-utils.test.ts
    │   └── rate-limiter.test.ts
    ├── integration/
    │   └── api.test.ts
    └── e2e/
        └── e2e-test-plan.md
```

---

## Implementation Plan (ordered by dependency)

- [ ] 1. **Foundation types and lib utilities** *(FEAT-001)*
      Create all shared TypeScript types (`src/types/index.ts`), session lib (`src/lib/session/`), WebRTC lib (`src/lib/webrtc/`), and utility modules (`content-detection`, `file-utils`, `rate-limiter`, `analytics`). Also create `vitest.config.ts`, `tests/setup.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `public/manifest.json`, `public/robots.txt`, `public/sitemap.xml`, `public/ads.txt`, `README.md`.
      Files: src/types/index.ts, src/lib/session/types.ts, src/lib/session/utils.ts, src/lib/session/SessionStore.ts, src/lib/webrtc/config.ts, src/lib/webrtc/PeerConnection.ts, src/lib/webrtc/DataChannel.ts, src/lib/content-detection.ts, src/lib/file-utils.ts, src/lib/rate-limiter.ts, src/lib/analytics.ts, vitest.config.ts, tests/setup.ts, src/app/globals.css, src/app/layout.tsx, public/manifest.json, public/robots.txt, public/sitemap.xml, public/ads.txt, README.md
      Verify: `npm run type-check` passes; `npm test` runs without configuration error

- [ ] 2. **Custom server + session API** *(FEAT-002)*
      Create `server.ts` (CommonJS, HTTP + WebSocket signaling), all four API route handlers, and all unit/integration tests. Depends on step 1 (SessionStore, utils, rate-limiter).
      Files: server.ts, src/app/api/session/create/route.ts, src/app/api/session/destroy/route.ts, src/app/api/session/status/route.ts, src/app/api/health/route.ts, tests/unit/session.test.ts, tests/unit/rate-limiter.test.ts, tests/unit/content-detection.test.ts, tests/unit/file-utils.test.ts, tests/integration/api.test.ts
      Verify: `npm run type-check` passes; `npm test` all tests pass

- [ ] 3. **WebRTC hooks and transfer UI components** *(FEAT-003)*
      Create the four React hooks (`useWebRTC`, `useSession`, `useConnectionStatus`, `useTransferQueue`) and three transfer components (`TransferProgress`, `FilePreview`, `DropZone`). All are `'use client'`. Depends on steps 1–2.
      Files: src/hooks/useWebRTC.ts, src/hooks/useSession.ts, src/hooks/useConnectionStatus.ts, src/hooks/useTransferQueue.ts, src/components/transfer/TransferProgress.tsx, src/components/transfer/FilePreview.tsx, src/components/transfer/DropZone.tsx
      Verify: `npm run type-check` passes; `npm run build` succeeds (validates client boundaries)

- [ ] 4. **All UI components and pages** *(FEAT-004)*
      Create all layout, session, workspace, and UI primitive components, then all 20 app pages. Depends on steps 1–3.
      Files: all src/components/**/*.tsx, all src/app/**/*.tsx (see file tree above), tests/e2e/e2e-test-plan.md
      Verify: `npm run type-check` passes; `npm run build` completes with no errors

- [ ] 5. **PWA finalization and production readiness** *(FEAT-005)*
      Update `next.config.ts` to add `NetworkOnly` rule for `/api/*`, create placeholder PWA icon PNGs, run full test suite, verify server compiles, fix any integration issues.
      Files: next.config.ts (update), public/icons/icon-192.png, public/icons/icon-512.png
      Verify: `npm run type-check` passes; `npm test` all pass; `npm run build` generates `public/sw.js`

---

## Risks and Tricky Parts

### 1. RTCPeerConnection in Next.js App Router
**Risk:** Importing WebRTC classes at module level crashes during SSR.
**Mitigation:** All WebRTC code lives in hooks (which are client-only). The `PeerConnection.ts` and `DataChannel.ts` lib files are NOT imported anywhere at module level in server components. The workspace page (`/app/page.tsx`) uses `'use client'`. The hook instantiates `RTCPeerConnection` inside `useEffect` only.

### 2. server.ts CommonJS vs Next.js ESM
**Risk:** `import` syntax in server.ts breaks ts-node compilation.
**Mitigation:** `tsconfig.server.json` targets CommonJS. All server-side code uses `require()` or `import ... from` with `esModuleInterop: true` (which ts-node handles). `src/lib/session/` and `src/lib/rate-limiter.ts` must not use top-level await or ESM-only features.

### 3. next-pwa 5.x configuration
**Risk:** next-pwa caches API routes, causing stale session data on the phone.
**Mitigation:** Add `{ urlPattern: /\/api\//, handler: 'NetworkOnly' }` as the FIRST entry in `runtimeCaching` (before the catch-all). Also exclude `/app/` path. Keep `module.exports = withPWA(nextConfig)` — not ES export default.

### 4. Large file chunking over DataChannel
**Risk:** Sending too-large chunks causes DataChannel buffer overflow.
**Mitigation:** 64KB chunks. Check `channel.bufferedAmount` before sending each chunk; pause if > 16MB, resume on `bufferedamountlow` event. The `DataChannel.ts` class handles this backpressure logic.

### 5. Session token security
**Risk:** Session tokens intercepted allow session hijacking.
**Mitigation:** JWT signed with `SESSION_SECRET`. Tokens are stored in `sessionStorage` (not localStorage or cookies) — cleared when tab closes on public computers. Token hashed with sha256 for comparison in session store (never stored raw).

### 6. UUID in binary header for DataChannel
**Risk:** UUID string-to-binary encoding is fiddly.
**Mitigation:** Store the UUID as 16 bytes of raw hex characters (ASCII, each character is 1 byte). Use a DataView for the 4-byte uint32 chunk index. Reader slices the ArrayBuffer at byte 20 to get chunk data.

### 7. Prism.js bundle size
**Risk:** Importing all Prism languages adds ~200KB to client bundle.
**Mitigation:** Import only: `prismjs/components/prism-javascript`, `prismjs/components/prism-typescript`, `prismjs/components/prism-python`, `prismjs/components/prism-css`, `prismjs/components/prism-json`. Use `Prism.highlight()` directly (not the auto-highlighter).

### 8. AdSlot null in production
**Risk:** AdSense script errors if slot rendered without publisher ID.
**Mitigation:** `AdSlot` returns `null` immediately if `process.env.NEXT_PUBLIC_ADSENSE_ID` is falsy. In dev with `NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS=true`, renders a styled placeholder div instead.

### 9. Routing: /app vs /app/page.tsx
**Risk:** The workspace is at `/app` which conflicts with the `src/app/` App Router convention.
**Mitigation:** The workspace page lives at `src/app/app/page.tsx` which Next.js correctly routes as `/app`. This is a valid App Router nested route — no conflict.

### 10. WebSocket reconnection on public computers
**Risk:** Tab sleeps on some campus browsers, killing WebSocket.
**Mitigation:** Server sends ping every 30s. Client reconnects WebSocket on `close` event (up to 3 retries with exponential backoff). After reconnect, re-sends `join` message with token to re-register the peer.
