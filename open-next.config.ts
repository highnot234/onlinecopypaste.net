// open-next.config.ts
// Configures @opennextjs/cloudflare 1.14.7 for Next.js 14 App Router.
// No R2 incremental cache — dummy adapters are fine for this app's
// static/dynamic mix. Add r2IncrementalCache later if ISR is needed.

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
