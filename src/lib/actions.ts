'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import type { WordPressConfigFormValues } from '@/lib/schemas';
// For testing, validation is disabled. We would import and use the schema here in production.
// import { wordpressConfigSchema } from '@/lib/schemas';

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


type GeneratePluginResult = {
    success: boolean;
    message: string;
    pullRequestUrl?: string;
}

export async function generatePartnerPlugin(data: WordPressConfigFormValues): Promise<GeneratePluginResult> {
    // For testing, validation is disabled. In a real scenario, you'd validate here.
    // const result = wordpressConfigSchema.safeParse(data);
    // if (!result.success) {
    //     return { success: false, message: "Validation failed. Please check the form." };
    // }

    const { 
        GITHUB_TOKEN, 
        GITHUB_REPO_OWNER, 
        GITHUB_REPO_NAME,
        GITHUB_WORKFLOW_ID
    } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME || !GITHUB_WORKFLOW_ID) {
        const missing = [
            !GITHUB_TOKEN && "GITHUB_TOKEN",
            !GITHUB_REPO_OWNER && "GITHUB_REPO_OWNER",
            !GITHUB_REPO_NAME && "GITHUB_REPO_NAME",
            !GITHUB_WORKFLOW_ID && "GITHUB_WORKFLOW_ID"
        ].filter(Boolean).join(', ');
        return { success: false, message: `Server configuration error: Missing environment variables: ${missing}. Please ask the administrator to set them.` };
    }

    const branchName = `partner/${data.partner_id}-v${data.version}`;
    const configFilePath = `partners/${data.partner_id}/config.json`;
    const pluginJsonFilePath = `partners/${data.partner_id}/plugin.json`;
    const pullRequestTitle = `feat(partner): Add configuration for ${data.partner_id} v${data.version}`;
    const pullRequestBody = `This PR was automatically generated to add the partner configuration for **${data.partner_id}**.

**Version:** ${data.version}
**Domain:** ${data.domain}

This PR will be merged automatically to trigger the build process.`;

    const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    try {
        // 1. Get the latest commit SHA from the main branch
        const refResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/ref/heads/main`, { headers });
        if (!refResponse.ok) {
            const error = await refResponse.json();
            throw new Error(`Failed to get main branch SHA: ${error.message}`);
        }
        const refData = await refResponse.json();
        const mainBranchSha = refData.object.sha;

        // 2. Create a new branch
        const createBranchResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: mainBranchSha,
            }),
        });

        if (!createBranchResponse.ok && createBranchResponse.status !== 422) {
             const error = await createBranchResponse.json();
             throw new Error(`Failed to create branch: ${error.message}`);
        }
        
        // 3a. Create or update the config.json file
        const configContent = JSON.stringify(data, null, 2);
        const encodedConfigContent = Buffer.from(configContent).toString('base64');
        
        let configFileSha: string | undefined = undefined;
        try {
            const getConfigFileResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${configFilePath}?ref=${branchName}`, { headers });
            if (getConfigFileResponse.ok) {
                configFileSha = (await getConfigFileResponse.json()).sha;
            }
        } catch(e) {/* File doesn't exist, which is fine */}

        await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${configFilePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: `feat(config): Create/update config for ${data.partner_id} v${data.version}`,
                content: encodedConfigContent,
                branch: branchName,
                sha: configFileSha
            }),
        });

        // 3b. Create or update the plugin.json file
        const downloadUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/${data.partner_id}-v${data.version}/${data.partner_id}-v${data.version}.zip`;
        const pluginJsonContent = JSON.stringify({
            name: `Instaread Audio Player - ${data.partner_id}`,
            version: data.version,
            download_url: downloadUrl,
            requires: "5.6",
            tested: "6.5",
            sections: {
                changelog: `<h4>${data.version}</h4><ul><li>Partner-specific build for ${data.partner_id}</li></ul>`
            }
        }, null, 2);
        const encodedPluginJsonContent = Buffer.from(pluginJsonContent).toString('base64');

        let pluginJsonFileSha: string | undefined = undefined;
        try {
            const getPluginJsonFileResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${pluginJsonFilePath}?ref=${branchName}`, { headers });
            if (getPluginJsonFileResponse.ok) {
                pluginJsonFileSha = (await getPluginJsonFileResponse.json()).sha;
            }
        } catch(e) {/* File doesn't exist, which is fine */}

        await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${pluginJsonFilePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: `feat(plugin): Create/update plugin.json for ${data.partner_id} v${data.version}`,
                content: encodedPluginJsonContent,
                branch: branchName,
                sha: pluginJsonFileSha
            }),
        });

        // 4. Create a pull request
        const createPrResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: pullRequestTitle,
                body: pullRequestBody,
                head: branchName,
                base: 'main',
            }),
        });
        
        let prData = await createPrResponse.json();
        
        if (!createPrResponse.ok && createPrResponse.status !== 422) {
             throw new Error(`Failed to create pull request: ${prData.message}`);
        }
        
        let pullRequestUrl = prData.html_url;
        let pullRequestNumber = prData.number;

        if (createPrResponse.status === 422) {
            const existingPrUrl = prData.errors?.[0]?.message?.match?.(/https:\/\/github\.com\/\S+\/pulls\/\d+/)?.[0];
            const existingPrResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls?head=${GITHUB_REPO_OWNER}:${branchName}&state=open`, { headers });
            const existingPulls = await existingPrResponse.json();
            if (existingPulls.length > 0) {
                pullRequestNumber = existingPulls[0].number;
                pullRequestUrl = existingPulls[0].html_url;
            } else if (existingPrUrl) {
                 pullRequestNumber = parseInt(existingPrUrl.split('/').pop()!, 10);
                 pullRequestUrl = existingPrUrl;
            }
        }
        
        if (!pullRequestNumber) {
            throw new Error("Could not determine Pull Request number.");
        }

        // 5. Merge the pull request (with retries)
        let mergeSucceeded = false;
        for (let i = 0; i < 5; i++) {
            const mergePrResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls/${pullRequestNumber}/merge`, {
                method: 'PUT',
                headers
            });

            if (mergePrResponse.ok) {
                mergeSucceeded = true;
                break;
            }
            
            const error = await mergePrResponse.json();
            if (mergePrResponse.status === 405 && error.message === 'Pull Request is not mergeable') {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            } else if (mergePrResponse.status === 409) { // Already merged
                 mergeSucceeded = true;
                 break;
            } else {
                 throw new Error(`Failed to merge pull request: ${error.message}`);
            }
        }
        
        if (!mergeSucceeded) {
            throw new Error(`Pull request was not mergeable after several retries.`);
        }

        // 6. Explicitly trigger the workflow dispatch
        const dispatchResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ref: 'main'
            }),
        });

        if (!dispatchResponse.ok) {
            const error = await dispatchResponse.json();
            // Don't throw, just warn, as the merge might have triggered it anyway
            console.warn(`Could not manually trigger workflow (Status: ${dispatchResponse.status}): ${error.message}`);
            return { success: true, message: "Successfully merged Pull Request! The plugin build should start automatically.", pullRequestUrl };
        }

        return { success: true, message: "Successfully merged Pull Request and triggered build workflow!", pullRequestUrl };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("[GitHub Action Error]:", message);
        return { success: false, message };
    }
}
