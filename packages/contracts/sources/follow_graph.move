/// Follow Graph -- on-chain social graph primitives for Ori profiles.
///
/// Design rationale:
///   - We keep the **membership + counters** on-chain (authoritative "is X
///     following Y?" check, gasped at O(1) via Table<address, Table<address, bool>>).
///   - We DON'T store paginated follower/following lists on-chain -- gas grows
///     linearly with popularity. Instead we emit `Followed`/`Unfollowed` events;
///     the backend indexes them and serves paginated lists via its API.
///
/// Attribution: counter + event pattern adapted from jordi-stack/initia-link's
/// profile_registry follow graph, trimmed for gas safety at scale.
module ori::follow_graph {
    use std::signer;
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_SELF_FOLLOW: u64 = 1;
    const E_ALREADY_FOLLOWING: u64 = 2;
    const E_NOT_FOLLOWING: u64 = 3;
    const E_NOT_INITIALIZED: u64 = 4;

    // ===== Storage =====

    /// Per-account follow state. Uses nested Table for O(1) membership checks.
    struct AccountState has store {
        /// addresses this account follows (key -> exists)
        following: Table<address, bool>,
        followers_count: u64,
        following_count: u64,
    }

    struct Registry has key {
        /// address -> their AccountState. Lazily created on first follow.
        accounts: Table<address, AccountState>,
        total_edges: u64,
    }

    // ===== Events =====

    #[event]
    struct Followed has drop, store {
        from: address,
        to: address,
        timestamp: u64,
    }

    #[event]
    struct Unfollowed has drop, store {
        from: address,
        to: address,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(admin: &signer) {
        move_to(admin, Registry {
            accounts: table::new(),
            total_edges: 0,
        });
    }

    // ===== Entry functions =====

    public entry fun follow(follower: &signer, target: address) acquires Registry {
        assert!(exists<Registry>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let from = signer::address_of(follower);
        assert!(from != target, error::invalid_argument(E_SELF_FOLLOW));

        let registry = borrow_global_mut<Registry>(@ori);

        // Ensure both sides have AccountState entries.
        ensure_account(&mut registry.accounts, from);
        ensure_account(&mut registry.accounts, target);

        let from_state = table::borrow_mut(&mut registry.accounts, from);
        assert!(
            !table::contains(&from_state.following, target),
            error::already_exists(E_ALREADY_FOLLOWING),
        );
        table::add(&mut from_state.following, target, true);
        from_state.following_count = from_state.following_count + 1;

        let target_state = table::borrow_mut(&mut registry.accounts, target);
        target_state.followers_count = target_state.followers_count + 1;

        registry.total_edges = registry.total_edges + 1;

        let (_, ts) = block::get_block_info();
        event::emit(Followed { from, to: target, timestamp: ts });
    }

    public entry fun unfollow(follower: &signer, target: address) acquires Registry {
        assert!(exists<Registry>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let from = signer::address_of(follower);
        assert!(from != target, error::invalid_argument(E_SELF_FOLLOW));

        let registry = borrow_global_mut<Registry>(@ori);
        assert!(
            table::contains(&registry.accounts, from),
            error::invalid_argument(E_NOT_FOLLOWING),
        );

        let from_state = table::borrow_mut(&mut registry.accounts, from);
        assert!(
            table::contains(&from_state.following, target),
            error::invalid_argument(E_NOT_FOLLOWING),
        );
        table::remove(&mut from_state.following, target);
        from_state.following_count = from_state.following_count - 1;

        if (table::contains(&registry.accounts, target)) {
            let target_state = table::borrow_mut(&mut registry.accounts, target);
            if (target_state.followers_count > 0) {
                target_state.followers_count = target_state.followers_count - 1;
            };
        };

        registry.total_edges = registry.total_edges - 1;

        let (_, ts) = block::get_block_info();
        event::emit(Unfollowed { from, to: target, timestamp: ts });
    }

    // ===== View functions =====

    #[view]
    public fun is_following(follower_addr: address, target: address): bool acquires Registry {
        if (!exists<Registry>(@ori)) { return false };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.accounts, follower_addr)) { return false };
        let state = table::borrow(&registry.accounts, follower_addr);
        table::contains(&state.following, target)
    }

