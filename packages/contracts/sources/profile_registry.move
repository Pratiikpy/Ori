/// Profile Registry -- extended profile data per address on the Ori rollup.
///
/// Pattern adapted from jordi-stack/initia-link/contracts/move/profile_registry/sources/profile_registry.move
/// (which ships on-chain as profile_registry::profile_registry on initialink-1).
/// We extend the data model with: X25519 encryption pubkey + privacy flags, and
/// drop the on-chain follow graph (we keep social graph off-chain for lower gas).
///
/// The authoritative `.init` name resolution lives on Initia L1's `usernames`
/// module -- this module stores only the per-address rich profile data.
module ori::profile_registry {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_PROFILE_EXISTS: u64 = 1;
    const E_PROFILE_NOT_FOUND: u64 = 2;
    const E_BIO_TOO_LONG: u64 = 3;
    const E_AVATAR_TOO_LONG: u64 = 4;
    const E_TOO_MANY_LINKS: u64 = 5;
    const E_LINKS_LABELS_MISMATCH: u64 = 6;
    const E_PUBKEY_INVALID_LENGTH: u64 = 7;
    const E_THEME_TOO_LONG: u64 = 8;
    const E_SLUG_INVALID: u64 = 9;
    const E_SLUG_TAKEN: u64 = 10;
    const E_SLUG_TOO_LONG: u64 = 11;

    // ===== Constants =====
    const MAX_BIO_LENGTH: u64 = 280;
    const MAX_AVATAR_LENGTH: u64 = 512;
    const MAX_LINKS: u64 = 10;
    const MAX_THEME_LENGTH: u64 = 600;  // JSON blob
    const MIN_SLUG_LENGTH: u64 = 3;
    const MAX_SLUG_LENGTH: u64 = 32;
    const X25519_PUBKEY_LENGTH: u64 = 32;

    // ===== Structs =====

    struct Profile has store, copy, drop {
        owner: address,
        bio: String,
        avatar_url: String,
        links: vector<String>,
        link_labels: vector<String>,
        encryption_pubkey: vector<u8>,
        hide_balance: bool,
        hide_activity: bool,
        whitelist_only_messages: bool,
        created_at: u64,
        updated_at: u64,
        exists: bool,
    }

    struct Registry has key {
        profiles: Table<address, Profile>,
        all_profiles: vector<address>,
        /// Per-profile theming (JSON blob) -- frontend renders custom bg/accent.
        /// Separate table so Profile struct layout stays stable.
        themes: Table<address, String>,
        /// Lowercase creator slug -> address. Enables `ori.chat/c/{slug}` URLs.
        slug_to_address: Table<String, address>,
        /// Reverse lookup so we can show the slug on a profile page.
        address_to_slug: Table<address, String>,
    }

    // ===== Events =====

    #[event]
    struct ProfileCreated has drop, store {
        owner: address,
        timestamp: u64,
    }

    #[event]
    struct ProfileUpdated has drop, store {
        owner: address,
        timestamp: u64,
    }

    #[event]
    struct EncryptionPubkeySet has drop, store {
        owner: address,
    }

    // ===== Init =====

    fun init_module(account: &signer) {
        move_to(account, Registry {
            profiles: table::new(),
            all_profiles: vector::empty(),
            themes: table::new(),
            slug_to_address: table::new(),
            address_to_slug: table::new(),
        });
    }

    // ===== Entry functions =====

    public entry fun create_profile(
        account: &signer,
        bio: String,
        avatar_url: String,
        links: vector<String>,
        link_labels: vector<String>,
    ) acquires Registry {
        let sender = signer::address_of(account);
        let registry = borrow_global_mut<Registry>(@ori);

        assert!(!table::contains(&registry.profiles, sender), error::already_exists(E_PROFILE_EXISTS));
        assert!(string::length(&bio) <= MAX_BIO_LENGTH, error::invalid_argument(E_BIO_TOO_LONG));
        assert!(string::length(&avatar_url) <= MAX_AVATAR_LENGTH, error::invalid_argument(E_AVATAR_TOO_LONG));
        assert!(vector::length(&links) <= MAX_LINKS, error::invalid_argument(E_TOO_MANY_LINKS));
        assert!(
            vector::length(&links) == vector::length(&link_labels),
            error::invalid_argument(E_LINKS_LABELS_MISMATCH),
        );

        let (_, timestamp) = block::get_block_info();

        let profile = Profile {
            owner: sender,
            bio,
            avatar_url,
            links,
            link_labels,
            encryption_pubkey: vector::empty(),
            hide_balance: false,
            hide_activity: false,
            whitelist_only_messages: false,
            created_at: timestamp,
            updated_at: timestamp,
            exists: true,
        };

        table::add(&mut registry.profiles, sender, profile);
        vector::push_back(&mut registry.all_profiles, sender);

        event::emit(ProfileCreated { owner: sender, timestamp });
    }

