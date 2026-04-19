/// Gift Packet -- wrapped payments with themed UX, link-claim virality,
/// and reclaim-after-expiry.
///
/// Modes:
///   DIRECT -- sender designates a specific recipient, recipient claims when ready
///   LINK   -- sender creates with secret_hash; anyone holding matching secret claims
///            (this powers the payment-link viral loop)
///
/// Architecture uses the Object + ExtendRef vault pattern from hunch's
/// MarketStore: funds escrow in a vault Object we control via a stored
/// ExtendRef. On claim (or reclaim-after-expiry), we generate a signer from
/// the ExtendRef and use it to release funds.
///
/// Attribution: packet state machine from ocean2fly/iUSD-Pay's gift_v3.move
/// (mainnet); vault ExtendRef pattern from RedGnad/Hunch's prediction_market.
module ori::gift_packet {
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::hash;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ZERO_AMOUNT: u64 = 2;
    const E_INVALID_THEME: u64 = 3;
    const E_INVALID_SECRET_HASH: u64 = 4;
    const E_GIFT_NOT_FOUND: u64 = 5;
    const E_NOT_RECIPIENT: u64 = 6;
    const E_ALREADY_CLAIMED: u64 = 7;
    const E_SECRET_MISMATCH: u64 = 8;
    const E_WRONG_MODE: u64 = 9;
    const E_NOT_SENDER: u64 = 10;
    const E_NOT_EXPIRED: u64 = 11;
    const E_INVALID_TTL: u64 = 12;

    // ===== Constants =====
    const MODE_DIRECT: u8 = 0;
    const MODE_LINK: u8 = 1;

    const MAX_THEME: u8 = 4;
    const SHA256_LEN: u64 = 32;

    const MIN_TTL_SECONDS: u64 = 60 * 60;              // 1 hour
    const MAX_TTL_SECONDS: u64 = 30 * 24 * 60 * 60;    // 30 days
    const DEFAULT_TTL_SECONDS: u64 = 7 * 24 * 60 * 60; // 7 days

    // ===== Storage =====

    struct GiftStore has key {
        next_id: u64,
        gifts: Table<u64, Gift>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
    }

    struct Gift has store, drop {
        id: u64,
        sender: address,
        /// @0x0 means "link gift -- anyone with secret can claim"
        recipient: address,
        amount: u64,
        denom: String,
        theme: u8,
        message: String,
        mode: u8,
        /// SHA-256(secret). Empty for DIRECT mode.
        secret_hash: vector<u8>,
        claimed: bool,
        claimed_by: address,
        created_at: u64,
        expires_at: u64,
        claimed_at: u64,
        reclaimed: bool,
    }

    // ===== Events =====

    #[event]
    struct GiftCreated has drop, store {
        id: u64,
        sender: address,
        recipient: address,
        amount: u64,
        denom: String,
        theme: u8,
        mode: u8,
        /// Included so the event listener can correlate off-chain PaymentLink
        /// records by their stored secret_hash without needing a separate PATCH.
        secret_hash: vector<u8>,
        expires_at: u64,
        timestamp: u64,
    }

    #[event]
    struct GiftClaimed has drop, store {
        id: u64,
        claimer: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct GiftReclaimed has drop, store {
        id: u64,
        sender: address,
        amount: u64,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_gift_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);

        move_to(deployer, GiftStore {
            next_id: 1,
            gifts: table::new(),
            vault_extend_ref,
            vault_addr,
        });
    }

    // ===== Entry functions =====

