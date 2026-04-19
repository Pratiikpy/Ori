/// Squads -- social micro-communities with shared XP.
///
/// Any user creates a squad, names it, and becomes the leader. Others join
/// (up to MAX_MEMBERS) and their quest XP gets attributed to the squad. An
/// authorized XP issuer (`ori` admin by default; rotatable) calls
/// `award_xp(squad_id, member, amount)` from the quest-completion backend
/// worker -- only designated issuers can mint XP so the leaderboard stays
/// attack-resistant.
///
/// Leaderboard is a global sorted list of `(squad_id, total_xp)` maintained
/// off-chain by the API indexing `XpAwarded` events. On-chain we keep just
/// per-squad counters.
///
/// Attribution: squad primitive from niraj-niraj/Drip's SquadManager +
/// Hunch's quest XP model.
module ori::squads {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_NAME_TOO_LONG: u64 = 2;
    const E_NAME_EMPTY: u64 = 3;
    const E_ALREADY_IN_SQUAD: u64 = 4;
    const E_NOT_IN_SQUAD: u64 = 5;
    const E_SQUAD_NOT_FOUND: u64 = 6;
    const E_SQUAD_FULL: u64 = 7;
    const E_NOT_LEADER: u64 = 8;
    const E_NOT_ISSUER: u64 = 9;
    const E_NAME_TAKEN: u64 = 10;
    const E_NOT_MEMBER: u64 = 11;
    const E_LEADER_MUST_TRANSFER: u64 = 12;

    // ===== Constants =====
    const MAX_NAME_LEN: u64 = 40;
    const MAX_MEMBERS: u64 = 20;

    // ===== Storage =====

    struct SquadsStore has key {
        next_id: u64,
        squads: Table<u64, Squad>,
        /// user address -> squad_id they're currently in (0 = none)
        membership: Table<address, u64>,
        /// lowercase squad name -> id, for name uniqueness + URL lookups
        name_to_id: Table<String, u64>,
        admin: address,
        /// authorized XP issuers (admin is always implicitly allowed)
        xp_issuers: Table<address, bool>,
        total_squads: u64,
    }

    struct Squad has store, copy, drop {
        id: u64,
        name: String,
        leader: address,
        members: vector<address>,
        total_xp: u64,
        created_at: u64,
        active: bool,
    }

    // ===== Events =====

    #[event]
    struct SquadCreated has drop, store {
        id: u64,
        name: String,
        leader: address,
        timestamp: u64,
    }

    #[event]
    struct SquadJoined has drop, store {
        id: u64,
        member: address,
        member_count: u64,
        timestamp: u64,
    }

    #[event]
    struct SquadLeft has drop, store {
        id: u64,
        member: address,
        timestamp: u64,
    }

    #[event]
    struct XpAwarded has drop, store {
        id: u64,
        member: address,
        amount: u64,
        new_squad_total: u64,
        timestamp: u64,
    }

    #[event]
    struct SquadDisbanded has drop, store {
        id: u64,
        leader: address,
        timestamp: u64,
    }

    #[event]
    struct LeaderTransferred has drop, store {
        id: u64,
        old_leader: address,
        new_leader: address,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        move_to(deployer, SquadsStore {
            next_id: 1,
            squads: table::new(),
            membership: table::new(),
            name_to_id: table::new(),
            admin: signer::address_of(deployer),
            xp_issuers: table::new(),
            total_squads: 0,
        });
    }

    // ===== Entry functions =====

