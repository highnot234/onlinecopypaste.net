# Hydration & PWA Investigation Report

## Summary

**ISSUE 1 — Hydration mismatch root cause:**  
`next-pwa` 5.6.0 is incompatible with Next.js 14 App Router. Its webpack plugin injects a service-worker registration script (`register.js`) into the legacy Pages Router entry point `main.js`. This pulls the Pages Router's `head-manager.js` into the App Router client bundle. On page load the head-manager runs, finds no Pages Router `<Head>` title component, and calls `document.title = ""`, which mutates the DOM `<title>` element to empty **before React's hydration completes**. React then sees a mismatch: the server-rendered HTML has `<title>Online Copy Paste — Transfer Files, Text & Code Between Devices</title>` but the live DOM text node is now `""`. This fires React hydration error #418.

**ISSUE 2 — PWA disabled message:**  
The `[PWA] PWA support is disabled` log is **expected and harmless in development mode only**. The `next.config.js` correctly sets `disable: process.env.NODE_ENV === 'development'`. In production, PWA support is fully active — `sw.js` and `workbox-*.js` are already generated in `public/`. However, the underlying `next-pwa` 5.6.0 package is incompatible with Next.js 14 App Router and must be replaced.

---

## Evidence

### Issue 1: Hydration Mismatch

#### Step-by-step mechanism

1. **`next.config.js` wraps config with `withPWA` from `next-pwa` 5.6.0:**
   ```js
   // next.config.js line 3
   const withPWA = require('next-pwa')({ ... });
   module.exports = withPWA(nextConfig);
   ```

2. **`next-pwa/index.js` injects `register.js` into the Pages Router `main.js` webpack entry:**
   ```js
   // node_modules/next-pwa/index.js
   if (entries['main.js'] && !entries['main.js'].includes(registerJs)) {
     entries['main.js'].unshift(registerJs)
   }
   ```
   This entry point (`main.js`) is Next.js's legacy Pages Router bootstrap, not the App Router bootstrap.

3. **Including `main.js` pulls in Pages Router client infrastructure**, including `head-manager.js`, into the App Router client bundle. This is confirmed by inspecting `.next/static/chunks/app/layout.js` which contains `head-manager.js` code with the sourcemap path `(app-pages-browser)/./node_modules/next/dist/client/head-manager.js`.

4. **`head-manager.js` runs on client load and sets `document.title = ""`:**
   ```js
   // From built layout.js, decoded from the bundle:
   const titleComponent = tags.title ? tags.title[0] : null;
   let title = "";
   if (titleComponent) { ... } // No Pages Router <Head> exists → stays ""
   if (title !== document.title) document.title = title; // Sets title to ""!
   ```
   Since the project uses App Router metadata (not Pages Router `<Head>`), `titleComponent` is always `null`, so `title` remains `""` and `document.title` gets set to `""`.

5. **React hydration fires error #418:**  
   The server sent `<title>Online Copy Paste — Transfer Files, Text & Code Between Devices</title>`. By the time React reconciles the `<title>` text node, `document.title` has been cleared to `""` by `head-manager.js`, causing the mismatch:
   - Server: `"Online Copy Paste — Transfer Files, Text & Code Between Devices"`
   - Client: `""`

#### Confirmation: title string is NOT in client bundles

Searching `.next/static/chunks/app/page.js` and `.next/static/chunks/app/layout.js` for the string `"Online Copy Paste"` returns **zero matches**. The title string exists only in the server bundle (`.next/server/app/page.js`). The client gets it via the RSC payload inline `<script>`, which React uses for hydration. But `head-manager.js` clears `document.title` before React can reconcile.

#### What was ruled out

The following were **not** the cause:

- `typeof window !== 'undefined'` branches during render — `useConnectionStatus.ts:33` uses this guard, but only inside a `useCallback` called from `useEffect`, not during render. `ConnectionStatus` initial state `'online'` is stable.
- `sessionStorage` reads during render — `useSession.ts` loads from `sessionStorage` inside `useEffect` only (lines 94–105), not in the initial render.
- `navigator.onLine` during render — `useConnectionStatus` reads `navigator.onLine` inside a `useCallback` called from `useEffect`, not during render.
- `Math.random()`, `Date.now()`, `crypto.randomUUID()` — none used during initial render. `Footer.tsx` calls `new Date().getFullYear()` in the render body (line: `const year = new Date().getFullYear()`), but this is deterministic across server/client for the same year and is a separate, minor issue (not the cause of this specific error).
- `dynamic(... { ssr: false })` for `SessionCreator` — correctly excluded from SSR; its loading skeleton is static HTML, no mismatch.
- `Header` client component — renders stable HTML on both server and client. `ConnectionStatus` starts with `mode: 'online'`, consistent across SSR/hydration.

#### Secondary concern: Footer year

`src/components/layout/Footer.tsx` calls `new Date().getFullYear()` during render (not in `useEffect`). This is technically a time-dependent value. While it won't mismatch within the same calendar year, it is a minor best-practice violation — it should use `suppressHydrationWarning` or be moved to a client component initialized in `useEffect`. It is **not** the cause of the current error.

