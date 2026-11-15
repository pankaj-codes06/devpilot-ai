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
  lastAnalyzedAt?: string | null;
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

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskCategory =
  | 'BUG_RISK'
  | 'TEST_COVERAGE'
  | 'DUPLICATION'
  | 'DOCUMENTATION'
  | 'TECH_DEBT'
  | 'SECURITY';

export type TaskComplexity = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface ArchitectureSummary {
  languages: Record<string, number>;
  frameworks: string[];
  packageManager?: string;
  projectType: string;
  totalFiles: number;
  totalLinesOfCode?: number;
  testFrameworks: string[];
  hasDocumentation: boolean;
  hasCi: boolean;
  entryPoints: string[];
  modules: Array<{
    name: string;
    pathPattern: string;
    ownerName?: string;
    fileCount: number;
  }>;
}

export interface TaskPlanDto {
  id: string;
  agentRunId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  category: TaskCategory;
  estimatedComplexity: TaskComplexity;
  expectedBenefit: string | null;
  suggestedApproach: string | null;
  requiredTests: string | null;
  moduleName: string | null;
  assignedMember: string | null;
  relevantFiles: string[];
  evidence: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  order: number;
  createdAt: string;
}

export interface AgentRunDetailsDto {
  id: string;
  repositoryId: string;
  triggerType: 'SCHEDULED' | 'MANUAL' | 'WEBHOOK';
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  errorLog: string | null;
  metadata: ArchitectureSummary | null;
  findings: unknown | null;
  tasks: TaskPlanDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryAnalysisOverviewDto {
  repositoryId: string;
  latestRun: AgentRunDetailsDto | null;
  architecture: ArchitectureSummary | null;
  totalTasks: number;
  tasksByPriority: Record<TaskPriority, number>;
  tasksByCategory: Record<string, number>;
}

export interface AnalysisJobData {
  repositoryId: string;
  organizationId: string;
  runId: string;
  triggerType: 'MANUAL' | 'SCHEDULED';
}

// ==============================================================================
// Hybrid ZIP + GitHub Platform Types
// ==============================================================================

export type ProjectSourceType = 'ZIP' | 'GITHUB' | 'HYBRID';
export type VersionStatus = 'PROCESSING' | 'READY' | 'FAILED';
export type TaskPriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ArtifactType = 'PROJECT_ZIP' | 'TEAM_ZIP' | 'DIFF_PATCH' | 'REPORT_MD' | 'LOG';
export type GitHubSyncStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';

export interface ProjectDto {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  sourceType: ProjectSourceType;
  repositoryId: string | null;
  activeVersionId: string | null;
  storagePath: string;
  activeVersion?: ProjectVersionDto | null;
  versionsCount?: number;
  teamsCount?: number;
  tasksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVersionDto {
  id: string;
  projectId: string;
  versionNumber: number;
  label: string;
  status: VersionStatus;
  originalZipPath: string | null;
  extractedPath: string;
  checksum: string;
  fileCount: number;
  totalBytes: string;
  metadata: ArchitectureSummary | null;
  changelog: string | null;
  errorLog: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDto {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  leadName: string | null;
  leadEmail: string | null;
  modulesCount?: number;
  tasksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectModuleDto {
  id: string;
  projectId: string;
  teamId: string | null;
  name: string;
  description: string | null;
  pathPattern: string;
  isShared: boolean;
  suggestedBy: string;
  teamName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentTaskDto {
  id: string;
  projectId: string;
  projectVersionId: string | null;
  moduleId: string | null;
  teamId: string | null;
  dailyExecutionId: string | null;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  priority: TaskPriorityLevel;
  category: string;
  estimatedComplexity: string;
  expectedBenefit: string | null;
  suggestedApproach: string | null;
  requiredTests: string | null;
  relevantFiles: string[];
  evidence: string | null;
  order: number;
  teamName?: string | null;
  moduleName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyExecutionDto {
  id: string;
  projectId: string;
  projectVersionId: string | null;
  triggerType: 'SCHEDULED' | 'MANUAL' | 'WEBHOOK';
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  startedAt: string | null;
  completedAt: string | null;
  summary: string | null;
  errorLog: string | null;
  tasksCount: number;
  changedFiles: string[];
  testResults: unknown | null;
  buildResults: unknown | null;
  metadata: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactDto {
  id: string;
  projectId: string;
  projectVersionId: string | null;
  dailyExecutionId: string | null;
  teamId: string | null;
  type: ArtifactType;
  name: string;
  fileSize: string;
  checksum: string;
  metadata: unknown | null;
  downloadCount: number;
  createdAt: string;
}

export interface GitHubSyncDto {
  id: string;
  projectId: string;
  dailyExecutionId: string;
  repositoryId: string;
  branchName: string;
  commitSha: string | null;
  pullRequestUrl: string | null;
  pullRequestNumber: number | null;
  status: GitHubSyncStatus;
  errorLog: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  repositoryId?: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
  color?: string;
  leadName?: string;
  leadEmail?: string;
}

export interface MapModuleInput {
  name: string;
  pathPattern: string;
  teamId?: string | null;
  description?: string;
  isShared?: boolean;
}
