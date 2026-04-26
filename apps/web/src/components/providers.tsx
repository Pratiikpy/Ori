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
import InterwovenKitStyles from '@initia/interwovenkit-react/styles.js'
import { Toaster } from 'sonner'

import { ORI_CHAIN_ID, ORI_RPC_URL, oriChain } from '@/lib/chain-config'
import { SessionBoot } from './session-boot'

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

  // Inject InterwovenKit's CSS into the Shadow DOM the drawer renders into.
  // The drawer uses a shadow root for style isolation, so a normal CSS import
  // in our light DOM cannot reach it. The package exports its CSS as a JS
  // string for exactly this case; injectStyles() attaches it via
  // adoptedStyleSheets. Without this call the connect-wallet drawer renders
  // as an unstyled flat strip of buttons. See README §Configure Providers
  // and initia-docs/interwovenkit/integrations/native.mdx.
  useEffect(() => {
    injectStyles(InterwovenKitStyles)
  }, [])

  // Register PWA service worker for offline / installability.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // silent — PWA offline is a nice-to-have, not critical
      })
    }
  }, [])

  // Provider order matches the README: QueryClientProvider must wrap
  // WagmiProvider because wagmi v2's connection-state hooks query through
  // TanStack Query under the hood. InterwovenKitProvider sits inside both
  // because it consumes wagmi's wallet client and TanStack Query.
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
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
      </WagmiProvider>
    </QueryClientProvider>
  )
}
