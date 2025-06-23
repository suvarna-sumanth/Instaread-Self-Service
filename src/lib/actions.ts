
'use server'

import { generateVisualClone } from '@/ai/flows/generate-visual-clone';
import { domHeuristicAnalysis } from '@/lib/dom-analysis';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';

// In a real app, you would have error handling, etc.

export async function getVisualClone(url: string): Promise<string> {
    console.log(`Generating visual clone for: ${url}`);
    const result = await generateVisualClone({ websiteUrl: url });
    return result.cloneHtml;
}

export async function getPlacementSuggestions(html: string) {
    const result = await domHeuristicAnalysis({ htmlContent: html });
    return result;
}

export async function analyzeWebsite(url: string): Promise<WebsiteAnalysisOutput> {
    console.log(`Analyzing website: ${url}`);
    const result = await analyzeWebsiteFlow({ url });
    return result;
}
