'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { PageHeader, Serif } from '@/components/page-header'

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
    text: 'Use my Ori MCP. Check my balance, find a paywalled post about Initia oracles, buy the most interesting one, summarize it, tip the author 0.2 INIT, and open a 60-second prediction that BTC/USD will be higher in a minute. Stake 0.5 INIT.',
  },
  {
    title: 'Pay a friend',
    text: 'Send 0.1 INIT to alice.init with the memo "thanks for the coffee".',
  },
  {
    title: 'Discover paywalled content',
    text: 'Search Initia docs for MiniMove deployment, then list the top 3 creators on Ori by tip volume.',
  },
  {
    title: 'Open a prediction',
    text: 'Open a 60-second prediction that BTC/USD will be higher in 1 minute. Stake 0.25 INIT.',
  },
  {
    title: 'Probe any URL for x402',
    text: 'Use ori.discover_x402 to check if https://api.example.com/premium supports the x402 payment protocol.',
  },
]

export default function AskClaudePage() {
  const [copiedConfig, setCopiedConfig] = useState(false)
  const [copiedPromptIdx, setCopiedPromptIdx] = useState<number | null>(null)

  const copyConfig = async () => {
    await navigator.clipboard.writeText(MCP_CONFIG)
    setCopiedConfig(true)
    setTimeout(() => setCopiedConfig(false), 1500)
  }

  const copyPrompt = async (idx: number) => {
    const p = PROMPTS[idx]
    if (!p) return
    await navigator.clipboard.writeText(p.text)
    setCopiedPromptIdx(idx)
    setTimeout(() => setCopiedPromptIdx(null), 1500)
  }

  return (
    <AppShell title="Ask">
      <div className="px-5 pt-8 pb-10 max-w-xl mx-auto w-full">
        <PageHeader
          kicker="01 · Ask"
          title={
            <>
              Let Claude <Serif>spend</Serif> your INIT.
            </>
          }
          sub="Plug Ori into Claude Desktop as an MCP server. A single prompt can tip creators, buy paywalled content, open predictions, and send gifts — all on-chain."
        />

        {/* Step 1 — config */}
        <section className="mt-8">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
            Step 1 · Connect
          </div>
          <div className="mt-3 rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 h-10 border-b border-[var(--color-line-hairline)]">
              <span className="text-[11px] font-mono text-ink-3">claude_desktop_config.json</span>
              <button
                onClick={copyConfig}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-7 text-[11px] font-medium text-ink-2 border border-[var(--color-border-strong)] hover:text-foreground hover:border-[var(--color-border-emphasis)] hover:bg-white/[0.04] transition"
              >
                {copiedConfig ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedConfig ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-[11px] leading-[1.65] overflow-x-auto p-3.5 font-mono text-ink-2 bg-black/40">
              <code>{MCP_CONFIG}</code>
            </pre>
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3 leading-[1.55]">
            Restart Claude Desktop, then look for <span className="font-mono text-ink-2">ori</span>{' '}
            in the MCP server list. 14 tools will be available.
          </p>
        </section>

        {/* Step 2 — prompts */}
        <section className="mt-10">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
            Step 2 · Try a prompt
          </div>
          <div className="mt-3 space-y-2.5">
            {PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => copyPrompt(idx)}
                className="w-full text-left panel-hover rounded-2xl border border-border bg-white/[0.022] p-4 hover:bg-white/[0.04] transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--color-primary-bright)]">
                      {p.title}
                    </div>
                    <p className="mt-1.5 text-[13.5px] text-foreground leading-[1.5]">{p.text}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-ink-3 group-hover:text-ink-2 transition">
                    {copiedPromptIdx === idx ? (
                      <>
                        <Check className="w-3 h-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* A2A card */}
        <section className="mt-10 rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
            A2A · JSON-RPC
          </div>
          <div className="mt-2 text-[15px] font-medium leading-[1.3]">
            Any agent. <Serif>One endpoint.</Serif>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3 leading-[1.55]">
            Ori also speaks A2A JSON-RPC 2.0 over HTTP. Point any JSON-RPC client at{' '}
            <span className="font-mono text-ink-2">/a2a</span> to use the same 14 tools.
          </p>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-primary-bright)] hover:underline"
          >
            Learn about MCP <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        <p className="mt-12 text-[11.5px] font-mono text-ink-4 text-center">
          Your <span className="text-ink-2">.init</span> is your identity — and your agent's identity.
        </p>
      </div>
    </AppShell>
  )
}
