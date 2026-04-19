'use client'

import { useState } from 'react'
import { Bot, Copy, Check, ExternalLink } from 'lucide-react'
import { AppShell } from '@/components/app-shell'

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
    <AppShell title="Ask Claude">
      <div className="px-5 py-6 max-w-xl mx-auto w-full space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Let Claude spend your INIT</h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Ori is the agent wallet for Initia. Plug it into Claude Desktop as an MCP server
            and a single prompt can tip creators, buy paywalled content, open predictions,
            and send gifts — all on-chain. Solo-first. Works without friends on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Step 1 · Connect Claude to Ori
          </h2>
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between px-3 h-10 border-b border-border">
              <span className="text-xs font-mono text-muted-foreground">claude_desktop_config.json</span>
              <button
                onClick={copyConfig}
                className="inline-flex items-center gap-1.5 rounded-md px-2 h-7 text-xs font-medium bg-background hover:bg-border transition"
              >
                {copiedConfig ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedConfig ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-[11px] leading-relaxed overflow-x-auto p-3 font-mono">
              <code>{MCP_CONFIG}</code>
            </pre>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Restart Claude Desktop, then look for <span className="font-mono">ori</span> in
            the MCP server list. 11 tools will be available. A2A server also starts on{' '}
            <span className="font-mono">ORI_A2A_PORT</span> if set.
          </p>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Step 2 · Try a prompt
          </h2>
          <div className="space-y-2">
            {PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => copyPrompt(idx)}
                className="w-full text-left rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted/60 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-primary mb-1">{p.title}</div>
                    <p className="text-sm text-foreground leading-snug">{p.text}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground">
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

        <section className="rounded-xl border border-border bg-muted/20 p-4">
          <h2 className="text-sm font-semibold mb-2">Agent-to-agent (A2A) too</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Ori also speaks A2A JSON-RPC 2.0 over HTTP for agents outside the MCP ecosystem.
            Point any JSON-RPC client at <span className="font-mono">http://localhost:$ORI_A2A_PORT/a2a</span>{' '}
            to use the same 11 tools.
          </p>
          <a
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Learn about MCP <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        <footer className="text-xs text-muted-foreground text-center pt-4 pb-6">
          Your <span className="font-mono">.init</span> is your identity and your agent's identity.
        </footer>
      </div>
    </AppShell>
  )
}
