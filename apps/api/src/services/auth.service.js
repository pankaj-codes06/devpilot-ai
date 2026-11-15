import { prisma, TeamRole } from '@devpilot/database';
import { githubIntegrationService } from './github.service.js';
import { signSessionPayload } from '../utils/crypto.js';
import { AuditService } from './audit.service.js';

export class AuthService {
  /**
   * Processes the GitHub OAuth authorization callback.
   * @param {string} code
   * @param {string} [ipAddress]
   * @param {string} [userAgent]
   * @returns {Promise<{ sessionToken: string, user: any }>}
   */
  static async handleGitHubCallback(code, ipAddress, userAgent) {
    const oauthService = githubIntegrationService.getOAuthService();

    // Exchange temporary code for GitHub access token
    const accessToken = await oauthService.exchangeCodeForToken(code);

    // Fetch user profile from GitHub
    const githubUser = await oauthService.getAuthenticatedUser(accessToken);

    // Find or create DevPilot user
    let user = await prisma.user.findUnique({
      where: { githubId: BigInt(githubUser.id) },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      // Create new user along with their default Organization and TeamMember membership
      const defaultOrgSlug = githubUser.login.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const uniqueSlug = `${defaultOrgSlug}-${Date.now().toString(36).slice(-4)}`;

      user = await prisma.user.create({
        data: {
          githubId: BigInt(githubUser.id),
          githubUsername: githubUser.login,
          name: githubUser.name || githubUser.login,
          email: githubUser.email,
          avatarUrl: githubUser.avatarUrl,
          memberships: {
            create: {
              role: TeamRole.OWNER,
              organization: {
                create: {
                  name: `${githubUser.name || githubUser.login}'s Workspace`,
                  slug: uniqueSlug,
                },
              },
            },
          },
        },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    } else {
      // Update existing user profile info from GitHub if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          githubUsername: githubUser.login,
          name: githubUser.name || user.name,
          email: githubUser.email || user.email,
          avatarUrl: githubUser.avatarUrl || user.avatarUrl,
        },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new Error('User has no organization memberships configured');
    }

    const sessionUser = {
      id: user.id,
      githubId: user.githubId.toString(),
      githubUsername: user.githubUsername,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      currentOrganizationId: membership.organizationId,
      role: membership.role,
    };

    const sessionToken = signSessionPayload({
      userId: user.id,
      organizationId: membership.organizationId,
    });

    await AuditService.record({
      organizationId: membership.organizationId,
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        githubUsername: user.githubUsername,
      },
      ipAddress,
      userAgent,
    });

    return {
      sessionToken,
      user: sessionUser,
    };
  }
}
