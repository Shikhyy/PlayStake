/// playstake::oracle
/// Receives verified match results and evaluates claims.
module playstake::oracle {
    use sui::object::UID;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::vec_map::VecMap;
    use sui::event::emit;
    use playstake::market::{Self, PerformanceClaim, Market};

    const STAT_DAMAGE: u8 = 0;
    const STAT_KILLS: u8 = 1;
    const STAT_PLACEMENT: u8 = 2;
    const STAT_GOLD: u8 = 3;

    const OP_GTE: u8 = 0;
    const OP_LTE: u8 = 1;
    const OP_EQ: u8 = 2;

    public struct PlayerStats has copy, drop, store {
        damage_dealt: u64,
        kills: u64,
        placement: u64,
        gold_earned: u64,
    }

    public struct MatchResult has key {
        id: UID,
        match_id: u64,
        stats: VecMap<address, PlayerStats>,
        finalized_at: u64,
    }

    public struct OracleCap has key { id: UID }

    public struct MatchResultPosted has copy, drop {
        result_id: address,
        match_id: u64,
        finalized_at: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(OracleCap { id: sui::object::new(ctx) }, tx_context::sender(ctx));
    }

    public entry fun post_result(
        _cap: &OracleCap,
        match_id: u64,
        finalized_at: u64,
        ctx: &mut TxContext,
    ) {
        let result = MatchResult {
            id: sui::object::new(ctx),
            match_id,
            stats: sui::vec_map::empty(),
            finalized_at,
        };
        let result_id = sui::object::uid_to_address(&result.id);
        emit(MatchResultPosted {
            result_id,
            match_id,
            finalized_at,
        });
        transfer::share_object(result);
    }

    public fun add_player_stats(
        result: &mut MatchResult,
        player: address,
        damage_dealt: u64,
        kills: u64,
        placement: u64,
        gold_earned: u64,
    ) {
        sui::vec_map::insert(&mut result.stats, player, PlayerStats {
            damage_dealt,
            kills,
            placement,
            gold_earned,
        });
    }

    public fun evaluate_claim(
        claim: &PerformanceClaim,
        result: &MatchResult,
        subject: address,
    ): bool {
        if (!sui::vec_map::contains(&result.stats, &subject)) return false;
        let stats = sui::vec_map::get(&result.stats, &subject);
        let actual = get_stat(stats, playstake::market::claim_stat(claim));
        let op = playstake::market::claim_operator(claim);
        let thresh = playstake::market::claim_threshold(claim);
        compare(actual, op, thresh)
    }

    public fun result_match_id(r: &MatchResult): u64 { r.match_id }
    public fun finalized_at(r: &MatchResult): u64 { r.finalized_at }

    fun get_stat(s: &PlayerStats, stat_idx: u8): u64 {
        if (stat_idx == STAT_DAMAGE) s.damage_dealt
        else if (stat_idx == STAT_KILLS) s.kills
        else if (stat_idx == STAT_PLACEMENT) s.placement
        else s.gold_earned
    }

    fun compare(actual: u64, op: u8, threshold: u64): bool {
        if (op == OP_GTE) actual >= threshold
        else if (op == OP_LTE) actual <= threshold
        else actual == threshold
    }

    /// Finalize a market — only the oracle can call this (requires OracleCap)
    public entry fun finalize_market(
        _cap: &OracleCap,
        market_obj: &mut Market,
    ) {
        market::finalize(market_obj);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }

    #[test_only]
    public fun create_test_result(match_id: u64, finalized_at: u64, ctx: &mut TxContext): MatchResult {
        MatchResult {
            id: sui::object::new(ctx),
            match_id,
            stats: sui::vec_map::empty(),
            finalized_at,
        }
    }

    #[test_only]
    public fun destroy_test_result(result: MatchResult) {
        let MatchResult { id, match_id: _, stats: _, finalized_at: _ } = result;
        sui::object::delete(id);
    }
}
