/// Lucky Pool -- a provably-fair prize pool.
///
/// Anyone can create a pool with (entry_fee, max_participants, denom). Each
/// participant joins by paying `entry_fee`. When the pool hits its cap OR
/// the creator calls `draw`, a winner is selected via a block-hash-derived
/// pseudo-random index and wins `total_pool * (1 - fee_bps)`.
///
/// Provable-fairness: the draw uses `(block_height, timestamp, pool_id) ->
/// keccak256` -- deterministic given the block, so anyone can verify the
/// winner selection after the fact. Not manipulation-proof by a proposer
/// (a dedicated VRF would be), but good enough for "fun among friends".
///
/// Attribution: provably-fair selection pattern from Venkat5599/InitPay's
/// Lucky Pool Lottery; fee-split pattern from `ori::tip_jar`.
module ori::lucky_pool {
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::error;
    use std::bcs;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::fungible_asset;
    use initia_std::hash;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ZERO_FEE: u64 = 2;
    const E_INVALID_CAP: u64 = 3;
    const E_POOL_NOT_FOUND: u64 = 4;
    const E_POOL_FULL: u64 = 5;
    const E_ALREADY_JOINED: u64 = 6;
    const E_POOL_CLOSED: u64 = 7;
    const E_NOT_CREATOR: u64 = 8;
    const E_EMPTY_POOL: u64 = 9;
    const E_NOT_ADMIN: u64 = 10;

    // ===== Constants =====
    const PLATFORM_FEE_BPS: u64 = 100;
    const BPS_DENOMINATOR: u64 = 10_000;
    const MIN_PARTICIPANTS: u64 = 2;
    const MAX_PARTICIPANTS: u64 = 200;

    // ===== Storage =====

    struct LuckyPoolStore has key {
        next_id: u64,
        pools: Table<u64, Pool>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
        admin: address,
        treasury: address,
        total_drawn: u64,
    }

    struct Pool has store, drop {
        id: u64,
        creator: address,
        entry_fee: u64,
        denom: String,
        max_participants: u64,
        participants: vector<address>,
        total_pool: u64,
        winner: address,
        drawn: bool,
        drawn_at: u64,
        created_at: u64,
    }

    /// Quick membership test without scanning the participants vector.
    /// Deduplicated per-pool via Table<(pool_id, addr), bool>.
    struct MembershipKey has copy, drop, store {
        pool_id: u64,
        participant: address,
    }

    struct Memberships has key {
        table: Table<MembershipKey, bool>,
    }

    // ===== Events =====

    #[event]
    struct PoolCreated has drop, store {
        id: u64,
        creator: address,
        entry_fee: u64,
        denom: String,
        max_participants: u64,
        timestamp: u64,
    }

    #[event]
    struct PoolJoined has drop, store {
        id: u64,
        participant: address,
        participants_count: u64,
        timestamp: u64,
    }

    #[event]
    struct PoolDrawn has drop, store {
        id: u64,
        winner: address,
        gross_prize: u64,
        net_prize: u64,
        fee_amount: u64,
        denom: String,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_lucky_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        let admin = signer::address_of(deployer);

        move_to(deployer, LuckyPoolStore {
            next_id: 1,
            pools: table::new(),
            vault_extend_ref,
            vault_addr,
            admin,
            treasury: admin,
            total_drawn: 0,
        });
        move_to(deployer, Memberships { table: table::new() });
    }

    // ===== Entry functions =====

