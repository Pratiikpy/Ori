/// Prediction Pool -- parimutuel binary markets resolved by Connect oracle.
///
/// No counterparty required at stake time: every YES stake pools together,
/// every NO stake pools together. At the resolve_deadline, anyone can trigger
/// resolve() which reads `initia_std::oracle::get_price(pair)` and sets the
/// outcome. Winners claim a proportional share of the losers' pool plus
/// their own stake back. 1% fee on the losing pool goes to the treasury.
///
/// Edge case: if nobody is on the losing side, winners just get their stake
/// back minus a 1% fee. This prevents the module from being used as a free
/// custody service with no settlement risk.
///
/// Why parimutuel and not PvP:
///   - PvP (wager_escrow::propose_oracle_wager) needs a known accepter up front.
///     For "will BTC go up in 60 seconds?" that's unworkable -- we'd need a
///     matchmaking layer, and for short-lived bets the UX is broken.
///   - Parimutuel is used by real-world racing tracks for the same reason:
///     the pool pays itself out; no bookmaker, no liquidity, no counterparty.
///
/// Scope: short-duration binary markets (30s minimum) on any Connect pair
/// (BTC/USD, ETH/USD, INIT/USD, etc. -- 66+ pairs available on initiation-2
/// as of 2026-04-18, inherited by ori-1 via OPinit).
module ori::prediction_pool {
    use std::signer;
    use std::string::String;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::oracle;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_MARKET_NOT_FOUND: u64 = 2;
    const E_MARKET_ALREADY_RESOLVED: u64 = 3;
    const E_DEADLINE_NOT_PASSED: u64 = 4;
    const E_ZERO_STAKE: u64 = 5;
    const E_INVALID_PAIR: u64 = 6;
    const E_DEADLINE_TOO_SHORT: u64 = 7;
    const E_ALREADY_CLAIMED: u64 = 8;
    const E_NOT_RESOLVED: u64 = 9;
    const E_NO_STAKE: u64 = 10;
    const E_STAKING_CLOSED: u64 = 11;

    // ===== Constants =====
    const MIN_DEADLINE_SECONDS: u64 = 30;
    const MAX_DEADLINE_SECONDS: u64 = 30 * 24 * 60 * 60; // 30 days
    const PLATFORM_FEE_BPS: u64 = 100; // 1%
    const BPS_DENOMINATOR: u64 = 10_000;
    const MAX_PAIR_LEN: u64 = 64;

    // ===== Storage =====

    struct MarketStore has key {
        next_id: u64,
        markets: Table<u64, Market>,
        user_stakes: Table<address, UserStakes>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
        treasury: address,
        admin: address,
        total_markets: u64,
        total_volume: u64,
    }

    struct Market has store, copy, drop {
        id: u64,
        creator: address,
        oracle_pair: String,            // e.g. "BTC/USD"
        target_price: u256,             // raw oracle integer (already scaled by pair decimals)
        /// true  = proposer-YES wins if resolved price >= target
        /// false = proposer-YES wins if resolved price <  target
        comparator: bool,
        resolve_deadline: u64,          // unix seconds
        total_yes: u64,
        total_no: u64,
        denom: String,
        resolved: bool,
        outcome_yes: bool,
        resolved_price: u256,
        created_at: u64,
        /// true once the per-market losing-pool fee has been sent to treasury
        /// so it is not paid twice across multi-claim sessions.
        fee_sent: bool,
    }

    /// Per-user stakes keyed by market_id. Inner table initialized lazily on
    /// first stake per user.
    struct UserStakes has store {
        by_market: Table<u64, SidedStake>,
    }

    struct SidedStake has store, copy, drop {
        yes: u64,
        no: u64,
    }

    // ===== Events =====

    #[event]
    struct MarketCreated has drop, store {
        id: u64,
        creator: address,
        oracle_pair: String,
        target_price: u256,
        comparator: bool,
        resolve_deadline: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct StakePlaced has drop, store {
        market_id: u64,
        user: address,
        side_yes: bool,
        amount: u64,
        new_total_yes: u64,
        new_total_no: u64,
        timestamp: u64,
    }

    #[event]
    struct MarketResolved has drop, store {
        market_id: u64,
        outcome_yes: bool,
        resolved_price: u256,
        total_yes: u64,
        total_no: u64,
        timestamp: u64,
    }

