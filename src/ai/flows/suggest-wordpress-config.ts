'use server';

/**
 * @fileOverview An AI flow to generate a custom WordPress plugin and deployment instructions.
 *
 * - suggestWordPressConfig - A function that generates a WordPress plugin, GitHub Action, and instructions.
 * - WordPressConfigInput - The input type for the suggestWordPressConfig function.
 * - WordPressConfigOutput - The return type for the suggestWordPressConfig function.
 */

import OpenAI from 'openai';
import type { PlayerConfig } from '@/types';
import { PLAYER_SCRIPT_URL } from '@/lib/constants';

export type WordPressConfigInput = {
  playerConfig: PlayerConfig;
  websiteUrl: string;
};

export type WordPressConfigOutput = {
  pluginCode: string;
  githubActionYaml: string;
  instructions: string;
};

export async function suggestWordPressConfig(input: WordPressConfigInput): Promise<WordPressConfigOutput> {
  const useAiAnalysis = process.env.ENABLE_AI_ANALYSIS === 'true';

  const { playerConfig, websiteUrl } = input;
  let publication = 'xyz';
    if (process.env.NODE_ENV === 'production' && websiteUrl) {
      try {
        const urlObject = new URL(websiteUrl);
        const domain = urlObject.hostname.replace(/^www\./, '').split('.')[0];
        publication = domain || 'xyz';
      } catch (e) {
        publication = 'xyz';
      }
    }


  // If AI is disabled, or key is missing, return a detailed mock object
  if (!useAiAnalysis || !process.env.OPENAI_API_KEY) {
     if (useAiAnalysis && !process.env.OPENAI_API_KEY) {
        console.warn("AI analysis is enabled, but the OPENAI_API_KEY is not set. Falling back to mock WordPress config.");
    }
    // Generate a functional mock plugin even when AI is off
    const pluginCode = `<?php
/**
 * Plugin Name: Instaread Player for ${publication}
 * Description: Adds the Instaread audio player via the [instaread_player] shortcode.
 * Version: 1.0
 * Author: Instaread
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

// 1. Enqueue the player script
function instaread_player_enqueue_script() {
    wp_enqueue_script(
        'instaread-player-script',
        '${PLAYER_SCRIPT_URL}',
        array(),
        '1.0.0',
        true
    );
}
add_action( 'wp_enqueue_scripts', 'instaread_player_enqueue_script' );

// 2. Register the shortcode
function instaread_player_shortcode_handler( $atts ) {
    $default_atts = array(
        'publication' => '${publication}',
        'playertype' => '${playerConfig.playerType}',
        'colortype' => '${playerConfig.color}',
    );
    $final_atts = shortcode_atts( $default_atts, $atts, 'instaread_player' );

    $publication_sanitized = sanitize_text_field( $final_atts['publication'] );
    $playertype_sanitized = sanitize_text_field( $final_atts['playertype'] );
    $colortype_sanitized = sanitize_hex_color( $final_atts['colortype'] );

    return sprintf(
        '<instaread-player publication="%s" playertype="%s" colortype="%s"></instaread-player>',
        esc_attr( $publication_sanitized ),
        esc_attr( $playertype_sanitized ),
        esc_attr( $colortype_sanitized )
    );
}
add_shortcode( 'instaread_player', 'instaread_player_shortcode_handler' );
`;
    const githubActionYaml = `# .github/workflows/deploy-wp-plugin.yml
name: Deploy Instaread Plugin to WordPress
on:
  push:
    branches:
      - main # Or your default branch
    paths:
      - 'instaread-plugin/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Deploy to WordPress via FTP
      uses: SamKirkland/FTP-Deploy-Action@v4.3.4
      with:
        server: \${{ secrets.FTP_SERVER }}
        username: \${{ secrets.FTP_USERNAME }}
        password: \${{ secrets.FTP_PASSWORD }}
        local-dir: ./instaread-plugin/
        server-dir: ./wp-content/plugins/instaread-plugin/
        state-name: .ftp-deploy-state.json
`;
    const instructions = `To automate deployment:
1. Create a folder named 'instaread-plugin' in your project's root.
2. Save the generated PHP code into a file named 'instaread-plugin.php' inside that folder.
3. Create a '.github/workflows' directory.
4. Save the generated YAML code into a file named 'deploy.yml' inside that directory.
5. In your GitHub repo settings, go to Secrets > Actions and add: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD.
Pushes to your main branch will now auto-deploy the plugin.`;

    return {
        pluginCode,
        githubActionYaml,
        instructions
    };
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are an expert WordPress and DevOps engineer. Your task is to generate a complete solution for deploying a custom audio player plugin to a WordPress site.

You will receive the player configuration as a JSON object. Based on this, you must generate three things:
1.  **pluginCode**: The full PHP code for a WordPress plugin. It should be production-ready, secure, and use the provided configuration to set defaults for a shortcode \`[instaread_player]\`. The plugin must enqueue the script from this URL: ${PLAYER_SCRIPT_URL}.
2.  **githubActionYaml**: A complete GitHub Actions workflow file (\`.yml\`) that deploys the plugin to a WordPress site using SFTP. The workflow should checkout the code, then use the \`SamKirkland/FTP-Deploy-Action@v4.3.4\` action. The plugin code should be in a file named \`instaread-plugin.php\` inside a \`instaread-plugin\` directory. The workflow must use GitHub secrets for sensitive data like SFTP server, username, and password.
3.  **instructions**: Clear, step-by-step instructions for a non-technical user on how to use these files. Explain that they need to save the PHP code as \`instaread-plugin/instaread-plugin.php\` and the YAML as \`.github/workflows/deploy.yml\`. Crucially, explain how to set up the necessary secrets (\`FTP_SERVER\`, \`FTP_USERNAME\`, \`FTP_PASSWORD\`) in their GitHub repository settings.

Configuration Details:
- Player Type: \`${playerConfig.playerType}\`
- Accent Color: \`${playerConfig.color}\`
- Publication ID: \`${publication}\`

Return the response as a valid JSON object with no markdown formatting. The JSON object must have this exact structure: { "pluginCode": "...", "githubActionYaml": "...", "instructions": "..." }
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

    const result = JSON.parse(content) as WordPressConfigOutput;
    return result;

  } catch (error) {
    console.error("[WordPress Config] Error analyzing with OpenAI:", error);
    throw new Error(`AI config generation failed. ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`);
  }
}
