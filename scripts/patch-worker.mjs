/**
 * scripts/patch-worker.mjs
 *
 * Idempotent post-build patch: injects /ws routing and Durable Object export
 * into the OpenNext-generated .open-next/worker.js.
 *
 * Safe to run multiple times — detects already-patched files.
 *
 * Run after: opennextjs-cloudflare build && esbuild DO bundle
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const workerPath = resolve('.open-next', 'worker.js');
const original = readFileSync(workerPath, 'utf8');

// Idempotency guard — skip if already patched
if (original.includes('SignalingRoom') || original.includes('_openNextHandler')) {
  console.log('ℹ️  worker.js already patched — skipping');
  process.exit(0);
}

// --- 1. Add SignalingRoom DO export at top ---
const doExport = `// Re-export the SignalingRoom Durable Object class so Wrangler registers it.
// @ts-expect-error: resolved by wrangler build
export { SignalingRoom } from "./signaling-room.js";
`;

// --- 2. Extract the inner fetch body from original export default ---
// We need to replace:
//   export default { async fetch(request, env, ctx) { ... } }
// with our routing wrapper that delegates to the original inner logic.

const defaultStart = original.indexOf('export default {');
if (defaultStart === -1) {
  console.error('ERROR: Could not find "export default {" in worker.js');
  process.exit(1);
}

// Everything before "export default {"
const preDefault = original.slice(0, defaultStart);

// Extract the body of the original async fetch() — find "return runWithCloudflareRequestContext"
// and wrap it in _openNextHandler, then add our routing wrapper as the real export default.
const originalDefault = original.slice(defaultStart);

// Replace "export default {" with "_openNextHandler = {"
// and then add our real "export default" that does /ws routing.
const innerHandler = originalDefault
  .replace('export default {', 'const _openNextHandler = {');

const routingWrapper = `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route /ws WebSocket upgrades and /do/* internal API calls to SignalingRoom DO
    if (url.pathname === '/ws' || url.pathname.startsWith('/do/')) {
      const doId = env.SIGNALING_ROOM.idFromName('global');
      const stub = env.SIGNALING_ROOM.get(doId);
      return stub.fetch(request);
    }

    // All other requests → OpenNext / Next.js
    return _openNextHandler.fetch(request, env, ctx);
  },
};
`;

const patched = doExport + preDefault + innerHandler + routingWrapper;

writeFileSync(workerPath, patched, 'utf8');
console.log('✓ Patched .open-next/worker.js with /ws routing and SignalingRoom DO export');