    public entry fun create_pool(
        creator: &signer,
        entry_fee: u64,
        max_participants: u64,
        denom: String,
    ) acquires LuckyPoolStore {
        assert!(exists<LuckyPoolStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(entry_fee > 0, error::invalid_argument(E_ZERO_FEE));
        assert!(
            max_participants >= MIN_PARTICIPANTS && max_participants <= MAX_PARTICIPANTS,
            error::invalid_argument(E_INVALID_CAP),
        );

        let creator_addr = signer::address_of(creator);
        let store = borrow_global_mut<LuckyPoolStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;
        let (_, ts) = block::get_block_info();

        table::add(&mut store.pools, id, Pool {
            id,
            creator: creator_addr,
            entry_fee,
            denom,
            max_participants,
            participants: vector::empty(),
            total_pool: 0,
            winner: @0x0,
            drawn: false,
            drawn_at: 0,
            created_at: ts,
        });

        event::emit(PoolCreated {
            id,
            creator: creator_addr,
            entry_fee,
            denom,
            max_participants,
            timestamp: ts,
        });
    }

    public entry fun join_pool(participant: &signer, pool_id: u64) acquires LuckyPoolStore, Memberships {
        let store = borrow_global_mut<LuckyPoolStore>(@ori);
        assert!(table::contains(&store.pools, pool_id), error::not_found(E_POOL_NOT_FOUND));
        let pool_ref = table::borrow_mut(&mut store.pools, pool_id);
        assert!(!pool_ref.drawn, error::invalid_state(E_POOL_CLOSED));
        assert!(
            vector::length(&pool_ref.participants) < pool_ref.max_participants,
            error::invalid_state(E_POOL_FULL),
        );

        let participant_addr = signer::address_of(participant);
        let members = borrow_global_mut<Memberships>(@ori);
        let key = MembershipKey { pool_id, participant: participant_addr };
        assert!(!table::contains(&members.table, key), error::already_exists(E_ALREADY_JOINED));

        let entry_fee = pool_ref.entry_fee;
        let denom = pool_ref.denom;
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(participant, store.vault_addr, metadata, entry_fee);

        vector::push_back(&mut pool_ref.participants, participant_addr);
        pool_ref.total_pool = pool_ref.total_pool + entry_fee;
        let new_count = vector::length(&pool_ref.participants);

        table::add(&mut members.table, key, true);

        let (_, ts) = block::get_block_info();
        event::emit(PoolJoined {
            id: pool_id,
            participant: participant_addr,
            participants_count: new_count,
            timestamp: ts,
        });
    }

    /// Creator triggers the draw. Anyone can call once the pool is full; the
    /// creator alone can call with a partially-filled pool (early-draw).
    public entry fun draw(caller: &signer, pool_id: u64) acquires LuckyPoolStore {
        let store = borrow_global_mut<LuckyPoolStore>(@ori);
        assert!(table::contains(&store.pools, pool_id), error::not_found(E_POOL_NOT_FOUND));
        let pool_ref = table::borrow_mut(&mut store.pools, pool_id);
        assert!(!pool_ref.drawn, error::invalid_state(E_POOL_CLOSED));

        let count = vector::length(&pool_ref.participants);
        assert!(count > 0, error::invalid_state(E_EMPTY_POOL));

        // If pool isn't full yet, only the creator can force a draw.
        let caller_addr = signer::address_of(caller);
        if (count < pool_ref.max_participants) {
            assert!(caller_addr == pool_ref.creator, error::permission_denied(E_NOT_CREATOR));
            assert!(count >= MIN_PARTICIPANTS, error::invalid_state(E_EMPTY_POOL));
        };

        let (height, ts) = block::get_block_info();

        // Pseudo-random winner index from hash(pool_id || height || timestamp).
        let seed = vector::empty<u8>();
        vector::append(&mut seed, bcs::to_bytes(&pool_id));
        vector::append(&mut seed, bcs::to_bytes(&height));
        vector::append(&mut seed, bcs::to_bytes(&ts));
        let digest = hash::sha2_256(seed);

        // Take first 8 bytes as u64 and mod by count.
        let idx_u64 = bytes_to_u64(&digest);
        let winner_idx = idx_u64 % count;
        let winner = *vector::borrow(&pool_ref.participants, winner_idx);
        pool_ref.winner = winner;
        pool_ref.drawn = true;
        pool_ref.drawn_at = ts;

        let gross = pool_ref.total_pool;
        let fee = gross * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        let net = gross - fee;
        let denom = pool_ref.denom;

        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        let payout = coin::withdraw(&vault_signer, metadata, gross);
        if (fee > 0) {
            let winner_portion = fungible_asset::extract(&mut payout, net);
            coin::deposit(winner, winner_portion);
            coin::deposit(store.treasury, payout);
        } else {
            coin::deposit(winner, payout);
        };
        store.total_drawn = store.total_drawn + 1;

        event::emit(PoolDrawn {
            id: pool_id,
            winner,
            gross_prize: gross,
            net_prize: net,
            fee_amount: fee,
            denom,
            timestamp: ts,
        });
    }

    // ===== View functions =====

    #[view]
    public fun get_pool(
        pool_id: u64,
    ): (address, u64, String, u64, u64, u64, address, bool) acquires LuckyPoolStore {
        let store = borrow_global<LuckyPoolStore>(@ori);
        assert!(table::contains(&store.pools, pool_id), error::not_found(E_POOL_NOT_FOUND));
        let p = table::borrow(&store.pools, pool_id);
        (
            p.creator,
            p.entry_fee,
            p.denom,
            p.max_participants,
            vector::length(&p.participants),
            p.total_pool,
            p.winner,
            p.drawn,
        )
    }

    #[view]
    public fun is_participant(pool_id: u64, addr: address): bool acquires Memberships {
        if (!exists<Memberships>(@ori)) return false;
        let members = borrow_global<Memberships>(@ori);
        table::contains(&members.table, MembershipKey { pool_id, participant: addr })
    }

    #[view]
    public fun vault_address(): address acquires LuckyPoolStore {
        borrow_global<LuckyPoolStore>(@ori).vault_addr
    }

    // ===== Internal =====

    fun bytes_to_u64(bytes: &vector<u8>): u64 {
        let result: u64 = 0;
        let i = 0;
        while (i < 8 && i < vector::length(bytes)) {
            result = (result << 8) | (*vector::borrow(bytes, i) as u64);
            i = i + 1;
        };
        result
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
    fun setup_many(chain: &signer, funded: vector<address>, amount_per: u64) {
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
        let i = 0;
        let n = vector::length(&funded);
        while (i < n) {
            coin::mint_to(&mint_cap, *vector::borrow(&funded, i), amount_per);
            i = i + 1;
        };
        let _ = mint_cap; let _ = _bc; let _ = _fc;
    }

    #[test(chain = @ori, creator = @0xBEEF, alice = @0xA11CE, bob = @0xB0B)]
    fun test_full_pool_draws(
        chain: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires LuckyPoolStore, Memberships {
        let funded = vector::empty<address>();
        vector::push_back(&mut funded, signer::address_of(alice));
        vector::push_back(&mut funded, signer::address_of(bob));
        setup_many(chain, funded, 1_000_000);

        initia_std::block::set_block_info(1, 1000);
        create_pool(creator, 10_000, 2, string::utf8(TEST_DENOM));
        join_pool(alice, 1);
        join_pool(bob, 1);

        initia_std::block::set_block_info(2, 1001);
        draw(creator, 1);

        let (_, _, _, _, pcount, total, winner, drawn) = get_pool(1);
        assert!(drawn, 100);
        assert!(pcount == 2, 101);
        assert!(total == 20_000, 102);
        assert!(winner == signer::address_of(alice) || winner == signer::address_of(bob), 103);
    }

    #[test(chain = @ori, creator = @0xBEEF, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x80006, location = Self)]
    fun test_double_join_aborts(
        chain: &signer,
        creator: &signer,
        alice: &signer,
    ) acquires LuckyPoolStore, Memberships {
        let funded = vector::empty<address>();
        vector::push_back(&mut funded, signer::address_of(alice));
        setup_many(chain, funded, 1_000_000);
        create_pool(creator, 1_000, 5, string::utf8(TEST_DENOM));
        join_pool(alice, 1);
        join_pool(alice, 1);
    }

    #[test(chain = @ori, creator = @0xBEEF, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x50008, location = Self)]
    fun test_non_creator_cannot_early_draw(
        chain: &signer,
        creator: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires LuckyPoolStore, Memberships {
        let funded = vector::empty<address>();
        vector::push_back(&mut funded, signer::address_of(alice));
        vector::push_back(&mut funded, signer::address_of(bob));
        setup_many(chain, funded, 1_000_000);
        create_pool(creator, 10_000, 10, string::utf8(TEST_DENOM));
        join_pool(alice, 1);
        join_pool(bob, 1);
        draw(alice, 1); // pool isn't full -> only creator can draw
    }
}
