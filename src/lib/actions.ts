'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import type { WordPressConfigFormValues } from '@/lib/schemas';

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


type GeneratePluginResult = {
    success: boolean;
    message: string;
    pullRequestUrl?: string;
}

export async function generatePartnerPlugin(data: WordPressConfigFormValues): Promise<GeneratePluginResult> {
    const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
        const missing = [
            !GITHUB_TOKEN && "GITHUB_TOKEN",
            !GITHUB_OWNER && "GITHUB_OWNER",
            !GITHUB_REPO && "GITHUB_REPO"
        ].filter(Boolean).join(', ');
        return { success: false, message: `Server configuration error: Missing environment variables: ${missing}. Please ask the administrator to set them.` };
    }

    const branchName = `partner/${data.partner_id}-v${data.version}`;
    const configFilePath = `partners/${data.partner_id}/config.json`;
    const pullRequestTitle = `feat(partner): Add configuration for ${data.partner_id} v${data.version}`;
    const pullRequestBody = `This PR was automatically generated to add the partner configuration for **${data.partner_id}**.

**Version:** ${data.version}
**Domain:** ${data.domain}

Please review and merge.`;

    const headers = {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
    };

    try {
        // 1. Get the latest commit SHA from the main branch
        const refResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/main`, { headers });
        if (!refResponse.ok) {
            const error = await refResponse.json();
            throw new Error(`Failed to get main branch SHA: ${error.message}`);
        }
        const refData = await refResponse.json();
        const mainBranchSha = refData.object.sha;

        // 2. Create a new branch
        const createBranchResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha: mainBranchSha,
            }),
        });

        // It's okay if the branch already exists (status 422), we can continue and just update the file.
        if (!createBranchResponse.ok && createBranchResponse.status !== 422) {
             const error = await createBranchResponse.json();
             throw new Error(`Failed to create branch: ${error.message}`);
        }
        
        // 3. Create or update the config.json file
        const configContent = JSON.stringify(data, null, 2);
        const encodedContent = Buffer.from(configContent).toString('base64');
        
        let fileSha: string | undefined = undefined;
        // Check if file exists to get its SHA for updating
        try {
            const getFileResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${configFilePath}?ref=${branchName}`, { headers });
            if (getFileResponse.ok) {
                const fileData = await getFileResponse.json();
                fileSha = fileData.sha;
            }
        } catch(e) {
            // File doesn't exist, which is fine, we will create it.
        }

        const createFileResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${configFilePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: `feat(partner): Create config for ${data.partner_id} v${data.version}`,
                content: encodedContent,
                branch: branchName,
                sha: fileSha // Include SHA if updating an existing file, otherwise it's undefined
            }),
        });

        if (!createFileResponse.ok) {
             const error = await createFileResponse.json();
             throw new Error(`Failed to create config.json: ${error.message}`);
        }

        // 4. Create a pull request
        const createPrResponse = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: pullRequestTitle,
                body: pullRequestBody,
                head: branchName,
                base: 'main',
            }),
        });
        
        const prData = await createPrResponse.json();
        
        // If PR already exists, the API returns 422 with the PR link in the error message.
        if (!createPrResponse.ok && createPrResponse.status !== 422) {
             throw new Error(`Failed to create pull request: ${prData.message}`);
        }
        
        const pullRequestUrl = prData.html_url || (prData.errors && prData.errors[0] && prData.errors[0].message.match(new RegExp('https://\\\\S+'))?.[0]);
        
        if (!pullRequestUrl) {
             console.error("Could not find PR URL in response:", prData);
             throw new Error("Could not determine Pull Request URL from GitHub's response.");
        }
        
        return { success: true, message: "Successfully created Pull Request!", pullRequestUrl };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred during GitHub operation.";
        console.error("[GitHub Action Error]:", message);
        return { success: false, message };
    }
}
