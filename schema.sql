-- Database Schema for MTG Meta Analytics

-- 1. Cards Table: Stores primary card metadata from Scryfall
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    mana_cost TEXT,
    cmc DOUBLE PRECISION,
    type_line TEXT,
    is_land BOOLEAN DEFAULT FALSE,
    scryfall_uri TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tournaments Table: Stores event metadata
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE, -- e.g., 'challenge-12345'
    name TEXT NOT NULL,
    date DATE NOT NULL,
    format TEXT NOT NULL,
    source TEXT NOT NULL, -- 'mtggoldfish' or 'melee'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Decklists Table: Stores individual deck entries
CREATE TABLE IF NOT EXISTS decklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    player_name TEXT,
    rank INTEGER,
    deck_name TEXT,
    external_url TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Decklist Cards Table: Join table for deck contents
CREATE TABLE IF NOT EXISTS decklist_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decklist_id UUID REFERENCES decklists(id) ON DELETE CASCADE,
    card_name TEXT REFERENCES cards(name),
    quantity INTEGER NOT NULL,
    is_sideboard BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_cmc ON cards(cmc);
CREATE INDEX IF NOT EXISTS idx_cards_is_land ON cards(is_land);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON tournaments(date);
CREATE INDEX IF NOT EXISTS idx_decklist_cards_decklist_id ON decklist_cards(decklist_id);
