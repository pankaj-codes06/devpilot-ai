import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.js';
import { DashboardLayout } from './layouts/DashboardLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { RepositoriesPage } from './pages/RepositoriesPage.js';
import { AgentSettingsPage } from './pages/AgentSettingsPage.js';
import { TeamSettingsPage } from './pages/TeamSettingsPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { RepositoryIntelligencePage } from './pages/RepositoryIntelligencePage.js';
import { ProjectsPage } from './pages/ProjectsPage.js';
import { ProjectIntelligencePage } from './pages/ProjectIntelligencePage.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/repositories" element={<RepositoriesPage />} />
            <Route path="/repositories/:id/intelligence" element={<RepositoryIntelligencePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id/intelligence" element={<ProjectIntelligencePage />} />
            <Route path="/agent-settings" element={<AgentSettingsPage />} />
            <Route path="/team-settings" element={<TeamSettingsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

