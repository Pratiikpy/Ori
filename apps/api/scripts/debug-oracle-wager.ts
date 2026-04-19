#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * One-shot debug for the oracle-wager seed failure.
 * Loads Alice's seed mnemonic and tries to propose_oracle_wager with verbose
 * raw-log output so we can see the Move abort code or VM error.
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { MnemonicKey, Wallet, MsgExecute, RESTClient, bcs } from '@initia/initia.js'

const CHAIN_ID = process.env.ORI_CHAIN_ID ?? 'ori-1'
const REST_URL = process.env.ORI_REST_URL ?? 'http://localhost:1317'
const MODULE = (process.env.ORI_MODULE_ADDRESS ?? '').toLowerCase()
const DENOM = process.env.ORI_DENOM ?? 'umin'

const rest = new RESTClient(REST_URL, {
  chainId: CHAIN_ID,
  gasPrices: `0.015${DENOM}`,
  gasAdjustment: '1.6',
})

const wallets = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), '.ori-seed-wallets.json'), 'utf8'),
) as Record<string, string>

async function main(): Promise<void> {
  const aliceKey = new MnemonicKey({ mnemonic: wallets.Alice, coinType: 60 })
  const alice = new Wallet(rest, aliceKey)
  const frankKey = new MnemonicKey({ mnemonic: wallets.Frank, coinType: 60 })
  const frankAddr = frankKey.accAddress

  const stakeUmin = '1000000'
  const deadlineSecs = String(24 * 60 * 60) // DURATION, not timestamp — 1 day
  const targetPrice = '10000000000000000000000' // 1e22

  const msg = new MsgExecute(
    aliceKey.accAddress,
    MODULE,
    'wager_escrow',
    'propose_oracle_wager',
    [],
    [
      bcs.address().serialize(frankAddr).toBase64(),
      bcs.string().serialize(DENOM).toBase64(),
      bcs.u64().serialize(stakeUmin).toBase64(),
      bcs.string().serialize('BTC >= 100k').toBase64(),
      bcs.string().serialize('price').toBase64(),
      bcs.u64().serialize(deadlineSecs.toString()).toBase64(),
      bcs.string().serialize('BITCOIN/USD').toBase64(),
      bcs.u256().serialize(targetPrice).toBase64(),
      bcs.bool().serialize(true).toBase64(),
    ],
  )

  console.log('module:', MODULE)
  console.log('alice: ', aliceKey.accAddress)
  console.log('frank: ', frankAddr)
  console.log('args (base64, 9 total):')
  ;((msg as unknown) as { args: string[] }).args?.forEach?.((a, i) => console.log(`  ${i}:`, a))

  try {
    const tx = await alice.createAndSignTx({ msgs: [msg], memo: 'oracle-debug' })
    const res = await rest.tx.broadcast(tx)
    console.log('\nRESULT code=', res.code)
    console.log('txhash=', res.txhash)
    console.log('raw_log=', res.raw_log)
  } catch (err) {
    console.error('\nraw err:', err)
    const e = err as Record<string, unknown>
    for (const k of Object.keys(e)) {
      let v = (e as Record<string, unknown>)[k]
      try {
        if (typeof v === 'object' && v !== null) v = JSON.stringify(v).slice(0, 800)
      } catch {
        // ignore stringify issues
      }
      console.error(`  err.${k} =`, v)
    }
  }
}

main().catch(console.error)
