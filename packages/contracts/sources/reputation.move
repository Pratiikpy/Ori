/// Reputation -- on-chain thumbs-up / thumbs-down + third-party attestations.
///
/// Goal: a light-weight social layer where Ori users can publicly endorse or
/// flag another `.init` address. Each voter gets exactly one vote per target
/// (toggleable). Attestations are free-form statements signed by the attester
/// (e.g. "paid on time", "delivered what they promised") with an optional
/// evidence URI.
///
/// Attribution: vote + attestation primitives from Ferdi-svg/InitPage's
/// ReputationRegistry + ValidationRegistry (ERC-8004 inspired).
module ori::reputation {
    use std::signer;
    use std::string::{Self, String};
    use std::error;
    use initia_std::block;
    use initia_std::event;
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_SELF_VOTE: u64 = 2;
    const E_SELF_ATTEST: u64 = 3;
    const E_ATTESTATION_TOO_LONG: u64 = 4;
    const E_URI_TOO_LONG: u64 = 5;
    const E_ATTESTATION_NOT_FOUND: u64 = 6;

    // ===== Constants =====
    const VOTE_UP: u8 = 1;
    const VOTE_DOWN: u8 = 2;
    const MAX_ATTESTATION_LEN: u64 = 280;
    const MAX_URI_LEN: u64 = 512;

    // ===== Storage =====

    struct ReputationStore has key {
        counters: Table<address, Counters>,
        votes: Table<VoteKey, u8>,             // 0 = none, 1 = up, 2 = down
        attestations: Table<u64, Attestation>,
        next_attestation_id: u64,
    }

    struct Counters has store, drop {
        up_votes: u64,
        down_votes: u64,
        attestations_count: u64,
    }

    struct VoteKey has copy, drop, store {
        voter: address,
        target: address,
    }

    struct Attestation has store, copy, drop {
        id: u64,
        attester: address,
        target: address,
        claim: String,
        evidence_uri: String,
        timestamp: u64,
    }

    // ===== Events =====

    #[event]
    struct VoteCast has drop, store {
        voter: address,
        target: address,
        kind: u8,          // 1 = up, 2 = down, 0 = retract
        timestamp: u64,
    }

    #[event]
    struct AttestationCreated has drop, store {
        id: u64,
        attester: address,
        target: address,
        claim: String,
        evidence_uri: String,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        move_to(deployer, ReputationStore {
            counters: table::new(),
            votes: table::new(),
            attestations: table::new(),
            next_attestation_id: 1,
        });
    }

    // ===== Entry functions =====

    public entry fun thumbs_up(voter: &signer, target: address) acquires ReputationStore {
        cast_vote(voter, target, VOTE_UP);
    }

    public entry fun thumbs_down(voter: &signer, target: address) acquires ReputationStore {
        cast_vote(voter, target, VOTE_DOWN);
    }

    /// Retract your previous vote (undoes whichever direction it was).
    public entry fun retract_vote(voter: &signer, target: address) acquires ReputationStore {
        cast_vote(voter, target, 0);
    }