---

### Issue 2: PWA Disabled

#### `[PWA] PWA support is disabled` message

This log comes from `next-pwa/index.js`:
```js
if (disable) {
  options.isServer && console.log('> [PWA] PWA support is disabled')
  return config
}
```

In `next.config.js`:
```js
disable: process.env.NODE_ENV === 'development',
```

This correctly disables PWA in development (where hot reload and service workers conflict). The message appears only in dev mode during the webpack build. **In production, PWA is enabled.**

#### PWA production status

Evidence that PWA is active in production:
- `public/sw.js` — generated service worker (Workbox-based, verified in investigation)
- `public/workbox-49653183.js` — Workbox runtime
- `public/manifest.json` — complete web app manifest with name, icons, display, theme_color
- `public/icons/icon-192.png` and `public/icons/icon-512.png` — PWA icons exist
- `src/app/layout.tsx` — `manifest: '/manifest.json'` in metadata config
- `next.config.js` — `register: true`, `skipWaiting: true`, `dest: 'public'`

#### PWA architecture concerns (next-pwa 5.6.0 vs App Router)

`next-pwa` 5.6.0 is designed for Next.js 12 Pages Router. It works in production (service worker is generated) but its webpack injection causes the hydration bug described above. It also:

1. Injects service worker registration via Pages Router's `main.js` entry — wrong path for App Router. The service worker still registers (because the code does run), but the side effect is Pages Router head infrastructure contaminating the App Router bundle.
2. The `start-url` cache entry uses `new Response('', { status: 200 })` initially, which would serve an empty body if the SW is intercepting before the real response is cached. This is a pre-caching issue in `next-pwa` 5.x, not a manifest problem.
3. Runtime caching config in `next.config.js` uses `NetworkFirst` for all HTTPS URLs — this will cache all pages/assets including POST responses if they match the pattern. This is acceptable but aggressive.

---

## Files Requiring Changes

| File | Change Needed |
|------|---------------|
| `package.json` | Remove `next-pwa`, add `@ducanh2912/next-pwa` (Next.js 14 App Router compatible) |
| `next.config.js` | Update import from `next-pwa` to `@ducanh2912/next-pwa`; update config options to match new API |
| `src/components/layout/Footer.tsx` | Move `new Date().getFullYear()` to a client component with `useEffect` or use `suppressHydrationWarning` on the year element (minor improvement) |

---

## Exact Fixes Required

### Fix 1: Replace `next-pwa` with `@ducanh2912/next-pwa` (primary — resolves hydration)

`@ducanh2912/next-pwa` is the actively maintained fork of `next-pwa` that is compatible with Next.js 13+ App Router. It injects the service worker registration script into the App Router's entry (`main-app.js`) rather than the Pages Router's `main.js`, eliminating the head-manager contamination.

**Step 1 — Update `package.json`:**
```json
// Remove:
"next-pwa": "5.6.0"

// Add:
"@ducanh2912/next-pwa": "^10.0.0"
```

**Step 2 — Update `next.config.js`:**
```js
// Before:
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [...],
  buildExcludes: [/middleware-manifest\.json$/],
});

// After:
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/api\//,
        handler: 'NetworkOnly',
      },
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'ocp-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
    buildExcludes: [/middleware-manifest\.json$/],
  },
});
```

Note: `@ducanh2912/next-pwa` uses `.default` export and wraps `runtimeCaching` inside `workboxOptions`.

### Fix 2: Footer year (minor — prevents potential future issues)

`src/components/layout/Footer.tsx` — the `year` variable:
```tsx
// Current (render-time Date call):
const year = new Date().getFullYear();

// Option A: Add suppressHydrationWarning to just the year span
<p>© <span suppressHydrationWarning>{year}</span> OnlineCopyPaste.net — All rights reserved.</p>

// Option B: Extract to a small 'use client' component
```

This is not the cause of the current error but should be addressed.

---

## Conclusions

1. **Root cause of hydration mismatch**: `next-pwa` 5.6.0 injects Pages Router `head-manager.js` into the App Router client bundle via its `main.js` webpack entry injection. The head-manager runs at client load, finds no Pages Router `<Head>` title, and sets `document.title = ""`, which the React hydration reconciliation detects as a mismatch against the server-rendered `<title>` text.

2. **Fix**: Replace `next-pwa` 5.6.0 with `@ducanh2912/next-pwa` which supports Next.js 14 App Router natively. This eliminates the Pages Router entry injection and resolves the hydration error without any changes to the homepage components.

3. **PWA**: Already functional in production. The `[PWA] PWA support is disabled` log is a dev-mode-only message, not a production issue. However, after replacing the package the service worker, manifest, icons, and caching strategy all remain valid and will continue working.

4. **No changes needed** to: `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/ConnectionStatus.tsx`, `src/hooks/useConnectionStatus.ts`, `src/hooks/useSession.ts`, or `src/hooks/useWebRTC.ts`. These are all correctly implemented.
