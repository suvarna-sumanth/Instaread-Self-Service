'use server';
/**
 * @fileOverview A tool to fetch website content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const fetchWebsiteTool = ai.defineTool(
    {
        name: 'fetchWebsite',
        description: 'Fetches the HTML content of a given URL.',
        inputSchema: z.object({
            url: z.string().url().describe('The URL to fetch.'),
        }),
        outputSchema: z.string().describe('The HTML content of the website.'),
    },
    async (input) => {
        try {
            const response = await fetch(input.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                },
            });

            if (!response.ok) {
                return `Error fetching URL: ${response.status} ${response.statusText}`;
            }
            const text = await response.text();
            return text;
        } catch (error) {
            return `Error fetching URL: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
);
