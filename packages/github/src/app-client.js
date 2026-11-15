import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

/**
 * Normalizes a GitHub App private key from various input forms:
 * - Direct multiline PEM string
 * - PEM string with escaped '\n'
 * - File path to a .pem or .key file on disk
 * - Base64 encoded PEM string
 */
export function normalizePrivateKey(rawKey) {
  if (!rawKey) return '';
  let key = String(rawKey).trim();

  // Strip wrapping quotes if present
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Check if it's a file path on disk
  if (
    key.startsWith('/') ||
    key.startsWith('./') ||
    key.startsWith('../') ||
    key.startsWith('~/') ||
    key.endsWith('.pem') ||
    key.endsWith('.key')
  ) {
    const resolvedPath = key.startsWith('~/')
      ? path.join(os.homedir(), key.slice(2))
      : path.resolve(key);

    try {
      if (fs.existsSync(resolvedPath)) {
        key = fs.readFileSync(resolvedPath, 'utf-8').trim();
      }
    } catch {
      // Fall through to parse as inline string
    }
  }

  // Handle base64 encoded PEM
  if (!key.includes('-----BEGIN') && key.length > 64) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN')) {
        key = decoded;
      }
    } catch {
      // Not base64
    }
  }

  // Normalize literal \n escapes to real newlines
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  return key.trim();
}

export class GitHubAppService {
  constructor(config) {
    if (!config?.appId || !config?.privateKey) {
      throw new Error(
        'GitHub App configuration requires appId and privateKey'
      );
    }

    const resolvedKey = normalizePrivateKey(config.privateKey);
    if (!resolvedKey) {
      throw new Error('Failed to resolve valid GitHub App private key');
    }

    this.config = {
      ...config,
      privateKey: resolvedKey,
    };
  }

  /**
   * Returns an Octokit instance authenticated as the GitHub App itself.
   */
  getAppOctokit() {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.config.appId,
        privateKey: this.config.privateKey,
      },
    });
  }

  /**
   * Returns an Octokit instance authenticated for a specific installation.
   * Octokit automatically handles generating and caching short-lived installation access tokens.
   */
  getInstallationOctokit(installationId) {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.config.appId,
        privateKey: this.config.privateKey,
        installationId,
      },
    });
  }

  /**
   * Lists all installations for the GitHub App.
   */
  async listInstallations() {
    const octokit = this.getAppOctokit();
    const response = await octokit.rest.apps.listInstallations({
      per_page: 100,
    });

    return response.data.map((inst) => ({
      id: inst.id,
      account: {
        login: inst.account?.login || '',
        id: inst.account?.id || 0,
        type: inst.account?.type || 'User',
        avatarUrl: inst.account?.avatar_url,
      },
      repositorySelection: inst.repository_selection,
      htmlUrl: inst.html_url,
    }));
  }

  /**
   * Lists repositories accessible by a specific installation ID.
   */
  async listInstallationRepositories(installationId) {
    const octokit = this.getInstallationOctokit(installationId);
    const response =
      await octokit.rest.apps.listReposAccessibleToInstallation({
        per_page: 100,
      });

    return response.data.repositories.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      isPrivate: repo.private,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
      description: repo.description,
      cloneUrl: repo.clone_url,
      updatedAt: repo.updated_at,
    }));
  }

  /**
   * Retrieves single repository metadata for an authorized installation.
   */
  async getRepository(installationId, owner, repo) {
    const octokit = this.getInstallationOctokit(installationId);
    const response = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      id: response.data.id,
      name: response.data.name,
      fullName: response.data.full_name,
      owner: response.data.owner.login,
      isPrivate: response.data.private,
      htmlUrl: response.data.html_url,
      defaultBranch: response.data.default_branch || 'main',
      description: response.data.description,
      cloneUrl: response.data.clone_url,
      updatedAt: response.data.updated_at,
    };
  }

  /**
   * Generates the GitHub App installation URL for users to install the App.
   */
  getInstallationUrl(state) {
    const slug = this.config.appSlug || 'devpilot-ai';
    const base = `https://github.com/apps/${slug}/installations/new`;
    return state ? `${base}?state=${encodeURIComponent(state)}` : base;
  }
}