    public entry fun create_squad(leader: &signer, name: String) acquires SquadsStore {
        assert!(exists<SquadsStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let leader_addr = signer::address_of(leader);
        assert!(string::length(&name) > 0, error::invalid_argument(E_NAME_EMPTY));
        assert!(string::length(&name) <= MAX_NAME_LEN, error::invalid_argument(E_NAME_TOO_LONG));

        let store = borrow_global_mut<SquadsStore>(@ori);
        assert!(
            !table::contains(&store.membership, leader_addr)
                || *table::borrow(&store.membership, leader_addr) == 0,
            error::already_exists(E_ALREADY_IN_SQUAD),
        );
        assert!(
            !table::contains(&store.name_to_id, name),
            error::already_exists(E_NAME_TAKEN),
        );

        let id = store.next_id;
        store.next_id = id + 1;
        store.total_squads = store.total_squads + 1;
        let (_, ts) = block::get_block_info();

        let members = vector::empty<address>();
        vector::push_back(&mut members, leader_addr);
        table::add(&mut store.squads, id, Squad {
            id,
            name,
            leader: leader_addr,
            members,
            total_xp: 0,
            created_at: ts,
            active: true,
        });
        table::add(&mut store.name_to_id, name, id);

        if (table::contains(&store.membership, leader_addr)) {
            *table::borrow_mut(&mut store.membership, leader_addr) = id;
        } else {
            table::add(&mut store.membership, leader_addr, id);
        };

        event::emit(SquadCreated { id, name, leader: leader_addr, timestamp: ts });
    }

    public entry fun join_squad(member: &signer, squad_id: u64) acquires SquadsStore {
        let store = borrow_global_mut<SquadsStore>(@ori);
        assert!(table::contains(&store.squads, squad_id), error::not_found(E_SQUAD_NOT_FOUND));

        let member_addr = signer::address_of(member);
        let current = if (table::contains(&store.membership, member_addr)) {
            *table::borrow(&store.membership, member_addr)
        } else { 0 };
        assert!(current == 0, error::already_exists(E_ALREADY_IN_SQUAD));

        let squad = table::borrow_mut(&mut store.squads, squad_id);
        assert!(squad.active, error::not_found(E_SQUAD_NOT_FOUND));
        assert!(
            vector::length(&squad.members) < MAX_MEMBERS,
            error::invalid_state(E_SQUAD_FULL),
        );
        vector::push_back(&mut squad.members, member_addr);
        let count = vector::length(&squad.members);

        if (table::contains(&store.membership, member_addr)) {
            *table::borrow_mut(&mut store.membership, member_addr) = squad_id;
        } else {
            table::add(&mut store.membership, member_addr, squad_id);
        };

        let (_, ts) = block::get_block_info();
        event::emit(SquadJoined { id: squad_id, member: member_addr, member_count: count, timestamp: ts });
    }

    public entry fun leave_squad(member: &signer, squad_id: u64) acquires SquadsStore {
        let store = borrow_global_mut<SquadsStore>(@ori);
        assert!(table::contains(&store.squads, squad_id), error::not_found(E_SQUAD_NOT_FOUND));

        let member_addr = signer::address_of(member);
        let current = if (table::contains(&store.membership, member_addr)) {
            *table::borrow(&store.membership, member_addr)
        } else { 0 };
        assert!(current == squad_id, error::not_found(E_NOT_IN_SQUAD));

        let squad = table::borrow_mut(&mut store.squads, squad_id);
        assert!(
            squad.leader != member_addr,
            error::invalid_state(E_LEADER_MUST_TRANSFER),
        );
        let (idx_exists, idx) = find_member(&squad.members, member_addr);
        assert!(idx_exists, error::not_found(E_NOT_MEMBER));
        vector::remove(&mut squad.members, idx);
        *table::borrow_mut(&mut store.membership, member_addr) = 0;

        let (_, ts) = block::get_block_info();
        event::emit(SquadLeft { id: squad_id, member: member_addr, timestamp: ts });
    }

    /// Leader designates a new leader (who must already be a member) before
    /// leaving. This prevents orphan squads.
    public entry fun transfer_leader(
        leader: &signer,
        squad_id: u64,
        new_leader: address,
    ) acquires SquadsStore {
        let store = borrow_global_mut<SquadsStore>(@ori);
        assert!(table::contains(&store.squads, squad_id), error::not_found(E_SQUAD_NOT_FOUND));
        let squad = table::borrow_mut(&mut store.squads, squad_id);
        let leader_addr = signer::address_of(leader);
        assert!(squad.leader == leader_addr, error::permission_denied(E_NOT_LEADER));
        let (exists_flag, _) = find_member(&squad.members, new_leader);
        assert!(exists_flag, error::not_found(E_NOT_MEMBER));
        let old = squad.leader;
        squad.leader = new_leader;
        event::emit(LeaderTransferred { id: squad_id, old_leader: old, new_leader });
    }

    /// Leader disbands an empty-or-solo squad. All remaining members get
    /// their membership cleared. Events emitted allow off-chain cleanup.
    public entry fun disband_squad(leader: &signer, squad_id: u64) acquires SquadsStore {
        let store = borrow_global_mut<SquadsStore>(@ori);
        assert!(table::contains(&store.squads, squad_id), error::not_found(E_SQUAD_NOT_FOUND));
        let leader_addr = signer::address_of(leader);
        let squad = table::borrow_mut(&mut store.squads, squad_id);
        assert!(squad.leader == leader_addr, error::permission_denied(E_NOT_LEADER));

        // Clear membership for everyone.
        let i = 0;
        let n = vector::length(&squad.members);
        while (i < n) {
            let m = *vector::borrow(&squad.members, i);
            if (table::contains(&store.membership, m)) {
                *table::borrow_mut(&mut store.membership, m) = 0;
            };
            i = i + 1;
        };
        squad.active = false;
        // Release the name so somebody else can create a squad with it.
        if (table::contains(&store.name_to_id, squad.name)) {
            table::remove(&mut store.name_to_id, squad.name);
        };

        let (_, ts) = block::get_block_info();
        event::emit(SquadDisbanded { id: squad_id, leader: leader_addr, timestamp: ts });
    }

    /// Mint XP to a squad, attributed to the member who earned it. Only the
    /// admin or an authorized aux issuer can call.
    public entry fun award_xp(
        issuer: &signer,
        squad_id: u64,
        member: address,
        amount: u64,
    ) acquires SquadsStore {
        let store = borrow_global_mut<SquadsStore>(@ori);
        let issuer_addr = signer::address_of(issuer);
        assert!(
            issuer_addr == store.admin
                || (table::contains(&store.xp_issuers, issuer_addr)
                    && *table::borrow(&store.xp_issuers, issuer_addr)),
            error::permission_denied(E_NOT_ISSUER),
        );
        assert!(table::contains(&store.squads, squad_id), error::not_found(E_SQUAD_NOT_FOUND));

        let squad = table::borrow_mut(&mut store.squads, squad_id);
        let (is_member, _) = find_member(&squad.members, member);
        assert!(is_member, error::not_found(E_NOT_MEMBER));
        squad.total_xp = squad.total_xp + amount;

        let (_, ts) = block::get_block_info();
        event::emit(XpAwarded {
            id: squad_id,
            member,
            amount,
            new_squad_total: squad.total_xp,
            timestamp: ts,
        });
    }

    public entry fun set_xp_issuer(
        admin: &signer,
        addr: address,
        authorized: bool,
    ) acquires SquadsStore {
        let store = borrow_global_mut<SquadsStore>(@ori);
        assert!(
            signer::address_of(admin) == store.admin,
            error::permission_denied(E_NOT_ISSUER),
        );
        if (table::contains(&store.xp_issuers, addr)) {
            *table::borrow_mut(&mut store.xp_issuers, addr) = authorized;
        } else {
            table::add(&mut store.xp_issuers, addr, authorized);
        };
    }

    // ===== View functions =====

    #[view]
    public fun get_squad(squad_id: u64): Squad acquires SquadsStore {
        let store = borrow_global<SquadsStore>(@ori);
        assert!(table::contains(&store.squads, squad_id), error::not_found(E_SQUAD_NOT_FOUND));
        *table::borrow(&store.squads, squad_id)
    }

    #[view]
    public fun squad_of(member: address): u64 acquires SquadsStore {
        if (!exists<SquadsStore>(@ori)) return 0;
        let store = borrow_global<SquadsStore>(@ori);
        if (!table::contains(&store.membership, member)) return 0;
        *table::borrow(&store.membership, member)
    }

    #[view]
    public fun resolve_name(name: String): u64 acquires SquadsStore {
        let store = borrow_global<SquadsStore>(@ori);
        if (!table::contains(&store.name_to_id, name)) return 0;
        *table::borrow(&store.name_to_id, name)
    }

    #[view]
    public fun total_squads(): u64 acquires SquadsStore {
        borrow_global<SquadsStore>(@ori).total_squads
    }

    #[view]
    public fun total_xp(squad_id: u64): u64 acquires SquadsStore {
        let store = borrow_global<SquadsStore>(@ori);
        if (!table::contains(&store.squads, squad_id)) return 0;
        table::borrow(&store.squads, squad_id).total_xp
    }

    // ===== Internal =====

    fun find_member(members: &vector<address>, needle: address): (bool, u64) {
        let i = 0;
        let n = vector::length(members);
        while (i < n) {
            if (*vector::borrow(members, i) == needle) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }

    // ===== Tests =====

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_create_squad(chain: &signer, alice: &signer) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"warriors"));
        assert!(total_squads() == 1, 100);
        assert!(squad_of(signer::address_of(alice)) == 1, 101);
        assert!(resolve_name(string::utf8(b"warriors")) == 1, 102);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_join_squad(chain: &signer, alice: &signer, bob: &signer) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        join_squad(bob, 1);
        let squad = get_squad(1);
        assert!(vector::length(&squad.members) == 2, 200);
        assert!(squad_of(signer::address_of(bob)) == 1, 201);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x80004, location = Self)]
    fun test_join_two_squads_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"a"));
        create_squad(bob, string::utf8(b"b"));
        join_squad(bob, 1);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_leave_squad(chain: &signer, alice: &signer, bob: &signer) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        join_squad(bob, 1);
        leave_squad(bob, 1);
        assert!(squad_of(signer::address_of(bob)) == 0, 300);
        let squad = get_squad(1);
        assert!(vector::length(&squad.members) == 1, 301);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x3000c, location = Self)]
    fun test_leader_cannot_leave_directly(chain: &signer, alice: &signer) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        leave_squad(alice, 1);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_transfer_leader(chain: &signer, alice: &signer, bob: &signer) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        join_squad(bob, 1);
        transfer_leader(alice, 1, signer::address_of(bob));
        let squad = get_squad(1);
        assert!(squad.leader == signer::address_of(bob), 400);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_award_xp_by_admin(chain: &signer, alice: &signer, bob: &signer) acquires SquadsStore {
        init_module(chain);
        let _ = bob;
        create_squad(alice, string::utf8(b"w"));
        award_xp(chain, 1, signer::address_of(alice), 100);
        assert!(total_xp(1) == 100, 500);
    }

    #[test(chain = @ori, bad = @0xBAD, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x50009, location = Self)]
    fun test_non_issuer_cannot_award(
        chain: &signer,
        bad: &signer,
        alice: &signer,
    ) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        award_xp(bad, 1, signer::address_of(alice), 100);
    }

    #[test(chain = @ori, alice = @0xA11CE, aux = @0xA0A)]
    fun test_aux_issuer_can_award(
        chain: &signer,
        alice: &signer,
        aux: &signer,
    ) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        set_xp_issuer(chain, signer::address_of(aux), true);
        award_xp(aux, 1, signer::address_of(alice), 50);
        assert!(total_xp(1) == 50, 600);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    fun test_disband_clears_name(chain: &signer, alice: &signer) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        disband_squad(alice, 1);
        assert!(resolve_name(string::utf8(b"w")) == 0, 700);
        assert!(squad_of(signer::address_of(alice)) == 0, 701);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x8000a, location = Self)]
    fun test_duplicate_name_aborts(
        chain: &signer,
        alice: &signer,
        bob: &signer,
    ) acquires SquadsStore {
        init_module(chain);
        create_squad(alice, string::utf8(b"w"));
        create_squad(bob, string::utf8(b"w"));
    }
}
