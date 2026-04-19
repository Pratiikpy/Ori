/// Wager Escrow -- friendly bets with 2-of-3 arbiter resolution OR 1-on-1 PvP.
///
/// Scoped to "friendly wagers between friends":
///   - ARBITER mode: proposer stakes X, names accepter + arbiter up front,
///     accepter matches, arbiter declares winner. Winner gets 2X minus 1% fee.
///   - PVP mode:     proposer stakes X, names accepter, no arbiter. The loser
///     calls `concede` to pay out the winner (both-signed gentleman's agreement).
///   - CATEGORY + DEADLINE: wagers can be categorized ("sports", "crypto",
///     "silly") and given a resolve_deadline. After the deadline, if the
///     wager is still active, ANYONE can call `refund_expired` to return each
///     side's stake (minus no fee) -- prevents funds being trapped when an
///     arbiter goes AWOL.
///
/// Cancel path: either party can cancel a PENDING wager (accepter hasn't
/// matched); proposer reclaims.
///
/// Architecture: Object + ExtendRef vault + Table<u64, Wager>.
///
/// Attribution: category + deadline + oracle-path from dmpz19x-creator/Hunch;
/// PvP mode from niraj-niraj/Drip's BattleManager; refund-on-expiry pattern
/// from Ferdi-svg/InitPage's x402 timeout handling.
module ori::wager_escrow {
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
    const E_ZERO_AMOUNT: u64 = 2;
    const E_SELF_WAGER: u64 = 3;
    const E_SAME_ARBITER: u64 = 4;
    const E_WAGER_NOT_FOUND: u64 = 5;
    const E_WRONG_ACCEPTER: u64 = 6;
    const E_WRONG_ARBITER: u64 = 7;
    const E_WAGER_NOT_PENDING: u64 = 8;
    const E_WAGER_NOT_ACTIVE: u64 = 9;
    const E_INVALID_WINNER: u64 = 10;
    const E_NOT_PROPOSER: u64 = 11;
    const E_WRONG_MODE: u64 = 12;
    const E_NOT_EXPIRED: u64 = 13;
    const E_DEADLINE_PAST: u64 = 14;
    const E_NOT_PARTY: u64 = 15;
    const E_ORACLE_NOT_SET: u64 = 16;
    const E_ORACLE_DEADLINE_REQUIRED: u64 = 17;
    const E_INVALID_PAIR: u64 = 18;

    // ===== Status =====
    const STATUS_PENDING: u8 = 0;
    const STATUS_ACTIVE: u8 = 1;
    const STATUS_RESOLVED: u8 = 2;
    const STATUS_CANCELLED: u8 = 3;
    const STATUS_REFUNDED: u8 = 4;

    // ===== Mode =====
    const MODE_ARBITER: u8 = 0;
    const MODE_PVP: u8 = 1;
    /// Outcome decided by a Slinky oracle price feed. Proposer wins if the
    /// condition (price above/below target) is true at resolution time.
    const MODE_ORACLE: u8 = 2;
    const MAX_PAIR_LEN: u64 = 64;

    const PLATFORM_FEE_BPS: u64 = 100; // 1%
    const BPS_DENOMINATOR: u64 = 10_000;

    const MIN_DEADLINE_SECONDS: u64 = 60 * 5;            // 5 min
    const MAX_DEADLINE_SECONDS: u64 = 180 * 24 * 60 * 60; // 180 days

    // ===== Storage =====

    struct WagerStore has key {
        next_id: u64,
        wagers: Table<u64, Wager>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
        treasury: address,
        admin: address,
        total_wagers: u64,
        total_volume: u64,
    }

    struct Wager has store, drop, copy {
        id: u64,
        proposer: address,
        accepter: address,
        /// In MODE_PVP / MODE_ORACLE, arbiter == @0x0 and is ignored.
        arbiter: address,
        amount: u64,
        denom: String,
        claim: String,
        category: String,
        mode: u8,
        status: u8,
        winner: address,
        created_at: u64,
        /// Timestamp (block seconds). 0 = no deadline. Required for MODE_ORACLE.
        resolve_deadline: u64,
        resolved_at: u64,
        // -- Oracle-mode fields (all default to empty/0 for other modes) --
        /// Slinky pair id, e.g. "BITCOIN/USD", "INIT/USD".
        oracle_pair: String,
        /// Target price scaled by the oracle's native decimals.
        oracle_target_price: u256,
        /// true  = proposer wins if resolved price >= target
        /// false = proposer wins if resolved price <  target
        oracle_proposer_wins_above: bool,
    }

