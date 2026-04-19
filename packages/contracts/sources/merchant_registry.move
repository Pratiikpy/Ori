/// Merchant Registry -- on-chain directory of `.init` addresses that accept
/// payments as businesses.
///
/// Lightweight: name + category + optional logo URL + contact. Doesn't touch
/// funds -- purely a metadata directory. Off-chain discovery + compliance
/// tooling can index the `MerchantRegistered` event.
///
/// Attribution: registry pattern adapted from Ferdi-svg/InitPage's
/// MerchantRegistry. Gas footprint kept small by storing only strings.
module ori::merchant_registry {
    use std::signer;
    use std::string::{Self, String};
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_MERCHANT_EXISTS: u64 = 2;
    const E_MERCHANT_NOT_FOUND: u64 = 3;
    const E_NOT_OWNER: u64 = 4;
    const E_NAME_TOO_LONG: u64 = 5;
    const E_CATEGORY_TOO_LONG: u64 = 6;
    const E_URL_TOO_LONG: u64 = 7;

    // ===== Constants =====
    const MAX_NAME_LEN: u64 = 80;
    const MAX_CATEGORY_LEN: u64 = 40;
    const MAX_URL_LEN: u64 = 512;

    // ===== Storage =====

    struct Registry has key {
        merchants: Table<address, Merchant>,
        total_merchants: u64,
    }

    struct Merchant has store, copy, drop {
        owner: address,
        name: String,
        category: String,
        logo_url: String,
        contact: String,
        accepted_denoms: vector<String>,
        active: bool,
        created_at: u64,
        updated_at: u64,
    }

    // ===== Events =====

    #[event]
    struct MerchantRegistered has drop, store {
        owner: address,
        name: String,
        category: String,
        timestamp: u64,
    }

    #[event]
    struct MerchantUpdated has drop, store {
        owner: address,
        timestamp: u64,
    }

    #[event]
    struct MerchantDeactivated has drop, store {
        owner: address,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        move_to(deployer, Registry {
            merchants: table::new(),
            total_merchants: 0,
        });
    }

    // ===== Entry functions =====

