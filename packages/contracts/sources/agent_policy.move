/// Agent Policy -- per-agent on-chain spending limits + kill switch.
///
/// Problem: the MCP server signs with a mnemonic. There's no upper bound
/// on what it can spend. If an agent goes rogue (prompt injection, buggy
/// tool selection, runaway automation), the user has no ceiling besides
/// their total balance.
///
/// Solution: a user registers each agent's bech32 address with a daily
/// INIT cap. The agent (or anyone orchestrating it) calls
/// `pre_check_and_record` before every on-chain action; this aborts if
/// the spend would breach the cap. The user can flip `active=false` via
/// `revoke_agent` to instantly disable further spend -- the kill switch.
///
/// Enforcement note: this module is cooperative, not coercive. MCP code
/// must call `pre_check_and_record` BEFORE its spend. Enforcement at
/// every module call site (e.g. paywall::purchase, tip_jar::tip) would
/// require adding an agent-policy check there -- a bigger refactor
/// that's Tier-2 polish for v2. The cooperative model still works:
/// if a user sees spend happening without a policy row they know their
/// agent is misbehaving and can revoke its entire signing authority by
/// rotating the mnemonic.
///
/// Windowing: `window_start` is the start of the current 24h window.
/// After 86400s elapse, anyone can call `reset_daily_window` to zero the
/// `spent_today` counter. Permissionless so a user doesn't need to be
/// online to "refresh" their agent's budget.
module ori::agent_policy {
    use std::signer;
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_POLICY_NOT_FOUND: u64 = 2;
    const E_NOT_OWNER: u64 = 3;
    const E_AGENT_INACTIVE: u64 = 4;
    const E_CAP_EXCEEDED: u64 = 5;
    const E_WINDOW_NOT_EXPIRED: u64 = 6;
    const E_ZERO_CAP: u64 = 7;
    const E_ZERO_AMOUNT: u64 = 8;

    // ===== Constants =====
    const WINDOW_SECONDS: u64 = 24 * 60 * 60;

    // ===== Storage =====

    struct PolicyStore has key {
        /// owner_addr -> (agent_addr -> AgentPolicy)
        by_owner: Table<address, OwnerPolicies>,
        admin: address,
    }

    struct OwnerPolicies has store {
        agents: Table<address, AgentPolicy>,
    }

    struct AgentPolicy has store, copy, drop {
        owner: address,
        agent: address,
        daily_cap: u64,
        spent_today: u64,
        window_start: u64,
        active: bool,
        created_at: u64,
        last_spend_at: u64,
    }

    // ===== Events =====

    #[event]
    struct PolicySet has drop, store {
        owner: address,
        agent: address,
        daily_cap: u64,
        timestamp: u64,
    }

    #[event]
    struct PolicyRevoked has drop, store {
        owner: address,
        agent: address,
        timestamp: u64,
    }

    #[event]
    struct SpendRecorded has drop, store {
        owner: address,
        agent: address,
        amount: u64,
        new_spent_today: u64,
        remaining_today: u64,
        timestamp: u64,
    }

    #[event]
    struct WindowReset has drop, store {
        owner: address,
        agent: address,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        move_to(deployer, PolicyStore {
            by_owner: table::new(),
            admin: signer::address_of(deployer),
        });
    }

    // ===== Entry: set_policy =====