    public entry fun update_bio(account: &signer, new_bio: String) acquires Registry {
        let sender = signer::address_of(account);
        assert!(string::length(&new_bio) <= MAX_BIO_LENGTH, error::invalid_argument(E_BIO_TOO_LONG));

        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));

        let (_, timestamp) = block::get_block_info();
        let profile = table::borrow_mut(&mut registry.profiles, sender);
        profile.bio = new_bio;
        profile.updated_at = timestamp;

        event::emit(ProfileUpdated { owner: sender, timestamp });
    }

    public entry fun update_avatar(account: &signer, new_avatar_url: String) acquires Registry {
        let sender = signer::address_of(account);
        assert!(
            string::length(&new_avatar_url) <= MAX_AVATAR_LENGTH,
            error::invalid_argument(E_AVATAR_TOO_LONG),
        );

        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));

        let (_, timestamp) = block::get_block_info();
        let profile = table::borrow_mut(&mut registry.profiles, sender);
        profile.avatar_url = new_avatar_url;
        profile.updated_at = timestamp;

        event::emit(ProfileUpdated { owner: sender, timestamp });
    }

    public entry fun update_links(
        account: &signer,
        links: vector<String>,
        link_labels: vector<String>,
    ) acquires Registry {
        let sender = signer::address_of(account);
        assert!(vector::length(&links) <= MAX_LINKS, error::invalid_argument(E_TOO_MANY_LINKS));
        assert!(
            vector::length(&links) == vector::length(&link_labels),
            error::invalid_argument(E_LINKS_LABELS_MISMATCH),
        );

        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));

        let (_, timestamp) = block::get_block_info();
        let profile = table::borrow_mut(&mut registry.profiles, sender);
        profile.links = links;
        profile.link_labels = link_labels;
        profile.updated_at = timestamp;

        event::emit(ProfileUpdated { owner: sender, timestamp });
    }

    public entry fun set_encryption_pubkey(
        account: &signer,
        pubkey: vector<u8>,
    ) acquires Registry {
        let sender = signer::address_of(account);
        assert!(
            vector::length(&pubkey) == X25519_PUBKEY_LENGTH,
            error::invalid_argument(E_PUBKEY_INVALID_LENGTH),
        );

        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));

        let profile = table::borrow_mut(&mut registry.profiles, sender);
        profile.encryption_pubkey = pubkey;

        event::emit(EncryptionPubkeySet { owner: sender });
    }

    public entry fun update_privacy(
        account: &signer,
        hide_balance: bool,
        hide_activity: bool,
        whitelist_only_messages: bool,
    ) acquires Registry {
        let sender = signer::address_of(account);
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));

        let (_, timestamp) = block::get_block_info();
        let profile = table::borrow_mut(&mut registry.profiles, sender);
        profile.hide_balance = hide_balance;
        profile.hide_activity = hide_activity;
        profile.whitelist_only_messages = whitelist_only_messages;
        profile.updated_at = timestamp;

        event::emit(ProfileUpdated { owner: sender, timestamp });
    }

    /// Set / clear the profile theme (arbitrary JSON blob; frontend parses).
    /// Pass an empty string to reset to default.
    public entry fun update_theme(account: &signer, theme_json: String) acquires Registry {
        let sender = signer::address_of(account);
        assert!(
            string::length(&theme_json) <= MAX_THEME_LENGTH,
            error::invalid_argument(E_THEME_TOO_LONG),
        );
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));
        if (table::contains(&registry.themes, sender)) {
            *table::borrow_mut(&mut registry.themes, sender) = theme_json;
        } else {
            table::add(&mut registry.themes, sender, theme_json);
        };
        let (_, ts) = block::get_block_info();
        event::emit(ProfileUpdated { owner: sender, timestamp: ts });
    }

    /// Claim a lowercase creator slug (3-32 chars, a-z0-9_-). Fails if taken.
    /// Setting a new slug releases the previous one. Pass empty string to clear.
    public entry fun set_slug(account: &signer, slug: String) acquires Registry {
        let sender = signer::address_of(account);
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(table::contains(&registry.profiles, sender), error::not_found(E_PROFILE_NOT_FOUND));

        // Release any previously-held slug.
        if (table::contains(&registry.address_to_slug, sender)) {
            let old = *table::borrow(&registry.address_to_slug, sender);
            if (table::contains(&registry.slug_to_address, old)) {
                table::remove(&mut registry.slug_to_address, old);
            };
            table::remove(&mut registry.address_to_slug, sender);
        };

        if (string::length(&slug) == 0) {
            // Cleared. Done.
        } else {
            let slug_len = string::length(&slug);
            assert!(
                slug_len >= MIN_SLUG_LENGTH && slug_len <= MAX_SLUG_LENGTH,
                error::invalid_argument(E_SLUG_TOO_LONG),
            );
            assert!(is_valid_slug(&slug), error::invalid_argument(E_SLUG_INVALID));
            assert!(
                !table::contains(&registry.slug_to_address, slug),
                error::already_exists(E_SLUG_TAKEN),
            );
            table::add(&mut registry.slug_to_address, slug, sender);
            table::add(&mut registry.address_to_slug, sender, slug);
        };
        let (_, ts) = block::get_block_info();
        event::emit(ProfileUpdated { owner: sender, timestamp: ts });
    }

    // ===== View functions =====

    #[view]
    public fun get_profile(owner: address): Profile acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        if (table::contains(&registry.profiles, owner)) {
            *table::borrow(&registry.profiles, owner)
        } else {
            Profile {
                owner,
                bio: string::utf8(b""),
                avatar_url: string::utf8(b""),
                links: vector::empty(),
                link_labels: vector::empty(),
                encryption_pubkey: vector::empty(),
                hide_balance: false,
                hide_activity: false,
                whitelist_only_messages: false,
                created_at: 0,
                updated_at: 0,
                exists: false,
            }
        }
    }

    #[view]
    public fun profile_exists(owner: address): bool acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        table::contains(&registry.profiles, owner)
    }

    #[view]
    public fun get_encryption_pubkey(owner: address): vector<u8> acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        if (table::contains(&registry.profiles, owner)) {
            table::borrow(&registry.profiles, owner).encryption_pubkey
        } else {
            vector::empty()
        }
    }

    #[view]
    public fun total_profiles(): u64 acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        vector::length(&registry.all_profiles)
    }

    #[view]
    public fun get_theme(owner: address): String acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        if (table::contains(&registry.themes, owner)) {
            *table::borrow(&registry.themes, owner)
        } else {
            string::utf8(b"")
        }
    }

    #[view]
    public fun resolve_slug(slug: String): address acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        if (table::contains(&registry.slug_to_address, slug)) {
            *table::borrow(&registry.slug_to_address, slug)
        } else {
            @0x0
        }
    }

    #[view]
    public fun get_slug(owner: address): String acquires Registry {
        let registry = borrow_global<Registry>(@ori);
        if (table::contains(&registry.address_to_slug, owner)) {
            *table::borrow(&registry.address_to_slug, owner)
        } else {
            string::utf8(b"")
        }
    }

    // ===== Internal =====

    /// Lowercase a-z, 0-9, underscore or hyphen. No leading/trailing hyphen.
    fun is_valid_slug(s: &String): bool {
        let bytes = string::bytes(s);
        let n = vector::length(bytes);
        if (n == 0) return false;
        let first = *vector::borrow(bytes, 0);
        if (first == 0x2D /* '-' */) return false;
        let last = *vector::borrow(bytes, n - 1);
        if (last == 0x2D) return false;
        let i = 0;
        while (i < n) {
            let c = *vector::borrow(bytes, i);
            let ok = (c >= 0x61 && c <= 0x7A)      // a..z
                  || (c >= 0x30 && c <= 0x39)      // 0..9
                  || c == 0x5F                     // _
                  || c == 0x2D;                    // -
            if (!ok) return false;
            i = i + 1;
        };
        true
    }

    // ===== Tests =====

    #[test_only]
    use std::option;
    #[test_only]
    use initia_std::primary_fungible_store;

    #[test_only]
    fun mk_links(): (vector<String>, vector<String>) {
        let links = vector::empty<String>();
        let labels = vector::empty<String>();
        vector::push_back(&mut links, string::utf8(b"https://x.com/alice"));
        vector::push_back(&mut labels, string::utf8(b"X"));
        vector::push_back(&mut links, string::utf8(b"https://github.com/alice"));
        vector::push_back(&mut labels, string::utf8(b"GitHub"));
        (links, labels)
    }

    #[test_only]
    fun bootstrap(chain: &signer) {
        primary_fungible_store::init_module_for_test();
        init_module(chain);
    }

    #[test(chain = @ori)]
    fun test_init_and_empty_view(chain: &signer) acquires Registry {
        bootstrap(chain);
        assert!(!profile_exists(@0xA11CE), 100);
        let p = get_profile(@0xA11CE);
        assert!(!p.exists, 101);
        assert!(total_profiles() == 0, 102);
        let _unused = option::none<u64>();
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_create_and_fetch(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        let (links, labels) = mk_links();
        create_profile(alice, string::utf8(b"hi I'm alice"), string::utf8(b"ipfs://a"), links, labels);

        assert!(profile_exists(signer::address_of(alice)), 200);
        assert!(total_profiles() == 1, 201);
        let p = get_profile(signer::address_of(alice));
        assert!(p.bio == string::utf8(b"hi I'm alice"), 202);
        assert!(p.avatar_url == string::utf8(b"ipfs://a"), 203);
        assert!(vector::length(&p.links) == 2, 204);
        assert!(!p.hide_balance, 205);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x80001, location = Self)]
    fun test_duplicate_create_aborts(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        create_profile(alice, string::utf8(b""), string::utf8(b""), vector::empty(), vector::empty());
        create_profile(alice, string::utf8(b""), string::utf8(b""), vector::empty(), vector::empty());
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_update_bio_avatar_roundtrip(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        create_profile(alice, string::utf8(b"v1"), string::utf8(b""), vector::empty(), vector::empty());
        update_bio(alice, string::utf8(b"v2"));
        update_avatar(alice, string::utf8(b"ipfs://new"));
        let p = get_profile(signer::address_of(alice));
        assert!(p.bio == string::utf8(b"v2"), 300);
        assert!(p.avatar_url == string::utf8(b"ipfs://new"), 301);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_set_pubkey(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        create_profile(alice, string::utf8(b""), string::utf8(b""), vector::empty(), vector::empty());
        let pk = vector::empty<u8>();
        let i = 0;
        while (i < 32) { vector::push_back(&mut pk, (i as u8)); i = i + 1; };
        set_encryption_pubkey(alice, pk);
        let fetched = get_encryption_pubkey(signer::address_of(alice));
        assert!(vector::length(&fetched) == 32, 400);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10007, location = Self)]
    fun test_wrong_pubkey_length_aborts(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        create_profile(alice, string::utf8(b""), string::utf8(b""), vector::empty(), vector::empty());
        let short_pk = vector::empty<u8>();
        vector::push_back(&mut short_pk, 1u8);
        set_encryption_pubkey(alice, short_pk);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_privacy_toggle(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        create_profile(alice, string::utf8(b""), string::utf8(b""), vector::empty(), vector::empty());
        update_privacy(alice, true, false, true);
        let p = get_profile(signer::address_of(alice));
        assert!(p.hide_balance, 500);
        assert!(!p.hide_activity, 501);
        assert!(p.whitelist_only_messages, 502);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10005, location = Self)]
    fun test_link_limit_enforced(chain: &signer, alice: &signer) acquires Registry {
        bootstrap(chain);
        create_profile(alice, string::utf8(b""), string::utf8(b""), vector::empty(), vector::empty());

        let links = vector::empty<String>();
        let labels = vector::empty<String>();
        let i = 0;
        while (i < 11) {
            vector::push_back(&mut links, string::utf8(b"u"));
            vector::push_back(&mut labels, string::utf8(b"l"));
            i = i + 1;
        };
        update_links(alice, links, labels);
    }

    #[test(chain = @ori, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x60002, location = Self)]
    fun test_update_before_create_aborts(chain: &signer, bob: &signer) acquires Registry {
        bootstrap(chain);
        update_bio(bob, string::utf8(b"x"));
    }
}
