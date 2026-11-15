const API_BASE = '/api';

export class ApiError extends Error {
  constructor(code, message, statusCode, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
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

  const data = await response.json().catch(() => ({
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

  return data.data;
}

export const api = {
  // Auth
  auth: {
    async getMe() {
      return request('/auth/me');
    },
    async logout() {
      return request('/auth/logout', { method: 'POST' });
    },
    async getLoginUrl() {
      return request('/auth/github');
    },
  },

  // GitHub integration
  github: {
    async getInstallUrl() {
      return request('/github/install');
    },
    async getInstallableRepositories() {
      return request('/github/repositories');
    },
    async connectRepository(githubRepoId, installationId) {
      return request('/github/repositories/sync', {
        method: 'POST',
        body: JSON.stringify({ githubRepoId, installationId }),
      });
    },
    async disconnectRepository(id) {
      return request(`/github/repositories/${id}`, {
        method: 'DELETE',
      });
    },
  },

  // Connected Repositories
  repositories: {
    async list() {
      return request('/repositories');
    },
    async getById(id) {
      return request(`/repositories/${id}`);
    },
    async updateSettings(id, settings) {
      return request(`/repositories/${id}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
    },
    async getDashboardStats() {
      return request('/repositories/dashboard/stats');
    },
  },

  // Repository Intelligence & Analysis
  analysis: {
    async triggerAnalysis(repositoryId) {
      return request(`/repositories/${repositoryId}/analyze`, {
        method: 'POST',
      });
    },
    async getOverview(repositoryId) {
      return request(`/repositories/${repositoryId}/analysis`);
    },
    async getTasks(repositoryId) {
      return request(`/repositories/${repositoryId}/tasks`);
    },
    async getRunDetails(runId) {
      return request(`/agent-runs/${runId}`);
    },
  },

  // System Health
  system: {
    async checkHealth() {
      const res = await fetch('/health');
      const data = await res.json();
      return data.data;
    },
  },

  // Hybrid ZIP Projects & Intelligence
  projects: {
    async list() {
      return request('/projects');
    },
    async getById(id) {
      return request(`/projects/${id}`);
    },
    async uploadZip(formData) {
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
    async analyze(projectId) {
      return request(`/projects/${projectId}/analyze`, { method: 'POST' });
    },
    async getAnalysis(projectId) {
      return request(`/projects/${projectId}/analysis`);
    },
    async getTasks(projectId, params) {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request(`/projects/${projectId}/tasks${query}`);
    },
    async listTeams(projectId) {
      return request(`/projects/${projectId}/teams`);
    },
    async createTeam(projectId, data) {
      return request(`/projects/${projectId}/teams`, { method: 'POST', body: JSON.stringify(data) });
    },
    async listModules(projectId) {
      return request(`/projects/${projectId}/modules`);
    },
    async createModule(projectId, data) {
      return request(`/projects/${projectId}/modules`, { method: 'POST', body: JSON.stringify(data) });
    },
    async suggestTeamsAndModules(projectId) {
      return request(`/projects/${projectId}/modules/suggest`, { method: 'POST' });
    },
    async delete(projectId) {
      return request(`/projects/${projectId}`, { method: 'DELETE' });
    },
  },
};
