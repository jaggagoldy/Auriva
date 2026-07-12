import { defineConfig } from "vitest/config";

// TEST-1: the platform's first automated test framework. Plain Vitest (no
// React plugin) — the current test surface is pure domain logic and
// service functions, not component rendering; add @vitejs/plugin-react only
// when a real component test is written (avoids an unused dependency and
// the peer-conflict it drags in with this repo's Next.js 16/React 19 pins).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // TEST-3's new integration tests write real rows to the real SQLite
    // file (see src/test/fixtures.ts) — SQLite is single-writer, so running
    // test files in parallel worker processes risks "database is locked"
    // flakes. The suite is small; sequential is fast enough.
    fileParallelism: false,
  },
});
