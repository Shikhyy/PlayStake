/// playstake::player
/// Player profiles, XP/level system, achievements, badges, and per-game stats.
module playstake::player {
    use sui::object::UID;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::vec_map::VecMap;
    use sui::vec_set::VecSet;

    // ─── Rank tiers ───────────────────────────────────────────────────────────
    const RANK_BRONZE:    u8 = 0;
    const RANK_SILVER:    u8 = 1;
    const RANK_GOLD:      u8 = 2;
    const RANK_PLATINUM:  u8 = 3;
    const RANK_DIAMOND:   u8 = 4;
    const RANK_CHAMPION:   u8 = 5;

    const RANK_XP: vector<u64> = vector[0, 1000, 5000, 20000, 50000, 100000];
    const XP_PER_LEVEL: u64 = 100;

    // ─── Achievement badge IDs ────────────────────────────────────────────────
    const BADGE_FIRST_BLOOD:     vector<u8> = b"first_blood";
    const BADGE_LUCKY_STREAK:   vector<u8> = b"lucky_streak_5";
    const BADGE_DIAMOND_CLUB:   vector<u8> = b"diamond_club";
    const BADGE_HIGH_ROLLER:    vector<u8> = b"high_roller";
    const BADGE_WINSTREAK_10:   vector<u8> = b"winstreak_10";
    const BADGE_NOVICE:         vector<u8> = b"novice";
    const BADGE_REGULAR:        vector<u8> = b"regular";
    const BADGE_VETERAN:        vector<u8> = b"veteran";
    const BADGE_PRO_PHENOM:     vector<u8> = b"pro_phenom";
    const BADGE_WAR_HERO:       vector<u8> = b"war_hero";
    const BADGE_MARKET_MAKER:   vector<u8> = b"market_maker";
    const BADGE_ORACLE_TRUSTED:  vector<u8> = b"oracle_trusted";

    // XP rewards
    const XP_FIRST_BLOOD:    u64 = 50;
    const XP_LUCKY_STREAK:  u64 = 200;
    const XP_DIAMOND_CLUB:   u64 = 500;
    const XP_HIGH_ROLLER:    u64 = 150;
    const XP_WINSTREAK_10:   u64 = 300;
    const XP_NOVICE:         u64 = 50;
    const XP_REGULAR:        u64 = 100;
    const XP_VETERAN:        u64 = 300;
    const XP_PRO_PHENOM:     u64 = 400;
    const XP_WAR_HERO:       u64 = 200;
    const XP_MARKET_MAKER:   u64 = 150;
    const XP_ORACLE_TRUSTED: u64 = 100;

    // ─── Structs ───────────────────────────────────────────────────────────────

    public struct PlayerProfile has key {
        id: UID,
        owner: address,
        username: vector<u8>,
        level: u64,
        xp: u64,
        xp_to_next: u64,
        rank: u8,
        total_bets: u64,
        wins: u64,
        losses: u64,
        total_staked: u64,
        total_won: u64,
        total_pnl: u64,
        games_played: VecSet<vector<u8>>,
        game_stats: VecMap<vector<u8>, GameStats>,
        unlocked_badges: VecSet<vector<u8>>,
        win_streak: u64,
        best_streak: u64,
        created_at: u64,
        last_active: u64,
    }

    public struct GameStats has copy, drop, store {
        matches_played: u64,
        wins: u64,
        losses: u64,
        total_staked: u64,
        total_won: u64,
        best_stat_damage: u64,
        best_stat_kills: u64,
        best_stat_placement: u64,
        best_stat_gold: u64,
    }

    public struct AchievementBadge has key, store {
        id: UID,
        owner: address,
        badge_id: vector<u8>,
        unlocked_at: u64,
    }

    // ─── Init ──────────────────────────────────────────────────────────────────