    // ===== Events =====

    #[event]
    struct WagerProposed has drop, store {
        id: u64,
        proposer: address,
        accepter: address,
        arbiter: address,
        amount: u64,
        denom: String,
        claim: String,
        category: String,
        mode: u8,
        resolve_deadline: u64,
        timestamp: u64,
    }

    #[event]
    struct WagerAccepted has drop, store {
        id: u64, accepter: address, timestamp: u64,
    }

    #[event]
    struct WagerResolved has drop, store {
        id: u64, winner: address, payout: u64, fee: u64, timestamp: u64,
    }

    #[event]
    struct WagerCancelled has drop, store {
        id: u64, by: address, timestamp: u64,
    }

    #[event]
    struct WagerRefunded has drop, store {
        id: u64, proposer: address, accepter: address, amount_each: u64, timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_wager_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        let deployer_addr = signer::address_of(deployer);

        move_to(deployer, WagerStore {
            next_id: 1,
            wagers: table::new(),
            vault_extend_ref,
            vault_addr,
            treasury: deployer_addr,
            admin: deployer_addr,
            total_wagers: 0,
            total_volume: 0,
        });
    }

    // ===== Entry functions =====

    /// Legacy entry with empty category/no-deadline. Kept for callers that
    /// haven't been updated. Equivalent to `propose_wager_full(...)` with
    /// category="", deadline_seconds=0.
    public entry fun propose_wager(
        proposer: &signer,
        accepter: address,
        arbiter: address,
        denom: String,
        amount: u64,
        claim: String,
    ) acquires WagerStore {
        propose_wager_full(
            proposer,
            accepter,
            arbiter,
            denom,
            amount,
            claim,
            std::string::utf8(b""),
            0,
        );
    }

    /// Full arbiter-mode propose with category + relative deadline_seconds.
    /// Pass deadline_seconds=0 for no deadline (arbiter must resolve -- can stay
    /// open indefinitely, but also cannot be refund-expired).
    public entry fun propose_wager_full(
        proposer: &signer,
        accepter: address,
        arbiter: address,
        denom: String,
        amount: u64,
        claim: String,
        category: String,
        deadline_seconds: u64,
    ) acquires WagerStore {
        assert!(exists<WagerStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));

        let proposer_addr = signer::address_of(proposer);
        assert!(proposer_addr != accepter, error::invalid_argument(E_SELF_WAGER));
        assert!(
            arbiter != proposer_addr && arbiter != accepter,
            error::invalid_argument(E_SAME_ARBITER),
        );
        validate_deadline(deadline_seconds);

        let store = borrow_global_mut<WagerStore>(@ori);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(proposer, store.vault_addr, metadata, amount);

        let id = store.next_id;
        store.next_id = id + 1;
        store.total_wagers = store.total_wagers + 1;

        let (_, timestamp) = block::get_block_info();
        let deadline = if (deadline_seconds == 0) { 0 } else { timestamp + deadline_seconds };

        table::add(&mut store.wagers, id, Wager {
            id,
            proposer: proposer_addr,
            accepter,
            arbiter,
            amount,
            denom,
            claim,
            category,
            mode: MODE_ARBITER,
            status: STATUS_PENDING,
            winner: @0x0,
            created_at: timestamp,
            resolve_deadline: deadline,
            resolved_at: 0,
            oracle_pair: std::string::utf8(b""),
            oracle_target_price: 0,
            oracle_proposer_wins_above: false,
        });

