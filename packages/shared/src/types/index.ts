export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface AuthSessionUser {
  id: string;
  githubId: string;
  githubUsername: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  currentOrganizationId: string;
  role: UserRole;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  githubOrgId?: string | null;
  role: UserRole;
}

export interface RepositoryDto {
  id: string;
  organizationId: string;
  githubRepoId: string;
  installationId: string;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  htmlUrl: string;
  defaultBranch: string;
  description: string | null;
  isConnected: boolean;
  connectedAt: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
  agentSettings?: AgentSettingsDto | null;
}

export interface AgentSettingsDto {
  id: string;
  repositoryId: string;
  isEnabled: boolean;
  scheduleCron: string;
  timezone: string;
  branchPrefix: string;
  allowedPaths: string[];
  excludedPaths: string[];
  maxDailyRuns: number;
  requirePrReview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubInstallableRepo {
  githubRepoId: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  htmlUrl: string;
  defaultBranch: string;
  description: string | null;
  installationId: number;
  isConnected: boolean;
  connectedRepoId?: string;
}

export interface DashboardStatsDto {
  connectedRepositoriesCount: number;
  totalRepositoriesCount: number;
  agentActiveCount: number;
  upcomingScheduledRunsCount: number;
  recentActivity: Array<{
    id: string;
    type: 'REPO_CONNECTED' | 'REPO_DISCONNECTED' | 'SETTINGS_UPDATED';
    title: string;
    description: string;
    timestamp: string;
    repositoryName?: string;
  }>;
}

