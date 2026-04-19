#!/usr/bin/env tsx
import { RESTClient, bcs } from '@initia/initia.js'

const MODULE = '0x05dd0c60873d4d93658d5144fd0615bcfa43a53a'
const rest = new RESTClient('http://localhost:1317', { chainId: 'ori-1' })

async function view(fn: string, args: string[] = []): Promise<unknown> {
  try {
    const r = await rest.move.view(MODULE, 'paywall', fn, [], args)
    return (r as { data?: unknown }).data
  } catch (e) {
    return `ERR: ${e instanceof Error ? e.message.slice(0, 140) : String(e)}`
  }
}

async function main(): Promise<void> {
  const total = await view('total_paywalls')
  console.log('total_paywalls =', total)

  for (let id = 0; id <= 6; id++) {
    const pw = await view('get_paywall', [bcs.u64().serialize(id.toString()).toBase64()])
    console.log(`paywall[${id}] =`, typeof pw === 'string' ? pw.slice(0, 160) : JSON.stringify(pw).slice(0, 160))
  }
}
main().catch(console.error)