    public entry fun create_directed_gift(
        sender: &signer,
        recipient: address,
        denom: String,
        amount: u64,
        theme: u8,
        message: String,
        ttl_seconds: u64,
    ) acquires GiftStore {
        assert!(exists<GiftStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(theme <= MAX_THEME, error::invalid_argument(E_INVALID_THEME));
        let ttl = effective_ttl(ttl_seconds);

        let store = borrow_global_mut<GiftStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;

        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(sender, store.vault_addr, metadata, amount);

        let sender_addr = signer::address_of(sender);
        let (_, timestamp) = block::get_block_info();
        let expires_at = timestamp + ttl;

        let gift = Gift {
            id,
            sender: sender_addr,
            recipient,
            amount,
            denom,
            theme,
            message,
            mode: MODE_DIRECT,
            secret_hash: vector::empty(),
            claimed: false,
            claimed_by: @0x0,
            created_at: timestamp,
            expires_at,
            claimed_at: 0,
            reclaimed: false,
        };

        table::add(&mut store.gifts, id, gift);

        event::emit(GiftCreated {
            id, sender: sender_addr, recipient, amount, denom, theme,
            mode: MODE_DIRECT, secret_hash: vector::empty(), expires_at, timestamp,
        });
    }

    public entry fun create_link_gift(
        sender: &signer,
        denom: String,
        amount: u64,
        theme: u8,
        message: String,
        secret_hash: vector<u8>,
        ttl_seconds: u64,
    ) acquires GiftStore {
        assert!(exists<GiftStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(theme <= MAX_THEME, error::invalid_argument(E_INVALID_THEME));
        assert!(
            vector::length(&secret_hash) == SHA256_LEN,
            error::invalid_argument(E_INVALID_SECRET_HASH),
        );
        let ttl = effective_ttl(ttl_seconds);

        let store = borrow_global_mut<GiftStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;

        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(sender, store.vault_addr, metadata, amount);

        let sender_addr = signer::address_of(sender);
        let (_, timestamp) = block::get_block_info();
        let expires_at = timestamp + ttl;

        let gift = Gift {
            id,
            sender: sender_addr,
            recipient: @0x0,
            amount,
            denom,
            theme,
            message,
            mode: MODE_LINK,
            secret_hash,
            claimed: false,
            claimed_by: @0x0,
            created_at: timestamp,
            expires_at,
            claimed_at: 0,
            reclaimed: false,
        };

        table::add(&mut store.gifts, id, gift);

        event::emit(GiftCreated {
            id, sender: sender_addr, recipient: @0x0, amount, denom, theme,
            mode: MODE_LINK, secret_hash, expires_at, timestamp,
        });
    }

    public entry fun claim_directed_gift(
        claimer: &signer,
        gift_id: u64,
    ) acquires GiftStore {
        let store = borrow_global_mut<GiftStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));

        let gift = table::borrow_mut(&mut store.gifts, gift_id);
        assert!(gift.mode == MODE_DIRECT, error::invalid_argument(E_WRONG_MODE));
        assert!(!gift.claimed, error::invalid_state(E_ALREADY_CLAIMED));
        assert!(!gift.reclaimed, error::invalid_state(E_ALREADY_CLAIMED));

        let claimer_addr = signer::address_of(claimer);
        assert!(gift.recipient == claimer_addr, error::permission_denied(E_NOT_RECIPIENT));

        let (_, timestamp) = block::get_block_info();
        gift.claimed = true;
        gift.claimed_by = claimer_addr;
        gift.claimed_at = timestamp;

        let amount = gift.amount;
        let denom = gift.denom;
        let id = gift.id;
        release_from_vault(&store.vault_extend_ref, claimer_addr, denom, amount);

        event::emit(GiftClaimed { id, claimer: claimer_addr, amount, timestamp });
    }

