'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import { suggestWordpressConfig as suggestWordpressConfigFlow, type SuggestWordpressConfigOutput } from '@/ai/flows/suggest-wordpress-config';

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

export async function suggestWordpressConfig(htmlContent: string, selectedSelector: string): Promise<SuggestWordpressConfigOutput> {
    console.log(`Getting WordPress config suggestion for selector: ${selectedSelector}`);
    const result = await suggestWordpressConfigFlow({ htmlContent, selectedSelector });
    return result;
}
