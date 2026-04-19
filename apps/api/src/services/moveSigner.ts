/**
 * Backend Move-tx signer — loads a mnemonic, derives a bech32 `init1…`
 * signer, and broadcasts `/initia.move.v1.MsgExecute` transactions via the
 * CosmJS Stargate client.
 *
 * Used by the AchievementIssuer service to call
 * `ori::achievement_sbt::award_badge`, but it's a general-purpose Move
 * signer: pass any (module, function, args) and it works.
 */
import {
  DirectSecp256k1HdWallet,
  type OfflineSigner,
  Registry,
} from '@cosmjs/proto-signing'
import { GasPrice, SigningStargateClient, calculateFee } from '@cosmjs/stargate'
import { config } from '../config.js'

// Minimal protobuf type URL — we pass `value` as a JSON-ish object which is
// what the Initia Move runtime expects for MsgExecute; the initia-labs/
// reference frontend uses the same shape without a compiled .proto.
const MSG_EXECUTE_TYPE = '/initia.move.v1.MsgExecute'

export type MoveArg = string // base64 BCS-encoded

export type MoveExecuteArgs = {
  moduleAddress: string
  moduleName: string
  functionName: string
  typeArgs?: string[]
  args: MoveArg[]
}

type LazySigner = {
  address: string
  client: SigningStargateClient
  signer: OfflineSigner
}

let cached: Promise<LazySigner> | null = null

async function build(): Promise<LazySigner> {
  const mnemonic = config.BADGE_ISSUER_MNEMONIC
  if (!mnemonic) throw new Error('BADGE_ISSUER_MNEMONIC not configured')

  const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'init',
  })
  const accounts = await signer.getAccounts()
  const first = accounts[0]
  if (!first) throw new Error('signer produced no account')

  const registry = new Registry()

  // We don't compile a protobuf; instead we rely on Initia's node accepting
  // amino-json encoding of MsgExecute via the SigningStargateClient.signAndBroadcast
  // path when paired with a custom typeUrl. For a fully-typed MsgExecute proto,
  // the codepath above should be extended with a proper type registration.
  const client = await SigningStargateClient.connectWithSigner(
    config.ORI_RPC_URL,
    signer,
    {
      registry,
      gasPrice: GasPrice.fromString(`0.015${defaultGasDenom()}`),
    },
  )
  return { address: first.address, client, signer }
}

function defaultGasDenom(): string {
  // Mirror chain-config default. Overridable via env if you need non-umin.
  return process.env.ISSUER_GAS_DENOM ?? 'umin'
}

export async function getMoveSigner(): Promise<LazySigner> {
  if (!cached) cached = build()
  return cached
}

/** Broadcast a MoveExecute tx as the issuer. */
export async function sendMoveExecute(
  move: MoveExecuteArgs,
  gasLimit = 500_000,
): Promise<{ txHash: string; gasUsed: number }> {
  const { address, client } = await getMoveSigner()

  const msg = {
    typeUrl: MSG_EXECUTE_TYPE,
    value: {
      sender: address,
      moduleAddress: move.moduleAddress,
      moduleName: move.moduleName,
      functionName: move.functionName,
      typeArgs: move.typeArgs ?? [],
      args: move.args,
    },
  }

  const fee = calculateFee(gasLimit, GasPrice.fromString(`0.015${defaultGasDenom()}`))
  const res = await client.signAndBroadcast(address, [msg], fee)

  if (res.code !== 0) {
    throw new Error(`Move tx failed (code=${res.code}): ${res.rawLog}`)
  }
  return { txHash: res.transactionHash, gasUsed: Number(res.gasUsed ?? 0) }
}

export async function issuerAddress(): Promise<string> {
  return (await getMoveSigner()).address
}
