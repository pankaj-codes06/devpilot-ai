import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bot,
  GitFork,
  CheckCircle2,
  GitPullRequest,
  Clock,
} from 'lucide-react';
import { Header } from '../components/Header.js';
import { api } from '../services/api.js';
import type { DashboardStatsDto } from '@devpilot/shared';

export const ActivityPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.repositories
      .getDashboardStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Execution & Activity Log"
        description="Autonomous agent runs, task decompositions, and repository audit events."
      />

      <div className="p-8 max-w-5xl w-full mx-auto space-y-8">
        {/* Phase 2 Autonomous Agent Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 via-slate-900 to-slate-900 border border-blue-900/40 space-y-3">
          <div className="flex items-center space-x-2 text-blue-400">
            <Bot className="w-5 h-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Autonomous Agent Pipeline (Phase 2 Preview)
            </span>
          </div>

          <h3 className="text-base font-semibold text-white">
            Daily task planning & Pull Request executions are queued for Phase 2
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            In Phase 1, DevPilot AI prioritizes foundational stability: secure GitHub App repository
            authorization, PostgreSQL schemas, and environment configuration. Autonomous coding, test
            suite execution, and PR synthesis will activate in Phase 2.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
            <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/80 font-mono">
              AgentRun Table: Ready
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/80 font-mono">
              AgentTask Table: Ready
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700/80 font-mono">
              AuditLog Table: Active
            </span>
          </div>
        </div>

        {/* Audit Log Feed */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Repository Audit Trail</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Live Database Events</span>
          </div>

          <div className="divide-y divide-slate-800/60">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 font-mono">
                Loading audit trail...
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-slate-800/20 transition flex items-start justify-between gap-4"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      {activity.type === 'REPO_CONNECTED' ? (
                        <GitFork className="w-3.5 h-3.5 text-blue-400" />
                      ) : activity.type === 'REPO_DISCONNECTED' ? (
                        <GitPullRequest className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {activity.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {activity.description}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono shrink-0">
                    {new Date(activity.timestamp).toLocaleString([], {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-16 text-center space-y-3">
                <Clock className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">
                  No activity entries recorded yet
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When you connect repositories, install the GitHub App, or update agent settings, an immutable audit log is recorded here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

