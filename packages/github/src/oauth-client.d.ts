import type { GitHubOAuthConfig, GitHubUserIdentity } from './types.js';

export declare class GitHubOAuthService {
  constructor(config: GitHubOAuthConfig);
  getAuthorizationUrl(state: string, scope?: string): string;
  exchangeCodeForToken(code: string): Promise<string>;
  getAuthenticatedUser(accessToken: string): Promise<GitHubUserIdentity>;
}
