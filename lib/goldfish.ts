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

        $('.table-sm tbody tr').each((_, el) => {
            const row = $(el);
            const link = row.find('td:nth-child(2) a');
            const tournamentUrl = link.attr('href');
            const name = link.text().trim();
            const dateStr = row.find('td:nth-child(1)').text().trim();

            if (tournamentUrl && name && dateStr) {
                // Parse date like "Feb 8, 2026"
                const date = parse(dateStr, 'MMM d, yyyy', new Date());

                tournaments.push({
                    external_id: tournamentUrl.split('/').pop() || '',
                    name,
                    date: format(date, 'yyyy-MM-dd'),
                    url: `${BASE_URL}${tournamentUrl}`
                });
            }
        });

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

        $('.table-condensed tbody tr').each((_, el) => {
            const link = $(el).find('td:nth-child(2) a');
            const deckUrl = link.attr('href');
            if (deckUrl) {
                deckUrls.push(`${BASE_URL}${deckUrl}`);
            }
        });

        return deckUrls;
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
        // Fish uses a specific structure for the decklist area
        $('#deck-view-tab-mainboard .deck-list-table tbody tr').each((_, el) => {
            const row = $(el);
            const qty = parseInt(row.find('.deck-col-qty').text().trim());
            const name = row.find('.deck-col-card a').text().trim();
            if (name && !isNaN(qty)) {
                cards.push({ name, quantity: qty, is_sideboard: false });
            }
        });

        $('#deck-view-tab-sideboard .deck-list-table tbody tr').each((_, el) => {
            const row = $(el);
            const qty = parseInt(row.find('.deck-col-qty').text().trim());
            const name = row.find('.deck-col-card a').text().trim();
            if (name && !isNaN(qty)) {
                cards.push({ name, quantity: qty, is_sideboard: true });
            }
        });

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