    #[event]
    struct WinningsClaimed has drop, store {
        market_id: u64,
        user: address,
        stake: u64,
        payout: u64,
        fee_to_treasury_this_claim: u64,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_prediction_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        let deployer_addr = signer::address_of(deployer);

        move_to(deployer, MarketStore {
            next_id: 1,
            markets: table::new(),
            user_stakes: table::new(),
            vault_extend_ref,
            vault_addr,
            treasury: deployer_addr,
            admin: deployer_addr,
            total_markets: 0,
            total_volume: 0,
        });
    }

    // ===== Entry: create_market =====

    public entry fun create_market(
        creator: &signer,
        oracle_pair: String,
        target_price: u256,
        comparator: bool,
        deadline_seconds: u64,
        denom: String,
    ) acquires MarketStore {
        assert!(exists<MarketStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let pair_len = std::string::length(&oracle_pair);
        assert!(pair_len > 0 && pair_len <= MAX_PAIR_LEN, error::invalid_argument(E_INVALID_PAIR));
        assert!(
            deadline_seconds >= MIN_DEADLINE_SECONDS && deadline_seconds <= MAX_DEADLINE_SECONDS,
            error::invalid_argument(E_DEADLINE_TOO_SHORT),
        );

        let store = borrow_global_mut<MarketStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;
        store.total_markets = store.total_markets + 1;

        let (_, timestamp) = block::get_block_info();
        let deadline = timestamp + deadline_seconds;

        table::add(&mut store.markets, id, Market {
            id,
            creator: signer::address_of(creator),
            oracle_pair,
            target_price,
            comparator,
            resolve_deadline: deadline,
            total_yes: 0,
            total_no: 0,
            denom,
            resolved: false,
            outcome_yes: false,
            resolved_price: 0,
            created_at: timestamp,
            fee_sent: false,
        });

        event::emit(MarketCreated {
            id,
            creator: signer::address_of(creator),
            oracle_pair,
            target_price,
            comparator,
            resolve_deadline: deadline,
            denom,
            timestamp,
        });
    }

    // ===== Entry: stake =====

    public entry fun stake(
        user: &signer,
        market_id: u64,
        side_yes: bool,
        amount: u64,
    ) acquires MarketStore {
        assert!(amount > 0, error::invalid_argument(E_ZERO_STAKE));
        let store = borrow_global_mut<MarketStore>(@ori);
        assert!(table::contains(&store.markets, market_id), error::not_found(E_MARKET_NOT_FOUND));

        let user_addr = signer::address_of(user);
        let (vault_addr, denom, resolve_deadline) = {
            let market = table::borrow(&store.markets, market_id);
            assert!(!market.resolved, error::invalid_state(E_MARKET_ALREADY_RESOLVED));
            let (_, now) = block::get_block_info();
            assert!(now < market.resolve_deadline, error::invalid_state(E_STAKING_CLOSED));
            (store.vault_addr, market.denom, market.resolve_deadline)
        };
        let _ = resolve_deadline; // silence unused

        // Transfer stake into vault.
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(user, vault_addr, metadata, amount);

        // Update market totals.
        let market_mut = table::borrow_mut(&mut store.markets, market_id);
        if (side_yes) {
            market_mut.total_yes = market_mut.total_yes + amount;
        } else {
            market_mut.total_no = market_mut.total_no + amount;
        };
        let new_yes = market_mut.total_yes;
        let new_no = market_mut.total_no;

        store.total_volume = store.total_volume + amount;

        // Upsert the user's stake entry for this market.
        if (!table::contains(&store.user_stakes, user_addr)) {
            table::add(&mut store.user_stakes, user_addr, UserStakes {
                by_market: table::new<u64, SidedStake>(),
            });
        };
        let user_stakes = table::borrow_mut(&mut store.user_stakes, user_addr);
        if (!table::contains(&user_stakes.by_market, market_id)) {
            table::add(&mut user_stakes.by_market, market_id, SidedStake { yes: 0, no: 0 });
        };
        let sided = table::borrow_mut(&mut user_stakes.by_market, market_id);
        if (side_yes) {
            sided.yes = sided.yes + amount;
        } else {
            sided.no = sided.no + amount;
        };

        let (_, timestamp) = block::get_block_info();
        event::emit(StakePlaced {
            market_id,
            user: user_addr,
            side_yes,
            amount,
            new_total_yes: new_yes,
            new_total_no: new_no,
            timestamp,
        });
    }

    // ===== Entry: resolve =====

    /// Permissionless after deadline. Reads price from Connect oracle and sets
    /// the outcome on-chain. Does not distribute funds -- winners claim via
    /// `claim_winnings`.
    public entry fun resolve(_caller: &signer, market_id: u64) acquires MarketStore {
        let store = borrow_global_mut<MarketStore>(@ori);
        assert!(table::contains(&store.markets, market_id), error::not_found(E_MARKET_NOT_FOUND));

        let (pair, target, comparator) = {
            let m = table::borrow(&store.markets, market_id);
            assert!(!m.resolved, error::invalid_state(E_MARKET_ALREADY_RESOLVED));
            let (_, now) = block::get_block_info();
            assert!(now >= m.resolve_deadline, error::invalid_state(E_DEADLINE_NOT_PASSED));
            (m.oracle_pair, m.target_price, m.comparator)
        };

        let (price, _oracle_ts, _decimals) = oracle::get_price(pair);
        let outcome_yes = if (comparator) { price >= target } else { price < target };

        let market = table::borrow_mut(&mut store.markets, market_id);
        market.resolved = true;
        market.outcome_yes = outcome_yes;
        market.resolved_price = price;

        let (_, timestamp) = block::get_block_info();
        event::emit(MarketResolved {
            market_id,
            outcome_yes,
            resolved_price: price,
            total_yes: market.total_yes,
            total_no: market.total_no,
            timestamp,
        });
    }

    // ===== Entry: claim_winnings =====

    public entry fun claim_winnings(user: &signer, market_id: u64) acquires MarketStore {
        let store = borrow_global_mut<MarketStore>(@ori);
        assert!(table::contains(&store.markets, market_id), error::not_found(E_MARKET_NOT_FOUND));
        let user_addr = signer::address_of(user);

        // Phase 1: read market state we need, verify resolved.
        let (outcome_yes, total_yes, total_no, denom, fee_already_sent) = {
            let m = table::borrow(&store.markets, market_id);
            assert!(m.resolved, error::invalid_state(E_NOT_RESOLVED));
            (m.outcome_yes, m.total_yes, m.total_no, m.denom, m.fee_sent)
        };

        // Phase 2: look up and zero out user's winning stake (idempotency guard).
        assert!(table::contains(&store.user_stakes, user_addr), error::invalid_argument(E_NO_STAKE));
        let winning_stake = {
            let user_stakes = table::borrow_mut(&mut store.user_stakes, user_addr);
            assert!(
                table::contains(&user_stakes.by_market, market_id),
                error::invalid_argument(E_NO_STAKE),
            );
            let sided = table::borrow_mut(&mut user_stakes.by_market, market_id);
            let ws = if (outcome_yes) { sided.yes } else { sided.no };
            assert!(ws > 0, error::invalid_argument(E_NO_STAKE));
            // Zero out BEFORE any transfer. Second call sees 0 and aborts.
            if (outcome_yes) {
                sided.yes = 0;
            } else {
                sided.no = 0;
            };
            ws
        };

        // Phase 3: compute payout.
        let (payout, fee_to_treasury_this_claim, mark_fee_sent) =
            compute_payout(
                winning_stake,
                total_yes,
                total_no,
                outcome_yes,
                fee_already_sent,
            );

        // Phase 4: transfers.
        let metadata = coin::denom_to_metadata(denom);
        let treasury = store.treasury;
        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        coin::transfer(&vault_signer, user_addr, metadata, payout);
        if (fee_to_treasury_this_claim > 0) {
            coin::transfer(&vault_signer, treasury, metadata, fee_to_treasury_this_claim);
        };

        // Phase 5: mark fee_sent if the losing-pool fee was just paid.
        if (mark_fee_sent) {
            let market = table::borrow_mut(&mut store.markets, market_id);
            market.fee_sent = true;
        };

        let (_, timestamp) = block::get_block_info();
        event::emit(WinningsClaimed {
            market_id,
            user: user_addr,
            stake: winning_stake,
            payout,
            fee_to_treasury_this_claim,
            timestamp,
        });
    }

    // ===== View functions =====

    #[view]
    public fun get_market(market_id: u64): Market acquires MarketStore {
        let store = borrow_global<MarketStore>(@ori);
        assert!(table::contains(&store.markets, market_id), error::not_found(E_MARKET_NOT_FOUND));
        *table::borrow(&store.markets, market_id)
    }

    #[view]
    public fun get_user_stake(user: address, market_id: u64): (u64, u64) acquires MarketStore {
        let store = borrow_global<MarketStore>(@ori);
        if (!table::contains(&store.user_stakes, user)) return (0, 0);
        let us = table::borrow(&store.user_stakes, user);
        if (!table::contains(&us.by_market, market_id)) return (0, 0);
        let s = table::borrow(&us.by_market, market_id);
        (s.yes, s.no)
    }

    #[view]
    public fun calculate_potential_payout(
        market_id: u64,
        side_yes: bool,
        stake_amount: u64,
    ): u64 acquires MarketStore {
        let store = borrow_global<MarketStore>(@ori);
        assert!(table::contains(&store.markets, market_id), error::not_found(E_MARKET_NOT_FOUND));
        let m = table::borrow(&store.markets, market_id);

        // Assume the caller's stake_amount lands on side_yes, winning pool reflects that.
        let projected_winning_pool = if (side_yes) {
            m.total_yes + stake_amount
        } else {
            m.total_no + stake_amount
        };
        let projected_losing_pool = if (side_yes) { m.total_no } else { m.total_yes };

        let (payout, _, _) = compute_payout(
            stake_amount,
            if (side_yes) { projected_winning_pool } else { m.total_yes },
            if (side_yes) { m.total_no } else { projected_winning_pool },
            side_yes,
            false,
        );
        let _ = projected_losing_pool;
        payout
    }

    #[view]
    public fun total_markets(): u64 acquires MarketStore {
        borrow_global<MarketStore>(@ori).total_markets
    }

    #[view]
    public fun total_volume(): u64 acquires MarketStore {
        borrow_global<MarketStore>(@ori).total_volume
    }

    #[view]
    public fun vault_address(): address acquires MarketStore {
        borrow_global<MarketStore>(@ori).vault_addr
    }

    // ===== Internal =====

    /// Returns (payout_to_user, fee_to_treasury_this_claim, mark_fee_sent_flag).
    /// Pure function -- no storage access.
    fun compute_payout(
        winning_stake: u64,
        total_yes: u64,
        total_no: u64,
        outcome_yes: bool,
        fee_already_sent: bool,
    ): (u64, u64, bool) {
        let (winning_pool, losing_pool) = if (outcome_yes) {
            (total_yes, total_no)
        } else {
            (total_no, total_yes)
        };

        if (losing_pool == 0) {
            // No counterparty -- fee comes off the winner's own stake.
            let fee = winning_stake * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
            let payout = winning_stake - fee;
            // fee_already_sent is only meaningful for the losing-pool path;
            // the zero-loser path sends its fee per-claim.
            (payout, fee, false)
        } else {
            let fee_total = losing_pool * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
            let net_losers = losing_pool - fee_total;
            // Proportional share of net losers pool.
            let user_share = (winning_stake * net_losers) / winning_pool;
            let payout = winning_stake + user_share;
            if (fee_already_sent) {
                (payout, 0, false)
            } else {
                (payout, fee_total, true)
            }
        }
    }

    // ===== Test-only helpers =====

    /// Test-only resolver that bypasses the oracle call. Needed because the
    /// Connect oracle is a native host function not available in the unit-test
    /// VM. Production code path goes through `resolve(_)` which calls
    /// `oracle::get_price`.
    #[test_only]
    public fun test_resolve_with_price(
        _caller: &signer,
        market_id: u64,
        mock_price: u256,
    ) acquires MarketStore {
        let store = borrow_global_mut<MarketStore>(@ori);
        assert!(table::contains(&store.markets, market_id), error::not_found(E_MARKET_NOT_FOUND));

        let (target, comparator) = {
            let m = table::borrow(&store.markets, market_id);
            assert!(!m.resolved, error::invalid_state(E_MARKET_ALREADY_RESOLVED));
            let (_, now) = block::get_block_info();
            assert!(now >= m.resolve_deadline, error::invalid_state(E_DEADLINE_NOT_PASSED));
            (m.target_price, m.comparator)
        };

        let outcome_yes = if (comparator) { mock_price >= target } else { mock_price < target };

        let market = table::borrow_mut(&mut store.markets, market_id);
        market.resolved = true;
        market.outcome_yes = outcome_yes;
        market.resolved_price = mock_price;

        let (_, timestamp) = block::get_block_info();
        event::emit(MarketResolved {
            market_id,
            outcome_yes,
            resolved_price: mock_price,
            total_yes: market.total_yes,
            total_no: market.total_no,
            timestamp,
        });
    }

    // ===== Tests =====

    #[test_only]
    use initia_std::primary_fungible_store;
    #[test_only]
    use std::option;
    #[test_only]
    use std::string;

    #[test_only]
    const TEST_DENOM: vector<u8> = b"OTEST";

    #[test_only]
    fun setup_pair(
        chain: &signer,
        a: address,
        b: address,
        amount: u64,
    ) {
        primary_fungible_store::init_module_for_test();
        init_module(chain);
        let (mint_cap, _bc, _fc) = coin::initialize(
            chain,
            option::none(),
            string::utf8(b"Ori Test"),
            string::utf8(TEST_DENOM),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        coin::mint_to(&mint_cap, a, amount);
        coin::mint_to(&mint_cap, b, amount);
        let _ = mint_cap; let _ = _bc; let _ = _fc;
    }

    #[test_only]
    fun setup_triple(
        chain: &signer,
        a: address,
        b: address,
        c: address,
        amount: u64,
    ) {
        primary_fungible_store::init_module_for_test();
        init_module(chain);
        let (mint_cap, _bc, _fc) = coin::initialize(
            chain,
            option::none(),
            string::utf8(b"Ori Test"),
            string::utf8(TEST_DENOM),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        coin::mint_to(&mint_cap, a, amount);
        coin::mint_to(&mint_cap, b, amount);
        coin::mint_to(&mint_cap, c, amount);
        let _ = mint_cap; let _ = _bc; let _ = _fc;
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_happy_path_yes_wins(
        chain: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires MarketStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        setup_pair(chain, alice_addr, bob_addr, 10_000);
        initia_std::block::set_block_info(1, 1000);

        // Alice creates market: "INIT/USD >= 1e12" resolving in 60 seconds.
        create_market(
            alice,
            string::utf8(b"INIT/USD"),
            1_000_000_000_000u256,
            true, // comparator: >= wins YES
            60,
            string::utf8(TEST_DENOM),
        );

        // Alice stakes 1000 on YES, Bob stakes 500 on NO.
        stake(alice, 1, true, 1_000);
        stake(bob, 1, false, 500);

        // Advance past deadline.
        initia_std::block::set_block_info(2, 1061);

        // Resolve with price above target -> YES wins.
        test_resolve_with_price(alice, 1, 1_100_000_000_000u256);

        // Alice claims.
        // losing_pool = 500, fee_total = 5, net_losers = 495
        // user_share = (1000 * 495) / 1000 = 495
        // payout = 1000 + 495 = 1495
        claim_winnings(alice, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(alice_addr, metadata) == 10_495, 100);
        // Bob lost -- no claim possible; his 500 stays in vault minus fee to treasury.
        assert!(coin::balance(bob_addr, metadata) == 9_500, 101);
        // Treasury (deployer @ori) got the 5-unit fee on first claim.
        assert!(coin::balance(@ori, metadata) == 5, 102);
        // Vault keeps bob's losing stake minus the fee: 500 - 5 = 495.
        assert!(coin::balance(vault_address(), metadata) == 495, 103);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_happy_path_no_wins(
        chain: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires MarketStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        setup_pair(chain, alice_addr, bob_addr, 10_000);
        initia_std::block::set_block_info(1, 1000);

        create_market(
            alice,
            string::utf8(b"INIT/USD"),
            1_000_000_000_000u256,
            true,
            60,
            string::utf8(TEST_DENOM),
        );
        stake(alice, 1, true, 1_000);
        stake(bob, 1, false, 500);

        initia_std::block::set_block_info(2, 1061);
        // price below target -> NO wins.
        test_resolve_with_price(bob, 1, 900_000_000_000u256);

        // Bob claims.
        // losing_pool = 1000 (alice), fee_total = 10, net_losers = 990
        // user_share = (500 * 990) / 500 = 990
        // payout = 500 + 990 = 1490
        claim_winnings(bob, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(bob_addr, metadata) == 10_990, 200);
        assert!(coin::balance(alice_addr, metadata) == 9_000, 201);
        assert!(coin::balance(@ori, metadata) == 10, 202);
        assert!(coin::balance(vault_address(), metadata) == 990, 203);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_nobody_on_losing_side(
        chain: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires MarketStore {
        let alice_addr = signer::address_of(alice);
        let _ = signer::address_of(bob);
        setup_pair(chain, alice_addr, signer::address_of(bob), 10_000);
        initia_std::block::set_block_info(1, 1000);

        create_market(
            alice,
            string::utf8(b"INIT/USD"),
            1_000_000_000_000u256,
            true,
            60,
            string::utf8(TEST_DENOM),
        );
        stake(alice, 1, true, 1_000);
        // No NO stakes.

        initia_std::block::set_block_info(2, 1061);
        test_resolve_with_price(alice, 1, 1_500_000_000_000u256);

        // Alice claims.
        // losing_pool = 0 -> fee comes off alice's own stake: 10
        // payout = 1000 - 10 = 990
        claim_winnings(alice, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(alice_addr, metadata) == 9_990, 300);
        assert!(coin::balance(@ori, metadata) == 10, 301);
        assert!(coin::balance(vault_address(), metadata) == 0, 302);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_multi_staker_proportionality(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires MarketStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_triple(chain, alice_addr, bob_addr, carol_addr, 10_000);
        initia_std::block::set_block_info(1, 1000);

        create_market(
            alice,
            string::utf8(b"INIT/USD"),
            1_000_000_000_000u256,
            true,
            60,
            string::utf8(TEST_DENOM),
        );
        stake(alice, 1, true, 2_000);
        stake(bob, 1, true, 1_000);
        stake(carol, 1, false, 1_500);

        initia_std::block::set_block_info(2, 1061);
        test_resolve_with_price(alice, 1, 1_500_000_000_000u256);

        // Losing pool = 1500, fee = 15, net_losers = 1485, winning_pool = 3000
        // alice share = (2000 * 1485) / 3000 = 990,  payout = 2990
        // bob share   = (1000 * 1485) / 3000 = 495,  payout = 1495
        // Treasury receives 15 on the FIRST claim (alice), 0 on bob's.
        claim_winnings(alice, 1);
        claim_winnings(bob, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(alice_addr, metadata) == 10_990, 400); // 10_000 - 2_000 + 2_990
        assert!(coin::balance(bob_addr, metadata) == 10_495, 401);   // 10_000 - 1_000 + 1_495
        assert!(coin::balance(carol_addr, metadata) == 8_500, 402);
        assert!(coin::balance(@ori, metadata) == 15, 403);
        assert!(coin::balance(vault_address(), metadata) == 0, 404);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x1000a, location = Self)]
    fun test_claim_twice_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires MarketStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        setup_pair(chain, alice_addr, bob_addr, 10_000);
        initia_std::block::set_block_info(1, 1000);

        create_market(
            alice,
            string::utf8(b"INIT/USD"),
            1_000_000_000_000u256,
            true,
            60,
            string::utf8(TEST_DENOM),
        );
        stake(alice, 1, true, 1_000);
        stake(bob, 1, false, 500);
        initia_std::block::set_block_info(2, 1061);
        test_resolve_with_price(alice, 1, 1_100_000_000_000u256);

        claim_winnings(alice, 1);
        claim_winnings(alice, 1); // should abort -- stake zeroed out
    }

    #[test]
    fun test_compute_payout_math() {
        // YES wins, losers present.
        let (p, fee, mark) = compute_payout(1_000, 1_000, 500, true, false);
        assert!(p == 1_495, 500);   // 1000 + (1000 * 495) / 1000 = 1495
        assert!(fee == 5, 501);
        assert!(mark == true, 502);

        // YES wins, fee already sent on prior claim.
        let (p2, fee2, mark2) = compute_payout(1_000, 1_000, 500, true, true);
        assert!(p2 == 1_495, 503);
        assert!(fee2 == 0, 504);
        assert!(mark2 == false, 505);

        // YES wins, nobody on losing side.
        let (p3, fee3, mark3) = compute_payout(1_000, 1_000, 0, true, false);
        assert!(p3 == 990, 506);
        assert!(fee3 == 10, 507);
        assert!(mark3 == false, 508);
    }
}
