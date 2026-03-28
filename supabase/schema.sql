-- PlayStake Supabase Database Schema

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id TEXT UNIQUE NOT NULL,
  match_id BIGINT NOT NULL,
  game TEXT NOT NULL,
  stat TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold BIGINT NOT NULL,
  creator TEXT NOT NULL,
  deadline_ms BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public markets are viewable by everyone"
  ON markets FOR SELECT
  USING (true);

-- Allow authenticated insert
CREATE POLICY "Authenticated users can create markets"
  ON markets FOR INSERT
  WITH CHECK (true);

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id TEXT NOT NULL,
  bettor TEXT NOT NULL,
  subject TEXT NOT NULL,
  game TEXT NOT NULL,
  stat TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold BIGINT NOT NULL,
  stake BIGINT NOT NULL,
  odds REAL NOT NULL,
  is_yes BOOLEAN NOT NULL,
  settled BOOLEAN DEFAULT FALSE,
  won BOOLEAN,
  payout BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public bets are viewable by everyone"
  ON bets FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create bets"
  ON bets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update settled bets"
  ON bets FOR UPDATE
  USING (true);

-- Player profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id TEXT UNIQUE NOT NULL,
  wallet TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  xp BIGINT DEFAULT 0,
  wins BIGINT DEFAULT 0,
  losses BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_markets_match_id ON markets(match_id);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_bettor ON bets(bettor);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(wallet);
