'use client'

/**
 * /ask — show the user how to plug Ori into Claude Desktop as an MCP server.
 *
 * Two halves: the JSON config block (with Copy button) and a list of
 * starter prompts (each with Copy). No backend calls; pure educational.
 * That's why this page works without auth — judges can land here straight
 * from the landing CTA and grok the agent story.
 */
import * as React from 'react'
import { AppShell } from '@/components/layout/app-shell'
import {
  Button,
  Eyebrow,
  GlassCard,
  Icon,
  PageHeader,
} from '@/components/ui'

const MCP_CONFIG = `{
  "mcpServers": {
    "ori": {
      "command": "node",
      "args": ["/path/to/ori/apps/mcp-server/dist/index.js"],
      "env": {
        "ORI_MODULE_ADDRESS": "0x05dd0c60873d4d93658d5144fd0615bcfa43a53a",
        "ORI_CHAIN_ID": "ori-1",
        "ORI_RPC_URL": "http://localhost:26657",
        "ORI_REST_URL": "http://localhost:1317",
        "ORI_MCP_MNEMONIC": "your twelve word mnemonic here"
      }
    }
  }
}`

const PROMPTS = [
  {
    title: 'The killer one-prompt demo',
    body: 'Use my Ori MCP. Check my balance, find a paywalled post about Initia oracles, buy the most interesting one, summarize it, tip the author 0.2 INIT, and open a 60-second prediction that BTC/USD will be higher in a minute. Stake 0.5 INIT.',
  },
  {
    title: 'Pay a friend',
    body: 'Send 0.1 INIT to alice.init with the memo "thanks for the coffee".',
  },
  {
    title: 'Open a prediction',
    body: 'Open a 60-second prediction that BTC/USD will be higher in 1 minute. Stake 0.25 INIT.',
  },
  {
    title: 'Probe any URL for x402',
    body: 'Use ori.discover_x402 to check if https://api.example.com/premium supports the x402 payment protocol.',
  },
] as const

export default function AskPage() {
  const [copiedConfig, setCopiedConfig] = React.useState(false)
  const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null)

  const copyConfig = async () => {
    await navigator.clipboard.writeText(MCP_CONFIG)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 1500)
  }
  const copyPrompt = async (idx: number) => {
    const p = PROMPTS[idx]
    if (!p) return
    await navigator.clipboard.writeText(p.body)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 1500)
  }

  return (
    <AppShell>
      <PageHeader
        title="Ask Claude"
        description="Plug Ori into Claude Desktop and a single prompt can tip, predict, and pay across your wallet — all on-chain, all under your daily cap."
      />

      {/* STEP 1 — config */}
      <div className="mt-10">
        <Eyebrow>Step 1 · Connect</Eyebrow>
        <GlassCard padding="none" className="mt-3 overflow-hidden">
          <div className="flex items-center justify-between px-5 h-12 border-b border-black/5">
            <span className="text-[12.5px] font-mono text-ink-3">
              claude_desktop_config.json
            </span>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={copiedConfig ? 'check' : 'copy'}
              onClick={copyConfig}
            >
              {copiedConfig ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <pre className="text-[12.5px] leading-[1.7] overflow-x-auto p-5 font-mono text-ink-2 bg-white/40">
            <code>{MCP_CONFIG}</code>
          </pre>
        </GlassCard>
        <p className="mt-3 text-[13px] text-ink-3 leading-[1.55]">
          Restart Claude Desktop and look for{' '}
          <span className="font-mono text-ink-2">ori</span> in the MCP servers
          list. Fourteen tools become available.
        </p>
      </div>

      {/* STEP 2 — prompts */}
      <div className="mt-10">
        <Eyebrow>Step 2 · Try a prompt</Eyebrow>
        <div className="mt-3 grid gap-3">
          {PROMPTS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => copyPrompt(idx)}
              className="text-left glass-card p-5 hover:-translate-y-[1px] transition-transform group"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <Eyebrow>{p.title}</Eyebrow>
                  <p className="mt-2 text-[14px] text-ink leading-[1.55]">
                    {p.body}
                  </p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 text-[12px] text-ink-3 group-hover:text-ink transition pt-1">
                  {copiedIdx === idx ? (
                    <>
                      <Icon name="check" size={12} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Icon name="copy" size={12} />
                      Copy
                    </>
                  )}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* A2A */}
      <div className="mt-10">
        <Eyebrow>Or call by HTTP — A2A JSON-RPC</Eyebrow>
        <GlassCard padding="lg" className="mt-3">
          <p className="text-[14px] text-ink-2 leading-[1.55]">
            Ori speaks A2A JSON-RPC 2.0 over HTTP for agents outside the MCP
            ecosystem. Point any JSON-RPC client at{' '}
            <span className="font-mono text-ink">/a2a</span> to use the same
            fourteen tools. Discover capabilities at{' '}
            <span className="font-mono text-ink">/.well-known/agent.json</span>.
          </p>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#007AFF] hover:underline"
          >
            Learn about MCP <Icon name="external" size={12} />
          </a>
        </GlassCard>
      </div>

      <p className="mt-12 text-[12px] font-mono text-ink-4">
        Your <span className="text-ink-2">.init</span> is your identity — and your agent's identity.
      </p>
    </AppShell>
  )
}
