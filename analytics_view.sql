-- View to calculate the Spell Snare Metric over time
-- Logic: (Count of non-land cards with CMC 2) / (Total count of non-land cards)
-- Grouped by tournament date

CREATE OR REPLACE VIEW spell_snare_metric AS
WITH daily_stats AS (
    SELECT 
        t.date,
        SUM(CASE WHEN c.cmc = 2 AND c.is_land = FALSE THEN dc.quantity ELSE 0 END) as cmc_2_count,
        SUM(CASE WHEN c.is_land = FALSE THEN dc.quantity ELSE 0 END) as total_non_land_count
    FROM tournaments t
    JOIN decklists d ON d.tournament_id = t.id
    JOIN decklist_cards dc ON dc.decklist_id = d.id
    JOIN cards c ON c.name = dc.card_name
    GROUP BY t.date
)
SELECT 
    date,
    cmc_2_count,
    total_non_land_count,
    CASE 
        WHEN total_non_land_count > 0 THEN (cmc_2_count::float / total_non_land_count::float) * 100 
        ELSE 0 
    END as spell_snare_value
FROM daily_stats
ORDER BY date DESC;

-- View to find the most played 2-mana cards
CREATE OR REPLACE VIEW top_2_mana_cards AS
SELECT 
    c.name,
    SUM(dc.quantity) as total_quantity,
    COUNT(DISTINCT dc.decklist_id) as deck_count
FROM cards c
JOIN decklist_cards dc ON dc.card_name = c.name
WHERE c.cmc = 2 AND c.is_land = FALSE
GROUP BY c.name
ORDER BY total_quantity DESC
LIMIT 10;
