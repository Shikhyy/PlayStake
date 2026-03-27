/// playstake::settle
/// Permissionless settlement with integrated player XP/badge updates.
/// Bettor passes their PlayerProfile to update it atomically.
module playstake::settle {
    use playstake::market::Bet;
    use playstake::market::Market;
    use playstake::oracle::MatchResult;
    use playstake::player::PlayerProfile;
    use sui::object::UID;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use sui::event::emit;

    const E_MATCH_MISMATCH: u64 = 200;
    const E_NOT_FINALIZED: u64 = 201;
    const FEE_BPS: u64 = 200;
    const BPS_DIVISOR: u64 = 10000;

    public struct BetSettled has copy, drop {
        record_id: address,
        bet_id: address,
        bettor: address,
        won: bool,
        stake: u64,
        payout: u64,
    }

    public struct SettlementRecord has key, store {
        id: UID,
        bet_id: address,
        bettor: address,
        stake: u64,
        payout: u64,
        won: bool,
    }

    public entry fun settle_bet_with_profile(
        market: &mut Market,
        bet: Bet,
        result: &MatchResult,
        profile: &mut PlayerProfile,
        ctx: &mut TxContext,
    ) {
        let (bettor, subject, claim, stake, odds, settled, game, bet_id) =
            playstake::market::destructure_bet_with_game(bet);
        if (settled) return;

        assert!(playstake::oracle::result_match_id(result) == playstake::market::match_id(market), E_MATCH_MISMATCH);
        assert!(playstake::market::is_finalized(market), E_NOT_FINALIZED);

        let won = playstake::oracle::evaluate_claim(&claim, result, subject);
        let payout = if (won) {
            let raw = stake * odds / 100;
            let net_payout = raw - (raw * FEE_BPS / BPS_DIVISOR);
            playstake::market::pay_winner(market, net_payout, bettor, ctx);
            net_payout
        } else {
            0
        };

        let record = SettlementRecord {
            id: sui::object::new(ctx),
            bet_id,
            bettor,
            stake,
            payout,
            won,
        };
        emit(BetSettled {
            record_id: sui::object::uid_to_address(&record.id),
            bet_id,
            bettor,
            won,
            stake,
            payout,
        });
        transfer::transfer(record, bettor);

        playstake::player::update_on_settlement(profile, won, stake, payout, game, ctx);
    }

    public entry fun settle_bet_entry(
        market: &mut Market,
        bet: Bet,
        result: &MatchResult,
        ctx: &mut TxContext,
    ) {
        let (bettor, subject, claim, stake, odds, settled, _game, bet_id) =
            playstake::market::destructure_bet_with_game(bet);
        if (settled) return;

        assert!(playstake::oracle::result_match_id(result) == playstake::market::match_id(market), E_MATCH_MISMATCH);
        assert!(playstake::market::is_finalized(market), E_NOT_FINALIZED);

        let won = playstake::oracle::evaluate_claim(&claim, result, subject);
        let payout = if (won) {
            let raw = stake * odds / 100;
            let net_payout = raw - (raw * FEE_BPS / BPS_DIVISOR);
            playstake::market::pay_winner(market, net_payout, bettor, ctx);
            net_payout
        } else {
            0
        };

        let record = SettlementRecord {
            id: sui::object::new(ctx),
            bet_id,
            bettor,
            stake,
            payout,
            won,
        };
        emit(BetSettled {
            record_id: sui::object::uid_to_address(&record.id),
            bet_id,
            bettor,
            won,
            stake,
            payout,
        });
        transfer::transfer(record, bettor);
    }

    public fun get_payout(stake: u64, odds: u64, won: bool): u64 {
        if (!won) return 0;
        let raw = stake * odds / 100;
        raw - (raw * FEE_BPS / BPS_DIVISOR)
    }
}