        event::emit(WagerProposed {
            id,
            proposer: proposer_addr,
            accepter,
            arbiter,
            amount,
            denom,
            claim,
            category,
            mode: MODE_ARBITER,
            resolve_deadline: deadline,
            timestamp,
        });
    }

    /// PvP wager -- no arbiter. Loser pays winner via `concede`. If neither
    /// party concedes by the deadline, `refund_expired` returns stakes.
    public entry fun propose_pvp_wager(
        proposer: &signer,
        accepter: address,
        denom: String,
        amount: u64,
        claim: String,
        category: String,
        deadline_seconds: u64,
    ) acquires WagerStore {
        assert!(exists<WagerStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        let proposer_addr = signer::address_of(proposer);
        assert!(proposer_addr != accepter, error::invalid_argument(E_SELF_WAGER));
        validate_deadline(deadline_seconds);

        let store = borrow_global_mut<WagerStore>(@ori);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(proposer, store.vault_addr, metadata, amount);

        let id = store.next_id;
        store.next_id = id + 1;
        store.total_wagers = store.total_wagers + 1;

        let (_, timestamp) = block::get_block_info();
        let deadline = if (deadline_seconds == 0) { 0 } else { timestamp + deadline_seconds };

        table::add(&mut store.wagers, id, Wager {
            id,
            proposer: proposer_addr,
            accepter,
            arbiter: @0x0,
            amount,
            denom,
            claim,
            category,
            mode: MODE_PVP,
            status: STATUS_PENDING,
            winner: @0x0,
            created_at: timestamp,
            resolve_deadline: deadline,
            resolved_at: 0,
            oracle_pair: std::string::utf8(b""),
            oracle_target_price: 0,
            oracle_proposer_wins_above: false,
        });

        event::emit(WagerProposed {
            id,
            proposer: proposer_addr,
            accepter,
            arbiter: @0x0,
            amount,
            denom,
            claim,
            category,
            mode: MODE_PVP,
            resolve_deadline: deadline,
            timestamp,
        });
    }

    /// Oracle-resolved wager: outcome determined by a Slinky price feed after
    /// the deadline. Proposer wins if condition holds; accepter wins otherwise.
    /// Zero arbiter required - `resolve_from_oracle` is permissionless and
    /// anyone can trigger it once the deadline has passed.
    ///
    /// Example: "BTC will be >= $100_000 by Dec 31" -> proposer_wins_above = true
    ///          target_price expressed in the oracle's native scale.
    public entry fun propose_oracle_wager(
        proposer: &signer,
        accepter: address,
        denom: String,
        amount: u64,
        claim: String,
        category: String,
        deadline_seconds: u64,
        oracle_pair: String,
        oracle_target_price: u256,
        oracle_proposer_wins_above: bool,
    ) acquires WagerStore {
        assert!(exists<WagerStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(deadline_seconds > 0, error::invalid_argument(E_ORACLE_DEADLINE_REQUIRED));
        let pair_len = std::string::length(&oracle_pair);
        assert!(pair_len > 0 && pair_len <= MAX_PAIR_LEN, error::invalid_argument(E_INVALID_PAIR));

        let proposer_addr = signer::address_of(proposer);
        assert!(proposer_addr != accepter, error::invalid_argument(E_SELF_WAGER));
        validate_deadline(deadline_seconds);

        let store = borrow_global_mut<WagerStore>(@ori);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(proposer, store.vault_addr, metadata, amount);

        let id = store.next_id;
        store.next_id = id + 1;
        store.total_wagers = store.total_wagers + 1;

        let (_, timestamp) = block::get_block_info();
        let deadline = timestamp + deadline_seconds;

        table::add(&mut store.wagers, id, Wager {
            id,
            proposer: proposer_addr,
            accepter,
            arbiter: @0x0,
            amount,
            denom,
            claim,
            category,
            mode: MODE_ORACLE,
            status: STATUS_PENDING,
            winner: @0x0,
            created_at: timestamp,
            resolve_deadline: deadline,
            resolved_at: 0,
            oracle_pair,
            oracle_target_price,
            oracle_proposer_wins_above,
        });

        event::emit(WagerProposed {
            id,
            proposer: proposer_addr,
            accepter,
            arbiter: @0x0,
            amount,
            denom,
            claim,
            category,
            mode: MODE_ORACLE,
            resolve_deadline: deadline,
            timestamp,
        });
    }

    public entry fun accept_wager(accepter: &signer, wager_id: u64) acquires WagerStore {
        let store = borrow_global_mut<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));

        let accepter_addr = signer::address_of(accepter);
        let wager = table::borrow_mut(&mut store.wagers, wager_id);
        assert!(wager.accepter == accepter_addr, error::permission_denied(E_WRONG_ACCEPTER));
        assert!(wager.status == STATUS_PENDING, error::invalid_state(E_WAGER_NOT_PENDING));

        let metadata = coin::denom_to_metadata(wager.denom);
        coin::transfer(accepter, store.vault_addr, metadata, wager.amount);

        store.total_volume = store.total_volume + (wager.amount * 2);
        wager.status = STATUS_ACTIVE;

        let (_, timestamp) = block::get_block_info();
        event::emit(WagerAccepted { id: wager.id, accepter: accepter_addr, timestamp });
    }

    public entry fun resolve_wager(
        arbiter: &signer,
        wager_id: u64,
        winner: address,
    ) acquires WagerStore {
        let store = borrow_global_mut<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));

        let arbiter_addr = signer::address_of(arbiter);
        let wager = table::borrow_mut(&mut store.wagers, wager_id);
        assert!(wager.mode == MODE_ARBITER, error::invalid_argument(E_WRONG_MODE));
        assert!(wager.arbiter == arbiter_addr, error::permission_denied(E_WRONG_ARBITER));
        assert!(wager.status == STATUS_ACTIVE, error::invalid_state(E_WAGER_NOT_ACTIVE));
        assert!(
            winner == wager.proposer || winner == wager.accepter,
            error::invalid_argument(E_INVALID_WINNER),
        );

        payout_to_winner(store, wager_id, winner);
    }

    /// PVP mode: the loser concedes and the winner (the other party) takes
    /// the pot. Caller must be one of the two parties; they designate the
    /// OTHER party as winner.
    public entry fun concede(loser: &signer, wager_id: u64) acquires WagerStore {
        let store = borrow_global_mut<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));

        let loser_addr = signer::address_of(loser);
        let wager = table::borrow(&store.wagers, wager_id);
        assert!(wager.mode == MODE_PVP, error::invalid_argument(E_WRONG_MODE));
        assert!(wager.status == STATUS_ACTIVE, error::invalid_state(E_WAGER_NOT_ACTIVE));

        let winner = if (loser_addr == wager.proposer) {
            wager.accepter
        } else if (loser_addr == wager.accepter) {
            wager.proposer
        } else {
            abort error::permission_denied(E_NOT_PARTY)
        };

        payout_to_winner(store, wager_id, winner);
    }

    /// ORACLE mode: permissionless resolution from Slinky price feed once
    /// the deadline has passed. Anyone can trigger. Proposer wins if the
    /// stored condition (price above/below target) holds; accepter wins
    /// otherwise. Reads price via `initia_std::oracle::get_price`.
    public entry fun resolve_from_oracle(
        _caller: &signer,
        wager_id: u64,
    ) acquires WagerStore {
        let store = borrow_global_mut<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));

        let pair;
        let target;
        let wins_above;
        let proposer;
        let accepter;
        {
            let wager = table::borrow(&store.wagers, wager_id);
            assert!(wager.mode == MODE_ORACLE, error::invalid_argument(E_WRONG_MODE));
            assert!(wager.status == STATUS_ACTIVE, error::invalid_state(E_WAGER_NOT_ACTIVE));
            assert!(wager.resolve_deadline > 0, error::invalid_state(E_ORACLE_NOT_SET));
            let (_, ts) = block::get_block_info();
            assert!(ts >= wager.resolve_deadline, error::invalid_state(E_NOT_EXPIRED));
            pair = wager.oracle_pair;
            target = wager.oracle_target_price;
            wins_above = wager.oracle_proposer_wins_above;
            proposer = wager.proposer;
            accepter = wager.accepter;
        };

        let (price, _oracle_ts, _decimals) = oracle::get_price(pair);
        let proposer_wins = if (wins_above) { price >= target } else { price < target };
        let winner = if (proposer_wins) { proposer } else { accepter };

        payout_to_winner(store, wager_id, winner);
    }

    /// Proposer can cancel a PENDING wager (accepter hasn't matched yet) and reclaim stake.
    public entry fun cancel_pending(proposer: &signer, wager_id: u64) acquires WagerStore {
        let store = borrow_global_mut<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));

        let proposer_addr = signer::address_of(proposer);
        let wager = table::borrow_mut(&mut store.wagers, wager_id);
        assert!(wager.proposer == proposer_addr, error::permission_denied(E_NOT_PROPOSER));
        assert!(wager.status == STATUS_PENDING, error::invalid_state(E_WAGER_NOT_PENDING));

        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(wager.denom);
        coin::transfer(&vault_signer, proposer_addr, metadata, wager.amount);

        let (_, timestamp) = block::get_block_info();
        wager.status = STATUS_CANCELLED;

        event::emit(WagerCancelled { id: wager.id, by: proposer_addr, timestamp });
    }

    /// Permissionless: once the deadline has passed and the wager is still
    /// ACTIVE (arbiter never resolved / parties never conceded), anyone can
    /// trigger a full refund. Each side gets their stake back, no fee.
    public entry fun refund_expired(_caller: &signer, wager_id: u64) acquires WagerStore {
        let store = borrow_global_mut<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));

        let wager = table::borrow_mut(&mut store.wagers, wager_id);
        assert!(
            wager.status == STATUS_ACTIVE,
            error::invalid_state(E_WAGER_NOT_ACTIVE),
        );
        assert!(wager.resolve_deadline > 0, error::invalid_state(E_NOT_EXPIRED));
        let (_, timestamp) = block::get_block_info();
        assert!(timestamp >= wager.resolve_deadline, error::invalid_state(E_NOT_EXPIRED));

        let each = wager.amount;
        let proposer = wager.proposer;
        let accepter = wager.accepter;
        let denom = wager.denom;
        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(&vault_signer, proposer, metadata, each);
        coin::transfer(&vault_signer, accepter, metadata, each);

        wager.status = STATUS_REFUNDED;

        event::emit(WagerRefunded {
            id: wager.id,
            proposer,
            accepter,
            amount_each: each,
            timestamp,
        });
    }

    // ===== View functions =====

    #[view]
    public fun get_wager(wager_id: u64): Wager acquires WagerStore {
        let store = borrow_global<WagerStore>(@ori);
        assert!(table::contains(&store.wagers, wager_id), error::not_found(E_WAGER_NOT_FOUND));
        *table::borrow(&store.wagers, wager_id)
    }

    #[view]
    public fun calculate_payout(stake: u64): (u64, u64) {
        let pot = stake * 2;
        let fee = pot * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        (pot - fee, fee)
    }

    #[view]
    public fun total_wagers(): u64 acquires WagerStore { borrow_global<WagerStore>(@ori).total_wagers }

    #[view]
    public fun total_volume(): u64 acquires WagerStore { borrow_global<WagerStore>(@ori).total_volume }

    #[view]
    public fun vault_address(): address acquires WagerStore { borrow_global<WagerStore>(@ori).vault_addr }

    // ===== Internal =====

    fun validate_deadline(deadline_seconds: u64) {
        if (deadline_seconds == 0) return;
        assert!(
            deadline_seconds >= MIN_DEADLINE_SECONDS
                && deadline_seconds <= MAX_DEADLINE_SECONDS,
            error::invalid_argument(E_DEADLINE_PAST),
        );
    }

    fun payout_to_winner(
        store: &mut WagerStore,
        wager_id: u64,
        winner: address,
    ) {
        let wager = table::borrow_mut(&mut store.wagers, wager_id);
        let pot = wager.amount * 2;
        let fee = pot * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        let payout = pot - fee;
        let treasury = store.treasury;
        let denom = wager.denom;

        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(&vault_signer, winner, metadata, payout);
        if (fee > 0) {
            coin::transfer(&vault_signer, treasury, metadata, fee);
        };

        let (_, timestamp) = block::get_block_info();
        wager.status = STATUS_RESOLVED;
        wager.winner = winner;
        wager.resolved_at = timestamp;

        event::emit(WagerResolved { id: wager.id, winner, payout, fee, timestamp });
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
    fun setup_multi(
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

    #[test]
    fun test_payout_math() {
        let (p, f) = calculate_payout(100);
        assert!(p == 198, 100);
        assert!(f == 2, 101);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_full_arbiter_wager_flow(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_multi(chain, alice_addr, bob_addr, 10_000);

        propose_wager(alice, bob_addr, carol_addr, string::utf8(TEST_DENOM), 1_000, string::utf8(b"liverpool wins"));
        accept_wager(bob, 1);
        resolve_wager(carol, 1, alice_addr);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(alice_addr, metadata) == 10_980, 200);
        assert!(coin::balance(bob_addr, metadata) == 9_000, 201);
        assert!(coin::balance(@ori, metadata) == 20, 202);
        assert!(coin::balance(vault_address(), metadata) == 0, 203);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_pvp_concede(chain: &signer, alice: &signer, bob: &signer) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        setup_multi(chain, alice_addr, bob_addr, 10_000);

        initia_std::block::set_block_info(1, 1000);
        propose_pvp_wager(
            alice,
            bob_addr,
            string::utf8(TEST_DENOM),
            1_000,
            string::utf8(b"ill beat you in chess"),
            string::utf8(b"games"),
            MIN_DEADLINE_SECONDS + 1,
        );
        accept_wager(bob, 1);
        concede(alice, 1); // alice loses -> bob wins

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(bob_addr, metadata) == 10_980, 300);
        assert!(coin::balance(@ori, metadata) == 20, 301);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_refund_expired(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_multi(chain, alice_addr, bob_addr, 10_000);

        initia_std::block::set_block_info(1, 1000);
        propose_wager_full(
            alice,
            bob_addr,
            carol_addr,
            string::utf8(TEST_DENOM),
            1_000,
            string::utf8(b"x"),
            string::utf8(b"test"),
            MIN_DEADLINE_SECONDS + 1,
        );
        accept_wager(bob, 1);

        // Advance time past deadline.
        initia_std::block::set_block_info(2, 1000 + MIN_DEADLINE_SECONDS + 100);
        refund_expired(alice, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(alice_addr, metadata) == 10_000, 400);
        assert!(coin::balance(bob_addr, metadata) == 10_000, 401);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_cancel_pending_returns_stake(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_multi(chain, alice_addr, bob_addr, 10_000);

        propose_wager(alice, bob_addr, carol_addr, string::utf8(TEST_DENOM), 1_000, string::utf8(b"x"));
        cancel_pending(alice, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(alice_addr, metadata) == 10_000, 500);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    #[expected_failure(abort_code = 0x50006, location = Self)]
    fun test_wrong_accepter_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_multi(chain, alice_addr, bob_addr, 10_000);

        propose_wager(alice, bob_addr, carol_addr, string::utf8(TEST_DENOM), 500, string::utf8(b"x"));
        accept_wager(carol, 1);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01, eve = @0xEEEE)]
    #[expected_failure(abort_code = 0x10004, location = Self)]
    fun test_arbiter_same_as_party_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
        eve: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let _ = carol; let _ = eve;
        setup_multi(chain, alice_addr, bob_addr, 10_000);

        propose_wager(alice, bob_addr, alice_addr, string::utf8(TEST_DENOM), 500, string::utf8(b"x"));
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    #[expected_failure(abort_code = 0x10012, location = Self)]
    fun test_resolve_on_pvp_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        let _ = carol_addr;
        setup_multi(chain, alice_addr, bob_addr, 10_000);
        initia_std::block::set_block_info(1, 1000);
        propose_pvp_wager(
            alice,
            bob_addr,
            string::utf8(TEST_DENOM),
            500,
            string::utf8(b"x"),
            string::utf8(b"t"),
            MIN_DEADLINE_SECONDS + 1,
        );
        accept_wager(bob, 1);
        resolve_wager(carol, 1, alice_addr); // can't resolve PVP via arbiter path
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    #[expected_failure(abort_code = 0x3000d, location = Self)]
    fun test_refund_without_deadline_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
        carol: &signer,
    ) acquires WagerStore {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_multi(chain, alice_addr, bob_addr, 10_000);
        propose_wager(alice, bob_addr, carol_addr, string::utf8(TEST_DENOM), 500, string::utf8(b"x"));
        accept_wager(bob, 1);
        refund_expired(alice, 1); // no deadline on legacy path -> aborts
    }
}
