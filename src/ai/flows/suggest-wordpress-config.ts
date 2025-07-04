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
    1.  **Refine Selector**: Analyze the user's \`selectedSelector\` and its context within the HTML.
        - Your primary goal is to find the most stable and unique selector possible.
        - **Prefer IDs**: If the selected element or a close parent has an ID, use it (e.g., '#main-content'). This is the best option.
        - **Use Specific Classes**: If no ID is available, find a combination of descriptive classes that uniquely identifies the element. Avoid generic, purely presentational classes.
        - If the refined selector is very robust and likely to be unique on the page (e.g., an ID), set \`injection_strategy\` to 'first'. This is almost always the correct choice.

    2.  **Injection Context**: Determine if the player should be injected on a 'singular' page (like a blog post or article with a main content body) or 'all' pages (like a homepage with many different items). Default to 'singular' if you're unsure.

    3.  **Handle Ambiguity (Custom Fallback)**:
        - If you **cannot determine a reliable, stable selector** (e.g., the element is a generic \`<div>\` or \`<p>\` with no distinct ID or classes), you must fall back to a custom configuration.
        - In this case, set \`injection_context\` to 'custom' and \`target_selector\` to an empty string (""). The user will need to define the placement manually in their WordPress theme.

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
    if (suggestion.target_selector === undefined || !suggestion.injection_context || !suggestion.injection_strategy) {
        throw new Error('OpenAI returned an incomplete JSON object.');
    }

    return suggestion;

  } catch (error) {
    console.error("Error suggesting WordPress config with OpenAI:", error);
    // Fallback to a default value on error to avoid crashing the app.
    return defaultSuggestion(input.selectedSelector);
  }
}
