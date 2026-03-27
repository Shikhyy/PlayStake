/// playstake::market_tests
#[test_only]
module playstake::market_tests {
    use sui::test_scenario as ts;
    use playstake::market::{Self, Market};
    use playstake::oracle::{Self, OracleCap};

    const PLAYER: address = @0xA;
    const ORACLE: address = @0xC;
    const MATCH_ID: u64 = 9999;
    const DEADLINE: u64 = 9999999999;

    #[test]
    fun test_create_market() {
        let mut scenario = ts::begin(PLAYER);
        ts::next_tx(&mut scenario, PLAYER);
        {
            market::create_market(MATCH_ID, DEADLINE, ts::ctx(&mut scenario));
        };
        ts::end(scenario);
    }

    #[test]
    fun test_build_claim() {
        let claim = market::build_claim(0, 0, 5000);
        assert!(market::claim_stat(&claim) == 0, 0);
        assert!(market::claim_operator(&claim) == 0, 0);
        assert!(market::claim_threshold(&claim) == 5000, 0);
    }

    #[test]
    fun test_oracle_init() {
        let mut scenario = ts::begin(ORACLE);
        ts::next_tx(&mut scenario, ORACLE);
        {
            oracle::init_for_testing(ts::ctx(&mut scenario));
        };
        ts::next_tx(&mut scenario, ORACLE);
        {
            assert!(ts::has_most_recent_for_sender<OracleCap>(&scenario), 0);
        };
        ts::end(scenario);
    }
}
