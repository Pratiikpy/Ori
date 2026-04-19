# Ori — Move Contracts

Six Move modules that power Ori's on-chain behavior. All deploy to the Ori
appchain (`ori-1` on testnet, `interwoven-1` on mainnet L1).

## Modules

| Module | File | Purpose |
|--------|------|---------|
| `ori::profile_registry` | `sources/profile_registry.move` | User bio, avatar, links, E2E encryption pubkey |
| `ori::payment_router` | `sources/payment_router.move` | Single + batch in-chat payments with event receipts |
| `ori::tip_jar` | `sources/tip_jar.move` | Creator tips with 1% platform fee + OBS overlay events |
| `ori::gift_packet` | `sources/gift_packet.move` | Wrapped payments (directed + link-claim) |
| `ori::achievement_sbt` | `sources/achievement_sbt.move` | Soulbound milestone badges (Move `key` ability) |
| `ori::wager_escrow` | `sources/wager_escrow.move` | Friendly wagers with 2-of-3 arbiter resolution |

## Build

```bash
# Replace with your Gas Station hex address (0x-prefixed)
export DEPLOYER_HEX=0x<your_hex>

minitiad move build \
  --language-version=2.1 \
  --named-addresses ori=$DEPLOYER_HEX
```

## Test

```bash
minitiad move test \
  --language-version=2.1 \
  --named-addresses ori=$DEPLOYER_HEX
```

## Deploy

After `weave init` has launched your rollup and your Gas Station is imported
into `minitiad`:

```bash
minitiad move deploy --build \
  --language-version=2.1 \
  --named-addresses ori=$DEPLOYER_HEX \
  --from gas-station \
  --keyring-backend test \
  --chain-id ori-1 \
  --gas auto --gas-adjustment 1.4 --yes
```

## Post-deploy initialization

Several modules require a one-time `init(admin, ...)` call:

```bash
# Initialize tip_jar with treasury address
minitiad tx move execute $DEPLOYER_HEX tip_jar init \
  --args "[\"address:$DEPLOYER_HEX\"]" \
  --from gas-station --chain-id ori-1 --yes

# Initialize gift_packet counter
minitiad tx move execute $DEPLOYER_HEX gift_packet init \
  --args "[]" --from gas-station --chain-id ori-1 --yes

# Initialize achievement_sbt issuer config
minitiad tx move execute $DEPLOYER_HEX achievement_sbt init \
  --args "[]" --from gas-station --chain-id ori-1 --yes

# Initialize wager_escrow registry
minitiad tx move execute $DEPLOYER_HEX wager_escrow init \
  --args "[\"address:$DEPLOYER_HEX\"]" --from gas-station --chain-id ori-1 --yes
```

## Auto-sign grants needed

The frontend's `enableAutoSign` config should grant `MsgExecute` targeting:
- `ori::payment_router::send`
- `ori::payment_router::batch_send`
- `ori::tip_jar::tip`
- `ori::gift_packet::create_directed_gift`
- `ori::gift_packet::create_link_gift`
- `ori::wager_escrow::propose_wager`
- `ori::wager_escrow::accept_wager`

For simplicity, grant the whole MsgType and scope via the Move module address:
```ts
enableAutoSign: { [CHAIN_ID]: ['/initia.move.v1.MsgExecute'] }
```

## Gotchas

1. **`@ori` address** must be supplied at build time via `--named-addresses`.
2. **Redeploy compatibility**: changing struct layouts breaks backward compat.
   Use a fresh deployer account or rename the module on incompatible changes.
3. **u64 overflow**: keep genesis balance at `10^19` (not `10^24`) per Initia
   docs warning for Move.
4. **Gift packet escrow release**: simplified for hackathon. Production should
   use Move's object + module-signer pattern to release from `@ori` escrow.
