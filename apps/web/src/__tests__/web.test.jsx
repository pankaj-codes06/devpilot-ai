import { describe, it, expect } from 'vitest';
import { api, ApiError } from '../services/api.js';
import { App } from '../App.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { RepositoriesPage } from '../pages/RepositoriesPage.jsx';
import { ProjectsPage } from '../pages/ProjectsPage.jsx';
import { ProjectIntelligencePage } from '../pages/ProjectIntelligencePage.jsx';
import { RepositoryIntelligencePage } from '../pages/RepositoryIntelligencePage.jsx';
import { TeamSettingsPage } from '../pages/TeamSettingsPage.jsx';
import { AgentSettingsPage } from '../pages/AgentSettingsPage.jsx';
import { ActivityPage } from '../pages/ActivityPage.jsx';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { Header } from '../components/Header.jsx';
import { Sidebar } from '../components/Sidebar.jsx';
import { AuthProvider, useAuth } from '../hooks/useAuth.jsx';

describe('@devpilot/web — JavaScript & React Verification', () => {
  describe('API Services & Error Handling', () => {
    it('exports all expected API namespaces and operations', () => {
      expect(typeof api.auth.getMe).toBe('function');
      expect(typeof api.auth.logout).toBe('function');
      expect(typeof api.auth.getLoginUrl).toBe('function');

      expect(typeof api.github.getInstallableRepositories).toBe('function');
      expect(typeof api.github.connectRepository).toBe('function');
      expect(typeof api.github.disconnectRepository).toBe('function');

      expect(typeof api.repositories.list).toBe('function');
      expect(typeof api.repositories.getById).toBe('function');
      expect(typeof api.repositories.updateSettings).toBe('function');
      expect(typeof api.repositories.getDashboardStats).toBe('function');

      expect(typeof api.analysis.triggerAnalysis).toBe('function');
      expect(typeof api.analysis.getOverview).toBe('function');
      expect(typeof api.analysis.getTasks).toBe('function');

      expect(typeof api.projects.list).toBe('function');
      expect(typeof api.projects.uploadZip).toBe('function');
      expect(typeof api.projects.analyze).toBe('function');
      expect(typeof api.projects.getAnalysis).toBe('function');
      expect(typeof api.projects.suggestTeamsAndModules).toBe('function');

      expect(typeof api.system.checkHealth).toBe('function');
    });

    it('instantiates ApiError with code, statusCode, and details', () => {
      const err = new ApiError('FORBIDDEN', 'Access Denied', 403, { tenant: 'org-1' });
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe('ApiError');
      expect(err.code).toBe('FORBIDDEN');
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Access Denied');
      expect(err.details).toEqual({ tenant: 'org-1' });
    });
  });

  describe('Component & Page Exports', () => {
    it('exports App root component as a callable functional component', () => {
      expect(typeof App).toBe('function');
    });

    it('exports all 9 application page components as valid functions', () => {
      expect(typeof LoginPage).toBe('function');
      expect(typeof DashboardPage).toBe('function');
      expect(typeof RepositoriesPage).toBe('function');
      expect(typeof ProjectsPage).toBe('function');
      expect(typeof ProjectIntelligencePage).toBe('function');
      expect(typeof RepositoryIntelligencePage).toBe('function');
      expect(typeof TeamSettingsPage).toBe('function');
      expect(typeof AgentSettingsPage).toBe('function');
      expect(typeof ActivityPage).toBe('function');
    });

    it('exports DashboardLayout, Header, and Sidebar components as valid functions', () => {
      expect(typeof DashboardLayout).toBe('function');
      expect(typeof Header).toBe('function');
      expect(typeof Sidebar).toBe('function');
    });

    it('exports AuthProvider and useAuth hook', () => {
      expect(typeof AuthProvider).toBe('function');
      expect(typeof useAuth).toBe('function');
    });
  });
});
