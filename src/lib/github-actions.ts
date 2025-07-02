
'use server';

import { Octokit } from '@octokit/rest';
import type { WordpressPluginFormData } from '@/lib/schemas';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper function to ensure env variables are set
function getEnvVariable(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing environment variable: ${name}. Please set it in your .env file.`);
    }
    return value;
}

export async function generateWordPressPlugin(formData: WordpressPluginFormData) {
    try {
        const token = getEnvVariable('GITHUB_TOKEN');
        const owner = getEnvVariable('GITHUB_REPO_OWNER');
        const repo = getEnvVariable('GITHUB_REPO_NAME');
        const workflowId = getEnvVariable('GITHUB_WORKFLOW_ID');

        const octokit = new Octokit({ auth: token });
        
        const { partner_id, version, publication } = formData;
        const commitMessage = `feat(plugin): Add/Update ${publication} plugin v${version}`;

        // 1. Get the latest commit SHA from the main branch
        const { data: mainBranch } = await octokit.git.getRef({
            owner,
            repo,
            ref: 'heads/main',
        });
        const latestCommitSha = mainBranch.object.sha;

        // 2. Prepare file contents as blobs
        const configJsonPath = `partners/${partner_id}/config.json`;
        const configJsonContent = JSON.stringify(formData, null, 2);
        const configBlob = await octokit.git.createBlob({
            owner,
            repo,
            content: configJsonContent,
            encoding: 'utf-8',
        });

        const pluginJsonPath = `partners/${partner_id}/plugin.json`;
        const repoUrl = `https://github.com/${owner}/${repo}`;
        const downloadUrl = `${repoUrl}/releases/download/${partner_id}-v${version}/${partner_id}-v${version}.zip`;
        const pluginJsonData = {
            name: `Instaread Audio Player - ${publication}`,
            version: version,
            download_url: downloadUrl,
            requires: "5.6",
            tested: "6.5",
            sections: {
              changelog: `<h4>${version}</h4><ul><li>Partner-specific build for ${publication}</li></ul>`
            }
        };
        const pluginJsonContent = JSON.stringify(pluginJsonData, null, 2);
        const pluginBlob = await octokit.git.createBlob({
            owner,
            repo,
            content: pluginJsonContent,
            encoding: 'utf-8',
        });
        
        // 3. Create a new tree with these files
        const { data: newTree } = await octokit.git.createTree({
            owner,
            repo,
            base_tree: latestCommitSha,
            tree: [
                {
                    path: configJsonPath,
                    mode: '100644',
                    type: 'blob',
                    sha: configBlob.data.sha,
                },
                {
                    path: pluginJsonPath,
                    mode: '100644',
                    type: 'blob',
                    sha: pluginBlob.data.sha,
                },
            ],
        });

        // 4. Create a new commit
        const { data: newCommit } = await octokit.git.createCommit({
            owner,
            repo,
            message: commitMessage,
            tree: newTree.sha,
            parents: [latestCommitSha],
        });

        // 5. Update the main branch to point to the new commit
        await octokit.git.updateRef({
            owner,
            repo,
            ref: 'heads/main',
            sha: newCommit.sha,
        });

        // 6. Trigger the workflow dispatch on the updated main branch
        await octokit.actions.createWorkflowDispatch({
            owner,
            repo,
            workflow_id: workflowId,
            ref: 'refs/heads/main',
            inputs: {
                partner_id,
                version,
            },
        });
        
        // Wait a moment for the workflow run to appear in the API
        await delay(5000);

        const workflowRuns = await octokit.actions.listWorkflowRuns({
            owner,
            repo,
            workflow_id: workflowId,
            event: 'workflow_dispatch',
            per_page: 1, // We only need the most recent one
        });

        if (workflowRuns.data.total_count === 0 || !workflowRuns.data.workflow_runs[0]) {
            return { success: false, error: "Could not find the triggered workflow run. Please check the GitHub Actions tab manually." };
        }
        const runId = workflowRuns.data.workflow_runs[0].id;


        return { 
            success: true, 
            message: `Successfully committed changes and triggered build for ${publication} v${version}.`,
            runId: runId,
            partnerId: formData.partner_id,
            version: formData.version,
        };

    } catch (error: any) {
        console.error("Error generating WordPress plugin:", error);
        // Octokit can throw HttpErrors with more details
        const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
        return { success: false, error: `GitHub API Error: ${errorMessage}` };
    }
}


export async function getWorkflowRunResult(params: { runId: number; partnerId: string; version: string; }) {
    const { runId, partnerId, version } = params;
    try {
        const token = getEnvVariable('GITHUB_TOKEN');
        const owner = getEnvVariable('GITHUB_REPO_OWNER');
        const repo = getEnvVariable('GITHUB_REPO_NAME');
        
        const octokit = new Octokit({ auth: token });

        const { data: run } = await octokit.actions.getWorkflowRun({
            owner,
            repo,
            run_id: runId,
        });

        if (run.status !== 'completed') {
            return { status: run.status, conclusion: null, downloadUrl: null, error: null }; // e.g., 'queued', 'in_progress'
        }

        if (run.conclusion !== 'success') {
            return { status: 'completed', conclusion: run.conclusion, downloadUrl: null, error: `Workflow failed with conclusion: ${run.conclusion}.` };
        }

        // Workflow succeeded, now find the release asset.
        const releaseTag = `${partnerId}-v${version}`;
        const { data: release } = await octokit.repos.getReleaseByTag({
            owner,
            repo,
            tag: releaseTag,
        });

        const zipAsset = release.assets.find(asset => asset.name.endsWith('.zip'));

        if (!zipAsset) {
            return { status: 'completed', conclusion: 'success', downloadUrl: null, error: 'Build succeeded, but the release .zip asset was not found.' };
        }

        return { status: 'completed', conclusion: 'success', downloadUrl: zipAsset.browser_download_url, error: null };

    } catch (error: any) {
        // Handle cases where the release/tag doesn't exist yet, which is normal during polling
        if (error.status === 404) {
            return { status: 'in_progress', conclusion: null, downloadUrl: null, error: null };
        }
        console.error("Error checking workflow status:", error);
        const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
        return { status: 'error', conclusion: 'failure', downloadUrl: null, error: `GitHub API Error: ${errorMessage}` };
    }
}
