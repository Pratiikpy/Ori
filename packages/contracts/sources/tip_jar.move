/// Tip Jar -- creator monetization with 1% platform fee + OBS overlay events.
///
/// Uses the withdraw / extract / deposit pattern from stream-pay's
/// tip_with_message() for atomic, gas-safe fee splitting.
///
/// Attribution: fee-splitting model from SandeshKhilari01/Stream-Pay (mainnet).
module ori::tip_jar {
    use std::signer;
    use std::string::String;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::fungible_asset;

    // ===== Errors =====
    const E_NOT_ADMIN: u64 = 1;
    const E_ZERO_AMOUNT: u64 = 2;
    const E_SELF_TIP: u64 = 3;
    const E_CONFIG_NOT_INITIALIZED: u64 = 4;

    // ===== Constants =====
    const PLATFORM_FEE_BPS: u64 = 100;   // 1%
    const BPS_DENOMINATOR: u64 = 10_000;
    const MAX_RECENT_PER_CREATOR: u64 = 50;

    // ===== Storage =====

    struct Config has key {
        admin: address,
        treasury: address,
        total_tips_count: u64,
        total_volume: u64,
    }

    /// Compact tip record stored on-chain for UI pagination. We keep the last
    /// `MAX_RECENT_PER_CREATOR` tips per creator as a bounded ring buffer so
    /// gas stays predictable even for popular accounts.
    struct TipRecord has store, copy, drop {
        tipper: address,
        amount: u64,
        fee_amount: u64,
        denom: String,
        message: String,
        timestamp: u64,
    }

    struct RecentTips has key {
        per_creator: initia_std::table::Table<address, vector<TipRecord>>,
    }

    // ===== Events =====

    #[event]
    struct TipSent has drop, store {
        tipper: address,
        creator: address,
        gross_amount: u64,
        net_amount: u64,
        fee_amount: u64,
        denom: String,
        message: String,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        move_to(admin, Config {
            admin: admin_addr,
            treasury: admin_addr,
            total_tips_count: 0,
            total_volume: 0,
        });
        move_to(admin, RecentTips {
            per_creator: initia_std::table::new(),
        });
    }

    /// Append a tip record to the creator's bounded ring buffer. Keeps
    /// only the latest MAX_RECENT_PER_CREATOR entries.
    fun append_recent(creator: address, record: TipRecord) acquires RecentTips {
        if (!exists<RecentTips>(@ori)) return;
        let recent = borrow_global_mut<RecentTips>(@ori);
        if (!initia_std::table::contains(&recent.per_creator, creator)) {
            initia_std::table::add(&mut recent.per_creator, creator, std::vector::empty<TipRecord>());
        };
        let list = initia_std::table::borrow_mut(&mut recent.per_creator, creator);
        std::vector::push_back(list, record);
        // Trim oldest if over cap.
        while (std::vector::length(list) > MAX_RECENT_PER_CREATOR) {
            std::vector::remove(list, 0);
        };
    }

    // ===== Entry functions =====

    public entry fun tip(
        tipper: &signer,
        creator: address,
        denom: String,
        amount: u64,
        message: String,
    ) acquires Config, RecentTips {
        assert!(exists<Config>(@ori), error::invalid_state(E_CONFIG_NOT_INITIALIZED));
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        let tipper_addr = signer::address_of(tipper);
        assert!(tipper_addr != creator, error::invalid_argument(E_SELF_TIP));

        let cfg = borrow_global_mut<Config>(@ori);
        let metadata = coin::denom_to_metadata(denom);

        let fee_amount = amount * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        let net_amount = amount - fee_amount;

        let payout = coin::withdraw(tipper, metadata, amount);
        if (fee_amount > 0) {
            let creator_portion = fungible_asset::extract(&mut payout, net_amount);
            coin::deposit(creator, creator_portion);
            coin::deposit(cfg.treasury, payout);
        } else {
            coin::deposit(creator, payout);
        };

        cfg.total_tips_count = cfg.total_tips_count + 1;
        cfg.total_volume = cfg.total_volume + amount;

        let (_, timestamp) = block::get_block_info();
        event::emit(TipSent {
            tipper: tipper_addr,
            creator,
            gross_amount: amount,
            net_amount,
            fee_amount,
            denom,
            message,
            timestamp,
        });

        append_recent(creator, TipRecord {
            tipper: tipper_addr,
            amount,
            fee_amount,
            denom,
            message,
            timestamp,
        });
    }

    public entry fun set_treasury(admin: &signer, new_treasury: address) acquires Config {
        assert!(exists<Config>(@ori), error::invalid_state(E_CONFIG_NOT_INITIALIZED));
        let cfg = borrow_global_mut<Config>(@ori);
        assert!(signer::address_of(admin) == cfg.admin, error::permission_denied(E_NOT_ADMIN));
        cfg.treasury = new_treasury;
    }

    // ===== View functions =====

    #[view]
    public fun calculate_fee(amount: u64): (u64, u64) {
        let fee = amount * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        (fee, amount - fee)
    }

    #[view]
    public fun get_treasury(): address acquires Config { borrow_global<Config>(@ori).treasury }

    #[view]
    public fun total_tips_count(): u64 acquires Config { borrow_global<Config>(@ori).total_tips_count }

    #[view]
    public fun total_volume(): u64 acquires Config { borrow_global<Config>(@ori).total_volume }

