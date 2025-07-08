
'use server'

import { generateVisualClone as generateVisualCloneFlow } from '@/ai/flows/generate-visual-clone';
import { analyzeWebsite as analyzeWebsiteFlow, type WebsiteAnalysisOutput } from '@/ai/flows/website-analysis';
import { createDemo } from '@/services/demo-service';
import type { WordPressConfigFormValues } from '@/lib/schemas';
import type { DemoConfig, Placement, PlayerConfig } from '@/types';

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

type SaveDemoResult = {
    success: boolean;
    message: string;
    demoId?: string;
}

export async function saveDemo(
    websiteUrl: string,
    playerConfig: PlayerConfig,
    placement: NonNullable<Placement>
): Promise<SaveDemoResult> {
    try {
        if (!websiteUrl || !playerConfig || !placement) {
            return { success: false, message: 'Missing required information to save demo.' };
        }
        const demoData: Omit<DemoConfig, 'id' | 'createdAt'> = {
            websiteUrl,
            playerConfig,
            placement,
        };
        const demoId = await createDemo(demoData as Omit<DemoConfig, 'id'>);
        return { success: true, message: "Demo saved successfully!", demoId };
    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("[SaveDemo Action Error]:", message);
        return { success: false, message };
    }
}


type GeneratePluginResult = {
    success: boolean;
    message: string;
    pullRequestUrl?: string;
    runId?: number;
}

export async function generatePartnerPlugin(data: WordPressConfigFormValues): Promise<GeneratePluginResult> {
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
        return { success: false, message: `Server configuration error: Missing environment variables: ${missing}.` };
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
        const refResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/ref/heads/main`, { headers });
        if (!refResponse.ok) throw new Error(`Failed to get main branch SHA: ${(await refResponse.json()).message}`);
        const refData = await refResponse.json();
        const mainBranchSha = refData.object.sha;

        const createBranchResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: mainBranchSha }),
        });
        if (!createBranchResponse.ok && createBranchResponse.status !== 422) throw new Error(`Failed to create branch: ${(await createBranchResponse.json()).message}`);
        
        const configContent = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
        await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${configFilePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ message: `feat(config): Create config for ${data.partner_id}`, content: configContent, branch: branchName }),
        });

        const downloadUrl = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/download/${data.partner_id}-v${data.version}/${data.partner_id}-v${data.version}.zip`;
        const pluginJsonContent = Buffer.from(JSON.stringify({
            name: `Instaread Audio Player - ${data.publication || data.partner_id}`,
            version: data.version,
            download_url: downloadUrl,
            requires: "5.6", tested: "6.5",
            sections: { changelog: `<h4>${data.version}</h4><ul><li>Partner-specific build for ${data.publication || data.partner_id}</li></ul>` }
        }, null, 2)).toString('base64');
        await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${pluginJsonFilePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ message: `feat(plugin): Create plugin.json for ${data.partner_id}`, content: pluginJsonContent, branch: branchName }),
        });

        const createPrResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ title: pullRequestTitle, body: pullRequestBody, head: branchName, base: 'main' }),
        });
        if (!createPrResponse.ok) throw new Error(`Failed to create pull request: ${(await createPrResponse.json()).message}`);
        const prData = await createPrResponse.json();
        const pullRequestNumber = prData.number;

        let mergeSucceeded = false;
        for (let i = 0; i < 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mergePrResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/pulls/${pullRequestNumber}/merge`, { method: 'PUT', headers });
            if (mergePrResponse.ok || mergePrResponse.status === 409) {
                mergeSucceeded = true;
                break;
            }
        }
        if (!mergeSucceeded) throw new Error(`Pull request was not mergeable after several retries.`);

        await new Promise(resolve => setTimeout(resolve, 2000));
        const dispatchResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/dispatches`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: 'main', inputs: { partner_id: data.partner_id, version: data.version } }),
        });
        if (!dispatchResponse.ok) throw new Error(`PR merged, but failed to trigger workflow: ${(await dispatchResponse.json()).message}`);

        await new Promise(resolve => setTimeout(resolve, 5000));
        const getRunsResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/workflows/${GITHUB_WORKFLOW_ID}/runs?per_page=5`, { headers });
        if (!getRunsResponse.ok) throw new Error("Could not fetch workflow runs to get Run ID.");
        const runsData = await getRunsResponse.json();
        const runId = runsData.workflow_runs?.[0]?.id;
        if (!runId) throw new Error("Could not find a recent workflow run. Please check GitHub Actions.");

        return { success: true, message: "Successfully triggered build workflow!", pullRequestUrl: prData.html_url, runId };

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("[GitHub Action Error]:", message);
        return { success: false, message };
    }
}

export async function checkWorkflowRun(runId: number): Promise<{ status: string; conclusion: string | null }> {
    const { GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } = process.env;
    const headers = { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' };
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/actions/runs/${runId}`, { headers });
    if (!response.ok) throw new Error(`Failed to check workflow status: ${(await response.json()).message}`);
    const data = await response.json();
    return { status: data.status, conclusion: data.conclusion };
}

export async function getReleaseDownloadUrl(partnerId: string, version: string): Promise<string> {
    const { GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME } = process.env;
    const headers = { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' };
    const tagName = `${partnerId}-v${version}`;

    for (let i = 0; i < 12; i++) { // Poll for up to 60 seconds
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/releases/tags/${tagName}`, { headers });
        if (response.ok) {
            const data = await response.json();
            const asset = data.assets?.find((a: any) => a.name.endsWith('.zip'));
            if (asset?.browser_download_url) {
                return asset.browser_download_url;
            }
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    throw new Error('Could not find release asset after waiting. Please check GitHub releases manually.');
}
