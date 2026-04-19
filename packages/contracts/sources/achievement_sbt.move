/// Achievement SBT -- soulbound milestone badges with tiered progression.
///
/// Non-transferability comes from the module's API surface: the `Badge` struct
/// can only be created via `award_badge`, which inserts into a `Registry`-owned
/// `Table`. There is no transfer / move-out function. The Registry at @ori is
/// the only source of truth.
///
/// Each badge now carries:
///   - `badge_type: u8`      -- semantic class (payments, tips, gifts, ...)
///   - `level: u8`           -- 0 = milestone (one-shot) / 1 = Bronze .. 4 = Platinum
///   - `metadata_uri: String`-- optional IPFS/HTTPS URL pointing at badge art + traits
///
/// Uniqueness is per (recipient, badge_type, level). Upgrading from Bronze -> Silver
/// is done by awarding a new badge with the same type but a higher level, not by
/// mutating the existing one. The frontend shows the highest-level badge per type.
///
/// Attribution: SBT-via-module-API pattern adapted from aditi3175/InnerProof;
/// tiered progression borrowed from the Seed -> Radiant pattern in the same repo;
/// metadata_uri convention from Initia's standard fungible_asset pattern.
module ori::achievement_sbt {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_ISSUER: u64 = 1;
    const E_INVALID_BADGE: u64 = 2;
    const E_ALREADY_AWARDED: u64 = 3;
    const E_NOT_INITIALIZED: u64 = 4;
    const E_INVALID_LEVEL: u64 = 5;

    // ===== Badge taxonomy =====
    // Milestone badges (level = 0): one-shot, per type.
    const BADGE_EARLY_USER: u8 = 0;
    const BADGE_FIRST_PAYMENT: u8 = 1;
    const BADGE_FIRST_TIP: u8 = 2;
    const BADGE_FIRST_GIFT: u8 = 3;
    const BADGE_THIRTY_DAY_STREAK: u8 = 4;
    const BADGE_FIRST_WAGER: u8 = 5;
    const BADGE_FIRST_REQUEST: u8 = 6;
    const BADGE_FIRST_SPLIT: u8 = 7;
    const BADGE_FIRST_CLAIM: u8 = 8;
    const BADGE_FIRST_SUB: u8 = 9;
    const BADGE_FOUNDING_100: u8 = 10;
    const BADGE_FOUNDING_1000: u8 = 11;

    // Tiered badges (level 1..4): tracked as separate badges per level.
    const BADGE_PAYMENTS: u8 = 20;
    const BADGE_TIPS_GIVEN: u8 = 21;
    const BADGE_TIPS_RECEIVED: u8 = 22;
    const BADGE_GIFTS_SENT: u8 = 23;
    const BADGE_GIFTS_CLAIMED: u8 = 24;
    const BADGE_WAGERS_WON: u8 = 25;
    const BADGE_BILLS_SPLIT: u8 = 26;
    const BADGE_REFERRALS: u8 = 27;
    const BADGE_STREAK: u8 = 28;

    const MAX_BADGE_TYPE: u8 = 28;
    const MAX_LEVEL: u8 = 4;

    // ===== Storage =====

    struct Badge has store, copy, drop {
        badge_type: u8,
        level: u8,
        metadata_uri: String,
        minted_at: u64,
    }

    struct Registry has key {
        issuer: address,
        aux_issuers: Table<address, bool>,
        badges: Table<address, vector<Badge>>,
        total_awarded: u64,
    }

    // ===== Events =====

    #[event]
    struct BadgeAwarded has drop, store {
        recipient: address,
        badge_type: u8,
        level: u8,
        metadata_uri: String,
        timestamp: u64,
    }

    #[event]
    struct IssuerChanged has drop, store {
        old_issuer: address,
        new_issuer: address,
    }

    #[event]
    struct AuxIssuerUpdated has drop, store {
        addr: address,
        authorized: bool,
    }

    // ===== Init =====

    fun init_module(admin: &signer) {
        move_to(admin, Registry {
            issuer: signer::address_of(admin),
            aux_issuers: table::new(),
            badges: table::new(),
            total_awarded: 0,
        });
    }

    // ===== Entry functions =====

