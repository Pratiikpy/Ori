/// Payment Stream -- continuously-accruing money between two addresses.
///
/// Salary that fills a glass in real time: the sender deposits up-front
/// (`rate * duration`), and the recipient can withdraw their accrued balance
/// at any moment. A stream is uniquely identified by its `stream_id`.
///
/// Not the same as subscription_vault (which is discrete periods + cron-driven).
/// Streams are continuous: `accrued = rate * min(elapsed, duration) - already_withdrawn`.
///
/// Attribution: model from Venkat5599/InitPay's salary streaming contract;
/// vault + ExtendRef pattern from `ori::gift_packet`.
module ori::payment_stream {
    use std::signer;
    use std::string::String;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::table::{Self, Table};

    // ===== Errors =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ZERO_RATE: u64 = 2;
    const E_ZERO_DURATION: u64 = 3;
    const E_STREAM_NOT_FOUND: u64 = 4;
    const E_NOT_RECIPIENT: u64 = 5;
    const E_NOT_SENDER: u64 = 6;
    const E_NOTHING_TO_WITHDRAW: u64 = 7;
    const E_ALREADY_CLOSED: u64 = 8;
    const E_SELF_STREAM: u64 = 9;
    const E_AMOUNT_OVERFLOW: u64 = 10;

    // ===== Storage =====

    struct StreamStore has key {
        next_id: u64,
        streams: Table<u64, Stream>,
        vault_extend_ref: ExtendRef,
        vault_addr: address,
        total_opened: u64,
        total_streamed: u64,
    }

    struct Stream has store, drop {
        id: u64,
        sender: address,
        recipient: address,
        rate_per_second: u64,
        duration_seconds: u64,
        started_at: u64,
        denom: String,
        total_deposited: u64,
        total_withdrawn: u64,
        closed: bool,
    }

    // ===== Events =====

    #[event]
    struct StreamOpened has drop, store {
        id: u64,
        sender: address,
        recipient: address,
        rate_per_second: u64,
        duration_seconds: u64,
        total_deposited: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct StreamWithdrawn has drop, store {
        id: u64,
        recipient: address,
        amount: u64,
        denom: String,
        timestamp: u64,
    }

    #[event]
    struct StreamClosed has drop, store {
        id: u64,
        sender: address,
        refunded_to_sender: u64,
        paid_to_recipient: u64,
        denom: String,
        timestamp: u64,
    }

