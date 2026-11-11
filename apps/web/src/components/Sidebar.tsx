import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitFork,
  Activity,
  Bot,
  Users,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Repositories', to: '/repositories', icon: GitFork },
  { name: 'Agent Settings', to: '/agent-settings', icon: Bot },
  { name: 'Team Settings', to: '/team-settings', icon: Users },
  { name: 'Activity Log', to: '/activity', icon: Activity },
];

export const Sidebar: React.FC = () => {
  const { user, currentOrg, logout } = useAuth();

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wide text-white flex items-center gap-1.5">
              DevPilot AI
            </div>
            <div className="text-[10px] text-blue-400 font-mono font-medium uppercase tracking-wider">
              Autonomous Agent
            </div>
          </div>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-700">
          v1.0
        </span>
      </div>

      {/* Organization Badge */}
      <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-900/40">
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Active Workspace</span>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Ready
          </span>
        </div>
        <div className="font-medium text-xs text-slate-200 truncate flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300">
            {currentOrg?.name?.charAt(0) || 'O'}
          </div>
          <span className="truncate">{currentOrg?.name || 'Personal Workspace'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-500 px-3 py-2 uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Agent Guardrails Safety Indicator */}
      <div className="p-3 mx-3 mb-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Agent Guardrails Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Read-only metadata mode. Autonomous push disabled in Phase 1.
        </p>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#0a0f1c] flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.githubUsername}
              className="w-7 h-7 rounded-full border border-slate-700"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold">
              {user?.githubUsername?.charAt(0) || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">
              {user?.name || user?.githubUsername}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              @{user?.githubUsername}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

