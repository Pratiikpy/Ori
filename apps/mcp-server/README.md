# @ori/mcp-server

Model Context Protocol server exposing Ori actions to Claude Desktop,
Claude Code, Cursor, and any other MCP-speaking LLM client.

## Tools

| Tool | Description |
|------|-------------|
| `ori.send_payment` | In-chat payment via `payment_router::send` |
| `ori.send_tip` | Creator tip via `tip_jar::tip` (1% fee) |
| `ori.create_link_gift` | Create a shareable gift link |
| `ori.get_balance` | Get ORI balance of an address or `.init` name |
| `ori.get_profile` | Fetch on-chain profile |
| `ori.resolve_init_name` | Resolve `.init` → bech32 via L1 usernames |
| `ori.propose_wager` | Propose a friendly wager |
| `ori.list_top_creators` | Discover creators by tip volume |

## Setup

```bash
pnpm install
pnpm --filter @ori/mcp-server build
```

Set environment variables:

```bash
export ORI_MCP_MNEMONIC="..."          # required for signing tools
export ORI_CHAIN_ID=ori-1
export ORI_RPC_URL=http://localhost:26657
export ORI_REST_URL=http://localhost:1317
export ORI_MODULE_ADDRESS=0x...        # from deploy output
export L1_REST_URL=https://rest.testnet.initia.xyz
export L1_CHAIN_ID=initiation-2
export ORI_API_URL=https://api.ori.chat
```

## Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ori": {
      "command": "node",
      "args": ["/absolute/path/to/ori/apps/mcp-server/dist/index.js"],
      "env": {
        "ORI_MCP_MNEMONIC": "...",
        "ORI_MODULE_ADDRESS": "0x..."
      }
    }
  }
}
```

Restart Claude Desktop. You'll see "ori" in the tool menu.

## Example prompts

> "Tip alice.init 5 ORI for her new song — leave a message saying 'loved it'"

> "Who are the top 5 creators on Ori right now?"

> "Create a 10 ORI gift link I can share on Twitter"

> "What's my ORI balance?"

## Security

`ORI_MCP_MNEMONIC` holds a wallet with spending authority. Only use a fresh
wallet with limited funds; rotate regularly. The server runs on stdio —
it never listens on a network port and only speaks to the local MCP client.
