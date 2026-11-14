import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GitFork,
  ExternalLink,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Github,
  Sliders,
  Lock,
  Globe,
  Search,
  Brain,
} from 'lucide-react';
import { Header } from '../components/Header.js';
import { api } from '../services/api.js';
import type { RepositoryDto, GitHubInstallableRepo } from '@devpilot/shared';

export const RepositoriesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [connectedRepos, setConnectedRepos] = useState<RepositoryDto[]>([]);
  const [installableRepos, setInstallableRepos] = useState<GitHubInstallableRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(
    searchParams.get('action') === 'connect' || searchParams.get('installed') === 'true'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingRepoId, setProcessingRepoId] = useState<number | string | null>(null);

  const fetchConnectedRepos = async () => {
    try {
      setIsLoading(true);
      setActionError(null);
      const repos = await api.repositories.list();
      setConnectedRepos(repos);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to fetch repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableRepos = async () => {
    try {
      setIsLoadingAvailable(true);
      setActionError(null);
      const repos = await api.github.getInstallableRepositories();
      setInstallableRepos(repos);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to fetch GitHub App repositories');
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  useEffect(() => {
    fetchConnectedRepos();
  }, []);

  const openConnectDrawer = () => {
    setShowConnectModal(true);
    fetchAvailableRepos();
  };

  const handleConnectRepo = async (githubRepoId: number, installationId: number) => {
    try {
      setProcessingRepoId(githubRepoId);
      setActionError(null);
      await api.github.connectRepository(githubRepoId, installationId);
      await Promise.all([fetchConnectedRepos(), fetchAvailableRepos()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setProcessingRepoId(null);
    }
  };

  const handleDisconnectRepo = async (repositoryId: string, repoName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to disconnect ${repoName}? Autonomous runs for this repository will be halted.`
      )
    ) {
      return;
    }

    try {
      setProcessingRepoId(repositoryId);
      setActionError(null);
      await api.github.disconnectRepository(repositoryId);
      await fetchConnectedRepos();
      if (showConnectModal) {
        await fetchAvailableRepos();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to disconnect repository');
    } finally {
      setProcessingRepoId(null);
    }
  };

  const handleInstallGitHubApp = () => {
    window.location.href = '/api/github/install';
  };

  const filteredConnected = connectedRepos.filter((r) =>
    r.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Repositories"
        description="Authorized GitHub repositories connected to DevPilot autonomous operations."
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
        {actionError && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter connected repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchConnectedRepos}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition"
              title="Refresh repository list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openConnectDrawer}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Repository</span>
            </button>
          </div>
        </div>

        {/* Repositories Table */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Repository</th>
                  <th className="py-3.5 px-4">Default Branch</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Autonomous Cadence</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 font-mono">
                      <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                      Loading connected repositories...
                    </td>
                  </tr>
                ) : filteredConnected.length > 0 ? (
                  filteredConnected.map((repo) => (
                    <tr key={repo.id} className="hover:bg-slate-800/30 transition group">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                            <GitFork className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">{repo.fullName}</span>
                              {repo.isPrivate ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                                  <Lock className="w-2.5 h-2.5" /> Private
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                                  <Globe className="w-2.5 h-2.5" /> Public
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                              <a
                                href={repo.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-blue-400 flex items-center gap-1 transition"
                              >
                                <span>GitHub</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span>&bull;</span>
                              <span>Connected {new Date(repo.connectedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-300">
                        <span className="px-2 py-0.5 bg-slate-800/80 rounded border border-slate-700 text-[11px]">
                          {repo.defaultBranch}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        {repo.agentSettings?.isEnabled ? (
                          <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            <span>09:00 AM IST</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Standby (Disabled)</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/repositories/${repo.id}/intelligence`}
                            className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition"
                            title="Repository Intelligence & Backlog"
                          >
                            <Brain className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/agent-settings?repoId=${repo.id}`}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition"
                            title="Configure Agent Settings"
                          >
                            <Sliders className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDisconnectRepo(repo.id, repo.fullName)}
                            disabled={processingRepoId === repo.id}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition disabled:opacity-50"
                            title="Disconnect Repository"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <GitFork className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <div className="text-sm font-semibold text-slate-300">No connected repositories</div>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Connect your team’s existing GitHub repository to enable autonomous developer operations.
                      </p>
                      <button
                        onClick={openConnectDrawer}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Connect Your First Repository
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal / Slide-over: Connect Existing Repositories via GitHub App */}
        {showConnectModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-semibold text-white">Connect GitHub Repositories</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select an authorized repository from your GitHub App installation.
                  </p>
                </div>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1 rounded hover:bg-slate-800"
                >
                  &times;
                </button>
              </div>

              {/* GitHub App Install Banner */}
              <div className="my-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
                    <Github className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">DevPilot GitHub App</div>
                    <div className="text-[11px] text-slate-400">
                      Install on repositories to grant short-lived autonomous agent permissions.
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleInstallGitHubApp}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Install / Add Repos</span>
                </button>
              </div>

              {/* Installable Repositories List */}
              <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
                {isLoadingAvailable ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-mono">
                    <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                    Querying GitHub App installations...
                  </div>
                ) : installableRepos.length > 0 ? (
                  installableRepos.map((repo) => (
                    <div
                      key={repo.githubRepoId}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-4 transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {repo.fullName}
                          </span>
                          {repo.isPrivate && (
                            <span className="text-[10px] text-slate-400 px-1 rounded bg-slate-800 border border-slate-700">
                              Private
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {repo.description || 'No description provided.'}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {repo.isConnected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Connected
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConnectRepo(repo.githubRepoId, repo.installationId)}
                            disabled={processingRepoId === repo.githubRepoId}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {processingRepoId === repo.githubRepoId ? 'Connecting...' : 'Connect'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Github className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <div className="text-xs font-semibold text-slate-300">
                      No GitHub App installations found
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Click the button above to install the DevPilot GitHub App on your team’s GitHub organization or account.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

