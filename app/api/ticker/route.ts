import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const revalidate = 3600; // Cache the response for 1 hour

export async function GET() {
    try {
        const parser = new Parser();

        // Feed URLs
        const breakingFeed = 'http://feeds.bbci.co.uk/news/world/rss.xml';
        const financeFeed = 'https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000';
        const geopoliticsFeed = 'https://www.defenseone.com/rss/all/';
        const healthFeed = 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml';

        const [breaking, finance, geopolitics, health] = await Promise.allSettled([
            parser.parseURL(breakingFeed),
            parser.parseURL(financeFeed),
            parser.parseURL(geopoliticsFeed),
            parser.parseURL(healthFeed),
        ]);

        const formatFeed = (result: PromiseSettledResult<any>, prefix: string, emoji: string) => {
            if (result.status === 'fulfilled' && result.value.items) {
                return result.value.items
                    .slice(0, 10) // Take top 10 items
                    .map((item: any) => `${emoji} ${prefix}: ${item.title}`);
            }
            return [`${emoji} ${prefix}: Real-time updates currently unavailable. Please check back later.`];
        };

        const feedsData = {
            breaking: formatFeed(breaking, 'BREAKING', '🚨'),
            finance: formatFeed(finance, 'FINANCE', '📈'),
            geopolitics: formatFeed(geopolitics, 'GEO-POLITICS', '🌐'),
            health: formatFeed(health, 'HEALTH', '🏥')
        };

        return NextResponse.json(feedsData);

    } catch (error) {
        console.error("Error fetching RSS feeds:", error);
        return NextResponse.json(
            { error: "Failed to parse news feeds." },
            { status: 500 }
        );
    }
}
