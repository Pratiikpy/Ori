import { describe, expect, it } from 'vitest'
import { parseBlockResults } from './decoder.js'
import type { BlockResultsResponse } from './types.js'

const MODULE = '0x05dd0c60873d4d93658d5144fd0615bcfa43a53a'

/**
 * Build a synthetic block-results response with one Move event.
 * Mimics what CometBFT /block_results returns.
 */
function blockWith(events: Array<{ typeTag: string; data: unknown }>): BlockResultsResponse {
  return {
    result: {
      txs_results: [
        {
          code: 0,
          events: events.map((e) => ({
            type: 'move',
            attributes: [
              { key: 'type_tag', value: e.typeTag },
              { key: 'data', value: JSON.stringify(e.data) },
            ],
          })),
        },
      ],
    },
  }
}

describe('parseBlockResults', () => {
  it('decodes a tip event with bech32-normalized addresses', () => {
    const body = blockWith([
      {
        typeTag: `${MODULE}::tip_jar::TipSent`,
        data: {
          tipper: '0x0000000000000000000000001d0e5b27bb56f7b2a0dfff4e3bdcc7f3ce7ca4a5',
          creator: 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2',
          gross_amount: '5000',
          net_amount: '4950',
          fee_amount: '50',
          denom: 'umin',
          message: 'thanks for the stream',
        },
      },
    ])

    const events = parseBlockResults(body, 42n)
    expect(events).toHaveLength(1)
    const ev = events[0]
    expect(ev.kind).toBe('tip')
    if (ev.kind !== 'tip') throw new Error('unreachable')
    expect(ev.height).toBe(42n)
    expect(ev.txIndex).toBe(0)
    expect(ev.tipper.startsWith('init1')).toBe(true)
    expect(ev.creator).toBe('init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2')
    expect(ev.grossAmount).toBe(5000n)
    expect(ev.netAmount).toBe(4950n)
    expect(ev.feeAmount).toBe(50n)
    expect(ev.denom).toBe('umin')
    expect(ev.message).toBe('thanks for the stream')
  })

  it('decodes a payment with chat_id', () => {
    const body = blockWith([
      {
        typeTag: `${MODULE}::payment_router::PaymentSent`,
        data: {
          from: 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2',
          to: 'init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu',
          amount: '250000',
          denom: 'umin',
          memo: 'lunch split',
          chat_id: 'chat-abc',
        },
      },
    ])

    const events = parseBlockResults(body, 101n)
    expect(events[0].kind).toBe('payment')
    if (events[0].kind !== 'payment') throw new Error('unreachable')
    expect(events[0].amount).toBe(250000n)
    expect(events[0].memo).toBe('lunch split')
    expect(events[0].chatId).toBe('chat-abc')
  })

  it('skips failed txs (code !== 0)', () => {
    const body: BlockResultsResponse = {
      result: {
        txs_results: [
          {
            code: 5,
            events: [
              {
                type: 'move',
                attributes: [
                  { key: 'type_tag', value: `${MODULE}::tip_jar::TipSent` },
                  {
                    key: 'data',
                    value: JSON.stringify({
                      tipper: 'init1aaa',
                      creator: 'init1bbb',
                      gross_amount: '1',
                      net_amount: '1',
                      fee_amount: '0',
                      denom: 'umin',
                      message: '',
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
    }
    expect(parseBlockResults(body, 1n)).toHaveLength(0)
  })

  it('handles follow / unfollow events', () => {
    const body = blockWith([
      {
        typeTag: `${MODULE}::follow_graph::Followed`,
        data: {
          from: 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2',
          to: 'init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu',
        },
      },
      {
        typeTag: `${MODULE}::follow_graph::Unfollowed`,
        data: {
          from: 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2',
          to: 'init1lv5zyrw6uzp6wf7alucej54sypemlgmjmdmgwu',
        },
      },
    ])

    const events = parseBlockResults(body, 5n)
    expect(events.map((e) => e.kind)).toEqual(['followed', 'unfollowed'])
  })

  it('returns [] on malformed data (no attrs)', () => {
    const body: BlockResultsResponse = {
      result: {
        txs_results: [{ code: 0, events: [{ type: 'move', attributes: [] }] }],
      },
    }
    expect(parseBlockResults(body, 1n)).toHaveLength(0)
  })

  it('ignores non-Move events', () => {
    const body: BlockResultsResponse = {
      result: {
        txs_results: [
          {
            code: 0,
            events: [{ type: 'cosmos.bank.v1beta1.EventSend', attributes: [] }],
          },
        ],
      },
    }
    expect(parseBlockResults(body, 1n)).toHaveLength(0)
  })

  it('includes finalize_block_events with txIndex=-1', () => {
    const body: BlockResultsResponse = {
      result: {
        finalize_block_events: [
          {
            type: 'move',
            attributes: [
              { key: 'type_tag', value: `${MODULE}::achievement_sbt::BadgeAwarded` },
              {
                key: 'data',
                value: JSON.stringify({
                  recipient: 'init1qhwsccy884xexevd29z06ps4hnay8ff6szgkt2',
                  badge_type: 1,
                  level: 1,
                  metadata_uri: 'ipfs://Qm...',
                }),
              },
            ],
          },
        ],
      },
    }
    const events = parseBlockResults(body, 7n)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('badge')
    expect(events[0].txIndex).toBe(-1)
  })
})
