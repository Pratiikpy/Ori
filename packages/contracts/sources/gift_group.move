/// Group Gift Packets -- one pot, N recipient slots, per-slot secrets.
///
/// Sender deposits `total_amount`, pre-computes N per-slot secret hashes
/// (`sha2_256(secret || slot_index)`), and creates a group gift. The first
/// N unique claimers each redeem one slot by presenting a valid secret.
/// Unclaimed slots past the TTL can be reclaimed by the sender.
///
/// Equal-share model: each slot pays `total_amount / slot_count` (remainder
/// dust stays in the vault for the sender to reclaim).
///
/// Attribution: multi-slot gift-packet design from ocean2fly/iUSD-Pay's
/// `gift_group.move` (mainnet). Address-bound per-slot hashing defeats
/// front-running in public mempools.
module ori::gift_group {
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::error;
    use std::bcs;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::hash;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ZERO_AMOUNT: u64 = 2;
    const E_INVALID_SLOT_COUNT: u64 = 3;
    const E_INVALID_THEME: u64 = 4;
    const E_HASH_LENGTH_MISMATCH: u64 = 5;
    const E_INVALID_SECRET_HASH: u64 = 6;
    const E_GIFT_NOT_FOUND: u64 = 7;
    const E_SLOT_OUT_OF_RANGE: u64 = 8;
    const E_SLOT_ALREADY_CLAIMED: u64 = 9;
    const E_SECRET_MISMATCH: u64 = 10;
    const E_NOT_SENDER: u64 = 11;
    const E_NOT_EXPIRED: u64 = 12;
    const E_ALREADY_CLAIMED_ANY: u64 = 13;
    const E_INVALID_TTL: u64 = 14;

    // ===== Constants =====
    const MAX_THEME: u8 = 4;
    const MIN_SLOTS: u64 = 2;
    const MAX_SLOTS: u64 = 50;
    const SHA256_LEN: u64 = 32;
    const MIN_TTL_SECONDS: u64 = 60 * 60;
    const MAX_TTL_SECONDS: u64 = 30 * 24 * 60 * 60;
    const DEFAULT_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;

    // ===== Storage =====

    struct GroupStore has key {
        next_id: u64,
        gifts: Table<u64, GroupGift>,
        /// Composite uniqueness: (gift_id, claimer) -> true. Stops one address
        /// claiming multiple slots on the same gift.
        claimed_by_address: Table<ClaimKey, bool>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
    }

    struct GroupGift has store, drop {
        id: u64,
        sender: address,
        total_amount: u64,
        per_slot_amount: u64,
        slot_count: u64,
        slots_claimed: u64,
        denom: String,
        theme: u8,
        message: String,
        /// Parallel vectors, length == slot_count.
        ///   slot_claimed[i]  -- has slot i been redeemed?
        ///   slot_claimer[i]  -- address that redeemed slot i (@0x0 if unclaimed)
        ///   secret_hashes[i] -- sha2_256(secret || u64_le(slot_index))
        slot_claimed: vector<bool>,
        slot_claimer: vector<address>,
        secret_hashes: vector<vector<u8>>,
        created_at: u64,
        expires_at: u64,
        reclaimed: bool,
    }

    struct ClaimKey has copy, drop, store {
        gift_id: u64,
        claimer: address,
    }

    // ===== Events =====

    #[event]
    struct GroupGiftCreated has drop, store {
        id: u64,
        sender: address,
        total_amount: u64,
        per_slot_amount: u64,
        slot_count: u64,
        denom: String,
        theme: u8,
        expires_at: u64,
        timestamp: u64,
    }

    #[event]
    struct GroupSlotClaimed has drop, store {
        id: u64,
        slot_index: u64,
        claimer: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct GroupGiftReclaimed has drop, store {
        id: u64,
        sender: address,
        refund_amount: u64,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_group_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        move_to(deployer, GroupStore {
            next_id: 1,
            gifts: table::new(),
            claimed_by_address: table::new(),
            vault_extend_ref,
            vault_addr,
        });
    }

