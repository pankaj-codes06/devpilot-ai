import type {
  ApiResponse,
  AuthSessionUser,
  OrganizationDto,
  RepositoryDto,
  GitHubInstallableRepo,
  DashboardStatsDto,
  UpdateAgentSettingsInput,
  RepositoryAnalysisOverviewDto,
  AgentRunDetailsDto,
  TaskPlanDto,
  ProjectDto,
  TeamDto,
  ProjectModuleDto,
  DevelopmentTaskDto,
  CreateTeamInput,
  MapModuleInput,
} from '@devpilot/shared';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // sends HTTP-only session cookie
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: response.statusText || 'Failed to parse JSON response',
    },
  }));

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unexpected error occurred',
      response.status,
      data.error?.details
    );
  }

  return data.data as T;
}

export const api = {
  // Auth
  auth: {
    async getMe(): Promise<{ user: AuthSessionUser; organizations: OrganizationDto[] }> {
      return request('/auth/me');
    },
    async logout(): Promise<{ message: string }> {
      return request('/auth/logout', { method: 'POST' });
    },
    async getLoginUrl(): Promise<{ authorizeUrl: string }> {
      return request('/auth/github');
    },
  },

  // GitHub integration
  github: {
    async getInstallUrl(): Promise<{ installUrl: string }> {
      return request('/github/install');
    },
    async getInstallableRepositories(): Promise<GitHubInstallableRepo[]> {
      return request('/github/repositories');
    },
    async connectRepository(
      githubRepoId: number,
      installationId: number
    ): Promise<RepositoryDto> {
      return request('/github/repositories/sync', {
        method: 'POST',
        body: JSON.stringify({ githubRepoId, installationId }),
      });
    },
    async disconnectRepository(id: string): Promise<{ message: string }> {
      return request(`/github/repositories/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Connected Repositories
  repositories: {
    async list(): Promise<RepositoryDto[]> {
      return request('/repositories');
    },
    async getById(id: string): Promise<RepositoryDto> {
      return request(`/repositories/${id}`);
    },
    async updateSettings(
      id: string,
      settings: UpdateAgentSettingsInput
    ): Promise<RepositoryDto['agentSettings']> {
      return request(`/repositories/${id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
    },
    async getDashboardStats(): Promise<DashboardStatsDto> {
      return request('/repositories/dashboard/stats');
    },
  },

  // Repository Intelligence & Analysis
  analysis: {
    async triggerAnalysis(
      repositoryId: string
    ): Promise<{ runId: string; status: string; repositoryName: string }> {
      return request(`/repositories/${repositoryId}/analyze`, {
        method: 'POST',
      });
    },
    async getOverview(
      repositoryId: string
    ): Promise<RepositoryAnalysisOverviewDto> {
      return request(`/repositories/${repositoryId}/analysis`);
    },
    async getTasks(repositoryId: string): Promise<TaskPlanDto[]> {
      return request(`/repositories/${repositoryId}/tasks`);
    },
    async getRunDetails(runId: string): Promise<AgentRunDetailsDto> {
      return request(`/agent-runs/${runId}`);
    },
  },

  // System Health
  system: {
    async checkHealth(): Promise<{ status: string; database: string; uptime: number }> {
      const res = await fetch('/health');
      const data = await res.json();
      return data.data;
    },
  },

  // Hybrid ZIP Projects & Intelligence
  projects: {
    async list(): Promise<ProjectDto[]> {
      return request('/projects');
    },
    async getById(id: string): Promise<ProjectDto> {
      return request(`/projects/${id}`);
    },
    async uploadZip(formData: FormData): Promise<ProjectDto> {
      const response = await fetch('/api/projects/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to upload project ZIP');
      }
      return data.data;
    },
    async analyze(projectId: string): Promise<any> {
      return request(`/projects/${projectId}/analyze`, { method: 'POST' });
    },
    async getAnalysis(projectId: string): Promise<any> {
      return request(`/projects/${projectId}/analysis`);
    },
    async getTasks(projectId: string, params?: Record<string, string>): Promise<DevelopmentTaskDto[]> {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/projects/${projectId}/tasks${query}`);
    },
    async listTeams(projectId: string): Promise<TeamDto[]> {
      return request(`/projects/${projectId}/teams`);
    },
    async createTeam(projectId: string, data: CreateTeamInput): Promise<TeamDto> {
      return request(`/projects/${projectId}/teams`, { method: 'POST', body: JSON.stringify(data) });
    },
    async listModules(projectId: string): Promise<ProjectModuleDto[]> {
      return request(`/projects/${projectId}/modules`);
    },
    async createModule(projectId: string, data: MapModuleInput): Promise<ProjectModuleDto> {
      return request(`/projects/${projectId}/modules`, { method: 'POST', body: JSON.stringify(data) });
    },
    async suggestTeamsAndModules(projectId: string): Promise<{ teams: TeamDto[]; modules: ProjectModuleDto[] }> {
      return request(`/projects/${projectId}/modules/suggest`, { method: 'POST' });
    },
    async delete(projectId: string): Promise<{ deleted: boolean }> {
      return request(`/projects/${projectId}`, { method: 'DELETE' });
    },
  },
};

