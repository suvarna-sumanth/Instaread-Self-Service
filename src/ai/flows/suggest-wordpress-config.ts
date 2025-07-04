'use server';

/**
 * @fileOverview An AI flow to suggest a WordPress plugin configuration.
 *
 * - suggestWordpressConfig - A function that analyzes website HTML and a selector to suggest a configuration.
 * - SuggestWordpressConfigInput - The input type for the suggestWordpressConfig function.
 * - SuggestWordpressConfigOutput - The return type for the suggestWordpressConfig function.
 */

import OpenAI from 'openai';

export type SuggestWordpressConfigInput = {
  htmlContent: string;
  selectedSelector: string;
};

export type SuggestWordpressConfigOutput = {
  target_selector: string;
  injection_context: 'singular' | 'all' | 'custom';
  injection_strategy: 'first' | 'last' | 'all';
};

// A fallback suggestion in case the API key is missing or the call fails.
const defaultSuggestion = (selector: string): SuggestWordpressConfigOutput => ({
  target_selector: selector,
  injection_context: 'singular',
  injection_strategy: 'first',
});

export async function suggestWordpressConfig(input: SuggestWordpressConfigInput): Promise<SuggestWordpressConfigOutput> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. Falling back to default suggestion.");
    return defaultSuggestion(input.selectedSelector);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Limit the amount of HTML sent to the API to stay within token limits.
  const truncatedHtml = input.htmlContent.substring(0, 100000);

  const prompt = `
    You are an expert WordPress developer. Your task is to analyze the provided HTML of a webpage and a CSS selector for an element that a user has clicked. Based on this, you will suggest a configuration for injecting a script.

    Analyze the following:
    1.  **Refine Selector**: Refine the user's \`selectedSelector\` to be more robust and unique. Prefer IDs if available. If the selector is very generic (e.g., 'div > p'), find a more specific parent with an ID or a descriptive class. The goal is a stable selector.
    2.  **Injection Context**: Determine if the content is on a 'singular' page (like a blog post or article with a main content body) or an 'all' page (like a homepage with many different items). Default to 'singular' if unsure.
    3.  **Injection Strategy**: If the refined selector is likely to be unique on the page (e.g., an ID like '#main-content'), the strategy should be 'first'. This is almost always the correct choice.

    HTML Content:
    \`\`\`html
    ${truncatedHtml}
    \`\`\`

    User-selected Selector:
    \`\`\`
    ${input.selectedSelector}
    \`\`\`

    Return ONLY a valid JSON object with no markdown formatting. The JSON object must have this exact structure: \`{ "target_selector": "...", "injection_context": "singular" | "all" | "custom", "injection_strategy": "first" | "last" | "all" }\`
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const suggestion = JSON.parse(content) as SuggestWordpressConfigOutput;
    
    // Basic validation to ensure the response is in the expected format.
    if (!suggestion.target_selector || !suggestion.injection_context || !suggestion.injection_strategy) {
        throw new Error('OpenAI returned an incomplete JSON object.');
    }

    return suggestion;

  } catch (error) {
    console.error("Error suggesting WordPress config with OpenAI:", error);
    // Fallback to a default value on error to avoid crashing the app.
    return defaultSuggestion(input.selectedSelector);
  }
}
