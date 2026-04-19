'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { defineChain } from 'viem'
import {
  InterwovenKitProvider,
  TESTNET,
  initiaPrivyWalletConnector,
  injectStyles,
} from '@initia/interwovenkit-react'
import '@initia/interwovenkit-react/styles.css'
import InterwovenKitStyles from '@initia/interwovenkit-react/styles.js'
import { Toaster } from 'sonner'

import { ORI_CHAIN_ID, ORI_RPC_URL, oriChain } from '@/lib/chain-config'

// Inject InterwovenKit drawer/modal styles once on client.
if (typeof document !== 'undefined') {
  injectStyles(InterwovenKitStyles)
}

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
          {children}
          <Toaster position="top-center" theme="dark" richColors />
        </InterwovenKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
