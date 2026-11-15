import React from 'react';
import {
  Users,
  Shield,
  Layers,
  UserPlus,
  Crown,
  Lock,
} from 'lucide-react';
import { Header } from '../components/Header.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export const TeamSettingsPage = () => {
  const { user, currentOrg } = useAuth();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Team & Organization"
        description="Workspace identity, team members, and codebase module ownership."
      />

      <div className="p-8 max-w-5xl w-full mx-auto space-y-8">
        {/* Workspace Identity Card */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Shield className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Workspace Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Organization Name
              </span>
              <div className="font-semibold text-slate-200">
                {currentOrg?.name || 'Personal Workspace'}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Workspace Slug
              </span>
              <div className="font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 inline-block">
                {currentOrg?.slug || 'workspace'}
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Your Access Level
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                <Crown className="w-3 h-3" />
                <span>{user?.role || 'OWNER'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Team Members List & Placeholder */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Team Members</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active collaborators with access to this DevPilot workspace.
              </p>
            </div>
            <button
              disabled
              title="Multi-user invite available in Phase 2"
              className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs font-medium cursor-not-allowed flex items-center gap-1.5 border border-slate-700/60"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Member (Phase 2)</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {/* Active User */}
            <div className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition">
              <div className="flex items-center space-x-3">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.githubUsername}
                    className="w-8 h-8 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                    {user?.githubUsername?.charAt(0) || 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {user?.name || user?.githubUsername}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (@{user?.githubUsername})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{user?.email || 'GitHub Account'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Workspace Owner
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Codebase Module Ownership */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Codebase Module Ownership</h3>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-700">
              Future Roadmap
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            In Phase 2, define fine-grained module boundaries (e.g. <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded font-mono">apps/web/src/billing/**</code>) and designate engineer assignees so DevPilot automatically tags relevant domain owners on autonomous Pull Requests.
          </p>

          <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Database schema (<code className="font-mono text-slate-300">TeamModule</code>) prepared in PostgreSQL. Management controls activate in Phase 2.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