    public entry fun award_badge(
        issuer: &signer,
        recipient: address,
        badge_type: u8,
        level: u8,
        metadata_uri: String,
    ) acquires Registry {
        assert!(exists<Registry>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(badge_type <= MAX_BADGE_TYPE, error::invalid_argument(E_INVALID_BADGE));
        assert!(level <= MAX_LEVEL, error::invalid_argument(E_INVALID_LEVEL));

        let registry = borrow_global_mut<Registry>(@ori);
        let issuer_addr = signer::address_of(issuer);
        assert!(
            issuer_addr == registry.issuer
                || (table::contains(&registry.aux_issuers, issuer_addr)
                    && *table::borrow(&registry.aux_issuers, issuer_addr)),
            error::permission_denied(E_NOT_ISSUER),
        );

        if (!table::contains(&registry.badges, recipient)) {
            table::add(&mut registry.badges, recipient, vector::empty<Badge>());
        };

        let user_badges = table::borrow_mut(&mut registry.badges, recipient);
        let i = 0;
        let n = vector::length(user_badges);
        while (i < n) {
            let b = vector::borrow(user_badges, i);
            assert!(
                !(b.badge_type == badge_type && b.level == level),
                error::already_exists(E_ALREADY_AWARDED),
            );
            i = i + 1;
        };

        let (_, timestamp) = block::get_block_info();
        vector::push_back(user_badges, Badge {
            badge_type,
            level,
            metadata_uri,
            minted_at: timestamp,
        });
        registry.total_awarded = registry.total_awarded + 1;

        event::emit(BadgeAwarded { recipient, badge_type, level, metadata_uri, timestamp });
    }

    public entry fun award_milestone(
        issuer: &signer,
        recipient: address,
        badge_type: u8,
    ) acquires Registry {
        award_badge(issuer, recipient, badge_type, 0, string::utf8(b""));
    }

    public entry fun transfer_issuer(
        current_issuer: &signer,
        new_issuer: address,
    ) acquires Registry {
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(
            signer::address_of(current_issuer) == registry.issuer,
            error::permission_denied(E_NOT_ISSUER),
        );
        let old_issuer = registry.issuer;
        registry.issuer = new_issuer;
        event::emit(IssuerChanged { old_issuer, new_issuer });
    }

    public entry fun set_aux_issuer(
        admin: &signer,
        addr: address,
        authorized: bool,
    ) acquires Registry {
        let registry = borrow_global_mut<Registry>(@ori);
        assert!(
            signer::address_of(admin) == registry.issuer,
            error::permission_denied(E_NOT_ISSUER),
        );
        if (table::contains(&registry.aux_issuers, addr)) {
            *table::borrow_mut(&mut registry.aux_issuers, addr) = authorized;
        } else {
            table::add(&mut registry.aux_issuers, addr, authorized);
        };
        event::emit(AuxIssuerUpdated { addr, authorized });
    }

    // ===== View functions =====

    #[view]
    public fun has_badge(addr: address, badge_type: u8, level: u8): bool acquires Registry {
        if (!exists<Registry>(@ori)) { return false };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.badges, addr)) { return false };
        let user_badges = table::borrow(&registry.badges, addr);
        let i = 0;
        let n = vector::length(user_badges);
        while (i < n) {
            let b = vector::borrow(user_badges, i);
            if (b.badge_type == badge_type && b.level == level) {
                return true
            };
            i = i + 1;
        };
        false
    }

    #[view]
    public fun max_level_for(addr: address, badge_type: u8): u8 acquires Registry {
        if (!exists<Registry>(@ori)) { return 0 };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.badges, addr)) { return 0 };
        let user_badges = table::borrow(&registry.badges, addr);
        let i = 0;
        let n = vector::length(user_badges);
        let best: u8 = 0;
        let found = false;
        while (i < n) {
            let b = vector::borrow(user_badges, i);
            if (b.badge_type == badge_type) {
                found = true;
                if (b.level > best) { best = b.level };
            };
            i = i + 1;
        };
        if (found) { best } else { 255 }
    }

    #[view]
    public fun badge_count(addr: address): u64 acquires Registry {
        if (!exists<Registry>(@ori)) { return 0 };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.badges, addr)) { return 0 };
        vector::length(table::borrow(&registry.badges, addr))
    }

    #[view]
    public fun get_badges(addr: address): vector<Badge> acquires Registry {
        if (!exists<Registry>(@ori)) { return vector::empty() };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.badges, addr)) { return vector::empty() };
        *table::borrow(&registry.badges, addr)
    }

    #[view]
    public fun total_awarded(): u64 acquires Registry {
        if (!exists<Registry>(@ori)) { return 0 };
        borrow_global<Registry>(@ori).total_awarded
    }

    #[view]
    public fun get_issuer(): address acquires Registry {
        borrow_global<Registry>(@ori).issuer
    }

    #[view]
    public fun is_aux_issuer(addr: address): bool acquires Registry {
        if (!exists<Registry>(@ori)) { return false };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.aux_issuers, addr)) { return false };
        *table::borrow(&registry.aux_issuers, addr)
    }
}