    /// Register (or update) a daily cap for an agent under the owner's
    /// account. Caller must be the owner. Cap is in base units (umin).
    public entry fun set_policy(
        owner: &signer,
        agent: address,
        daily_cap: u64,
    ) acquires PolicyStore {
        assert!(exists<PolicyStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(daily_cap > 0, error::invalid_argument(E_ZERO_CAP));

        let owner_addr = signer::address_of(owner);
        let (_, now) = block::get_block_info();

        let store = borrow_global_mut<PolicyStore>(@ori);
        if (!table::contains(&store.by_owner, owner_addr)) {
            table::add(
                &mut store.by_owner,
                owner_addr,
                OwnerPolicies { agents: table::new() },
            );
        };
        let bucket = table::borrow_mut(&mut store.by_owner, owner_addr);

        if (table::contains(&bucket.agents, agent)) {
            let p = table::borrow_mut(&mut bucket.agents, agent);
            p.daily_cap = daily_cap;
            p.active = true;
            // Preserve spent_today + window_start on an update so a user
            // can't game the cap by re-setting it mid-window. Resetting
            // requires the normal reset_daily_window flow.
        } else {
            table::add(&mut bucket.agents, agent, AgentPolicy {
                owner: owner_addr,
                agent,
                daily_cap,
                spent_today: 0,
                window_start: now,
                active: true,
                created_at: now,
                last_spend_at: 0,
            });
        };

        event::emit(PolicySet {
            owner: owner_addr,
            agent,
            daily_cap,
            timestamp: now,
        });
    }

    // ===== Entry: revoke_agent =====

    /// Kill switch. Flips active=false so subsequent pre_check_and_record
    /// aborts. The policy row stays so the user can see history. Re-enable
    /// via set_policy.
    public entry fun revoke_agent(
        owner: &signer,
        agent: address,
    ) acquires PolicyStore {
        let owner_addr = signer::address_of(owner);
        let store = borrow_global_mut<PolicyStore>(@ori);
        assert!(
            table::contains(&store.by_owner, owner_addr),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let bucket = table::borrow_mut(&mut store.by_owner, owner_addr);
        assert!(
            table::contains(&bucket.agents, agent),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let p = table::borrow_mut(&mut bucket.agents, agent);
        p.active = false;

        let (_, now) = block::get_block_info();
        event::emit(PolicyRevoked {
            owner: owner_addr,
            agent,
            timestamp: now,
        });
    }

    // ===== Entry: pre_check_and_record =====

    /// Called by the agent BEFORE its spending action. Aborts if:
    ///   - no policy exists under (owner, agent)
    ///   - active == false (revoked)
    ///   - spent_today + amount > daily_cap
    /// On success, increments spent_today and emits SpendRecorded. If the
    /// window has expired (>= WINDOW_SECONDS since window_start) the
    /// counter is auto-reset before the check.
    public entry fun pre_check_and_record(
        agent: &signer,
        owner_addr: address,
        amount: u64,
    ) acquires PolicyStore {
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        let agent_addr = signer::address_of(agent);

        let store = borrow_global_mut<PolicyStore>(@ori);
        assert!(
            table::contains(&store.by_owner, owner_addr),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let bucket = table::borrow_mut(&mut store.by_owner, owner_addr);
        assert!(
            table::contains(&bucket.agents, agent_addr),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let p = table::borrow_mut(&mut bucket.agents, agent_addr);
        assert!(p.active, error::permission_denied(E_AGENT_INACTIVE));

        let (_, now) = block::get_block_info();

        // Auto-rollover the window if we've crossed 24h.
        if (now >= p.window_start + WINDOW_SECONDS) {
            p.window_start = now;
            p.spent_today = 0;
        };

        assert!(
            p.spent_today + amount <= p.daily_cap,
            error::resource_exhausted(E_CAP_EXCEEDED),
        );
        p.spent_today = p.spent_today + amount;
        p.last_spend_at = now;

        event::emit(SpendRecorded {
            owner: owner_addr,
            agent: agent_addr,
            amount,
            new_spent_today: p.spent_today,
            remaining_today: p.daily_cap - p.spent_today,
            timestamp: now,
        });
    }

    // ===== Entry: reset_daily_window =====

    /// Permissionless. Callable by anyone after WINDOW_SECONDS have passed
    /// since `window_start`. Zeroes spent_today. Exists so a user doesn't
    /// need to be online to refresh their agent's budget -- the agent or
    /// a keeper bot can trigger it.
    public entry fun reset_daily_window(
        _caller: &signer,
        owner_addr: address,
        agent_addr: address,
    ) acquires PolicyStore {
        let store = borrow_global_mut<PolicyStore>(@ori);
        assert!(
            table::contains(&store.by_owner, owner_addr),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let bucket = table::borrow_mut(&mut store.by_owner, owner_addr);
        assert!(
            table::contains(&bucket.agents, agent_addr),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let p = table::borrow_mut(&mut bucket.agents, agent_addr);

        let (_, now) = block::get_block_info();
        assert!(
            now >= p.window_start + WINDOW_SECONDS,
            error::invalid_state(E_WINDOW_NOT_EXPIRED),
        );
        p.window_start = now;
        p.spent_today = 0;

        event::emit(WindowReset {
            owner: owner_addr,
            agent: agent_addr,
            timestamp: now,
        });
    }

    // ===== View functions =====

    #[view]
    public fun get_policy(owner: address, agent: address): AgentPolicy acquires PolicyStore {
        let store = borrow_global<PolicyStore>(@ori);
        assert!(
            table::contains(&store.by_owner, owner),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        let bucket = table::borrow(&store.by_owner, owner);
        assert!(
            table::contains(&bucket.agents, agent),
            error::not_found(E_POLICY_NOT_FOUND),
        );
        *table::borrow(&bucket.agents, agent)
    }

    #[view]
    public fun policy_exists(owner: address, agent: address): bool acquires PolicyStore {
        let store = borrow_global<PolicyStore>(@ori);
        if (!table::contains(&store.by_owner, owner)) return false;
        let bucket = table::borrow(&store.by_owner, owner);
        table::contains(&bucket.agents, agent)
    }

    #[view]
    public fun is_active(owner: address, agent: address): bool acquires PolicyStore {
        if (!policy_exists(owner, agent)) return false;
        let store = borrow_global<PolicyStore>(@ori);
        let bucket = table::borrow(&store.by_owner, owner);
        let p = table::borrow(&bucket.agents, agent);
        p.active
    }

    /// Remaining allowance assuming the current window is still open.
    /// Does NOT auto-roll -- caller should treat staleness as advisory.
    #[view]
    public fun remaining_today(owner: address, agent: address): u64 acquires PolicyStore {
        let store = borrow_global<PolicyStore>(@ori);
        if (!table::contains(&store.by_owner, owner)) return 0;
        let bucket = table::borrow(&store.by_owner, owner);
        if (!table::contains(&bucket.agents, agent)) return 0;
        let p = table::borrow(&bucket.agents, agent);
        if (!p.active) return 0;
        if (p.spent_today >= p.daily_cap) return 0;
        p.daily_cap - p.spent_today
    }

    // ===== Tests =====

    #[test_only]
    use std::vector;

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_set_and_read_policy(
        chain: &signer,
        alice: &signer,
    ) acquires PolicyStore {
        init_module(chain);
        initia_std::block::set_block_info(1, 1000);

        let alice_addr = signer::address_of(alice);
        let agent_addr = @0xBEEF;
        set_policy(alice, agent_addr, 10_000_000);

        assert!(policy_exists(alice_addr, agent_addr), 100);
        assert!(is_active(alice_addr, agent_addr), 101);
        assert!(remaining_today(alice_addr, agent_addr) == 10_000_000, 102);

        let p = get_policy(alice_addr, agent_addr);
        assert!(p.daily_cap == 10_000_000, 103);
        assert!(p.spent_today == 0, 104);
        assert!(p.active == true, 105);
        let _ = vector::empty<u8>(); // silence unused import warning
    }

    #[test(chain = @ori, alice = @0xA11CE, agent = @0xBEEF)]
    fun test_pre_check_happy_path(
        chain: &signer,
        alice: &signer,
        agent: &signer,
    ) acquires PolicyStore {
        init_module(chain);
        initia_std::block::set_block_info(1, 1000);

        let alice_addr = signer::address_of(alice);
        let agent_addr = signer::address_of(agent);
        set_policy(alice, agent_addr, 10_000);

        pre_check_and_record(agent, alice_addr, 3_000);
        pre_check_and_record(agent, alice_addr, 4_000);

        assert!(remaining_today(alice_addr, agent_addr) == 3_000, 200);
        let p = get_policy(alice_addr, agent_addr);
        assert!(p.spent_today == 7_000, 201);
    }

    #[test(chain = @ori, alice = @0xA11CE, agent = @0xBEEF)]
    #[expected_failure(abort_code = 0x50005, location = Self)]
    fun test_pre_check_cap_exceeded_aborts(
        chain: &signer,
        alice: &signer,
        agent: &signer,
    ) acquires PolicyStore {
        init_module(chain);
        initia_std::block::set_block_info(1, 1000);

        let alice_addr = signer::address_of(alice);
        let agent_addr = signer::address_of(agent);
        set_policy(alice, agent_addr, 10_000);

        pre_check_and_record(agent, alice_addr, 7_000);
        pre_check_and_record(agent, alice_addr, 4_000); // 7k + 4k > 10k -> abort
    }

    #[test(chain = @ori, alice = @0xA11CE, agent = @0xBEEF)]
    #[expected_failure(abort_code = 0x50004, location = Self)]
    fun test_revoked_agent_aborts(
        chain: &signer,
        alice: &signer,
        agent: &signer,
    ) acquires PolicyStore {
        init_module(chain);
        initia_std::block::set_block_info(1, 1000);

        let alice_addr = signer::address_of(alice);
        let agent_addr = signer::address_of(agent);
        set_policy(alice, agent_addr, 10_000);
        revoke_agent(alice, agent_addr);
        pre_check_and_record(agent, alice_addr, 1_000); // inactive -> abort
    }

    #[test(chain = @ori, alice = @0xA11CE, agent = @0xBEEF)]
    fun test_window_auto_rollover(
        chain: &signer,
        alice: &signer,
        agent: &signer,
    ) acquires PolicyStore {
        init_module(chain);
        initia_std::block::set_block_info(1, 1000);

        let alice_addr = signer::address_of(alice);
        let agent_addr = signer::address_of(agent);
        set_policy(alice, agent_addr, 10_000);

        pre_check_and_record(agent, alice_addr, 9_000);
        // Advance 25h.
        initia_std::block::set_block_info(2, 1000 + 25 * 60 * 60);
        // Should auto-rollover inside pre_check_and_record.
        pre_check_and_record(agent, alice_addr, 9_000);

        let p = get_policy(alice_addr, agent_addr);
        assert!(p.spent_today == 9_000, 400);
    }
}
