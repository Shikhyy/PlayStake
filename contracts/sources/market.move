/// playstake::market
/// Core bet placement, escrow locking, and market management.
module playstake::market {
    use sui::object::UID;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::vec_map::VecMap;
    use sui::event::emit;
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};

    public struct PerformanceClaim has copy, drop, store {
        stat: u8,
        operator: u8,
        threshold: u64,
    }

    public struct Bet has key, store {
        id: UID,
        match_id: u64,
        game: vector<u8>,
        bettor: address,
        subject: address,
        claim: PerformanceClaim,
        stake: u64,
        odds: u64,
        settled: bool,
    }

    public struct Market has key {
        id: UID,
        match_id: u64,
        yes_pool: u64,
        no_pool: u64,
        pool: Balance<SUI>,
        bet_ids: vector<address>,
        deadline_ms: u64,
        finalized: bool,
    }

    const E_MARKET_CLOSED: u64 = 1;
    const E_ZERO_STAKE: u64 = 5;
    const MIN_ODDS: u64 = 105;
    const MAX_ODDS: u64 = 1000;

    public struct MarketCreated has copy, drop {
        market_id: address,
        match_id: u64,
        deadline_ms: u64,
    }

    public entry fun create_market(
        match_id: u64,
        deadline_ms: u64,
        ctx: &mut TxContext,
    ) {
        let market = Market {
            id: sui::object::new(ctx),
            match_id,
            yes_pool: 0,
            no_pool: 0,
            pool: balance::zero(),
            bet_ids: vector::empty(),
            deadline_ms,
            finalized: false,
        };
        let market_id = sui::object::uid_to_address(&market.id);
        emit(MarketCreated {
            market_id,
            match_id,
            deadline_ms,
        });
        transfer::share_object(market);
    }

    public entry fun place_bet(
        market: &mut Market,
        subject: address,
        game: vector<u8>,
        stat: u8,
        operator: u8,
        threshold: u64,
        payment: Coin<SUI>,
        is_yes: bool,
        ctx: &mut TxContext,
    ) {
        assert!(!market.finalized, E_MARKET_CLOSED);
        let stake = coin::value(&payment);
        assert!(stake > 0, E_ZERO_STAKE);

        balance::join(&mut market.pool, coin::into_balance(payment));

        let odds = compute_odds(market.yes_pool, market.no_pool, stake, is_yes);
        
        if (is_yes) {
            market.yes_pool = market.yes_pool + stake;
        } else {
            market.no_pool = market.no_pool + stake;
        };

        let bettor = tx_context::sender(ctx);
        let bet = Bet {
            id: sui::object::new(ctx),
            match_id: market.match_id,
            game,
            bettor,
            subject,
            claim: PerformanceClaim { stat, operator, threshold },
            stake,
            odds,
            settled: false,
        };

        vector::push_back(&mut market.bet_ids, sui::object::uid_to_address(&bet.id));
        transfer::transfer(bet, bettor);
    }

    public fun build_claim(stat: u8, operator: u8, threshold: u64): PerformanceClaim {
        PerformanceClaim { stat, operator, threshold }
    }

    public fun get_odds(market: &Market): (u64, u64) {
        (market.yes_pool, market.no_pool)
    }

    public fun is_finalized(market: &Market): bool { market.finalized }
    public fun match_id(market: &Market): u64 { market.match_id }

    fun compute_odds(yes_pool: u64, no_pool: u64, stake: u64, is_yes: bool): u64 {
        let y = yes_pool + 1;
        let n = no_pool + 1;
        let total = y + n + stake;
        let raw = if (is_yes) {
            total * 100 / (y + stake)
        } else {
            total * 100 / (n + stake)
        };
        if (raw < MIN_ODDS) MIN_ODDS
        else if (raw > MAX_ODDS) MAX_ODDS
        else raw
    }

    public fun claim_stat(c: &PerformanceClaim): u8 { c.stat }
    public fun claim_operator(c: &PerformanceClaim): u8 { c.operator }
    public fun claim_threshold(c: &PerformanceClaim): u64 { c.threshold }

    public fun bet_id_addr(bet: &Bet): address { sui::object::uid_to_address(&bet.id) }
    public fun bet_bettor(bet: &Bet): address { bet.bettor }

    public fun destructure_bet(bet: Bet): (address, address, PerformanceClaim, u64, u64, bool) {
        let Bet { id, match_id: _, game: _, bettor, subject, claim, stake, odds, settled } = bet;
        sui::object::delete(id);
        (bettor, subject, claim, stake, odds, settled)
    }

    public fun destructure_bet_with_game(bet: Bet): (address, address, PerformanceClaim, u64, u64, bool, vector<u8>, address) {
        let Bet { id, match_id: _, game, bettor, subject, claim, stake, odds, settled } = bet;
        let bet_id = sui::object::uid_to_address(&id);
        sui::object::delete(id);
        (bettor, subject, claim, stake, odds, settled, game, bet_id)
    }

    public fun bet_game(bet: &Bet): vector<u8> { bet.game }

    public fun mark_bet_settled(bet: &mut Bet) {
        bet.settled = true;
    }

    public(package) fun finalize(market: &mut Market) {
        market.finalized = true;
    }

    public(package) fun pay_winner(market: &mut Market, amount: u64, recipient: address, ctx: &mut TxContext) {
        let available = balance::value(&market.pool);
        let actual_amount = if (amount > available) available else amount;
        if (actual_amount > 0) {
            let extracted = balance::split(&mut market.pool, actual_amount);
            transfer::public_transfer(coin::from_balance(extracted, ctx), recipient);
        }
    }
}
