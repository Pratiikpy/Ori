/// Paywall -- pay-once to unlock a gated resource.
///
/// Creator publishes a paywall (title + price + denom). Anyone can purchase;
/// on successful payment, the purchaser is granted on-chain access. A hosted
/// resource (article markdown, file URL, API response) is gated off-chain by
/// calling the `has_access(paywall_id, user)` view fn.
///
/// Platform takes a 1% cut matching tip_jar. Creator receives the rest.
///
/// Attribution: paywall primitive from Ferdi-svg/InitPage's x402 gating;
/// fee-split pattern from `ori::tip_jar`.
module ori::paywall {
    use std::signer;
    use std::string::String;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::fungible_asset;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_PAYWALL_NOT_FOUND: u64 = 2;
    const E_ZERO_PRICE: u64 = 3;
    const E_ALREADY_PURCHASED: u64 = 4;
    const E_NOT_CREATOR: u64 = 5;
    const E_INACTIVE: u64 = 6;
    const E_NOT_ADMIN: u64 = 7;
    const E_TITLE_TOO_LONG: u64 = 8;
    const E_URI_TOO_LONG: u64 = 9;

    // ===== Constants =====
    const PLATFORM_FEE_BPS: u64 = 100;
    const BPS_DENOMINATOR: u64 = 10_000;
    const MAX_TITLE_LEN: u64 = 200;
    const MAX_URI_LEN: u64 = 512;

    // ===== Storage =====

    struct PaywallStore has key {
        next_id: u64,
        paywalls: Table<u64, Paywall>,
        /// Composite access table keyed by (paywall_id, buyer).
        access: Table<AccessKey, u64>, // value = purchased_at timestamp
        admin: address,
        treasury: address,
        total_sales: u64,
        total_revenue: u64,
    }

    struct Paywall has store, drop {
        id: u64,
        creator: address,
        title: String,
        /// Off-chain URI (ipfs://, https://) where the gated content lives.
        /// Not kept secret -- hosting enforces access via `has_access`.
        resource_uri: String,
        price: u64,
        denom: String,
        purchases: u64,
        gross_revenue: u64,
        active: bool,
        created_at: u64,
    }

    struct AccessKey has copy, drop, store {
        paywall_id: u64,
        buyer: address,
    }

    // ===== Events =====

