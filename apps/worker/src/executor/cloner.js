import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createAppAuth } from '@octokit/auth-app';
import { normalizePrivateKey } from '@devpilot/github';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);

export class SecureCloner {
  /**
   * Clones an authorized GitHub repository into an isolated, ephemeral workspace.
   * Sanitizes all credentials from .git/config immediately upon clone.
   */
  static async cloneRepository(options) {
    const { runId, installationId, owner, name, defaultBranch = 'main', timeoutMs = 120000 } = options;

    // Security: Validate owner and name against path traversal
    const safeNameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!safeNameRegex.test(owner) || !safeNameRegex.test(name)) {
      throw new Error(`Invalid repository naming format: ${owner}/${name}`);
    }

    // Prepare temporary isolated directory
    const baseDir = path.join(os.tmpdir(), 'devpilot-workspaces');
    await fs.mkdir(baseDir, { recursive: true });

    const safeRunId = String(runId).replace(/[^a-zA-Z0-9_-]/g, '');
    const workspacePath = path.join(baseDir, `repo-${safeRunId}-${Date.now().toString(36)}`);

    // Verify workspacePath is strictly inside baseDir (path traversal check)
    const normalized = path.normalize(workspacePath);
    if (!normalized.startsWith(baseDir)) {
      throw new Error(`Path traversal attempt detected: ${workspacePath}`);
    }

    await fs.mkdir(workspacePath, { recursive: true });

    // Cleanup helper
    const cleanup = async () => {
      try {
        await fs.rm(workspacePath, { recursive: true, force: true });
      } catch (err) {
        console.error(`[SecureCloner] Failed to clean workspace at ${workspacePath}:`, err);
      }
    };

    try {
      if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY) {
        throw new Error(
          'GitHub App credentials (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY) are not configured. Cannot generate installation access token.'
        );
      }

      // Generate short-lived installation access token
      const resolvedKey = normalizePrivateKey(env.GITHUB_APP_PRIVATE_KEY);
      if (!resolvedKey) {
        throw new Error('Failed to resolve valid GitHub App private key from environment.');
      }

      const auth = createAppAuth({
        appId: env.GITHUB_APP_ID,
        privateKey: resolvedKey,
      });

      const installationAuth = await auth({
        type: 'installation',
        installationId: Number(installationId),
      });

      const token = installationAuth.token;
      const cloneUrl = `https://x-access-token:${token}@github.com/${owner}/${name}.git`;

      // Execute shallow git clone with timeout
      await execFileAsync(
        'git',
        ['clone', '--depth', '1', '--branch', defaultBranch, cloneUrl, workspacePath],
        {
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      // CRITICAL SECURITY REQUIREMENT:
      // Immediately sanitize git remotes to purge access token from .git/config
      const cleanRemoteUrl = `https://github.com/${owner}/${name}.git`;
      await execFileAsync('git', ['remote', 'set-url', 'origin', cleanRemoteUrl], {
        cwd: workspacePath,
      });

      // Remove .git/config credential helpers or cached tokens if any
      const gitConfigPath = path.join(workspacePath, '.git', 'config');
      try {
        let configContent = await fs.readFile(gitConfigPath, 'utf-8');
        if (configContent.includes(token)) {
          configContent = configContent.replace(new RegExp(token, 'g'), 'REDACTED');
          await fs.writeFile(gitConfigPath, configContent, 'utf-8');
        }
      } catch {
        // If .git/config doesn't exist or is locked, proceed safely
      }

      return {
        workspacePath,
        cleanup,
      };
    } catch (error) {
      // Ensure directory is cleaned if cloning fails
      await cleanup();
      throw error;
    }
  }
}
