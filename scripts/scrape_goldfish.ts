import { supabase } from '../lib/supabase';
import { scrapeTournaments, scrapeTournamentResults, scrapeDecklist } from '../lib/goldfish';
import { fetchCardsBulk } from '../lib/scryfall';

async function main() {
    console.log('--- Starting MTG Goldfish Scrape ---');

    const formats = (process.env.FORMATS || 'standard').split(',');

    for (const formatName of formats) {
        console.log(`Processing format: ${formatName}`);
        const tournaments = await scrapeTournaments(formatName);

        for (const tournament of tournaments) {
            // Check if tournament already exists
            const { data: existingTournament } = await supabase
                .from('tournaments')
                .select('id')
                .eq('external_id', tournament.external_id)
                .single();

            if (existingTournament) {
                console.log(`Tournament ${tournament.name} (${tournament.external_id}) already exists. Skipping.`);
                continue;
            }

            // Create tournament
            const { data: newTournament, error: tError } = await supabase
                .from('tournaments')
                .insert({
                    external_id: tournament.external_id,
                    name: tournament.name,
                    date: tournament.date,
                    format: formatName,
                    source: 'mtggoldfish'
                })
                .select()
                .single();

            if (tError || !newTournament) {
                console.error(`Failed to create tournament:`, tError?.message);
                continue;
            }

            console.log(`Created tournament: ${newTournament.name}`);

            // Get deck URLs
            const deckUrls = await scrapeTournamentResults(tournament.url);

            for (const deckUrl of deckUrls) {
                const deckData = await scrapeDecklist(deckUrl);
                if (!deckData) continue;

                // Create decklist
                const { data: newDeck, error: dError } = await supabase
                    .from('decklists')
                    .insert({
                        tournament_id: newTournament.id,
                        player_name: deckData.player_name,
                        rank: deckData.rank,
                        deck_name: deckData.deck_name,
                        external_url: deckData.url
                    })
                    .select()
                    .single();

                if (dError || !newDeck) {
                    console.error(`Failed to create decklist:`, dError?.message);
                    continue;
                }

                // Prepare card entries
                const cardEntries = deckData.cards.map(c => ({
                    decklist_id: newDeck.id,
                    card_name: c.name,
                    quantity: c.quantity,
                    is_sideboard: c.is_sideboard
                }));

                // Ensure cards exist in the 'cards' table (simplified placeholder, enrichment script handles bulk)
                const uniqueCardNames = [...new Set(deckData.cards.map(c => c.name))];
                for (const name of uniqueCardNames) {
                    await supabase.from('cards').upsert({ name }, { onConflict: 'name' });
                }

                // Insert decklist cards
                const { error: dcError } = await supabase
                    .from('decklist_cards')
                    .insert(cardEntries);

                if (dcError) {
                    console.error(`Failed to insert cards for deck ${newDeck.id}:`, dcError.message);
                }
            }
        }
    }

    console.log('--- MTG Goldfish Scrape Complete ---');
}

main().catch(console.error);
