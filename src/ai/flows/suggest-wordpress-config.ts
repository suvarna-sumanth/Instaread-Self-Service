
'use server';

/**
 * @fileOverview An AI flow to generate a custom WordPress partner plugin configuration.
 *
 * - suggestWordPressConfig - A function that generates config.json, plugin.json, and a GitHub Action.
 * - WordPressConfigInput - The input type for the suggestWordPressConfig function.
 * - WordPressConfigOutput - The return type for the suggestWordPressConfig function.
 */

import OpenAI from 'openai';
import type { PlayerConfig, Placement } from '@/types';

export type WordPressConfigInput = {
  playerConfig: PlayerConfig;
  websiteUrl: string;
  placement: Placement;
};

export type WordPressConfigOutput = {
  configJson: string;
  pluginJson: string;

  githubActionYaml: string;
  instructions: string;
};

// This is the exact workflow provided by the user, with template literals escaped for JS.
const GITHUB_ACTION_YAML = `name: Partner Plugin Builder

on:
  workflow_dispatch:
    inputs:
      partner_id:
        description: "Partner ID to build"
        required: true
        type: string
      version:
        description: "Plugin version"
        required: true
        default: "1.0.0"
        type: string

jobs:
  build-partner-plugin:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Required for git push later

      - name: Validate partner exists
        run: |
          if [ ! -d "partners/\${{ github.event.inputs.partner_id }}" ]; then
            echo "::error::Partner directory not found: \${{ github.event.inputs.partner_id }}"
            exit 1
          fi

      - name: Build partner plugin
        run: |
          PARTNER_ID="\${{ github.event.inputs.partner_id }}"
          VERSION="\${{ github.event.inputs.version }}"
          BUILD_DIR="build/\${PARTNER_ID}"

          # Create build directory
          mkdir -p \${BUILD_DIR}

          # Copy core plugin files
          cp -r core/* \${BUILD_DIR}/

          # Copy plugin-update-checker from root (CRITICAL FIX)
          cp -r plugin-update-checker \${BUILD_DIR}/

          # Copy partner-specific config
          cp partners/\${PARTNER_ID}/config.json \${BUILD_DIR}/
          cp partners/\${PARTNER_ID}/*.css \${BUILD_DIR}/ 2>/dev/null || true

          # Copy partner-specific JS
          cp partners/\${PARTNER_ID}/partner.js \${BUILD_DIR}/ 2>/dev/null || true

          # Update plugin header with partner info
          sed -i "s/Plugin Name: Instaread Audio Player/Plugin Name: Instaread Audio Player - \${PARTNER_ID}/" \${BUILD_DIR}/instaread-core.php
          sed -i "s/Version: [0-9.]*/Version: \${VERSION}/" \${BUILD_DIR}/instaread-core.php


          # List contents for debugging
          echo "Build directory contents:"
          ls -la \${BUILD_DIR}/

          # Create ZIP
          cd build && zip -r \${PARTNER_ID}-v\${VERSION}.zip \${PARTNER_ID}/

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: \${{ github.event.inputs.partner_id }}-v\${{ github.event.inputs.version }}
          name: "\${{ github.event.inputs.partner_id }} Plugin v\${{ github.event.inputs.version }}"
          files: build/\${{ github.event.inputs.partner_id }}-v\${{ github.event.inputs.version }}.zip
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Generate partner plugin.json
        run: |
          PARTNER_ID="\${{ github.event.inputs.partner_id }}"
          VERSION="\${{ github.event.inputs.version }}"
          REPO_URL="https://github.com/\${{ github.repository }}"

          cat > partners/\${PARTNER_ID}/plugin.json << EOF
          {
            "name": "Instaread Audio Player - \${PARTNER_ID}",
            "version": "\${VERSION}",
            "download_url": "\${REPO_URL}/releases/download/\${PARTNER_ID}-v\${VERSION}/\${PARTNER_ID}-v\${VERSION}.zip",
            "requires": "5.6",
            "tested": "6.5",
            "sections": {
              "changelog": "<h4>\${VERSION}</h4><ul><li>Partner-specific build for \${PARTNER_ID}</li></ul>"
            }
          }
          EOF

      - name: Commit plugin.json update
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add partners/\${{ github.event.inputs.partner_id }}/plugin.json

          # Check if there are changes to commit
          if git diff --staged --quiet; then
            echo "No changes to plugin.json, skipping commit"
          else
            git commit -m "Update plugin.json for \${{ github.event.inputs.partner_id }} v\${{ github.event.inputs.version }}"
            git push
          fi`;

