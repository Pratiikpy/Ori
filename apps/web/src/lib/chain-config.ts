/**
 * Custom chain config for the Ori rollup.
 *
 * The shape of this object matches what InterwovenKit's `customChain` prop expects
 * (verified from initia-docs/hackathon/examples/move-game.mdx lines 437-476).
 */

function requiredPublicEnv(key: string, value: string | undefined): string {
  if (!value) throw new Error(`${key} is required`)
  return value
}

export const ORI_CHAIN_ID = requiredPublicEnv('NEXT_PUBLIC_CHAIN_ID', process.env.NEXT_PUBLIC_CHAIN_ID)
export const ORI_RPC_URL = requiredPublicEnv('NEXT_PUBLIC_RPC_URL', process.env.NEXT_PUBLIC_RPC_URL)
export const ORI_REST_URL = requiredPublicEnv('NEXT_PUBLIC_REST_URL', process.env.NEXT_PUBLIC_REST_URL)
export const ORI_JSON_RPC_URL = requiredPublicEnv('NEXT_PUBLIC_JSON_RPC_URL', process.env.NEXT_PUBLIC_JSON_RPC_URL)
export const ORI_DENOM = requiredPublicEnv('NEXT_PUBLIC_NATIVE_DENOM', process.env.NEXT_PUBLIC_NATIVE_DENOM)
// Rollup native denom is `umin` but the token is bridged INIT from L1. Pitch and
// user-facing copy consistently say INIT, so the display symbol follows.
export const ORI_SYMBOL = requiredPublicEnv('NEXT_PUBLIC_NATIVE_SYMBOL', process.env.NEXT_PUBLIC_NATIVE_SYMBOL)
export const ORI_DECIMALS = Number(requiredPublicEnv('NEXT_PUBLIC_NATIVE_DECIMALS', process.env.NEXT_PUBLIC_NATIVE_DECIMALS))

/** Bech32 address that deployed the Move modules — the @ori named address. */
export const ORI_MODULE_ADDRESS = process.env.NEXT_PUBLIC_ORI_MODULE_ADDRESS ?? ''

/** L1 bridge defaults — for openBridge() calls. */
export const BRIDGE_SRC_CHAIN_ID = requiredPublicEnv('NEXT_PUBLIC_BRIDGE_SRC_CHAIN_ID', process.env.NEXT_PUBLIC_BRIDGE_SRC_CHAIN_ID)
export const BRIDGE_SRC_DENOM = requiredPublicEnv('NEXT_PUBLIC_BRIDGE_SRC_DENOM', process.env.NEXT_PUBLIC_BRIDGE_SRC_DENOM)

/**
 * Initia L1 REST / chain-id. Usernames (`.init`) live on L1, not on the Ori
 * rollup — any module that resolves names MUST query these endpoints.
 */
export const L1_CHAIN_ID = requiredPublicEnv('NEXT_PUBLIC_L1_CHAIN_ID', process.env.NEXT_PUBLIC_L1_CHAIN_ID)
export const L1_REST_URL = requiredPublicEnv('NEXT_PUBLIC_L1_REST_URL', process.env.NEXT_PUBLIC_L1_REST_URL)

/** Portal where users claim a new .init name. */
export const L1_USERNAMES_PORTAL_URL =
  requiredPublicEnv('NEXT_PUBLIC_L1_USERNAMES_PORTAL_URL', process.env.NEXT_PUBLIC_L1_USERNAMES_PORTAL_URL)

export const API_URL = requiredPublicEnv('NEXT_PUBLIC_API_URL', process.env.NEXT_PUBLIC_API_URL)
export const WS_URL = requiredPublicEnv('NEXT_PUBLIC_WS_URL', process.env.NEXT_PUBLIC_WS_URL)
export const APP_URL = requiredPublicEnv('NEXT_PUBLIC_APP_URL', process.env.NEXT_PUBLIC_APP_URL)

/**
 * Canonical gas limits for each Move call class. Over-allocated for safety --
 * actual gas used is refunded by the fee payer. Keeps magic numbers out of
 * call sites so a gas-schedule change becomes a one-line edit here.
 */
export const GAS_LIMITS = {
  /** Single coin transfer, single event emit. payment_router::send, tip_jar::tip. */
  simpleTx: 500_000,
  /** Moderate: gift_packet vault, prediction_pool::create_market, paywall purchase. */
  mediumTx: 600_000,
  /** Heavy: gift vault unlock, multi-coin bulk flows. */
  heavyTx: 700_000,
  /** Bulk send: base + per-recipient budget. */
  bulkBase: 200_000,
  bulkPerRecipient: 80_000,
  bulkMax: 10_000_000,
} as const

/** Canonical polling cadences, in milliseconds. */
export const POLL_INTERVALS = {
  /** Oracle price refresh on Predict page. */
  oraclePrice: 2_000,
  /** Active markets list refresh. */
  activeMarkets: 10_000,
  /** Countdown timer tick. */
  countdown: 1_000,
} as const

export const oriChain = {
  chain_id: ORI_CHAIN_ID,
  chain_name: 'Ori',
  pretty_name: 'Ori Messenger',
  network_type: 'testnet' as const,
  bech32_prefix: 'init',
  logo_URIs: {
    png: 'https://raw.githubusercontent.com/initia-labs/initia-registry/main/testnets/initia/images/initia.png',
    svg: 'https://raw.githubusercontent.com/initia-labs/initia-registry/main/testnets/initia/images/initia.svg',
  },
  apis: {
    rpc: [{ address: ORI_RPC_URL }],
    rest: [{ address: ORI_REST_URL }],
    indexer: [{ address: ORI_REST_URL }],
    'json-rpc': [{ address: ORI_JSON_RPC_URL }],
  },
  fees: {
    fee_tokens: [
      {
        denom: ORI_DENOM,
        fixed_min_gas_price: 0,
        low_gas_price: 0,
        average_gas_price: 0,
        high_gas_price: 0,
      },
    ],
  },
  staking: {
    staking_tokens: [{ denom: ORI_DENOM }],
  },
  native_assets: [
    {
      denom: ORI_DENOM,
      name: 'Ori Native Token',
      symbol: ORI_SYMBOL,
      decimals: ORI_DECIMALS,
    },
  ],
  metadata: {
    is_l1: false,
    minitia: { type: 'minimove' as const },
  },
}
