'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import { PLAYER_SCRIPT_URL } from '@/lib/constants';

// In a real app, you would have error handling, etc.

export async function getVisualClone(url: string): Promise<string> {
    console.log(`Generating visual clone for: ${url}`);
    const result = await generateVisualCloneFlow({ websiteUrl: url });
    return result.cloneHtml;
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisOutput> {
    console.log(`Analyzing website with OpenAI: ${url}`);
    const result = await analyzeWebsiteFlow({ url });
    return result;
}


export async function getPlayerScript(): Promise<string> {
    try {
        const response = await fetch(PLAYER_SCRIPT_URL);
        if (!response.ok) {
            const errorText = `Failed to fetch player script: ${response.status} ${response.statusText}`;
            console.error(errorText);
            return `// ${errorText}`;
        }
        return await response.text();
    } catch (error) {
        const errorText = `Error fetching player script: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorText);
        return `// ${errorText}`;
    }
}
