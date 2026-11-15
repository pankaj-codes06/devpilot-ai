import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { RepositoriesPage } from './pages/RepositoriesPage.jsx';
import { AgentSettingsPage } from './pages/AgentSettingsPage.jsx';
import { TeamSettingsPage } from './pages/TeamSettingsPage.jsx';
import { ActivityPage } from './pages/ActivityPage.jsx';
import { RepositoryIntelligencePage } from './pages/RepositoryIntelligencePage.jsx';
import { ProjectsPage } from './pages/ProjectsPage.jsx';
import { ProjectIntelligencePage } from './pages/ProjectIntelligencePage.jsx';

export const App = () => {
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
