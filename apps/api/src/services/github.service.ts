import {
  GitHubAppService,
  GitHubOAuthService,
  type GitHubRepositoryDetails,
} from '@devpilot/github';
import type { GitHubInstallableRepo } from '@devpilot/shared';
import { prisma } from '@devpilot/database';
import { env } from '../config/env.js';

export class GitHubIntegrationService {
  private appService: GitHubAppService | null = null;
  private oauthService: GitHubOAuthService | null = null;

  constructor() {
    if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
      this.oauthService = new GitHubOAuthService({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        redirectUri: `${env.API_URL}/api/auth/github/callback`,
      });
    }

    if (env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY) {
      this.appService = new GitHubAppService({
        appId: env.GITHUB_APP_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
        appSlug: env.GITHUB_APP_SLUG,
        webhookSecret: env.GITHUB_WEBHOOK_SECRET,
      });
    }
  }

  isOAuthConfigured(): boolean {
    return this.oauthService !== null;
  }

  isAppConfigured(): boolean {
    return this.appService !== null;
  }

  getOAuthService(): GitHubOAuthService {
    if (!this.oauthService) {
      throw new Error(
        'GitHub OAuth App is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env'
      );
    }
    return this.oauthService;
  }

  getAppService(): GitHubAppService {
    if (!this.appService) {
      throw new Error(
        'GitHub App is not configured. Please set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY in .env'
      );
    }
    return this.appService;
  }

  /**
   * Lists all repositories accessible to the GitHub App installations,
   * merged with connection status from the DevPilot database.
   */
  async getInstallableRepositories(
    organizationId: string
  ): Promise<GitHubInstallableRepo[]> {
    const app = this.getAppService();
    const installations = await app.listInstallations();

    const result: GitHubInstallableRepo[] = [];
    const existingRepos = await prisma.repository.findMany({
      where: { organizationId },
      select: { id: true, githubRepoId: true, isConnected: true },
    });

    const repoMap = new Map(
      existingRepos.map((r) => [r.githubRepoId.toString(), r])
    );

    for (const inst of installations) {
      try {
        const repos = await app.listInstallationRepositories(inst.id);
        for (const r of repos) {
          const existing = repoMap.get(r.id.toString());
          result.push({
            githubRepoId: r.id,
            name: r.name,
            fullName: r.fullName,
            owner: r.owner,
            isPrivate: r.isPrivate,
            htmlUrl: r.htmlUrl,
            defaultBranch: r.defaultBranch,
            description: r.description,
            installationId: inst.id,
            isConnected: existing?.isConnected ?? false,
            connectedRepoId: existing?.id,
          });
        }
      } catch (err) {
        console.error(
          `[GitHub] Failed to list repos for installation ${inst.id}:`,
          err
        );
      }
    }

    return result;
  }

  /**
   * Retrieves single repo details via GitHub App.
   */
  async getRepositoryDetails(
    installationId: number,
    owner: string,
    name: string
  ): Promise<GitHubRepositoryDetails> {
    const app = this.getAppService();
    return app.getRepository(installationId, owner, name);
  }
}

export const githubIntegrationService = new GitHubIntegrationService();

