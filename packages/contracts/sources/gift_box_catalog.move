/// Gift Box Catalog -- curated, themed gift-packet templates.
///
/// Admin registers named "boxes" (Birthday, Thanks, Congrats, ...) with art
/// + colors + theme tag. Frontend shows them as a picker when the sender
/// creates a gift. The box itself doesn't hold funds -- it's metadata that
/// gets referenced when calling `gift_packet::create_directed_gift` with
/// the box's `theme` value, and the UI renders the box's art on the claim
/// page.
///
/// Featured ordering lets Ori promote seasonal sets. Disabled boxes stay
/// visible in old gifts but don't show up in the picker.
///
/// Attribution: catalog + featured-ordering pattern from ocean2fly/iUSD-Pay
/// `gift_box_v2.move`. Art URIs expected to be IPFS `ipfs://` or HTTPS CDN URLs.
module ori::gift_box_catalog {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_NOT_ADMIN: u64 = 2;
    const E_BOX_NOT_FOUND: u64 = 3;
    const E_NAME_TOO_LONG: u64 = 4;
    const E_URI_TOO_LONG: u64 = 5;
    const E_DESC_TOO_LONG: u64 = 6;
    const E_INVALID_THEME: u64 = 7;
    const E_INVALID_ORDER: u64 = 8;

    // ===== Constants =====
    const MAX_NAME_LEN: u64 = 40;
    const MAX_URI_LEN: u64 = 512;
    const MAX_DESC_LEN: u64 = 140;
    const MAX_THEME: u8 = 4;

    // ===== Storage =====

    struct Catalog has key {
        next_id: u64,
        boxes: Table<u64, BoxDef>,
        all_ids: vector<u64>,
        admin: address,
    }

    struct BoxDef has store, copy, drop {
        id: u64,
        name: String,
        theme: u8,                 // matches `gift_packet::theme`
        image_uri: String,
        description: String,
        accent_hex: String,        // e.g. "#ec4899"
        featured_order: u64,       // 0 = unfeatured; higher = shown first
        active: bool,
        created_at: u64,
    }

    // ===== Events =====

    #[event]
    struct BoxRegistered has drop, store {
        id: u64,
        name: String,
        theme: u8,
        timestamp: u64,
    }

    #[event]
    struct BoxUpdated has drop, store {
        id: u64,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        move_to(deployer, Catalog {
            next_id: 1,
            boxes: table::new(),
            all_ids: vector::empty(),
            admin: signer::address_of(deployer),
        });
    }

    // ===== Entry functions =====