    public entry fun create_profile(username: vector<u8>, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        let now = tx_context::epoch_timestamp_ms(ctx);

        let profile = PlayerProfile {
            id: sui::object::new(ctx),
            owner: sender,
            username,
            level: 1,
            xp: XP_NOVICE,
            xp_to_next: XP_PER_LEVEL,
            rank: RANK_BRONZE,
            total_bets: 0,
            wins: 0,
            losses: 0,
            total_staked: 0,
            total_won: 0,
            total_pnl: 0,
            games_played: sui::vec_set::empty(),
            game_stats: sui::vec_map::empty(),
            unlocked_badges: sui::vec_set::empty(),
            win_streak: 0,
            best_streak: 0,
            created_at: now,
            last_active: now,
        };

        transfer::transfer(profile, sender);
    }

    // ─── Settlement update ─────────────────────────────────────────────────────

    public entry fun update_on_settlement(
        profile: &mut PlayerProfile,
        won: bool,
        stake: u64,
        payout: u64,
        game: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let now = tx_context::epoch_timestamp_ms(ctx);
        profile.total_bets = profile.total_bets + 1;
        profile.total_staked = profile.total_staked + stake;
        profile.last_active = now;

        if (!sui::vec_set::contains(&profile.games_played, &game)) {
            sui::vec_set::insert(&mut profile.games_played, game);
        };

        ensure_game_stats(profile, &game);

        if (won) {
            profile.wins = profile.wins + 1;
            profile.total_won = profile.total_won + payout;
            // P&L: add net profit (payout - stake), safe from underflow
            if (payout >= stake) {
                profile.total_pnl = profile.total_pnl + (payout - stake);
            } else if (profile.total_pnl >= (stake - payout)) {
                profile.total_pnl = profile.total_pnl - (stake - payout);
            } else {
                profile.total_pnl = 0;
            };
            profile.win_streak = profile.win_streak + 1;
            if (profile.win_streak > profile.best_streak) {
                profile.best_streak = profile.win_streak;
            };
            let stats = sui::vec_map::get_mut(&mut profile.game_stats, &game);
            stats.wins = stats.wins + 1;
            stats.total_won = stats.total_won + payout;
            stats.total_staked = stats.total_staked + stake;

            grant_xp(profile, 100, now);
            check_badges(profile, payout, stake);
        } else {
            profile.losses = profile.losses + 1;
            // P&L: subtract stake safely, clamp to 0
            if (profile.total_pnl >= stake) {
                profile.total_pnl = profile.total_pnl - stake;
            } else {
                profile.total_pnl = 0;
            };
            profile.win_streak = 0;
            let stats = sui::vec_map::get_mut(&mut profile.game_stats, &game);
            stats.losses = stats.losses + 1;
            stats.total_staked = stats.total_staked + stake;

            grant_xp(profile, 10, now);
        };

        recompute_rank(profile);
    }

    public entry fun update_stats(
        profile: &mut PlayerProfile,
        game: vector<u8>,
        damage_dealt: u64,
        kills: u64,
        placement: u64,
        gold_earned: u64,
        _ctx: &mut TxContext,
    ) {
        if (!sui::vec_set::contains(&profile.games_played, &game)) {
            sui::vec_set::insert(&mut profile.games_played, game);
        };
        ensure_game_stats(profile, &game);

        let stats = sui::vec_map::get_mut(&mut profile.game_stats, &game);
        stats.matches_played = stats.matches_played + 1;
        if (damage_dealt > stats.best_stat_damage) stats.best_stat_damage = damage_dealt;
        if (kills > stats.best_stat_kills) stats.best_stat_kills = kills;
        if (placement < stats.best_stat_placement || stats.best_stat_placement == 0) {
            stats.best_stat_placement = placement;
        };
        if (gold_earned > stats.best_stat_gold) stats.best_stat_gold = gold_earned;
    }

    // ─── XP & Level ───────────────────────────────────────────────────────────

    fun grant_xp(profile: &mut PlayerProfile, amount: u64, now: u64) {
        profile.xp = profile.xp + amount;
        while (profile.xp >= profile.xp_to_next) {
            profile.xp = profile.xp - profile.xp_to_next;
            profile.level = profile.level + 1;
            profile.xp_to_next = XP_PER_LEVEL + profile.level * 20;
        };
        profile.last_active = now;
    }

    fun recompute_rank(profile: &mut PlayerProfile) {
        let total = xp_for_rank(profile.rank) + profile.xp;
        let mut new_rank = RANK_BRONZE;
        let mut i = 0u64;
        while (i < 6) {
            if (total >= *vector::borrow(&RANK_XP, i)) {
                new_rank = i as u8;
            };
            i = i + 1;
        };
        profile.rank = new_rank;
    }