    #[event]
    struct PaywallCreated has drop, store {
        id: u64,
        creator: address,
        title: String,
        resource_uri: String,
        price: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct PaywallPurchased has drop, store {
        id: u64,
        buyer: address,
        creator: address,
        gross_amount: u64,
        net_amount: u64,
        fee_amount: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct PaywallDeactivated has drop, store {
        id: u64,
        creator: address,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let admin = signer::address_of(deployer);
        move_to(deployer, PaywallStore {
            next_id: 1,
            paywalls: table::new(),
            access: table::new(),
            admin,
            treasury: admin,
            total_sales: 0,
            total_revenue: 0,
        });
    }

    // ===== Entry functions =====

    public entry fun create_paywall(
        creator: &signer,
        title: String,
        resource_uri: String,
        price: u64,
        denom: String,
    ) acquires PaywallStore {
        assert!(exists<PaywallStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(price > 0, error::invalid_argument(E_ZERO_PRICE));
        assert!(
            std::string::length(&title) <= MAX_TITLE_LEN,
            error::invalid_argument(E_TITLE_TOO_LONG),
        );
        assert!(
            std::string::length(&resource_uri) <= MAX_URI_LEN,
            error::invalid_argument(E_URI_TOO_LONG),
        );

        let creator_addr = signer::address_of(creator);
        let store = borrow_global_mut<PaywallStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;
        let (_, ts) = block::get_block_info();

        table::add(&mut store.paywalls, id, Paywall {
            id,
            creator: creator_addr,
            title,
            resource_uri,
            price,
            denom,
            purchases: 0,
            gross_revenue: 0,
            active: true,
            created_at: ts,
        });

        event::emit(PaywallCreated {
            id,
            creator: creator_addr,
            title,
            resource_uri,
            price,
            denom,
            timestamp: ts,
        });
    }

    public entry fun purchase(buyer: &signer, paywall_id: u64) acquires PaywallStore {
        let store = borrow_global_mut<PaywallStore>(@ori);
        assert!(
            table::contains(&store.paywalls, paywall_id),
            error::not_found(E_PAYWALL_NOT_FOUND),
        );
        let buyer_addr = signer::address_of(buyer);
        let key = AccessKey { paywall_id, buyer: buyer_addr };
        assert!(
            !table::contains(&store.access, key),
            error::already_exists(E_ALREADY_PURCHASED),
        );

        let price;
        let denom;
        let creator;
        {
            let paywall = table::borrow_mut(&mut store.paywalls, paywall_id);
            assert!(paywall.active, error::invalid_state(E_INACTIVE));
            price = paywall.price;
            denom = paywall.denom;
            creator = paywall.creator;
            paywall.purchases = paywall.purchases + 1;
            paywall.gross_revenue = paywall.gross_revenue + price;
        };

        let fee = price * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
        let net = price - fee;
        let metadata = coin::denom_to_metadata(denom);
        let payout = coin::withdraw(buyer, metadata, price);
        if (fee > 0) {
            let creator_portion = fungible_asset::extract(&mut payout, net);
            coin::deposit(creator, creator_portion);
            coin::deposit(store.treasury, payout);
        } else {
            coin::deposit(creator, payout);
        };

        let (_, ts) = block::get_block_info();
        table::add(&mut store.access, key, ts);
        store.total_sales = store.total_sales + 1;
        store.total_revenue = store.total_revenue + price;

        event::emit(PaywallPurchased {
            id: paywall_id,
            buyer: buyer_addr,
            creator,
            gross_amount: price,
            net_amount: net,
            fee_amount: fee,
            denom,
            timestamp: ts,
        });
    }

    public entry fun deactivate_paywall(
        creator: &signer,
        paywall_id: u64,
    ) acquires PaywallStore {
        let store = borrow_global_mut<PaywallStore>(@ori);
        assert!(
            table::contains(&store.paywalls, paywall_id),
            error::not_found(E_PAYWALL_NOT_FOUND),
        );
        let paywall = table::borrow_mut(&mut store.paywalls, paywall_id);
        assert!(
            signer::address_of(creator) == paywall.creator,
            error::permission_denied(E_NOT_CREATOR),
        );
        paywall.active = false;
        let (_, ts) = block::get_block_info();
        event::emit(PaywallDeactivated { id: paywall_id, creator: paywall.creator, timestamp: ts });
    }

    public entry fun set_treasury(admin: &signer, new_treasury: address) acquires PaywallStore {
        let store = borrow_global_mut<PaywallStore>(@ori);
        assert!(
            signer::address_of(admin) == store.admin,
            error::permission_denied(E_NOT_ADMIN),
        );
        store.treasury = new_treasury;
    }

    // ===== View functions =====

    #[view]
    public fun has_access(paywall_id: u64, user: address): bool acquires PaywallStore {
        if (!exists<PaywallStore>(@ori)) return false;
        let store = borrow_global<PaywallStore>(@ori);
        table::contains(&store.access, AccessKey { paywall_id, buyer: user })
    }

    #[view]
    public fun get_paywall(
        paywall_id: u64,
    ): (address, String, String, u64, String, u64, u64, bool) acquires PaywallStore {
        let store = borrow_global<PaywallStore>(@ori);
        assert!(
            table::contains(&store.paywalls, paywall_id),
            error::not_found(E_PAYWALL_NOT_FOUND),
        );
        let p = table::borrow(&store.paywalls, paywall_id);
        (p.creator, p.title, p.resource_uri, p.price, p.denom, p.purchases, p.gross_revenue, p.active)
    }

    #[view]
    public fun total_sales(): u64 acquires PaywallStore {
        borrow_global<PaywallStore>(@ori).total_sales
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

    #[test(chain = @ori, creator = @0xBEEF, buyer = @0xA11CE)]
    fun test_create_purchase_access(
        chain: &signer,
        creator: &signer,
        buyer: &signer,
    ) acquires PaywallStore {
        setup(chain, signer::address_of(buyer), 1_000_000);
        create_paywall(
            creator,
            string::utf8(b"My Article"),
            string::utf8(b"ipfs://bafy/article.md"),
            100_000,
            string::utf8(TEST_DENOM),
        );
        assert!(!has_access(1, signer::address_of(buyer)), 100);
        purchase(buyer, 1);
        assert!(has_access(1, signer::address_of(buyer)), 101);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(signer::address_of(creator), metadata) == 99_000, 102);
        assert!(coin::balance(@ori, metadata) == 1_000, 103);
    }

    #[test(chain = @ori, creator = @0xBEEF, buyer = @0xA11CE)]
    #[expected_failure(abort_code = 0x80004, location = Self)]
    fun test_double_purchase_aborts(
        chain: &signer,
        creator: &signer,
        buyer: &signer,
    ) acquires PaywallStore {
        setup(chain, signer::address_of(buyer), 1_000_000);
        create_paywall(creator, string::utf8(b"t"), string::utf8(b"u"), 100, string::utf8(TEST_DENOM));
        purchase(buyer, 1);
        purchase(buyer, 1);
    }

    #[test(chain = @ori, creator = @0xBEEF, buyer = @0xA11CE)]
    #[expected_failure(abort_code = 0x30006, location = Self)]
    fun test_purchase_inactive_aborts(
        chain: &signer,
        creator: &signer,
        buyer: &signer,
    ) acquires PaywallStore {
        setup(chain, signer::address_of(buyer), 1_000_000);
        create_paywall(creator, string::utf8(b"t"), string::utf8(b"u"), 100, string::utf8(TEST_DENOM));
        deactivate_paywall(creator, 1);
        purchase(buyer, 1);
    }

    #[test(chain = @ori, creator = @0xBEEF)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun test_zero_price_aborts(chain: &signer, creator: &signer) acquires PaywallStore {
        primary_fungible_store::init_module_for_test();
        init_module(chain);
        create_paywall(creator, string::utf8(b"t"), string::utf8(b"u"), 0, string::utf8(TEST_DENOM));
    }
}
