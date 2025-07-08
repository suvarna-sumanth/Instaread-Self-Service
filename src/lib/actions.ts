'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import { suggestWordPressConfig as suggestWordPressConfigFlow, type WordPressConfigInput, type WordPressConfigOutput } from '@/ai/flows/suggest-wordpress-config';

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

export async function getWordPressConfig(input: WordPressConfigInput): Promise<WordPressConfigOutput> {
    console.log(`Generating WordPress config for: ${input.websiteUrl}`);
    const result = await suggestWordPressConfigFlow(input);
    return result;
}
