# Scaffold patterns (Next.js; port the shape to other stacks)

These are the honesty plumbing every project gets. Generate them; adapt names to the idea. If the framework ships its own docs (Next.js 16+: `node_modules/next/dist/docs/`), they win over these snippets.

`integrationStatus()` below checks configuration, not provider availability or a working demo operation. A `true` health flag is necessary for a claim but insufficient: record a successful domain operation against the current deployment as well. A skipped live test, fixture response or old sandbox run is not that proof. Keep health probes read-only; never make a payment or contact someone just to report health.

## package.json scripts (CI calls these names)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "typecheck": "next typegen && tsc --noEmit",
  "test": "vitest run",
  "test:live": "vitest run --config vitest.live.config.ts",
  "e2e": "playwright test"
}
```

## `src/server/env.ts`: env contract

```ts
type Source = Record<string, string | undefined>;

/** Each integration lists every env key it needs. /api/health reports which are complete. */
export const INTEGRATIONS = {
  // sponsor: ["SPONSOR_MERCHANT_ID", "SPONSOR_KEY_ID", "SPONSOR_SECRET"],
  // db: ["MONGODB_URI"],
} as const satisfies Record<string, readonly string[]>;

export type Integration = keyof typeof INTEGRATIONS;

const present = (v: string | undefined) => typeof v === "string" && v.trim().length > 0;

export class MissingEnvError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Missing environment variables: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
  }
}

/** A feature asks only for its own keys, so one missing key never takes down unrelated routes. */
export function requireEnv<K extends string>(keys: readonly K[], src: Source = process.env): Record<K, string> {
  const missing = keys.filter((k) => !present(src[k]));
  if (missing.length) throw new MissingEnvError(missing);
  return Object.fromEntries(keys.map((k) => [k, src[k]!.trim()])) as Record<K, string>;
}

/** Booleans only, never a value. "Configured on this deployment", proven working by live tests and the probe. */
export function integrationStatus(src: Source = process.env): Record<Integration, boolean> {
  return Object.fromEntries(
    Object.entries(INTEGRATIONS).map(([name, keys]) => [name, keys.every((k) => present(src[k]))]),
  ) as Record<Integration, boolean>;
}
```

`tests/env.test.ts` asserts: `requireEnv` names exactly the missing keys; blank strings count as missing; `integrationStatus` output never contains a secret value (`JSON.stringify(status)` does not include it).

## `src/app/api/health/route.ts`

```ts
import { connection } from "next/server";
import { integrationStatus } from "@/server/env";

export async function GET() {
  await connection(); // evaluate per request, never at build time
  return Response.json(
    { ok: true, at: new Date().toISOString(), integrations: integrationStatus() },
    { headers: { "cache-control": "no-store" } },
  );
}
```

## `src/app/api/stats/route.ts`

```ts
import facts from "../../../../docs/FACTS.json";

/** Public numbers, exactly as the measuring scripts wrote them. Nothing typed by hand. */
export async function GET() {
  return Response.json(facts, { headers: { "access-control-allow-origin": "*", "cache-control": "no-store" } });
}
```

## `src/app/judge/page.tsx`: wired-or-cut itinerary

```tsx
import { connection } from "next/server";
import facts from "../../../docs/FACTS.json";
import { integrationStatus } from "@/server/env";

type Step = { title: string; body: string; href: string };

export default async function Judge() {
  await connection();
  const live = integrationStatus() as Record<string, boolean>;
  const steps: Step[] = [
    { title: "Beat A", body: "What to click and what you will see.", href: "/" },
    // a step exists only when its integration is configured on this deployment
    ...(live.sponsor ? [{ title: "Beat B", body: "The signature moment.", href: "/" }] : []),
    { title: "Check it yourself", body: facts.demo.curlExample, href: "/api/health" },
  ];
  return (
    <main>
      <h1>{facts.projectName}: judge path</h1>
      <ol>{steps.map((s) => <li key={s.title}><a href={s.href}>{s.title}</a> {s.body}</li>)}</ol>
    </main>
  );
}
```

Style it per `docs/design/BRAND.md`; keep it fast and readable on a phone.

## `tests/facts.test.ts`

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import facts from "../docs/FACTS.json";

const metrics = facts.metrics as Record<string, unknown>;
const provenance = facts.provenance as Record<string, string>;

describe("docs/FACTS.json", () => {
  it("every metric records the command that measured it", () => {
    for (const key of Object.keys(metrics)) expect(provenance[key], key).toBeTruthy();
  });
  it("README states each headline metric exactly as FACTS has it", () => {
    const readme = fs.readFileSync("README.md", "utf8");
    for (const key of facts.headline as string[]) expect(readme, key).toContain(String(metrics[key]));
  });
});
```

Write metrics with a script (`scripts/facts.mjs`, `ml/facts.py`) that reads measurement outputs and rewrites FACTS.json, then put that command in `provenance`. Pages import FACTS directly, so they cannot drift.

## Vitest configs

```ts
// vitest.config.ts: unit tests, no network
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ["tests/**/*.test.ts"], exclude: ["tests/**/*.live.test.ts", "tests/e2e/**", "node_modules/**"], environment: "node" },
});
```

```ts
// vitest.live.config.ts: sponsor sandbox calls, reads .env.local
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { include: ["tests/**/*.live.test.ts"], environment: "node", env: loadEnv("test", process.cwd(), ""), testTimeout: 30_000 },
});
```

A live test skips without keys: `describe.skipIf(!integrationStatus().sponsor)("sponsor sandbox", ...)`.

## Mutating route shape

Every mutating route returns one of: `{ ok: true, status: "<VOCAB>" , ... }` when the effect happened, `{ ok: false, reason: "<code>" }` when nothing happened, and `{ ok: false, status: "UNKNOWN", reason }` when the sponsor's answer was ambiguous. The UI shows UNKNOWN as not-success. Validate the body before any side effect; refuse empty or malformed input with no effect.