    /// Paginated recent-tip list for a creator. `offset` is 0-indexed from the
    /// newest tip; `limit` is capped at the ring-buffer size.
    #[view]
    public fun get_recent_tips(
        creator: address,
        offset: u64,
        limit: u64,
    ): vector<TipRecord> acquires RecentTips {
        let out = std::vector::empty<TipRecord>();
        if (!exists<RecentTips>(@ori)) return out;
        let recent = borrow_global<RecentTips>(@ori);
        if (!initia_std::table::contains(&recent.per_creator, creator)) return out;
        let list = initia_std::table::borrow(&recent.per_creator, creator);
        let total = std::vector::length(list);
        if (total == 0 || offset >= total) return out;
        // Walk newest-first: index from the end.
        let mut_taken: u64 = 0;
        let i = 0;
        while (i < total && mut_taken < limit) {
            let idx_from_end = total - 1 - i;
            if (i >= offset) {
                std::vector::push_back(&mut out, *std::vector::borrow(list, idx_from_end));
                mut_taken = mut_taken + 1;
            };
            i = i + 1;
        };
        out
    }

    #[view]
    public fun recent_tips_count(creator: address): u64 acquires RecentTips {
        if (!exists<RecentTips>(@ori)) return 0;
        let recent = borrow_global<RecentTips>(@ori);
        if (!initia_std::table::contains(&recent.per_creator, creator)) return 0;
        std::vector::length(initia_std::table::borrow(&recent.per_creator, creator))
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
    fun setup(chain: &signer, tipper_addr: address, amount: u64) {
        primary_fungible_store::init_module_for_test();
        init_module(chain);
        let (mint_cap, _burn_cap, _freeze_cap) = coin::initialize(
            chain,
            option::none(),
            string::utf8(b"Ori Test"),
            string::utf8(TEST_DENOM),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        coin::mint_to(&mint_cap, tipper_addr, amount);
        let _ = mint_cap; let _ = _burn_cap; let _ = _freeze_cap;
    }

    #[test]
    fun test_fee_math_standard() {
        let (fee, net) = calculate_fee(1_000_000);
        assert!(fee == 10_000, 100);
        assert!(net == 990_000, 101);
    }

    #[test]
    fun test_fee_math_tiny() {
        let (fee, net) = calculate_fee(99);
        assert!(fee == 0, 200);
        assert!(net == 99, 201);
    }

    #[test(chain = @ori, alice = @0xA11CE, creator = @0xBEEF)]
    fun test_tip_splits_fee(chain: &signer, alice: &signer, creator: &signer) acquires Config, RecentTips {
        let alice_addr = signer::address_of(alice);
        let creator_addr = signer::address_of(creator);
        setup(chain, alice_addr, 1_000_000);

        tip(alice, creator_addr, string::utf8(TEST_DENOM), 100_000, string::utf8(b"gg"));

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        // 1% fee = 1000, net = 99000
        assert!(coin::balance(alice_addr, metadata) == 900_000, 300);
        assert!(coin::balance(creator_addr, metadata) == 99_000, 301);
        assert!(coin::balance(@ori, metadata) == 1_000, 302);
        assert!(total_tips_count() == 1, 303);
        assert!(total_volume() == 100_000, 304);
    }

    #[test(chain = @ori, alice = @0xA11CE, creator = @0xBEEF)]
    fun test_tip_tiny_no_fee_all_to_creator(chain: &signer, alice: &signer, creator: &signer) acquires Config, RecentTips {
        let alice_addr = signer::address_of(alice);
        let creator_addr = signer::address_of(creator);
        setup(chain, alice_addr, 500);

        tip(alice, creator_addr, string::utf8(TEST_DENOM), 50, string::utf8(b""));

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        // 50 * 100 / 10000 = 0 -> creator gets all 50
        assert!(coin::balance(creator_addr, metadata) == 50, 400);
        assert!(coin::balance(@ori, metadata) == 0, 401);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun test_self_tip_aborts(chain: &signer, alice: &signer) acquires Config, RecentTips {
        setup(chain, signer::address_of(alice), 1000);
        tip(alice, signer::address_of(alice), string::utf8(TEST_DENOM), 100, string::utf8(b""));
    }

    #[test(chain = @ori, alice = @0xA11CE, creator = @0xBEEF)]
    #[expected_failure(abort_code = 0x10002, location = Self)]
    fun test_zero_amount_aborts(chain: &signer, alice: &signer, creator: &signer) acquires Config, RecentTips {
        setup(chain, signer::address_of(alice), 1000);
        tip(alice, signer::address_of(creator), string::utf8(TEST_DENOM), 0, string::utf8(b""));
    }

    #[test(chain = @ori, alice = @0xA11CE, new_t = @0xAAAA)]
    fun test_admin_can_change_treasury(chain: &signer, alice: &signer, new_t: &signer) acquires Config {
        let _ = alice;
        init_module(chain);
        set_treasury(chain, signer::address_of(new_t));
        assert!(get_treasury() == signer::address_of(new_t), 500);
    }

    #[test(chain = @ori, not_admin = @0xDEAD)]
    #[expected_failure(abort_code = 0x50001, location = Self)]
    fun test_non_admin_cannot_change_treasury(chain: &signer, not_admin: &signer) acquires Config {
        init_module(chain);
        set_treasury(not_admin, @0xAAAA);
    }
}