    public entry fun claim_link_gift(
        claimer: &signer,
        gift_id: u64,
        secret: vector<u8>,
    ) acquires GiftStore {
        let store = borrow_global_mut<GiftStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));

        let gift = table::borrow_mut(&mut store.gifts, gift_id);
        assert!(gift.mode == MODE_LINK, error::invalid_argument(E_WRONG_MODE));
        assert!(!gift.claimed, error::invalid_state(E_ALREADY_CLAIMED));
        assert!(!gift.reclaimed, error::invalid_state(E_ALREADY_CLAIMED));

        let computed_hash = hash::sha2_256(secret);
        assert!(computed_hash == gift.secret_hash, error::invalid_argument(E_SECRET_MISMATCH));

        let claimer_addr = signer::address_of(claimer);
        let (_, timestamp) = block::get_block_info();
        gift.claimed = true;
        gift.claimed_by = claimer_addr;
        gift.claimed_at = timestamp;

        let amount = gift.amount;
        let denom = gift.denom;
        let id = gift.id;
        release_from_vault(&store.vault_extend_ref, claimer_addr, denom, amount);

        event::emit(GiftClaimed { id, claimer: claimer_addr, amount, timestamp });
    }

    /// Sender reclaims an unclaimed gift AFTER its expiry. Prevents funds from
    /// being lost when a link goes unshared.
    public entry fun reclaim_expired_gift(sender: &signer, gift_id: u64) acquires GiftStore {
        let store = borrow_global_mut<GiftStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));

        let gift = table::borrow_mut(&mut store.gifts, gift_id);
        let sender_addr = signer::address_of(sender);
        assert!(gift.sender == sender_addr, error::permission_denied(E_NOT_SENDER));
        assert!(!gift.claimed, error::invalid_state(E_ALREADY_CLAIMED));
        assert!(!gift.reclaimed, error::invalid_state(E_ALREADY_CLAIMED));

        let (_, timestamp) = block::get_block_info();
        assert!(timestamp >= gift.expires_at, error::invalid_state(E_NOT_EXPIRED));

        gift.reclaimed = true;

        let amount = gift.amount;
        let denom = gift.denom;
        let id = gift.id;
        release_from_vault(&store.vault_extend_ref, sender_addr, denom, amount);

        event::emit(GiftReclaimed { id, sender: sender_addr, amount, timestamp });
    }

    // ===== View functions =====

    #[view]
    public fun gift_exists(gift_id: u64): bool acquires GiftStore {
        let store = borrow_global<GiftStore>(@ori);
        table::contains(&store.gifts, gift_id)
    }

    #[view]
    public fun get_gift_summary(
        gift_id: u64,
    ): (address, address, u64, String, u8, u8, bool, bool, u64) acquires GiftStore {
        let store = borrow_global<GiftStore>(@ori);
        assert!(table::contains(&store.gifts, gift_id), error::not_found(E_GIFT_NOT_FOUND));
        let g = table::borrow(&store.gifts, gift_id);
        (g.sender, g.recipient, g.amount, g.denom, g.theme, g.mode, g.claimed, g.reclaimed, g.expires_at)
    }

    #[view]
    public fun vault_address(): address acquires GiftStore {
        borrow_global<GiftStore>(@ori).vault_addr
    }

    // ===== Internal =====

    fun effective_ttl(ttl_seconds: u64): u64 {
        if (ttl_seconds == 0) {
            return DEFAULT_TTL_SECONDS
        };
        assert!(
            ttl_seconds >= MIN_TTL_SECONDS && ttl_seconds <= MAX_TTL_SECONDS,
            error::invalid_argument(E_INVALID_TTL),
        );
        ttl_seconds
    }

    fun release_from_vault(
        extend_ref: &ExtendRef,
        recipient: address,
        denom: String,
        amount: u64,
    ) {
        let vault_signer = object::generate_signer_for_extending(extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(&vault_signer, recipient, metadata, amount);
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
    fun test_secret_and_hash(): (vector<u8>, vector<u8>) {
        let s = b"super-secret-from-url-fragment";
        (s, hash::sha2_256(s))
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_directed_roundtrip(chain: &signer, alice: &signer, bob: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 1_000_000);
        create_directed_gift(
            alice,
            signer::address_of(bob),
            string::utf8(TEST_DENOM),
            5_000,
            1, // birthday
            string::utf8(b"happy bday"),
            0, // default TTL
        );
        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        // Funds moved into vault
        assert!(coin::balance(vault_address(), metadata) == 5_000, 100);

        claim_directed_gift(bob, 1);
        assert!(coin::balance(signer::address_of(bob), metadata) == 5_000, 101);
        assert!(coin::balance(vault_address(), metadata) == 0, 102);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x50006, location = Self)]
    fun test_directed_wrong_claimer(chain: &signer, alice: &signer, bob: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 10_000);
        create_directed_gift(alice, @0xBEEF, string::utf8(TEST_DENOM), 100, 0, string::utf8(b""), 0);
        claim_directed_gift(bob, 1); // bob != intended recipient (0xBEEF)
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_link_gift_roundtrip(chain: &signer, alice: &signer, bob: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 1_000_000);
        let (secret, h) = test_secret_and_hash();
        create_link_gift(
            alice,
            string::utf8(TEST_DENOM),
            20_000,
            0,
            string::utf8(b"claim me"),
            h,
            0,
        );
        claim_link_gift(bob, 1, secret);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(signer::address_of(bob), metadata) == 20_000, 200);
        assert!(coin::balance(vault_address(), metadata) == 0, 201);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x10008, location = Self)]
    fun test_link_wrong_secret_aborts(chain: &signer, alice: &signer, bob: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 10_000);
        let (_secret, h) = test_secret_and_hash();
        create_link_gift(alice, string::utf8(TEST_DENOM), 100, 0, string::utf8(b""), h, 0);
        claim_link_gift(bob, 1, b"wrong-secret-bytes");
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x30007, location = Self)]
    fun test_double_claim_aborts(chain: &signer, alice: &signer, bob: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 10_000);
        let (secret, h) = test_secret_and_hash();
        create_link_gift(alice, string::utf8(TEST_DENOM), 100, 0, string::utf8(b""), h, 0);
        claim_link_gift(bob, 1, secret);
        claim_link_gift(bob, 1, secret); // second claim must abort
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x3000b, location = Self)]
    fun test_reclaim_before_expiry_aborts(chain: &signer, alice: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 10_000);
        create_directed_gift(alice, @0xBEEF, string::utf8(TEST_DENOM), 100, 0, string::utf8(b""), 0);
        // block time is 0 in tests -> reclaim must see not-yet-expired
        reclaim_expired_gift(alice, 1);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_reclaim_after_expiry_returns_funds(chain: &signer, alice: &signer) acquires GiftStore {
        setup(chain, signer::address_of(alice), 10_000);
        initia_std::block::set_block_info(1, 0);
        create_directed_gift(alice, @0xBEEF, string::utf8(TEST_DENOM), 100, 0, string::utf8(b""), 3_600);
        // Fast-forward past expiry.
        initia_std::block::set_block_info(2, 4_000);
        reclaim_expired_gift(alice, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(signer::address_of(alice), metadata) == 10_000, 600);
        assert!(coin::balance(vault_address(), metadata) == 0, 601);
    }
}
