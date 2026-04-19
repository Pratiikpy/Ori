# Contributing to Ori

Thanks for the interest. Ori is the agent wallet for Initia; we want it to feel like a consumer app that happens to be on-chain. The bar for merging is "would Alice notice and care?" — performance regressions, visual jank, and broken flows land hard, even if the code looks clean.

## Repo layout (quick map)

```
apps/
  web/         Next.js 16 PWA — the app Alice touches
  api/         Fastify 5 + Prisma — reads chain events, serves activity/leaderboards
  mcp-server/  stdio MCP + A2A JSON-RPC — the agent surface
packages/
  contracts/   17 Move modules, deployed on ori-1 rollup
  sdk/         Client helpers shared across apps
  shared-types/ TS types emitted for both apps
docs/
  RUNBOOK.md            zero-to-running in 15 min
  DEMO_SCRIPT.md        75-second shot list
  COMPETITOR_TEARDOWN.md rolling analysis of adjacent Initia projects
scripts/
  wsl-*.sh     WSL helpers (rollup, tests, deploys)
```

## Before you push

1. **Typecheck all workspaces.** `pnpm --filter @ori/web typecheck && pnpm --filter @ori/api typecheck && pnpm --filter @ori/mcp-server build`
2. **Move changes:** `minitiad move build` must succeed. If you touched existing struct layouts, say so in the PR — `upgrade_policy = "compatible"` protects additive changes but blocks destructive ones.
3. **Frontend:** `pnpm --filter @ori/web build`. Routes must prerender where static.
4. **Smoke:** `bash scripts/wsl-smoke-test.sh` — read-only queries against a live rollup; passes green if the stack is intact.
5. **Graph:** `bash scripts/update-graph.sh` after non-trivial code changes. Keeps the knowledge graph at `docs/architecture-graph/` current (zero token cost).

## PR conventions

- One concern per PR. If you touched Move + API + web in one change, split.
- Explain the *why* more than the *what*. The diff shows the what.
- Include before/after screenshots for any visible UI change.
- Prefix branches: `feat/`, `fix/`, `chore/`, `docs/`.

## Code style

- **TypeScript strict.** No `any`. If you're reaching for one, there's usually a narrower type.
- **No new external services** without a fallback. If Redis is down, the API should still serve read-only requests.
- **Errors at boundaries only.** Internal code can trust its inputs; validate at HTTP/tx boundaries.
- **Comments when the *why* isn't obvious.** Don't narrate the code.
- **Tailwind over custom CSS.** Exception: `globals.css` for focus-visible, safe-area, scrollbar.

## Security posture

- Never log secrets or raw mnemonics.
- Every tx-signing path must go through `sendTx` (web) or `broadcastMoveCall` (MCP). They centralize gas/fee logic and error mapping.
- If you introduce an external API call, add a timeout and a Redis cache when sensible.

## Questions

Open an issue with the `question` label. Bigger architectural stuff gets an RFC in `docs/rfcs/` first.
