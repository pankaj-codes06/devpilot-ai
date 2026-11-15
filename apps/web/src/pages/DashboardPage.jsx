import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitFork,
  Bot,
  CalendarClock,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  RefreshCw,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { api } from '../services/api.js';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.repositories.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Engineering Dashboard"
        description="Autonomous developer operations, repository connections, and execution status."
      />

      <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Connected Repositories */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Connected Repos</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <GitFork className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {isLoading ? (
                <div className="h-8 w-12 bg-slate-800 rounded animate-pulse" />
              ) : (
                stats?.connectedRepositoriesCount ?? 0
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <span>Managed by DevPilot GitHub App</span>
            </p>
          </div>

          {/* Autonomous Agent Status */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Agent Status</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Standby (Phase 1)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {stats?.agentActiveCount ?? 0} repositories configured
            </p>
          </div>

          {/* Execution Cadence */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Default Schedule</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-white tracking-tight">09:00 AM IST</div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">Mon–Fri (Asia/Kolkata)</p>
          </div>

          {/* Safety & Guardrails */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-medium uppercase tracking-wider">Agent Guardrails</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-200 tracking-tight">Enforced</div>
            <p className="text-[11px] text-slate-400 mt-2">Zero auto-commits in Phase 1</p>
          </div>
        </div>

        {/* Center Banner / Quick Actions */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono uppercase tracking-wider border border-blue-500/20">
              Repository Pipeline
            </div>
            <h3 className="text-lg font-semibold text-white">
              Connect an existing GitHub team repository
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              DevPilot AI connects directly to your authorized repositories. Select a repository to sync
              metadata, set daily autonomous schedule, and define codebase module boundaries.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/repositories')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Manage Repositories</span>
            </button>
            <button
              onClick={fetchStats}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700 transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Two-Column Section: Phase 1 Architecture & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity (2 Cols) */}
          <div className="lg:col-span-2 rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Audit & Operations Log</h4>
                <p className="text-xs text-slate-400">Chronological history of repository events</p>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Live PostgreSQL Feed</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  Loading activity log...
                </div>
              ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-800/20 transition flex items-start gap-3">
                    <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      {activity.type === 'REPO_CONNECTED' ? (
                        <GitFork className="w-3.5 h-3.5 text-blue-400" />
                      ) : activity.type === 'REPO_DISCONNECTED' ? (
                        <GitPullRequest className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-200">
                          {activity.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(activity.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-xs text-slate-400">No activity recorded yet</div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Activity will appear as you install the GitHub App, connect repositories, or update agent settings.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Phase 1 Architecture Overview (1 Col) */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-white">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Phase 1 System Architecture</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              DevPilot AI Phase 1 establishes the production infrastructure:
            </p>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>GitHub OAuth & App:</strong> Decoupled user identity from repository-level installation permissions.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Prisma & PostgreSQL:</strong> Production schema supporting organizations, CUIDs, and audit logs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Short-Lived Tokens:</strong> Zero permanent GitHub tokens or private keys stored in the database.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Autonomous Pipeline:</strong> Structured worker scaffolding prepared for Phase 2 agent integration.
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => navigate('/agent-settings')}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <span>View Agent Settings</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
