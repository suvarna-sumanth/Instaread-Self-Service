
import {genkit, type Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: Plugin[] = [];

if (process.env.GOOGLE_API_KEY) {
  plugins.push(googleAI());
} else {
  // This warning will be visible in the server logs.
  console.warn(
    `
********************************************************************************
*                                                                              *
*    ⚠️ WARNING: GOOGLE_API_KEY is not set in your .env file.                 *
*    AI features will be disabled until the key is provided.                   *
*                                                                              *
********************************************************************************
`
  );
}

export const ai = genkit({
  plugins,
});
