/**
 * Form definitions for every ActionCard on the Money / Play / Profile
 * surfaces. Each entry maps to a real handler in `action-handlers.ts`.
 *
 * This is NOT mocked data — it's the static catalog of which contract
 * entry points are exposed in the UI and what fields the user enters.
 * The form values get dispatched through runAction() to the matching
 * Move function.
 */
import type { ActionDef } from '@/components/actions/action-card'

interface TabSection {
  id: string
  label: string
  summary: string
  actions: ActionDef[]
}

const fields = {
  recipient: ['Recipient .init or address', 'Amount', 'Memo'],
  bulk:      ['Recipients CSV', 'Total amount', 'Split rule'],
  content:   ['Title', 'Price', 'Content link or promise'],
  wager:     ['Opponent or market', 'Terms', 'Stake'],
  policy:    ['Agent address', 'Daily cap', 'Allowed methods'],
}

export const moneyTabs: TabSection[] = [
  {
    id: 'payments',
    label: 'Payments',
    summary: 'Send, split, and tip from chat or profile surfaces.',
    actions: [
      { id: 'send-payment', title: 'Send payment', contract: 'payment_router.move', fields: fields.recipient },
      { id: 'bulk-send',    title: 'Bulk send',    contract: 'payment_router.move', fields: fields.bulk },
      { id: 'tip-creator',  title: 'Tip a creator', contract: 'tip_jar.move',       fields: ['Creator .init', 'Amount', 'Public message'] },
    ],
  },
  {
    id: 'gifts',
    label: 'Gifts',
    summary: 'Gift links, directed drops, group claims, and reusable gift boxes.',
    actions: [
      { id: 'create-link-gift',          title: 'Create link-gift',         contract: 'payment_router.move',   fields: ['Amount', 'Expiry', 'Shortcode'] },
      { id: 'create-directed-gift',      title: 'Create directed gift',     contract: 'payment_router.move',   fields: fields.recipient },
      { id: 'create-group-gift',         title: 'Create group gift',        contract: 'payment_router.move',   fields: ['Total amount', 'Claim slots', 'Expiry'] },
      { id: 'claim-link-gift',           title: 'Claim link gift',          contract: '/v1/links/:shortCode/claim', fields: ['Shortcode', 'Claiming address'] },
      { id: 'claim-directed-group-gift', title: 'Claim directed/group gift', contract: 'payment_router.move',   fields: ['Gift ID', 'Proof or invite'] },
      { id: 'reclaim-expired-gifts',     title: 'Reclaim expired gifts',    contract: 'payment_router.move',   fields: ['Gift ID', 'Owner address'] },
      { id: 'register-gift-box',         title: 'Register gift box template', contract: 'gift_box_catalog.move', fields: ['Template name', 'Theme JSON', 'Default amount'] },
    ],
  },
  {
    id: 'streams',
    label: 'Streams',
    summary: 'Open per-second payments, withdraw vested funds, or close streams.',
    actions: [
      { id: 'open-stream',     title: 'Open a stream',          contract: 'payment_stream.move', fields: ['Recipient', 'Rate per second', 'Duration'] },
      { id: 'withdraw-stream', title: 'Withdraw vested portion', contract: 'payment_stream.move', fields: ['Stream ID', 'Withdraw amount'] },
      { id: 'close-stream',    title: 'Close stream',            contract: 'payment_stream.move', fields: ['Stream ID', 'Reason'] },
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    summary: 'Creator plans, subscriber checkout, release cycles, and cancellation.',
    actions: [
      { id: 'register-plan',        title: 'Register subscription plan', contract: 'subscription_vault.move', fields: ['Plan name', 'Period price', 'Billing cadence'] },
      { id: 'subscribe-plan',       title: 'Subscribe',                  contract: 'subscription_vault.move', fields: ['Creator .init', 'Plan ID'] },
      { id: 'release-period',       title: 'Release subscription period', contract: 'subscription_vault.move', fields: ['Plan ID', 'Period'] },
      { id: 'cancel-subscription',  title: 'Cancel subscription',         contract: 'subscription_vault.move', fields: ['Subscription ID', 'Reason'] },
      { id: 'deactivate-plan',      title: 'Deactivate plan',             contract: 'subscription_vault.move', fields: ['Plan ID', 'Final message'] },
    ],
  },
  {
    id: 'paywalls',
    label: 'Paywalls',
    summary: 'Sell content promises and x402 merchant access.',
    actions: [
      { id: 'create-paywall',     title: 'Create paywall',     contract: 'paywall.move',           fields: fields.content },
      { id: 'purchase-paywall',   title: 'Purchase paywall',   contract: 'paywall.move',           fields: ['Paywall ID', 'Buyer note'] },
      { id: 'deactivate-paywall', title: 'Deactivate paywall', contract: 'paywall.move',           fields: ['Paywall ID', 'Reason'] },
      { id: 'register-merchant',  title: 'Register as merchant', contract: 'merchant_registry.move', fields: ['Merchant name', 'Settlement address', 'x402 callback URL'] },
    ],
  },
  {
    id: 'sponsor',
    label: 'Sponsor',
    summary: 'Gas sponsorship, seed bonus, and sponsored username registration.',
    actions: [
      { id: 'sponsor-status',      title: 'Check sponsor status',     contract: '/v1/sponsor/status',   fields: ['Wallet address'] },
      { id: 'claim-seed',          title: 'Claim seed payment',       contract: '/v1/sponsor/seed',     fields: ['New wallet address'] },
      { id: 'sponsored-username',  title: 'Sponsored .init registration', contract: '/v1/sponsor/username', fields: ['Desired .init', 'Bio'] },
    ],
  },
]

export const playTabs: TabSection[] = [
  {
    id: 'wagers',
    label: 'Wagers',
    summary: 'Escrowed 1v1, PvP, and oracle-resolved predictions.',
    actions: [
      'Propose wager',
      'Propose PvP wager',
      'Accept wager',
      'Resolve wager',
      'Concede wager',
      'Cancel pending wager',
      'Refund expired wager',
      'Propose oracle-resolved wager',
      'Resolve from oracle',
    ].map((title) => ({
      id: title.toLowerCase().replaceAll(' ', '-'),
      title,
      contract: 'wager_escrow.move',
      fields: fields.wager,
    })),
  },
  {
    id: 'markets',
    label: 'Prediction markets',
    summary: 'YES/NO pools, Slinky feeds, creator resolution, and winnings claims.',
    actions: [
      { id: 'create-market',   title: 'Create prediction market', contract: 'prediction_pool.move', fields: ['Question', 'Deadline', 'Resolution source'] },
      { id: 'stake-yes',       title: 'Stake YES',                contract: 'prediction_pool.move', fields: ['Market ID', 'Amount'] },
      { id: 'stake-no',        title: 'Stake NO',                 contract: 'prediction_pool.move', fields: ['Market ID', 'Amount'] },
      { id: 'resolve-market',  title: 'Resolve market',           contract: 'prediction_pool.move', fields: ['Market ID', 'Outcome'] },
      { id: 'claim-winnings',  title: 'Claim winnings',           contract: 'prediction_pool.move', fields: ['Market ID', 'Claim address'] },
      { id: 'predict-price',   title: 'AI price prediction',      contract: 'ori.predict',          fields: ['Pair', 'Horizon', 'Thesis'] },
    ],
  },
  {
    id: 'lucky',
    label: 'Lucky pools',
    summary: 'Entry-fee pools with fixed participant counts and winner draws.',
    actions: [
      { id: 'create-lucky-pool', title: 'Create lucky pool', contract: 'lucky_pool.move', fields: ['Entry fee', 'Participants', 'Draw time'] },
      { id: 'join-pool',         title: 'Join pool',         contract: 'lucky_pool.move', fields: ['Pool ID', 'Entry wallet'] },
      { id: 'draw-winner',       title: 'Draw winner',       contract: 'lucky_pool.move', fields: ['Pool ID', 'Randomness proof'] },
    ],
  },
]

export const profileTabs: TabSection[] = [
  {
    id: 'identity',
    label: 'Profile / Identity',
    summary: 'Profile registry, follows, links, and slug.',
    actions: [
      'Create profile',
      'Update bio/avatar/links',
      'Set slug',
      'Set encryption pubkey',
      'Update privacy settings',
      'Follow user',
      'Unfollow user',
    ].map((title) => ({
      id: title.toLowerCase().replaceAll('/', '-').replaceAll(' ', '-'),
      title,
      contract: 'profile_registry.move',
      fields: ['Target / value', 'JSON or note'],
    })),
  },
  {
    id: 'reputation',
    label: 'Reputation',
    summary: 'Public votes and signed claims.',
    actions: ['Thumbs up', 'Thumbs down', 'Retract vote', 'Attest signed claim'].map((title) => ({
      id: title.toLowerCase().replaceAll(' ', '-'),
      title,
      contract: 'reputation.move',
      fields: ['Target .init', 'Claim or vote reason'],
    })),
  },
  {
    id: 'agent-policy',
    label: 'Agent policy',
    summary: 'On-chain limits for the agent that runs on your machine.',
    actions: [
      { id: 'set-agent-policy',    title: 'Set agent spending policy', contract: 'agent_policy.move', fields: fields.policy },
      { id: 'revoke-agent',        title: 'Revoke agent',              contract: 'agent_policy.move', fields: ['Agent address', 'Reason'] },
      { id: 'agent-kill-switch',   title: 'Kill switch',                contract: 'agent_policy.move', fields: ['Confirm phrase'] },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    summary: 'Notifications, push, and well-known agent card.',
    actions: [
      { id: 'push-subscribe', title: 'Register PWA push',  contract: '/v1/push/subscribe',          fields: ['Device label', 'Notification scope'] },
      { id: 'push-delete',    title: 'Delete PWA push',    contract: 'DELETE /v1/push/subscribe',   fields: ['Device ID'] },
      { id: 'agent-card',     title: 'View A2A agent card', contract: '/.well-known/agent.json',     fields: ['Agent domain'] },
    ],
  },
]

/** MCP tool list — these names are real (apps/mcp-server/src). */
export const mcpTools: string[] = [
  'ori.send_payment',
  'ori.send_tip',
  'ori.create_link_gift',
  'ori.get_balance',
  'ori.get_profile',
  'ori.resolve_init_name',
  'ori.propose_wager',
  'ori.list_top_creators',
  'ori.purchase_paywall',
  'ori.search_initia_docs',
  'ori.fetch_initia_doc',
  'ori.schedule_action',
  'ori.predict',
]