    // ===== Entry functions =====

    /// Create a group gift. `secret_hashes` must be length `slot_count`, each
    /// entry = sha2_256(secret || u64_le(slot_index)). Sender generates one
    /// base secret offline, computes the hashes, and shares the secret via
    /// short-URL / QR. Per-slot indexing means a leaked URL can only be
    /// claimed for the matching slot -- not any free slot.
    public entry fun create_group_gift(
        sender: &signer,
        denom: String,
        total_amount: u64,
        slot_count: u64,
        theme: u8,
        message: String,
        secret_hashes: vector<vector<u8>>,
        ttl_seconds: u64,
    ) acquires GroupStore {
        assert!(exists<GroupStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(total_amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(theme <= MAX_THEME, error::invalid_argument(E_INVALID_THEME));
        assert!(
            slot_count >= MIN_SLOTS && slot_count <= MAX_SLOTS,
            error::invalid_argument(E_INVALID_SLOT_COUNT),
        );
        assert!(
            vector::length(&secret_hashes) == slot_count,
            error::invalid_argument(E_HASH_LENGTH_MISMATCH),
        );
        // Each hash must be exactly 32 bytes (sha2_256 output).
        let i = 0;
        while (i < slot_count) {
            let h = vector::borrow(&secret_hashes, i);
            assert!(vector::length(h) == SHA256_LEN, error::invalid_argument(E_INVALID_SECRET_HASH));
            i = i + 1;
        };
        let ttl = effective_ttl(ttl_seconds);

        let per_slot = total_amount / slot_count;
        assert!(per_slot > 0, error::invalid_argument(E_ZERO_AMOUNT));

        let store = borrow_global_mut<GroupStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;

        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(sender, store.vault_addr, metadata, total_amount);

        let sender_addr = signer::address_of(sender);
        let (_, timestamp) = block::get_block_info();
        let expires_at = timestamp + ttl;

        // Pre-fill parallel vectors for claimed/claimer tracking.
        let slot_claimed = vector::empty<bool>();
        let slot_claimer = vector::empty<address>();
        let j = 0;
        while (j < slot_count) {
            vector::push_back(&mut slot_claimed, false);
            vector::push_back(&mut slot_claimer, @0x0);
            j = j + 1;
        };

        table::add(&mut store.gifts, id, GroupGift {
            id,
            sender: sender_addr,
            total_amount,
            per_slot_amount: per_slot,
            slot_count,
            slots_claimed: 0,
            denom,
            theme,
            message,
            slot_claimed,
            slot_claimer,
            secret_hashes,
            created_at: timestamp,
            expires_at,
            reclaimed: false,
        });

        event::emit(GroupGiftCreated {
            id,
            sender: sender_addr,
            total_amount,
            per_slot_amount: per_slot,
            slot_count,
            denom,
            theme,
            expires_at,
            timestamp,
        });
    }

    /// Claim a specific slot. Caller provides the base `secret`; the module
    /// concatenates the slot index and verifies the hash.
    public entry fun claim_group_slot(
        claimer: &signer,
        gift_id: u64,
        slot_index: u64,
        secret: vector<u8>,
    ) acquires GroupStore {
        let store = borrow_global_mut<GroupStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));

        let claimer_addr = signer::address_of(claimer);
        let dup_key = ClaimKey { gift_id, claimer: claimer_addr };
        assert!(
            !table::contains(&store.claimed_by_address, dup_key),
            error::already_exists(E_ALREADY_CLAIMED_ANY),
        );

        let gift = table::borrow_mut(&mut store.gifts, gift_id);
        assert!(slot_index < gift.slot_count, error::invalid_argument(E_SLOT_OUT_OF_RANGE));
        let slot_claimed_ref = vector::borrow(&gift.slot_claimed, slot_index);
        assert!(!*slot_claimed_ref, error::already_exists(E_SLOT_ALREADY_CLAIMED));

        // hash_input = secret || u64_le_bytes(slot_index)
        let preimage = secret;
        vector::append(&mut preimage, bcs::to_bytes(&slot_index));
        let computed = hash::sha2_256(preimage);
        let expected = vector::borrow(&gift.secret_hashes, slot_index);
        assert!(computed == *expected, error::invalid_argument(E_SECRET_MISMATCH));

        // Mark claimed in both maps.
        *vector::borrow_mut(&mut gift.slot_claimed, slot_index) = true;
        *vector::borrow_mut(&mut gift.slot_claimer, slot_index) = claimer_addr;
        gift.slots_claimed = gift.slots_claimed + 1;

        let amount = gift.per_slot_amount;
        let denom = gift.denom;
        let id = gift.id;

        table::add(&mut store.claimed_by_address, dup_key, true);

        let (_, timestamp) = block::get_block_info();
        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(&vault_signer, claimer_addr, metadata, amount);

        event::emit(GroupSlotClaimed {
            id,
            slot_index,
            claimer: claimer_addr,
            amount,
            timestamp,
        });
    }

