# Online Copy Paste

**Move text, code, files, images and links between your phone and computer instantly — no account, no app, no USB.**

> https://onlinecopypaste.net

---

## Quick Start

```bash
npm install
cp .env.example .env.local   # fill in your environment variables
npm run dev                  # starts on http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_SECRET` | Yes | — | Secret key for signing session JWTs |
| `PORT` | No | `3000` | Port for the custom HTTP/WebSocket server |
| `MAX_FILE_SIZE_MB` | No | `100` | Maximum file transfer size in MB |
| `MAX_SESSION_MINUTES` | No | `60` | Maximum session lifetime in minutes |
| `NEXT_PUBLIC_WS_URL` | No | auto | WebSocket server URL (leave blank for same-origin) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | No | — | Google Analytics 4 measurement ID |
| `NEXT_PUBLIC_ADSENSE_ID` | No | — | Google AdSense publisher ID |
| `NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS` | No | — | Set to `true` to show ad placeholders in dev |
| `NEXT_PUBLIC_TURN_URL` | No | — | TURN server URL (e.g. `turn:turn.example.com:3478`) |
| `NEXT_PUBLIC_TURN_USERNAME` | No | — | TURN server username |
| `NEXT_PUBLIC_TURN_CREDENTIAL` | No | — | TURN server credential |

---

## Architecture Overview

```
Browser (PC)                   Server (Node.js)             Browser (Phone)
────────────────               ─────────────────            ───────────────────
1. POST /api/session/create ──▶ creates session, JWT ──────▶ (response)
2. WebSocket join (role=pc) ──▶ register peer
                                                   ◀─────── WebSocket join (role=phone)
3. server relays offer/answer/ICE candidates between the two peers
4. RTCPeerConnection established
5. DataChannel open
────────────────────────────────────────────────────────────────────────────
               ↕  P2P DataChannel (WebRTC, end-to-end encrypted)  ↕
────────────────────────────────────────────────────────────────────────────
```

### Signaling

The custom server (`server.ts`) is a minimal HTTP + WebSocket server:
- HTTP routes are proxied to Next.js
- `/ws` endpoint handles WebSocket signaling
- Session state is stored in-memory (no database)

### P2P Transfer

Once both peers are connected via WebSocket, they exchange SDP offers/answers
and ICE candidates through the server. Once the RTCPeerConnection is
established, all content transfers happen peer-to-peer via a DataChannel:

- **Text / Code** — JSON messages over the DataChannel
- **Files** — binary chunks (64 KB each) with a 20-byte header per chunk

The DataChannel is encrypted by DTLS (provided by WebRTC). The signaling
server only sees SDP and ICE candidate JSON — never the transferred content.

### Connection Modes

| Mode | Description |
|---|---|
| **ONLINE** | Phone and PC connect via the internet-hosted signaling server |
| **LOCAL** | Both devices are on the same LAN; signaling may still go via the server but data is local |
| **OFFLINE** | No connection path — transfer is impossible; a clear message is shown |

---

## Build & Deploy

```bash
npm run build    # Next.js production build (generates PWA service worker)
npm start        # Start production server
```

The custom server (`server.ts`) serves both the Next.js app and the WebSocket
signaling endpoint. It compiles with `ts-node --project tsconfig.server.json`.

---

## Tests

```bash
npm test          # Run vitest once
npm run test:watch  # Watch mode
```

---

## Project Structure

```
src/
  types/          Shared TypeScript interfaces
  lib/
    session/      Session store, utils, types (server-side)
    webrtc/       ICE config, PeerConnection, DataChannel (browser-only)
    *.ts          Shared utilities (content-detection, file-utils, etc.)
  hooks/          React hooks (client-only)
  components/     React components
  app/            Next.js App Router pages and API routes
server.ts         Custom HTTP + WebSocket server
tests/            Vitest unit and integration tests
public/           Static assets, PWA manifest, icons
```

---

## License

MIT
