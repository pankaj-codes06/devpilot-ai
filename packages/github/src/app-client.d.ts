import { Octokit } from '@octokit/rest';
import type {
  GitHubAppConfig,
  GitHubInstallationSummary,
  GitHubRepositoryDetails,
} from './types.js';

export declare function normalizePrivateKey(rawKey: string): string;

export declare class GitHubAppService {
  constructor(config: GitHubAppConfig);
  getAppOctokit(): Octokit;
  getInstallationOctokit(installationId: number): Octokit;
  listInstallations(): Promise<GitHubInstallationSummary[]>;
  listInstallationRepositories(installationId: number): Promise<GitHubRepositoryDetails[]>;
  getRepository(
    installationId: number,
    owner: string,
    repo: string
  ): Promise<GitHubRepositoryDetails>;
  getInstallationUrl(state?: string): string;
}