    fun xp_for_rank(rank: u8): u64 {
        let idx = (rank as u64);
        if (idx >= 6) return 0;
        *vector::borrow(&RANK_XP, idx)
    }

    // ─── Badges ───────────────────────────────────────────────────────────────

    fun check_badges(profile: &mut PlayerProfile, payout: u64, stake: u64) {
        // First bet
        if (profile.total_bets == 1) {
            grant_badge_internal(profile, BADGE_FIRST_BLOOD, XP_FIRST_BLOOD);
        };
        // High roller — single bet > 10000 USDO (raw units)
        if (stake > 10_000_000_000) {
            grant_badge_internal(profile, BADGE_HIGH_ROLLER, XP_HIGH_ROLLER);
        };
        // Lucky streak — 5 wins in a row
        if (profile.win_streak >= 5) {
            grant_badge_internal(profile, BADGE_LUCKY_STREAK, XP_LUCKY_STREAK);
        };
        // Winstreak 10
        if (profile.best_streak >= 10) {
            grant_badge_internal(profile, BADGE_WINSTREAK_10, XP_WINSTREAK_10);
        };
        // Diamond club
        if (profile.rank >= RANK_DIAMOND) {
            grant_badge_internal(profile, BADGE_DIAMOND_CLUB, XP_DIAMOND_CLUB);
        };
        // Veteran — 50+ bets
        if (profile.total_bets >= 50) {
            grant_badge_internal(profile, BADGE_VETERAN, XP_VETERAN);
        };
        // Regular — 10+ bets
        if (profile.total_bets >= 10) {
            grant_badge_internal(profile, BADGE_REGULAR, XP_REGULAR);
        };
        // Pro phenom — 70%+ win rate with 10+ bets
        if (profile.total_bets >= 10 && profile.wins >= (profile.total_bets * 70 / 100)) {
            grant_badge_internal(profile, BADGE_PRO_PHENOM, XP_PRO_PHENOM);
        };
        // War hero — win > 5M raw in one settlement
        if (payout > 5_000_000_000) {
            grant_badge_internal(profile, BADGE_WAR_HERO, XP_WAR_HERO);
        };
        // Market maker — win > 1M raw in one settlement
        if (payout > 1_000_000_000) {
            grant_badge_internal(profile, BADGE_MARKET_MAKER, XP_MARKET_MAKER);
        };
    }

    fun grant_badge_internal(profile: &mut PlayerProfile, badge_id: vector<u8>, xp_reward: u64) {
        if (!has_badge(profile, badge_id)) {
            let ts = profile.last_active;
            sui::vec_set::insert(&mut profile.unlocked_badges, badge_id);
            grant_xp(profile, xp_reward, ts);
        }
    }

    public entry fun grant_oracle_trusted(profile: &mut PlayerProfile, ctx: &mut TxContext) {
        if (!has_badge(profile, BADGE_ORACLE_TRUSTED)) {
            sui::vec_set::insert(&mut profile.unlocked_badges, BADGE_ORACLE_TRUSTED);
            grant_xp(profile, XP_ORACLE_TRUSTED, tx_context::epoch_timestamp_ms(ctx));
        }
    }

    public entry fun claim_badge(profile: &mut PlayerProfile, badge_id: vector<u8>, ctx: &mut TxContext) {
        assert!(sui::vec_set::contains(&profile.unlocked_badges, &badge_id), 0);
        let badge = AchievementBadge {
            id: sui::object::new(ctx),
            owner: tx_context::sender(ctx),
            badge_id,
            unlocked_at: tx_context::epoch_timestamp_ms(ctx),
        };
        transfer::transfer(badge, tx_context::sender(ctx));
    }

    fun has_badge(profile: &PlayerProfile, badge_id: vector<u8>): bool {
        sui::vec_set::contains(&profile.unlocked_badges, &badge_id)
    }

