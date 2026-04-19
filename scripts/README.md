# Scripts

## `deploy-testnet.sh`

One-shot deploy: build Move modules → run Move tests → publish to the Ori rollup
→ run Postgres migrations → write `.initia/submission.json`.

**Prereqs on PATH**: `minitiad`, `initiad`, `pnpm`, `jq`.

**Env vars**:

```bash
export ORI_DEPLOYER_MNEMONIC="24 words …"
export DATABASE_URL="postgresql://user:pass@localhost:5432/ori"
export REDIS_URL="redis://localhost:6379"
# optional overrides
export ORI_CHAIN_ID=ori-1
export ORI_RPC_URL=http://localhost:26657
export ORI_REST_URL=http://localhost:1317
```

Run from repo root:

```bash
bash scripts/deploy-testnet.sh
```

## `claude-desktop-config.sample.json`

Template for Claude Desktop's MCP server config. The block goes into:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Merge (don't replace) the `mcpServers.ori` entry into the existing file, then
restart Claude Desktop. You'll see "ori" in the tool menu with 8 actions:
`send_payment`, `send_tip`, `create_link_gift`, `get_balance`, `get_profile`,
`resolve_init_name`, `propose_wager`, `list_top_creators`.

Don't forget to build the MCP server first:

```bash
pnpm --filter @ori/mcp-server build
```

## Operational runbook

1. **Start appchain**: `weave rollup start` (from wherever you scaffolded with `weave init`).
2. **Start Postgres + Redis**: `docker compose up -d` at repo root.
3. **Deploy contracts + migrate**: `bash scripts/deploy-testnet.sh`.
4. **Start API**: `pnpm --filter @ori/api dev` (picks up `ORI_MODULE_ADDRESS` from `.env`).
5. **Start web**: `pnpm --filter @ori/web dev`.
6. **(Optional) Start MCP**: `pnpm --filter @ori/mcp-server build && node apps/mcp-server/dist/index.js` or hook it into Claude Desktop via the config above.
