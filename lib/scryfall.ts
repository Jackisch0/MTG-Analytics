import axios from 'axios';

export interface ScryfallCard {
    name: string;
    mana_cost: string;
    cmc: number;
    type_line: string;
    scryfall_uri: string;
    is_land: boolean;
}

const SCRYFALL_BASE_URL = 'https://api.scryfall.com';

/**
 * Fetches card metadata from Scryfall.
 * Implements recommended rate limiting (100ms delay).
 */
export async function fetchCardFromScryfall(cardName: string): Promise<ScryfallCard | null> {
    try {
        console.log(`Fetching ${cardName} from Scryfall...`);
        // Wait 100ms to be a good citizen
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await axios.get(`${SCRYFALL_BASE_URL}/cards/named`, {
            params: { exact: cardName }
        });

        const data = response.data;
        return {
            name: data.name,
            mana_cost: data.mana_cost || '',
            cmc: data.cmc,
            type_line: data.type_line,
            scryfall_uri: data.scryfall_uri,
            is_land: data.type_line.toLowerCase().includes('land')
        };
    } catch (error: any) {
        if (error.response?.status === 404) {
            console.warn(`Card not found: ${cardName}`);
        } else {
            console.error(`Error fetching ${cardName}:`, error.message);
        }
        return null;
    }
}

/**
 * Bulk fetch card data from Scryfall using their collection endpoint.
 * This is much more efficient than fetching one by one.
 */
export async function fetchCardsBulk(cardNames: string[]): Promise<ScryfallCard[]> {
    const scryfallCards: ScryfallCard[] = [];
    const chunkSize = 75; // Scryfall limit for collection endpoint

    for (let i = 0; i < cardNames.length; i += chunkSize) {
        const chunk = cardNames.slice(i, i + chunkSize);
        try {
            console.log(`Fetching chunk of ${chunk.length} cards from Scryfall...`);
            await new Promise(resolve => setTimeout(resolve, 100));

            const response = await axios.post(`${SCRYFALL_BASE_URL}/cards/collection`, {
                identifiers: chunk.map(name => ({ name }))
            });

            const bulkItems = response.data.data;
            for (let j = 0; j < bulkItems.length; j++) {
                const data = bulkItems[j];
                if (data && data.name) {
                    scryfallCards.push({
                        name: data.name,
                        mana_cost: data.mana_cost || '',
                        cmc: data.cmc,
                        type_line: data.type_line,
                        scryfall_uri: data.scryfall_uri,
                        is_land: data.type_line.toLowerCase().includes('land')
                    });
                }
            }
        } catch (error: any) {
            console.error(`Error in bulk fetch:`, error.message);
        }
    }

    return scryfallCards;
}
