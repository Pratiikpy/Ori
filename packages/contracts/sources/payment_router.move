/// Payment Router -- the transfer primitive for in-chat payments.
///
/// This module is the target of auto-sign grants. Every in-chat payment calls
/// `send()` via a session key with zero wallet popups.
///
/// Uses `coin::denom_to_metadata` + `coin::transfer(sender, recipient, metadata, amount)`
/// which is the stdlib pattern shipped by SandeshKhilari01/Stream-Pay on mainnet.
module ori::payment_router {
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::error;
    use initia_std::block;
    use initia_std::coin;
    use initia_std::event;

    // ===== Errors =====
    const E_ZERO_AMOUNT: u64 = 1;
    const E_VECTOR_LENGTH_MISMATCH: u64 = 2;
    const E_EMPTY_BATCH: u64 = 3;
    const E_BATCH_LIMIT_EXCEEDED: u64 = 4;
    const E_SELF_PAYMENT: u64 = 5;

    // ===== Constants =====
    const MAX_BATCH_SIZE: u64 = 100;

    // ===== Events =====

    #[event]
    struct PaymentSent has drop, store {
        from: address,
        to: address,
        amount: u64,
        denom: String,
        memo: String,
        chat_id: String,
        timestamp: u64,
    }

    #[event]
    struct BatchPaymentSent has drop, store {
        from: address,
        recipient_count: u64,
        total_amount: u64,
        denom: String,
        batch_id: String,
        timestamp: u64,
    }

    // ===== Entry functions =====

    public entry fun send(
        sender: &signer,
        recipient: address,
        denom: String,
        amount: u64,
        memo: String,
        chat_id: String,
    ) {
        assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
        let sender_addr = signer::address_of(sender);
        assert!(sender_addr != recipient, error::invalid_argument(E_SELF_PAYMENT));

        let metadata = coin::denom_to_metadata(denom);
        coin::transfer(sender, recipient, metadata, amount);

        let (_, timestamp) = block::get_block_info();
        event::emit(PaymentSent {
            from: sender_addr,
            to: recipient,
            amount,
            denom,
            memo,
            chat_id,
            timestamp,
        });
    }

    public entry fun batch_send(
        sender: &signer,
        recipients: vector<address>,
        amounts: vector<u64>,
        memos: vector<String>,
        denom: String,
        batch_id: String,
    ) {
        let n = vector::length(&recipients);
        assert!(n > 0, error::invalid_argument(E_EMPTY_BATCH));
        assert!(n <= MAX_BATCH_SIZE, error::invalid_argument(E_BATCH_LIMIT_EXCEEDED));
        assert!(n == vector::length(&amounts), error::invalid_argument(E_VECTOR_LENGTH_MISMATCH));
        assert!(n == vector::length(&memos), error::invalid_argument(E_VECTOR_LENGTH_MISMATCH));

        let metadata = coin::denom_to_metadata(denom);
        let sender_addr = signer::address_of(sender);
        let (_, timestamp) = block::get_block_info();
        let total: u64 = 0;
        let i = 0;
        while (i < n) {
            let recipient = *vector::borrow(&recipients, i);
            let amount = *vector::borrow(&amounts, i);
            let memo = *vector::borrow(&memos, i);
            assert!(amount > 0, error::invalid_argument(E_ZERO_AMOUNT));
            assert!(sender_addr != recipient, error::invalid_argument(E_SELF_PAYMENT));

            coin::transfer(sender, recipient, metadata, amount);
            total = total + amount;

            event::emit(PaymentSent {
                from: sender_addr,
                to: recipient,
                amount,
                denom,
                memo,
                chat_id: batch_id,
                timestamp,
            });

            i = i + 1;
        };

        event::emit(BatchPaymentSent {
            from: sender_addr,
            recipient_count: n,
            total_amount: total,
            denom,
            batch_id,
            timestamp,
        });
    }

    // ===== Tests =====

    #[test_only]
    use initia_std::primary_fungible_store;
    #[test_only]
    use std::option;
    #[test_only]
    use std::string;
    #[test_only]
    use initia_std::fungible_asset;
    #[test_only]
    use initia_std::object;

    #[test_only]
    const TEST_DENOM: vector<u8> = b"OTEST";

