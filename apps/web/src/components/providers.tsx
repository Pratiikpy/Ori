'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { defineChain } from 'viem'
import {
  InterwovenKitProvider,
  TESTNET,
  initiaPrivyWalletConnector,
} from '@initia/interwovenkit-react'
import { Toaster } from 'sonner'

import { ORI_CHAIN_ID, ORI_RPC_URL, oriChain } from '@/lib/chain-config'
import { SessionBoot } from './session-boot'

// InterwovenKit's stylesheet is imported in apps/web/src/app/globals.css
// via `@import '...styles.css' layer(interwovenkit)`. The layer wrap is
// what keeps its unlayered `:where(*)` resets from beating our Tailwind
// utilities; see globals.css for the cascade-order rationale.

// Wagmi requires at least one chain. InterwovenKit handles all actual ops;
// this is a placeholder chain to satisfy wagmi config.
const dummyChain = defineChain({
  id: 999_001,
  name: 'Ori Rollup',
  nativeCurrency: { name: 'Initia', symbol: 'INIT', decimals: 6 },
  rpcUrls: { default: { http: [ORI_RPC_URL] } },
})

// Initia's bundled Privy connector — adds email / Google / X social login
// to the wagmi connector list. The Connect drawer surfaces it as "Socials"
// alongside any installed browser wallets. Source of truth:
// initia-docs/interwovenkit/references/social-login/initia-privy-wallet-connector.mdx
const wagmiConfig = createConfig({
  chains: [dummyChain],
  connectors: [initiaPrivyWalletConnector],
  transports: { [dummyChain.id]: http(ORI_RPC_URL) },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  // Register PWA service worker for offline / installability.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // silent — PWA offline is a nice-to-have, not critical
      })
    }
  }, [])

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InterwovenKitProvider
          {...TESTNET}
          defaultChainId={ORI_CHAIN_ID}
          customChain={oriChain}
          enableAutoSign={{
            [ORI_CHAIN_ID]: ['/initia.move.v1.MsgExecute'],
          }}
        >
          <SessionBoot />
          {children}
          <Toaster
            position="top-center"
            theme="light"
            richColors
            toastOptions={{
              style: {
                borderRadius: '0',
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.16)',
                color: '#0A0A0A',
                boxShadow: '4px 4px 0 rgba(0, 34, 255, 0.22)',
              },
            }}
          />
        </InterwovenKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