    /// Sender reclaims all unclaimed slots + the rounding-dust after expiry.
    public entry fun reclaim_expired_group(
        sender: &signer,
        gift_id: u64,
    ) acquires GroupStore {
        let store = borrow_global_mut<GroupStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));

        let sender_addr = signer::address_of(sender);
        let gift = table::borrow_mut(&mut store.gifts, gift_id);
        assert!(gift.sender == sender_addr, error::permission_denied(E_NOT_SENDER));
        assert!(!gift.reclaimed, error::invalid_state(E_NOT_EXPIRED));
        let (_, timestamp) = block::get_block_info();
        assert!(timestamp >= gift.expires_at, error::invalid_state(E_NOT_EXPIRED));

        let unclaimed = gift.slot_count - gift.slots_claimed;
        let per_slot = gift.per_slot_amount;
        let total = gift.total_amount;
        let paid_out = per_slot * gift.slots_claimed;
        let refund = total - paid_out;
        let denom = gift.denom;
        let id = gift.id;

        gift.reclaimed = true;

        if (refund > 0) {
            let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
            let metadata = coin::denom_to_metadata(denom);
            coin::transfer(&vault_signer, sender_addr, metadata, refund);
        };

        event::emit(GroupGiftReclaimed {
            id,
            sender: sender_addr,
            refund_amount: refund,
            timestamp,
        });
        let _ = unclaimed;
    }

    // ===== View functions =====

    #[view]
    public fun get_group_summary(gift_id: u64): (address, u64, u64, u64, u64, String, u8, u64, bool) acquires GroupStore {
        let store = borrow_global<GroupStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));
        let g = table::borrow(&store.gifts, gift_id);
        (
            g.sender,
            g.total_amount,
            g.per_slot_amount,
            g.slot_count,
            g.slots_claimed,
            g.denom,
            g.theme,
            g.expires_at,
            g.reclaimed,
        )
    }

    #[view]
    public fun slot_claimed(gift_id: u64, slot_index: u64): bool acquires GroupStore {
        let store = borrow_global<GroupStore>(@ori);
        if (!table::contains(&store.gifts, gift_id)) return false;
        let g = table::borrow(&store.gifts, gift_id);
        if (slot_index >= g.slot_count) return false;
        *vector::borrow(&g.slot_claimed, slot_index)
    }

    #[view]
    public fun vault_address(): address acquires GroupStore {
        borrow_global<GroupStore>(@ori).vault_addr
    }

    // ===== Internal =====

    fun effective_ttl(ttl_seconds: u64): u64 {
        if (ttl_seconds == 0) { return DEFAULT_TTL_SECONDS };
        assert!(
            ttl_seconds >= MIN_TTL_SECONDS && ttl_seconds <= MAX_TTL_SECONDS,
            error::invalid_argument(E_INVALID_TTL),
        );
        ttl_seconds
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
    fun setup(chain: &signer, funded: address, amount: u64) {
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
        coin::mint_to(&mint_cap, funded, amount);
        let _ = mint_cap; let _ = _bc; let _ = _fc;
    }

    #[test_only]
    fun hash_for_slot(secret: vector<u8>, slot_index: u64): vector<u8> {
        let buf = secret;
        vector::append(&mut buf, bcs::to_bytes(&slot_index));
        hash::sha2_256(buf)
    }

    #[test(chain = @ori, sender = @0xA11CE, alice = @0xB0B, bob = @0xCA01)]
    fun test_create_and_claim_two_slots(
        chain: &signer,
        sender: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires GroupStore {
        setup(chain, signer::address_of(sender), 1_000_000);

        let secret = b"shared-base-secret";
        let hashes = vector::empty<vector<u8>>();
        vector::push_back(&mut hashes, hash_for_slot(secret, 0));
        vector::push_back(&mut hashes, hash_for_slot(secret, 1));

        create_group_gift(
            sender,
            string::utf8(TEST_DENOM),
            20_000,
            2,
            0,
            string::utf8(b"enjoy"),
            hashes,
            0,
        );

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(vault_address(), metadata) == 20_000, 100);

        claim_group_slot(alice, 1, 0, secret);
        assert!(coin::balance(signer::address_of(alice), metadata) == 10_000, 101);
        assert!(slot_claimed(1, 0), 102);

        claim_group_slot(bob, 1, 1, secret);
        assert!(coin::balance(signer::address_of(bob), metadata) == 10_000, 103);
        assert!(slot_claimed(1, 1), 104);
        assert!(coin::balance(vault_address(), metadata) == 0, 105);
    }

    #[test(chain = @ori, sender = @0xA11CE, alice = @0xB0B)]
    #[expected_failure(abort_code = 0x8000d, location = Self)]
    fun test_same_claimer_twice_aborts(
        chain: &signer,
        sender: &signer,
        alice: &signer,
    ) acquires GroupStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        let secret = b"s";
        let hashes = vector::empty<vector<u8>>();
        vector::push_back(&mut hashes, hash_for_slot(secret, 0));
        vector::push_back(&mut hashes, hash_for_slot(secret, 1));
        create_group_gift(sender, string::utf8(TEST_DENOM), 2_000, 2, 0, string::utf8(b""), hashes, 0);
        claim_group_slot(alice, 1, 0, secret);
        claim_group_slot(alice, 1, 1, secret); // same claimer -> aborts
    }

    #[test(chain = @ori, sender = @0xA11CE, alice = @0xB0B)]
    #[expected_failure(abort_code = 0x1000a, location = Self)]
    fun test_wrong_secret_aborts(
        chain: &signer,
        sender: &signer,
        alice: &signer,
    ) acquires GroupStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        let secret = b"correct";
        let hashes = vector::empty<vector<u8>>();
        vector::push_back(&mut hashes, hash_for_slot(secret, 0));
        vector::push_back(&mut hashes, hash_for_slot(secret, 1));
        create_group_gift(sender, string::utf8(TEST_DENOM), 2_000, 2, 0, string::utf8(b""), hashes, 0);
        claim_group_slot(alice, 1, 0, b"wrong");
    }

    #[test(chain = @ori, sender = @0xA11CE)]
    fun test_reclaim_expired(chain: &signer, sender: &signer) acquires GroupStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        initia_std::block::set_block_info(1, 1000);
        let secret = b"s";
        let hashes = vector::empty<vector<u8>>();
        vector::push_back(&mut hashes, hash_for_slot(secret, 0));
        vector::push_back(&mut hashes, hash_for_slot(secret, 1));
        create_group_gift(sender, string::utf8(TEST_DENOM), 10_000, 2, 0, string::utf8(b""), hashes, MIN_TTL_SECONDS);

        initia_std::block::set_block_info(2, 1000 + MIN_TTL_SECONDS + 1);
        reclaim_expired_group(sender, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        // Started with 1M, deposited 10k, nobody claimed, fully refunded -> 1M.
        assert!(coin::balance(signer::address_of(sender), metadata) == 1_000_000, 300);
    }
}