    #[test_only]
    /// Spin up a test token under @ori and seed `sender` with `amount` units.
    /// Returns the refs in case a test needs to mint more; most tests ignore.
    fun setup_test_coin(chain: &signer, sender_addr: address, amount: u64) {
        primary_fungible_store::init_module_for_test();
        let (mint_cap, _burn_cap, _freeze_cap) = coin::initialize(
            chain,
            option::none(),
            string::utf8(b"Ori Test"),
            string::utf8(TEST_DENOM),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        coin::mint_to(&mint_cap, sender_addr, amount);
        // Drop the caps so compile doesn't complain about unused moved values.
        move_refs_to_sink(mint_cap, _burn_cap, _freeze_cap);
    }

    #[test_only]
    /// Trick: move caps into a sink resource at @ori so they don't need to be
    /// destructured (Move forbids implicit drop of caps without `drop`).
    fun move_refs_to_sink(
        mint_cap: coin::MintCapability,
        burn_cap: coin::BurnCapability,
        freeze_cap: coin::FreezeCapability,
    ) {
        // MintCapability etc. have `drop` in InitiaStdlib's coin module (struct ... has drop, store).
        // We just let them drop.
        let _ = mint_cap;
        let _ = burn_cap;
        let _ = freeze_cap;
    }

    #[test_only]
    fun get_test_metadata(): object::Object<fungible_asset::Metadata> {
        coin::denom_to_metadata(string::utf8(TEST_DENOM))
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    fun test_single_send_transfers_coin(chain: &signer, alice: &signer, bob: &signer) {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        setup_test_coin(chain, alice_addr, 1_000_000);

        let metadata = get_test_metadata();
        assert!(coin::balance(alice_addr, metadata) == 1_000_000, 100);
        assert!(coin::balance(bob_addr, metadata) == 0, 101);

        send(
            alice,
            bob_addr,
            string::utf8(TEST_DENOM),
            250_000,
            string::utf8(b"lunch"),
            string::utf8(b"chat-1"),
        );

        assert!(coin::balance(alice_addr, metadata) == 750_000, 102);
        assert!(coin::balance(bob_addr, metadata) == 250_000, 103);
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x10001, location = Self)]
    fun test_zero_amount_aborts(chain: &signer, alice: &signer, bob: &signer) {
        setup_test_coin(chain, signer::address_of(alice), 1000);
        send(alice, signer::address_of(bob), string::utf8(TEST_DENOM), 0, string::utf8(b""), string::utf8(b""));
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10005, location = Self)]
    fun test_self_payment_aborts(chain: &signer, alice: &signer) {
        setup_test_coin(chain, signer::address_of(alice), 1000);
        send(alice, signer::address_of(alice), string::utf8(TEST_DENOM), 10, string::utf8(b""), string::utf8(b""));
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B, carol = @0xCA01)]
    fun test_batch_send_transfers_all(chain: &signer, alice: &signer, bob: &signer, carol: &signer) {
        let alice_addr = signer::address_of(alice);
        let bob_addr = signer::address_of(bob);
        let carol_addr = signer::address_of(carol);
        setup_test_coin(chain, alice_addr, 1_000_000);

        let recipients = vector::empty<address>();
        vector::push_back(&mut recipients, bob_addr);
        vector::push_back(&mut recipients, carol_addr);

        let amounts = vector::empty<u64>();
        vector::push_back(&mut amounts, 100);
        vector::push_back(&mut amounts, 250);

        let memos = vector::empty<String>();
        vector::push_back(&mut memos, string::utf8(b"for bob"));
        vector::push_back(&mut memos, string::utf8(b"for carol"));

        batch_send(alice, recipients, amounts, memos, string::utf8(TEST_DENOM), string::utf8(b"payday"));

        let metadata = get_test_metadata();
        assert!(coin::balance(alice_addr, metadata) == 1_000_000 - 350, 200);
        assert!(coin::balance(bob_addr, metadata) == 100, 201);
        assert!(coin::balance(carol_addr, metadata) == 250, 202);
    }

    #[test(chain = @ori, alice = @0xA11CE)]
    #[expected_failure(abort_code = 0x10003, location = Self)]
    fun test_batch_empty_aborts(chain: &signer, alice: &signer) {
        setup_test_coin(chain, signer::address_of(alice), 100);
        batch_send(
            alice,
            vector::empty<address>(),
            vector::empty<u64>(),
            vector::empty<String>(),
            string::utf8(TEST_DENOM),
            string::utf8(b""),
        );
    }

    #[test(chain = @ori, alice = @0xA11CE, bob = @0xB0B)]
    #[expected_failure(abort_code = 0x10002, location = Self)]
    fun test_batch_length_mismatch_aborts(chain: &signer, alice: &signer, bob: &signer) {
        setup_test_coin(chain, signer::address_of(alice), 100);
        let recips = vector::empty<address>();
        vector::push_back(&mut recips, signer::address_of(bob));
        let amts = vector::empty<u64>();
        vector::push_back(&mut amts, 10);
        vector::push_back(&mut amts, 20); // mismatched length
        let memos = vector::empty<String>();
        vector::push_back(&mut memos, string::utf8(b""));
        vector::push_back(&mut memos, string::utf8(b""));
        batch_send(alice, recips, amts, memos, string::utf8(TEST_DENOM), string::utf8(b""));
    }
}