    #[view]
    public fun followers_count(addr: address): u64 acquires Registry {
        if (!exists<Registry>(@ori)) { return 0 };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.accounts, addr)) { return 0 };
        table::borrow(&registry.accounts, addr).followers_count
    }

    #[view]
    public fun following_count(addr: address): u64 acquires Registry {
        if (!exists<Registry>(@ori)) { return 0 };
        let registry = borrow_global<Registry>(@ori);
        if (!table::contains(&registry.accounts, addr)) { return 0 };
        table::borrow(&registry.accounts, addr).following_count
    }

    #[view]
    public fun total_edges(): u64 acquires Registry {
        if (!exists<Registry>(@ori)) { return 0 };
        borrow_global<Registry>(@ori).total_edges
    }

    // ===== Helpers =====

    fun ensure_account(accounts: &mut Table<address, AccountState>, addr: address) {
        if (!table::contains(accounts, addr)) {
            table::add(accounts, addr, AccountState {
                following: table::new(),
                followers_count: 0,
                following_count: 0,
            });
        };
    }

    // ===== Tests =====

    #[test(chain = @ori)]
    fun test_init(chain: &signer) acquires Registry {
        init_module(chain);
        assert!(exists<Registry>(@ori), 100);
        assert!(total_edges() == 0, 101);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_follow_increments_counters(chain: &signer, alice: &signer, bob: &signer) acquires Registry {
        init_module(chain);
        let bob_addr = signer::address_of(bob);
        follow(alice, bob_addr);
        assert!(is_following(signer::address_of(alice), bob_addr), 200);
        assert!(following_count(signer::address_of(alice)) == 1, 201);
        assert!(followers_count(bob_addr) == 1, 202);
        assert!(total_edges() == 1, 203);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_unfollow_decrements(chain: &signer, alice: &signer, bob: &signer) acquires Registry {
        init_module(chain);
        let bob_addr = signer::address_of(bob);
        follow(alice, bob_addr);
        unfollow(alice, bob_addr);
        assert!(!is_following(signer::address_of(alice), bob_addr), 300);
        assert!(following_count(signer::address_of(alice)) == 0, 301);
        assert!(followers_count(bob_addr) == 0, 302);
        assert!(total_edges() == 0, 303);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10001, location = Self)]
    fun test_self_follow_aborts(chain: &signer, alice: &signer) acquires Registry {
        init_module(chain);
        follow(alice, signer::address_of(alice));
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x80002, location = Self)]
    fun test_duplicate_follow_aborts(chain: &signer, alice: &signer, bob: &signer) acquires Registry {
        init_module(chain);
        let bob_addr = signer::address_of(bob);
        follow(alice, bob_addr);
        follow(alice, bob_addr);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun test_unfollow_when_not_following_aborts(chain: &signer, alice: &signer, bob: &signer) acquires Registry {
        init_module(chain);
        unfollow(alice, signer::address_of(bob));
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_multiple_followers(chain: &signer, alice: &signer, bob: &signer, carol: &signer) acquires Registry {
        init_module(chain);
        let carol_addr = signer::address_of(carol);
        follow(alice, carol_addr);
        follow(bob, carol_addr);
        assert!(followers_count(carol_addr) == 2, 500);
        assert!(following_count(signer::address_of(alice)) == 1, 501);
        assert!(following_count(signer::address_of(bob)) == 1, 502);
        assert!(total_edges() == 2, 503);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_unfollow_one_of_many(chain: &signer, alice: &signer, bob: &signer, carol: &signer) acquires Registry {
        init_module(chain);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        follow(alice, bob_addr);
        follow(alice, carol_addr);
        unfollow(alice, bob_addr);
        assert!(!is_following(signer::address_of(alice), bob_addr), 600);
        assert!(is_following(signer::address_of(alice), carol_addr), 601);
        assert!(following_count(signer::address_of(alice)) == 1, 602);
    }
}
