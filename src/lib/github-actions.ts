'use server';

import { Octokit } from '@octokit/rest';
import type { WordpressPluginFormData } from '@/lib/schemas';

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
        const newBranchName = `feat/plugin-${partner_id}-${version}`;
        const prTitle = `feat(plugin): Add/Update ${publication} plugin version ${version}`;

        // 1. Get the latest commit SHA from the main branch
        const mainBranch = await octokit.repos.getBranch({
            owner,
            repo,
            branch: 'main',
        });
        const mainBranchSha = mainBranch.data.commit.sha;

        // 2. Create a new branch from main
        try {
            await octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${newBranchName}`,
                sha: mainBranchSha,
            });
        } catch (error: any) {
            // If branch already exists, we can choose to ignore or fail.
            // For this use case, failing is safer to avoid unintended overwrites.
            if (error.status === 422) {
                 return { success: false, error: `Branch '${newBranchName}' already exists. Please use a new version number.` };
            }
            throw error;
        }


        // 3. Prepare file contents for the partner-specific directory
        const configJsonPath = `partners/${partner_id}/config.json`;
        const configJsonContent = JSON.stringify(formData, null, 2);

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
        
        // 4. Create or update files in the new branch
        // This is a simpler way than creating blobs and trees manually.
        const filesToCommit = [
            { path: configJsonPath, content: configJsonContent, message: `feat: Add/Update config.json for ${partner_id} v${version}` },
            { path: pluginJsonPath, content: pluginJsonContent, message: `feat: Add/Update plugin.json for ${partner_id} v${version}` }
        ];

        for (const file of filesToCommit) {
            await octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: file.path,
                message: file.message,
                content: Buffer.from(file.content).toString('base64'),
                branch: newBranchName,
            });
        }
        
        // 5. Create a Pull Request
        const pullRequest = await octokit.pulls.create({
            owner,
            repo,
            title: prTitle,
            head: newBranchName,
            base: 'main',
            body: `This PR was automatically generated for ${publication} v${version} by the AudioLeap Demo Generator.`,
        });

        // 6. Merge the Pull Request
        await octokit.pulls.merge({
            owner,
            repo,
            pull_number: pullRequest.data.number,
            commit_title: `Merge PR #${pullRequest.data.number}: ${prTitle}`,
        });

        // 7. Delete the branch
        await octokit.git.deleteRef({
            owner,
            repo,
            ref: `heads/${newBranchName}`,
        });
        
        // 8. Trigger the workflow dispatch
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

        return { success: true, message: `Successfully created and merged PR. Triggered build for ${publication} v${version}.` };

    } catch (error: any) {
        console.error("Error generating WordPress plugin:", error);
        // Octokit can throw HttpErrors with more details
        const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
        return { success: false, error: `GitHub API Error: ${errorMessage}` };
    }
}