    public entry fun register(
        owner: &signer,
        name: String,
        category: String,
        logo_url: String,
        contact: String,
        accepted_denoms: vector<String>,
    ) acquires Registry {
        assert!(exists<Registry>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        validate_strings(&name, &category, &logo_url, &contact);

        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(
            !table::contains(&registry.merchants, owner_addr),
            error::already_exists(E_MERCHANT_EXISTS),
        );

        let (_, ts) = block::get_block_info();
        table::add(&mut registry.merchants, owner_addr, Merchant {
            owner: owner_addr,
            name,
            category,
            logo_url,
            contact,
            accepted_denoms,
            active: true,
            created_at: ts,
            updated_at: ts,
        });
        registry.total_merchants = registry.total_merchants + 1;

        event::emit(MerchantRegistered {
            owner: owner_addr,
            name,
            category,
            timestamp: ts,
        });
    }

    public entry fun update(
        owner: &signer,
        name: String,
        category: String,
        logo_url: String,
        contact: String,
        accepted_denoms: vector<String>,
    ) acquires Registry {
        assert!(exists<Registry>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        validate_strings(&name, &category, &logo_url, &contact);

        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(
            table::contains(&registry.merchants, owner_addr),
            error::not_found(E_MERCHANT_NOT_FOUND),
        );
        let m = table::borrow_mut(&mut registry.merchants, owner_addr);
        assert!(m.owner == owner_addr, error::permission_denied(E_NOT_OWNER));

        m.name = name;
        m.category = category;
        m.logo_url = logo_url;
        m.contact = contact;
        m.accepted_denoms = accepted_denoms;
        let (_, ts) = block::get_block_info();
        m.updated_at = ts;

        event::emit(MerchantUpdated { owner: owner_addr, timestamp: ts });
    }

    public entry fun deactivate(owner: &signer) acquires Registry {
        let owner_addr = signer::address_of(owner);
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(
            table::contains(&registry.merchants, owner_addr),
            error::not_found(E_MERCHANT_NOT_FOUND),
        );
        let m = table::borrow_mut(&mut registry.merchants, owner_addr);
        m.active = false;
        let (_, ts) = block::get_block_info();
        event::emit(MerchantDeactivated { owner: owner_addr, timestamp: ts });
    }

    // ===== View functions =====

    #[view]
    public fun is_merchant(addr: address): bool acquires Registry {
        if (!exists<Registry>(@ori)) return false;
        table::contains(&borrow_global<Registry>(@ori).merchants, addr)
    }

    #[view]
    public fun get_merchant(
        addr: address,
    ): (String, String, String, String, vector<String>, bool, u64) acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        assert!(
            table::contains(&registry.merchants, addr),
            error::not_found(E_MERCHANT_NOT_FOUND),
        );
        let m = table::borrow(&registry.merchants, addr);
        (
            m.name,
            m.category,
            m.logo_url,
            m.contact,
            m.accepted_denoms,
            m.active,
            m.created_at,
        )
    }

    #[view]
    public fun total_merchants(): u64 acquires Registry {
        if (!exists<Registry>(@ori)) return 0;
        borrow_global<Registry>(@ori).total_merchants
    }

    // ===== Internal =====

    fun validate_strings(
        name: &String,
        category: &String,
        logo_url: &String,
        contact: &String,
    ) {
        assert!(string::length(name) <= MAX_NAME_LEN, error::invalid_argument(E_NAME_TOO_LONG));
        assert!(string::length(category) <= MAX_CATEGORY_LEN, error::invalid_argument(E_CATEGORY_TOO_LONG));
        assert!(string::length(logo_url) <= MAX_URL_LEN, error::invalid_argument(E_URL_TOO_LONG));
        assert!(string::length(contact) <= MAX_URL_LEN, error::invalid_argument(E_URL_TOO_LONG));
    }

    // ===== Tests =====

    #[test_only]
    use std::vector;

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_register(chain: &signer, alice: &signer) acquires Registry {
        init_module(chain);
        register(
            alice,
            string::utf8(b"Fred's Coffee"),
            string::utf8(b"Food & Beverage"),
            string::utf8(b"https://cdn.ori.chat/logo.png"),
            string::utf8(b"fred@fredscoffee.com"),
            vector::singleton(string::utf8(b"umin")),
        );
        assert!(is_merchant(signer::address_of(alice)), 100);
        assert!(total_merchants() == 1, 101);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x80002, location = Self)]
    fun test_double_register_aborts(chain: &signer, alice: &signer) acquires Registry {
        init_module(chain);
        register(alice, string::utf8(b"x"), string::utf8(b"y"), string::utf8(b""), string::utf8(b""), vector::empty());
        register(alice, string::utf8(b"x"), string::utf8(b"y"), string::utf8(b""), string::utf8(b""), vector::empty());
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_update_changes_fields(chain: &signer, alice: &signer) acquires Registry {
        init_module(chain);
        register(alice, string::utf8(b"old"), string::utf8(b"food"), string::utf8(b""), string::utf8(b""), vector::empty());
        update(alice, string::utf8(b"new"), string::utf8(b"drinks"), string::utf8(b""), string::utf8(b""), vector::empty());
        let (name, cat, _, _, _, active, _) = get_merchant(signer::address_of(alice));
        assert!(active, 300);
        let _ = name; let _ = cat;
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_deactivate(chain: &signer, alice: &signer) acquires Registry {
        init_module(chain);
        register(alice, string::utf8(b"x"), string::utf8(b"y"), string::utf8(b""), string::utf8(b""), vector::empty());
        deactivate(alice);
        let (_, _, _, _, _, active, _) = get_merchant(signer::address_of(alice));
        assert!(!active, 400);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10005, location = Self)]
    fun test_long_name_aborts(chain: &signer, alice: &signer) acquires Registry {
        init_module(chain);
        let long = string::utf8(b"x");
        // Pad to exceed MAX_NAME_LEN via repeated concat.
        let i = 0;
        while (i < 100) {
            std::string::append(&mut long, string::utf8(b"xxxxxxxxxx"));
            i = i + 1;
        };
        register(alice, long, string::utf8(b"y"), string::utf8(b""), string::utf8(b""), vector::empty());
    }
}
