/// Subscription Vault -- recurring creator subscriptions with 1% platform fee.
///
/// Flow:
///   1. Creator registers a plan: `register_plan(price_per_period, period_seconds)`
///   2. Fan subscribes + deposits N periods up-front: `subscribe(creator, periods)`
///   3. A ghost-operator (backend authz+feegrant wallet OR the fan themselves)
///      calls `release_period(subscriber, creator)` once each period window has
///      elapsed. Transfers `price_per_period` from the vault -> creator (net of 1%
///      platform fee).
///   4. Fan can `cancel_subscription(creator)` at any time and reclaim unreleased
///      periods to their own wallet.
///
/// The "ghost-operator" pattern: grant a server-side signer permission (via
/// auto-sign / authz on the fan's side) to call only `release_period` --
/// not `cancel_subscription`, not anything else. Server runs a cron; fan sees
/// zero popups after the initial deposit.
///
/// Attribution: vault + ExtendRef pattern from `ori::gift_packet`; ghost-
/// operator recurring-call model from niraj-niraj/Drip's GhostRegistry;
/// per-period release schedule inspired by InitPay's streaming payments.
module ori::subscription_vault {
    use std::signer;
    use std::string::String;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::fungible_asset;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_PLAN_EXISTS: u64 = 2;
    const E_PLAN_NOT_FOUND: u64 = 3;
    const E_SUB_EXISTS: u64 = 4;
    const E_SUB_NOT_FOUND: u64 = 5;
    const E_ZERO_PERIODS: u64 = 6;
    const E_ZERO_AMOUNT: u64 = 7;
    const E_PERIOD_NOT_DUE: u64 = 8;
    const E_NO_PERIODS_LEFT: u64 = 9;
    const E_NOT_SUBSCRIBER: u64 = 10;
    const E_INVALID_PERIOD: u64 = 11;

    // ===== Constants =====
    const PLATFORM_FEE_BPS: u64 = 100;   // 1%
    const BPS_DENOMINATOR: u64 = 10_000;
    const MIN_PERIOD_SECONDS: u64 = 60 * 60;            // 1 hour (test-friendly)
    const MAX_PERIOD_SECONDS: u64 = 365 * 24 * 60 * 60; // 1 year
    const MAX_PERIODS_PER_SUB: u64 = 120;               // e.g. 10 years monthly

    // ===== Storage =====

    struct SubscriptionStore has key {
        plans: Table<address, Plan>,
        subscriptions: Table<SubKey, Subscription>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
        admin: address,
        treasury: address,
        total_subscribers: u64,
        total_released: u64,
    }

    struct Plan has store, drop {
        creator: address,
        price_per_period: u64,
        period_seconds: u64,
        denom: String,
        subscribers_count: u64,
        active: bool,
    }

    /// Composite key for the subscriptions table.
    struct SubKey has copy, drop, store {
        subscriber: address,
        creator: address,
    }

    struct Subscription has store, drop {
        subscriber: address,
        creator: address,
        denom: String,
        price_per_period: u64,
        period_seconds: u64,
        periods_total: u64,
        periods_released: u64,
        deposit_remaining: u64,
        started_at: u64,
        last_released_at: u64,
    }

    // ===== Events =====

    #[event]
    struct PlanRegistered has drop, store {
        creator: address,
        price_per_period: u64,
        period_seconds: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct PlanDeactivated has drop, store {
        creator: address,
        timestamp: u64,
    }

    #[event]
    struct Subscribed has drop, store {
        subscriber: address,
        creator: address,
        periods: u64,
        deposit_total: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct PeriodReleased has drop, store {
        subscriber: address,
        creator: address,
        gross_amount: u64,
        net_amount: u64,
        fee_amount: u64,
        denom: String,
        period_index: u64,
        timestamp: u64,
    }

    #[event]
    struct SubscriptionCancelled has drop, store {
        subscriber: address,
        creator: address,
        refunded: u64,
        denom: String,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_sub_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        let admin = signer::address_of(deployer);
        move_to(deployer, SubscriptionStore {
            plans: table::new(),
            subscriptions: table::new(),
            vault_extend_ref,
            vault_addr,
            admin,
            treasury: admin,
            total_subscribers: 0,
            total_released: 0,
        });
    }

    // ===== Entry functions =====