    public entry fun register_box(
        admin: &signer,
        name: String,
        theme: u8,
        image_uri: String,
        description: String,
        accent_hex: String,
        featured_order: u64,
    ) acquires Catalog {
        assert!(exists<Catalog>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let catalog = borrow_global_mut<Catalog>(@ori);
        assert!(
            signer::address_of(admin) == catalog.admin,
            error::permission_denied(E_NOT_ADMIN),
        );
        validate_inputs(&name, &image_uri, &description, theme);
        assert!(featured_order <= 100, error::invalid_argument(E_INVALID_ORDER));

        let id = catalog.next_id;
        catalog.next_id = id + 1;
        let (_, ts) = block::get_block_info();

        table::add(&mut catalog.boxes, id, BoxDef {
            id,
            name,
            theme,
            image_uri,
            description,
            accent_hex,
            featured_order,
            active: true,
            created_at: ts,
        });
        vector::push_back(&mut catalog.all_ids, id);

        event::emit(BoxRegistered { id, name, theme, timestamp: ts });
    }

    public entry fun update_box(
        admin: &signer,
        box_id: u64,
        name: String,
        image_uri: String,
        description: String,
        accent_hex: String,
        featured_order: u64,
        active: bool,
    ) acquires Catalog {
        let catalog = borrow_global_mut<Catalog>(@ori);
        assert!(
            signer::address_of(admin) == catalog.admin,
            error::permission_denied(E_NOT_ADMIN),
        );
        assert!(table::contains(&catalog.boxes, box_id), error::not_found(E_BOX_NOT_FOUND));
        let b = table::borrow_mut(&mut catalog.boxes, box_id);
        validate_inputs(&name, &image_uri, &description, b.theme);
        b.name = name;
        b.image_uri = image_uri;
        b.description = description;
        b.accent_hex = accent_hex;
        b.featured_order = featured_order;
        b.active = active;
        let (_, ts) = block::get_block_info();
        event::emit(BoxUpdated { id: box_id, timestamp: ts });
    }

    public entry fun transfer_admin(current: &signer, new_admin: address) acquires Catalog {
        let catalog = borrow_global_mut<Catalog>(@ori);
        assert!(
            signer::address_of(current) == catalog.admin,
            error::permission_denied(E_NOT_ADMIN),
        );
        catalog.admin = new_admin;
    }

    // ===== View functions =====

    #[view]
    public fun total_boxes(): u64 acquires Catalog {
        if (!exists<Catalog>(@ori)) return 0;
        vector::length(&borrow_global<Catalog>(@ori).all_ids)
    }

    #[view]
    public fun get_box(box_id: u64): BoxDef acquires Catalog {
        let catalog = borrow_global<Catalog>(@ori);
        assert!(table::contains(&catalog.boxes, box_id), error::not_found(E_BOX_NOT_FOUND));
        *table::borrow(&catalog.boxes, box_id)
    }

    #[view]
    public fun list_active_ids(): vector<u64> acquires Catalog {
        let out = vector::empty<u64>();
        if (!exists<Catalog>(@ori)) return out;
        let catalog = borrow_global<Catalog>(@ori);
        let i = 0;
        let n = vector::length(&catalog.all_ids);
        while (i < n) {
            let id = *vector::borrow(&catalog.all_ids, i);
            let b = table::borrow(&catalog.boxes, id);
            if (b.active) {
                vector::push_back(&mut out, id);
            };
            i = i + 1;
        };
        out
    }

    #[view]
    public fun list_all(): vector<BoxDef> acquires Catalog {
        let out = vector::empty<BoxDef>();
        if (!exists<Catalog>(@ori)) return out;
        let catalog = borrow_global<Catalog>(@ori);
        let i = 0;
        let n = vector::length(&catalog.all_ids);
        while (i < n) {
            let id = *vector::borrow(&catalog.all_ids, i);
            vector::push_back(&mut out, *table::borrow(&catalog.boxes, id));
            i = i + 1;
        };
        out
    }

    #[view]
    public fun get_admin(): address acquires Catalog {
        borrow_global<Catalog>(@ori).admin
    }

    // ===== Internal =====

    fun validate_inputs(name: &String, image_uri: &String, description: &String, theme: u8) {
        assert!(string::length(name) <= MAX_NAME_LEN, error::invalid_argument(E_NAME_TOO_LONG));
        assert!(string::length(image_uri) <= MAX_URI_LEN, error::invalid_argument(E_URI_TOO_LONG));
        assert!(string::length(description) <= MAX_DESC_LEN, error::invalid_argument(E_DESC_TOO_LONG));
        assert!(theme <= MAX_THEME, error::invalid_argument(E_INVALID_THEME));
    }

    // ===== Tests =====

    #[test(chain = @ori)]
    fun test_init(chain: &signer) acquires Catalog {
        init_module(chain);
        assert!(total_boxes() == 0, 100);
    }

    #[test(chain = @ori)]
    fun test_register_and_list(chain: &signer) acquires Catalog {
        init_module(chain);
        register_box(
            chain,
            string::utf8(b"Birthday"),
            1,
            string::utf8(b"ipfs://bday.png"),
            string::utf8(b"Happy birthday!"),
            string::utf8(b"#ec4899"),
            10,
        );
        register_box(
            chain,
            string::utf8(b"Thanks"),
            0,
            string::utf8(b"ipfs://thanks.png"),
            string::utf8(b"Small thanks"),
            string::utf8(b"#10b981"),
            5,
        );
        assert!(total_boxes() == 2, 200);
        let ids = list_active_ids();
        assert!(vector::length(&ids) == 2, 201);
        let box = get_box(1);
        assert!(box.theme == 1, 202);
    }

    #[test(chain = @ori, bad = @0xBAD)]
    #[expected_failure(abort_code = 0x50002, location = Self)]
    fun test_only_admin_can_register(chain: &signer, bad: &signer) acquires Catalog {
        init_module(chain);
        register_box(
            bad,
            string::utf8(b"x"),
            0,
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b"#000000"),
            0,
        );
    }

    #[test(chain = @ori)]
    fun test_deactivate_hides_from_active_list(chain: &signer) acquires Catalog {
        init_module(chain);
        register_box(
            chain,
            string::utf8(b"Birthday"),
            1,
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b"#fff"),
            0,
        );
        update_box(
            chain,
            1,
            string::utf8(b"Birthday"),
            string::utf8(b""),
            string::utf8(b""),
            string::utf8(b"#fff"),
            0,
            false,
        );
        let active = list_active_ids();
        assert!(vector::length(&active) == 0, 400);
        assert!(total_boxes() == 1, 401);
    }
}