export async function suggestWordPressConfig(input: WordPressConfigInput): Promise<WordPressConfigOutput> {
  const useAiAnalysis = process.env.ENABLE_AI_ANALYSIS === 'true';

  const { playerConfig, websiteUrl, placement } = input;
   if (!placement) {
    throw new Error("Placement must be selected to generate WordPress configuration.");
  }
  
  let partnerId = 'example-partner';
  let domain = 'example.com';
  try {
    const urlObject = new URL(websiteUrl);
    domain = urlObject.hostname;
    partnerId = domain.replace(/^www\./, '').split('.')[0];
  } catch (e) {
    // Keep defaults
  }
  
  // If AI is disabled, or key is missing, return a detailed mock object
  if (!useAiAnalysis || !process.env.OPENAI_API_KEY) {
     if (useAiAnalysis && !process.env.OPENAI_API_KEY) {
        console.warn("AI analysis is enabled, but the OPENAI_API_KEY is not set. Falling back to mock WordPress config.");
    }
    const insertPosition = placement.position === 'before' ? 'before_element' : 'after_element';
    const configJson = JSON.stringify({
        partner_id: partnerId,
        domain: domain,
        publication: partnerId,
        injection_context: "singular",
        injection_strategy: "first",
        injection_rules: [{
            target_selector: placement.selector,
            insert_position: insertPosition,
            exclude_slugs: []
        }],
        version: "1.0.0"
    }, null, 2);

    const pluginJson = JSON.stringify({
        name: `Instaread Audio Player - ${partnerId}`,
        version: "0.0.0",
        download_url: "",
        requires: "5.6",
        tested: "6.5",
        sections: {
            changelog: "<h4>0.0.0</h4><ul><li>Initial placeholder. Will be updated by GitHub Action on first build.</li></ul>"
        }
    }, null, 2);

    const instructions = `**This is a mock configuration.** To use live AI generation, set \`ENABLE_AI_ANALYSIS=true\` and provide an \`OPENAI_API_KEY\` in your .env file.

**Setup Instructions:**
1. In your plugin git repository, create a directory: \`.github/workflows/\`
2. Save the generated YAML content into a new file: \`.github/workflows/partner-builds.yml\`
3. Create a directory for your new partner: \`partners/${partnerId}/\`
4. Save the generated \`config.json\` and \`plugin.json\` files into the \`partners/${partnerId}/\` directory.
5. Commit all new files to your repository and push to GitHub.
6. Go to the "Actions" tab in your GitHub repository, select "Partner Plugin Builder" from the workflows list, and click "Run workflow".
7. Enter the partner ID (e.g., '${partnerId}') and a version (e.g., '1.0.0') to build and release your new plugin.`;
    
    return {
        configJson,
        pluginJson,
        githubActionYaml: GITHUB_ACTION_YAML,
        instructions
    };
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `You are an expert engineer responsible for configuring and deploying partner-specific WordPress plugins from a centralized repository.
  
Your task is to generate the content for three files (\`config.json\`, \`plugin.json\`, \`partner-builds.yml\`) and setup instructions based on the provided configuration.

**Input Configuration:**
- Website URL: \`${websiteUrl}\`
- Placement Selector: \`${placement.selector}\`
- Placement Position: \`${placement.position}\`

**1. partner-builds.yml (GitHub Action):**
The content for this file is fixed. Return the exact YAML content provided below.

\`\`\`yaml
${GITHUBACTION_YAML}
\`\`\`

**2. config.json (Partner Configuration):**
Generate the content for a new \`partners/<partner_id>/config.json\` file.
- Derive \`partner_id\`, \`domain\`, and \`publication\` from the website URL. The \`partner_id\` should be a sanitized, filesystem-friendly version of the domain name (e.g., 'outdoornews' from 'www.outdoornews.com').
- Set \`injection_context\` to "singular".
- Set \`injection_strategy\` to "first".
- For \`injection_rules\`, use the provided placement information. The selector is \`${placement.selector}\`. Map the position \`${placement.position}\` to an \`insert_position\` value ('before' maps to 'before_element', 'after' maps to 'after_element').
- Set the initial \`version\` to "1.0.0".

**3. plugin.json (Partner Updater):**
Generate a starter \`partners/<partner_id>/plugin.json\` file. This is a placeholder that the GitHub Action will update on the first build.
- The \`name\` should be "Instaread Audio Player - <partner_id>".
- The \`version\` should be "0.0.0".
- The \`download_url\` should be an empty string.
- Include boilerplate for \`requires\`, \`tested\`, and \`sections\`.

**4. instructions:**
Provide clear, step-by-step instructions for a developer on how to use these files. Explain that they need to:
1. Create a folder named \`.github/workflows\` and save the YAML content as \`partner-builds.yml\`.
2. Create a folder for the new partner, named \`partners/<partner_id>\`.
3. Save the generated \`config.json\` and \`plugin.json\` into that new partner directory.
4. Commit these files to their repository.
5. Explain how to trigger the build from the GitHub Actions tab using the "Run workflow" button, providing the new partner ID.

Return the response as a valid JSON object with no markdown formatting. The JSON object must have this exact structure: { "configJson": "...", "pluginJson": "...", "githubActionYaml": "...", "instructions": "..." }
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

    // The model should return the githubActionYaml, but if it doesn't, we'll inject it.
    const result = JSON.parse(content) as Partial<WordPressConfigOutput>;
    if (!result.githubActionYaml) {
        result.githubActionYaml = GITHUB_ACTION_YAML;
    }
    
    return result as WordPressConfigOutput;

  } catch (error) {
    console.error("[WordPress Config] Error analyzing with OpenAI:", error);
    throw new Error(`AI config generation failed. ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`);
  }
}
