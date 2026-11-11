import { Octokit } from '@octokit/rest';
import type { GitHubOAuthConfig, GitHubUserIdentity } from './types.js';

export class GitHubOAuthService {
  private config: GitHubOAuthConfig;

  constructor(config: GitHubOAuthConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error(
        'GitHub OAuth configuration requires clientId and clientSecret'
      );
    }
    this.config = config;
  }

  /**
   * Generates the GitHub OAuth authorization URL for user login.
   */
  getAuthorizationUrl(state: string, scope = 'read:user user:email'): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri || '',
      scope,
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges the temporary OAuth code for an access token.
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code,
          redirect_uri: this.config.redirectUri,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to exchange GitHub OAuth code: ${response.statusText}`
      );
    }

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.access_token) {
      throw new Error(
        `GitHub OAuth Error: ${data.error_description || data.error || 'No access token received'}`
      );
    }

    return data.access_token;
  }

  /**
   * Fetches user profile and verified primary email using the user access token.
   */
  async getAuthenticatedUser(accessToken: string): Promise<GitHubUserIdentity> {
    const octokit = new Octokit({ auth: accessToken });

    const { data: user } = await octokit.rest.users.getAuthenticated();

    let primaryEmail = user.email;

    // If user's email is private, query emails endpoint
    if (!primaryEmail) {
      try {
        const { data: emails } =
          await octokit.rest.users.listEmailsForAuthenticatedUser();
        const primary = emails.find((e) => e.primary && e.verified);
        if (primary) {
          primaryEmail = primary.email;
        } else if (emails.length > 0 && emails[0]) {
          primaryEmail = emails[0].email;
        }
      } catch {
        // Fallback: email remains null if permission was not granted
      }
    }

    return {
      id: user.id,
      login: user.login,
      name: user.name || user.login,
      email: primaryEmail,
      avatarUrl: user.avatar_url,
    };
  }
}