    // ===== Init =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, b"ori_stream_vault");
        let vault_extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);
        move_to(deployer, StreamStore {
            next_id: 1,
            streams: table::new(),
            vault_extend_ref,
            vault_addr,
            total_opened: 0,
            total_streamed: 0,
        });
    }

    // ===== Entry functions =====

    public entry fun open_stream(
        sender: &signer,
        recipient: address,
        rate_per_second: u64,
        duration_seconds: u64,
        denom: String,
    ) acquires StreamStore {
        assert!(exists<StreamStore>(@ori), error::invalid_state(E_NOT_INITIALIZED));
        assert!(rate_per_second > 0, error::invalid_argument(E_ZERO_RATE));
        assert!(duration_seconds > 0, error::invalid_argument(E_ZERO_DURATION));

        let sender_addr = signer::address_of(sender);
        assert!(sender_addr != recipient, error::invalid_argument(E_SELF_STREAM));

        // Guard against u64 overflow on the deposit amount.
        // u64::MAX / rate_per_second is the largest safe duration.
        assert!(
            duration_seconds <= (18_446_744_073_709_551_615u64 / rate_per_second),
            error::invalid_argument(E_AMOUNT_OVERFLOW),
        );
        let total_deposit = rate_per_second * duration_seconds;

        let store = borrow_global_mut<StreamStore>(@ori);
        let id = store.next_id;
        store.next_id = id + 1;

        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(sender, store.vault_addr, metadata, total_deposit);

        let (_, ts) = block::get_block_info();
        let stream = Stream {
            id,
            sender: sender_addr,
            recipient,
            rate_per_second,
            duration_seconds,
            started_at: ts,
            denom,
            total_deposited: total_deposit,
            total_withdrawn: 0,
            closed: false,
        };
        table::add(&mut store.streams, id, stream);
        store.total_opened = store.total_opened + 1;

        event::emit(StreamOpened {
            id,
            sender: sender_addr,
            recipient,
            rate_per_second,
            duration_seconds,
            total_deposited: total_deposit,
            denom,
            timestamp: ts,
        });
    }

    public entry fun withdraw_accrued(recipient: &signer, stream_id: u64) acquires StreamStore {
        let store = borrow_global_mut<StreamStore>(@ori);
        assert!(table::contains(&store.streams, stream_id), error::not_found(E_STREAM_NOT_FOUND));

        let stream = table::borrow_mut(&mut store.streams, stream_id);
        let recipient_addr = signer::address_of(recipient);
        assert!(stream.recipient == recipient_addr, error::permission_denied(E_NOT_RECIPIENT));
        assert!(!stream.closed, error::invalid_state(E_ALREADY_CLOSED));

        let (_, ts) = block::get_block_info();
        let elapsed = ts - stream.started_at;
        if (elapsed > stream.duration_seconds) { elapsed = stream.duration_seconds };
        let accrued = stream.rate_per_second * elapsed;
        let withdrawable = accrued - stream.total_withdrawn;
        assert!(withdrawable > 0, error::invalid_state(E_NOTHING_TO_WITHDRAW));

        stream.total_withdrawn = stream.total_withdrawn + withdrawable;
        let denom = stream.denom;
        let id = stream.id;

        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(&vault_signer, recipient_addr, metadata, withdrawable);

        store.total_streamed = store.total_streamed + withdrawable;

        event::emit(StreamWithdrawn {
            id,
            recipient: recipient_addr,
            amount: withdrawable,
            denom,
            timestamp: ts,
        });
    }

    /// Sender closes a stream -- recipient is first paid anything they've
    /// accrued but not withdrawn, then the remaining unvested balance returns
    /// to the sender.
    public entry fun close_stream(sender: &signer, stream_id: u64) acquires StreamStore {
        let store = borrow_global_mut<StreamStore>(@ori);
        assert!(table::contains(&store.streams, stream_id), error::not_found(E_STREAM_NOT_FOUND));

        let stream = table::borrow_mut(&mut store.streams, stream_id);
        let sender_addr = signer::address_of(sender);
        assert!(stream.sender == sender_addr, error::permission_denied(E_NOT_SENDER));
        assert!(!stream.closed, error::invalid_state(E_ALREADY_CLOSED));

        let (_, ts) = block::get_block_info();
        let elapsed = ts - stream.started_at;
        if (elapsed > stream.duration_seconds) { elapsed = stream.duration_seconds };
        let accrued = stream.rate_per_second * elapsed;
        let recipient_portion = accrued - stream.total_withdrawn;
        let refund = stream.total_deposited - accrued;

        stream.closed = true;
        stream.total_withdrawn = accrued;
        let denom = stream.denom;
        let id = stream.id;
        let recipient = stream.recipient;

        let vault_signer = object::generate_signer_for_extending(&store.vault_extend_ref);
        let metadata = coin::denom_to_metadata(denom);
        if (recipient_portion > 0) {
            coin::transfer(&vault_signer, recipient, metadata, recipient_portion);
        };
        if (refund > 0) {
            coin::transfer(&vault_signer, sender_addr, metadata, refund);
        };

        event::emit(StreamClosed {
            id,
            sender: sender_addr,
            refunded_to_sender: refund,
            paid_to_recipient: recipient_portion,
            denom,
            timestamp: ts,
        });
    }

    // ===== View functions =====

    #[view]
    public fun stream_exists(stream_id: u64): bool acquires StreamStore {
        if (!exists<StreamStore>(@ori)) return false;
        table::contains(&borrow_global<StreamStore>(@ori).streams, stream_id)
    }

    #[view]
    public fun get_stream(
        stream_id: u64,
    ): (address, address, u64, u64, u64, String, u64, u64, bool) acquires StreamStore {
        let store = borrow_global<StreamStore>(@ori);
        assert!(table::contains(&store.streams, stream_id), error::not_found(E_STREAM_NOT_FOUND));
        let s = table::borrow(&store.streams, stream_id);
        (
            s.sender,
            s.recipient,
            s.rate_per_second,
            s.duration_seconds,
            s.started_at,
            s.denom,
            s.total_deposited,
            s.total_withdrawn,
            s.closed,
        )
    }

    /// Returns currently-withdrawable amount (may be 0). Handy for UIs that
    /// show a live-updating balance without pinging `get_block_info` each time.
    #[view]
    public fun withdrawable_now(stream_id: u64): u64 acquires StreamStore {
        let store = borrow_global<StreamStore>(@ori);
        assert!(table::contains(&store.streams, stream_id), error::not_found(E_STREAM_NOT_FOUND));
        let s = table::borrow(&store.streams, stream_id);
        if (s.closed) return 0;
        let (_, ts) = block::get_block_info();
        if (ts <= s.started_at) return 0;
        let elapsed = ts - s.started_at;
        if (elapsed > s.duration_seconds) { elapsed = s.duration_seconds };
        let accrued = s.rate_per_second * elapsed;
        if (accrued <= s.total_withdrawn) return 0;
        accrued - s.total_withdrawn
    }

    #[view]
    public fun vault_address(): address acquires StreamStore {
        borrow_global<StreamStore>(@ori).vault_addr
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

    #[test(chain = @ori, sender = @0xA11CE, recipient = @0xB0B)]
    fun test_open_and_withdraw(chain: &signer, sender: &signer, recipient: &signer) acquires StreamStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        initia_std::block::set_block_info(1, 1000);
        open_stream(sender, signer::address_of(recipient), 10, 100, string::utf8(TEST_DENOM));

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(vault_address(), metadata) == 1000, 100);
        // Advance 50s -- recipient should be able to withdraw 500.
        initia_std::block::set_block_info(2, 1050);
        withdraw_accrued(recipient, 1);
        assert!(coin::balance(signer::address_of(recipient), metadata) == 500, 101);
        assert!(withdrawable_now(1) == 0, 102);
    }

    #[test(chain = @ori, sender = @0xA11CE, recipient = @0xB0B)]
    fun test_close_splits_funds(chain: &signer, sender: &signer, recipient: &signer) acquires StreamStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        initia_std::block::set_block_info(1, 2000);
        open_stream(sender, signer::address_of(recipient), 20, 100, string::utf8(TEST_DENOM));

        initia_std::block::set_block_info(2, 2030); // 30s elapsed -> accrued = 600
        close_stream(sender, 1);

        let metadata = coin::denom_to_metadata(string::utf8(TEST_DENOM));
        assert!(coin::balance(signer::address_of(recipient), metadata) == 600, 200);
        // refund = 2000 - 600 = 1400
        assert!(coin::balance(signer::address_of(sender), metadata) == 1_000_000 - 2000 + 1400, 201);
    }

    #[test(chain = @ori, sender = @0xA11CE, recipient = @0xB0B)]
    #[expected_failure(abort_code = 0x30007, location = Self)]
    fun test_withdraw_zero_aborts(
        chain: &signer,
        sender: &signer,
        recipient: &signer,
    ) acquires StreamStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        initia_std::block::set_block_info(1, 1000);
        open_stream(sender, signer::address_of(recipient), 10, 100, string::utf8(TEST_DENOM));
        // No time advance -- no accrual.
        withdraw_accrued(recipient, 1);
    }

    #[test(chain = @ori, sender = @0xA11CE, attacker = @0xB0B, recipient = @0xBEEF)]
    #[expected_failure(abort_code = 0x50005, location = Self)]
    fun test_wrong_recipient_cannot_withdraw(
        chain: &signer,
        sender: &signer,
        attacker: &signer,
        _recipient: &signer,
    ) acquires StreamStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        initia_std::block::set_block_info(1, 1000);
        open_stream(sender, @0xBEEF, 10, 100, string::utf8(TEST_DENOM));
        initia_std::block::set_block_info(2, 1050);
        withdraw_accrued(attacker, 1);
    }

    #[test(chain = @ori, sender = @0xA11CE)]
    #[expected_failure(abort_code = 0x10009, location = Self)]
    fun test_self_stream_aborts(chain: &signer, sender: &signer) acquires StreamStore {
        setup(chain, signer::address_of(sender), 1_000_000);
        open_stream(sender, signer::address_of(sender), 10, 100, string::utf8(TEST_DENOM));
    }
}