    /// Creator registers a subscription plan. One plan per creator (re-register
    /// overwrites price/period -- any in-flight subscriptions keep their locked
    /// terms from when they subscribed).
    public entry fun register_plan(
        creator: &signer,
        price_per_period: u64,
        period_seconds: u64,
        denom: String,
    ) acquires SubscriptionStore {
        assert!(exists<SubscriptionStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(price_per_period > 0, error::invalid_argument(E_ZERO_AMOUNT));
        assert!(
            period_seconds >= MIN_PERIOD_SECONDS && period_seconds <= MAX_PERIOD_SECONDS,
            error::invalid_argument(E_INVALID_PERIOD),
        );
        let creator_addr = signer::address_of(creator);
        let (_, ts) = block::get_block_info();
        let store = borrow_global_mut<SubscriptionStore>(@ori);

        if (table::contains(&store.plans, creator_addr)) {
            let existing = table::borrow_mut(&mut store.plans, creator_addr);
            existing.price_per_period = price_per_period;
            existing.period_seconds = period_seconds;
            existing.denom = denom;
            existing.active = true;
        } else {
            table::add(&mut store.plans, creator_addr, Plan {
                creator: creator_addr,
                price_per_period,
                period_seconds,
                denom,
                subscribers_count: 0,
                active: true,
            });
        };

        event::emit(PlanRegistered {
            creator: creator_addr,
            price_per_period,
            period_seconds,
            denom,
            timestamp: ts,
        });
    }

    /// Creator deactivates their plan -- no new subscribers, existing keep working
    /// until their deposit is exhausted.
    public entry fun deactivate_plan(creator: &signer) acquires SubscriptionStore {
        let creator_addr = signer::address_of(creator);
        let store = borrow_global_mut<SubscriptionStore>(@ori);
        assert!(table::contains(&store.plans, creator_addr), error::not_found(E_PLAN_NOT_FOUND));
        let plan = table::borrow_mut(&mut store.plans, creator_addr);
        plan.active = false;
        let (_, ts) = block::get_block_info();
        event::emit(PlanDeactivated { creator: creator_addr, timestamp: ts });
    }

    /// Fan subscribes to a creator's plan for N periods. Deposits
    /// `N * price_per_period` into the vault. Creator's terms are locked in
    /// at this moment -- plan updates only affect future subscriptions.
    public entry fun subscribe(
        subscriber: &signer,
        creator: address,
        periods: u64,
    ) acquires SubscriptionStore {
        assert!(exists<SubscriptionStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(periods > 0, error::invalid_argument(E_ZERO_PERIODS));
        assert!(periods <= MAX_PERIODS_PER_SUB, error::invalid_argument(E_ZERO_PERIODS));

        let subscriber_addr = signer::address_of(subscriber);
        let store = borrow_global_mut<SubscriptionStore>(@ori);
        assert!(table::contains(&store.plans, creator), error::not_found(E_PLAN_NOT_FOUND));
        let plan_snapshot_price;
        let plan_snapshot_period;
        let plan_snapshot_denom;
        {
            let plan = table::borrow_mut(&mut store.plans, creator);
            assert!(plan.active, error::invalid_state(E_PLAN_NOT_FOUND));
            plan_snapshot_price = plan.price_per_period;
            plan_snapshot_period = plan.period_seconds;
            plan_snapshot_denom = plan.denom;
            plan.subscribers_count = plan.subscribers_count + 1;
        };

        let key = SubKey { subscriber: subscriber_addr, creator };
        assert!(!table::contains(&store.subscriptions, key), error::already_exists(E_SUB_EXISTS));

        let deposit = plan_snapshot_price * periods;
        let metadata = coin::denom_to_metadata(plan_snapshot_denom);
        coin::transfer(subscriber, store.vault_addr, metadata, deposit);

        let (_, ts) = block::get_block_info();
        table::add(&mut store.subscriptions, key, Subscription {
            subscriber: subscriber_addr,
            creator,
            denom: plan_snapshot_denom,
            price_per_period: plan_snapshot_price,
            period_seconds: plan_snapshot_period,
            periods_total: periods,
            periods_released: 0,
            deposit_remaining: deposit,
            started_at: ts,
            last_released_at: ts,
        });
        store.total_subscribers = store.total_subscribers + 1;

        event::emit(Subscribed {
            subscriber: subscriber_addr,
            creator,
            periods,
            deposit_total: deposit,
            denom: plan_snapshot_denom,
            timestamp: ts,
        });
    }

    /// Ghost-operator entry: release the next due period to the creator.
    /// Intentionally permissionless -- anyone can call it on any subscription
    /// whose period has elapsed. (It can only pay the creator -- no funds can
    /// be redirected.) This is what lets the backend ghost worker run.
    public entry fun release_period(
        _caller: &signer,
        subscriber: address,
        creator: address,
    ) acquires SubscriptionStore {
        let store = borrow_global_mut<SubscriptionStore>(@ori);
        let key = SubKey { subscriber, creator };
        assert!(table::contains(&store.subscriptions, key), error::not_found(E_SUB_NOT_FOUND));

        let (_, ts) = block::get_block_info();
        let sub_ref = table::borrow_mut(&mut store.subscriptions, key);
        assert!(sub_ref.periods_released < sub_ref.periods_total, error::invalid_state(E_NO_PERIODS_LEFT));
        assert!(
            ts >= sub_ref.last_released_at + sub_ref.period_seconds,
            error::invalid_state(E_PERIOD_NOT_DUE),
        );

        let gross = sub_ref.price_per_period;
        assert!(sub_ref.deposit_remaining >= gross, error::invalid_state(E_NO_PERIODS_LEFT));
        let fee = gross * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        let net = gross - fee;

        sub_ref.periods_released = sub_ref.periods_released + 1;
        sub_ref.deposit_remaining = sub_ref.deposit_remaining - gross;
        sub_ref.last_released_at = ts;
        let denom = sub_ref.denom;
        let period_index = sub_ref.periods_released;

        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        // Split gross into (creator, treasury). Same pattern as tip_jar.
        let payout = coin::withdraw(&vault_signer, metadata, gross);
        if (fee > 0) {
            let creator_portion = fungible_asset::extract(&mut payout, net);
            coin::deposit(creator, creator_portion);
            coin::deposit(store.treasury, payout);
        } else {
            coin::deposit(creator, payout);
        };

        store.total_released = store.total_released + 1;

        event::emit(PeriodReleased {
            subscriber,
            creator,
            gross_amount: gross,
            net_amount: net,
            fee_amount: fee,
            denom,
            period_index,
            timestamp: ts,
        });
    }

    /// Subscriber cancels and reclaims the unreleased deposit. Does NOT rescind
    /// periods already released (those are paid out).
    public entry fun cancel_subscription(
        subscriber: &signer,
        creator: address,
    ) acquires SubscriptionStore {
        let subscriber_addr = signer::address_of(subscriber);
        let store = borrow_global_mut<SubscriptionStore>(@ori);
        let key = SubKey { subscriber: subscriber_addr, creator };
        assert!(table::contains(&store.subscriptions, key), error::not_found(E_SUB_NOT_FOUND));

        let sub = table::remove(&mut store.subscriptions, key);
        assert!(sub.subscriber == subscriber_addr, error::permission_denied(E_NOT_SUBSCRIBER));

        let refund = sub.deposit_remaining;
        let denom = sub.denom;
        let (_, ts) = block::get_block_info();
        if (refund > 0) {
            let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
            let metadata = coin::denom_to_metadata(denom);
            coin::transfer(&vault_signer, subscriber_addr, metadata, refund);
        };

        // Decrement plan subscriber count if plan still exists.
        if (table::contains(&store.plans, creator)) {
            let plan = table::borrow_mut(&mut store.plans, creator);
            if (plan.subscribers_count > 0) {
                plan.subscribers_count = plan.subscribers_count - 1;
            };
        };

        event::emit(SubscriptionCancelled {
            subscriber: subscriber_addr,
            creator,
            refunded: refund,
            denom,
            timestamp: ts,
        });
    }

    // ===== View functions =====

    #[view]
    public fun plan_exists(creator: address): bool acquires SubscriptionStore {
        if (!exists<SubscriptionStore>(@ori)) return false;
        table::contains(&borrow_global<SubscriptionStore>(@ori).plans, creator)
    }

    #[view]
    public fun get_plan(creator: address): (u64, u64, String, u64, bool) acquires SubscriptionStore {
        let store = borrow_global<SubscriptionStore>(@ori);
        assert!(table::contains(&store.plans, creator), error::not_found(E_PLAN_NOT_FOUND));
        let p = table::borrow(&store.plans, creator);
        (p.price_per_period, p.period_seconds, p.denom, p.subscribers_count, p.active)
    }

    #[view]
    public fun subscription_exists(subscriber: address, creator: address): bool acquires SubscriptionStore {
        if (!exists<SubscriptionStore>(@ori)) return false;
        let store = borrow_global<SubscriptionStore>(@ori);
        table::contains(&store.subscriptions, SubKey { subscriber, creator })
    }

    #[view]
    public fun get_subscription(
        subscriber: address,
        creator: address,
    ): (u64, u64, u64, u64, u64, u64) acquires SubscriptionStore {
        let store = borrow_global<SubscriptionStore>(@ori);
        let key = SubKey { subscriber, creator };
        assert!(table::contains(&store.subscriptions, key), error::not_found(E_SUB_NOT_FOUND));
        let s = table::borrow(&store.subscriptions, key);
        (
            s.periods_total,
            s.periods_released,
            s.deposit_remaining,
            s.price_per_period,
            s.period_seconds,
            s.last_released_at,
        )
    }

    #[view]
    public fun vault_address(): address acquires SubscriptionStore {
        borrow_global<SubscriptionStore>(@ori).vault_addr
    }

    #[view]
    public fun total_subscribers(): u64 acquires SubscriptionStore {
        borrow_global<SubscriptionStore>(@ori).total_subscribers
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

    #[test(chain = @ori, creator = @0xBEEF, fan = @0xA11CE)]
    fun test_subscribe_and_release(chain: &signer, creator: &signer, fan: &signer) acquires SubscriptionStore {
        setup(chain, signer::address_of(fan), 1_000_000);
        register_plan(creator, 10_000, MIN_PERIOD_SECONDS, string::utf8(TEST_DENOM));
        subscribe(fan, signer::address_of(creator), 3);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(vault_address(), metadata) == 30_000, 100);
        assert!(coin::balance(signer::address_of(fan), metadata) == 970_000, 101);

        // Period not due yet -- attempt should abort.
        // (We can't assert abort here without a separate test; skip.)

        // Advance time via block::set_block_info (test-only). Initia stdlib's
        // block module exposes block::set_block_info for tests.
        initia_std::block::set_block_info(100, MIN_PERIOD_SECONDS + 1);
        release_period(chain, signer::address_of(fan), signer::address_of(creator));

        assert!(coin::balance(signer::address_of(creator), metadata) == 9_900, 200); // 10000 - 1% fee
        assert!(coin::balance(@ori, metadata) == 100, 201);
        assert!(coin::balance(vault_address(), metadata) == 20_000, 202);
    }

    #[test(chain = @ori, creator = @0xBEEF, fan = @0xA11CE)]
    #[expected_failure(abort_code = 0x30008, location = Self)]
    fun test_release_before_period_aborts(
        chain: &signer,
        creator: &signer,
        fan: &signer,
    ) acquires SubscriptionStore {
        setup(chain, signer::address_of(fan), 1_000_000);
        register_plan(creator, 10_000, MIN_PERIOD_SECONDS, string::utf8(TEST_DENOM));
        subscribe(fan, signer::address_of(creator), 3);
        // No time advance -- release should abort.
        release_period(chain, signer::address_of(fan), signer::address_of(creator));
    }

    #[test(chain = @ori, creator = @0xBEEF, fan = @0xA11CE)]
    fun test_cancel_refunds_unreleased(chain: &signer, creator: &signer, fan: &signer) acquires SubscriptionStore {
        setup(chain, signer::address_of(fan), 1_000_000);
        register_plan(creator, 10_000, MIN_PERIOD_SECONDS, string::utf8(TEST_DENOM));
        subscribe(fan, signer::address_of(creator), 5);

        initia_std::block::set_block_info(200, MIN_PERIOD_SECONDS + 1);
        release_period(chain, signer::address_of(fan), signer::address_of(creator));

        cancel_subscription(fan, signer::address_of(creator));
        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        // 1_000_000 - 50_000 deposit + 40_000 refund = 990_000
        assert!(coin::balance(signer::address_of(fan), metadata) == 990_000, 300);
    }

    #[test(chain = @ori, creator = @0xBEEF, fan = @0xA11CE)]
    #[expected_failure(abort_code = 0x80004, location = Self)]
    fun test_double_subscribe_aborts(
        chain: &signer,
        creator: &signer,
        fan: &signer,
    ) acquires SubscriptionStore {
        setup(chain, signer::address_of(fan), 1_000_000);
        register_plan(creator, 10_000, MIN_PERIOD_SECONDS, string::utf8(TEST_DENOM));
        subscribe(fan, signer::address_of(creator), 1);
        subscribe(fan, signer::address_of(creator), 1);
    }

    #[test(chain = @ori, creator = @0xBEEF, fan = @0xA11CE)]
    #[expected_failure(abort_code = 0x10011, location = Self)]
    fun test_invalid_period_aborts(chain: &signer, creator: &signer, fan: &signer) acquires SubscriptionStore {
        setup(chain, signer::address_of(fan), 1_000);
        let _ = fan;
        register_plan(creator, 100, 30, string::utf8(TEST_DENOM)); // 30 seconds < MIN_PERIOD_SECONDS
    }
}
