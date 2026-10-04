# OnlineCopyPaste.net — Final Build Report

Generated: 2025-07-14

---

## Build Status

**PASS** — `npm run build` completed successfully with 0 errors and 0 warnings.

Next.js 14.2.18 production build with PWA service worker generated via `next-pwa`.

---

## Test Results

**PASS** — 88 tests across 5 test files, 0 failures.

| Test File | Tests |
|---|---|
| tests/unit/rate-limiter.test.ts | 7 |
| tests/unit/file-utils.test.ts | 27 |
| tests/unit/content-detection.test.ts | 16 |
| tests/unit/session.test.ts | 20 |
| tests/integration/api.test.ts | 18 |
| **Total** | **88** |

Runner: Vitest 1.6.0 — Duration: ~3.1 s

---

## Route List (from build output)

| Route | Type | Description |
|---|---|---|
| `/` | Static | Home / landing page |
| `/_not-found` | Static | 404 page |
| `/about` | Static | About page |
| `/api/health` | Static | Health check endpoint |
| `/api/session/create` | Dynamic | Create a new transfer session |
| `/api/session/destroy` | Dynamic | Destroy a session |
| `/api/session/join` | Dynamic | Join an existing session |
| `/api/session/status` | Dynamic | Poll session status |
| `/app` | Static | Main transfer app UI |
| `/code-transfer` | Static | Code transfer landing page |
| `/contact` | Static | Contact page |
| `/cookies` | Static | Cookie policy |
| `/faq` | Static | FAQ page |
| `/file-transfer` | Static | File transfer landing page |
| `/how-it-works` | Static | How it works explainer |
| `/join/[code]` | Dynamic | QR / short-link join handler |
| `/lab-mode` | Static | Lab / experimental mode |
| `/online-clipboard` | Static | Online clipboard landing page |
| `/phone-to-pc` | Static | Phone-to-PC landing page |
| `/privacy` | Static | Privacy policy |
| `/security` | Static | Security page |
| `/terms` | Static | Terms of service |

Total: **22 app routes** (23 pages including `/_not-found`)

---

## Feature Checklist

### FEAT 1 — Clipboard Sync ✅
- Real-time text/clipboard transfer between phone and PC via WebRTC DataChannel
- Content-type auto-detection (plain text, URL, code snippet)
- Copy-to-clipboard button with toast confirmation
- QR code display for easy phone join

### FEAT 2 — File Transfer ✅
- Binary file transfer over WebRTC DataChannel (64 KB chunks, 20-byte header per chunk)
- Progress bar with speed and ETA display
- File size validation (configurable `MAX_FILE_SIZE_MB`, default 100 MB)
- `sanitizeFilename` applied to all received file names
- `/file-transfer` landing page for SEO

### FEAT 3 — Code Transfer ✅
- Syntax-highlighted code viewing via Prism.js
- Language auto-detection
- Copy and download buttons
- `/code-transfer` landing page for SEO

### FEAT 4 — PWA / SEO ✅
- `next-pwa` service worker with NetworkOnly strategy for API/app routes
- `public/manifest.json` with icons, theme color, standalone display mode
- `public/robots.txt` allowing all crawlers, pointing to sitemap
- `public/sitemap.xml` with all public routes and lastmod dates
- OpenGraph and Twitter card metadata on all pages
- Google Analytics 4 integration (env-gated)
- Google AdSense integration (env-gated) with `public/ads.txt`
- Google Search Console meta-tag hook in `layout.tsx`

### FEAT 5 — Production Polish ✅
- Custom HTTP + WebSocket server (`server.ts`) for signaling
- In-memory session store with configurable TTL and rate limiter
- JWT-signed session tokens via `SESSION_SECRET`; production guard blocks startup without it
- Rate limiting on session creation (per-IP)
- `SESSION_SECRET` never exposed to the client
- TURN server config support for NAT traversal
- Connection state banner (ONLINE / LOCAL / OFFLINE)
- `/api/health` endpoint for uptime monitoring
- All 22 routes verified in production build

---

## Known Limitations

1. **In-memory session store** — sessions are lost on server restart; no persistence layer (by design for privacy).
2. **Single-process signaling** — the WebSocket server is not horizontally scalable without an external pub/sub layer (e.g., Redis).
3. **No end-to-end encryption of signaling** — SDP and ICE candidates transit the server in plaintext (DTLS encrypts the data channel, not the signaling).
4. **File transfer cap** — transfers are capped at `MAX_FILE_SIZE_MB` (default 100 MB); very large files are not supported.
5. **Browser WebRTC support** — requires a modern browser; no fallback for older environments.
6. **No e2e browser automation tests** — the `tests/e2e/e2e-test-plan.md` documents the manual/Playwright test plan; automated e2e tests are not yet implemented.
7. **TURN server not bundled** — a TURN server URL must be configured separately for users behind strict NAT/firewalls.

---

## Run / Deploy Instructions

### Development

```bash
npm install
cp .env.example .env.local   # fill in SESSION_SECRET at minimum
npm run dev                  # http://localhost:3000
```

### Production

```bash
npm install
# Set required env vars (SESSION_SECRET is mandatory):
#   SESSION_SECRET=<random 32+ char string>
#   PORT=3000  (optional)
#   MAX_FILE_SIZE_MB=100  (optional)
#   MAX_SESSION_MINUTES=60  (optional)
#   NEXT_PUBLIC_GA_MEASUREMENT_ID=  (optional)
#   NEXT_PUBLIC_ADSENSE_ID=  (optional)
#   NEXT_PUBLIC_TURN_URL/USERNAME/CREDENTIAL=  (optional)

npm run build
npm start
```

The `npm start` command runs the custom `server.ts` (HTTP + WebSocket) which proxies all requests to Next.js. Do **not** use `next start` directly — the WebSocket signaling endpoint requires the custom server.

### Health Check

```
GET /api/health  → 200 { status: "ok", ... }
```

### Docker (example)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", "start"]
```

Expose port `3000` (or `PORT` env value). WebSocket (`/ws`) is served on the same port.
