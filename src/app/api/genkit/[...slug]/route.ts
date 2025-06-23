'use server';

import { genkitNextJS } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';

// By not importing any flows here, we are only setting up the Genkit
// endpoint but not registering any specific flows to be publicly available
// via HTTP. The flows are still available to be called directly from
// server-side code (like Server Actions), which resolves a startup conflict.

export const { GET, POST } = genkitNextJS({ ai });
