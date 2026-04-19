/* eslint-disable no-console */
import 'dotenv/config'
import { MnemonicKey, Wallet, MsgExecute, RESTClient, bcs } from '@initia/initia.js'
import fs from 'node:fs'
import path from 'node:path'

const CHAIN_ID = 'initiation-2'
const REST_URL = 'https://rest.testnet.initia.xyz'
const MODULE = '0x1fe25fb6118e219739d8d37c964447d1ef0bebbc'

const WALLETS = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), '.ori-e2e-wallets.json'), 'utf8'),
) as { alice: string; bob: string; carol: string }

const rest = new RESTClient(REST_URL, { chainId: CHAIN_ID, gasPrices: '0.015uinit', gasAdjustment: '1.6' })

async function main(): Promise<void> {
  const bobKey = new MnemonicKey({ mnemonic: WALLETS.bob, coinType: 60 })
  const bob = new Wallet(rest, bobKey)
  const aliceKey = new MnemonicKey({ mnemonic: WALLETS.alice, coinType: 60 })

  console.log('Bob bech32:', bobKey.accAddress)
  console.log('Alice bech32:', aliceKey.accAddress)

  const msg = new MsgExecute(
    bobKey.accAddress,
    MODULE,
    'follow_graph',
    'follow',
    [],
    [bcs.address().serialize(aliceKey.accAddress).toBase64()],
  )

  try {
    console.log('signing...')
    const tx = await bob.createAndSignTx({ msgs: [msg], memo: 'debug' })
    console.log('broadcasting...')
    const res = await rest.tx.broadcast(tx)
    console.log('RESULT:', JSON.stringify(res, null, 2).slice(0, 1000))
  } catch (e) {
    const err = e as Error & { response?: { data?: unknown; status?: number } }
    console.error('CAUGHT:', err.message)
    if (err.response) {
      console.error('STATUS:', err.response.status)
      console.error('BODY:', JSON.stringify(err.response.data, null, 2).slice(0, 1500))
    }
  }
}

main()
