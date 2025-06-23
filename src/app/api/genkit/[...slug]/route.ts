'use server';

import { genkitNextJS } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';

// Explicitly import flows to register them with the Genkit API endpoint.
import '@/ai/flows/website-analysis';

// The other files in the /flows directory (generate-visual-clone and
// placement-analysis) were refactored into regular async functions and are
// called directly by Server Actions, so they do not need to be registered here.

export const { GET, POST } = genkitNextJS({ ai });
