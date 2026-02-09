import axios from 'axios';
import * as cheerio from 'cheerio';
import { format, parse } from 'date-fns';

export interface TournamentEntry {
    external_id: string;
    name: string;
    date: string;
    url: string;
}

export interface DecklistEntry {
    url: string;
    player_name: string;
    rank: number;
    deck_name: string;
    cards: Array<{ name: string; quantity: number; is_sideboard: boolean }>;
}

const BASE_URL = 'https://www.mtggoldfish.com';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Scrapes the recent tournaments list for a given format
 */
export async function scrapeTournaments(formatName: string): Promise<TournamentEntry[]> {
    const url = `${BASE_URL}/tournaments/${formatName.toLowerCase()}`;
    console.log(`Scraping tournaments from ${url}...`);

    try {
        const { data } = await axios.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);
        const tournaments: TournamentEntry[] = [];

        // Try multiple selectors as layout varies
        const rows = $('table tr').length > 0 ? $('table tr') : $('.tournament-list-item');

        rows.each((_, el) => {
            const row = $(el);
            const link = row.find('a[href^="/tournament/"]');
            if (link.length === 0) return;

            const tournamentUrl = link.attr('href');
            const name = link.text().trim();

            // Try to find date in columns or nearby text
            let dateStr = row.find('td').first().text().trim() || row.find('td:nth-child(3)').text().trim();
            if (!dateStr || dateStr === name) {
                // Check if date is in the text following "on"
                const text = row.text();
                const dateMatch = text.match(/on\s+(\w+\s+\d+,\s+\d{4})/) || text.match(/on\s+(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) dateStr = dateMatch[1];
            }

            // Filter for high-value events
            const isHighValue = /Challenge|Showcase|Championship|Pro Tour|Qualifier|Regional|Destination/i.test(name);

            if (tournamentUrl && name && dateStr && isHighValue) {
                try {
                    // Try different date formats
                    let date: Date;
                    if (dateStr.includes(',')) {
                        date = parse(dateStr, 'MMM d, yyyy', new Date());
                    } else {
                        date = parse(dateStr, 'yyyy-MM-dd', new Date());
                    }

                    if (isNaN(date.getTime())) throw new Error("Invalid date");

                    tournaments.push({
                        external_id: tournamentUrl.split('/').pop() || '',
                        name,
                        date: format(date, 'yyyy-MM-dd'),
                        url: `${BASE_URL}${tournamentUrl}`
                    });
                } catch (e) {
                    // console.warn(`Could not parse date "${dateStr}" for tournament: ${name}`);
                }
            }
        });

        console.log(`Found ${tournaments.length} high-value tournaments.`);
        return tournaments;
    } catch (error: any) {
        console.error(`Error scraping tournaments:`, error.message);
        return [];
    }
}

/**
 * Scrapes a specific tournament results page to get individual deck URLs
 */
export async function scrapeTournamentResults(tournamentUrl: string): Promise<string[]> {
    console.log(`Scraping results from ${tournamentUrl}...`);
    try {
        const { data } = await axios.get(tournamentUrl, { headers: HEADERS });
        const $ = cheerio.load(data);
        const deckUrls: string[] = [];

        // Try to find the results table
        const rows = $('table tr');
        rows.each((_, el) => {
            const row = $(el);
            // Look for links that point to a deck
            const link = row.find('a[href^="/deck/"]');
            const deckUrl = link.attr('href');
            if (deckUrl) {
                deckUrls.push(`${BASE_URL}${deckUrl}`);
            }
        });

        const uniqueUrls = deckUrls.filter((val, idx, self) => self.indexOf(val) === idx);
        console.log(`Found ${uniqueUrls.length} unique decklists.`);
        return uniqueUrls;
    } catch (error: any) {
        console.error(`Error scraping tournament results:`, error.message);
        return [];
    }
}

/**
 * Scrapes a decklist page for card counts
 */
export async function scrapeDecklist(deckUrl: string): Promise<DecklistEntry | null> {
    console.log(`Scraping decklist from ${deckUrl}...`);
    try {
        const { data } = await axios.get(deckUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        const playerName = $('.deck-view-header-author').text().replace('by', '').trim();
        const deckName = $('.deck-view-title').text().trim();
        const rankMatch = $('.deck-view-header-rank').text().match(/(\d+)/);
        const rank = rankMatch ? parseInt(rankMatch[1]) : 0;

        const cards: Array<{ name: string; quantity: number; is_sideboard: boolean }> = [];

        // Parse mainboard and sideboard
        // Fish standard structure
        const parseRows = (selector: string, isSideboard: boolean) => {
            $(selector).find('tr').each((_, el) => {
                const row = $(el);
                const qtyText = row.find('.deck-col-qty').text().trim();
                const qty = parseInt(qtyText);
                const name = row.find('.deck-col-card a').text().trim() || row.find('.deck-col-card').text().trim();

                if (name && !isNaN(qty)) {
                    cards.push({ name, quantity: qty, is_sideboard: isSideboard });
                }
            });
        };

        parseRows('#deck-view-tab-mainboard .deck-list-table', false);
        parseRows('#deck-view-tab-sideboard .deck-list-table', true);

        // Fallback for different layout (sometimes used in mobile or specific event pages)
        if (cards.length === 0) {
            $('.deck-list-table').each((tableIdx, tableEl) => {
                const isSideboard = tableIdx > 0; // Rough heuristic: second table is sideboard
                $(tableEl).find('tr').each((_, el) => {
                    const row = $(el);
                    const qty = parseInt(row.find('.deck-col-qty').text().trim());
                    const name = row.find('.deck-col-card a').text().trim();
                    if (name && !isNaN(qty)) {
                        cards.push({ name, quantity: qty, is_sideboard: isSideboard });
                    }
                });
            });
        }

        console.log(`Scraped ${cards.length} cards from deck.`);
        return {
            url: deckUrl,
            player_name: playerName,
            rank,
            deck_name: deckName,
            cards
        };
    } catch (error: any) {
        console.error(`Error scraping decklist:`, error.message);
        return null;
    }
}
