import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'

/**
 * A2A agent-card discovery endpoint.
 *
 * Spec: https://a2a.dev (draft). Agents hitting an unknown URL look for
 * `/.well-known/agent.json` to learn what the server can do. This is how
 * InitPage and other A2A-native services advertise themselves.
 *
 * The card lists the tools Ori exposes over both MCP (stdio) and A2A
 * (JSON-RPC 2.0), plus the on-chain primitives any AI can exercise.
 * Served with `Cache-Control: public, max-age=60` so agents don't hammer
 * it but can pick up new tools within a minute of deploy.
 */
export async function wellKnownRoutes(app: FastifyInstance): Promise<void> {
  app.get('/.well-known/agent.json', async (_req, reply) => {
    const publicBase = config.PUBLIC_API_URL ?? `http://localhost:${config.PORT}`

    await reply
      .header('Cache-Control', 'public, max-age=60, s-maxage=60')
      .header('Access-Control-Allow-Origin', '*')
      .send({
        schemaVersion: '0.1.0',
        name: 'Ori',
        description:
          "The agent wallet for Initia. Let Claude (or any MCP/A2A agent) tip creators, buy paywalled content, open oracle-resolved prediction markets, and send gift links -- all on-chain, 100ms settlement.",
        url: publicBase,
        provider: {
          organization: 'Ori',
          url: 'https://ori.chat',
        },
        version: '0.3.0',
        documentationUrl: 'https://github.com/ori-agent-wallet/ori',
        capabilities: {
          streaming: true,
          pushNotifications: true,
          stateTransitionHistory: true,
          inputModes: ['application/json', 'text/plain'],
          outputModes: ['application/json', 'text/plain'],
        },
        authentication: {
          schemes: ['none', 'bearer'],
          credentials: {
            bearer: {
              description:
                'Bearer token for authenticated actions. Obtain via POST /v1/auth/verify-challenge (EIP-191 signature flow).',
            },
          },
        },
        endpoints: {
          a2a: {
            url: `${publicBase}/a2a`,
            method: 'POST',
            description: 'JSON-RPC 2.0 over HTTP. Envelope: { jsonrpc, id, method, params }.',
          },
          mcp: {
            url: 'stdio',
            description:
              'MCP stdio transport. See scripts/claude-desktop-config.sample.json for Claude Desktop setup.',
          },
        },
        defaultInputModes: ['application/json'],
        defaultOutputModes: ['application/json'],
        skills: [
          {
            id: 'ori.send_payment',
            name: 'Send INIT payment',
            description: 'Transfer INIT to any Initia address or .init name.',
            tags: ['payment', 'chain'],
          },
          {
            id: 'ori.send_tip',
            name: 'Tip a creator',
            description: 'Send a tip with optional message via tip_jar. 1% platform fee.',
            tags: ['creator-economy', 'payment'],
          },
          {
            id: 'ori.create_link_gift',
            name: 'Create a gift link',
            description:
              'Escrow INIT under a secret, returning a shareable URL. Recipient onboards and claims.',
            tags: ['gift', 'viral'],
          },
          {
            id: 'ori.get_balance',
            name: 'Get balance',
            description: 'Look up INIT balance for any address or .init name.',
            tags: ['read-only'],
          },
          {
            id: 'ori.get_profile',
            name: 'Get profile',
            description: 'Fetch on-chain profile: bio, avatar, links, privacy flags.',
            tags: ['read-only'],
          },
          {
            id: 'ori.resolve_init_name',
            name: 'Resolve .init name',
            description: 'Resolve a .init handle to its bech32 address via L1 usernames.',
            tags: ['read-only', 'identity'],
          },
          {
            id: 'ori.propose_wager',
            name: 'Propose a friendly wager',
            description: 'Two-party escrow with 3rd-party arbiter or PvP mode. 1% fee on payout.',
            tags: ['wager', 'payment'],
          },
          {
            id: 'ori.list_top_creators',
            name: 'Top creators leaderboard',
            description: 'Ranked by tip volume received in the last window.',
            tags: ['read-only', 'discovery'],
          },
          {
            id: 'ori.purchase_paywall',
            name: 'Buy paywalled content',
            description:
              'Execute paywall::purchase for a numeric paywall id and receive the resource via x402.',
            tags: ['x402', 'commerce'],
          },
          {
            id: 'ori.search_initia_docs',
            name: 'Search Initia docs',
            description:
              'Search the canonical llms.txt index at https://docs.initia.xyz/llms.txt.',
            tags: ['read-only', 'docs'],
          },
          {
            id: 'ori.fetch_initia_doc',
            name: 'Fetch Initia doc body',
            description: 'Fetch full markdown body of a specific Initia docs page by URL.',
            tags: ['read-only', 'docs'],
          },
          {
            id: 'ori.discover_x402',
            name: 'Probe any URL for x402',
            description:
              'HEAD-request any HTTPS URL to detect HTTP 402 Payment Required with X-Payment-* headers.',
            tags: ['discovery', 'x402'],
          },
          {
            id: 'ori.predict',
            name: 'Open a prediction market',
            description:
              'Parimutuel binary prediction pool on any Connect oracle pair (BTC/ETH/SOL/BNB/ATOM/...). Zero liquidity requirement -- winners split losers pool. Resolves via `initia_std::oracle::get_price`.',
            tags: ['predict', 'oracle', 'parimutuel'],
          },
        ],
        onChain: {
          chainId: config.CHAIN_ID,
          moduleAddress: config.ORI_MODULE_ADDRESS,
          settlement: 'MiniMove rollup settling to initiation-2 via OPinit',
          nativeSymbol: 'INIT',
        },
      })
  })
}
