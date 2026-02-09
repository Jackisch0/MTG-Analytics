import { supabase } from '../lib/supabase';
import { fetchCardsBulk } from '../lib/scryfall';

async function main() {
    console.log('--- Starting Card Enrichment ---');

    // Find cards with missing CMC or metadata
    const { data: pendingCards, error: fetchError } = await supabase
        .from('cards')
        .select('name')
        .or('cmc.is.null,type_line.is.null')
        .limit(500);

    if (fetchError) {
        console.error('Error fetching pending cards:', fetchError.message);
        return;
    }

    if (!pendingCards || pendingCards.length === 0) {
        console.log('No cards pending enrichment.');
        return;
    }

    const cardNames = pendingCards.map(c => c.name);
    console.log(`Enriching ${cardNames.length} cards...`);

    const enrichedData = await fetchCardsBulk(cardNames);

    for (let i = 0; i < enrichedData.length; i++) {
        const card = enrichedData[i];
        const { error: updateError } = await supabase
            .from('cards')
            .update({
                mana_cost: card.mana_cost,
                cmc: card.cmc,
                type_line: card.type_line,
                is_land: card.is_land,
                scryfall_uri: card.scryfall_uri,
                updated_at: new Date().toISOString()
            })
            .eq('name', card.name);

        if (updateError) {
            console.error(`Failed to update ${card.name}:`, updateError.message);
        } else {
            console.log(`Enriched: ${card.name}`);
        }
    }

    console.log('--- Enrichment Complete ---');
}

main().catch(console.error);
