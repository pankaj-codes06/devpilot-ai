export interface GitHubAppConfig {
  appId: number;
  privateKey: string;
  appSlug?: string;
  webhookSecret?: string;
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export interface GitHubUserIdentity {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}

export interface GitHubRepositoryDetails {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  htmlUrl: string;
  defaultBranch: string;
  description: string | null;
  cloneUrl: string;
  updatedAt: string | null;
}

export interface GitHubInstallationSummary {
  id: number;
  account: {
    login: string;
    id: number;
    type: string;
    avatarUrl?: string;
  };
  repositorySelection: 'all' | 'selected';
  htmlUrl: string;
}

export declare const GITHUB_API_BASE_URL: string;