    fun ensure_game_stats(profile: &mut PlayerProfile, game: &vector<u8>) {
        if (!sui::vec_map::contains(&profile.game_stats, game)) {
            sui::vec_map::insert(&mut profile.game_stats, *game, GameStats {
                matches_played: 0,
                wins: 0,
                losses: 0,
                total_staked: 0,
                total_won: 0,
                best_stat_damage: 0,
                best_stat_kills: 0,
                best_stat_placement: 0,
                best_stat_gold: 0,
            });
        }
    }

    // ─── View getters ─────────────────────────────────────────────────────────

    public fun profile_owner(p: &PlayerProfile): address { p.owner }
    public fun profile_level(p: &PlayerProfile): u64 { p.level }
    public fun profile_xp(p: &PlayerProfile): u64 { p.xp }
    public fun profile_xp_to_next(p: &PlayerProfile): u64 { p.xp_to_next }
    public fun profile_rank(p: &PlayerProfile): u8 { p.rank }
    public fun profile_total_bets(p: &PlayerProfile): u64 { p.total_bets }
    public fun profile_wins(p: &PlayerProfile): u64 { p.wins }
    public fun profile_losses(p: &PlayerProfile): u64 { p.losses }
    public fun profile_total_staked(p: &PlayerProfile): u64 { p.total_staked }
    public fun profile_total_won(p: &PlayerProfile): u64 { p.total_won }
    public fun profile_total_pnl(p: &PlayerProfile): u64 { p.total_pnl }
    public fun profile_win_streak(p: &PlayerProfile): u64 { p.win_streak }
    public fun profile_best_streak(p: &PlayerProfile): u64 { p.best_streak }
    public fun profile_created_at(p: &PlayerProfile): u64 { p.created_at }
    public fun profile_last_active(p: &PlayerProfile): u64 { p.last_active }
    public fun profile_games_count(p: &PlayerProfile): u64 { sui::vec_set::length(&p.games_played) }
    public fun profile_badge_count(p: &PlayerProfile): u64 { sui::vec_set::length(&p.unlocked_badges) }
    public fun profile_username(p: &PlayerProfile): &vector<u8> { &p.username }

    public fun rank_name(r: u8): vector<u8> {
        if (r == RANK_BRONZE)   return b"Bronze";
        if (r == RANK_SILVER)   return b"Silver";
        if (r == RANK_GOLD)     return b"Gold";
        if (r == RANK_PLATINUM) return b"Platinum";
        if (r == RANK_DIAMOND)  return b"Diamond";
        if (r == RANK_CHAMPION) return b"Champion";
        b"Unknown"
    }

    public fun badge_name(id: vector<u8>): vector<u8> {
        if (id == BADGE_FIRST_BLOOD)    return b"First Blood";
        if (id == BADGE_LUCKY_STREAK)  return b"Lucky Streak";
        if (id == BADGE_DIAMOND_CLUB)   return b"Diamond Club";
        if (id == BADGE_HIGH_ROLLER)   return b"High Roller";
        if (id == BADGE_WINSTREAK_10)   return b"Unstoppable";
        if (id == BADGE_NOVICE)         return b"Novice";
        if (id == BADGE_REGULAR)        return b"Regular";
        if (id == BADGE_VETERAN)        return b"Veteran";
        if (id == BADGE_PRO_PHENOM)     return b"Pro Phenom";
        if (id == BADGE_WAR_HERO)       return b"War Hero";
        if (id == BADGE_MARKET_MAKER)  return b"Market Maker";
        if (id == BADGE_ORACLE_TRUSTED) return b"Oracle Trusted";
        b"Unknown"
    }

    public fun all_badge_ids(): vector<vector<u8>> {
        vector[
            BADGE_FIRST_BLOOD,
            BADGE_LUCKY_STREAK,
            BADGE_DIAMOND_CLUB,
            BADGE_HIGH_ROLLER,
            BADGE_WINSTREAK_10,
            BADGE_NOVICE,
            BADGE_REGULAR,
            BADGE_VETERAN,
            BADGE_PRO_PHENOM,
            BADGE_WAR_HERO,
            BADGE_MARKET_MAKER,
            BADGE_ORACLE_TRUSTED,
        ]
    }

    // ─── Test helpers ─────────────────────────────────────────────────────────

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        create_profile(b"TestPlayer", ctx);
    }
}