    public entry fun attest(
        attester: &signer,
        target: address,
        claim: String,
        evidence_uri: String,
    ) acquires ReputationStore {
        assert!(exists<ReputationStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let attester_addr = signer::address_of(attester);
        assert!(attester_addr != target, error::invalid_argument(E_SELF_ATTEST));
        assert!(
            string::length(&claim) <= MAX_ATTESTATION_LEN,
            error::invalid_argument(E_ATTESTATION_TOO_LONG),
        );
        assert!(
            string::length(&evidence_uri) <= MAX_URI_LEN,
            error::invalid_argument(E_URI_TOO_LONG),
        );

        let store = borrow_global_mut<ReputationStore>(@ori);
        let id = store.next_attestation_id;
        store.next_attestation_id = id + 1;
        let (_, ts) = block::get_block_info();
        let att = Attestation {
            id,
            attester: attester_addr,
            target,
            claim,
            evidence_uri,
            timestamp: ts,
        };
        table::add(&mut store.attestations, id, att);

        let counters = ensure_counters(&mut store.counters, target);
        counters.attestations_count = counters.attestations_count + 1;

        event::emit(AttestationCreated {
            id,
            attester: attester_addr,
            target,
            claim,
            evidence_uri,
            timestamp: ts,
        });
    }

    // ===== View functions =====

    #[view]
    public fun get_counters(target: address): (u64, u64, u64) acquires ReputationStore {
        if (!exists<ReputationStore>(@ori)) return (0, 0, 0);
        let store = borrow_global<ReputationStore>(@ori);
        if (!table::contains(&store.counters, target)) return (0, 0, 0);
        let c = table::borrow(&store.counters, target);
        (c.up_votes, c.down_votes, c.attestations_count)
    }

    #[view]
    public fun vote_of(voter: address, target: address): u8 acquires ReputationStore {
        if (!exists<ReputationStore>(@ori)) return 0;
        let store = borrow_global<ReputationStore>(@ori);
        let key = VoteKey { voter, target };
        if (!table::contains(&store.votes, key)) return 0;
        *table::borrow(&store.votes, key)
    }

    #[view]
    public fun get_attestation(id: u64): (address, address, String, String, u64) acquires ReputationStore {
        let store = borrow_global<ReputationStore>(@ori);
        assert!(
            table::contains(&store.attestations, id),
            error::not_found(E_ATTESTATION_NOT_FOUND),
        );
        let a = table::borrow(&store.attestations, id);
        (a.attester, a.target, a.claim, a.evidence_uri, a.timestamp)
    }

    // ===== Internal =====

    fun cast_vote(voter: &signer, target: address, new_kind: u8) acquires ReputationStore {
        assert!(exists<ReputationStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        let voter_addr = signer::address_of(voter);
        assert!(voter_addr != target, error::invalid_argument(E_SELF_VOTE));

        let store = borrow_global_mut<ReputationStore>(@ori);
        let key = VoteKey { voter: voter_addr, target };
        let prev = if (table::contains(&store.votes, key)) {
            *table::borrow(&store.votes, key)
        } else { 0 };

        if (prev == new_kind) { return }; // noop

        let counters = ensure_counters(&mut store.counters, target);
        if (prev == VOTE_UP) {
            counters.up_votes = counters.up_votes - 1;
        } else if (prev == VOTE_DOWN) {
            counters.down_votes = counters.down_votes - 1;
        };
        if (new_kind == VOTE_UP) {
            counters.up_votes = counters.up_votes + 1;
        } else if (new_kind == VOTE_DOWN) {
            counters.down_votes = counters.down_votes + 1;
        };

        if (table::contains(&store.votes, key)) {
            *table::borrow_mut(&mut store.votes, key) = new_kind;
        } else {
            table::add(&mut store.votes, key, new_kind);
        };

        let (_, ts) = block::get_block_info();
        event::emit(VoteCast { voter: voter_addr, target, kind: new_kind, timestamp: ts });
    }

    fun ensure_counters(counters: &mut Table<address, Counters>, target: address): &mut Counters {
        if (!table::contains(counters, target)) {
            table::add(counters, target, Counters {
                up_votes: 0,
                down_votes: 0,
                attestations_count: 0,
            });
        };
        table::borrow_mut(counters, target)
    }

    // ===== Tests =====

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_vote_counts(chain: &signer, alice: &signer, bob: &signer) acquires ReputationStore {
        init_module(chain);
        thumbs_up(alice, signer::address_of(bob));
        let (up, down, atts) = get_counters(signer::address_of(bob));
        assert!(up == 1 && down == 0 && atts == 0, 100);
        assert!(vote_of(signer::address_of(alice), signer::address_of(bob)) == VOTE_UP, 101);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_vote_idempotent(chain: &signer, alice: &signer, bob: &signer) acquires ReputationStore {
        init_module(chain);
        thumbs_up(alice, signer::address_of(bob));
        thumbs_up(alice, signer::address_of(bob));
        let (up, _, _) = get_counters(signer::address_of(bob));
        assert!(up == 1, 200);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_flip_vote(chain: &signer, alice: &signer, bob: &signer) acquires ReputationStore {
        init_module(chain);
        thumbs_up(alice, signer::address_of(bob));
        thumbs_down(alice, signer::address_of(bob));
        let (up, down, _) = get_counters(signer::address_of(bob));
        assert!(up == 0 && down == 1, 300);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_retract(chain: &signer, alice: &signer, bob: &signer) acquires ReputationStore {
        init_module(chain);
        thumbs_up(alice, signer::address_of(bob));
        retract_vote(alice, signer::address_of(bob));
        let (up, _, _) = get_counters(signer::address_of(bob));
        assert!(up == 0, 400);
        assert!(vote_of(signer::address_of(alice), signer::address_of(bob)) == 0, 401);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10002, location = Self)]
    fun test_self_vote_aborts(chain: &signer, alice: &signer) acquires ReputationStore {
        init_module(chain);
        thumbs_up(alice, signer::address_of(alice));
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_attest(chain: &signer, alice: &signer, bob: &signer) acquires ReputationStore {
        init_module(chain);
        attest(
            alice,
            signer::address_of(bob),
            string::utf8(b"Paid on time"),
            string::utf8(b"https://scan.initia/tx/0xabc"),
        );
        let (_, _, atts) = get_counters(signer::address_of(bob));
        assert!(atts == 1, 500);
        let (attester, target, claim, uri, _) = get_attestation(1);
        assert!(attester == signer::address_of(alice), 501);
        assert!(target == signer::address_of(bob), 502);
        let _ = claim; let _ = uri;
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun test_self_attest_aborts(chain: &signer, alice: &signer) acquires ReputationStore {
        init_module(chain);
        attest(alice, signer::address_of(alice), string::utf8(b"self"), string::utf8(b""));
    }
}
